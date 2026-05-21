import { cookies } from "next/headers";

const weatherSessionCookie = "weather_session_id";
const maxAgeSeconds = 60 * 60 * 24 * 180;

export async function getWeatherSessionId() {
  const cookieStore = await cookies();
  const existing = cookieStore.get(weatherSessionCookie)?.value;

  if (existing && isValidSessionId(existing)) {
    return existing;
  }

  const sessionId = crypto.randomUUID();

  cookieStore.set(weatherSessionCookie, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  });

  return sessionId;
}

function isValidSessionId(value: string) {
  return /^[a-z0-9-]{16,80}$/i.test(value);
}
