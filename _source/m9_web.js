/* =====================  VERSION WEB : mise en route et compte  ===================== */
window.WA_rerender = () => safeRender();
/* ---------- mise en route personnalisée : objectifs, cibles, programme ---------- */
const onb = { step: 0, d: null, err: "", force: false };
const OB_GOALS = [
  ["gras", "Perdre du gras", "Baisser le poids en gardant le muscle"],
  ["muscle", "Prendre du muscle", "Prise de masse progressive"],
  ["recompo", "Recomposition", "Perdre un peu de gras et prendre du muscle, poids à peu près stable"],
  ["forme", "Garder la forme", "Maintenir le poids, rester en forme"],
  ["endurance", "Endurance", "Courir, faire du sport, tenir plus longtemps"]];
const OB_DOW = [[1, "L"], [2, "M"], [3, "M"], [4, "J"], [5, "V"], [6, "S"], [0, "D"]];
const DOW_NAME = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
function onbNeeded(){ return state.status === "ready" && (onb.force || !(state.profile && state.profile.plan)) }
function obDefaults(){
  const P = state.profile || {}, lw = (() => { const ks = Object.keys(state.days).sort().reverse(); for(const k of ks){ const w = num(state.days[k].weight); if(w) return w } return null })();
  const w = lw || P.start || null;
  return { name: P.name || "", sex: P.sex || "h", age: P.age || null, height: P.height || null, weight: w, goal: P.plan ? P.goal : (P.goal && P.onboarded ? P.goal : null),
    obj: (P.plan && P.plan.obj) || (P.goal && w ? (P.goal < w - 0.5 ? "gras" : P.goal > w + 0.5 ? "muscle" : "forme") : ""), pace: (P.plan && P.plan.pace) || "modere",
    act: (P.plan && P.plan.act) || "", level: (P.plan && P.plan.level) || "", days: (P.plan && P.plan.days) || [], dur: (P.plan && P.plan.dur) || 60, equip: (P.plan && P.plan.equip) || "salle" };
}
/* ---- cibles : Mifflin-St Jeor × niveau d'activité, puis ajustement selon l'objectif (estimations) ---- */
function planTargets(d){
  const f = d.sex === "f", bmr = 10 * d.weight + 6.25 * d.height - 5 * d.age + (f ? -161 : 5);
  const pal = ({ assis: 1.35, debout: 1.5, physique: 1.7 }[d.act] || 1.4) + 0.035 * (d.days || []).length, tdee = bmr * pal;
  const refW = Math.min(d.weight, 25 * (d.height / 100) ** 2);           // poids de référence pour les protéines si IMC > 25
  let kc = tdee, protK = 1.6, note = "", rate = 0, steps = 8000;
  if(d.obj === "gras"){ rate = Math.min({ doux: .25, modere: .5, soutenu: .75 }[d.pace], d.weight * .01); kc = tdee - rate * 7700 / 7; protK = 2.0; steps = 9000;
    note = `déficit d'environ ${Math.round(rate * 7700 / 7)} kcal par jour pour viser ${fmt(rate, 2)} kg par semaine` }
  else if(d.obj === "muscle"){ const add = { doux: 150, modere: 250, soutenu: 400 }[d.pace]; rate = { doux: .1, modere: .2, soutenu: .35 }[d.pace]; kc = tdee + add; protK = 1.8; steps = 7000;
    note = `surplus d'environ ${add} kcal par jour pour une prise lente (${fmt(rate, 2)} kg par semaine environ), qui limite la prise de gras` }
  else if(d.obj === "recompo"){ kc = tdee - 200; protK = 2.0; note = "léger déficit d'environ 200 kcal par jour et protéines élevées" }
  else if(d.obj === "endurance"){ kc = tdee; protK = 1.6; note = "apport au niveau de ta dépense ; mange un peu plus les jours de longue sortie" }
  else { note = "apport au niveau de ta dépense estimée" }
  const floor = Math.max(bmr, f ? 1300 : 1600); let floored = false; if(kc < floor){ kc = floor; floored = true }
  kc = Math.round(kc / 50) * 50;
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), kcalMin: kc - 50, kcalMax: kc + 50, prot: Math.round(refW * protK / 5) * 5, protK, steps, rate, note, floored,
    weeks: rate && d.goal ? Math.ceil(Math.abs(d.goal - d.weight) / rate) : null };
}
/* ---- génération du programme selon jours, niveau, durée, matériel et objectif ---- */
const OB_TPL = {
  FB: { n: "Full body", ico: "cal", g: ["Quadriceps", "Pecs", "Dos", "Ischios", "Épaules", "Abdos", "Biceps", "Triceps"], desc: "Tout le corps" },
  UP: { n: "Haut du corps", ico: "pec", g: ["Pecs", "Dos", "Épaules", "Biceps", "Triceps"], desc: "Pecs, dos, épaules, bras" },
  LO: { n: "Bas du corps", ico: "jam", g: ["Quadriceps", "Ischios", "Fessiers", "Mollets", "Abdos"], desc: "Cuisses, fessiers, mollets, abdos" },
  PU: { n: "Push", ico: "pec", g: ["Pecs", "Épaules", "Triceps"], desc: "Pecs, épaules, triceps" },
  PL: { n: "Pull", ico: "dos", g: ["Dos", "Arrière d'épaule", "Biceps"], desc: "Dos, arrière d'épaule, biceps" },
  LG: { n: "Jambes", ico: "jam", g: ["Quadriceps", "Ischios", "Fessiers", "Mollets", "Abdos"], desc: "Cuisses, fessiers, mollets, abdos" } };
