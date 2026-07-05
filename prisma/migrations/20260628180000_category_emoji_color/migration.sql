-- AlterTable
ALTER TABLE "Category" ADD COLUMN "emoji" TEXT NOT NULL DEFAULT '📁';
ALTER TABLE "Category" ADD COLUMN "color" TEXT NOT NULL DEFAULT '#6366f1';

-- Backfill system categories (dark-mode-friendly palette)
UPDATE "Category" SET "emoji" = '🍽️', "color" = '#6366f1' WHERE "name" = 'food';
UPDATE "Category" SET "emoji" = '🛒', "color" = '#0891b2' WHERE "name" = 'groceries';
UPDATE "Category" SET "emoji" = '🚗', "color" = '#16a34a' WHERE "name" = 'transport';
UPDATE "Category" SET "emoji" = '✈️', "color" = '#f59e0b' WHERE "name" = 'travel';
UPDATE "Category" SET "emoji" = '📱', "color" = '#ef4444' WHERE "name" = 'subscriptions';
UPDATE "Category" SET "emoji" = '🛍️', "color" = '#a855f7' WHERE "name" = 'shopping';
UPDATE "Category" SET "emoji" = '🔧', "color" = '#ec4899' WHERE "name" = 'services';
UPDATE "Category" SET "emoji" = '💼', "color" = '#14b8a6' WHERE "name" = 'business';
UPDATE "Category" SET "emoji" = '💡', "color" = '#84cc16' WHERE "name" = 'utilities';
UPDATE "Category" SET "emoji" = '💊', "color" = '#0ea5e9' WHERE "name" = 'health';
UPDATE "Category" SET "emoji" = '💸', "color" = '#f97316' WHERE "name" = 'fees';
UPDATE "Category" SET "emoji" = '💳', "color" = '#eab308' WHERE "name" = 'payments';
UPDATE "Category" SET "emoji" = '📋', "color" = '#71717a' WHERE "name" = 'uncategorized';
