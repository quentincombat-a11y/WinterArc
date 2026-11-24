/* =====================  ATLAS MUSCULAIRE INTERACTIF  ===================== */
const ATLAS=/*ATLAS_CAT*/null;
const ATM={}; ATLAS.muscles.forEach(m=>ATM[m.id]=m);
const ATLVL={1:"Principal",0.5:"Secondaire",0.25:"Stabilisateur"};
/* ---- correspondance exercices -> muscles (estimations configurables) ----
   1 = muscle principal (séries directes), 0,5 = secondaire, 0,25 = stabilisateur. */
function atParse(s){ return s.trim().split(/\s+/).map(t=>{ const [m,v]=t.split(":"); return [m,+v] }) }
const AT_PAT={
  push_h:"pec_stern:1 pec_clav:.5 pec_abd:.5 delt_ant:.5 tri_lat:.5 tri_med:.5 tri_long:.25 serratus:.25",
  push_inc:"pec_clav:1 pec_stern:.5 delt_ant:.5 tri_lat:.5 tri_med:.5 tri_long:.25 serratus:.25",
  fly:"pec_stern:1 pec_clav:.5 pec_abd:.5 delt_ant:.25 bic_short:.25",
  tri:"tri_long:1 tri_lat:1 tri_med:1",
  bi:"bic_long:1 bic_short:1 brachialis:.5 brachiorad:.25 fa_flex:.25",
  bi_n:"brachiorad:1 brachialis:1 bic_long:.5 bic_short:.25 fa_flex:.25",
  pull_v:"lats:1 teres_maj:1 trap_inf:.5 rhomb:.5 bic_long:.5 bic_short:.5 brachialis:.5 brachiorad:.5 delt_post:.25 fa_flex:.25 pec_abd:.25",
  pull_h:"lats:1 trap_mid:1 rhomb:1 delt_post:.5 teres_maj:.5 trap_inf:.5 bic_long:.5 bic_short:.5 brachialis:.5 brachiorad:.5 infra:.25 erect:.25 fa_flex:.25",
  press_sh:"delt_ant:1 delt_lat:.5 tri_lat:.5 tri_med:.5 tri_long:.25 trap_sup:.5 serratus:.5 pec_clav:.25",
  lat:"delt_lat:1 supra:.5 trap_sup:.5 delt_ant:.25 serratus:.25",
  rear:"delt_post:1 infra:.5 teres_min:.5 trap_mid:.5 rhomb:.5",
  quad:"vl:1 vm:1 vi:1 rf:.5 glute_max:.5 add:.5 erect:.25 soleus:.25",
  lunge:"vl:1 vm:1 vi:1 glute_max:1 rf:.5 glute_med:.5 add:.5 bf:.25 st:.25 sm:.25",
  ext:"rf:1 vl:1 vm:1 vi:1",
  curl_leg:"bf:1 st:1 sm:1 gast_med:.5 gast_lat:.5 sartorius:.25",
  hinge:"bf:1 st:1 sm:1 glute_max:1 erect:.5 add:.5 trap_sup:.25 fa_flex:.25 lats:.25",
  calf:"gast_med:1 gast_lat:1 soleus:.5",
  core:"rectus:1 transv:1 ext_obl:.5 int_obl:.5 serratus:.25",
  core_lat:"ext_obl:1 int_obl:1 transv:.5 glute_med:.5 rectus:.25"
};
const AT_EX={
  "dips-pecs":"pec_stern:1 pec_abd:1 pec_clav:.25 pec_min:.5 delt_ant:.5 tri_lat:.5 tri_med:.5 tri_long:.5",
  "pompes":"pec_stern:1 pec_clav:.5 pec_abd:.5 delt_ant:.5 tri_lat:.5 tri_med:.5 tri_long:.25 serratus:.5 rectus:.25 transv:.25",
  "pompes-lestees":"pec_stern:1 pec_clav:.5 pec_abd:.5 delt_ant:.5 tri_lat:.5 tri_med:.5 tri_long:.25 serratus:.5 rectus:.25 transv:.25",
  "pompes-declinees":"pec_clav:1 pec_stern:.5 delt_ant:.5 tri_lat:.5 tri_med:.5 serratus:.5 rectus:.25",
  "crossover":"pec_stern:1 pec_abd:1 pec_clav:.25 delt_ant:.25",
  "ecarte-bas":"pec_clav:1 pec_stern:.5 delt_ant:.5",
  "triceps":"tri_long:1 tri_lat:1 tri_med:1 pec_stern:.5 pec_abd:.5 delt_ant:.5",
  "dips-machine":"tri_long:1 tri_lat:1 tri_med:1 pec_stern:.5 pec_abd:.5 delt_ant:.5",
  "dips-banc":"tri_lat:1 tri_med:1 tri_long:.5 delt_ant:.5 pec_stern:.25",
  "triceps-poulie":"tri_lat:1 tri_med:1 tri_long:.5",
  "extension-nuque":"tri_long:1 tri_med:1 tri_lat:.5",
  "extension-corde-nuque":"tri_long:1 tri_med:1 tri_lat:.5",
  "kickback":"tri_lat:1 tri_med:1 tri_long:.5 delt_post:.25",
  "pompes-diamant":"tri_lat:1 tri_med:1 tri_long:.5 pec_stern:.5 delt_ant:.5 rectus:.25",
  "dc-serre":"tri_lat:1 tri_med:1 tri_long:.5 pec_stern:.5 pec_clav:.5 delt_ant:.5",
  "curl-incline":"bic_long:1 bic_short:.5 brachialis:.5 brachiorad:.25",
  "curl-pupitre":"bic_short:1 bic_long:.5 brachialis:.5 brachiorad:.25",
  "curl-concentre":"bic_short:1 bic_long:.5 brachialis:.5",
  "curl-inverse":"brachiorad:1 brachialis:1 fa_ext:.5 bic_long:.25 bic_short:.25",
  "chin-up":"lats:1 teres_maj:1 bic_long:1 bic_short:1 brachialis:.5 trap_inf:.5 rhomb:.5 pec_abd:.25 fa_flex:.25",
  "tractions":"lats:1 teres_maj:1 trap_inf:.5 rhomb:.5 bic_long:.5 bic_short:.5 brachialis:.5 brachiorad:.5 delt_post:.25 fa_flex:.5 pec_abd:.25 rectus:.25",
  "tractions-dos":"lats:1 teres_maj:1 trap_inf:.5 rhomb:.5 bic_long:.5 bic_short:.5 brachialis:.5 brachiorad:.5 delt_post:.25 fa_flex:.5 pec_abd:.25 rectus:.25",
  "tractions-negatives":"lats:1 teres_maj:1 trap_inf:.5 rhomb:.5 bic_long:.5 bic_short:.5 brachialis:.5 brachiorad:.5 fa_flex:.5",
  "pull-over":"lats:1 teres_maj:1 pec_stern:.5 tri_long:.5 pec_abd:.25 serratus:.25",
  "rowing-barre":"lats:1 trap_mid:1 rhomb:1 delt_post:.5 teres_maj:.5 trap_inf:.5 bic_long:.5 bic_short:.5 brachialis:.5 brachiorad:.5 erect:.5 bf:.25 st:.25 sm:.25 glute_max:.25 fa_flex:.25",
  "rowing-tbar":"lats:1 trap_mid:1 rhomb:1 delt_post:.5 teres_maj:.5 bic_long:.5 bic_short:.5 brachialis:.5 erect:.5 fa_flex:.25",
  "rows-aus":"lats:1 trap_mid:1 rhomb:1 delt_post:.5 teres_maj:.5 bic_long:.5 bic_short:.5 brachialis:.5 rectus:.25 glute_max:.25",
  "dev-militaire":"delt_ant:1 delt_lat:.5 tri_lat:.5 tri_med:.5 tri_long:.25 trap_sup:.5 serratus:.5 pec_clav:.25 erect:.25 rectus:.25",
  "pompes-pike":"delt_ant:1 delt_lat:.5 tri_lat:.5 tri_med:.5 trap_sup:.5 serratus:.5 pec_clav:.5",
  "face-pull":"delt_post:1 infra:1 teres_min:1 trap_mid:.5 rhomb:.5 trap_sup:.25",
  "squat-barre":"vl:1 vm:1 vi:1 glute_max:1 rf:.5 add:.5 erect:.5 bf:.25 st:.25 sm:.25 soleus:.25 rectus:.25",
  "squat-smith":"vl:1 vm:1 vi:1 rf:.5 glute_max:.5 add:.5 erect:.25",
  "squat-goblet":"vl:1 vm:1 vi:1 rf:.5 glute_max:.5 add:.5 rectus:.25 erect:.25",
  "air-squat":"vl:1 vm:1 vi:1 rf:.5 glute_max:.5 add:.25",
  "presse":"vl:1 vm:1 vi:1 rf:.5 glute_max:.5 add:.5",
  "step-up":"vl:1 vm:1 vi:1 glute_max:1 glute_med:.5 rf:.5 add:.25 soleus:.25",
  "sissy":"rf:1 vl:1 vm:1 vi:1 rectus:.25",
  "nordic":"bf:1 st:1 sm:1 gast_med:.5 gast_lat:.5 glute_max:.25",
  "leg-curl-assis":"bf:1 st:1 sm:1 gast_med:.25 gast_lat:.25",
  "hip-thrust":"glute_max:1 glute_med:.5 bf:.5 st:.5 sm:.5 add:.25 vl:.25 vm:.25",
  "good-morning":"bf:1 st:1 sm:1 erect:1 glute_max:.5 add:.5",
  "mollets-assis":"soleus:1 gast_med:.25 gast_lat:.25",
  "hollow":"rectus:1 transv:1 ext_obl:.5 int_obl:.5 iliopsoas:.5 rf:.25",
  "ab-wheel":"rectus:1 transv:.5 ext_obl:.5 int_obl:.5 lats:.5 serratus:.5 tri_long:.25",
  "releve-jambes":"rectus:1 iliopsoas:1 ext_obl:.5 int_obl:.5 rf:.5 fa_flex:.5 lats:.25",
  "crunch-poulie":"rectus:1 ext_obl:.5 int_obl:.5",
  "dead-bug":"transv:1 rectus:.5 ext_obl:.5 int_obl:.5 iliopsoas:.25",
  "pallof":"ext_obl:1 int_obl:1 transv:1 rectus:.25",
  "farmer-uni":"ext_obl:1 int_obl:1 fa_flex:1 trap_sup:.5 glute_med:.5 erect:.25"
};
/* séances cardio et sports : sollicitation sans séries (indicative) */
const AT_ACT={
  run:"soleus:1 gast_med:.5 gast_lat:.5 rf:.5 vl:.5 vm:.5 vi:.5 bf:.5 st:.5 sm:.5 glute_max:.5 iliopsoas:.5 tib_ant:.5 glute_med:.25",
  walk:"soleus:.5 gast_med:.25 gast_lat:.25 tib_ant:.25 glute_max:.25 vl:.25 vm:.25",
  bike:"vl:1 vm:1 vi:1 rf:1 glute_max:.5 soleus:.5 gast_med:.25 gast_lat:.25 bf:.25",
  hometrainer:"vl:1 vm:1 vi:1 rf:1 glute_max:.5 soleus:.5 gast_med:.25 gast_lat:.25 bf:.25",
  rameur:"lats:1 trap_mid:.5 rhomb:.5 delt_post:.5 bic_long:.5 bic_short:.5 brachialis:.5 vl:.5 vm:.5 vi:.5 glute_max:.5 erect:.5 fa_flex:.25",
  natation:"lats:1 delt_ant:.5 delt_lat:.5 delt_post:.5 tri_long:.5 pec_stern:.5 teres_maj:.5 rectus:.25",
  elliptique:"vl:.5 vm:.5 vi:.5 glute_max:.5 rf:.25 soleus:.25",
  corde:"gast_med:1 gast_lat:1 soleus:1 delt_ant:.25 fa_flex:.25",
  hiit:"vl:.5 vm:.5 vi:.5 glute_max:.5 rectus:.5 gast_med:.25 gast_lat:.25",
  padel:"delt_ant:.5 delt_lat:.5 ext_obl:.5 int_obl:.5 vl:.5 vm:.5 gast_med:.5 gast_lat:.5 soleus:.5 fa_flex:.5 fa_ext:.5 infra:.25 glute_med:.25",
  tennis:"delt_ant:.5 delt_lat:.5 ext_obl:.5 int_obl:.5 vl:.5 vm:.5 gast_med:.5 gast_lat:.5 soleus:.5 fa_flex:.5 fa_ext:.5 infra:.25 glute_med:.25",
  badminton:"delt_ant:.5 delt_lat:.5 ext_obl:.25 vl:.25 gast_med:.5 gast_lat:.5 soleus:.5 fa_ext:.5",
  squash:"delt_ant:.5 ext_obl:.5 int_obl:.5 vl:.5 vm:.5 gast_med:.5 gast_lat:.5 soleus:.5 fa_flex:.5 fa_ext:.5",
  foot:"rf:1 vl:.5 vm:.5 vi:.5 bf:.5 st:.5 sm:.5 add:.5 gast_med:.5 gast_lat:.5 soleus:.5 glute_max:.5 iliopsoas:.5",
  futsal:"rf:.5 vl:.5 vm:.5 vi:.5 bf:.5 st:.5 add:.5 gast_med:.5 gast_lat:.5 soleus:.5 glute_max:.25",
  basket:"gast_med:1 gast_lat:1 soleus:.5 vl:.5 vm:.5 glute_max:.5 delt_ant:.25",
  boxe:"delt_ant:1 delt_lat:.5 serratus:.5 ext_obl:.5 int_obl:.5 tri_lat:.25 gast_med:.25 gast_lat:.25",
  combat:"delt_ant:.5 ext_obl:.5 rectus:.5 vl:.5 glute_max:.5 fa_flex:.5",
  escalade:"lats:1 fa_flex:1 brachialis:1 bic_long:.5 bic_short:.5 brachiorad:.5 teres_maj:.5 trap_inf:.5 rectus:.25",
  ski:"vl:1 vm:1 vi:1 rf:.5 glute_max:.5 add:.5 tib_ant:.25",
  rando:"vl:.5 vm:.5 glute_max:.5 soleus:.5 gast_med:.5 gast_lat:.5 tib_ant:.25"
};
const AT_GROUP={Pecs:["pec_stern","pec_clav","pec_abd"],Dos:["lats","trap_mid","rhomb","teres_maj"],"Épaules":["delt_ant","delt_lat","delt_post"],Biceps:["bic_long","bic_short","brachialis"],
  Triceps:["tri_long","tri_lat","tri_med"],Quadriceps:["rf","vl","vm","vi"],Ischios:["bf","st","sm"],Fessiers:["glute_max","glute_med"],Mollets:["gast_med","gast_lat","soleus"],Abdos:["rectus","ext_obl","int_obl","transv"]};
