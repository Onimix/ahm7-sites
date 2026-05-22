const { createCanvas } = require('canvas');

const TEMPLATES = {
  1: { name:'Modern',         bg:'#0f172a', accent:'#6366f1', text:'#ffffff', sub:'#94a3b8', border:'#6366f1' },
  2: { name:'Dark Background',bg:'#000000', accent:'#ffffff', text:'#ffffff', sub:'#aaaaaa', border:'#555555' },
  3: { name:'Green',          bg:'#052e16', accent:'#22c55e', text:'#ffffff', sub:'#86efac', border:'#22c55e' },
  4: { name:'Classic',        bg:'#fffdf5', accent:'#1e3a5f', text:'#1e3a5f', sub:'#4a6080', border:'#1e3a5f' },
  5: { name:'Red and Yellow', bg:'#1a0000', accent:'#ef4444', text:'#fbbf24', sub:'#f87171', border:'#ef4444' },
  6: { name:'Golden Elegant', bg:'#1a1200', accent:'#d4af37', text:'#fef3c7', sub:'#d4af37', border:'#d4af37' },
  7: { name:'Blue Simple',    bg:'#eff6ff', accent:'#2563eb', text:'#1e40af', sub:'#3b82f6', border:'#2563eb' },
  8: { name:'Golden and Green',bg:'#0a1a0a',accent:'#d4af37', text:'#d4af37', sub:'#22c55e', border:'#d4af37' },
};

function drawCert(name, date, signature, details, templateId, W, H) {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');
  const T = TEMPLATES[templateId] || TEMPLATES[1];

  // Background
  ctx.fillStyle = T.bg;
  ctx.fillRect(0, 0, W, H);

  // Outer border
  ctx.strokeStyle = T.border;
  ctx.lineWidth = 8;
  ctx.strokeRect(24, 24, W - 48, H - 48);
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 36, W - 72, H - 72);

  // Header
  ctx.fillStyle = T.accent;
  ctx.font = `bold ${Math.round(W*0.045)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText('CERTIFICATE OF ACHIEVEMENT', W/2, H*0.15);

  // Decorative line
  ctx.strokeStyle = T.accent;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(W*0.2, H*0.18); ctx.lineTo(W*0.8, H*0.18); ctx.stroke();

  // "This certifies that"
  ctx.fillStyle = T.sub;
  ctx.font = `italic ${Math.round(W*0.025)}px serif`;
  ctx.fillText('This certifies that', W/2, H*0.26);

  // Name
  ctx.fillStyle = T.text;
  ctx.font = `bold ${Math.round(W*0.065)}px serif`;
  ctx.fillText(name, W/2, H*0.36);

  // Underline name
  const nm = ctx.measureText(name);
  ctx.strokeStyle = T.accent;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(W/2 - nm.width/2, H*0.375); ctx.lineTo(W/2 + nm.width/2, H*0.375); ctx.stroke();

  // Details - word wrap
  ctx.fillStyle = T.sub;
  ctx.font = `${Math.round(W*0.022)}px sans-serif`;
  const words = details.split(' ');
  const maxW = W * 0.7;
  let line = '', lines = [], y = H*0.46;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  lines.slice(0,4).forEach((l, i) => ctx.fillText(l, W/2, y + i * Math.round(W*0.028)));

  // Date and Signature row
  const sigY = H * 0.78;
  ctx.strokeStyle = T.sub; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(W*0.12, sigY); ctx.lineTo(W*0.38, sigY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W*0.62, sigY); ctx.lineTo(W*0.88, sigY); ctx.stroke();

  ctx.fillStyle = T.text;
  ctx.font = `bold ${Math.round(W*0.025)}px sans-serif`;
  ctx.fillText(signature, W*0.25, sigY - 10);
  ctx.fillText(date, W*0.75, sigY - 10);

  ctx.fillStyle = T.sub;
  ctx.font = `${Math.round(W*0.018)}px sans-serif`;
  ctx.fillText('Authorized Signature', W*0.25, sigY + 22);
  ctx.fillText('Date', W*0.75, sigY + 22);

  // Footer
  ctx.fillStyle = T.accent;
  ctx.font = `bold ${Math.round(W*0.016)}px sans-serif`;
  ctx.fillText('AHM7 × ONIMIX', W/2, H*0.93);

  return canvas;
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  if (req.method === 'GET') {
    const action = req.query.action;
    if (action === 'templates') {
      return res.json({ success: true, templates: Object.entries(TEMPLATES).map(([id,t]) => ({ id: Number(id), name: t.name })) });
    }
    return res.json({ message: 'CertSter API. POST /api/certificate to generate.' });
  }

  if (req.method === 'POST') {
    try {
      const { name, date, signature, details, templateId = 1, format = 'pdf' } = req.body;
      if (!name || !date || !signature || !details) {
        return res.status(400).json({ error: 'Missing required fields: name, date, signature, details' });
      }
      const tid = parseInt(templateId) || 1;
      const W = 1122, H = 794;
      const canvas = drawCert(name, date, signature, details, tid, W, H);
      const tmplName = (TEMPLATES[tid] || TEMPLATES[1]).name.replace(/\s+/g,'_');
      const safeName = name.replace(/\s+/g,'_');

      if (format === 'pdf') {
        const PDFDocument = require('pdfkit');
        const doc = new PDFDocument({ size: [W, H], margin: 0 });
        const chunks = [];
        doc.on('data', c => chunks.push(c));
        await new Promise(resolve => {
          doc.on('end', resolve);
          const imgBuf = canvas.toBuffer('image/png');
          doc.image(imgBuf, 0, 0, { width: W, height: H });
          doc.end();
        });
        const buf = Buffer.concat(chunks);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Certificate_${safeName}_${tmplName}-Ahm7xMakki.pdf"`);
        return res.send(buf);
      } else if (format === 'jpg' || format === 'jpeg') {
        const buf = canvas.toBuffer('image/jpeg', { quality: 0.95 });
        res.setHeader('Content-Type', 'image/jpeg');
        res.setHeader('Content-Disposition', `attachment; filename="Certificate_${safeName}_${tmplName}-Ahm7xMakki.jpg"`);
        return res.send(buf);
      } else {
        const buf = canvas.toBuffer('image/png');
        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', `attachment; filename="Certificate_${safeName}_${tmplName}-Ahm7xMakki.png"`);
        return res.send(buf);
      }
    } catch (e) {
      console.error(e);
      return res.status(500).json({ error: e.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
};
