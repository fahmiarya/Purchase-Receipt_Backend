-- CreateTable
CREATE TABLE `item_categories` (
    `code` VARCHAR(10) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `parent_code` VARCHAR(10) NULL,

    PRIMARY KEY (`code`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `item_category_code` VARCHAR(10) NULL,
    `brand_code` VARCHAR(3) NOT NULL DEFAULT '000',
    `sequence` INTEGER NOT NULL DEFAULT 1,
    `uom` ENUM('pcs', 'kg', 'gram', 'm', 'cm', 'liter', 'ml', 'set', 'unit', 'lembar', 'batang', 'roll') NOT NULL,
    `stock` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `items_code_key`(`code`),
    UNIQUE INDEX `items_item_category_code_brand_code_sequence_key`(`item_category_code`, `brand_code`, `sequence`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vendors` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(50) NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `phone` VARCHAR(20) NULL,
    `address` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `vendors_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `no_po` VARCHAR(50) NOT NULL,
    `no_pr` VARCHAR(50) NULL,
    `vendor_id` INTEGER NOT NULL,
    `tgl_po` DATE NOT NULL,
    `status` ENUM('open', 'partial', 'complete', 'cancelled') NOT NULL DEFAULT 'open',
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `purchase_orders_no_po_key`(`no_po`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_order_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `po_id` INTEGER NOT NULL,
    `item_id` INTEGER NOT NULL,
    `qty_po` DECIMAL(15, 2) NOT NULL,
    `harga_po` DECIMAL(15, 2) NOT NULL,
    `qty_diterima` DECIMAL(15, 2) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `goods_receipts` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `no_gr` VARCHAR(50) NOT NULL,
    `po_id` INTEGER NOT NULL,
    `tgl_gr` DATE NOT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `goods_receipts_no_gr_key`(`no_gr`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `goods_receipt_items` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `gr_id` INTEGER NOT NULL,
    `po_item_id` INTEGER NOT NULL,
    `item_id` INTEGER NOT NULL,
    `qty_diterima` DECIMAL(15, 2) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `item_categories` ADD CONSTRAINT `item_categories_parent_code_fkey` FOREIGN KEY (`parent_code`) REFERENCES `item_categories`(`code`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `items` ADD CONSTRAINT `items_item_category_code_fkey` FOREIGN KEY (`item_category_code`) REFERENCES `item_categories`(`code`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_vendor_id_fkey` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_po_id_fkey` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `goods_receipts` ADD CONSTRAINT `goods_receipts_po_id_fkey` FOREIGN KEY (`po_id`) REFERENCES `purchase_orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `goods_receipt_items` ADD CONSTRAINT `goods_receipt_items_gr_id_fkey` FOREIGN KEY (`gr_id`) REFERENCES `goods_receipts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `goods_receipt_items` ADD CONSTRAINT `goods_receipt_items_po_item_id_fkey` FOREIGN KEY (`po_item_id`) REFERENCES `purchase_order_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `goods_receipt_items` ADD CONSTRAINT `goods_receipt_items_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
