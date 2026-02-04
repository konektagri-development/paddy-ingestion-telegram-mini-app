-- AlterTable
ALTER TABLE "paddy" ADD COLUMN     "weatherHumidity" DOUBLE PRECISION,
ADD COLUMN     "weatherPrecipitation" DOUBLE PRECISION,
ADD COLUMN     "weatherTemperature" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "paddy_syncStatus_createdAt_idx" ON "paddy"("syncStatus", "createdAt");

-- CreateIndex
CREATE INDEX "paddy_surveyorId_dateOfVisit_idx" ON "paddy"("surveyorId", "dateOfVisit");