const _atCache={};
function atDefault(id){
  if(_atCache[id]) return _atCache[id];
  let src="", list=null;
  if(AT_EX[id]){ list=atParse(AT_EX[id]); src="exercice" }
  else if(LIB[id]&&AT_PAT[LIB[id].pat]){ list=atParse(AT_PAT[LIB[id].pat]); src="mouvement" }
  else { const m=musclesOf(id); if(m.length){ list=[]; m.forEach(([g,w])=>(AT_GROUP[g]||[]).forEach(a=>list.push([a,w>=1?1:.5]))); src="générique" } }
  return _atCache[id]={list:list||[],src:list?src:"aucune"};
}
/* coefficients effectifs : réglage personnel > table par exercice > table par mouvement > groupe */
function atCoef(id){
  const ov=((state.settings||{}).atlasCoef||{})[id];
  if(ov&&typeof ov==="object"){ const list=Object.entries(ov).filter(([m,v])=>ATM[m]&&+v>0).map(([m,v])=>[m,+v]); return {list,src:"perso"} }
  return atDefault(id);
}
function atAct(a){ const g=a.cat==="cardio"?cdef(a).g:""; const s=AT_ACT[a.t]||AT_ACT[g];
  if(s) return atParse(s);
  const m=actMuscles(a), out=[]; m.forEach(([g2,w])=>(AT_GROUP[g2]||[]).forEach(x=>out.push([x,w>=1?.5:.25]))); return out }

