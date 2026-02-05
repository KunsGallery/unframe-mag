// netlify/functions/uploadImage.js
exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return json(405, { ok: false, error: "Method Not Allowed" });
    }

    const key = process.env.IMGBB_KEY;
    if (!key) return json(500, { ok: false, error: "IMGBB_KEY missing (env)" });

    const ct = event.headers["content-type"] || event.headers["Content-Type"] || "";
    if (!ct.includes("application/json")) {
      return json(400, { ok: false, error: "Content-Type must be application/json" });
    }

    const body = JSON.parse(event.body || "{}");
    const dataUrl = body.dataUrl || "";
    const name = body.name || "image";

    if (!dataUrl.includes("base64,")) {
      return json(400, { ok: false, error: "Invalid dataUrl" });
    }

    const base64 = dataUrl.split("base64,")[1];
    const params = new URLSearchParams();
    params.append("image", base64);
    params.append("name", name);

    const res = await fetch(`https://api.imgbb.com/1/upload?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data?.success || !data?.data?.url) {
      return json(502, { ok: false, error: "imgbb upload failed", status: res.status, imgbb: data });
    }

    return json(200, { ok: true, url: data.data.url });
  } catch (e) {
    return json(500, { ok: false, error: String(e?.message || e) });
  }
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
    },
    body: JSON.stringify(body),
  };
}