function obSplit(n, level){
  if(n <= 1) return ["FB"]; if(n === 2) return ["FB", "FB"]; if(n === 3) return level === "debutant" ? ["FB", "FB", "FB"] : ["PU", "PL", "LG"];
  if(n === 4) return ["UP", "LO", "UP", "LO"]; if(n === 5) return ["PU", "PL", "LG", "UP", "LO"]; return ["PU", "PL", "LG", "PU", "PL", "LG"];
}
function obCands(g, equip){
  if(g === "Arrière d'épaule") return Object.values(LIB).filter(x => x.pat === "rear" && (equip === "salle" || (equip === "halteres" ? ["haltères", "poids du corps"].includes(x.eq) : x.eq === "poids du corps"))).map(x => ({ x, comp: false }));
  return exCandidates(g, equip);
}
function obSession(tpl, variant, d, avoid){
  const T0 = OB_TPL[tpl], groups = T0.g.filter(g => tpl !== "FB" || d.dur >= 60 || !["Biceps", "Triceps"].includes(g));
  const lvlF = { debutant: .85, inter: 1, confirme: 1.1 }[d.level] || 1, goalF = { muscle: 1.05, forme: .9, endurance: .8 }[d.obj] || 1;
  let total = Math.round(({ 30: 10, 45: 14, 60: 18, 75: 22 }[d.dur] || 18) * lvlF * goalF);
  const big = g => ["Pecs", "Dos", "Quadriceps", "Ischios", "Fessiers", "Épaules"].includes(g);
  const W = groups.map(g => big(g) ? 1.3 : .8), sw = W.reduce((a, b) => a + b, 0), used = new Set(), list = [];
  groups.forEach((g, i) => {
    let sets = Math.max(2, Math.round(total * W[i] / sw)); const nEx = sets >= 7 ? 2 : 1;
    const HARD = ["tractions", "chin-up", "nordic", "sissy", "pompes-lestees", "planche-lestee", "dips-pecs", "tractions-negatives"];
    let c = obCands(g, d.equip).filter(o => !used.has(o.x.id) && (!o.x.time || g === "Abdos") && !(d.level === "debutant" && HARD.includes(o.x.id)) && !(o.x.id === "air-squat" && d.equip !== "pdc"));
    if(g === "Biceps" || g === "Triceps"){ const iso = c.filter(o => musclesOf(o.x.id).filter(([, w]) => w >= 1).length === 1); if(iso.length) c = iso.concat(c.filter(o => !iso.includes(o))) }
    if(variant > 0){ const fresh = c.filter(o => !avoid.has(o.x.id)); if(fresh.length) c = fresh.concat(c.filter(o => avoid.has(o.x.id))) }
    const pats = new Set();
    for(let j = 0; j < nEx && j < c.length; j++){
      const o = c.find(o2 => !used.has(o2.x.id) && !pats.has(o2.x.pat)) || c.find(o2 => !used.has(o2.x.id)); if(!o) break; const x = o.x; pats.add(x.pat); const s = Math.max(2, Math.min(4, Math.round(sets / (nEx - j)))); sets -= s; used.add(x.id);
      const endu = d.obj === "endurance" || d.obj === "forme";
      const t = x.time ? `${s}×30–45 s` : (g === "Mollets" || g === "Abdos") ? `${s}×12–15` : o.comp ? (endu ? `${s}×10–12` : d.level === "debutant" ? `${s}×8–12` : `${s}×6–10`) : `${s}×10–15`;
      list.push({ id: x.id, n: x.n, t, sets: s, rest: x.rest || (o.comp ? 120 : 75), bw: x.bw || undefined, time: x.time || undefined, comp: !!o.comp, g });
    }
  });
  const ord = x => (x.comp ? 0 : 10) + (big(x.g) ? 0 : 3) + (x.g === "Abdos" ? 20 : 0);
  return list.sort((a, b) => ord(a) - ord(b)).map(({ comp, g, ...e }) => e);
}
function buildPlan(d){
  const days = d.days.slice().sort((a, b) => ((a || 7) - (b || 7))), split = obSplit(days.length, d.level), seen = {}, avoid = {};
  const sessions = split.map((tpl, i) => {
    const v = seen[tpl] = (seen[tpl] == null ? 0 : seen[tpl] + 1), letter = split.filter(x => x === tpl).length > 1 ? " " + "ABC"[v] : "";
    const ex = obSession(tpl, v, d, avoid[tpl] || new Set()); avoid[tpl] = new Set([...(avoid[tpl] || []), ...ex.map(e => e.id)]);
    return { name: OB_TPL[tpl].n + letter, ico: OB_TPL[tpl].ico, dow: days[i], desc: OB_TPL[tpl].desc, dur: d.dur, ex };
  });
  return { id: Date.now().toString(36), created: todayKey(), obj: d.obj, pace: d.pace, act: d.act, level: d.level, days, dur: d.dur, equip: d.equip, sessions };
}
/* ---- enregistrement du programme dans l'appli ---- */
const FIXED_SESS = ["cal", "pec", "jam", "dos"];
function applyUserPlan(){
  FIXED_SESS.forEach(k => { const p = PROGRAM[k]; if(p && !p._hid){ const c = Object.assign({}, p, { carte: true, custom: true, archived: true, _hid: true }); delete c.dow; PROGRAM[k] = c } });
  Object.keys(TYPE_BY_DOW).forEach(k => delete TYPE_BY_DOW[k]);
  Object.keys(PROGRAM).forEach(k => { if(k.startsWith("u_")) delete PROGRAM[k] });
  const P = state.profile || {}, reg = (pl, cur) => (pl.sessions || []).forEach((s, i) => {
    const key = "u_" + pl.id + "_" + i;
    PROGRAM[key] = cur ? { name: s.name, ico: s.ico, dow: s.dow, desc: s.desc, dur: s.dur, ex: s.ex } : { name: s.name, ico: s.ico, desc: s.desc, dur: s.dur, ex: s.ex, carte: true, custom: true, archived: true };
    if(cur) TYPE_BY_DOW[s.dow] = key;
    s.ex.forEach(e => { if(!ALL_EX[e.id]) ALL_EX[e.id] = e });
  });
  (P.planHist || []).forEach(pl => reg(pl, false)); if(P.plan) reg(P.plan, true);
}
const _applyProfile = applyProfile;
applyProfile = function(){ _applyProfile(); try{ applyUserPlan() }catch(e){ console.warn(e) } };
applyUserPlan();

