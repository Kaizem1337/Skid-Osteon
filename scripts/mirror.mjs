import fs from 'node:fs/promises';
import path from 'node:path';

const origin = 'https://osteon.cc';
const output = path.resolve('reference');
const pages = ['/', '/about', '/team', '/blog', '/procedures', '/faq', '/contact', '/gallery', '/privacy.html', '/terms.html', '/company.html', '/terms/patient-rights', '/staff/login'];
const queue = pages.map(p => new URL(p, origin));
const seen = new Set();
const failures = [];

function localPath(url) {
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';
  else if (!path.posix.extname(pathname)) pathname += '/index.html';
  return path.join(output, pathname.replace(/^\//, ''));
}

function discover(text, base, contentType) {
  const refs = [];
  if (contentType.includes('css')) {
    for (const m of text.matchAll(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/g)) refs.push(m[1]);
    for (const m of text.matchAll(/@import\s+['"]([^'"]+)['"]/g)) refs.push(m[1]);
  } else {
    for (const m of text.matchAll(/\b(?:href|src|poster|data-src)\s*=\s*['"]([^'"]+)['"]/g)) refs.push(m[1]);
  }
  for (const ref of refs) {
    if (/^(?:mailto:|tel:|data:|javascript:|#)/i.test(ref)) continue;
    let url;
    try { url = new URL(ref, base); } catch { continue; }
    if (url.origin !== origin) continue;
    url.hash = '';
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/staff') && url.pathname !== '/staff/login') continue;
    if (seen.has(url.pathname) || queue.some(q => q.pathname === url.pathname)) continue;
    if (queue.length + seen.size < 150) queue.push(url);
  }
}

while (queue.length) {
  const url = queue.shift();
  if (seen.has(url.pathname)) continue;
  seen.add(url.pathname);
  try {
    const response = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (compatible; local-recreation/1.0)' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get('content-type') || '';
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 25_000_000) throw new Error('asset too large');
    const file = localPath(url);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, bytes);
    console.log(`${response.status} ${url.pathname} ${bytes.length}`);
    if (/text\/html|text\/css/.test(contentType)) discover(bytes.toString('utf8'), url, contentType);
  } catch (error) {
    failures.push({ url: url.href, error: String(error) });
    console.log(`FAIL ${url.pathname}: ${error.message}`);
  }
}
await fs.writeFile(path.join(output, 'mirror-report.json'), JSON.stringify({ fetched: seen.size, failures }, null, 2));
