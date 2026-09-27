import fs from 'node:fs/promises';
import path from 'node:path';

const source = path.resolve('reference');
const destination = path.resolve('public');
await fs.mkdir(destination, { recursive: true });

async function copyDirectory(from, to) {
  await fs.mkdir(to, { recursive: true });
  for (const entry of await fs.readdir(from, { withFileTypes: true })) {
    if (entry.name === 'mirror-report.json') continue;
    const input = path.join(from, entry.name);
    const output = path.join(to, entry.name);
    if (entry.isDirectory()) await copyDirectory(input, output);
    else await fs.copyFile(input, output);
  }
}

await copyDirectory(source, destination);

const homeFile = path.join(destination, 'index.html');
let home = await fs.readFile(homeFile, 'utf8');
home = home.replace('</head>', '<link rel="stylesheet" href="/css/refinement.css"><script src="/js/brand-motion.js" defer></script><script src="/js/planning-field.js" defer></script></head>');
home = home.replace(
  '<img class="logo-symbol" src="assets/osteon-logo-mark.svg" alt="" aria-hidden="true" width="36" height="36" />',
  '<span class="brand-mark" aria-hidden="true"><img class="logo-symbol" src="assets/osteon-logo-mark.svg" alt="" width="36" height="36" /><svg class="brand-motion-art" viewBox="0 0 256 256" fill="none" focusable="false" aria-hidden="true"><g class="brand-crescents" fill="#4da2fc"><path d="M 17.45 96.30 A 115.00 115.00 0 0 1 238.55 96.30 A 132.69 132.69 0 0 0 17.45 96.30 Z"/><path d="M 17.45 159.70 A 115.00 115.00 0 0 0 238.55 159.70 A 132.69 132.69 0 0 1 17.45 159.70 Z"/></g><g class="brand-rings" stroke="#2b7fff" stroke-width="7"><circle cx="128" cy="128" r="66"/><circle cx="128" cy="128" r="47"/></g></svg></span>'
);
home = home.replace('<aside class="care-map" aria-label="Your coordinated care pathway">', '<aside class="care-map" aria-label="Your coordinated care pathway"><canvas class="planning-field" aria-hidden="true"></canvas>');
home = home.replace(/(id="gallery-case-1"[\s\S]*?<\/article>)/, match => match.replaceAll('loading="lazy"', 'loading="eager"'));
await fs.writeFile(homeFile, home);

const appFile = path.join(destination, 'js', 'app.js');
let appScript = await fs.readFile(appFile, 'utf8');
appScript = appScript.replace('remainingHold > 0 ? remainingHold : 3000', 'remainingHold > 0 ? remainingHold : 7000');
await fs.writeFile(appFile, appScript);

// The Next.js pages are already rendered in their HTML files. Remove the
// production hydration payload so local links make ordinary page requests.
for (const name of ['blog/index.html', 'privacy/index.html', 'privacy.html', 'terms/index.html', 'terms.html', 'terms/patient-rights/index.html', 'company/index.html', 'company.html']) {
  const file = path.join(destination, name);
  let html;
  try { html = await fs.readFile(file, 'utf8'); } catch { continue; }
  html = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  html = html.replace(/<link\b[^>]*rel="preload"[^>]*as="script"[^>]*>/gi, '');
  html = html.replace('</head>', '<link rel="stylesheet" href="/css/refinement.css"></head>');
  html = html.replace('</body>', '<script src="/js/theme.js"></script><script src="/cdn-cgi/scripts/5c5dd728/cloudflare-static/email-decode.min.js"></script></body>');
  await fs.writeFile(file, html);
}

console.log('Public site prepared in public/.');
