-- CreateTable
CREATE TABLE "surveyor" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "surveyorNumber" TEXT NOT NULL,
    "locationCode" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "providerUsername" TEXT,
    "firstName" TEXT,
    "lastName" TEXT,
    "phone" TEXT,
    "email" TEXT,

    CONSTRAINT "surveyor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paddy" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "surveyorId" UUID NOT NULL,
    "farmId" TEXT NOT NULL,
    "farmNumber" TEXT NOT NULL,
    "gpsLatitude" DECIMAL(10,7) NOT NULL,
    "gpsLongitude" DECIMAL(10,7) NOT NULL,
    "provinceName" TEXT,
    "districtName" TEXT,
    "communeName" TEXT,
    "dateOfVisit" DATE NOT NULL,
    "rainfall" TEXT NOT NULL,
    "rainfallIntensity" TEXT,
    "soilRoughness" TEXT NOT NULL,
    "growthStage" TEXT NOT NULL,
    "waterStatus" TEXT NOT NULL,
    "overallHealth" TEXT NOT NULL,
    "visibleProblems" TEXT NOT NULL,
    "fertilizer" TEXT NOT NULL,
    "fertilizerType" TEXT,
    "herbicide" TEXT NOT NULL,
    "pesticide" TEXT NOT NULL,
    "stressEvents" TEXT NOT NULL,
    "photoUrls" TEXT[],
    "photoFolderDriveUrl" TEXT,
    "notes" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'pending',
    "syncError" TEXT,
    "syncedAt" TIMESTAMP(3),

    CONSTRAINT "paddy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "surveyor_providerName_idx" ON "surveyor"("providerName");

-- CreateIndex
CREATE UNIQUE INDEX "surveyor_providerName_providerUserId_key" ON "surveyor"("providerName", "providerUserId");

-- CreateIndex
CREATE INDEX "paddy_surveyorId_idx" ON "paddy"("surveyorId");

-- CreateIndex
CREATE INDEX "paddy_farmId_idx" ON "paddy"("farmId");

-- CreateIndex
CREATE INDEX "paddy_dateOfVisit_idx" ON "paddy"("dateOfVisit");

-- AddForeignKey
ALTER TABLE "paddy" ADD CONSTRAINT "paddy_surveyorId_fkey" FOREIGN KEY ("surveyorId") REFERENCES "surveyor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
