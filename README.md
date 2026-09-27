# Osteon local recreation

This project serves a local copy of the public Osteon site with its HTML, CSS, JavaScript, fonts, and images. A local Node.js server stores contact and consultation requests in SQLite and shows them in a password-protected staff workspace. A restrained visual refinement layer improves the public pages while preserving their content and structure.

## Run it

Node.js 26 or newer is required. No package installation is needed.

```powershell
node server.mjs
```

Open [http://127.0.0.1:3000](http://127.0.0.1:3000). On the first visit to [http://127.0.0.1:3000/staff](http://127.0.0.1:3000/staff), create a local staff email and password. The account belongs only to this local copy; it does not use the live site's login.

Submissions through the local **Contact Team Osteon** form appear at `/staff?view=unread`. The consultation and membership request buttons use the same inbox. Staff can mark messages read or unread, change handling status, search, filter, move to Trash, and restore them.

The database is `.data/osteon.sqlite`, created on first run. Keep this file if you want to retain messages and the staff account. To use a different database file or port, set `OSTEON_DB` or `PORT` before starting the server. The server listens on `127.0.0.1` by default.

## Files and checks

- `public/` contains the runnable public site and its assets.
- `reference/` contains the downloaded originals for comparison.
- `server.mjs`, `src/`, and `public/js/staff-local.js` provide the local staff and form backend.
- `public/css/refinement.css` contains the visual adjustments. `public/js/brand-motion.js` recreates the supplied logo reveal from the site's exact SVG paths, without the GIF's white background. It plays once per tab session and respects reduced-motion and data-saving preferences.
- `public/js/planning-field.js` draws the subtle pointer-responsive coordinate field behind the hero's care pathway. It stays static when reduced motion is requested.
- `scripts/build-public.mjs` refreshes `public/` from `reference/` after a new mirror run and reapplies the refinement links and local tweaks. Keep `refinement.css`, `brand-motion.js`, and `planning-field.js` in `public/` when refreshing.

Run the integration check with:

```powershell
node --test
```

The public pages and assets are a snapshot of the live site. The local staff workspace follows the visible sign-in style and controls exposed by the site's public JavaScript and CSS. Live staff messages and login credentials are not copied.
