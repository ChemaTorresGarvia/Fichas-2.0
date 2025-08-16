export function cargarProgreso(userKey) {
  try {
    const raw = localStorage.getItem(`progreso_fichas_v1:${String(userKey || "anon").trim()}`);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}
export function guardarProgreso(userKey, data) {
  try {
    localStorage.setItem(`progreso_fichas_v1:${String(userKey || "anon").trim()}`, JSON.stringify(data || {}));
  } catch {}
}
export function daysSince(ymd) {
  if (!ymd) return 9999;
  const d1 = new Date(ymd + "T00:00:00");
  const d2 = new Date();
  return Math.floor((d2 - d1) / 86400000);
}
export function dueDaysFor(itemProg) {
  if (!itemProg) return 0;
  const { aciertos = 0, fallos = 0 } = itemProg;
  if (aciertos === 0) return fallos > 0 ? 1 : 0;
  if (aciertos === 1) return 3;
  return 7;
}
