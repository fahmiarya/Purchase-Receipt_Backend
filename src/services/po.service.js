const crypto = require("crypto");
const { POStatus } = require("@prisma/client");
const { withTransactionRetry } = require("../utils/tx-retry");

const serializeDecimal = (v) =>
  v &&
  typeof v === "object" &&
  v.constructor &&
  v.constructor.name === "Decimal"
    ? v.toString()
    : v;

const tempNo = () => `TMP-${crypto.randomUUID()}`;

const finalPoNo = (id) =>
  `PO-${new Date().getFullYear()}-${String(id).padStart(3, "0")}`;

async function recalcPOStatus(prisma, poId) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId },
    include: { items: true },
  });
  if (!po) return;
  const totalOrdered = po.items.reduce((s, i) => s + Number(i.qtyPO), 0);
  const totalReceived = po.items.reduce(
    (s, i) => s + Number(i.qtyDiterima || 0),
    0,
  );
  let newStatus = "open";
  if (totalReceived === 0) newStatus = "open";
  else if (totalReceived < totalOrdered) newStatus = "partial";
  else newStatus = "complete";
  if (po.status !== newStatus) {
    await prisma.purchaseOrder.update({
      where: { id: poId },
      data: { status: newStatus },
    });
  }
}

module.exports = {
  // ---------------------------------------------------------------------
  // List PO (filters & pagination)
  async listPO(prisma, query) {
    const {
      status,
      vendor,
      vendorId, // legacy key, kept for backward compatibility
      date,
      startDate, // legacy key, kept for backward compatibility
      endDate, // legacy key, kept for backward compatibility
      skip = 0,
      take = 20,
    } = query;
    const allowedStatus = ["open", "partial", "complete", "cancelled"];
    // Compare case-insensitively so callers may send "Open", "Partial", etc.
    // "all" is accepted as "no filter" (legacy "All" chip).
    const normalizedStatus = status ? String(status).toLowerCase() : undefined;
    if (normalizedStatus && normalizedStatus !== "all" && !allowedStatus.includes(normalizedStatus)) {
      throw { statusCode: 422, message: "Invalid status filter" };
    }
    const s = Number(skip);
    const t = Number(take);
    if (!Number.isInteger(s) || s < 0) {
      throw { statusCode: 422, message: "skip must be a non‑negative integer" };
    }
    if (!Number.isInteger(t) || t <= 0) {
      throw { statusCode: 422, message: "take must be a positive integer" };
    }
    const where = {};
    const effectiveStatus = normalizedStatus === "all" ? undefined : normalizedStatus;
    if (effectiveStatus) where.status = effectiveStatus;
    const vendorFilter = vendor ?? vendorId;
    if (vendorFilter) where.vendorId = Number(vendorFilter);
    // Contract filter: `date` = exact day (YYYY-MM-DD).
    if (date) {
      if (isNaN(Date.parse(date))) throw { statusCode: 422, message: "Invalid date" };
      const dayStart = new Date(`${date}T00:00:00`);
      const dayEnd = new Date(`${date}T23:59:59.999`);
      where.tglPO = { gte: dayStart, lte: dayEnd };
    }
    if (startDate) {
      if (isNaN(Date.parse(startDate)))
        throw { statusCode: 422, message: "Invalid startDate" };
      where.tglPO = { ...(where.tglPO || {}), gte: new Date(startDate) };
    }
    if (endDate) {
      if (isNaN(Date.parse(endDate)))
        throw { statusCode: 422, message: "Invalid endDate" };
      where.tglPO = { ...(where.tglPO || {}), lte: new Date(endDate) };
    }
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      throw { statusCode: 422, message: "startDate cannot be after endDate" };
    }
    const pos = await prisma.purchaseOrder.findMany({
      where,
      skip: s,
      take: t,
      include: { vendor: true, items: { include: { item: true } } },
    });
    // Serialize decimals
    const serialized = pos.map((po) => {
      const items = (po.items || []).map((it) => ({
        ...it,
        qtyPO: serializeDecimal(it.qtyPO),
        hargaPO: serializeDecimal(it.hargaPO),
        qtyDiterima: serializeDecimal(it.qtyDiterima),
        item: { ...it.item, stock: serializeDecimal(it.item?.stock) },
      }));
      return { ...po, items };
    });
    return serialized;
  },

  // ---------------------------------------------------------------------
  // Get single PO detail
  async getPO(prisma, id) {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { vendor: true, items: { include: { item: true } } },
    });
    if (!po) throw { statusCode: 404, message: "PurchaseOrder not found" };
    const items = (po.items || []).map((it) => ({
      ...it,
      qtyPO: serializeDecimal(it.qtyPO),
      hargaPO: serializeDecimal(it.hargaPO),
      qtyDiterima: serializeDecimal(it.qtyDiterima),
      item: { ...it.item, stock: serializeDecimal(it.item?.stock) },
    }));
    return { ...po, items };
  },

  async createPO(prisma, { vendorId, tglPO, notes, items }) {
    if (!Array.isArray(items) || items.length === 0) {
      throw {
        statusCode: 422,
        message: "PurchaseOrder must contain at least one item",
      };
    }

    for (const it of items) {
      if (Number(it.qtyPO) <= 0) {
        throw {
          statusCode: 422,
          message: "qty_po must be > 0",
          details: { itemId: it.itemId, qtyPO: it.qtyPO },
        };
      }
      if (Number(it.hargaPO) <= 0) {
        throw {
          statusCode: 422,
          message: "harga_po must be > 0",
          details: { itemId: it.itemId, hargaPO: it.hargaPO },
        };
      }
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: Number(vendorId) },
    });
    if (!vendor) throw { statusCode: 422, message: "Vendor not found" };

    const itemIdSet = new Set();
    for (const it of items) {
      if (itemIdSet.has(it.itemId)) {
        throw {
          statusCode: 422,
          message: "Duplicate itemId in PO items",
          details: { itemId: it.itemId },
        };
      }
      itemIdSet.add(it.itemId);
      const item = await prisma.item.findUnique({
        where: { id: Number(it.itemId) },
      });
      if (!item)
        throw { statusCode: 422, message: `Item ${it.itemId} not found` };
    }
    // Transaction – withTransactionRetry: longer timeout + retry on
    // transient conflict/timeout so PO creation doesn't 500 randomly.
    const po = await withTransactionRetry(prisma, async (tx) => {
      const tmp = tempNo();
      const created = await tx.purchaseOrder.create({
        data: {
          vendorId,
          tglPO: new Date(tglPO),
          notes: notes ?? null,
          status: "open",
          noPO: tmp,
        },
      });
      await tx.purchaseOrder.update({
        where: { id: created.id },
        data: { noPO: finalPoNo(created.id) },
      });
      const poItems = items.map((it) => ({
        poId: created.id,
        itemId: it.itemId,
        qtyPO: it.qtyPO,
        hargaPO: it.hargaPO,
      }));
      await tx.purchaseOrderItem.createMany({ data: poItems });
      return tx.purchaseOrder.findUnique({
        where: { id: created.id },
        include: { vendor: true, items: { include: { item: true } } },
      });
    });

    const itemsSer = (po.items || []).map((it) => ({
      ...it,
      qtyPO: serializeDecimal(it.qtyPO),
      hargaPO: serializeDecimal(it.hargaPO),
      qtyDiterima: serializeDecimal(it.qtyDiterima),
      item: { ...it.item, stock: serializeDecimal(it.item?.stock) },
    }));
    return { ...po, items: itemsSer };
  },

  async updatePO(prisma, id, data) {
    const { vendorId, tglPO, notes } = data;
    if (vendorId !== undefined) {
      const vendor = await prisma.vendor.findUnique({
        where: { id: Number(vendorId) },
      });
      if (!vendor) throw { statusCode: 422, message: "Vendor not found" };
    }
    const upd = await prisma.purchaseOrder.updateMany({
      where: { id, status: "open" },
      data: {
        ...(vendorId !== undefined && { vendorId }),
        ...(tglPO && { tglPO: new Date(tglPO) }),
        ...(notes !== undefined && { notes }),
      },
    });
    if (upd.count === 0) {
      const exists = await prisma.purchaseOrder.findUnique({ where: { id } });
      if (!exists)
        throw { statusCode: 404, message: "PurchaseOrder not found" };
      throw {
        statusCode: 422,
        message: "Only PO with status open can be updated",
      };
    }
    return this.getPO(prisma, id);
  },

  async cancelPO(prisma, id) {
    const po = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw { statusCode: 404, message: "PurchaseOrder not found" };
    if (po.status !== "open")
      throw {
        statusCode: 422,
        message: "Only PO with status open can be cancelled",
      };

    const poItemIds = (
      await prisma.purchaseOrderItem.findMany({
        where: { poId: id },
        select: { id: true },
      })
    ).map((i) => i.id);
    const receipt = await prisma.goodsReceiptItem.findFirst({
      where: { poItemId: { in: poItemIds } },
    });
    if (receipt)
      throw {
        statusCode: 422,
        message: "Cannot cancel PO that already has a goods receipt",
      };

    await prisma.purchaseOrder.update({
      where: { id },
      data: { status: "cancelled" },
    });

    return await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { vendor: true, items: { include: { item: true } } },
    });
  },

  async deletePO(prisma, id) {
    const po = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw { statusCode: 404, message: "PurchaseOrder not found" };
    if (po.status !== "open")
      throw {
        statusCode: 422,
        message: "Only PO with status open can be deleted",
      };
    const poItemIds = (
      await prisma.purchaseOrderItem.findMany({
        where: { poId: id },
        select: { id: true },
      })
    ).map((i) => i.id);
    const receipt = await prisma.goodsReceiptItem.findFirst({
      where: { poItemId: { in: poItemIds } },
    });
    if (receipt)
      throw {
        statusCode: 422,
        message: "Cannot delete PO that already has a goods receipt",
      };
    await prisma.purchaseOrder.delete({ where: { id } });
    return { message: "Deleted" };
  },

  async listPOItems(prisma, poId) {
    const po = await prisma.purchaseOrder.findUnique({ where: { id: poId } });
    if (!po) throw { statusCode: 404, message: "PurchaseOrder not found" };
    const items = await prisma.purchaseOrderItem.findMany({
      where: { poId },
      include: { item: true },
    });
    return items.map((it) => ({
      ...it,
      qtyPO: serializeDecimal(it.qtyPO),
      hargaPO: serializeDecimal(it.hargaPO),
      qtyDiterima: serializeDecimal(it.qtyDiterima),
      item: { ...it.item, stock: serializeDecimal(it.item?.stock) },
    }));
  },

  async addPOItem(prisma, poId, body) {
    const po = await prisma.purchaseOrder.findUnique({ where: { id: poId } });
    if (!po) throw { statusCode: 404, message: "PurchaseOrder not found" };
    if (po.status !== "open")
      throw { statusCode: 422, message: "Only open PO can have items added" };
    const { itemId, qtyPO, hargaPO } = body;
    const item = await prisma.item.findUnique({
      where: { id: Number(itemId) },
    });
    if (!item) throw { statusCode: 422, message: "Item not found" };
    const poItem = await prisma.purchaseOrderItem.create({
      data: { poId, itemId, qtyPO, hargaPO },
      include: { item: true },
    });
    return {
      ...poItem,
      qtyPO: serializeDecimal(poItem.qtyPO),
      hargaPO: serializeDecimal(poItem.hargaPO),
      qtyDiterima: serializeDecimal(poItem.qtyDiterima),
      item: { ...poItem.item, stock: serializeDecimal(poItem.item?.stock) },
    };
  },

  async updatePOItem(prisma, poId, itemIdParam, body) {
    const po = await prisma.purchaseOrder.findUnique({ where: { id: poId } });
    if (!po) throw { statusCode: 404, message: "PurchaseOrder not found" };
    if (po.status !== "open")
      throw {
        statusCode: 422,
        message: "Only open PO can have items modified",
      };
    const { itemId, qtyPO, hargaPO } = body;
    const existing = await prisma.purchaseOrderItem.findFirst({
      where: { poId, itemId: Number(itemId) },
    });
    if (!existing) throw { statusCode: 404, message: "Item not found in PO" };
    const receipt = await prisma.goodsReceiptItem.findFirst({
      where: { poItemId: existing.id },
    });
    if (receipt)
      throw {
        statusCode: 422,
        message: "Cannot modify item that already has a goods receipt",
      };
    const updated = await prisma.purchaseOrderItem.update({
      where: { id: existing.id },
      data: { qtyPO, hargaPO },
      include: { item: true },
    });
    await recalcPOStatus(prisma, poId);
    return {
      ...updated,
      qtyPO: serializeDecimal(updated.qtyPO),
      hargaPO: serializeDecimal(updated.hargaPO),
      qtyDiterima: serializeDecimal(updated.qtyDiterima),
      item: { ...updated.item, stock: serializeDecimal(updated.item?.stock) },
    };
  },

  async deletePOItem(prisma, poId, itemIdParam) {
    const po = await prisma.purchaseOrder.findUnique({ where: { id: poId } });
    if (!po) throw { statusCode: 404, message: "PurchaseOrder not found" };
    if (po.status !== "open")
      throw { statusCode: 422, message: "Only open PO can have items removed" };
    const existing = await prisma.purchaseOrderItem.findFirst({
      where: { poId, itemId: Number(itemIdParam) },
    });
    if (!existing) throw { statusCode: 404, message: "Item not found in PO" };
    const receipt = await prisma.goodsReceiptItem.findFirst({
      where: { poItemId: existing.id },
    });
    if (receipt)
      throw {
        statusCode: 422,
        message: "Cannot delete item that already has a goods receipt",
      };
    await prisma.purchaseOrderItem.delete({ where: { id: existing.id } });
    await recalcPOStatus(prisma, poId);
    return { message: "Deleted" };
  },

  async receiptStatus(prisma, poId) {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { items: true },
    });
    if (!po) throw { statusCode: 404, message: "PurchaseOrder not found" };

   
    if (po.status !== POStatus.open) {
      return { receiptStatus: po.status };
    }

    
    const receiptExists = await prisma.goodsReceiptItem.findFirst({
      where: { poItemId: { in: po.items.map((i) => i.id) } },
    });

    
    return { receiptStatus: receiptExists ? POStatus.complete : POStatus.open };
  },
};
