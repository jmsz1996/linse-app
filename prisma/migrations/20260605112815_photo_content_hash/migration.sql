-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "contentHash" TEXT;

-- CreateIndex
CREATE INDEX "Photo_eventId_contentHash_idx" ON "Photo"("eventId", "contentHash");
