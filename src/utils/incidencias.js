// Util unificado para incidencias de fichas y exámenes.
// Clave única en localStorage y exports NOMBRADAS (no default).

const LS_KEY = "incidencias_v1";

/* =============== Storage base =============== */

export function getIncidencias() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export function setIncidencias(list) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(Array.isArray(list) ? list : []));
    return true;
  } catch {
    return false;
  }
}

/* =============== CRUD helpers =============== */

export function addIncidencia(payload) {
  const nowISO = new Date().toISOString();
  const arr = getIncidencias();
  const rec = normalizeIncoming(payload, nowISO);
  if (!rec) return false;
  arr.unshift(rec); // insertamos al principio
  return setIncidencias(arr);
}

export function updateIncidencia(id, patch = {}) {
  const arr = getIncidencias().map((x) => (x.id === id ? { ...x, ...patch } : x));
  return setIncidencias(arr);
}

export function deleteIncidencia(id) {
  const arr = getIncidencias().filter((x) => x.id !== id);
  return setIncidencias(arr);
}

export function clearIncidencias() {
  return setIncidencias([]);
}

/* =============== Normalización =============== */

function normalizeIncoming(p = {}, nowISO) {
  const id = p.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // ----- EXÁMENES -----
  // Esperado desde Examen.jsx / addIncidencia:
  // { user_id, tipo:"examen", item_id?, tema?, enunciado, opciones[4], respuesta_usuario(1..4|string), texto, fecha? }
 // ----- EXÁMENES -----
if (p.tipo === "examen" || Array.isArray(p.opciones)) {
  const opciones = Array.isArray(p.opciones) ? p.opciones.slice(0, 4).map(safeStr) : [];

  // Acepta diversas variantes: correcta / respuesta_correcta (1..4 o string "1")
  let respuesta_correcta = null;
  if (p.correcta != null) respuesta_correcta = Number(p.correcta);
  else if (p.respuesta_correcta != null) respuesta_correcta = Number(p.respuesta_correcta);

  // También intentamos deducirla si viene el texto de la correcta
  let respuesta_correcta_texto = "";
  const candidataTexto =
    p.correcta_texto != null ? safeStr(p.correcta_texto)
    : (p.respuesta_correcta_texto != null ? safeStr(p.respuesta_correcta_texto) : "");

  if (respuesta_correcta != null && opciones[respuesta_correcta - 1] != null) {
    respuesta_correcta_texto = safeStr(opciones[respuesta_correcta - 1]);
  } else if (candidataTexto) {
    respuesta_correcta_texto = candidataTexto;
    const idx = opciones.findIndex((o) => o === candidataTexto);
    if (idx >= 0) respuesta_correcta = idx + 1;
  }

  return {
    id,
    tipo: "examen",
    fecha: p.fecha || nowISO,
    usuario: p.usuario || p.user_id || "",
    user_id: p.user_id || p.usuario || "",
    pregunta: safeStr(p.enunciado || p.pregunta || ""),
    opciones,
    respuesta_usuario: p.respuesta_usuario != null ? Number(p.respuesta_usuario) : null,
    comentario: safeStr(p.texto || p.detalle || p.comentario || ""),
    estado: p.estado || "pendiente",
    // ✅ campos nuevos y consistentes
    respuesta_correcta,
    respuesta_correcta_texto,
    // por homogeneidad con fichas:
    respuesta: null,
  };
}


  // ----- FICHAS -----
  // Esperado desde Repaso.jsx:
  // { usuario, pregunta, respuesta, detalle|comentario, fecha?, estado? }
  if ("pregunta" in p && "respuesta" in p) {
    return {
      id,
      tipo: "ficha",
      fecha: p.fecha || nowISO,
      usuario: p.usuario || p.user_id || "",
      pregunta: safeStr(p.pregunta || ""),
      respuesta: p.respuesta ?? "",
      comentario: safeStr(p.texto || p.detalle || p.comentario || ""),
      estado: p.estado || "pendiente",
      opciones: null,
      respuesta_usuario: null,
    };
  }

  // ----- Fallback mínimo coherente -----
  if (p.pregunta || p.enunciado) {
    return {
      id,
      tipo: p.tipo || "ficha",
      fecha: p.fecha || nowISO,
      usuario: p.usuario || p.user_id || "",
      pregunta: safeStr(p.pregunta || p.enunciado || ""),
      respuesta: p.respuesta ?? null,
      opciones: Array.isArray(p.opciones) ? p.opciones.slice(0, 4).map(safeStr) : null,
      respuesta_usuario: p.respuesta_usuario != null ? Number(p.respuesta_usuario) : null,
      comentario: safeStr(p.texto || p.detalle || p.comentario || ""),
      estado: p.estado || "pendiente",
    };
  }

  return null;
}

/* =============== Utils =============== */

function safeStr(v) {
  if (v == null) return "";
  return String(v);
}
