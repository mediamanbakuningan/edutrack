// Menyajikan logo aplikasi (disimpan sebagai data URL di Sheet) sebagai gambar og:image.
// WhatsApp menolak/menyembunyikan gambar yang terlalu kecil, jadi logo ditaruh di kanvas persegi 300x300 (tampil sebagai thumbnail kecil di samping judul).
const { getCfg } = require('./_cfg');
let sharp = null;
try { sharp = require('sharp'); } catch (e) { sharp = null; }

async function toCard(buf) {
  if (!sharp) return { body: buf, type: null };
  const logo = await sharp(buf).resize(250, 250, { fit: 'inside' }).png().toBuffer();
  const base = sharp({ create: { width: 300, height: 300, channels: 3, background: '#ffffff' } })
    .composite([{ input: logo, gravity: 'centre' }]);
  let out = await base.clone().png({ compressionLevel: 9 }).toBuffer();
  if (out.length > 280 * 1024) return { body: await base.jpeg({ quality: 85 }).toBuffer(), type: 'image/jpeg' };
  return { body: out, type: 'image/png' };
}

module.exports = async (req, res) => {
  const c = await getCfg();
  const m = /^data:image\/(png|jpeg);base64,([A-Za-z0-9+/=]+)$/.exec(c.cfg.logo || '');
  if (!m) {
    res.statusCode = 302;
    res.setHeader('Location', '/icon-512.png');
    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60');
    return res.end();
  }
  let out;
  try { out = await toCard(Buffer.from(m[2], 'base64')); }
  catch (e) { out = { body: Buffer.from(m[2], 'base64'), type: null }; }
  res.statusCode = 200;
  res.setHeader('Content-Type', out.type || (m[1] === 'png' ? 'image/png' : 'image/jpeg'));
  res.setHeader('Content-Length', out.body.length);
  // URL membawa ?v=<hash logo>, jadi aman di-cache lama; berubah otomatis saat logo diganti
  res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');
  res.end(out.body);
};
