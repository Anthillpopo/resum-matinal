// Le Tri du jour : enregistre les téléphones abonnés à la notification du matin (Cloudflare Workers + KV).
const TIMES = ["6 h 30", "7 h", "7 h 30", "8 h"];
const PUSH_HOSTS = [/(^|\.)googleapis\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)mozilla\.com$/, /(^|\.)windows\.com$/, /(^|\.)mozaws\.net$/];

async function keyOf(endpoint) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(endpoint));
  return "sub:" + [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, "0")).join("");
}
function validEndpoint(e) {
  try { const u = new URL(e); return u.protocol === "https:" && e.length < 1000 && PUSH_HOSTS.some(r => r.test(u.hostname)); } catch { return false; }
}

export default {
  async fetch(req, env) {
    const allowed = env.ALLOWED_ORIGIN || "";
    const origin = req.headers.get("origin") || "";
    const cors = { "access-control-allow-origin": allowed || "*", "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type", "vary": "origin" };
    const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", ...cors } });
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (req.method !== "POST") return json({ error: "Méthode non prise en charge" }, 405);
    if (allowed && origin !== allowed) return json({ error: "Origine refusée" }, 403);

    let body;
    try { const t = await req.text(); if (t.length > 4000) throw 0; body = JSON.parse(t); } catch { return json({ error: "Requête illisible" }, 400); }
    const path = new URL(req.url).pathname.replace(/\/+$/, "");

    if (path === "/subscribe") {
      const s = body.subscription || {};
      if (!validEndpoint(s.endpoint) || !s.keys || typeof s.keys.p256dh !== "string" || typeof s.keys.auth !== "string" || s.keys.p256dh.length > 200 || s.keys.auth.length > 100) return json({ error: "Abonnement invalide" }, 400);
      if (!TIMES.includes(body.time)) return json({ error: "Heure invalide" }, 400);
      await env.SUBS.put(await keyOf(s.endpoint), JSON.stringify({ subscription: { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } }, time: body.time, lastSent: "" }));
      return json({ ok: true });
    }
    if (path === "/unsubscribe") {
      if (!validEndpoint(body.endpoint)) return json({ error: "Abonnement invalide" }, 400);
      await env.SUBS.delete(await keyOf(body.endpoint));
      return json({ ok: true });
    }
    return json({ error: "Adresse inconnue" }, 404);
  },
};
