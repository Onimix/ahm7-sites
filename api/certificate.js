const { Resvg } = require('@resvg/resvg-js');
const { PDFDocument } = require('pdf-lib');

const TEMPLATES = {
  1: { name:'Modern',          bg:'#0f172a', accent:'#6366f1', text:'#ffffff', sub:'#94a3b8', border:'#6366f1' },
  2: { name:'Dark Background', bg:'#000000', accent:'#ffffff', text:'#ffffff', sub:'#aaaaaa', border:'#555555' },
  3: { name:'Green',           bg:'#052e16', accent:'#22c55e', text:'#ffffff', sub:'#86efac', border:'#22c55e' },
  4: { name:'Classic',         bg:'#fffdf5', accent:'#1e3a5f', text:'#1e3a5f', sub:'#4a6080', border:'#1e3a5f' },
  5: { name:'Red_and_Yellow',  bg:'#1a0000', accent:'#ef4444', text:'#fbbf24', sub:'#f87171', border:'#ef4444' },
  6: { name:'Golden_Elegant',  bg:'#1a1200', accent:'#d4af37', text:'#fef3c7', sub:'#d4af37', border:'#d4af37' },
  7: { name:'Blue_Simple',     bg:'#eff6ff', accent:'#2563eb', text:'#1e40af', sub:'#3b82f6', border:'#2563eb' },
  8: { name:'Golden_and_Green',bg:'#0a1a0a', accent:'#d4af37', text:'#d4af37', sub:'#22c55e', border:'#d4af37' },
};

function wrap(text, maxChars) {
  const words = text.split(' ');
  const lines = []; let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > maxChars && line) { lines.push(line); line = w; }
    else line = (line ? line + ' ' : '') + w;
  }
  if (line) lines.push(line);
  return lines.slice(0, 4);
}

function buildSVG(name, date, signature, details, tid) {
  const T = TEMPLATES[tid] || TEMPLATES[1];
  const W = 1122, H = 794;
  const detailLines = wrap(details, 70);
  const detailSVG = detailLines.map((l, i) =>
    `<text x="561" y="${410 + i * 32}" font-size="20" fill="${T.sub}" text-anchor="middle" font-family="Georgia,serif">${l.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</text>`
  ).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <rect width="${W}" height="${H}" fill="${T.bg}"/>
  <rect x="20" y="20" width="${W-40}" height="${H-40}" fill="none" stroke="${T.border}" stroke-width="7"/>
  <rect x="32" y="32" width="${W-64}" height="${H-64}" fill="none" stroke="${T.border}" stroke-width="2" stroke-dasharray="6,4"/>
  <text x="561" y="118" font-size="38" font-weight="bold" fill="${T.accent}" text-anchor="middle" font-family="Arial,sans-serif" letter-spacing="4">CERTIFICATE OF ACHIEVEMENT</text>
  <line x1="200" y1="135" x2="922" y2="135" stroke="${T.accent}" stroke-width="2"/>
  <text x="561" y="195" font-size="22" fill="${T.sub}" text-anchor="middle" font-family="Georgia,serif" font-style="italic">This certifies that</text>
  <text x="561" y="285" font-size="56" font-weight="bold" fill="${T.text}" text-anchor="middle" font-family="Georgia,serif">${name.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</text>
  <line x1="261" y1="300" x2="861" y2="300" stroke="${T.accent}" stroke-width="2"/>
  ${detailSVG}
  <line x1="110" y1="615" x2="390" y2="615" stroke="${T.sub}" stroke-width="1"/>
  <line x1="732" y1="615" x2="1012" y2="615" stroke="${T.sub}" stroke-width="1"/>
  <text x="250" y="605" font-size="22" font-weight="bold" fill="${T.text}" text-anchor="middle" font-family="Arial,sans-serif">${signature.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</text>
  <text x="872" y="605" font-size="22" font-weight="bold" fill="${T.text}" text-anchor="middle" font-family="Arial,sans-serif">${date.replace(/&/g,'&amp;')}</text>
  <text x="250" y="638" font-size="16" fill="${T.sub}" text-anchor="middle" font-family="Arial,sans-serif">Authorized Signature</text>
  <text x="872" y="638" font-size="16" fill="${T.sub}" text-anchor="middle" font-family="Arial,sans-serif">Date</text>
  <text x="561" y="750" font-size="14" font-weight="bold" fill="${T.accent}" text-anchor="middle" font-family="Arial,sans-serif" letter-spacing="2">AHM7 × ONIMIX</text>
</svg>`;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  if (req.method === 'GET') {
    if (req.query.action === 'templates') {
      return res.json({ success: true, templates: Object.entries(TEMPLATES).map(([id,t]) => ({ id: Number(id), name: t.name.replace(/_/g,' ') })) });
    }
    return res.json({ message: 'CertSter API. POST /api/certificate to generate.' });
  }

  if (req.method === 'POST') {
    try {
      const { name, date, signature, details, templateId = 1, format = 'pdf' } = req.body;
      if (!name || !date || !signature || !details)
        return res.status(400).json({ error: 'Missing required fields.' });

      const tid = Math.min(8, Math.max(1, parseInt(templateId) || 1));
      const svg = buildSVG(name, date, signature, details, tid);
      const safeName = name.replace(/\s+/g,'_');
      const tmplName = (TEMPLATES[tid].name);

      if (format === 'svg') {
        res.setHeader('Content-Type', 'image/svg+xml');
        res.setHeader('Content-Disposition', `attachment; filename="Certificate_${safeName}_${tmplName}-Ahm7xMakki.svg"`);
        return res.send(svg);
      }

      // Render PNG from SVG
      const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1122 } });
      const pngBuf = resvg.render().asPng();

      if (format === 'png') {
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', `attachment; filename="Certificate_${safeName}_${tmplName}-Ahm7xMakki.png"`);
        return res.send(Buffer.from(pngBuf));
      }

      // PDF
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([1122, 794]);
      const img = await pdfDoc.embedPng(pngBuf);
      page.drawImage(img, { x: 0, y: 0, width: 1122, height: 794 });
      const pdfBytes = await pdfDoc.save();
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Certificate_${safeName}_${tmplName}-Ahm7xMakki.pdf"`);
      return res.send(Buffer.from(pdfBytes));
    } catch(e) {
      console.error(e);
      return res.status(500).json({ error: e.message });
    }
  }
  res.status(405).json({ error: 'Method not allowed' });
};
