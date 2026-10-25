// src/schemas/gr.schema.js
// JSON‑Schema validation for Goods Receipt (GR) endpoints.

module.exports = {
  // Body schema for creating a Goods Receipt
  create: {
    type: 'object',
    required: ['poId', 'tglGR', 'items'],
    additionalProperties: false,
    properties: {
      poId: { type: 'integer' },
      tglGR: { type: 'string', format: 'date-time' },
      notes: { type: ['string', 'null'] },
      items: {
        type: 'array',
        minItems: 1,
        items: {
          type: 'object',
          required: ['poItemId', 'qtyDiterima'],
          additionalProperties: false,
          properties: {
            poItemId: { type: 'integer' },
            qtyDiterima: { type: 'number', minimum: 0.000001 },
          },
        },
      },
    },
  },
};
