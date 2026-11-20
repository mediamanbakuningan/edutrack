// Menyajikan logo aplikasi (disimpan sebagai data URL di Sheet) sebagai gambar untuk og:image.
const { getCfg } = require('./_cfg');

module.exports = async (req, res) => {
  const c = await getCfg();
  const m = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(c.cfg.logo || '');
  if (!m) {
    res.statusCode = 302;
    res.setHeader('Location', '/icon-512.png');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60');
    return res.end();
  }
  const buf = Buffer.from(m[2], 'base64');
  res.statusCode = 200;
  res.setHeader('Content-Type', m[1] === 'png' ? 'image/png' : 'image/jpeg');
  res.setHeader('Content-Length', buf.length);
  // URL membawa ?v=<hash logo>, jadi aman di-cache lama; berubah otomatis saat logo diganti
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');
  res.end(buf);
};
