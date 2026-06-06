-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "description" TEXT,
ADD COLUMN     "footer" TEXT,
ADD COLUMN     "themeOption1" TEXT NOT NULL DEFAULT 'minimal',
ADD COLUMN     "themeOption2" TEXT NOT NULL DEFAULT 'dark',
ADD COLUMN     "themeOption3" TEXT NOT NULL DEFAULT 'glass';
