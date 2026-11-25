# Le Tri du jour

Une app qui trie chaque matin l'actualité de médias en accès libre : l'essentiel d'abord (les sujets repris par le plus de médias), puis le reste par rubrique, un résumé vidéo et un insolite pour finir.

## Comment ça marche

- `scripts/collect.mjs` lit les flux RSS, garde les dernières 24 heures, range par rubrique et regroupe les sujets traités par plusieurs médias. Il écrit `site/news.json`.
- `site/` contient l'app (une page, installable sur l'écran d'accueil, lisible hors connexion).
- `.github/workflows/tri.yml` relance la collecte et republie la page plusieurs fois par jour, puis envoie la notification du matin.
- `worker/` est le petit service Cloudflare qui enregistre les téléphones abonnés à la notification. `scripts/notify.mjs` leur envoie le message à l'heure choisie.

## Mise en route

1. Dans le dépôt : Settings, Pages, Source : **GitHub Actions**.
2. Pour les notifications (facultatif), dans Settings, Secrets and variables, Actions, ajouter deux secrets :
   - `CLOUDFLARE_ACCOUNT_ID` : l'identifiant du compte Cloudflare ;
   - `CLOUDFLARE_API_TOKEN` : un jeton Cloudflare limité à « Workers Scripts : Edit » et « Workers KV Storage : Edit ».
3. Lancer le workflow « Le Tri du jour » à la main une première fois (onglet Actions, Run workflow).

Sans les secrets Cloudflare, l'app fonctionne normalement, sans la notification.

## Modifier les sources

La liste est en haut de `scripts/collect.mjs`. Le journal de chaque collecte (onglet Actions) indique quels flux répondent ; l'onglet Sources de l'app aussi.

## Usage

Projet personnel. Les flux RSS sont utilisés pour afficher un titre, un court résumé et un lien vers le site du média.
