// src/schemas/item.schema.js
// Validation schemas for Item endpoints.
//
// POST /items contract:
//   { name, itemCategoryCode, brandCode, uom }
// `code`, `sequence`, dan `stock` TIDAK diterima dari client — semuanya
// di-handle otomatis oleh backend:
//   - code     : digenerate dari aturan kode barang {L1}-{L2}-{L3}-{brandCode}-{sequence}
//   - sequence : urutan berikutnya untuk kombinasi kategori + brand yang sama
//   - stock    : dimulai dari 0

module.exports = {
  // List items – optional query filters.
  // Default HANYA item aktif; kirim `include_inactive=true` untuk melihat semua.
  listItemSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      category_code: { type: "string" },
      search: { type: "string" },
      include_inactive: { type: "string", enum: ["true", "1"] },
      skip: { type: "integer", minimum: 0 },
      take: { type: "integer", minimum: 1 },
    },
  },

  createItemSchema: {
    type: "object",
    required: ["name", "itemCategoryCode", "brandCode", "uom"],
    additionalProperties: false,
    properties: {
      name: { type: "string" },
      itemCategoryCode: { type: "string" },
      brandCode: { type: "string" },
      uom: { type: "string" },
    },
  },

  // Update item payload (partial). `stock` sengaja TIDAK bisa diubah manual —
  // stok hanya bergerak melalui penerimaan (Goods Receipt).
  updateItemSchema: {
    type: "object",
    minProperties: 1,
    additionalProperties: false,
    properties: {
      name: { type: "string" },
      brandCode: { type: "string" },
      uom: { type: "string" },
    },
  },
  // PATCH /items/:id/toggle-status — body eksplisit (idempotent):
  //   { isActive: false } → nonaktifkan, { isActive: true } → aktifkan.
  // Item tidak pernah dihapus (soft disable); request dobel tidak membalik status.
  toggleItemStatusSchema: {
    type: "object",
    required: ["isActive"],
    additionalProperties: false,
    properties: {
      isActive: { type: "boolean" },
    },
  },
};
