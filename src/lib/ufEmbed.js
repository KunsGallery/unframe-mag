// src/lib/ufEmbed.js

// ✅ 허용할 도메인/형식만 embed로 변환 (안전)
export function buildSpotifyEmbed(url, { theme = "0" } = {}) {
  const u = safeURL(url);
  if (!u) return null;

  const host = u.hostname.replace(/^www\./, "");
  const path = u.pathname || "";

  // open.spotify.com/playlist/{id}
  const mPlaylist = path.match(/^\/playlist\/([a-zA-Z0-9]+)\b/);
  if (host === "open.spotify.com" && mPlaylist) {
    return `https://open.spotify.com/embed/playlist/${mPlaylist[1]}?utm_source=generator&theme=${theme}`;
  }

  // open.spotify.com/episode/{id}
  const mEpisode = path.match(/^\/episode\/([a-zA-Z0-9]+)\b/);
  if (host === "open.spotify.com" && mEpisode) {
    return `https://open.spotify.com/embed/episode/${mEpisode[1]}?utm_source=generator&theme=${theme}`;
  }

  // open.spotify.com/show/{id} (팟캐스트 show)
  const mShow = path.match(/^\/show\/([a-zA-Z0-9]+)\b/);
  if (host === "open.spotify.com" && mShow) {
    return `https://open.spotify.com/embed/show/${mShow[1]}?utm_source=generator&theme=${theme}`;
  }

  // spotify embed already
  if (host === "open.spotify.com" && path.startsWith("/embed/")) {
    // theme 파라미터만 보정
    u.searchParams.set("theme", theme);
    return u.toString();
  }

  return null;
}

export function buildYouTubeEmbed(url) {
  const u = safeURL(url);
  if (!u) return null;
  const host = u.hostname.replace(/^www\./, "");

  // youtu.be/{id}
  if (host === "youtu.be") {
    const id = u.pathname.replace("/", "");
    if (id) return `https://www.youtube.com/embed/${id}`;
  }

  // youtube.com/watch?v=
  if (host === "youtube.com" || host === "m.youtube.com") {
    const id = u.searchParams.get("v");
    if (id) return `https://www.youtube.com/embed/${id}`;
  }

  // youtube.com/embed/{id}
  if (host === "youtube.com" && u.pathname.startsWith("/embed/")) return u.toString();

  return null;
}

export function safeURL(input) {
  try {
    const s = String(input || "").trim();
    if (!s) return null;
    // 사용자가 "open.spotify.com/..."만 넣어도 되도록 보정
    const withProto = s.startsWith("http://") || s.startsWith("https://") ? s : `https://${s}`;
    return new URL(withProto);
  } catch {
    return null;
  }
}

/**
 * kind: "playlist" | "podcast"
 * - playlist: spotify playlist 우선
 * - podcast: spotify episode/show 우선 (+ 향후 확장 가능)
 */
export function toEmbedURL(kind, inputUrl, opts = {}) {
  const url = String(inputUrl || "").trim();
  if (!url) return { ok: false, embedUrl: "", reason: "EMPTY" };

  // Spotify 우선
  const spotify = buildSpotifyEmbed(url, { theme: opts.theme ?? "0" });
  if (spotify) return { ok: true, embedUrl: spotify, provider: "spotify" };

  // (확장) 유튜브도 허용하고 싶으면 여기에 붙이면 됨
  const yt = buildYouTubeEmbed(url);
  if (yt) return { ok: true, embedUrl: yt, provider: "youtube" };

  return { ok: false, embedUrl: "", reason: "UNSUPPORTED_URL" };
}

export function defaultEmbedHeight(kind) {
  // Spotify 권장 높이:
  // playlist: 352, podcast: 152(episode/show) 쪽이 더 자연스러움
  if (kind === "podcast") return 152;
  return 352;
}