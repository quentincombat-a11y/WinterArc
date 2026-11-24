/* =====================  VERSION WEB : mise en route et compte  ===================== */
window.WA_rerender = () => safeRender();
const onb = { step: 0, d: { sex: "h" }, err: "" };
function onbNeeded(){ return state.status === "ready" && !(state.profile && (state.profile.onboarded || state.profile.goal)) }
function estTargets(d){
  const bmr = 10 * d.weight + 6.25 * d.height - 5 * d.age + (d.sex === "f" ? -161 : 5), tdee = bmr * 1.5;
  const dir = Math.sign(d.goal - d.weight);
  const kc = Math.round((tdee + (dir < 0 ? -400 : dir > 0 ? 250 : 0)) / 50) * 50;
  return { kcalMin: kc - 50, kcalMax: kc + 50, prot: Math.round(d.weight * (dir < 0 ? 2 : 1.8) / 5) * 5, tdee: Math.round(tdee) };
}
function viewOnboarding(){
  const d = onb.d, f = (id, l, v, ph, mode) => `<div class="field"><label for="${id}">${l}</label><input type="text" inputmode="${mode || "decimal"}" id="${id}" value="${v == null ? "" : esc(String(v))}" placeholder="${ph || ""}"></div>`;
  const ready = d.name && d.age && d.height && d.weight && d.goal;
  const t = ready ? estTargets(d) : null;
  return `<section class="card"><h2 class="ttl"><img class="ico" src="icons/i-muscle.webp" alt="">Bienvenue</h2>
    <p style="margin:0">Quelques infos pour calculer tes besoins. Tout reste modifiable ensuite dans Profil → Réglages.</p>
    ${f("ob-name", "Prénom", d.name, "", "text")}
    <div class="field"><label for="ob-sex">Sexe (pour le calcul du métabolisme)</label><select id="ob-sex"><option value="h" ${d.sex !== "f" ? "selected" : ""}>Homme</option><option value="f" ${d.sex === "f" ? "selected" : ""}>Femme</option></select></div>
    <div class="fgrid">${f("ob-age", "Âge", d.age, "ans", "numeric")}${f("ob-height", "Taille (cm)", d.height, "", "numeric")}${f("ob-weight", "Poids actuel (kg)", d.weight, "")}${f("ob-goal", "Objectif (kg)", d.goal, "")}</div>
    ${t ? `<div class="wodtarget"><b>Cibles de départ : ${t.kcalMin}–${t.kcalMax} kcal et ${t.prot} g de protéines par jour</b><span class="meta">Estimation : dépense d'environ ${t.tdee} kcal par jour (formule de Mifflin-St Jeor, activité modérée), ${d.goal < d.weight ? "moins 400 kcal pour perdre du gras" : d.goal > d.weight ? "plus 250 kcal pour prendre du muscle" : "pour maintenir"}. L'appli affinera avec tes pesées.</span></div>` : ""}
    ${onb.err ? `<span class="notice">${esc(onb.err)}</span>` : ""}
    <button class="btn wodgo" id="obGo">Commencer</button>
    <span class="meta">Tes données sont enregistrées sur ton téléphone et sauvegardées en ligne sur un compte invisible, sans inscription. Personne d'autre ne peut les voir.</span></section>`;
}
function readOnb(){
  const g = id => { const el = document.getElementById(id); return el ? el.value : "" };
  onb.d = { name: g("ob-name").trim().slice(0, 30), sex: g("ob-sex") || "h", age: num(g("ob-age")), height: num(g("ob-height")), weight: num(g("ob-weight")), goal: num(g("ob-goal")) };
}
function saveOnb(){
  readOnb(); const d = onb.d;
  if(!d.name || !d.age || !d.height || !d.weight || !d.goal){ onb.err = "Remplis tous les champs."; render(); return }
  if(d.age < 14 || d.age > 90 || d.height < 130 || d.height > 220 || d.weight < 35 || d.weight > 250 || d.goal < 35 || d.goal > 250){ onb.err = "Une valeur semble incorrecte : vérifie âge, taille et poids."; render(); return }
  const t = estTargets(d), today = todayKey();
  const P = Object.assign({}, state.profile, { onboarded: true, name: d.name, sex: d.sex, age: d.age, height: d.height, start: d.weight, goal: d.goal, startDate: today, goalStart: today, kcalMin: t.kcalMin, kcalMax: t.kcalMax, prot: t.prot });
  state.profile = P; applyProfile(); saveProfile();
  const day0 = Object.assign({}, day(today), { weight: String(d.weight).replace(".", ","), updated: Date.now() }); save("days", today, day0);
  state.tab = "accueil"; render(); toTop();
}
const _viewAccueil = viewAccueil;
viewAccueil = function(){ return onbNeeded() ? viewOnboarding() : _viewAccueil() };

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
viewReglages = function(){ return accountCardHTML() + _viewReglages() };
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
document.addEventListener("input", e => { if(e.target && e.target.id && e.target.id.startsWith("ob-")){ readOnb(); const box = document.querySelector(".wodtarget"); if(onb.d.name && onb.d.age && onb.d.height && onb.d.weight && onb.d.goal && !box) render() } });
