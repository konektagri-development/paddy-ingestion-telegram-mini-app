-- Enable PostGIS and UUID extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- CreateTable
CREATE TABLE "paddy_field" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "surveyorId" UUID NOT NULL,
    "fullFieldId" TEXT NOT NULL,
    "fieldNumber" TEXT NOT NULL,
    "provinceName" TEXT,
    "districtName" TEXT,
    "communeName" TEXT,
    "boundary" geometry(Polygon, 4326),

    CONSTRAINT "paddy_field_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paddy_survey" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "fieldId" UUID NOT NULL,
    "dateOfVisit" DATE NOT NULL,
    "location" geometry(Point, 4326) NOT NULL,
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
    "weatherTemperature" DOUBLE PRECISION,
    "weatherHumidity" DOUBLE PRECISION,
    "weatherPrecipitation" DOUBLE PRECISION,
    "photoUrls" TEXT[],
    "photoFolderDriveUrl" TEXT,
    "notes" TEXT,
    "syncStatus" TEXT NOT NULL DEFAULT 'pending',
    "syncError" TEXT,
    "syncedAt" TIMESTAMP(3),

    CONSTRAINT "paddy_survey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "paddy_field_fullFieldId_key" ON "paddy_field"("fullFieldId");

-- CreateIndex
CREATE INDEX "paddy_field_surveyorId_idx" ON "paddy_field"("surveyorId");

-- CreateIndex
CREATE INDEX "paddy_field_fullFieldId_idx" ON "paddy_field"("fullFieldId");

-- CreateIndex
CREATE INDEX "paddy_survey_fieldId_idx" ON "paddy_survey"("fieldId");

-- CreateIndex
CREATE INDEX "paddy_survey_dateOfVisit_idx" ON "paddy_survey"("dateOfVisit");

-- CreateIndex
CREATE INDEX "paddy_survey_syncStatus_createdAt_idx" ON "paddy_survey"("syncStatus", "createdAt");

-- AddForeignKey
ALTER TABLE "paddy_field" ADD CONSTRAINT "paddy_field_surveyorId_fkey" FOREIGN KEY ("surveyorId") REFERENCES "surveyor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paddy_survey" ADD CONSTRAINT "paddy_survey_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "paddy_field"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Data Migration
-- 1. Migrate fields from paddy to paddy_field
-- We group by farmId to create one field record per unique farm ID
INSERT INTO "paddy_field" (id, "createdAt", "updatedAt", "surveyorId", "fullFieldId", "fieldNumber", "provinceName", "districtName", "communeName")
SELECT 
    gen_random_uuid(), 
    MIN("createdAt"),
    MAX("updatedAt"),
    "surveyorId",
    "farmId",
    "farmNumber",
    "provinceName",
    "districtName",
    "communeName"
FROM "paddy"
GROUP BY "farmId", "surveyorId", "farmNumber", "provinceName", "districtName", "communeName";

-- 2. Migrate surveys from paddy to paddy_survey
-- We join with the newly created paddy_field to get the fieldId
INSERT INTO "paddy_survey" (
    id, "createdAt", "updatedAt", "fieldId", "dateOfVisit", location,
    rainfall, "rainfallIntensity", "soilRoughness", "growthStage", "waterStatus",
    "overallHealth", "visibleProblems", "fertilizer", "fertilizerType",
    herbicide, pesticide, "stressEvents", "weatherTemperature", "weatherHumidity",
    "weatherPrecipitation", "photoUrls", "photoFolderDriveUrl", "notes",
    "syncStatus", "syncError", "syncedAt"
)
SELECT 
    p.id, p."createdAt", p."updatedAt", f.id, p."dateOfVisit", 
    ST_SetSRID(ST_Point(p."gpsLongitude" , p."gpsLatitude"), 4326),
    p.rainfall, p."rainfallIntensity", p."soilRoughness", p."growthStage", p."waterStatus",
    p."overallHealth", p."visibleProblems", p."fertilizer", p."fertilizerType",
    p.herbicide, p.pesticide, p."stressEvents", 
    p."weatherTemperature", p."weatherHumidity", p."weatherPrecipitation", 
    p."photoUrls", p."photoFolderDriveUrl", p.notes,
    p."syncStatus", p."syncError", p."syncedAt"
FROM "paddy" p
JOIN "paddy_field" f ON p."farmId" = f."fullFieldId";

-- Drop existing foreign key and table
ALTER TABLE "paddy" DROP CONSTRAINT "paddy_surveyorId_fkey";
DROP TABLE "paddy";
