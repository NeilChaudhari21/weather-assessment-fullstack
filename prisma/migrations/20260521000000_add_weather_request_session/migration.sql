-- Add a browser/session ownership boundary for anonymous saved requests.
ALTER TABLE "WeatherRequest" ADD COLUMN "sessionId" TEXT NOT NULL DEFAULT 'legacy-global';

-- New records are always written with an explicit session id by the app.
ALTER TABLE "WeatherRequest" ALTER COLUMN "sessionId" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "WeatherRequest_sessionId_createdAt_idx" ON "WeatherRequest"("sessionId", "createdAt");
