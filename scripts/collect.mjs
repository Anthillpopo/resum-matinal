// Le Tri du jour : lit les flux RSS, garde les dernières 24 heures, range par rubrique
// et fait remonter les sujets repris par plusieurs médias. Sans dépendance (Node 20+).
const SOURCES = [
  // "any" : essaie les adresses dans l'ordre et garde la première qui répond.
  { name: "franceinfo", any: true, feeds: ["https://www.francetvinfo.fr/titres.rss", "https://www.franceinfo.fr/titres.rss"] },
  { name: "France 24", feeds: ["https://www.france24.com/fr/rss"] },
  { name: "RFI", feeds: ["https://www.rfi.fr/fr/rss"] },
  { name: "Euronews", feeds: ["https://fr.euronews.com/rss"] },
  { name: "France Inter", any: true, feeds: ["https://www.radiofrance.fr/franceinter/rss", "https://www.radiofrance.fr/franceinter/rss.xml"] },
  { name: "France Culture", any: true, feeds: ["https://www.radiofrance.fr/franceculture/rss", "https://www.radiofrance.fr/franceculture/rss.xml"] },
  { name: "Public Sénat", any: true, feeds: ["https://www.publicsenat.fr/rss.xml", "https://www.publicsenat.fr/rss", "https://www.publicsenat.fr/feed"], theme: "politique" },
  { name: "LCP", feeds: ["https://lcp.fr/rss.xml"], theme: "politique" },
  { name: "AFP Factuel", any: true, feeds: ["https://factuel.afp.com/rss.xml", "https://factuel.afp.com/rss", "https://factuel.afp.com/fr/rss.xml"] },
  { name: "The Conversation", any: true, feeds: ["https://theconversation.com/fr/articles.atom", "https://theconversation.com/fr/home-page.atom"] },
  { name: "Arte", any: true, feeds: ["https://www.arte.tv/fr/rss/", "https://www.arte.tv/rss/fr/"] },
  { name: "20 Minutes", feeds: ["https://www.20minutes.fr/feeds/rss-une.xml", "https://www.20minutes.fr/feeds/rss-insolite.xml"] },
  { name: "BFMTV", feeds: ["https://www.bfmtv.com/rss/news-24-7/"] },
  { name: "TF1 Info", feeds: ["https://www.tf1info.fr/feeds/rss-une.xml"] },
  { name: "Le HuffPost", feeds: ["https://www.huffingtonpost.fr/feeds/index.xml"] },
  { name: "Brut", feeds: [
    ["https://www.brut.media/rss/fr/france.xml", null],
    ["https://www.brut.media/rss/fr/international.xml", "monde"],
    ["https://www.brut.media/rss/fr/environnement.xml", "planete"],
    ["https://www.brut.media/rss/fr/sante.xml", "societe"],
    ["https://www.brut.media/rss/fr/sport.xml", "sport"],
    ["https://www.brut.media/rss/fr/sciences-technologies.xml", "sciences"],
    ["https://www.brut.media/rss/fr/economie.xml", "economie"],
  ] },
];
const TOP = 5, PER_THEME = 5; // taille de L'essentiel et nombre maximum de sujets par rubrique
const VIDEO = { name: "HugoDécrypte", feed: "https://www.youtube.com/feeds/videos.xml?channel_id=UCAcAnMF0OrCtUep3Y4M-ZPw" };

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", eacute: "é", egrave: "è", agrave: "à", ccedil: "ç", ecirc: "ê", ocirc: "ô", ugrave: "ù", icirc: "î", rsquo: "’", lsquo: "‘", laquo: "«", raquo: "»", hellip: "…", ndash: "–", mdash: "—", euro: "€" };
const decode = s => s.replace(/&(#x?[0-9a-f]+|\w+);/gi, (m, e) => {
  if (e[0] === "#") { const n = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) ? String.fromCodePoint(n) : m; }
  return ENT[e.toLowerCase()] ?? m;
});
const clean = s => decode(decode((s || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")).replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
const tag = (x, t) => { const m = x.match(new RegExp("<" + t + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + t + ">", "i")); return m ? m[1] : ""; };
const tags = (x, t) => [...x.matchAll(new RegExp("<" + t + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + t + ">", "gi"))].map(m => m[1]);

export function parseFeed(xml) {
  const blocks = [...xml.matchAll(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi)].map(m => m[0]);
  return blocks.map(b => {
    let link = clean(tag(b, "link"));
    if (!/^https?:/.test(link)) { const m = b.match(/<link[^>]*rel=["']alternate["'][^>]*href=["']([^"']+)["']/i) || b.match(/<link[^>]*href=["']([^"']+)["']/i); link = m ? decode(m[1]) : ""; }
    const d = clean(tag(b, "pubDate") || tag(b, "published") || tag(b, "updated") || tag(b, "dc:date"));
    const t = d ? Date.parse(d) : NaN;
    let sum = clean(tag(b, "description") || tag(b, "summary") || tag(b, "media:description"));
    if (sum.length > 220) sum = sum.slice(0, 217).replace(/\s+\S*$/, "") + "…";
    return { title: clean(tag(b, "title")), url: link, summary: sum, ts: Number.isNaN(t) ? null : t, cats: tags(b, "category").map(clean).filter(Boolean) };
  }).filter(a => a.title && /^https?:/.test(a.url));
}

const norm = s => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const RULES = [
  ["sport", /\b(sport|sports|football|foot|rugby|tennis|ligue 1|ligue des champions|psg|\bom\b|xv de france|bleus|basket|nba|cyclisme|tour de france|formule 1|\bf1\b|jeux olympiques|\bjo\b|handball|biathlon|ski|mercato|match)\b/],
  ["culture", /\b(culture|cinema|film|serie|musique|album|concert|festival|livre|roman|prix goncourt|exposition|musee|theatre|people|television|\btv\b|medias|netflix|chanteur|chanteuse|acteur|actrice)\b/],
  ["planete", /\b(planete|environnement|climat|climatique|cop\d+|meteo|tempete|canicule|secheresse|inondations?|biodiversite|pollution|ecologie|rechauffement|seisme|ouragan|vigilance (orange|rouge))\b/],
  ["sciences", /\b(sciences?|tech|technologies?|high-tech|numerique|intelligence artificielle|\bia\b|espace|nasa|spacex|fusee|chercheurs|decouverte|cyberattaque|smartphone|robot)\b/],
  ["economie", /\b(economie|eco|entreprises?|emploi|chomage|inflation|bourse|budget|impots?|retraites?|salaires?|pouvoir d'achat|croissance|banque|bce|immobilier|consommation|conso|argent|prix|dette|taxe|\bpib\b|industrie|greve)\b/],
  ["monde", /\b(monde|international|europe|etats-unis|usa|amerique|ameriques|afrique|asie|moyen-orient|ukraine|russie|chine|israel|gaza|iran|trump|poutine|onu|otan|union europeenne|\bue\b|allemagne|royaume-uni|espagne|italie|liban|syrie|inde|japon)\b/],
  ["politique", /\b(politique|gouvernement|assemblee nationale|senat|elysee|matignon|premier ministre|ministre|deputes?|senateurs?|elections?|presidentielle|municipales|legislatives|motion de censure|49\.3|parti|\brn\b|\blfi\b|\bps\b|\blr\b|macron|projet de loi)\b/],
  ["societe", /\b(societe|faits-divers|faits divers|justice|police|education|ecole|sante|hopital|famille|logement|transports|sncf|proces|enquete|tribunal)\b/],
];
export function themeOf(a) {
  let segs = []; try { segs = decodeURIComponent(new URL(a.url).pathname).split("/").filter(Boolean).slice(0, -1).slice(0, 3); } catch {}
  const strong = norm(segs.join(" ").replace(/[-_]/g, " ") + " " + a.cats.join(" "));
  for (const [t, re] of RULES) if (re.test(strong)) return t;
  const weak = norm(a.title);
  for (const [t, re] of RULES) if (re.test(weak)) return t;
  return "societe";
}

const STOP = new Set("avec dans pour plus sans sous vers chez entre apres avant contre depuis pendant selon cette ceux celle leur leurs nous vous elle elles sont etre avoir fait faire tout tous toute toutes mais donc comme quand quoi quel quelle dont aussi tres bien deja encore alors ainsi face nouveau nouvelle nouvelles nouveaux premier premiere france francais francaise video direct info infos annonce apres pourquoi comment voici voila moins peut etait ete ont gouvernement ministre president annee annees jour jours mort morts personnes pays ville son ses des les une aux sur par que qui est pas ne se ce ces du de la le un et en au ou il ils on".split(" "));
const tokens = t => new Set(norm(t).split(/[^a-z0-9]+/).filter(w => (w.length >= 4 || /^\d{2,}$/.test(w)) && !STOP.has(w)).map(w => /\d/.test(w) ? w : w.slice(0, 6)));
function similar(a, b) { let c = 0; for (const w of a) if (b.has(w)) c++; return c >= 3 || (c >= 2 && c / Math.min(a.size, b.size) >= 0.4); }

export function rank(articles) {
  const clusters = [];
  for (const a of articles) {
    a.tok = tokens(a.title);
    const c = clusters.find(c => c.items.some(b => b.source !== a.source && similar(a.tok, b.tok)));
    c ? c.items.push(a) : clusters.push({ items: [a] });
  }
  return clusters.map(c => {
    const names = [...new Set(c.items.map(i => i.source))];
    const lead = c.items.reduce((x, y) => ((y.ts || 0) > (x.ts || 0) ? y : x));
    const counts = {}; for (const i of c.items) counts[i.theme] = (counts[i.theme] || 0) + 1;
    const theme = Object.entries(counts).sort((x, y) => y[1] - x[1])[0][0];
    const links = names.map(n => c.items.filter(i => i.source === n).reduce((x, y) => ((y.ts || 0) > (x.ts || 0) ? y : x))).sort((x, y) => x.source.localeCompare(y.source, "fr")).map(i => ({ source: i.source, title: i.title, url: i.url }));
    return { title: lead.title, url: lead.url, summary: lead.summary, source: lead.source, ts: lead.ts, theme, video: !!lead.video, n: names.length, links };
  }).sort((x, y) => y.n - x.n || (y.ts || 0) - (x.ts || 0));
}

async function get(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(8000), headers: { "user-agent": "Mozilla/5.0 (compatible; LeTriDuJour/1.0; lecteur RSS personnel)", accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*" } });
  if (!r.ok) throw new Error("HTTP " + r.status);
  return r.text();
}

export async function build(now = Date.now()) {
  const status = [], log = [];
  const lists = await Promise.all(SOURCES.map(async s => {
    const out = []; let ok = false;
    const one = async f => {
      const [url, fixed] = Array.isArray(f) ? f : [f, null];
      try {
        const xml = await get(url);
        const items = parseFeed(xml);
        const newest = items.reduce((m, a) => Math.max(m, a.ts || 0), 0);
        log.push(`  ${s.name} | ${url} | ${xml.length} octets | ${items.length} éléments | plus récent : ${newest ? new Date(newest).toISOString() : "sans date"}${items.length ? "" : " | début : " + xml.slice(0, 160).replace(/\s+/g, " ")}`);
        for (const a of items) { const t = fixed || themeOf(a); out.push({ ...a, source: s.name, theme: t === "societe" && s.theme ? s.theme : t, video: (s.name === "Brut" || s.name === "Arte") && /\/videos?\//.test(a.url) }); }
        if (items.length) ok = true;
        return items.length > 0;
      } catch (e) { log.push(`  ${s.name} | ${url} | échec : ${e.message}`); return false; }
    };
    if (s.any) { for (const f of s.feeds) if (await one(f)) break; }
    else await Promise.all(s.feeds.map(one));
    const seen = new Set();
    const fresh = out.filter(a => !seen.has(a.url) && seen.add(a.url) && (a.ts === null || (now - a.ts < 26 * 3600e3 && a.ts - now < 3600e3)));
    status.push({ name: s.name, ok, count: fresh.length });
    return fresh.slice(0, 40);
  }));
  let video = null, vok = false;
  try { const v = parseFeed(await get(VIDEO.feed)).sort((a, b) => (b.ts || 0) - (a.ts || 0))[0]; vok = true; if (v) video = { title: v.title, url: v.url, ts: v.ts, source: VIDEO.name }; } catch {}
  status.push({ name: VIDEO.name, ok: vok, count: video ? 1 : 0 });
  status.sort((a, b) => a.name.localeCompare(b.name, "fr"));
  // L'insolite du jour : mis de côté, hors classement et hors rubriques.
  const all = lists.flat();
  const odd = a => { let p = ""; try { p = new URL(a.url).pathname; } catch {} return /insolite/i.test(p) || a.cats.some(c => /insolite/i.test(c)); };
  const funny = all.filter(odd).sort((x, y) => (y.ts || 0) - (x.ts || 0))[0] || null;
  const insolite = funny ? { title: funny.title, url: funny.url, source: funny.source, ts: funny.ts } : null;
  console.log("Détail des flux :\n" + log.sort().join("\n"));
  // Sélection : les 5 sujets les plus repris, puis au plus 5 sujets par rubrique (les plus repris, puis les plus récents).
  const ranked = rank(all.filter(a => !odd(a)));
  const top = ranked.slice(0, TOP), perTheme = {};
  const rest = ranked.slice(TOP).filter(a => (perTheme[a.theme] = (perTheme[a.theme] || 0) + 1) <= PER_THEME);
  return { generatedAt: now, video, insolite, items: [...top, ...rest], total: ranked.length, sources: status };
}

// Lancement : écrit site/news.json. En cas d'échec complet, garde le fichier précédent s'il existe.
import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = process.argv[2] || "site/news.json";
  const data = await build();
  for (const s of data.sources) console.log((s.ok ? "OK   " : "ECHEC") + " " + s.name + " : " + s.count);
  console.log(data.items.length + " sujets, vidéo : " + (data.video ? "oui" : "non") + ", insolite : " + (data.insolite ? "oui" : "non"));
  if (!data.items.length) { console.error("Aucune actualité récupérée."); process.exit(1); }
  await mkdir(out.replace(/\/[^/]*$/, ""), { recursive: true });
  await writeFile(out, JSON.stringify(data));
}
