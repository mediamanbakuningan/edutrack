// Pengambilan Pengaturan aplikasi (nama, keterangan, logo) dari Google Apps Script.
// File berawalan "_" tidak dijadikan endpoint oleh Vercel.
const fs = require('fs');
const path = require('path');

const DEF = { nama: 'EduTrack', tag: 'Laporan Kinerja & absensi guru', sek: '', logo: '' };
const TTL_OK = 5 * 60 * 1000;    // data berhasil: dipakai ulang 5 menit per instance
const TTL_FAIL = 30 * 1000;      // gagal: coba lagi setelah 30 detik
let cache = { t: 0, ttl: 0, cfg: null };
let html = null;

function appHtml() {
  if (!html) html = fs.readFileSync(path.join(process.cwd(), 'app.html'), 'utf8');
  return html;
}

// URL Web App dibaca dari konstanta API_URL di app.html (atau env GAS_URL bila diisi)
function apiUrl() {
  if (process.env.GAS_URL) return process.env.GAS_URL;
  const m = /const\s+API_URL\s*=\s*['"]([^'"]+)['"]/.exec(appHtml());
  return m ? m[1] : '';
}

async function getCfg() {
  const now = Date.now();
  if (cache.cfg && now - cache.t < cache.ttl) return cache;
  const url = apiUrl();
  const ctl = new AbortController();
  const tm = setTimeout(() => ctl.abort(), 6000);
  try {
    if (!/^https:\/\/script\.google\.com\//.test(url)) throw new Error('API_URL belum diisi');
    const res = await fetch(url, {
      method: 'POST', redirect: 'follow', signal: ctl.signal,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'publik', token: null, p: {} })
    });
    const j = await res.json();
    if (!j || !j.ok || !j.data) throw new Error('Respons tidak valid');
    const d = j.data;
    cache = { t: now, ttl: TTL_OK, ok: true, cfg: {
      nama: String(d.nama || DEF.nama), tag: d.tag !== undefined ? String(d.tag) : DEF.tag,
      sek: String(d.sek || ''), logo: String(d.logo || '') } };
  } catch (e) {
    // gagal: pakai data lama bila ada, kalau tidak pakai bawaan
    cache = { t: now, ttl: TTL_FAIL, ok: false, err: String((e && e.message) || e), cfg: (cache.cfg && cache.ok) ? cache.cfg : DEF };
  } finally { clearTimeout(tm); }
  return cache;
}

module.exports = { getCfg, appHtml, apiUrl, DEF };
