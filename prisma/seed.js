// prisma/seed.js
/**
 * Comprehensive seed script matching the data defined in REQUIREMENTS.md.
 * It populates:
 *   1. Item categories (including parent/child hierarchy)
 *   2. Vendors (code, name, phone, address)
 *   3. Items (code, name, category, brand, uom, stock, etc.)
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // -------------------------------------------------------------------
  // 1️⃣ Item Categories – hierarchical list (as documented in REQ)
  // -------------------------------------------------------------------
  const categories = [
    // Top‑level
    { code: 'A',  name: 'Raw Material',            parentCode: null },
    { code: 'B',  name: 'Packaging',               parentCode: null },
    { code: 'C',  name: 'Spare Part & Consumable', parentCode: null },
    // Level 2 under A
    { code: 'AA', name: 'Plastik & Resin',         parentCode: 'A' },
    { code: 'AB', name: 'Additive & Chemical',     parentCode: 'A' },
    { code: 'AC', name: 'Komposit',                parentCode: 'A' },
    // Level 2 under B
    { code: 'BA', name: 'Packaging Primer',        parentCode: 'B' },
    { code: 'BB', name: 'Packaging Sekunder',      parentCode: 'B' },
    // Level 2 under C
    { code: 'CA', name: 'Spare Part Mesin',        parentCode: 'C' },
    { code: 'CB', name: 'Consumable Produksi',     parentCode: 'C' },
    // Level 3 under AA (Plastik & Resin)
    { code: 'PPR', name: 'Polypropylene (PP)',     parentCode: 'AA' },
    { code: 'PER', name: 'Polyethylene (PE)',      parentCode: 'AA' },
    { code: 'PVC', name: 'PVC Resin',               parentCode: 'AA' },
    { code: 'ABS', name: 'ABS Resin',               parentCode: 'AA' },
    // Level 3 under AB (Additive & Chemical)
    { code: 'MBT', name: 'Masterbatch',            parentCode: 'AB' },
    { code: 'STB', name: 'Stabilizer',              parentCode: 'AB' },
    { code: 'PLZ', name: 'Plasticizer',             parentCode: 'AB' },
    // Level 3 under AC (Komposit)
    { code: 'WPC', name: 'Wood Plastic Composite', parentCode: 'AC' },
    { code: 'ACP', name: 'Aluminum Composite Panel', parentCode: 'AC' },
    // Level 3 under BA (Packaging Primer)
    { code: 'PKP', name: 'Plastik Wrapping',        parentCode: 'BA' },
    // Level 3 under BB (Packaging Sekunder)
    { code: 'KRD', name: 'Kardus / Karton Box',    parentCode: 'BB' },
    { code: 'STR', name: 'Strapping Band',         parentCode: 'BB' },
  ];

  for (const cat of categories) {
    await prisma.itemCategory.upsert({
      where: { code: cat.code },
      update: {},
      create: cat,
    });
  }

  // -------------------------------------------------------------------
  // 2️⃣ Vendors – list defined in REQUIREMENTS.md
  // -------------------------------------------------------------------
  const vendors = [
    { code: 'CAP', name: 'PT Chandra Asri Petrochemical', phone: '02180889999', address: 'Jl. Raya Anyer Km. 123, Cilegon, Banten' },
    { code: 'LCT', name: 'PT Lotte Chemical Titan Nusantara', phone: '02189111234', address: 'Jl. Raya Merak Km. 116, Cilegon, Banten' },
    { code: 'PLT', name: 'PT Polytama Propindo', phone: '02348300100', address: 'Jl. Industri Raya, Balongan, Indramayu' },
    { code: 'ASH', name: 'PT Asahimas Chemical', phone: '02159385000', address: 'Jl. Raya Anyer Km. 122, Cilegon, Banten' },
    { code: 'LGC', name: 'PT LG Chem Indonesia', phone: '02157960000', address: 'Jl. Jend. Sudirman Kav. 25, Jakarta Selatan' },
    { code: 'CLR', name: 'PT Clariant Indonesia', phone: '02189907000', address: 'Jl. Jababeka Raya Blok C, Cikarang, Bekasi' },
    { code: 'BSF', name: 'PT BASF Indonesia', phone: '02157958000', address: 'Jl. Jend. Sudirman Kav. 61-62, Jakarta Selatan' },
    { code: 'TPS', name: 'PT Tiga Pilar Sejahtera', phone: '02789990000', address: 'Jl. Raya Solo-Sragen Km. 19, Karanganyar' },
    { code: 'SNV', name: 'PT Supernova Flexible Packaging', phone: '02189835000', address: 'Jl. Industri Selatan 3 Blok GG, Cikarang' },
  ];

  for (const v of vendors) {
    await prisma.vendor.upsert({
      where: { code: v.code },
      update: {},
      create: v,
    });
  }

  // -------------------------------------------------------------------
  // 3️⃣ Items – sample catalogue
  // -------------------------------------------------------------------
  const items = [
    { code: 'A-AA-PPR-000-001', name: 'PP Homopolymer Natural',    itemCategoryCode: 'PPR', brandCode: '000', sequence: 1, uom: 'kg',  stock: 0 },
    { code: 'A-AA-PPR-000-002', name: 'PP Copolymer Black',         itemCategoryCode: 'PPR', brandCode: '000', sequence: 2, uom: 'kg',  stock: 0 },
    { code: 'A-AA-PPR-CAP-001', name: 'PP Homopolymer Capilene',    itemCategoryCode: 'PPR', brandCode: 'CAP', sequence: 1, uom: 'kg',  stock: 0 },
    { code: 'A-AA-PER-000-001', name: 'HDPE Granule',               itemCategoryCode: 'PER', brandCode: '000', sequence: 1, uom: 'kg',  stock: 0 },
    { code: 'A-AA-PER-000-002', name: 'LDPE Film Grade',            itemCategoryCode: 'PER', brandCode: '000', sequence: 2, uom: 'kg',  stock: 0 },
    { code: 'A-AA-PVC-000-001', name: 'PVC Resin K67',              itemCategoryCode: 'PVC', brandCode: '000', sequence: 1, uom: 'kg',  stock: 0 },
    { code: 'A-AA-PVC-SHI-001', name: 'PVC Resin K67 Shintech',     itemCategoryCode: 'PVC', brandCode: 'SHI', sequence: 1, uom: 'kg',  stock: 0 },
    { code: 'A-AA-ABS-000-001', name: 'ABS Resin General Purpose',  itemCategoryCode: 'ABS', brandCode: '000', sequence: 1, uom: 'kg',  stock: 0 },
    { code: 'A-AB-MBT-000-001', name: 'Masterbatch Hitam',          itemCategoryCode: 'MBT', brandCode: '000', sequence: 1, uom: 'kg',  stock: 0 },
    { code: 'A-AB-MBT-000-002', name: 'Masterbatch Putih',          itemCategoryCode: 'MBT', brandCode: '000', sequence: 2, uom: 'kg',  stock: 0 },
    { code: 'A-AB-STB-000-001', name: 'Thermal Stabilizer',         itemCategoryCode: 'STB', brandCode: '000', sequence: 1, uom: 'kg',  stock: 0 },
    { code: 'A-AB-PLZ-000-001', name: 'DOP Plasticizer',            itemCategoryCode: 'PLZ', brandCode: '000', sequence: 1, uom: 'liter', stock: 0 },
    { code: 'A-AC-WPC-000-001', name: 'WPC Compound Decking Grade', itemCategoryCode: 'WPC', brandCode: '000', sequence: 1, uom: 'kg',  stock: 0 },
    { code: 'A-AC-ACP-000-001', name: 'Aluminum Sheet 0.3mm',       itemCategoryCode: 'ACP', brandCode: '000', sequence: 1, uom: 'lembar', stock: 0 },
    { code: 'B-BA-PKP-000-001', name: 'Stretch Film Wrapping',      itemCategoryCode: 'PKP', brandCode: '000', sequence: 1, uom: 'roll', stock: 0 },
    { code: 'B-BB-KRD-000-001', name: 'Karton Box 60x40x40',        itemCategoryCode: 'KRD', brandCode: '000', sequence: 1, uom: 'pcs', stock: 0 },
    { code: 'B-BB-STR-000-001', name: 'Strapping Band PP 12mm',     itemCategoryCode: 'STR', brandCode: '000', sequence: 1, uom: 'roll', stock: 0 },
  ];

  for (const it of items) {
    await prisma.item.upsert({
      where: { code: it.code },
      update: {},
      create: it,
    });
  }

  console.log('🌱 Seed completed – categories, vendors, and items are loaded');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
