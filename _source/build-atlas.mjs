// Construit data/atlas-muscles.bin à partir des maillages BodyParts3D (via niuxito/human-body)
import fs from 'fs';
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer';
await MeshoptSimplifier.ready; await MeshoptEncoder.ready;
const CAT = JSON.parse(fs.readFileSync('/home/claude/atlas/catalog.json', 'utf8'));
const s = fs.readFileSync('/home/claude/ext2/niuxito_human-body/data/anatomia.js', 'utf8');
const A = JSON.parse(s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1));
const C = A.concepts;
const mus = JSON.parse(fs.readFileSync('/tmp/claude-0/mus-raw.json', 'utf8'));
const esq = JSON.parse(fs.readFileSync('/tmp/claude-0/esq-raw.json', 'utf8'));
const TENDON = new Set([264, 211, 39, 215, 203, 55, 158]);
const exclude = new Set(CAT.exclude);
const tracked = {}; // concept -> [atlasId, depth, name]
CAT.muscles.forEach(m => m.parts.forEach(([c, n, d]) => tracked[c] = [m.id, d, n || m.fr]));

function weld(list) { // fusionne les sous-maillages, soude les sommets identiques
  const map = new Map(), P = [], I = [];
  for (const { pos, idx } of list) {
    const loc = [];
    for (let i = 0; i < pos.length; i += 3) {
      const k = Math.round(pos[i] * 1e5) + ',' + Math.round(pos[i + 1] * 1e5) + ',' + Math.round(pos[i + 2] * 1e5);
      let j = map.get(k); if (j === undefined) { j = P.length / 3; map.set(k, j); P.push(pos[i], pos[i + 1], pos[i + 2]) }
      loc.push(j);
    }
    for (let i = 0; i < idx.length; i += 3) { const a = loc[idx[i]], b = loc[idx[i + 1]], c = loc[idx[i + 2]]; if (a !== b && b !== c && a !== c) I.push(a, b, c) }
  }
  return { P: new Float32Array(P), I: new Uint32Array(I) };
}
function simplify(P, I, target, err) {
  if (I.length / 3 <= target) return I;
  const [out] = MeshoptSimplifier.simplify(I, P, 3, Math.max(3, Math.floor(target) * 3), err, ['LockBorder']);
  return out;
}
const items = [];
// bandes du grand droit (par côté) pour retirer les aponévroses des obliques qui le recouvrent
const RECT = {};
for (const p of A.parts) if (p.c === 389) { const { P } = weld(mus[p.id]); const bins = {};
  for (let i = 0; i < P.length; i += 3) { const b = Math.floor(P[i + 1] / 0.005); const o = bins[b] || (bins[b] = [1e9, -1e9]); o[0] = Math.min(o[0], P[i]); o[1] = Math.max(o[1], P[i]) }
  RECT[p.sd] = bins }
function cropOverRectus(P, I, sd) {
  const bins = RECT[sd]; if (!bins) return I; const out = [];
  for (let i = 0; i < I.length; i += 3) { const a = I[i] * 3, b = I[i + 1] * 3, c = I[i + 2] * 3;
    const x = (P[a] + P[b] + P[c]) / 3, y = (P[a + 1] + P[b + 1] + P[c + 1]) / 3;
    const o = bins[Math.floor(y / 0.005)]; if (o && x > o[0] + 0.004 && x < o[1] - 0.004) continue; out.push(I[i], I[i + 1], I[i + 2]) }
  return new Uint32Array(out) }
