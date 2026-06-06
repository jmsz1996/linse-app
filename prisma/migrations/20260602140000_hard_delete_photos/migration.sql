-- DropIndex
DROP INDEX "Photo_eventId_hiddenAt_deletedAt_uploadedAt_idx";

-- AlterTable
ALTER TABLE "Photo" DROP COLUMN "deletedAt";

-- CreateIndex
CREATE INDEX "Photo_eventId_hiddenAt_uploadedAt_idx" ON "Photo"("eventId", "hiddenAt", "uploadedAt" DESC);
