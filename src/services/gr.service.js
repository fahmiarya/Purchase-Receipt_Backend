
const crypto = require('crypto');
const { Decimal } = require('@prisma/client');
const { withTransactionRetry } = require('../utils/tx-retry');


// Helper: serialize Decimal values to string
const serializeDecimal = (v) =>
  v && typeof v === 'object' && v.constructor && v.constructor.name === 'Decimal' ? v.toString() : v;

// Helper: recalculate PO status based on received quantities
async function recalcPOStatus(prisma, poId) {
  const po = await prisma.purchaseOrder.findUnique({
    where: { id: poId }, 
    include: { items: true },
  });
  if (!po) return;
  const totalOrdered = po.items.reduce((s, i) => s + Number(i.qtyPO), 0);
  const totalReceived = po.items.reduce((s, i) => s + Number(i.qtyDiterima), 0);
  let newStatus = 'open';
  if (totalReceived === 0) newStatus = 'open';
  else if (totalReceived < totalOrdered) newStatus = 'partial';
  else newStatus = 'complete';
  if (po.status !== newStatus) {
    await prisma.purchaseOrder.update({ where: { id: poId }, data: { status: newStatus } });
  }
}

// Serialize a GR record for response
function serializeGR(gr) {
  const items = (gr.items || []).map((it) => ({
    ...it,
    qtyDiterima: serializeDecimal(it.qtyDiterima),
    item: {
      ...it.item,
      stock: serializeDecimal(it.item?.stock),
    },
  }));
  return { ...gr, items };
}

