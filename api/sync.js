// Vercel serverless function: stores one Game Finder list per sync code.
//
// Storage: Upstash Redis (free). In Vercel: Project → Storage → Create Database →
// Upstash for Redis → connect it to this project. That adds the env vars below
// automatically; then redeploy.
//
// The sync code itself is never stored — only a SHA-256 hash of it is used as the key.

const crypto = require("crypto");

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const CODE_RE = /^[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/;
const MAX_BYTES = 200 * 1024;

async function redis(command) {
  const r = await fetch(REDIS_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
  });
  if (!r.ok) throw new Error(`redis ${r.status}`);
  return (await r.json()).result;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (!REDIS_URL || !REDIS_TOKEN) return res.status(501).json({ error: "not-configured" });

  const code = String(req.headers["x-sync-code"] || "").toUpperCase();
  if (!CODE_RE.test(code)) return res.status(400).json({ error: "bad-code" });
  const key = "gf:" + crypto.createHash("sha256").update(code).digest("hex");

  try {
    if (req.method === "GET") {
      const raw = await redis(["GET", key]);
      return res.status(200).json(raw ? JSON.parse(raw) : null);
    }

    if (req.method === "PUT") {
      let body = req.body;
      if (typeof body === "string") {
        try { body = JSON.parse(body); } catch { return res.status(400).json({ error: "bad-json" }); }
      }
      if (!body || typeof body !== "object" || Array.isArray(body) || typeof body.updatedAt !== "number") {
        return res.status(400).json({ error: "bad-body" });
      }
      const text = JSON.stringify(body);
      if (Buffer.byteLength(text) > MAX_BYTES) return res.status(413).json({ error: "too-big" });

      // Last change wins: if the server already has something newer, send that back instead.
      const raw = await redis(["GET", key]);
      if (raw) {
        const current = JSON.parse(raw);
        if (typeof current.updatedAt === "number" && current.updatedAt > body.updatedAt) {
          return res.status(409).json(current);
        }
      }
      await redis(["SET", key, text]);
      return res.status(200).json({ ok: true, updatedAt: body.updatedAt });
    }

    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ error: "method-not-allowed" });
  } catch (err) {
    console.error(err);
    return res.status(502).json({ error: "storage-error" });
  }
};
