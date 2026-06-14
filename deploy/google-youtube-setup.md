# Google, YouTube, And Tracking Setup

This file is for future Codex chats working on `dostuffandhavefun.com`.

## Current State

- GA4 is not active yet because the real measurement ID is not in `src/data/tracking.js`.
- Google Search Console verification is not active yet because the real verification token is not in `src/data/tracking.js`.
- YouTube auto-update is active for the handles currently listed in `src/data/youtube.config.js`.
- The requested Google admin email is `geompcherson@gmail.com`.

## YouTube Channel Connection

Current connected handles: `@GeorgeAndJohn`, `@poutineanimates`, `@Monkeyman-g2z`, `@DaEpicDuck-x7h`, `@EPICMAPPING023`, `@Untitledhorror-g5p`, `@SpongeBobifheexploded`, `@EPICMinecrafting`, and editor-access channel `@MapperFromHungaria05`.

For each new channel:

1. Open the channel page in the signed-in YouTube account.
2. Copy the channel handle, URL, or channel ID.
3. Add it to `src/data/youtube.config.js`.
4. Run `npm run youtube:update`.
5. Build the site.
6. Verify that real videos appear on the homepage.

The scheduled GitHub workflow `.github/workflows/update-youtube.yml` runs twice a day. With handles filled in, it fetches new videos, rebuilds the static site, and commits the updated data and `dist/` files.

## GA4 Setup

In Google Analytics:

1. Create a GA4 property for `dostuffandhavefun.com`.
2. Create a web data stream for `https://dostuffandhavefun.com`.
3. Copy the measurement ID, usually shaped like `G-XXXXXXXXXX`.
4. Paste it into `src/data/tracking.js` as `ga4MeasurementId`.
5. Add `geompcherson@gmail.com` with Administrator access.
6. Build and deploy.
7. Verify in GA4 Realtime after opening the public site in Chrome.

## Search Console Setup

In Google Search Console:

1. Add `https://dostuffandhavefun.com` as a URL-prefix property or add the whole domain property if DNS verification is preferred.
2. If using the HTML tag method, copy only the verification token from the meta tag.
3. Paste it into `src/data/tracking.js` as `googleSiteVerification`.
4. Build and deploy.
5. Click Verify in Search Console.
6. Add `geompcherson@gmail.com` with full permission or owner-level access where available.

## Chrome Requirement

The user asked that Chrome be opened every time an update is deployed. If Chrome is not running, ask permission before launching it. Do not deploy a new public update unless Chrome can be opened for verification.
