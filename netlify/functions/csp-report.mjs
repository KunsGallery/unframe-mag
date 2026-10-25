// Logs Content-Security-Policy violations from the Report-Only policy in public/_headers.
// Only the directive and the blocked origin are kept; page URLs and samples are dropped.
const origin = (value) => {
  try {
    return new URL(value).origin;
  } catch {
    return String(value || "").slice(0, 40);
  }
};

export default async function handler(request) {
  if (request.method !== "POST") return new Response(null, { status: 405 });
  if (Number(request.headers.get("content-length") || 0) > 8192) return new Response(null, { status: 413 });
  try {
    const body = await request.text();
    if (body.length > 8192) return new Response(null, { status: 413 });
    const input = JSON.parse(body);
    const reports = Array.isArray(input) ? input.map((item) => item?.body) : [input?.["csp-report"]];
    for (const report of reports.filter(Boolean).slice(0, 10)) {
      const directive = String(report.effectiveDirective || report["effective-directive"] || report["violated-directive"] || "").slice(0, 40);
      const blocked = origin(report.blockedURL || report["blocked-uri"]);
      console.warn("[uf:csp]", JSON.stringify({ directive, blocked }));
    }
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch {
    return new Response(null, { status: 400 });
  }
}

export const config = { path: "/api/csp-report" };