/* ---- écrans ---- */
function obChoice(k, v, label, sub){ const on = onb.d[k] === v || (Array.isArray(onb.d[k]) && onb.d[k].includes(v));
  return `<button class="obopt ${on ? "on" : ""}" data-obset="${k}|${v}"><b>${label}</b>${sub ? `<span class="meta">${sub}</span>` : ""}</button>` }
function viewOnboarding(){
  if(!onb.d) onb.d = obDefaults();
  const d = onb.d, st = onb.step, redo = !!(state.profile && state.profile.plan), N = 5;
  const f = (id, l, v, ph, mode) => `<div class="field"><label for="${id}">${l}</label><input type="text" inputmode="${mode || "decimal"}" id="${id}" value="${v == null ? "" : esc(String(v).replace(".", ","))}" placeholder="${ph || ""}"></div>`;
  let body = "";
  if(st === 0) body = `<h2 class="ttl"><img class="ico" src="icons/i-muscle.webp" alt="">${redo ? "Mes objectifs et mon programme" : "Bienvenue"}</h2>
    <p style="margin:0">${redo ? "Modifie ce que tu veux : tes séances déjà faites restent enregistrées." : state.profile && state.profile.onboarded ? "Nouveau : l'appli construit maintenant un programme et des cibles adaptés à ton objectif. Vérifie tes infos." : "L'appli part de zéro : quelques questions pour construire ton programme et tes cibles."}</p>
    ${f("ob-name", "Prénom", d.name, "", "text")}
    <div class="field"><label>Sexe (pour le calcul de la dépense)</label><div class="obgrid two">${obChoice("sex", "h", "Homme")}${obChoice("sex", "f", "Femme")}</div></div>
    <div class="fgrid">${f("ob-age", "Âge", d.age, "ans", "numeric")}${f("ob-height", "Taille (cm)", d.height, "", "numeric")}${f("ob-weight", "Poids actuel (kg)", d.weight, "")}</div>`;
  if(st === 1) body = `<h2>Ton objectif</h2><div class="obgrid">${OB_GOALS.map(([v, l, s2]) => obChoice("obj", v, l, s2)).join("")}</div>
    ${d.obj === "gras" || d.obj === "muscle" ? `${f("ob-goal", "Poids visé (kg)", d.goal, d.obj === "gras" ? "ex. " + Math.round((d.weight || 80) - 5) : "ex. " + Math.round((d.weight || 70) + 4))}
      <div class="field"><label>Rythme</label><div class="obgrid three">${obChoice("pace", "doux", "Doux")}${obChoice("pace", "modere", "Modéré")}${obChoice("pace", "soutenu", "Soutenu")}</div>
      <span class="meta">${d.obj === "gras" ? "Doux : environ 0,25 kg par semaine. Modéré : 0,5 kg. Soutenu : 0,75 kg (jamais plus de 1 % du poids par semaine). Plus c'est lent, mieux le muscle est préservé." : "Doux : environ +0,1 kg par semaine. Modéré : +0,2 kg. Soutenu : +0,35 kg. Une prise lente limite la prise de gras."}</span></div>` : ""}`;
  if(st === 2) body = `<h2>Ton quotidien</h2>
    <div class="field"><label>En dehors du sport, tu es plutôt…</label><div class="obgrid">${obChoice("act", "assis", "Assis la plupart du temps", "bureau, études, voiture")}${obChoice("act", "debout", "Debout une bonne partie de la journée", "accueil, commerce, déplacements à pied")}${obChoice("act", "physique", "Travail physique", "manutention, chantier, ménage, cuisine en service")}</div></div>
    <div class="field"><label>Ton niveau en musculation</label><div class="obgrid">${obChoice("level", "debutant", "Débutant", "moins de 6 mois de pratique régulière")}${obChoice("level", "inter", "Intermédiaire", "6 mois à 2 ans")}${obChoice("level", "confirme", "Confirmé", "plus de 2 ans")}</div></div>`;
  if(st === 3) body = `<h2>Tes séances</h2>
    <div class="field"><label>Quels jours peux-tu t'entraîner ?</label><div class="obdays">${OB_DOW.map(([v, l]) => `<button class="${d.days.includes(v) ? "on" : ""}" data-obday="${v}" aria-label="${DOW_NAME[v]}">${l}</button>`).join("")}</div>
      <span class="meta">${d.days.length ? d.days.length + " séance" + (d.days.length > 1 ? "s" : "") + " par semaine" : "Choisis au moins un jour"}${d.days.length >= 2 ? " · " + ({ 2: "2 full body", 3: d.level === "debutant" ? "3 full body" : "Push, Pull, Jambes", 4: "Haut et bas du corps, deux fois", 5: "Push, Pull, Jambes, Haut, Bas", 6: "Push, Pull, Jambes, deux fois", 7: "Push, Pull, Jambes, deux fois" }[d.days.length]) : ""}</span></div>
    <div class="field"><label>Durée d'une séance</label><div class="obgrid four">${[30, 45, 60, 75].map(m => obChoice("dur", m, m + " min")).join("")}</div></div>
    <div class="field"><label>Matériel</label><div class="obgrid">${obChoice("equip", "salle", "Salle de sport complète")}${obChoice("equip", "halteres", "Haltères seulement")}${obChoice("equip", "pdc", "Poids du corps")}</div></div>`;
  if(st === 4){ const t = planTargets(d), pl = buildPlan(d); onb.preview = pl;
    body = `<h2>Ton plan</h2>
    <div class="wodtarget"><b>${t.kcalMin}–${t.kcalMax} kcal et ${t.prot} g de protéines par jour · ${t.steps.toLocaleString("fr-FR")} pas</b>
      <span class="meta">Dépense estimée : environ ${t.tdee.toLocaleString("fr-FR")} kcal par jour (formule de Mifflin-St Jeor et ton niveau d'activité), ${t.note}. Protéines : ${String(t.protK).replace(".", ",")} g par kg${d.weight > 25 * (d.height / 100) ** 2 ? " de ton poids de référence (IMC 25)" : ""}, dans la fourchette usuelle de 1,6 à 2,2 g/kg pour progresser en musculation.${t.floored ? " Les calories sont remontées à un plancher de sécurité : ton objectif sera atteint plus lentement." : ""}${t.weeks ? ` À ce rythme : environ ${t.weeks} semaines pour atteindre ${fmt(d.goal)} kg, si tout se passe comme prévu.` : ""}</span>
      <span class="meta">Ce sont des estimations de départ. Après 2 à 4 semaines de pesées et de repas notés, l'appli calcule ta dépense réelle et te propose un ajustement à valider (Profil → Réglages).</span></div>
    ${pl.sessions.map(s => `<div class="obsess"><b>${DOW_NAME[s.dow]} · ${esc(s.name)}</b><span class="meta">${s.ex.map(e => esc(e.n) + " " + e.t).join(" · ")}</span></div>`).join("")}
    <span class="meta">Chaque exercice est remplaçable pendant la séance, et tu peux créer d'autres séances à tout moment. ${d.level === "debutant" ? "Débutant : garde 2 à 3 répétitions en réserve les premières semaines et soigne la technique." : "Monte la charge quand tu atteins le haut de la fourchette de répétitions sur toutes les séries."}${d.obj === "gras" || d.obj === "endurance" ? " Ajoute du cardio dans l'onglet Activité (marche, course, vélo) : il est compté dans ta dépense." : ""}</span>`; }
  const dots = `<div class="obdots">${Array.from({ length: N }, (_, i) => `<i class="${i === st ? "on" : i < st ? "done" : ""}"></i>`).join("")}</div>`;
  return `<section class="card obcard">${dots}${body}
    ${onb.err ? `<span class="notice">${esc(onb.err)}</span>` : ""}
    <div class="row">${st > 0 ? `<button class="btn ghost" data-obstep="-1">Retour</button>` : redo ? `<button class="btn ghost" data-obcancel="1">Annuler</button>` : ""}<button class="btn wodgo" style="flex:1" ${st === N - 1 ? 'id="obGo"' : 'data-obstep="1"'}>${st === N - 1 ? (redo ? "Valider ce programme" : "Commencer") : "Continuer"}</button></div>
    ${st === 0 && !redo ? `<span class="meta">Tes données sont enregistrées sur ton téléphone et sauvegardées en ligne sur un compte invisible, sans inscription. Personne d'autre ne peut les voir.</span>` : ""}</section>`;
}
function readOnb(){
  const g = id => { const el = document.getElementById(id); return el ? el.value : null }, d = onb.d;
  if(g("ob-name") != null) d.name = g("ob-name").trim().slice(0, 30);
  [["ob-age", "age"], ["ob-height", "height"], ["ob-weight", "weight"], ["ob-goal", "goal"]].forEach(([id, k]) => { const v = g(id); if(v != null) d[k] = num(v) });
}
function obValidate(){
  const d = onb.d, st = onb.step;
  if(st === 0){ if(!d.name || !d.age || !d.height || !d.weight) return "Remplis tous les champs.";
    if(d.age < 14 || d.age > 90 || d.height < 130 || d.height > 220 || d.weight < 35 || d.weight > 250) return "Une valeur semble incorrecte : vérifie âge, taille et poids." }
  if(st === 1){ if(!d.obj) return "Choisis un objectif.";
    if(d.obj === "gras" || d.obj === "muscle"){ if(!d.goal) return "Indique le poids visé.";
      if(d.obj === "gras" && d.goal >= d.weight) return "Pour perdre du gras, le poids visé doit être sous ton poids actuel.";
      if(d.obj === "muscle" && d.goal <= d.weight) return "Pour prendre du muscle, le poids visé doit être au-dessus de ton poids actuel.";
      if(d.goal / (d.height / 100) ** 2 < 18.5) return "Ce poids correspond à un IMC sous 18,5 (insuffisance pondérale) : choisis un objectif plus haut.";
      if(Math.abs(d.goal - d.weight) > 40) return "Écart très important : fixe une première étape plus proche, tu pourras la changer ensuite." } }
  if(st === 2){ if(!d.act) return "Choisis ton activité au quotidien."; if(!d.level) return "Choisis ton niveau." }
  if(st === 3 && !d.days.length) return "Choisis au moins un jour d'entraînement.";
  return "";
}
async function saveOnb(){
  const d = onb.d, t = planTargets(d), pl = onb.preview || buildPlan(d), today = todayKey(), P0 = state.profile || {}, redo = !!P0.plan;
  if(redo) await makeBackup("avant nouveau programme");
  const goal = d.obj === "gras" || d.obj === "muscle" ? d.goal : d.weight;
  const hist = (P0.planHist || []).slice(); if(P0.plan) hist.push(P0.plan);
  const P = Object.assign({}, P0, { onboarded: true, name: d.name, sex: d.sex, age: d.age, height: d.height, kcalMin: t.kcalMin, kcalMax: t.kcalMax, prot: t.prot, steps: t.steps, plan: pl, planHist: hist });
  if(!redo || P0.goal !== goal || !P0.start){ P.start = d.weight; P.goal = goal; P.goalStart = today }
  if(!P0.startDate) P.startDate = today;
  if(redo){ logChange("Objectif et programme", (P0.plan.sessions || []).map(s => s.name).join(", ") + " · " + P0.kcalMin + "–" + P0.kcalMax + " kcal · " + P0.prot + " g", pl.sessions.map(s => s.name).join(", ") + " · " + t.kcalMin + "–" + t.kcalMax + " kcal · " + t.prot + " g", "toi") }
  state.profile = P; applyProfile(); saveProfile();
  const cur = day(today); if(!num(cur.weight)) save("days", today, Object.assign({}, cur, { weight: String(d.weight).replace(".", ","), updated: Date.now() }));
  onb.force = false; onb.step = 0; onb.d = null; onb.err = ""; state.tab = "accueil"; render(); toTop();
}
const _viewAccueil = viewAccueil;
viewAccueil = function(){ return onbNeeded() ? viewOnboarding() : _viewAccueil() };
/* plan : ton programme, tes cibles, des règles générales */
viewProgramme = function(){
  const P = state.profile || {}, pl = P.plan;
  if(!pl) return `<section class="card"><p style="margin:0">Pas encore de programme.</p><button class="btn" data-obredo="1">Créer mon programme</button></section>`;
  const g = OB_GOALS.find(x => x[0] === pl.obj) || OB_GOALS[3];
  return `<section class="card"><h2>Objectif : ${esc(g[1])}</h2>
    <ul class="plain"><li><b>${T.kcalMin}–${T.kcalMax} kcal</b> par jour (estimation, ajustable avec la calibration dans Réglages)</li><li><b>${T.prot} g de protéines</b> par jour, une vraie source à chaque repas</li><li><b>${T.steps.toLocaleString("fr-FR")} pas</b> par jour</li>${pl.obj === "gras" || pl.obj === "muscle" ? `<li>Poids : ${fmt(START_WEIGHT)} → <b>${fmt(GOAL)} kg</b></li>` : ""}</ul>
    <button class="btn ghost" data-obredo="1">Modifier mes objectifs et mon programme</button></section>
  ${pl.sessions.map((s, i) => { const id = "u_" + pl.id + "_" + i; return `<section class="card"><div class="sess-hero"><img src="icons/s-${s.ico}.webp" alt=""><div><h2>${DOW_NAME[s.dow]} · ${esc(s.name)}</h2><span class="meta">${esc(s.desc)} · ~${s.dur} min</span></div></div>
    <div class="tablewrap"><table><tbody>${s.ex.map(e => { const sw = (state.settings.swaps || {})[e.id], x = sw ? exInfo(sw) : null;
      return `<tr><td><span class="prog-ex"><img src="icons/${x && x.icon ? x.icon : (LIB[e.id] && LIB[e.id].icon) || e.id}.webp" alt="" loading="lazy"><span>${esc(x ? x.n : e.n)}${x ? `<br><span class="meta">à la place de ${esc(e.n)}</span>` : ""}</span></span></td><td>${esc(targetOf(e.id, e.t))}</td><td class="meta">${restLabel(x ? x.rest : e.rest)}</td></tr>` }).join("")}</tbody></table></div></section>` }).join("")}
  <section class="card"><h2>Règles</h2><ul class="plain">
    <li>${pl.level === "debutant" ? "Premières semaines : garde 2 à 3 répétitions en réserve et soigne la technique." : "Garde 1 à 2 répétitions en réserve sur la plupart des séries."}</li>
    <li>Quand toutes les séries atteignent le haut de la fourchette, augmente la charge à la séance suivante.</li>
    <li>Séance ratée : décale-la au lendemain plutôt que de la sauter.</li>
    <li>Pèse-toi 3 à 4 matins par semaine, à jeun : seule la moyenne compte.</li>
    ${pl.obj === "gras" ? "<li>Si ta moyenne de poids ne bouge pas pendant 2 semaines, baisse d'environ 150 kcal par jour ou ajoute de la marche.</li>" : pl.obj === "muscle" ? "<li>Si ta moyenne de poids ne monte pas en 2 à 3 semaines, ajoute environ 150 kcal par jour.</li>" : ""}
  </ul><span class="meta">Programme construit le ${fmtShort.format(parseKey(pl.created))} selon ton objectif, ton niveau, tes jours, ta durée et ton matériel. Les cibles sont des estimations, pas des mesures.</span></section>`;
};
document.addEventListener("click", e => {
  const t = e.target.closest("button"); if(!t) return; const ds = t.dataset;
  if(ds.obset){ readOnb(); const [k, v] = ds.obset.split("|"); onb.d[k] = k === "dur" ? +v : v; onb.err = ""; render(); return }
  if(ds.obday != null){ readOnb(); const v = +ds.obday, a = onb.d.days; onb.d.days = a.includes(v) ? a.filter(x => x !== v) : a.concat(v); render(); return }
  if(ds.obstep){ readOnb(); if(+ds.obstep > 0){ const er = obValidate(); if(er){ onb.err = er; render(); return } } onb.err = ""; onb.step = Math.max(0, Math.min(4, onb.step + (+ds.obstep))); render(); toTop(); return }
  if(ds.obredo){ onb.force = true; onb.step = 0; onb.d = null; onb.err = ""; state.tab = "accueil"; render(); toTop(); return }
  if(ds.obcancel){ onb.force = false; onb.d = null; onb.step = 0; render(); return }
});

