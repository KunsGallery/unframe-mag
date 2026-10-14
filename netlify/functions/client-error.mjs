const fields = ["code", "source", "route", "browser", "build", "at"];

export default async function handler(request) {
  if (request.method !== "POST") return new Response(null, { status: 405 });
  if (Number(request.headers.get("content-length") || 0) > 2048) return new Response(null, { status: 413 });
  const origin = request.headers.get("origin");
  if (origin !== new URL(request.url).origin) return new Response(null, { status: 403 });
  try {
    const body = await request.text();
    if (body.length > 2048) return new Response(null, { status: 413 });
    const input = JSON.parse(body);
    if (!input || typeof input !== "object" || fields.some((key) => typeof input[key] !== "string" || input[key].length > 160)) return new Response(null, { status: 400 });
    const event = Object.fromEntries(fields.map((key) => [key, input[key].replace(/[\r\n]/g, " ")]));
    console.error("[uf:client-error]", JSON.stringify(event));
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch {
    return new Response(null, { status: 400 });
  }
}

export const config = { path: "/api/client-error" };
