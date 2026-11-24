import re, json, shutil, os, glob, hashlib
from PIL import Image
ROOT="/home/claude"; OUT=ROOT+"/web/dist"
shutil.rmtree(OUT,ignore_errors=True); os.makedirs(OUT)
page=open(ROOT+"/winter-arc.html").read()
def rep(a,b,c=1):
    global page
    assert page.count(a)==c,(a[:80],page.count(a)); page=page.replace(a,b)
# modules web dans le périmètre de l'appli
rep("/* ---------- render & events ---------- */", open(ROOT+"/web/src/m9_web.js").read()+"\n/* ---------- render & events ---------- */")
# fichiers locaux
page=re.sub(r'/_blob/\$\{([^}]+)\}', r'${blobSrc(\1)}', page)
page=re.sub(r'"/_blob/"\+([\w.]+)', r'blobSrc(\1)', page)
assert "/_blob/" not in page
rep('||"Quentin" }','||"Mon profil" }')
# pas de coach IA dans la version web
rep("</style>",".tab[data-tab=coach]{display:none}\nnav.tabs .in{grid-template-columns:repeat(5,minmax(0,1fr))!important}\n</style>")
head='''<!doctype html><html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#1F5F7A"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default"><meta name="apple-mobile-web-app-title" content="Winter Arc">
<link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" href="icons/app-180.png"><link rel="icon" href="icons/app-192.png">
<script src="config.js"></script><script src="vendor/supabase-2.118.0.js"></script><script src="kb.js"></script><script src="runtime.js"></script>
</head><body>'''
open(OUT+"/index.html","w").write(head+page+"</body></html>")
shutil.copy(ROOT+"/web/src/runtime.js",OUT+"/runtime.js")
cfg=json.load(open(ROOT+"/web/config.json")) if os.path.exists(ROOT+"/web/config.json") else {"supabaseUrl":"","supabaseKey":""}
open(OUT+"/config.js","w").write("window.WA_CONFIG="+json.dumps(cfg)+";\n")
kb=json.load(open(ROOT+"/kb/kb.json")); kb=kb if isinstance(kb,dict) else {f["id"]:f for f in kb}
open(OUT+"/kb.js","w").write("window.WA_KB="+json.dumps(kb,ensure_ascii=False)+";\n")
for d in ["vendor","data","lib","icons"]: os.makedirs(OUT+"/"+d,exist_ok=True)
shutil.copy(ROOT+"/web/vendor/supabase-2.118.0.js",OUT+"/vendor/"); shutil.copy(ROOT+"/web/vendor/supabase-LICENSE.txt",OUT+"/vendor/")
shutil.copy(ROOT+"/data/ciqual-2025.json",OUT+"/data/"); shutil.copy(ROOT+"/lib/zxing-0.21.3.min.js",OUT+"/lib/")
for f in glob.glob(ROOT+"/icons/*.webp"): shutil.copy(f,OUT+"/icons/")
# icône d'appli
src=Image.open(ROOT+"/icons/i-muscle.webp").convert("RGBA")
for n in (180,192,512):
    bg=Image.new("RGBA",(n,n),(31,95,122,255)); pad=int(n*0.16); ic=src.resize((n-2*pad,n-2*pad),Image.LANCZOS)
    wht=Image.new("RGBA",ic.size,(255,255,255,255)); wht.putalpha(ic.split()[3]); bg.alpha_composite(wht,(pad,pad)); bg.convert("RGB").save(OUT+f"/icons/app-{n}.png")
json.dump({"name":"Winter Arc","short_name":"Winter Arc","start_url":"./","scope":"./","display":"standalone","background_color":"#F4F7F8","theme_color":"#1F5F7A","lang":"fr",
  "icons":[{"src":"icons/app-192.png","sizes":"192x192","type":"image/png"},{"src":"icons/app-512.png","sizes":"512x512","type":"image/png","purpose":"any maskable"}]},open(OUT+"/manifest.webmanifest","w"),ensure_ascii=False)
files=sorted(os.path.relpath(p,OUT) for p in glob.glob(OUT+"/**/*",recursive=True) if os.path.isfile(p))
h=hashlib.sha1()
for f in files:
    if f.endswith((".html",".js",".json")): h.update(open(OUT+"/"+f,"rb").read())
ver=h.hexdigest()[:10]
pre=["./","index.html","runtime.js","config.js","kb.js","vendor/supabase-2.118.0.js","manifest.webmanifest","lib/zxing-0.21.3.min.js","data/ciqual-2025.json"]+[f for f in files if f.startswith("icons/")]
open(OUT+"/sw.js","w").write(f'''const V="wa-{ver}", PRE={json.dumps(pre)};
self.addEventListener("install",e=>{{e.waitUntil(caches.open(V).then(c=>c.addAll(PRE)).then(()=>self.skipWaiting()))}});
self.addEventListener("activate",e=>{{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))}});
self.addEventListener("fetch",e=>{{const u=new URL(e.request.url); if(e.request.method!=="GET"||u.origin!==location.origin) return;
  const html=e.request.mode==="navigate"||/\\.(html|js)$/.test(u.pathname)&&!u.pathname.includes("/vendor/")&&!u.pathname.includes("/lib/");
  if(html){{ e.respondWith(fetch(e.request).then(r=>{{const c=r.clone(); caches.open(V).then(ca=>ca.put(e.request,c)); return r}}).catch(()=>caches.match(e.request).then(r=>r||caches.match("index.html")))); return }}
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{{const c=res.clone(); caches.open(V).then(ca=>ca.put(e.request,c)); return res}})));}});
''')
open(OUT+"/.nojekyll","w").write("")
shutil.copy(ROOT+"/web/supabase.sql",OUT+"/supabase.sql") if os.path.exists(ROOT+"/web/supabase.sql") else None
print("build", ver, len(files), "files", os.path.getsize(OUT+"/index.html"))
