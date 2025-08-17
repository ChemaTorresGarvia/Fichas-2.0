// Banco local de fichas y exámenes (pre-Supabase)
// Claves en localStorage:
const LS_FICHAS = "banco_fichas_v1";
const LS_EXAMS  = "banco_examenes_v1";

/* =============== Helpers base =============== */
function loadJSON(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; }
  catch { return fallback; }
}
function saveJSON(key, val) {
  try { localStorage.setItem(key, JSON.stringify(val)); return true; }
  catch { return false; }
}
function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
}
function str(v){ return v==null ? "" : String(v).trim(); }

/* =============== Getters / Setters =============== */
export function getBancoFichas() {
  const arr = loadJSON(LS_FICHAS, []);
  return Array.isArray(arr) ? arr : [];
}
export function setBancoFichas(list) {
  return saveJSON(LS_FICHAS, Array.isArray(list) ? list : []);
}

export function getBancoExamenes() {
  const arr = loadJSON(LS_EXAMS, []);
  return Array.isArray(arr) ? arr : [];
}
export function setBancoExamenes(list) {
  return saveJSON(LS_EXAMS, Array.isArray(list) ? list : []);
}

/* =============== Normalizadores =============== */
// Fichas
export function normalizarFichas(rows = []) {
  const out = [];
  for (const r of rows) {
    if (!r) continue;

    const idRaw = str(r.ID ?? r.Id ?? r.id ?? "");  // 🔹 ID en crudo desde el XLSX
    const tema = str(r.tema ?? r.Tema);
    const dificultad = str(r.dificultad ?? r.Dificultad ?? "");
    const pregunta = str(r.pregunta ?? r.Pregunta ?? r.enunciado ?? r.Enunciado);
    const respuesta = r.respuesta ?? r.Respuesta ?? "";

    if (!pregunta) continue; // indispensable

    out.push({
      id: idRaw || genId(),
      tema,
      dificultad: dificultad || "media",
      pregunta,
      respuesta,
    });
  }
  return out;
}


// Exámenes
export function normalizarExamenes(rows = []) {
  const out = [];
  for (const r of rows) {
    if (!r) continue;
    const enunciado = str(r.enunciado ?? r.Enunciado ?? r.pregunta ?? r.Pregunta);
    const tema = str(r.tema ?? r.Tema);
    const dificultad = str(r.dificultad ?? r.Dificultad ?? "");
    const a = str(r.opcion_a ?? r.A ?? r.a ?? r.opcionA);
    const b = str(r.opcion_b ?? r.B ?? r.b ?? r.opcionB);
    const c = str(r.opcion_c ?? r.C ?? r.c ?? r.opcionC);
    const d = str(r.opcion_d ?? r.D ?? r.d ?? r.opcionD);
    let correcta = r.correcta ?? r.Correcta ?? r.respuesta_correcta ?? r["respuesta correcta"];
    correcta = mapCorrecta(correcta);
    if (!enunciado) continue;
    const opciones = [a,b,c,d].map((x) => str(x)).slice(0,4);
    if (opciones.length !== 4 || opciones.some((x) => !x)) continue;
    if (![1,2,3,4].includes(correcta)) continue;
    out.push({
      id: r.id ?? r.ID ?? genId(),
      tema,
      dificultad: dificultad || "media",
      enunciado,
      opciones,
      correcta,
    });
  }
  return out;
}

function mapCorrecta(v) {
  if (v == null) return null;
  const s = String(v).trim().toUpperCase();
  if (/^[1-4]$/.test(s)) return Number(s);
  if (s === "A") return 1;
  if (s === "B") return 2;
  if (s === "C") return 3;
  if (s === "D") return 4;
  return null;
}

