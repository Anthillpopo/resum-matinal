// Envoie la notification du matin aux abonnés dont l'heure choisie est passée et qui n'ont pas encore été prévenus aujourd'hui.
import webpush from "web-push";
import { kvReady, kvGet, kvPut, kvDelete, kvList } from "./kv.mjs";
import { vapid } from "./keys.mjs";

const SLOTS = { "6 h 30": 390, "7 h": 420, "7 h 30": 450, "8 h": 480 };
if (!kvReady()) { console.log("Cloudflare non configuré : pas d'envoi."); process.exit(0); }

const p = Object.fromEntries(new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date()).map(x => [x.type, x.value]));
const today = `${p.year}-${p.month}-${p.day}`, minutes = Number(p.hour) * 60 + Number(p.minute);
if (minutes < 385 || minutes > 630) { console.log("Hors de la plage du matin (heure de Paris) : pas d'envoi."); process.exit(0); }

const count = Number(process.env.NEWS_COUNT || 0), first = (process.env.NEWS_TITLE || "").trim();
if (!count || !first) { console.log("Pas d'actualités à annoncer : pas d'envoi."); process.exit(0); }
const payload = JSON.stringify({ title: `Le Tri du jour · ${count} sujets ce matin`, body: "À la une : " + first, url: process.env.SITE_URL || "./" });

const v = await vapid();
webpush.setVapidDetails(process.env.SITE_URL || "https://github.com", v.publicKey, v.privateKey);
let sent = 0, removed = 0;
for (const key of await kvList("sub:")) {
  try {
    const raw = await kvGet(key); if (!raw) continue;
    const s = JSON.parse(raw);
    if (s.lastSent === today || !(s.time in SLOTS) || SLOTS[s.time] > minutes + 5) continue;
    try {
      await webpush.sendNotification(s.subscription, payload, { TTL: 6 * 3600, urgency: "normal" });
      s.lastSent = today; await kvPut(key, JSON.stringify(s)); sent++;
    } catch (e) {
      if (e.statusCode === 404 || e.statusCode === 410) { await kvDelete(key); removed++; }
      else console.log("Envoi impossible pour un abonné : " + (e.statusCode || e.message));
    }
  } catch (e) { console.log("Abonné ignoré : " + e.message); }
}
console.log(`${sent} notification(s) envoyée(s), ${removed} abonnement(s) expiré(s) supprimé(s).`);
