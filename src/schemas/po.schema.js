// src/schemas/po.schema.js
// JSON schemas for Purchase Order endpoints (Fastify validation)

module.exports = {
  poSchema: {
    type: "object",
    required: ["vendorId", "tglPO", "items"],
    additionalProperties: false,
    properties: {
      vendorId: { type: "integer" },
      tglPO: { type: "string", format: "date-time" },
      notes: { type: ["string", "null"] },
      items: {
        type: "array",
        minItems: 1,
        items: {
          type: "object",
          required: ["itemId", "qtyPO", "hargaPO"],
          additionalProperties: false,
          properties: {
            itemId: { type: "integer" },
            qtyPO: { type: "number", minimum: 0.000001 },
            hargaPO: { type: "number", minimum: 0.000001 },
          },
        },
      },
    },
  },

  poUpdateSchema: {
    type: "object",
    minProperties: 1,
    additionalProperties: false,
    properties: {
      vendorId: { type: "integer" },
      tglPO: { type: "string", format: "date-time" },
      notes: { type: ["string", "null"] },
    },
  },

  poItemSchema: {
    type: "object",
    required: ["itemId", "qtyPO", "hargaPO"],
    additionalProperties: false,
    properties: {
      itemId: { type: "integer" },
      qtyPO: { type: "number", minimum: 0.000001 },
      hargaPO: { type: "number", minimum: 0.000001 },
    },
  },
};
