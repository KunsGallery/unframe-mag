export default async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const apiKey = process.env.IMGBB_KEY;
    if (!apiKey) {
      return new Response("Missing IMGBB_KEY", { status: 500 });
    }

    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return new Response("Invalid content-type", { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("image");
    if (!file) {
      return new Response("Missing image", { status: 400 });
    }

    // imgbb는 multipart로 'image' 전달 가능
    const imgbbForm = new FormData();
    imgbbForm.append("image", file);

    const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
      method: "POST",
      body: imgbbForm,
    });

    const data = await imgbbRes.json();
    const url = data?.data?.url;

    if (!url) {
      return new Response(JSON.stringify({ ok: false, data }), {
        status: 502,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, url }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
};
