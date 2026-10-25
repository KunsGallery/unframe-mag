// Logs sampled Core Web Vitals (see src/lib/webVitals.js) for performance tracking.
const METRICS = new Set(["LCP", "CLS", "INP", "FCP", "TTFB"]);
const RATINGS = new Set(["good", "needs-improvement", "poor"]);

export default async function handler(request) {
  if (request.method !== "POST") return new Response(null, { status: 405 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return new Response(null, { status: 403 });
  try {
    const body = await request.text();
    if (body.length > 1024) return new Response(null, { status: 413 });
    const input = JSON.parse(body);
    const value = Number(input?.value);
    if (!METRICS.has(input?.name) || !Number.isFinite(value) || value < 0 || !RATINGS.has(input?.rating)) {
      return new Response(null, { status: 400 });
    }
    const event = {
      name: input.name,
      value: Math.round(value * 1000) / 1000,
      rating: input.rating,
      route: String(input.route || "").slice(0, 60),
      device: input.device === "mobile" ? "mobile" : "desktop",
      build: String(input.build || "").slice(0, 40),
    };
    console.log("[uf:vitals]", JSON.stringify(event));
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch {
    return new Response(null, { status: 400 });
  }
}

export const config = { path: "/api/client-vitals" };