// muscles
for (const p of A.parts) {
  const cpt = C[p.c]; if (!cpt || cpt.s !== 'mus') continue;
  if (exclude.has(p.c)) continue;
  const raw = mus[p.id]; if (!raw) { console.warn('manque', p.id); continue }
  const tr = tracked[p.c];
  let { P, I } = weld(raw);
  if (p.c === 127 || p.c === 220 || p.c === 522) { const n0 = I.length; I = cropOverRectus(P, I, p.sd); console.log('crop', p.c, p.sd, n0 / 3, '->', I.length / 3) }
  const tris = I.length / 3;
  const target = tr ? Math.min(3800, Math.max(900, tris * 0.42)) : Math.min(1100, Math.max(160, tris * 0.14));
  const I2 = simplify(P, I, target, tr ? 0.004 : 0.012);
  let depth = tr ? tr[1] : (CAT.ctxdepth[p.c] || 0);
  items.push({ c: p.c, sd: p.sd || '', a: tr ? tr[0] : '', d: depth, t: TENDON.has(p.c) ? 't' : 'm', P, I: I2 });
}
// squelette (contexte, faible détail)
for (const [id, raw] of Object.entries(esq)) {
  const { P, I } = weld(raw); const tris = I.length / 3;
  const I2 = simplify(P, I, Math.min(1400, Math.max(80, tris * 0.07)), 0.01);
  items.push({ c: -1, sd: '', a: '', d: 0, t: 'b', P, I: I2 });
}
// boîte englobante globale
const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
items.forEach(it => { for (let i = 0; i < it.P.length; i += 3) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], it.P[i + k]); mx[k] = Math.max(mx[k], it.P[i + k]) } });
const meta = [], bufs = []; let off = 0, totT = 0, totTr = 0;
for (const it of items) {
  // compacte les sommets utilisés
  const used = new Int32Array(it.P.length / 3).fill(-1); let n = 0; const I = new Uint32Array(it.I.length);
  for (let i = 0; i < it.I.length; i++) { const v = it.I[i]; if (used[v] < 0) used[v] = n++; I[i] = used[v] }
  if (n > 65535) throw new Error('trop de sommets ' + it.c);
  const [remap, uniq] = MeshoptEncoder.reorderMesh(I, true, true);
  const V = new Uint16Array(uniq * 4);
  for (let v = 0; v < used.length; v++) { if (used[v] < 0) continue; const r = remap[used[v]]; for (let k = 0; k < 3; k++) V[r * 4 + k] = Math.round((it.P[v * 3 + k] - mn[k]) / (mx[k] - mn[k]) * 65535) }
  const vb = MeshoptEncoder.encodeVertexBuffer(new Uint8Array(V.buffer), uniq, 8);
  const ib = MeshoptEncoder.encodeIndexBuffer(new Uint8Array(I.buffer), I.length, 4);
  const pad = b => { const r = (4 - b.length % 4) % 4; return r ? Buffer.concat([Buffer.from(b), Buffer.alloc(r)]) : Buffer.from(b) };
  const vbp = pad(vb), ibp = pad(ib);
  meta.push([it.c, it.sd, it.a, it.d, it.t, uniq, I.length, off, vb.length, off + vbp.length, ib.length]);
  bufs.push(vbp, ibp); off += vbp.length + ibp.length; totT += I.length / 3; if (it.a) totTr += I.length / 3;
}
// noms des structures de contexte
const ctxName = c => { if (CAT.ctx[c]) return CAT.ctx[c]; const g = C[c].g; return (CAT.ctxgroups.find(([p]) => g.startsWith(p)) || ['', 'Muscle'])[1] };
const names = {}; items.forEach(it => { if (it.c >= 0 && !it.a) names[it.c] = ctxName(it.c) });
const head = Buffer.from(JSON.stringify({ v: 1, mn, mx, m: meta, names }));
const hl = Buffer.alloc(4); hl.writeUInt32LE(head.length);
const hpad = Buffer.alloc((4 - (head.length % 4)) % 4, 32);
const out = Buffer.concat([Buffer.from('WAA1'), hl, head, hpad, ...bufs]);
fs.mkdirSync('/home/claude/data', { recursive: true });
fs.writeFileSync('/home/claude/data/atlas-muscles.bin', out);
console.log('meshes', items.length, 'tris', totT, 'tracked tris', totTr, 'bytes', out.length);
