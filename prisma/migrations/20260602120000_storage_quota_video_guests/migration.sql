-- AlterTable
ALTER TABLE "Event" DROP COLUMN "uploadLimitPerHour",
ADD COLUMN     "allowVideos" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "storageLimitMb" INTEGER NOT NULL DEFAULT 1024;

-- AlterTable
ALTER TABLE "Photo" ADD COLUMN     "fileSize" INTEGER NOT NULL DEFAULT 0;
