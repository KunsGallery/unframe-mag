// netlify/functions/uploadImage.js

export const handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return json(405, { ok: false, error: "Method Not Allowed" });
    }

    const key = process.env.IMGBB_KEY;
    if (!key) return json(500, { ok: false, error: "IMGBB_KEY missing (env)" });

    const ct = event.headers["content-type"] || event.headers["Content-Type"] || "";
    if (!ct.includes("multipart/form-data")) {
      return json(400, { ok: false, error: "Content-Type must be multipart/form-data" });
    }

    const raw = event.isBase64Encoded
      ? Buffer.from(event.body || "", "base64")
      : Buffer.from(event.body || "", "utf8");

    const boundary = ct.split("boundary=")[1];
    if (!boundary) return json(400, { ok: false, error: "Missing boundary" });

    const { fileBuffer, filename } = parseMultipart(raw, boundary);
    if (!fileBuffer) return json(400, { ok: false, error: "No file found in form-data" });

    const base64 = fileBuffer.toString("base64");

    const params = new URLSearchParams();
    params.append("image", base64);
    params.append("name", filename || "image");

    const res = await fetch(`https://api.imgbb.com/1/upload?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok || !data?.success || !data?.data?.url) {
      return json(502, { ok: false, error: "imgbb upload failed", status: res.status, imgbb: data });
    }

    return json(200, {
      ok: true,
      url: data.data.url,
      // ✅ 썸네일/미디엄 URL 함께 반환 (없을 수도 있으니 안전하게)
      thumbUrl: data.data?.thumb?.url || "",
      mediumUrl: data.data?.medium?.url || "",
    });
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

function parseMultipart(buffer, boundary) {
  const boundaryBuf = Buffer.from(`--${boundary}`);
  const parts = splitBuffer(buffer, boundaryBuf).filter((p) => p.length);

  for (const part of parts) {
    if (part.slice(0, 2).toString() === "--") continue;

    const idx = part.indexOf(Buffer.from("\r\n\r\n"));
    if (idx === -1) continue;

    const head = part.slice(0, idx).toString("utf8");
    const body = part.slice(idx + 4);

    const m = /filename="([^"]+)"/.exec(head);
    const filename = m?.[1];

    const cleaned = body.slice(0, Math.max(0, body.length - 2));
    if (filename && cleaned.length) {
      return { fileBuffer: cleaned, filename };
    }
  }
  return { fileBuffer: null, filename: null };
}

function splitBuffer(buf, sep) {
  const out = [];
  let start = 0;
  while (true) {
    const idx = buf.indexOf(sep, start);
    if (idx === -1) {
      out.push(buf.slice(start));
      break;
    }
    out.push(buf.slice(start, idx));
    start = idx + sep.length;
  }
  return out;
}
