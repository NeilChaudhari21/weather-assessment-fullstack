-- CreateTable
CREATE TABLE "WeatherRequest" (
    "id" TEXT NOT NULL,
    "inputLocation" TEXT NOT NULL,
    "resolvedName" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "weatherData" JSONB NOT NULL,
    "airQualityData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeatherRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WeatherRequest_createdAt_idx" ON "WeatherRequest"("createdAt");

-- CreateIndex
CREATE INDEX "WeatherRequest_resolvedName_idx" ON "WeatherRequest"("resolvedName");
