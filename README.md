# Do Stuff & Have Fun

This is the new Astro website for `dostuffandhavefun.com`: a bright, playful home base for kid-friendly YouTube videos, channels, challenges, crafts, experiments, and search-friendly video discovery.

## What Is Here

- The hand-drawn logo from `Drawing.jpeg`, saved as `public/assets/do-stuff-logo.png`
- Generated hero artwork: `public/assets/play-lab-hero.png`
- Handcrafted thumbnail artwork for starter video lanes
- A playable Pong browser game at `/games/pong/`
- The earlier Spark Catcher bonus game at `/games/spark-catcher/`
- Astro source files in `src/`
- A lightweight static preview/deploy copy in `dist/`
- Deployment instructions in `deploy/`
- `llms.txt` for answer-engine context

## Design Rule

This site should never look like generic AI output. Keep it polished, specific, playful, and trustworthy. If real YouTube data is missing, make the empty state feel intentional and launch-ready.

## YouTube Channels

The site is ready to stay updated from YouTube channel feeds. Add each channel URL, handle, or channel ID in `src/data/youtube.config.js`, then run:

```bash
npm run youtube:update
```

That resolves the public YouTube feed, writes the newest videos to `src/data/videos.generated.json`, and the homepage automatically switches from starter lanes to real YouTube videos.

Connected channel handles collected from the signed-in YouTube account: `@GeorgeAndJohn`, `@poutineanimates`, `@Monkeyman-g2z`, `@DaEpicDuck-x7h`, `@EPICMAPPING023`, `@Untitledhorror-g5p`, `@SpongeBobifheexploded`, `@EPICMinecrafting`, and editor-access channel `@MapperFromHungaria05`.

On June 14, 2026, the updater pulled 59 public videos from 9 channels.

GitHub also has a scheduled workflow in `.github/workflows/update-youtube.yml` that can refresh the generated video file twice a day once the channel IDs are filled in.
The workflow also rebuilds and commits the static `dist/` output so the deployable site stays in sync with the newest videos.

## Analytics And Search Console

GA4 and Google Search Console are wired but not activated yet. Add the real GA4 measurement ID and Search Console verification token in `src/data/tracking.js`, then rebuild and deploy.

Requested admin email: `geompcherson@gmail.com`.

See `deploy/google-youtube-setup.md` for the full setup checklist.

## Deployment Safety

The VPS is shared with other real sites. Future Codex chats must inspect the server first, only touch isolated `dostuffandhavefun.com` resources, validate Nginx before reload, and never disturb existing sites such as `my-ccs.com`.

Current hosting route: Hostinger has a dedicated website slot for `dostuffandhavefun.com`. Deploy only the built static files for this project into that slot, then verify `https://dostuffandhavefun.com/`.

## Current Live Status

The initial static site is deployed on Hostinger and serves from `https://dostuffandhavefun.com/`. The live site now includes the hand-drawn logo, the Pong game at `/games/pong/`, homepage game links pointing to Pong, and Spark Catcher still available at `/games/spark-catcher/`.

Last verified deploy: June 14, 2026. HTTPS, homepage, logo, sitemap, Pong page, Pong Start button, connected channel lanes, and a generated YouTube video page were verified. Chrome was left open on the updated live homepage after the deploy check.

Local rebuild note: if npm is unavailable on this Mac, use the no-dependency fallback `/Users/georgiemcpherson/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node scripts/render-static.mjs` after running the YouTube updater. It rebuilds `dist/` from the source data without installing `node_modules`.

Deployment note for future chats: the Hostinger MCP static deploy tool may fail during TUS upload if it follows the returned `Location` URL. The working path is to upload the archive to the original `files/upload-urls` target with `X-Auth`, `X-Auth-Rest`, `Upload-Length`, `Upload-Offset`, and `Tus-Resumable`, then trigger `/api/hosting/v1/accounts/u937775855/websites/dostuffandhavefun.com/deploy` with the archive filename.

DNS note: the root `AAAA` record was removed because IPv6 connections reset while IPv4 works. Keep the root `A` record pointed to `185.162.53.21` and `www` as a CNAME to `dostuffandhavefun.com`.