/* ---- journal détaillé de toutes les sollicitations ---- */
function atEntries(){
  const out=[], t=todayKey();
  Object.keys(state.sessions).sort().forEach(k=>{ if(k>t) return; const s=state.sessions[k]; if(!s) return;
    if(s.ex) Object.entries(s.ex).forEach(([slot,e])=>{ if(!e||e.skip) return; const id=e.alt||slot, n=doneSets(e).length; if(!n) return;
      const name=exInfo(id,e).n; atCoef(id).list.forEach(([m,l])=>out.push({k,m,l,sets:n,src:"muscu",ex:id,n:name})) });
    const cfg=s.type&&typeof wodCfg==="function"?wodCfg(s.type):null;
    if(cfg&&s.wod&&s.wod.final){ const st=wodStats(s.wod,cfg); st.moves.forEach(mv=>{ if(!mv.reps) return; const eq=Math.max(.5,Math.round(mv.reps/10*2)/2);
      atCoef(mv.id).list.forEach(([m,l])=>out.push({k,m,l,sets:eq,src:"circuit",ex:mv.id,n:mv.n+" ("+mv.reps+" rép.)"})) }) }
    (s.acts||[]).filter(a=>a&&a.done).forEach(a=>{ const min=Math.round((a.dur||0)/60); atAct(a).forEach(([m,l])=>out.push({k,m,l,sets:0,min,src:a.cat||"cardio",n:cname(a)})) });
  });
  return out;
}
const atl={view:"front",layer:0,mode:"recence",range:"7",filter:"",q:"",sel:"",full:false,edit:"",engine:null,status:"idle",err:"",hover:null,coefOpen:false};
function atRange(entries){
  const t=todayKey();
  if(atl.range==="last"){ const ks=entries.filter(e=>e.src!=="muscu"||e.sets>0).map(e=>e.k); const last=ks.length?ks.reduce((a,b)=>a>b?a:b):t; return {from:last,to:last,days:1,label:"dernier entraînement"+(ks.length?" ("+fmtShort.format(parseKey(last))+")":"")} }
  if(atl.range==="all"){ const ks=entries.map(e=>e.k); const first=ks.length?ks.reduce((a,b)=>a<b?a:b):t; return {from:first,to:t,days:diffDays(first,t)+1,label:"historique complet"} }
  const n=+atl.range||7; return {from:addDays(t,-(n-1)),to:t,days:n,label:n+" derniers jours"};
}
function atStats(entries,from,to){
  const S={}; ATLAS.muscles.forEach(m=>S[m.id]={direct:0,indirect:0,vol:0,last:null,lastAny:null,sess:new Set(),items:[],act:0,dayW:{}});
  entries.forEach(e=>{ if(e.k<from||e.k>to) return; const s=S[e.m]; if(!s) return;
    s.items.push(e); s.sess.add(e.k); if(!s.lastAny||e.k>s.lastAny) s.lastAny=e.k;
    if(e.sets>0){ if(e.l>=1) s.direct+=e.sets; else s.indirect+=e.sets; s.vol+=e.sets*e.l; if(e.l>=.5) s.dayW[e.k]=(s.dayW[e.k]||0)+e.sets*e.l }
    else { s.act++; if(e.l>=.5) s.dayW[e.k]=Math.max(s.dayW[e.k]||0,1) } });
  Object.values(S).forEach(s=>{ Object.entries(s.dayW).forEach(([k,w])=>{ if(w>=1&&(!s.last||k>s.last)) s.last=k }) });
  return S;
}
const AT_REC=[{max:1,c:"#E0524F",l:"Aujourd'hui ou hier"},{max:3,c:"#EE9A3E",l:"Il y a 2 à 3 jours"},{max:6,c:"#4FB06F",l:"Il y a 4 à 6 jours"},{max:13,c:"#5B9BD5",l:"Il y a 1 à 2 semaines"},{max:1e9,c:"#7D8790",l:"Plus de 2 semaines ou jamais"}];
const AT_VOL=[{min:0,c:"#56616b",l:"0"},{min:.01,c:"#2d6e8c",l:"moins de 3"},{min:3,c:"#3a95b8",l:"3 à 6"},{min:6,c:"#5cc0d9",l:"6 à 10"},{min:10,c:"#a6e3f0",l:"10 à 15"},{min:15,c:"#f2d26b",l:"15 et plus"}];
function atRecOf(s){ if(!s||!s.last) return AT_REC[4]; const d=diffDays(s.last,todayKey()); return AT_REC.find(h=>d<=h.max) }
function atVolOf(s,days){ const v=s?s.vol/Math.max(1,days/7):0; let r=AT_VOL[0]; AT_VOL.forEach(x=>{ if(v>=x.min) r=x }); return r }
function atColors(S,R){
  const map={}; ATLAS.muscles.forEach(m=>{ map[m.id]=atl.mode==="volume"?atVolOf(S[m.id],R.days).c:atRecOf(S[m.id]).c }); return map;
}
function atFilterSet(S){
  const ids=ATLAS.muscles.map(m=>m.id), f=atl.filter;
  if(f==="direct") return new Set(ids.filter(i=>S[i].direct>0));
  if(f==="indirect") return new Set(ids.filter(i=>S[i].indirect>0||S[i].act>0));
  if(f==="none") return new Set(ids.filter(i=>!S[i].items.length));
  if(f==="top"){ const top=ids.filter(i=>S[i].vol>0).sort((a,b)=>S[b].vol-S[a].vol).slice(0,8); return new Set(top) }
  return null;
}
function atSearch(q){ q=norm(q.trim()); if(!q) return [];
  return ATLAS.muscles.filter(m=>norm(m.fr+" "+m.la+" "+m.parts.map(p=>p[1]).join(" ")+" "+m.g).includes(q)).slice(0,10) }
