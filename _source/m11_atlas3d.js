/* =====================  ATLAS 3D : moteur d'affichage (three.js)  ===================== */
/* Maillages : BodyParts3D © DBCLS (CC BY-SA 2.1 JP), via le projet « Anatomía en capas » (CC BY-SA 4.0), simplifiés pour Winter Arc. */
function createAtlas3D(THREE, dec, buf, opt){
  opt = opt || {};
  const dv = new DataView(buf), hl = dv.getUint32(4, true);
  const head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, hl)));
  const base = 8 + hl + ((4 - hl % 4) % 4), mn = head.mn, mx = head.mx, sc = [0,1,2].map(k => (mx[k] - mn[k]) / 65535);
  const canvas = document.createElement("canvas"); canvas.className = "atlas-cv";
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance", preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 20);
  scene.add(new THREE.HemisphereLight(0xdfe8ef, 0x0f1418, 0.36));
  const key = new THREE.DirectionalLight(0xffffff, 0.58); key.position.set(-1.2, 1.6, 2.2); camera.add(key);
  const fill = new THREE.DirectionalLight(0xbcd2e0, 0.16); fill.position.set(1.8, 0.2, 1.0); camera.add(fill);
  const rim = new THREE.DirectionalLight(0x9fc4dc, 0.34); rim.position.set(0.4, 1.2, -2.5); camera.add(rim);
  scene.add(camera);
  const root = new THREE.Group(); scene.add(root);

  /* ---- décodage ---- */
  function decodeItem(m){
    const [c, sd, a, d, t, vc, ic, vo, vl, io, il] = m;
    const V = new Uint16Array(vc * 4), I = new Uint32Array(ic);
    dec.decodeVertexBuffer(new Uint8Array(V.buffer), vc, 8, new Uint8Array(buf, base + vo, vl));
    dec.decodeIndexBuffer(new Uint8Array(I.buffer), ic, 4, new Uint8Array(buf, base + io, il));
    const P = new Float32Array(vc * 3);
    for(let i = 0; i < vc; i++) for(let k = 0; k < 3; k++) P[i * 3 + k] = mn[k] + V[i * 4 + k] * sc[k];
    return { c, sd, a, d, t, P, I };
  }
  function geom(P, I, col){
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(P, 3));
    if(col) g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    g.setIndex(new THREE.BufferAttribute(I, 1)); g.computeVertexNormals(); g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
  const items = head.m.map(decodeItem);

  /* ---- muscles suivis : un matériau par muscle, partagé par les deux côtés ---- */
  const mats = {}, meshes = [], byA = {}, pick = [];
  function matFor(a, vc){
    const k = a + (vc ? "#vc" : "");
    if(!mats[k]) mats[k] = new THREE.MeshStandardMaterial({ color: 0x8b949e, roughness: 0.58, metalness: 0.0, vertexColors: !!vc });
    mats[k].userData.a = a; return mats[k];
  }
  const segs = opt.segments || {};
  items.filter(it => it.a).forEach(it => {
    let col = null;
    if(segs[it.a]){ // segments visuels (intersections tendineuses du grand droit)
      let y0 = 1e9, y1 = -1e9; for(let i = 1; i < it.P.length; i += 3){ y0 = Math.min(y0, it.P[i]); y1 = Math.max(y1, it.P[i]) }
      const cuts = segs[it.a].map(f => y0 + f * (y1 - y0)), w = (y1 - y0) * 0.012;
      col = new Float32Array(it.P.length);
      for(let i = 0; i < it.P.length / 3; i++){ const y = it.P[i * 3 + 1]; let f = 1; cuts.forEach(cy => { const dd = Math.abs(y - cy); if(dd < w * 2.2) f = Math.min(f, 0.42 + 0.58 * (dd / (w * 2.2)) ** 1.6) }); col[i*3] = col[i*3+1] = col[i*3+2] = f }
    }
    const mesh = new THREE.Mesh(geom(it.P, it.I, col), matFor(it.a, !!col));
    mesh.userData = { a: it.a, c: it.c, sd: it.sd, d: it.d };
    root.add(mesh); meshes.push(mesh); pick.push(mesh); (byA[it.a] = byA[it.a] || []).push(mesh);
  });
  /* ---- contexte : muscles non suivis, tendons, squelette (fusionnés par couche) ---- */
  const ctxMat = {
    m: new THREE.MeshStandardMaterial({ color: 0x3b444c, roughness: 0.75 }),
    t: new THREE.MeshStandardMaterial({ color: 0x7d878e, roughness: 0.5 }),
    b: new THREE.MeshStandardMaterial({ color: 0x7a7466, roughness: 0.85 })
  };
  const ctx = [];
  const groups = {};
  items.filter(it => !it.a).forEach(it => { let x = 0, y = 0; const n = it.P.length / 3; for(let i = 0; i < it.P.length; i += 3){ x += it.P[i]; y += it.P[i + 1] }
    const k = it.t + it.d + ":" + Math.floor(x / n / 0.16) + ":" + Math.floor(y / n / 0.22); (groups[k] = groups[k] || []).push(it) });
  Object.entries(groups).forEach(([k, list]) => {
    let nv = 0, ni = 0; list.forEach(it => { nv += it.P.length; ni += it.I.length });
    const P = new Float32Array(nv), I = new Uint32Array(ni), owners = []; let ov = 0, oi = 0;
    list.forEach(it => { P.set(it.P, ov); for(let i = 0; i < it.I.length; i++) I[oi + i] = it.I[i] + ov / 3; owners.push([oi / 3, it.c, it.sd]); ov += it.P.length; oi += it.I.length });
    const mesh = new THREE.Mesh(geom(P, I), ctxMat[list[0].t]);
    mesh.userData = { ctx: true, t: list[0].t, d: list[0].d, owners };
    root.add(mesh); ctx.push(mesh); pick.push(mesh);
  });
  /* centrage */
  const box = new THREE.Box3().setFromObject(root), H = box.max.y - box.min.y;
  const center = new THREE.Vector3((box.min.x + box.max.x) / 2, (box.min.y + box.max.y) / 2, (box.min.z + box.max.z) / 2);

  /* ---- caméra orbitale ---- */
  const VIEWS = { front: 0, back: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 };
  const cam = { yaw: 0, pitch: 0.04, dist: 1, tx: center.x, ty: center.y, tz: center.z, anim: null };
  let W = 300, Hh = 400, fitDist = 4;
  function fit(){ const vf = THREE.MathUtils.degToRad(camera.fov) / 2, asp = W / Hh;
    const dH = (H * 0.54) / Math.tan(vf), dW = (0.46) / (Math.tan(vf) * asp); fitDist = Math.max(dH, dW) * 1.04; }
  function place(){ const cp = Math.cos(cam.pitch);
    camera.position.set(cam.tx + cam.dist * Math.sin(cam.yaw) * cp, cam.ty + cam.dist * Math.sin(cam.pitch), cam.tz + cam.dist * Math.cos(cam.yaw) * cp);
    camera.lookAt(cam.tx, cam.ty, cam.tz); }
  let dirty = true, raf = 0;
  function req(){ dirty = true; if(!raf) raf = requestAnimationFrame(frame) }
  function frame(t){ raf = 0;
    if(cam.anim){ const A = cam.anim, k = Math.min(1, (t - (A.t0 || (A.t0 = t))) / A.ms), e = k < .5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2;
      Object.keys(A.to).forEach(p => cam[p] = A.from[p] + (A.to[p] - A.from[p]) * e);
      if(k >= 1) cam.anim = null; dirty = true; }
    if(dirty){ place(); renderer.render(scene, camera); dirty = false }
    if(cam.anim) raf = requestAnimationFrame(frame);
  }
  function animTo(to, ms){ const from = {}; Object.keys(to).forEach(p => from[p] = cam[p]);
    if(to.yaw != null){ let d = to.yaw - cam.yaw; d = ((d + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI; to.yaw = cam.yaw + d }
    cam.anim = { from, to, ms: ms || 520 }; req(); }
  function setView(v, instant){ const to = { yaw: VIEWS[v] != null ? VIEWS[v] : 0, pitch: 0.04, dist: fitDist, tx: center.x, ty: center.y, tz: center.z };
    if(instant){ Object.assign(cam, to); req() } else animTo(to) }
  function focusOn(a, v){ const ms = byA[a]; if(!ms) return; const b = new THREE.Box3(); ms.forEach(m => b.expandByObject(m));
    const c = b.getCenter(new THREE.Vector3()), s = b.getSize(new THREE.Vector3());
    const vf = THREE.MathUtils.degToRad(camera.fov) / 2, ext = Math.max(s.y, Math.max(s.x, s.z) / (W / Hh)) * 0.5;
    const d = Math.min(fitDist, Math.max(fitDist * 0.32, ext / Math.tan(vf) * 2.4));
    animTo({ yaw: VIEWS[v] != null ? VIEWS[v] : cam.yaw, pitch: 0.04, dist: d, tx: c.x * 0.5 + center.x * 0.5, ty: c.y, tz: center.z }); }
  function resize(){ const r = canvas.parentNode ? canvas.parentNode.getBoundingClientRect() : { width: 300, height: 400 };
    const w = Math.max(100, Math.round(r.width)), h = Math.max(160, Math.round(r.height));
    if(w === W && h === Hh) return; const first = W === 300 && Hh === 400; W = w; Hh = h;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); const old = fitDist; fit();
    cam.dist = first ? fitDist : cam.dist * fitDist / old; req(); }
  const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;

  /* ---- couches : 0 superficiel, 1 intermédiaire (retire d1), 2 profond (retire d1 et d2) ---- */
  let layer = 0;
  function setLayer(L){ layer = L; meshes.concat(ctx).forEach(m => { const d = m.userData.d; m.visible = !(d === 1 && L >= 1) && !(d === 2 && L >= 2) }); req() }

  /* ---- couleurs ---- */
  const tmp = new THREE.Color(), dark = new THREE.Color(0x1b2228);
  let colors = {}, dims = null, hover = "", sel = "";
  function hash(s){ let h = 0; for(let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return ((h >>> 0) % 1000) / 1000 }
  function paint(){
    Object.values(mats).forEach(m => { const a = m.userData.a;
      tmp.set(colors[a] || "#8b949e"); const j = 0.94 + hash(a) * 0.12; tmp.multiplyScalar(j);
      if(dims && !dims.has(a)) tmp.lerp(dark, 0.72);
      m.color.copy(tmp);
      m.emissive.setHex(a === sel ? 0x3a3a3a : a === hover ? 0x262626 : 0x000000);
    });
    req();
  }
  function setColors(map, dimSet){ colors = map || {}; dims = dimSet || null; paint() }

  /* ---- sélection au toucher / survol ---- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  function hitAt(x, y){
    const r = canvas.getBoundingClientRect(); ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    place(); ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(pick.filter(m => m.visible), false); if(!hits.length) return null;
    const h = hits[0], u = h.object.userData;
    if(u.a) return { a: u.a, c: u.c, sd: u.sd };
    if(u.t === "b") return null;
    const fi = h.faceIndex; let o = u.owners[0]; for(const w of u.owners){ if(w[0] <= fi) o = w; else break }
    return { ctx: true, c: o[1], sd: o[2], name: (head.names || {})[o[1]] || "Muscle" };
  }
  const ptrs = new Map(); let gest = null, lastHover = "";
  function onDown(e){ canvas.setPointerCapture && canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if(ptrs.size === 1) gest = { x0: e.clientX, y0: e.clientY, t0: performance.now(), moved: false, btn: e.button, type: e.pointerType, yaw: cam.yaw, pitch: cam.pitch, tx: cam.tx, ty: cam.ty };
    else if(ptrs.size === 2){ const [a, b] = [...ptrs.values()]; gest = { pinch: Math.hypot(a.x - b.x, a.y - b.y), dist: cam.dist, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, tx: cam.tx, ty: cam.ty, moved: true } }
    cam.anim = null; }
  function onMove(e){
    if(!ptrs.has(e.pointerId)){ if(e.pointerType === "mouse" && opt.onHover){ hovEv = e; if(!hovRaf) hovRaf = requestAnimationFrame(doHover) } return }
    moveDrag(e) }
  let hovEv = null, hovRaf = 0;
  function doHover(){ hovRaf = 0; const e = hovEv; if(!e || ptrs.size) return; { const h = hitAt(e.clientX, e.clientY); const k = h ? (h.a || "ctx" + h.c) : "";
        if(k !== lastHover){ lastHover = k; hover = h && h.a ? h.a : ""; paint(); canvas.style.cursor = h ? "pointer" : "grab" } opt.onHover(h, e.clientX, e.clientY) } }
  function moveDrag(e){
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); if(!gest) return;
    const per = (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * cam.dist) / Hh;
    if(ptrs.size >= 2 && gest.pinch){ const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      cam.dist = Math.min(fitDist * 1.3, Math.max(fitDist * 0.16, gest.dist * gest.pinch / Math.max(20, d)));
      const mxx = (a.x + b.x) / 2, myy = (a.y + b.y) / 2; panBy(gest, mxx - gest.mx, myy - gest.my, per); req(); return }
    const dx = e.clientX - gest.x0, dy = e.clientY - gest.y0; if(Math.abs(dx) + Math.abs(dy) > 6) gest.moved = true; if(!gest.moved) return;
    if(gest.btn === 2 || e.shiftKey){ panBy(gest, dx, dy, per) }
    else { cam.yaw = gest.yaw - dx * 0.0105; if(opt.pitch !== false || full) cam.pitch = Math.max(-0.7, Math.min(0.9, gest.pitch + dy * 0.006)) }
    req(); if(opt.onHover) opt.onHover(null); }
  function panBy(g, dx, dy, per){ const rx = Math.cos(cam.yaw), rz = -Math.sin(cam.yaw);
    cam.tx = g.tx - dx * per * rx; cam.tz = center.z - dx * per * rz * 0; cam.ty = Math.max(box.min.y, Math.min(box.max.y, g.ty + dy * per)); }
  function onUp(e){ const g = gest; ptrs.delete(e.pointerId);
    if(ptrs.size === 0){ if(g && !g.moved && performance.now() - g.t0 < 600 && opt.onPick){ const h = hitAt(e.clientX, e.clientY); opt.onPick(h, e.pointerType) } gest = null }
    else if(ptrs.size === 1){ const [p] = [...ptrs.values()]; gest = { x0: p.x, y0: p.y, t0: 0, moved: true, yaw: cam.yaw, pitch: cam.pitch, tx: cam.tx, ty: cam.ty } } }
  function onCancel(e){ ptrs.delete(e.pointerId); if(!ptrs.size) gest = null }
  function onWheel(e){ e.preventDefault(); cam.anim = null; cam.dist = Math.min(fitDist * 1.3, Math.max(fitDist * 0.16, cam.dist * Math.exp(e.deltaY * 0.0012))); req() }
  function onLeave(){ if(lastHover){ lastHover = ""; hover = ""; paint() } if(opt.onHover) opt.onHover(null) }
  canvas.addEventListener("pointerdown", onDown); canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onUp); canvas.addEventListener("pointercancel", onCancel);
  canvas.addEventListener("pointerleave", onLeave); canvas.addEventListener("wheel", onWheel, { passive: false });
  canvas.addEventListener("contextmenu", e => e.preventDefault());
  let full = false;

  /* ---- vue isolée d'un muscle (image pour la fiche) ---- */
  const snaps = {};
  function snapshot(a, v, color){
    const k = a + "|" + v + "|" + color; if(snaps[k]) return snaps[k];
    const ms = byA[a]; if(!ms) return "";
    const side = ms.filter(m => m.userData.sd !== "D").length ? ms.filter(m => v === "right" ? m.userData.sd !== "I" : m.userData.sd !== "D") : ms;
    const list = side.length ? side : ms;
    const s2 = new THREE.Scene(), c2 = new THREE.PerspectiveCamera(24, 4 / 3, 0.02, 20);
    s2.add(new THREE.HemisphereLight(0xe6eef4, 0x1a2228, 0.7)); const k2 = new THREE.DirectionalLight(0xffffff, 0.85); k2.position.set(-1, 1.5, 2); c2.add(k2); s2.add(c2);
    const ghost = new THREE.MeshBasicMaterial({ color: 0x6f7b85, transparent: true, opacity: 0.16, depthWrite: false });
    const mm = new THREE.MeshStandardMaterial({ color: new THREE.Color(color || "#c9504f"), roughness: 0.5, vertexColors: list[0].material.vertexColors });
    ctx.filter(m => m.userData.t === "b").forEach(m => s2.add(new THREE.Mesh(m.geometry, ghost)));
    const b = new THREE.Box3(); list.forEach(m => { s2.add(new THREE.Mesh(m.geometry, mm)); b.expandByObject(m) });
    const c = b.getCenter(new THREE.Vector3()), sz = b.getSize(new THREE.Vector3()), yaw = VIEWS[v] != null ? VIEWS[v] : 0;
    const vf = THREE.MathUtils.degToRad(c2.fov) / 2, ext = Math.max(sz.y / 2, Math.max(sz.x, sz.z) / 2 / (4 / 3)) * 1.25;
    const d = ext / Math.tan(vf); c2.position.set(c.x + d * Math.sin(yaw), c.y + d * 0.06, c.z + d * Math.cos(yaw)); c2.lookAt(c);
    const w = 480, h = 360, rt = new THREE.WebGLRenderTarget(w, h, { samples: 4 });
    renderer.setRenderTarget(rt); renderer.setClearColor(0x0f161b, 1); renderer.clear(); renderer.render(s2, c2);
    const px = new Uint8Array(w * h * 4); renderer.readRenderTargetPixels(rt, 0, 0, w, h, px);
    renderer.setRenderTarget(null); renderer.setClearColor(0x000000, 0); rt.dispose(); mm.dispose(); ghost.dispose();
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h; const g = cv.getContext("2d"), img = g.createImageData(w, h);
    for(let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w * 4, (h - y) * w * 4), y * w * 4);
    g.putImageData(img, 0, 0); req();
    return snaps[k] = cv.toDataURL("image/png");
  }

  return {
    canvas, items: items.length,
    tris: meshes.concat(ctx).reduce((a, m) => a + m.geometry.index.count / 3, 0),
    mount(host){ if(canvas.parentNode !== host) host.appendChild(canvas); if(ro){ ro.disconnect(); ro.observe(host) } resize(); req() },
    resize, setView, focusOn, setLayer, setColors,
    setSel(a){ sel = a || ""; paint() },
    setHover(a){ hover = a || ""; paint() },
    setFull(f){ full = !!f; setTimeout(resize, 30) },
    zoom(f){ cam.anim = null; cam.dist = Math.min(fitDist * 1.3, Math.max(fitDist * 0.16, cam.dist * f)); req() },
    snapshot, has: a => !!byA[a], render: req,
    bodyShot(map, w, h){ // corps entier face + dos, colorié selon map, pour la vignette d'un exercice
      const keep = { colors, dims, sel, hover, layer }; colors = map || {}; dims = null; sel = ""; hover = "";
      Object.values(mats).forEach(m => { const a = m.userData.a; m.color.set(colors[a] || "#5d666e"); m.emissive.setHex(0) });
      meshes.concat(ctx).forEach(m => m.visible = true);
      const c2 = new THREE.PerspectiveCamera(24, (w / 2) / h, 0.05, 20), out = document.createElement("canvas"); out.width = w; out.height = h; const g = out.getContext("2d");
      const k2 = new THREE.DirectionalLight(0xffffff, 0.55); k2.position.set(-1, 1.5, 2); c2.add(k2); const f2 = new THREE.DirectionalLight(0xbcd2e0, 0.2); f2.position.set(1.5, 0, 1); c2.add(f2); scene.add(c2);
      camera.remove(key); camera.remove(fill); camera.remove(rim);
      const vf = THREE.MathUtils.degToRad(c2.fov) / 2, d = (H * 0.53) / Math.tan(vf), rt = new THREE.WebGLRenderTarget(w / 2, h, { samples: 4 }), px = new Uint8Array(w / 2 * h * 4);
      [0, Math.PI].forEach((yaw, j) => {
        c2.position.set(center.x + d * Math.sin(yaw), center.y, center.z + d * Math.cos(yaw)); c2.lookAt(center);
        renderer.setRenderTarget(rt); renderer.setClearColor(0x0f161b, 1); renderer.clear(); renderer.render(scene, c2); renderer.readRenderTargetPixels(rt, 0, 0, w / 2, h, px);
        const img = g.createImageData(w / 2, h); for(let y = 0; y < h; y++) img.data.set(px.subarray((h - 1 - y) * w / 2 * 4, (h - y) * w / 2 * 4), y * w / 2 * 4);
        g.putImageData(img, j * w / 2, 0) });
      renderer.setRenderTarget(null); renderer.setClearColor(0x000000, 0); rt.dispose(); scene.remove(c2); camera.add(key); camera.add(fill); camera.add(rim);
      colors = keep.colors; dims = keep.dims; sel = keep.sel; hover = keep.hover; setLayer(keep.layer); paint();
      return out.toDataURL("image/png") },
    probe(a){ const ms = byA[a]; if(!ms) return null; place(); camera.updateMatrixWorld(); const r = canvas.getBoundingClientRect(), v = new THREE.Vector3();
      for(const m of ms){ if(!m.visible) continue; const P = m.geometry.attributes.position, step = Math.max(1, Math.floor(P.count / 30));
        for(let i = 0; i < P.count; i += step){ v.fromBufferAttribute(P, i).project(camera); if(Math.abs(v.x) > .97 || Math.abs(v.y) > .97) continue;
          const x = r.left + (v.x + 1) / 2 * r.width, y = r.top + (1 - v.y) / 2 * r.height; if(y < 0 || y > innerHeight - 4 || x > r.right - 54 && y < r.top + 210) continue; const h = hitAt(x, y); if(h && h.a === a) return { x, y, c: h.c } } }
      return null },
    view: () => ({ yaw: cam.yaw, dist: cam.dist, fit: fitDist, layer }),
    shot(){ place(); renderer.render(scene, camera); return canvas.toDataURL("image/png") }
  };
}
