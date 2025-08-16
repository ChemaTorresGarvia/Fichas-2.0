const KEY = (userKey) => `racha_v1:${String(userKey || "anon").trim()}`;
const YMD = () => new Date().toISOString().slice(0, 10);

export function traerRacha(userKey) {
  try {
    const raw = localStorage.getItem(KEY(userKey));
    return raw ? JSON.parse(raw) : { racha_actual: 0, racha_record: 0, ultima_actividad: null };
  } catch { return { racha_actual: 0, racha_record: 0, ultima_actividad: null }; }
}
export function registrarActividad(userKey) {
  try {
    const today = YMD();
    const row = traerRacha(userKey);
    if (row.ultima_actividad === today) return row;
    if (!row.ultima_actividad) row.racha_actual = 1;
    else {
      const diff = Math.floor((new Date() - new Date(row.ultima_actividad + "T00:00:00"))/86400000);
      row.racha_actual = (diff === 1) ? (row.racha_actual || 0) + 1 : 1;
    }
    if (!row.racha_record || row.racha_actual > row.racha_record) row.racha_record = row.racha_actual;
    row.ultima_actividad = today;
    localStorage.setItem(KEY(userKey), JSON.stringify(row));
    return row;
  } catch { return { racha_actual: 0, racha_record: 0, ultima_actividad: null }; }
}
