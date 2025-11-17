// src/services/githubService.js
// Layanan kecil untuk baca/tulis file JSON di GitHub (contents API).
// Pastikan environment variable REACT_APP_GITHUB_TOKEN terpasang (Vercel/Netlify/env lokal).
// USAGE:
// - loadDatabase(): ambil parsed JSON dari raw file (public) atau dari API (private).
// - saveDatabase(newData, { message }): commit perubahan (requires token).

const OWNER = "irwan1605"; // ganti jika perlu
const REPO = "app-mila-phone"; // ganti jika perlu
const PATH = "src/data/database.js"; // path di repo (sesuai repo Anda)
const BRANCH = "main";

function getRawUrl() {
  // URL raw. GitHub raw bisa diakses jika file public.
  return `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}/${PATH.replace(
    /^src\//,
    "src/"
  )}`;
}

async function fetchGitHubApi(path, opts = {}) {
  const token = process.env.REACT_APP_GITHUB_TOKEN;
  const headers = opts.headers || {};
  if (token) headers["Authorization"] = `token ${token}`;
  headers["Accept"] = "application/vnd.github+json";
  const res = await fetch(path, { ...opts, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    const err = new Error(`GitHub API error: ${res.status} ${res.statusText} ${text}`);
    err.status = res.status;
    throw err;
  }
  return res.json().catch(() => null);
}

/**
 * loadDatabase
 * - jika file di repo publik: coba raw.githubusercontent (lebih cepat, no-auth)
 * - jika gagal (private) -> pakai GitHub API /repos/contents endpoint (requires token)
 */
export async function loadDatabase() {
  // Coba raw first (no auth).
  const rawUrl = getRawUrl();
  try {
    const r = await fetch(rawUrl + `?t=${Date.now()}`); // cache-bust
    if (!r.ok) throw new Error("raw fetch failed");
    const text = await r.text();
    // file mungkin JS module: export default {...}
    // kita coba ekstrak JSON dari "export default " atau dari plain JSON
    const js = text.trim();
    let jsonText = js;
    if (js.startsWith("export default")) {
      // remove "export default" and possible trailing semicolon
      jsonText = js.replace(/^export\s+default\s+/, "");
      if (jsonText.endsWith(";")) jsonText = jsonText.slice(0, -1);
    }
    // If it's JS object, try eval-less parse: ensure keys double-quoted -> try Function
    try {
      // First attempt JSON.parse (if it's valid JSON)
      return JSON.parse(jsonText);
    } catch (e) {
      // Fallback: try to evaluate safely by wrapping into a function (no external access)
      // This is a pragmatic approach — adjust if your database.js has functions.
      // eslint-disable-next-line no-new-func
      const fn = new Function(`return (${jsonText});`);
      return fn();
    }
  } catch (err) {
    // fallback to contents API (needs token)
    const apiPath = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`;
    const payload = await fetchGitHubApi(apiPath);
    // payload.content is base64
    const content = payload.content || "";
    const buff = typeof Buffer !== "undefined" ? Buffer.from(content, "base64") : atob(content);
    const text = typeof buff === "string" ? buff : buff.toString("utf-8");
    // same parse handling
    let jsonText = text.trim();
    if (jsonText.startsWith("export default")) {
      jsonText = jsonText.replace(/^export\s+default\s+/, "");
      if (jsonText.endsWith(";")) jsonText = jsonText.slice(0, -1);
    }
    try {
      return JSON.parse(jsonText);
    } catch (e) {
      const fn = new Function(`return (${jsonText});`);
      return fn();
    }
  }
}

/**
 * saveDatabase
 * - newData: plain object to be stringified
 * - opts: { message: "commit message" }
 */
export async function saveDatabase(newData, opts = {}) {
  const token = process.env.REACT_APP_GITHUB_TOKEN;
  if (!token) {
    throw new Error(
      "REACT_APP_GITHUB_TOKEN is required to write to GitHub. Set it in your env (Vercel/Netlify/local .env)."
    );
  }

  // 1) get current file to obtain sha
  const apiGet = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`;
  const current = await fetchGitHubApi(apiGet);
  const sha = current.sha;

  // 2) prepare content
  // We'll wrap as "export default <json>;" to keep file as JS module like your repo
  const contentText = "export default " + JSON.stringify(newData, null, 2) + ";";
  const contentBase64 =
    typeof Buffer !== "undefined"
      ? Buffer.from(contentText, "utf8").toString("base64")
      : btoa(unescape(encodeURIComponent(contentText)));

  const body = {
    message: opts.message || "Update database via app",
    content: contentBase64,
    sha,
    branch: BRANCH,
    committer: {
      name: "Auto Commit Bot",
      email: "noreply@example.com",
    },
  };

  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`, {
    method: "PUT",
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Failed to save to GitHub: ${res.status} ${res.statusText} ${txt}`);
  }
  const json = await res.json();
  return json;
}
