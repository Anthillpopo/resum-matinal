// Accès au stockage Cloudflare KV depuis GitHub Actions (API REST).
export const KV_ID = "27c03b8dd9404995803fe0d1e2c0ff9f";
const token = process.env.CLOUDFLARE_API_TOKEN, account = process.env.CLOUDFLARE_ACCOUNT_ID;
export const kvReady = () => !!(token && account);
const base = () => `https://api.cloudflare.com/client/v4/accounts/${account}/storage/kv/namespaces/${KV_ID}`;
const auth = () => ({ authorization: "Bearer " + token });
export async function kvGet(key) {
  const r = await fetch(`${base()}/values/${encodeURIComponent(key)}`, { headers: auth() });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error("KV lecture " + r.status);
  return r.text();
}
export async function kvPut(key, value) {
  const r = await fetch(`${base()}/values/${encodeURIComponent(key)}`, { method: "PUT", headers: { ...auth(), "content-type": "text/plain" }, body: value });
  if (!r.ok) throw new Error("KV écriture " + r.status);
}
export async function kvDelete(key) {
  const r = await fetch(`${base()}/values/${encodeURIComponent(key)}`, { method: "DELETE", headers: auth() });
  if (!r.ok && r.status !== 404) throw new Error("KV suppression " + r.status);
}
export async function kvList(prefix) {
  const keys = []; let cursor = "";
  do {
    const r = await fetch(`${base()}/keys?prefix=${encodeURIComponent(prefix)}&limit=1000${cursor ? "&cursor=" + cursor : ""}`, { headers: auth() });
    if (!r.ok) throw new Error("KV liste " + r.status);
    const j = await r.json();
    keys.push(...j.result.map(k => k.name));
    cursor = (j.result_info && j.result_info.cursor) || "";
  } while (cursor);
  return keys;
}
