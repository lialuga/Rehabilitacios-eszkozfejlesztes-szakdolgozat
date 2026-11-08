-- DropForeignKey
ALTER TABLE "Sample" DROP CONSTRAINT "Sample_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT "Session_userId_fkey";

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "avgAngle" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "avgCorrectionMs" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "cadence" INTEGER,
ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "inwardThreshold" INTEGER NOT NULL DEFAULT 8,
ADD COLUMN     "motorActivations" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "outwardEvents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "outwardThreshold" INTEGER,
ADD COLUMN     "peakAngle" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'ble',
ADD COLUMN     "steps" INTEGER,
ADD COLUMN     "trace" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[],
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "email" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Session_userId_startedAt_idx" ON "Session"("userId", "startedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Session_userId_clientId_key" ON "Session"("userId", "clientId");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sample" ADD CONSTRAINT "Sample_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

