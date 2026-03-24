export function getAppUrl(): string {
  const fromVite = (import.meta.env as any)?.VITE_APP_URL as string | undefined;
  const fromRaw = (import.meta.env as any)?.APP_URL as string | undefined;
  const raw = fromVite || fromRaw || "";
  try {
    const u = new URL(raw);
    return u.origin;
  } catch {
    try {
      return window.location.origin;
    } catch {
      return "";
    }
  }
}
