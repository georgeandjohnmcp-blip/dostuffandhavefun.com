# Deployment Notes For Future Codex Chats

This project is the website for `dostuffandhavefun.com`.

## Always Do This First

- Treat the VPS as a shared server with other real projects on it.
- Inspect before changing anything: web server configs, enabled sites, document roots, active services, process managers, firewall, and certificates.
- Only touch files, configs, logs, and certificates that clearly belong to `dostuffandhavefun.com`.
- Do not restart, stop, rebuild, restore, reset, reinstall, or broadly reconfigure the VPS.
- Prefer an isolated web root: `/var/www/dostuffandhavefun.com`.
- Prefer an isolated Nginx site config: `/etc/nginx/sites-available/dostuffandhavefun.com`.
- Validate Nginx before reload.

## Current Domain Facts

- Domain: `dostuffandhavefun.com`
- VPS IP: `2.25.190.115`
- Hostinger VPS ID: `1744303`
- DNS currently has `@` A record pointing to `2.25.190.115`.
- DNS currently has `www` CNAME pointing to `dostuffandhavefun.com.`
- On June 14, 2026, HTTP was redirecting to `https://my-ccs.com/`.
- On June 14, 2026, HTTPS answered with a certificate that did not include `dostuffandhavefun.com`.

## Safe Static Deployment Shape

1. Build the Astro site.
2. Upload the built files from `dist/` to `/var/www/dostuffandhavefun.com`.
3. Create a dedicated Nginx server block for `dostuffandhavefun.com` and `www.dostuffandhavefun.com`.
4. Make sure no existing `my-ccs.com` config is overwritten.
5. Run `nginx -t`.
6. Reload Nginx only if validation passes.
7. Issue SSL only for `dostuffandhavefun.com` and `www.dostuffandhavefun.com`.
8. Verify:
   - `http://dostuffandhavefun.com` redirects to HTTPS.
   - `https://dostuffandhavefun.com` serves this website.
   - `https://www.dostuffandhavefun.com` works or redirects cleanly.

## Suggested Nginx Intent

Use a simple static config with this site as its own root. Keep existing sites enabled.

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name dostuffandhavefun.com www.dostuffandhavefun.com;
    root /var/www/dostuffandhavefun.com;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

After SSL is issued, let Certbot add the HTTPS blocks or add a dedicated HTTPS block only for this domain.

## YouTube Data

YouTube auto-update data lives in `src/data/youtube.config.js`.

1. Add every real YouTube channel ID and URL.
2. Run `npm run youtube:update`.
3. Build and deploy.

GA4/Search Console tracking lives in `src/data/tracking.js`.