module.exports = {
  // List Goods Receipts with optional filters & pagination
  async listGR(prisma, query) {
    const {
      po_id, // contract key (matches the Postman collection & frontend)
      poId, // legacy key, kept for backward compatibility
      date,
      startDate, // legacy key, kept for backward compatibility
      endDate, // legacy key, kept for backward compatibility
      skip = 0,
      take = 20,
    } = query;
    const s = Number(skip);
    const t = Number(take);
    if (!Number.isInteger(s) || s < 0) throw { statusCode: 422, message: 'skip must be a non‑negative integer' };
    if (!Number.isInteger(t) || t <= 0) throw { statusCode: 422, message: 'take must be a positive integer' };
    const where = {};
    const poFilter = po_id ?? poId;
    if (poFilter) where.poId = Number(poFilter);
    // Contract filter: `date` = exact day (YYYY-MM-DD).
    if (date) {
      if (isNaN(Date.parse(date))) throw { statusCode: 422, message: 'Invalid date' };
      const dayStart = new Date(`${date}T00:00:00`);
      const dayEnd = new Date(`${date}T23:59:59.999`);
      where.tglGR = { gte: dayStart, lte: dayEnd };
    }
    if (startDate) {
      if (isNaN(Date.parse(startDate))) throw { statusCode: 422, message: 'Invalid startDate' };
      where.tglGR = { ...(where.tglGR || {}), gte: new Date(startDate) };
    }
    if (endDate) {
      if (isNaN(Date.parse(endDate))) throw { statusCode: 422, message: 'Invalid endDate' };
      where.tglGR = { ...(where.tglGR || {}), lte: new Date(endDate) };
    }
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      throw { statusCode: 422, message: 'startDate cannot be after endDate' };
    }
    const grs = await prisma.goodsReceipt.findMany({
      where,
      skip: s,
      take: t,
      include: { items: { include: { item: true } } },
    });
    return grs.map(serializeGR);
  },

  
  async getGR(prisma, id) {
    const gr = await prisma.goodsReceipt.findUnique({
      where: { id },
      include: { items: { include: { item: true } } },
    });
    if (!gr) throw { statusCode: 404, message: 'GoodsReceipt not found' };
    return serializeGR(gr);
  },

 
  async createGR(prisma, data) {
    const { poId, tglGR, notes, items } = data;
    // Validate PO existence and status
    const po = await prisma.purchaseOrder.findUnique({ where: { id: Number(poId) } });
    if (!po) throw { statusCode: 422, message: 'PurchaseOrder not found' };
    if (!['open', 'partial'].includes(po.status)) {
      throw { statusCode: 422, message: 'GoodsReceipt can only be created for PO with status open or partial' };
    }
   
    const poItemIdSet = new Set();
    for (const it of items) {
      if (poItemIdSet.has(it.poItemId)) {
        throw { statusCode: 422, message: 'Duplicate poItemId in request items', details: { poItemId: it.poItemId } };
      }
      poItemIdSet.add(it.poItemId);
    }
    const poItemIds = Array.from(poItemIdSet);
    // Load PO items for validation
    const poItems = await prisma.purchaseOrderItem.findMany({ where: { id: { in: poItemIds } } });
    if (poItems.length !== poItemIds.length) {
      throw { statusCode: 422, message: 'One or more poItemId do not belong to the specified PO' };
    }
  
    for (const it of items) {
      const poItem = poItems.find(p => p.id === it.poItemId);
      const remaining = Number(poItem.qtyPO) - Number(poItem.qtyDiterima);
      if (it.qtyDiterima <= 0) {
        throw { statusCode: 422, message: 'qtyDiterima must be > 0', details: { poItemId: it.poItemId } };
      }
      if (it.qtyDiterima > remaining) {
        throw { statusCode: 422, message: 'Qty diterima melebihi sisa PO', details: { poItemId: it.poItemId, qtyRequested: it.qtyDiterima, qtyRemaining: remaining } };
      }
    }
    // A GR must not precede its PO — compare calendar days (UTC) so time-of-day
    // differences between `date`/`date-time` inputs cannot flip the result.
    const toUtcDay = (d) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    const grDay = toUtcDay(new Date(tglGR));
    const poDay = toUtcDay(new Date(po.tglPO));
    if (grDay < poDay) {
      throw {
        statusCode: 422,
        message: 'Tanggal GR tidak boleh lebih awal dari tanggal PO',
        details: { tglGR, tglPO: po.tglPO },
      };
    }
    // Transaction – create GR, receipt items, update PO items, stock, recalc status, generate final noGR
    // withTransactionRetry: longer tx timeout + retry on transient
    // conflict/timeout (P2028/P2034) that previously surfaced as random 500s.
    const result = await withTransactionRetry(prisma, async (tx) => {
      const tempNoGR = `TMP-${crypto.randomUUID()}`;
      const gr = await tx.goodsReceipt.create({
        data: {
          poId: Number(poId),
          tglGR: new Date(tglGR),
          notes,
          noGR: tempNoGR,
        },
      });
      // Process each receipt item
      for (const it of items) {
        const poItem = poItems.find(p => p.id === it.poItemId);
        await tx.goodsReceiptItem.create({
          data: {
            grId: gr.id,
            poItemId: it.poItemId,
            itemId: poItem.itemId,
            qtyDiterima: it.qtyDiterima,
          },
        });
      
        await tx.purchaseOrderItem.update({
          where: { id: it.poItemId },
          data: { qtyDiterima: { increment: new Decimal(it.qtyDiterima) } },
        });
        
        await tx.item.update({
          where: { id: poItem.itemId },
          data: { stock: { increment: new Decimal(it.qtyDiterima) } },
        });
      }
 
      await recalcPOStatus(tx, Number(poId));
    
      const finalNoGR = `GR-${new Date().getFullYear()}-${String(gr.id).padStart(3, '0')}`;
      await tx.goodsReceipt.update({ where: { id: gr.id }, data: { noGR: finalNoGR } });
      
      const fullGR = await tx.goodsReceipt.findUnique({
        where: { id: gr.id },
        include: { items: { include: { item: true } } },
      });
      return fullGR;
    });
    return serializeGR(result);
  },
};