/* =============== Merge / Replace =============== */
export function mergeFichas(nuevas, modo="add") {
  if (!Array.isArray(nuevas)) nuevas = [];

  // En replace: guarda tal cual (sin Map, sin claves, sin pisar)
  if (modo === "replace") {
    setBancoFichas(nuevas);
    window.dispatchEvent(new Event("rx-bancos-actualizados"));
    return nuevas;
  }

  // En add: dedupe por id; si falta, por composite robusto
  const actuales = getBancoFichas();
  const uniqKey = (f) => {
    const id = f?.id && String(f.id).trim();
    if (id) return id;
    const tema = (f?.tema || "").toLowerCase();
    const dif = (f?.dificultad || "").toLowerCase();
    const preg = (f?.pregunta || "").toLowerCase();
    const resp = (f?.respuesta || "").toLowerCase();
    return `${tema}||${dif}||${preg}||${resp}`;
  };

  const idx = new Map();
  for (const f of actuales) idx.set(uniqKey(f), f);
  for (const f of nuevas)   idx.set(uniqKey(f), f);

  const res = Array.from(idx.values());
  setBancoFichas(res);
  window.dispatchEvent(new Event("rx-bancos-actualizados"));
  return res;
}


export function mergeExamenes(nuevas, modo="add") {
  console.debug("[mergeExamenes] START modo=", modo, "nuevas=", Array.isArray(nuevas) ? nuevas.length : -1);
  if (!Array.isArray(nuevas)) nuevas = [];

  const actuales = (modo === "replace") ? [] : getBancoExamenes();
  console.debug("[mergeExamenes] actuales=", actuales.length);

  // Normalizador mínimo
  const norm = (q) => ({
    id: q?.id ?? genId(),
    tema: (q?.tema ?? "").trim(),
    dificultad: String(q?.dificultad ?? "").trim(),
    enunciado: (q?.enunciado ?? "").trim(),
    opciones: Array.isArray(q?.opciones) ? q.opciones.map(x => (x ?? "").trim()) : ["","","",""],
    correcta: String(q?.correcta ?? "").trim() // 1..4
  });

  // 👉 Caso 1: modo replace —> guardamos tal cual, SIN dedupe
  if (modo === "replace") {
    const soloNuevas = nuevas.map(norm);
    saveJSON("banco_examenes_v1", soloNuevas);
    window.dispatchEvent(new Event("rx-bancos-actualizados"));
    console.debug("[mergeExamenes] REPLACE -> resultado=", soloNuevas.length);
    return soloNuevas;
  }

  // 👉 Caso 2: banco vacío —> primera carga, SIN dedupe
  if (Array.isArray(actuales) && actuales.length === 0) {
    const soloNuevas = nuevas.map(norm);
    saveJSON("banco_examenes_v1", soloNuevas);
    window.dispatchEvent(new Event("rx-bancos-actualizados"));
    console.debug("[mergeExamenes] ADD(base vacía) -> resultado=", soloNuevas.length);
    return soloNuevas;
  }

  // 👉 Caso 3: hay base y añadimos —> dedupe con clave compuesta ROBUSTA
  const base = actuales.map(norm);
  const incoming = nuevas.map(norm);

  const keyOf = (q) => [
    q.tema.toLowerCase(),
    q.dificultad.toLowerCase(),
    q.enunciado.toLowerCase(),
    ...q.opciones.map(o => o.toLowerCase()),
    q.correcta
  ].join("§");

  const mapa = new Map();
  for (const q of base)     mapa.set(keyOf(q), q);
  for (const q of incoming) mapa.set(keyOf(q), q);

  const res = Array.from(mapa.values());
  saveJSON("banco_examenes_v1", res);
  window.dispatchEvent(new Event("rx-bancos-actualizados"));
  console.debug("[mergeExamenes] ADD(con dedupe) -> resultado=", res.length);
  return res;
}



/* =============== Efectivos (banco o estáticos) =============== */
export function getFichasEfectivas(staticFichas = []) {
  const ls = getBancoFichas();
  return Array.isArray(ls) && ls.length > 0 ? ls : (staticFichas || []);
}

export function getExamenesEfectivos(staticPreguntas = []) {
  const ls = getBancoExamenes();
  return Array.isArray(ls) && ls.length > 0 ? ls : (staticPreguntas || []);
}