function atDays(k){ const d=diffDays(k,todayKey()); return d===0?"aujourd'hui":d===1?"hier":"il y a "+d+" j" }
function atFmtN(x){ return fmt(x,x%1?1:0) }

/* ---- carte ---- */
function atlasCardHTML(){
  const E=atEntries(), R=atRange(E), S=atStats(E,R.from,R.to), FS=atFilterSet(S);
  atl._colors=atColors(S,R); atl._dims=FS; atl._S=S;
  const chip=(k,v,l,on)=>`<button class="chip ${on?"on":""}" data-at${k}="${v}">${l}</button>`;
  const leg=atl.mode==="volume"?AT_VOL.map(h=>`<span><i style="background:${h.c}"></i>${h.l}</span>`).join("")+`<span class="meta">séries pondérées${R.days>7?" par semaine":""}</span>`
    :AT_REC.map(h=>`<span><i style="background:${h.c}"></i>${h.l}</span>`).join("");
  const res=atSearch(atl.q);
  const nTouched=ATLAS.muscles.filter(m=>S[m.id].items.length).length;
  const fsCount=FS?FS.size:null;
  const regions=ATLAS.regions.map(([r,l])=>{ const ms=ATLAS.muscles.filter(m=>m.r===r);
    return `<div class="atreg"><span class="lbl">${l}</span>${ms.map(m=>{ const s=S[m.id], c=atl._colors[m.id], dim=FS&&!FS.has(m.id);
      return `<button class="atrow${dim?" dim":""}${atl.sel===m.id?" on":""}" data-atsel="${m.id}"><i style="background:${c}"></i><span>${esc(m.fr)}</span><span class="meta">${s.direct?atFmtN(s.direct)+" dir.":""}${s.direct&&s.indirect?" · ":""}${s.indirect?atFmtN(s.indirect)+" ind.":""}${!s.direct&&!s.indirect&&s.act?"cardio/sport":""}${!s.items.length?"–":""}</span></button>` }).join("")}</div>` }).join("");
  return `<section class="card atcard${atl.full?" full":""}" id="atcard">
    <h2 class="ttl" style="margin:0"><img class="ico" src="icons/i-muscle.webp" alt="">Atlas musculaire</h2>
    <div class="atseg" role="group" aria-label="Vue">${[["front","Face"],["back","Dos"],["left","Profil G"],["right","Profil D"]].map(([v,l])=>`<button class="${atl.view===v?"on":""}" data-atview="${v}">${l}</button>`).join("")}</div>
    <div class="atseg" role="group" aria-label="Profondeur">${[["0","Superficiel"],["1","Intermédiaire"],["2","Profond"]].map(([v,l])=>`<button class="${String(atl.layer)===v?"on":""}" data-atlayer="${v}">${l}</button>`).join("")}</div>
    ${atStageHTML()}
    <div class="atleg">${leg}</div>
    <div class="chips">${chip("range","last","Dernier entraînement",atl.range==="last")}${chip("range","7","7 j",atl.range==="7")}${chip("range","14","14 j",atl.range==="14")}${chip("range","30","30 j",atl.range==="30")}${chip("range","all","Tout",atl.range==="all")}</div>
    <div class="chips">${chip("mode","recence","Dernière sollicitation",atl.mode==="recence")}${chip("mode","volume","Volume de travail",atl.mode==="volume")}</div>
    <div class="chips">${chip("filter","","Tous",!atl.filter)}${chip("filter","direct","Directement",atl.filter==="direct")}${chip("filter","indirect","Indirectement",atl.filter==="indirect")}${chip("filter","none","Non travaillés",atl.filter==="none")}${chip("filter","top","Les plus sollicités",atl.filter==="top")}</div>
    <div class="atsearch"><input type="search" id="at-q" placeholder="Rechercher un muscle : deltoïde, ischio…" value="${esc(atl.q)}" autocomplete="off" aria-label="Rechercher un muscle">
      ${res.length?`<div class="atres">${res.map(m=>`<button class="actopt" data-atsel="${m.id}" data-atfocus="1"><span>${esc(m.fr)}</span><span class="meta">${esc(m.g)}</span></button>`).join("")}</div>`:atl.q.trim()?`<span class="meta">Aucun muscle trouvé.</span>`:""}</div>
    <span class="meta">Période : ${esc(R.label)} · ${nTouched} muscle${nTouched>1?"s":""} sollicité${nTouched>1?"s":""} sur ${ATLAS.muscles.length}${fsCount!=null?" · filtre : "+fsCount+" muscle"+(fsCount>1?"s":""):""}.</span>
    <details class="atlist"${atl.listOpen?" open":""}><summary data-atlist="1">Liste des ${ATLAS.muscles.length} muscles</summary>${regions}</details>
    <details class="atlist"${atl.coefOpen?" open":""}><summary data-atcoefs="1">Exercices et coefficients musculaires</summary>${atl.coefOpen?atCoefListHTML():""}</details>
    <span class="meta">Les couleurs indiquent depuis quand chaque muscle a été sollicité (au moins une série directe, ou deux séries où il est secondaire le même jour — les rôles de stabilisateur ne colorent pas —, ou une séance de cardio ou de sport qui le sollicite nettement). Ce n'est pas une mesure de ta récupération réelle. Les coefficients muscle par exercice sont des estimations, modifiables. Modèle 3D : BodyParts3D © DBCLS (CC BY-SA 2.1 JP), via le projet « Anatomía en capas » (CC BY-SA 4.0), maillages simplifiés et regroupés pour Winter Arc.</span>
  </section>${atl.sel?atSheetHTML(S,E):""}`;
}
function atStageHTML(mode){
  return `<div class="atstage" id="atlas-host" data-mode="${mode||"map"}">
    <div class="atmsg" id="at-msg">${atl.status==="error"?esc(atl.err):atl.status==="ready"?"":"Chargement du modèle anatomique…"}</div>
    <div class="attip" id="at-tip" hidden></div>
    <div class="atzoom">${mode==="pick"?"":`<button data-atfull="1" aria-label="${atl.full?"Quitter le plein écran":"Plein écran"}">${atl.full?"✕":"⤢"}</button>`}<button data-atzoom="in" aria-label="Zoomer">+</button><button data-atzoom="out" aria-label="Dézoomer">−</button><button data-atzoom="reset" aria-label="Recadrer">⟲</button></div>
    <span class="athint">${matchMedia("(hover: hover)").matches?"Glisse pour tourner · molette pour zoomer · clic droit pour déplacer":"Glisse pour tourner · pince pour zoomer · touche un muscle"}</span></div>`;
}