const acct = { email: "", msg: "", busy: false, mode: "" };
function accountCardHTML(){
  const S = window.WA_WEB ? window.WA_WEB.status : { mode: "local" };
  const line = S.mode !== "cloud" ? "Sauvegarde en ligne pas encore activée : tes données sont seulement sur ce téléphone. Exporte-les régulièrement ci-dessous."
    : !S.user ? (S.error ? esc(S.error) + " Tes données restent sur ce téléphone en attendant." : "Connexion au serveur en cours…")
    : S.error ? S.error
    : `Sauvegarde en ligne active${S.email ? " (" + esc(S.email) + ")" : " (compte invisible)"}${S.pending ? " · " + S.pending + " modification" + (S.pending > 1 ? "s" : "") + " en attente" : ""}${S.lastSync ? " · dernière synchro " + new Date(S.lastSync).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : ""}.`;
  return `<section class="card"><h2>Mon compte</h2>
    <p style="margin:0">${line}</p>
    ${S.mode === "cloud" && S.user && S.anonymous ? `<span class="meta">Ton compte invisible est lié à ce téléphone. Ajoute ton e-mail pour retrouver tes données si tu changes de téléphone ou effaces Safari.</span>
      <div class="row"><input type="email" id="acct-email" placeholder="ton@email.fr" value="${esc(acct.email)}" style="flex:1"><button class="btn" id="acctLink" ${acct.busy ? "disabled" : ""}>Sécuriser</button></div>` : ""}
    ${S.mode === "cloud" ? `<details><summary class="meta">Retrouver mes données sur un nouveau téléphone</summary><div class="row" style="margin-top:8px"><input type="email" id="acct-login" placeholder="e-mail déjà lié" style="flex:1"><button class="btn ghost" id="acctLogin" ${acct.busy ? "disabled" : ""}>Recevoir le lien</button></div></details>` : ""}
    ${acct.msg ? `<span class="notice">${esc(acct.msg)}</span>` : ""}
    <span class="meta">Version web de Winter Arc. Données alimentaires : CIQUAL 2025 (Anses, Licence Ouverte 2.0) et Open Food Facts (ODbL). L'analyse par IA et le coach IA ne sont pas inclus dans cette version.</span></section>`;
}
const _viewReglages = viewReglages;
viewReglages = function(){ return accountCardHTML() + `<section class="card"><h2>Objectifs et programme</h2><p style="margin:0" class="meta">Change ton objectif, tes jours, ta durée ou ton matériel : l'appli recalcule tes cibles et ton programme. Tes séances passées restent enregistrées.</p><button class="btn ghost" data-obredo="1">Modifier mes objectifs et mon programme</button></section>` + _viewReglages() };
if(window.WA_WEB) window.WA_WEB.onStatus(() => { if(state.tab === "profil" && state.psub === "reglages") safeRender() });

document.addEventListener("click", async e => {
  const t = e.target.closest("button"); if(!t) return;
  if(t.id === "obGo"){ saveOnb(); return }
  if(t.id === "acctLink" || t.id === "acctLogin"){
    const el = document.getElementById(t.id === "acctLink" ? "acct-email" : "acct-login"), em = (el && el.value || "").trim();
    if(!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)){ acct.msg = "Adresse e-mail invalide."; render(); return }
    acct.busy = true; acct.email = em; render();
    try{
      if(t.id === "acctLink"){ await window.WA_WEB.linkEmail(em); acct.msg = "E-mail de confirmation envoyé à " + em + ". Clique sur le lien reçu pour finaliser : ton compte sera alors récupérable." }
      else { await window.WA_WEB.loginEmail(em); acct.msg = "Lien de connexion envoyé à " + em + ". Ouvre-le sur ce téléphone." }
    }catch(x){ acct.msg = "Échec : " + (x.message || x) }
    acct.busy = false; render();
  }
});
