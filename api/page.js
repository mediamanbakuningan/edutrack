// Menyajikan app.html dengan meta Open Graph (pratinjau link WhatsApp, dll.) sesuai Pengaturan aplikasi.
const crypto = require('crypto');
const { getCfg, appHtml, apiUrl } = require('./_cfg');

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const cut = (s, n) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);

module.exports = async (req, res) => {
  const c = await getCfg();
  const cfg = c.cfg;
  const proto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0];
  const origin = `${proto}://${host}`;

  const title = cfg.nama;
  const desc = cut(cfg.tag || cfg.sek || cfg.nama, 160);
  const site = cfg.sek || cfg.nama;
  const docTitle = cfg.nama + (cfg.tag ? ' : ' + cfg.tag : '');
  const hasLogo = /^data:image\/(png|jpeg);base64,/.test(cfg.logo);
  const ver = hasLogo ? crypto.createHash('md5').update(cfg.logo + '|p600').digest('hex').slice(0, 8) : '';
  const img = hasLogo ? `${origin}/api/logo?v=${ver}` : `${origin}/icon-512.png`;

  // Mode diagnosa: buka /?debug=1 untuk melihat apa yang dibaca fungsi dari Apps Script
  if (String(req.url || '').includes('debug=1')) {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.end(JSON.stringify({
      dataDariAppsScript: !!c.ok, error: c.err || null,
      apiUrlTerisi: /^https:\/\/script\.google\.com\//.test(apiUrl()),
      nama: cfg.nama, tag: cfg.tag, sek: cfg.sek,
      adaLogo: hasLogo, ukuranLogoKarakter: (cfg.logo || '').length,
      ogImage: img
    }, null, 2));
  }

  const meta = [
    `<meta name="description" content="${esc(desc)}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:site_name" content="${esc(site)}">`,
    `<meta property="og:title" content="${esc(title)}">`,
    `<meta property="og:description" content="${esc(desc)}">`,
    `<meta property="og:url" content="${esc(origin + '/')}">`,
    `<meta property="og:image" content="${esc(img)}">`,
    `<meta property="og:image:type" content="image/png">`,
    `<meta property="og:image:width" content="${hasLogo ? 600 : 512}">`,
    `<meta property="og:image:height" content="${hasLogo ? 600 : 512}">`,
    `<meta property="og:image:alt" content="${esc('Logo ' + cfg.nama)}">`,
    `<meta property="og:locale" content="id_ID">`,
    `<meta name="twitter:card" content="summary">`,
    `<meta name="twitter:title" content="${esc(title)}">`,
    `<meta name="twitter:description" content="${esc(desc)}">`,
    `<meta name="twitter:image" content="${esc(img)}">`
  ].join('\n');

  let out = appHtml();
  out = out.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${esc(docTitle)}</title>\n${meta}`);

  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // data berhasil: cache di CDN 5 menit (+ stale-while-revalidate); gagal: cache singkat agar cepat pulih
  res.setHeader('Cache-Control', c.ok
    ? 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400'
    : 'public, max-age=0, s-maxage=30');
  res.end(out);
};