/* ---- fiche d'un muscle ---- */
function atExercisesFor(mid){
  const ids=new Set(Object.keys(LIB)); Object.keys(ALL_EX).forEach(i=>ids.add(i));
  const done={}; atEntries().forEach(e=>{ if(e.ex&&e.m===mid) done[e.ex]=(done[e.ex]||0)+1 });
  const out={1:[],0.5:[],0.25:[]};
  ids.forEach(id=>{ const c=atCoef(id).list.find(([m])=>m===mid); if(c&&out[c[1]]) out[c[1]].push({id,n:exInfo(id).n,done:done[id]||0}) });
  Object.values(out).forEach(a=>a.sort((x,y)=>y.done-x.done||x.n.localeCompare(y.n,"fr")));
  return out;
}
function atWeeks(E,mid){
  const t=todayKey(), w=[];
  for(let i=9;i>=0;i--){ const to=addDays(t,-i*7), from=addDays(to,-6); let d=0,ind=0,act=0;
    E.forEach(e=>{ if(e.m!==mid||e.k<from||e.k>to) return; if(e.sets>0){ if(e.l>=1) d+=e.sets; else ind+=e.sets } else act++ });
    w.push({from,to,d,ind,act}) }
  return w;
}
function atSheetHTML(S,E){
  const m=ATM[atl.sel]; if(!m) return "";
  const t=todayKey(), S7=atStats(E,addDays(t,-6),t)[m.id], SR=S[m.id], all=atStats(E,"0000-00-00",t)[m.id];
  const ex=atExercisesFor(m.id), wk=atWeeks(E,m.id), maxW=Math.max(4,...wk.map(x=>x.d+x.ind));
  const img=atl.engine&&atl.status==="ready"?atl.engine.snapshot(m.id,m.v,atRecOf(all).c==="#7D8790"?"#c25a52":atRecOf(all).c):"";
  const exList=(lvl,max)=>{ const a=ex[lvl]; if(!a.length) return ""; return `<div><span class="lbl">${ATLVL[lvl]} (${lvl===1?"séries directes":"compte en indirect"})</span><ul class="plain atex">${a.slice(0,max).map(x=>`<li><span>${esc(x.n)}${x.done?` <span class="pill good">fait</span>`:""}</span><button class="linkbtn" data-atedit="${x.id}">Coefficients</button></li>`).join("")}</ul>${a.length>max?`<span class="meta">et ${a.length-max} autre${a.length-max>1?"s":""}</span>`:""}</div>` };
  const hist=SR.items.slice().sort((a,b)=>b.k.localeCompare(a.k)).slice(0,14);
  const role=e=>e.sets>0?(e.l>=1?`<b>direct</b> · ${atFmtN(e.sets)} série${e.sets>1?"s":""}`:`indirect (${String(e.l).replace(".",",")}) · ${atFmtN(e.sets)} série${e.sets>1?"s":""}`):`${e.min} min · sollicitation ${e.l>=1?"forte":e.l>=.5?"modérée":"légère"}`;
  const bars=`<svg viewBox="0 0 300 92" class="atbars" role="img" aria-label="Séries directes et indirectes par semaine, 10 dernières semaines">${wk.map((x,i)=>{ const X=6+i*29, hd=x.d/maxW*64, hi=x.ind/maxW*64;
    return `<rect x="${X}" y="${72-hd}" width="20" height="${hd}" rx="2" fill="#E0524F"/><rect x="${X}" y="${72-hd-hi}" width="20" height="${hi}" rx="2" fill="#5B9BD5" opacity=".85"/>${x.act?`<circle cx="${X+10}" cy="80" r="2.5" fill="#4FB06F"/>`:""}<text x="${X+10}" y="90" text-anchor="middle" font-size="7" fill="currentColor" opacity=".6">${fmtShort.format(parseKey(x.from)).replace(".","")}</text>` }).join("")}</svg>`;
  return `<div class="atsheet" role="dialog" aria-label="Fiche : ${esc(m.fr)}">
    <div class="atsh-head"><div><h3>${esc(m.fr)}</h3><i class="meta">${esc(m.la)}</i></div><button class="ib" data-atclose="1" aria-label="Fermer la fiche">✕</button></div>
    ${img?`<img class="atsnap" src="${img}" alt="Vue isolée du muscle ${esc(m.fr)}">`:`<div class="atsnap empty">${atl.status==="error"?"Illustration 3D indisponible sur cet appareil":"Illustration en cours de chargement"}</div>`}
    ${m.parts.length>1?`<span class="meta">Comprend : ${m.parts.map(p=>esc(p[1])).join(", ")}.</span>`:""}
    <p class="atfn">${esc(m.fn)}</p>
    <div class="atkpi">
      <div><b>${all.last?fmtShort.format(parseKey(all.last)):"–"}</b><span>Dernière sollicitation${all.last?" ("+atDays(all.last)+")":""}</span></div>
      <div><b>${atFmtN(S7.direct)}</b><span>Séries directes sur 7 jours</span></div>
      <div><b>${atFmtN(S7.indirect)}</b><span>Séries indirectes sur 7 jours${S7.act?" · "+S7.act+" séance"+(S7.act>1?"s":"")+" cardio/sport":""}</span></div>
      <div><b>${SR.sess.size}</b><span>Séances concernées (${esc(atRange(E).label)})</span></div>
    </div>
    <span class="meta">Une série compte en direct uniquement si ce muscle est le muscle principal de l'exercice. Sinon elle compte à part, en indirect, avec son coefficient (volume pondéré sur la période : ${fmt(SR.vol,1)}). Circuits : 10 répétitions = 1 série équivalente (estimation).</span>
    <span class="lbl">Historique sur 10 semaines</span>${bars}
    <div class="atleg small"><span><i style="background:#E0524F"></i>séries directes</span><span><i style="background:#5B9BD5"></i>séries indirectes</span><span><i style="background:#4FB06F;border-radius:50%"></i>cardio ou sport</span></div>
    ${hist.length?`<ul class="plain athist">${hist.map(e=>`<li><span class="meta">${fmtShort.format(parseKey(e.k))}</span> ${esc(e.n)} · ${role(e)}</li>`).join("")}</ul>`:`<span class="meta">Aucune sollicitation sur la période choisie.</span>`}
    <span class="lbl">Exercices qui le sollicitent</span>
    ${exList(1,8)}${exList(0.5,6)}${exList(0.25,4)}
    ${!ex[1].length&&!ex[0.5].length&&!ex[0.25].length?`<span class="meta">Aucun exercice de ta bibliothèque ne le cible pour l'instant.</span>`:""}
    ${atl.edit?atEditorHTML(atl.edit):""}
    <button class="btn ghost" data-sbfrom="${esc(m.g)}">Créer une séance « ${esc(m.g)} »</button>
  </div>`;
}
/* ---- édition des coefficients (validation manuelle) ---- */
function atLvlSel(name,v){ return `<select data-atlvl="${name}">${[[1,"Principal · 1"],[0.5,"Secondaire · 0,5"],[0.25,"Stabilisateur · 0,25"],[0,"Aucun"]].map(([x,l])=>`<option value="${x}" ${+v===x?"selected":""}>${l}</option>`).join("")}</select>` }
function atEditorHTML(id){
  const c=atCoef(id), def=atDefault(id), draft=atl.draft||Object.fromEntries(c.list);
  const rows=Object.entries(draft).sort((a,b)=>b[1]-a[1]);
  const free=ATLAS.muscles.filter(m=>!(m.id in draft));
  return `<div class="ateditor"><b>${esc(exInfo(id).n)}</b>
    <span class="meta">Source actuelle : ${c.src==="perso"?"tes réglages":c.src==="exercice"?"table par exercice":c.src==="mouvement"?"table par type de mouvement":c.src==="générique"?"correspondance générique par groupe":"aucune"}. Valeurs estimées, pas des mesures.</span>
    ${rows.map(([mid,v])=>`<div class="row atedrow"><span style="flex:1">${esc(ATM[mid].fr)}</span>${atLvlSel(mid,v)}</div>`).join("")||`<span class="meta">Aucun muscle associé.</span>`}
    <div class="row"><select id="at-add" style="flex:1"><option value="">Ajouter un muscle…</option>${free.map(m=>`<option value="${m.id}">${esc(m.fr)}</option>`).join("")}</select></div>
    <div class="row"><button class="btn" data-atsave="${id}">Valider</button>${c.src==="perso"&&def.list.length?`<button class="btn ghost" data-atreset="${id}">Revenir aux valeurs par défaut</button>`:""}<button class="linkbtn" data-atedit="">Annuler</button></div></div>`;
}
function atCoefListHTML(){
  const done={}; atEntries().forEach(e=>{ if(e.ex) done[e.ex]=1 });
  const ids=Object.keys(done).concat(Object.keys(((state.settings||{}).atlasCoef)||{})).filter((x,i,a)=>a.indexOf(x)===i);
  const sum=id=>atCoef(id).list.filter(([,l])=>l>=1).map(([m])=>ATM[m].fr.replace(/ — .*/,"")).filter((x,i,a)=>a.indexOf(x)===i).join(", ")||"aucun muscle principal";
  return `<div class="atcoefs">${ids.length?ids.sort((a,b)=>exInfo(a).n.localeCompare(exInfo(b).n,"fr")).map(id=>`<div class="row atedrow"><span style="flex:1"><b>${esc(exInfo(id).n)}</b><br><span class="meta">${esc(sum(id))}${atCoef(id).src==="perso"?" · réglé par toi":""}</span></span><button class="linkbtn" data-atedit="${id}" data-atopenex="1">Modifier</button></div>`).join(""):`<span class="meta">Aucun exercice enregistré pour l'instant.</span>`}
    ${atl.edit&&!atl.sel?atEditorHTML(atl.edit):""}
    <span class="meta">Pour chaque exercice : muscle principal (1, compté en séries directes), secondaire (0,5) ou stabilisateur (0,25), comptés à part en indirect. Chaque modification est inscrite dans l'historique des modifications.</span></div>`;
}
function atReadDraft(){
  const d={}; document.querySelectorAll("[data-atlvl]").forEach(s=>{ d[s.dataset.atlvl]=+s.value }); return d;
}
function atSaveCoef(id,reset){
  const st=clone(state.settings||{}); st.atlasCoef=st.atlasCoef||{};
  const before=atCoef(id).list.map(([m,l])=>ATM[m].fr+" "+String(l).replace(".",",")).join(", ")||"aucun";
  if(reset) delete st.atlasCoef[id];
  else { const d=atReadDraft(), o={}; Object.entries(d).forEach(([m,v])=>{ if(v>0&&ATM[m]) o[m]=v }); st.atlasCoef[id]=o }
  state.settings=st; saveSettings();
  const after=atCoef(id).list.map(([m,l])=>ATM[m].fr+" "+String(l).replace(".",",")).join(", ")||"aucun";
  logChange("Coefficients musculaires : "+exInfo(id).n,before,reset?"valeurs par défaut ("+after+")":after,"toi");
  atl.edit=""; atl.draft=null; render();
}

