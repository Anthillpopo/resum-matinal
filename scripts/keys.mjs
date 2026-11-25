// Prépare site/config.json : adresse du service d'abonnement et clé publique des notifications.
// Les clés sont créées une seule fois et rangées dans Cloudflare KV ; la clé privée ne quitte jamais ce stockage.
import { writeFile } from "node:fs/promises";
import webpush from "web-push";
import { kvReady, kvGet, kvPut } from "./kv.mjs";

export async function vapid() {
  let v = await kvGet("vapid");
  if (v) return JSON.parse(v);
  v = webpush.generateVAPIDKeys();
  await kvPut("vapid", JSON.stringify(v));
  console.log("Clés de notification créées.");
  return v;
}
if (process.argv[1] && process.argv[1].endsWith("keys.mjs")) {
  let cfg = {};
  if (!kvReady()) console.log("Cloudflare non configuré : notifications désactivées.");
  else {
    try {
      const url = (process.env.PUSH_API_URL || "").trim();
      if (url) await kvPut("pushApi", url);
      const pushApi = url || (await kvGet("pushApi")) || "";
      const v = await vapid();
      if (pushApi) cfg = { pushApi: pushApi.replace(/\/+$/, ""), vapidPublicKey: v.publicKey };
      else console.log("Service d'abonnement pas encore publié : notifications désactivées.");
    } catch (e) { console.log("Configuration des notifications impossible : " + e.message); }
  }
  await writeFile("site/config.json", JSON.stringify(cfg));
}
