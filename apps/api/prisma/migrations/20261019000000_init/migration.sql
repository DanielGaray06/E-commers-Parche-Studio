-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(190) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `role` VARCHAR(32) NOT NULL DEFAULT 'admin',
    `active` BOOLEAN NOT NULL DEFAULT true,
    `lastLoginAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(120) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `blurb` VARCHAR(255) NULL,
    `icon` VARCHAR(40) NULL,
    `position` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `categories_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` VARCHAR(191) NOT NULL,
    `sku` VARCHAR(64) NOT NULL,
    `slug` VARCHAR(160) NOT NULL,
    `name` VARCHAR(160) NOT NULL,
    `description` TEXT NOT NULL,
    `price` INTEGER NOT NULL,
    `compareAtPrice` INTEGER NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `images` TEXT NOT NULL,
    `sizes` TEXT NOT NULL,
    `colors` TEXT NOT NULL,
    `tags` TEXT NOT NULL,
    `stock` INTEGER NOT NULL DEFAULT 0,
    `material` VARCHAR(160) NULL,
    `fit` VARCHAR(120) NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `products_sku_key`(`sku`),
    UNIQUE INDEX `products_slug_key`(`slug`),
    INDEX `products_categoryId_idx`(`categoryId`),
    INDEX `products_active_idx`(`active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orders` (
    `id` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(32) NOT NULL,
    `status` VARCHAR(24) NOT NULL DEFAULT 'pendiente',
    `channel` VARCHAR(24) NOT NULL DEFAULT 'whatsapp',
    `customerName` VARCHAR(160) NOT NULL,
    `customerPhone` VARCHAR(40) NULL,
    `neighborhood` VARCHAR(120) NULL,
    `address` VARCHAR(255) NULL,
    `deliveryMethod` VARCHAR(40) NULL,
    `notes` TEXT NULL,
    `subtotal` INTEGER NOT NULL,
    `shipping` INTEGER NOT NULL DEFAULT 0,
    `shippingPending` BOOLEAN NOT NULL DEFAULT true,
    `total` INTEGER NOT NULL,
    `createdById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `confirmedAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `canceledAt` DATETIME(3) NULL,

    UNIQUE INDEX `orders_reference_key`(`reference`),
    INDEX `orders_status_idx`(`status`),
    INDEX `orders_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_items` (
    `id` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NULL,
    `name` VARCHAR(160) NOT NULL,
    `size` VARCHAR(32) NULL,
    `color` VARCHAR(32) NULL,
    `unitPrice` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `lineTotal` INTEGER NOT NULL,

    INDEX `order_items_orderId_idx`(`orderId`),
    INDEX `order_items_productId_idx`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `settings` (
    `key` VARCHAR(80) NOT NULL,
    `value` TEXT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