/* ---- moteur 3D : chargement paresseux ---- */
function atLoadScript(src){ return new Promise((res,rej)=>{ const s=document.createElement("script"); s.src=src; s.onload=res; s.onerror=()=>rej(new Error("fichier "+src+" non chargé")); document.head.appendChild(s) }) }
let atLoading=null;
function atEnsureEngine(){
  if(atl.engine||atLoading) return atLoading;
  atl.status="loading";
  atLoading=(async()=>{
    try{
      const c=document.createElement("canvas"); if(!(c.getContext("webgl2")||c.getContext("webgl"))) throw new Error("WebGL indisponible");
      if(!window.THREE) await atLoadScript("lib/three-0.149.0.min.js");
      let dec=null;
      try{ if(!window.MeshoptDecoder) await atLoadScript("lib/meshopt_decoder-0.22.0.js"); await window.MeshoptDecoder.ready; dec=window.MeshoptDecoder;
        const probe=new Uint8Array(8); dec.decodeVertexBuffer(probe,1,8,new Uint8Array([0xa0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0])) }
      catch(e){ dec=null }
      if(!dec){ if(!window.MeshoptDecoderRef) await atLoadScript("lib/meshopt_decoder_ref-0.22.0.js"); dec=window.MeshoptDecoderRef }
      const r=await fetch("data/atlas-muscles.json"); if(!r.ok) throw new Error("modèle introuvable (HTTP "+r.status+")");
      const bin=atob((await r.json()).b64), u8=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u8[i]=bin.charCodeAt(i);
      const buf=u8.buffer;
      atl.engine=createAtlas3D(window.THREE,dec,buf,{segments:{rectus:[.45,.63,.8]},onPick:atOnPick,onHover:atOnHover});
      atl.status="ready"; atl.engine.setView(atl.view,true); atl.engine.setLayer(atl.layer);
    }catch(e){ atl.status="error"; atl.err="L'affichage 3D n'a pas pu démarrer ("+(e.message||e)+"). La liste des muscles et les fiches restent disponibles ci-dessous."; console.warn(e) }
    atLoading=null; if(atl.status==="ready") atAfterRender(true); else { const msg=document.getElementById("at-msg"); if(msg) msg.textContent=atl.err } if(atl.sel) render();
  })();
  return atLoading;
}
function atAfterRender(fromLoad){
  const host=document.getElementById("atlas-host");
  if(!host){ if(atl.full){ atl.full=false; document.body.classList.remove("atfull") } return }
  if(!atl.engine){ if(atl.status!=="error") atEnsureEngine(); const msg=document.getElementById("at-msg"); if(msg&&atl.status==="error") msg.textContent=atl.err; return }
  const E=atl.engine; E.mount(host);
  const msg=document.getElementById("at-msg"); if(msg) msg.textContent="";
  if(host.dataset.mode==="pick"){ const sel=new Set(sb.sel), col={}, on=new Set();
    ATLAS.muscles.forEach(m=>{ col[m.id]=sel.has(m.g)?"#6FB3D2":"#7D8790"; if(sel.has(m.g)) on.add(m.id) }); E.setColors(col,null); E.setSel("") }
  else { E.setColors(atl._colors||{},atl._dims||null); E.setSel(atl.sel) }
  E.setLayer(atl.layer);
  if(fromLoad) E.setView(atl.view,true);
}
function atOnHover(h,x,y){
  const tip=document.getElementById("at-tip"), host=document.getElementById("atlas-host"); if(!tip||!host) return;
  if(!h){ tip.hidden=true; return }
  const m=h.a?ATM[h.a]:null, part=m&&m.parts.length>1?(m.parts.find(p=>p[0]===h.c)||[])[1]:"";
  const s=atl._S&&h.a?atl._S[h.a]:null, mode=host.dataset.mode;
  tip.innerHTML=m?`<b>${esc(m.fr)}</b>${part?`<span>${esc(part)}</span>`:""}${mode==="pick"?`<span>Groupe : ${esc(m.g)}</span>`:s?`<span>${s.last?"Sollicité "+atDays(s.last):"Non sollicité sur la période"}${s.direct?" · "+atFmtN(s.direct)+" séries directes":""}</span>`:""}`
    :`<b>${esc(h.name)}</b><span>Muscle non relié aux exercices</span>`;
  const r=host.getBoundingClientRect(); tip.hidden=false;
  tip.style.left=Math.min(r.width-tip.offsetWidth-6,Math.max(6,x-r.left+14))+"px"; tip.style.top=Math.max(6,y-r.top-tip.offsetHeight-10)+"px";
}
function atOnPick(h,ptype){
  const host=document.getElementById("atlas-host"); if(!host) return;
  if(host.dataset.mode==="pick"){ if(!h||!h.a) return; const g=ATM[h.a].g; sb.sel=sb.sel.includes(g)?sb.sel.filter(x=>x!==g):sb.sel.concat(g); render(); return }
  if(h&&h.ctx){ atOnHover(h,0,0); const tip=document.getElementById("at-tip"); if(tip){ tip.style.left="8px"; tip.style.top="8px"; clearTimeout(atl._tt); atl._tt=setTimeout(()=>{ tip.hidden=true },2200) } return }
  if(!h||!h.a){ if(atl.sel){ atl.sel=""; atl.edit=""; render() } return }
  atl.sel=atl.sel===h.a&&ptype==="mouse"?"":h.a; atl.edit=""; atl.draft=null; render();
}
function atSelect(id,focus){
  atl.sel=id; atl.edit=""; atl.draft=null;
  const m=ATM[id];
  if(focus&&m){ atl.view=m.v; if(m.L>atl.layer) atl.layer=m.L; if(atl.engine){ atl.engine.setLayer(atl.layer); atl.engine.focusOn(id,m.v) } }
  render();
}
document.addEventListener("click",e=>{
  const t=e.target.closest("button,summary"); if(!t||!t.closest("#app")) return; const d=t.dataset;
  if(d.sbfrom){ atl.sel=""; atl.edit="" }
  if(d.atview){ atl.view=d.atview; if(atl.engine) atl.engine.setView(atl.view); render(); return }
  if(d.atlayer!=null){ atl.layer=+d.atlayer; render(); return }
  if(d.atrange){ atl.range=d.atrange; render(); return }
  if(d.atmode){ atl.mode=d.atmode; render(); return }
  if(d.atfilter!=null){ atl.filter=d.atfilter; render(); return }
  if(d.atsel){ atSelect(d.atsel,!!d.atfocus||t.classList.contains("atrow")); if(d.atfocus){ atl.q="" ; render() } return }
  if(d.atclose){ atl.sel=""; atl.edit=""; atl.draft=null; render(); return }
  if(d.atzoom){ if(atl.engine){ if(d.atzoom==="reset") atl.engine.setView(atl.view); else atl.engine.zoom(d.atzoom==="in"?0.8:1.25) } return }
  if(d.atfull){ atl.full=!atl.full; document.body.classList.toggle("atfull",atl.full); render(); if(atl.engine) atl.engine.setFull(atl.full); return }
  if(d.atedit!=null){ atl.edit=d.atedit; atl.draft=null; render(); return }
  if(d.atsave){ atSaveCoef(d.atsave,false); return }
  if(d.atreset){ atSaveCoef(d.atreset,true); return }
  if(d.atlist){ e.preventDefault(); atl.listOpen=!atl.listOpen; render(); return }
  if(d.atcoefs){ e.preventDefault(); atl.coefOpen=!atl.coefOpen; if(!atl.coefOpen) atl.edit=""; render(); return }
});
document.addEventListener("change",e=>{ const el=e.target;
  if(el.id==="at-add"&&el.value){ atl.draft=Object.assign(atReadDraft(),{[el.value]:0.5}); render() }
  else if(el.dataset&&el.dataset.atlvl){ atl.draft=atReadDraft() }
});
document.addEventListener("input",e=>{ if(e.target.id!=="at-q") return; atl.q=e.target.value; const pos=e.target.selectionStart; render();
  const el=document.getElementById("at-q"); if(el){ el.focus(); try{ el.setSelectionRange(pos,pos) }catch(x){} } });
document.addEventListener("keydown",e=>{ if(e.key==="Escape"&&(atl.sel||atl.full)){ if(atl.sel){ atl.sel=""; atl.edit="" } else { atl.full=false; document.body.classList.remove("atfull"); if(atl.engine) atl.engine.setFull(false) } render() } });
