/* Winter Arc — version web autonome.
   Remplace les capacités claude.ai (db, assets, downloads) par :
   - un cache local IndexedDB (fonctionne hors ligne, lecture instantanée)
   - une synchronisation Supabase avec un compte anonyme (« compte invisible »)
   Aucune IA dans cette version. */
(function(){
  "use strict";
  const CFG = window.WA_CONFIG || {};
  const clone = x => x == null ? x : JSON.parse(JSON.stringify(x));
  const isObj = x => x && typeof x === "object" && !Array.isArray(x);

  /* ---------- IndexedDB ---------- */
  let dbp = null;
  function idb(){
    if(dbp) return dbp;
    dbp = new Promise((res, rej) => {
      let rq; try{ rq = indexedDB.open("winter-arc-web", 1) }catch(e){ return rej(e) }
      rq.onupgradeneeded = () => { const d = rq.result; ["docs","blobs","queue","meta"].forEach(n => { if(!d.objectStoreNames.contains(n)) d.createObjectStore(n) }) };
      rq.onsuccess = () => res(rq.result);
      rq.onerror = () => rej(rq.error);
    });
    return dbp;
  }
  async function tx(store, mode, fn){
    const d = await idb();
    return new Promise((res, rej) => {
      const t = d.transaction(store, mode), st = t.objectStore(store); let out;
      Promise.resolve(fn(st)).then(v => { out = v });
      t.oncomplete = () => res(out); t.onerror = () => rej(t.error); t.onabort = () => rej(t.error);
    });
  }
  const reqP = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error) });
  async function idbAll(store){
    const d = await idb();
    return new Promise((res, rej) => {
      const out = [], t = d.transaction(store, "readonly"), c = t.objectStore(store).openCursor();
      c.onsuccess = () => { const cur = c.result; if(cur){ out.push([cur.key, cur.value]); cur.continue() } else res(out) };
      c.onerror = () => rej(c.error);
    });
  }
  const idbPut = (store, key, val) => tx(store, "readwrite", st => { st.put(val, key) }).catch(() => {});
  const idbDel = (store, key) => tx(store, "readwrite", st => { st.delete(key) }).catch(() => {});
  const idbGet = (store, key) => tx(store, "readonly", st => reqP(st.get(key))).catch(() => null);

  /* ---------- état ---------- */
  const cache = {};          // cache[coll][id] = {data, ts}
  const subs = {};           // subs[coll] = [cb]
  let ready = false, readyWaiters = [];
  const status = { mode: "local", online: navigator.onLine, user: null, email: null, anonymous: true, lastSync: null, pending: 0, error: "" };
  const listeners = [];
  function notifyStatus(){ listeners.forEach(f => { try{ f(status) }catch(e){} }) }

  function snap(coll, changes){
    const docs = Object.entries(cache[coll] || {}).map(([id, v]) => ({ id, exists: true, data: () => clone(v.data) }));
    if(coll === "kb" && !docs.length && window.WA_KB) Object.entries(window.WA_KB).forEach(([id, v]) => docs.push({ id, exists: true, data: () => clone(v) }));
    return { docs, docChanges: () => changes || [], metadata: { fromCache: false } };
  }
  function emit(coll, changes){ (subs[coll] || []).forEach(cb => { try{ cb(snap(coll, changes)) }catch(e){ console.error(e) } }) }

  /* ---------- Supabase ---------- */
  let sb = null, syncing = false, resync = false, flushTimer = null;
  async function startSupabase(){
    if(!CFG.supabaseUrl || !CFG.supabaseKey || !window.supabase){ status.mode = "local"; notifyStatus(); return }
    sb = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
    status.mode = "cloud";
    try{
      let { data: { session } } = await sb.auth.getSession();
      if(!session){
        const r = await sb.auth.signInAnonymously();
        if(r.error) throw r.error;
        session = r.data.session;
      }
      setUser(session && session.user);
      sb.auth.onAuthStateChange((ev, s) => { const before = status.user; setUser(s && s.user); if(s && s.user && s.user.id !== before) fullSync() });
      await fullSync();
    }catch(e){ status.error = "Synchronisation impossible pour l'instant : " + (e.message || e); notifyStatus() }
  }
  function setUser(u){ status.user = u ? u.id : null; status.email = u && u.email ? u.email : null; status.anonymous = !u || !!u.is_anonymous || !u.email; notifyStatus() }

  /* synchronisation complète : le plus récent gagne, document par document */
  async function fullSync(){
    if(!sb || !status.user) return; if(syncing){ resync = true; return } syncing = true; resync = false;
    try{
      const rows = []; let from = 0;
      for(;;){
        const { data, error } = await sb.from("docs").select("coll,id,data,updated_at").range(from, from + 999);
        if(error) throw error; rows.push(...data); if(data.length < 1000) break; from += 1000;
      }
      const seen = new Set(), touched = new Set();
      for(const r of rows){
        const key = r.coll + "/" + r.id; seen.add(key);
        const loc = (cache[r.coll] || {})[r.id], rts = Date.parse(r.updated_at) || 0;
        if(!loc || rts > (loc.ts || 0)){
          (cache[r.coll] = cache[r.coll] || {})[r.id] = { data: r.data, ts: rts };
          idbPut("docs", key, { data: r.data, ts: rts }); touched.add(r.coll);
        }
      }
      /* documents locaux absents du serveur : on les envoie */
      for(const [coll, docs] of Object.entries(cache)) for(const [id, v] of Object.entries(docs)){
        const key = coll + "/" + id, row = rows.find(r => r.coll === coll && r.id === id);
        if(!seen.has(key) || (row && (v.ts || 0) > (Date.parse(row.updated_at) || 0))) await enqueue({ op: "set", coll, id });
      }
      touched.forEach(c => emit(c));
      status.lastSync = Date.now(); status.error = ""; notifyStatus();
      await flush();
    }catch(e){ status.error = "Synchronisation impossible pour l'instant : " + (e.message || e); notifyStatus() }
    syncing = false;
    if(resync){ resync = false; fullSync() }
  }
  async function enqueue(op){
    const key = op.coll + "/" + op.id;
    await idbPut("queue", key, op);
    status.pending = (await idbAll("queue")).length; notifyStatus();
    clearTimeout(flushTimer); flushTimer = setTimeout(flush, 600);
  }
  let flushing = false;
  async function flush(){
    if(!sb || !status.user || flushing || !navigator.onLine) return; flushing = true;
    try{
      const q = await idbAll("queue");
      for(const [key, op] of q){
        let error = null;
        if(op.op === "del"){ ({ error } = await sb.from("docs").delete().match({ coll: op.coll, id: op.id })) }
        else{
          const v = (cache[op.coll] || {})[op.id]; if(!v){ await idbDel("queue", key); continue }
          ({ error } = await sb.from("docs").upsert({ user_id: status.user, coll: op.coll, id: op.id, data: v.data, updated_at: new Date(v.ts || Date.now()).toISOString() }, { onConflict: "user_id,coll,id" }));
        }
        if(error) throw error;
        await idbDel("queue", key);
      }
      status.lastSync = Date.now(); status.error = "";
    }catch(e){ status.error = "Envoi en attente (" + (e.message || "réseau") + "). Tes données sont gardées sur le téléphone et repartiront toutes seules."; clearTimeout(flushTimer); flushTimer = setTimeout(flush, 30000) }
    status.pending = (await idbAll("queue")).length; flushing = false; notifyStatus();
  }
  window.addEventListener("online", () => { status.online = true; notifyStatus(); fullSync() });
  window.addEventListener("offline", () => { status.online = false; notifyStatus() });
  document.addEventListener("visibilitychange", () => { if(document.visibilityState === "visible") fullSync() });

  /* ---------- API db compatible avec l'appli ---------- */
  function merge(t, p){ for(const [k, v] of Object.entries(p)){ if(isObj(v) && isObj(t[k])) merge(t[k], v); else t[k] = clone(v) } }
  function write(coll, id, data){
    const ts = Date.now();
    (cache[coll] = cache[coll] || {})[id] = { data, ts };
    idbPut("docs", coll + "/" + id, { data, ts });
    setTimeout(() => emit(coll), 0);
    if(coll !== "kb") enqueue({ op: "set", coll, id });
  }
  const db = {
    collection(coll){
      return { onSnapshot(cb, err){
        (subs[coll] = subs[coll] || []).push(cb);
        whenReady().then(() => cb(snap(coll)));
        return () => { subs[coll] = (subs[coll] || []).filter(f => f !== cb) };
      } };
    },
    doc(path){
      const i = path.lastIndexOf("/"), coll = path.slice(0, i), id = path.slice(i + 1);
      return {
        async set(data){ await whenReady(); write(coll, id, clone(data)) },
        async update(patch){
          await whenReady(); const cur = (cache[coll] || {})[id];
          if(!cur){ const e = new Error("document absent"); e.code = "invalid_argument"; throw e }
          const d = clone(cur.data); merge(d, patch); write(coll, id, d);
        },
        async delete(){
          await whenReady(); if(cache[coll]) delete cache[coll][id];
          idbDel("docs", coll + "/" + id);
          setTimeout(() => emit(coll, [{ type: "removed", doc: { id } }]), 0);
          enqueue({ op: "del", coll, id });
        },
        async get(){ await whenReady(); const v = (cache[coll] || {})[id]; return { id, exists: !!v, data: () => clone(v && v.data) } }
      };
    }
  };
  function whenReady(){ return ready ? Promise.resolve() : new Promise(r => readyWaiters.push(r)) }

  /* ---------- fichiers (photos, sauvegardes) : stockés sur le téléphone ---------- */
  const urls = {};
  const rid = () => Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, "0")).join("");
  const assets = {
    async upload(blob){ const id = rid(); await idbPut("blobs", id, blob); urls[id] = URL.createObjectURL(blob); return { id, url: urls[id], sizeBytes: blob.size || 0, contentType: blob.type || "" } },
    async delete(id){ await idbDel("blobs", id); if(urls[id]){ URL.revokeObjectURL(urls[id]); delete urls[id] } },
    async list(){ const all = await idbAll("blobs"); return { assets: all.map(([id, b]) => ({ id, sizeBytes: b.size || 0 })), usage: {} } }
  };
  /* adresse d'un fichier : URL locale ; si elle n'est pas encore prête, on la charge puis on réaffiche */
  const loadingBlob = {};
  window.blobSrc = function(id){
    if(!id) return "";
    if(urls[id]) return urls[id];
    if(!loadingBlob[id]){ loadingBlob[id] = idbGet("blobs", id).then(b => { if(b){ urls[id] = URL.createObjectURL(b); if(window.WA_rerender) window.WA_rerender() } }) }
    return "data:image/gif;base64,R0lGODlhAQABAAAAACw=";
  };

  /* ---------- téléchargements ---------- */
  const downloads = {
    async save({ filename, data }){
      const blob = data instanceof Blob ? data : new Blob([data], { type: /\.csv$/i.test(filename) ? "text/csv" : "application/json" });
      const file = new File([blob], filename, { type: blob.type });
      if(navigator.canShare && navigator.canShare({ files: [file] })){ try{ await navigator.share({ files: [file], title: filename }); return "saved" }catch(e){ if(e && e.name === "AbortError") throw { code: "declined" } } }
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; document.body.appendChild(a); a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 2000); return "saved";
    }
  };

  /* ---------- point d'entrée attendu par l'appli ---------- */
  window.claude = { use: async name => name === "db" ? db : name === "assets" ? assets : name === "downloads" ? downloads : null };

  /* ---------- compte : sécuriser avec un e-mail, retrouver ses données ---------- */
  window.WA_WEB = {
    status, onStatus(f){ listeners.push(f) },
    async linkEmail(email){
      if(!sb) throw new Error("La sauvegarde en ligne n'est pas encore activée.");
      const { error } = await sb.auth.updateUser({ email }, { emailRedirectTo: location.origin + location.pathname });
      if(error) throw error;
    },
    async loginEmail(email){
      if(!sb) throw new Error("La sauvegarde en ligne n'est pas encore activée.");
      const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: false, emailRedirectTo: location.origin + location.pathname } });
      if(error) throw error;
    },
    sync: () => fullSync()
  };

  /* ---------- démarrage : cache local d'abord, serveur ensuite ---------- */
  (async () => {
    try{
      const all = await idbAll("docs");
      all.forEach(([key, v]) => { const i = key.lastIndexOf("/"), coll = key.slice(0, i), id = key.slice(i + 1); (cache[coll] = cache[coll] || {})[id] = v });
      status.pending = (await idbAll("queue")).length;
    }catch(e){ status.error = "Stockage local indisponible (navigation privée ?) : tes données ne seront pas gardées." }
    ready = true; readyWaiters.forEach(r => r()); readyWaiters = [];
    try{ if(navigator.storage && navigator.storage.persist) await navigator.storage.persist() }catch(e){}
    startSupabase();
  })();

  if("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
})();
