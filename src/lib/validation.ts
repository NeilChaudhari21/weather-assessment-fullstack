import { z } from "zod";

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format.");

export const locationQuerySchema = z.object({
  location: z.string().trim().min(1, "Enter a location.").optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lon: z.coerce.number().min(-180).max(180).optional(),
});

export const weatherRequestSchema = z.object({
  location: z.string().trim().optional(),
  locationType: z
    .enum(["cityTown", "zip", "coordinates", "landmark"])
    .optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  isCurrentLocation: z.boolean().optional(),
  startDate: isoDateSchema,
  endDate: isoDateSchema,
}).refine(
  (value) =>
    Boolean(value.location?.trim()) ||
    (value.latitude !== undefined && value.longitude !== undefined),
  "Enter a location or use coordinates.",
);

export type WeatherRequestInput = z.infer<typeof weatherRequestSchema>;

export function validateDateRange(startDate: string, endDate: string) {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  const today = startOfToday();
  const max = new Date(today);
  max.setDate(max.getDate() + 15);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Dates must use YYYY-MM-DD format.");
  }

  if (end < start) {
    throw new Error("End date must be the same as or after the start date.");
  }

  if (start < today) {
    throw new Error("Start date cannot be in the past for this forecast demo.");
  }

  if (end > max) {
    throw new Error("Date range must be within the next 16 days.");
  }

  return { start, end };
}

export function parseDateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function startOfToday() {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}
