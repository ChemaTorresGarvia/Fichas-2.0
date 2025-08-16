// src/Repaso.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { addIncidencia } from "./utils/incidencias";
import { getBancoFichas } from "./utils/bancos";
import { FICHAS as FICHAS_STATIC } from "./data/fichas";

/* ===== Helpers de fecha local y progreso ===== */
function hoyLocalISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDaysISO(iso, days) {
  const [Y, M, D] = String(iso).split("-").map(Number);
  const d = new Date(Y, (M || 1) - 1, D || 1);
  d.setDate(d.getDate() + Number(days || 0));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function storageKey(userKey) {
  return `progreso_fichas_v1:${String(userKey || "anon").trim()}`;
}
function loadProgreso(userKey) {
  try {
    const raw = localStorage.getItem(storageKey(userKey));
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === "object" ? obj : {};
  } catch { return {}; }
}
function saveProgreso(userKey, data) {
  try {
    localStorage.setItem(storageKey(userKey), JSON.stringify(data));
    return true;
  } catch { return false; }
}
function keyDeFicha(f) {
  return f?.id || `${f?.pregunta || ""}||${f?.tema || ""}`;
}
/* Reglas de elegibilidad del día:
   - Sin progreso => elegible hoy
   - prog.ultima === hoy => NO elegible (ya hecha)
   - prog.next/proxima <= hoy => elegible
   - sin next => elegible
*/
function esElegibleHoy(prog, hoy) {
  if (!prog || typeof prog !== "object") return true;
  if (prog.ultima === hoy) return false;
  const next = prog.next || prog.proxima || null;
  if (!next) return true;
  return String(next) <= hoy;
}
function construirSetDiario(fichasTodas, userKey) {
  const hoy = hoyLocalISO();
  const progreso = loadProgreso(userKey);
  const elegibles = [];
  for (const f of fichasTodas) {
    const k = keyDeFicha(f);
    if (esElegibleHoy(progreso[k], hoy)) elegibles.push(f);
  }
  return elegibles;
}

/* ===== Secuencia de repetición para fichas sabidas =====
   3 → 7 → 10 → 15 → 10 → 15 → 10 → 15 → 10 → 10 (días)
   Guardamos el contador en prog.vecesSabida.
*/
const SECUENCIA_SABIDAS = [3, 7, 10, 15, 10, 15, 10, 15, 10, 10];
function diasParaSiguiente(vecesSabida) {
  // vecesSabida = cuántas veces se ha marcado como sabida HASTA AHORA (antes del clic actual)
  // Para la primera vez (vecesSabida=0) → 3 días, etc.
  const idx = Math.min(vecesSabida, SECUENCIA_SABIDAS.length - 1);
  return SECUENCIA_SABIDAS[idx];
}

/* ===== Estilos (como los venías usando) ===== */
const styles = {
  page: { padding: "1rem", fontFamily: "sans-serif", color: "#0f172a", maxWidth: 980, margin: "0 auto" },
  top: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  card: { padding: "1rem", borderRadius: 20, border: "1px solid #e6e9f2", background: "white",
          boxShadow: "0 12px 30px rgba(20,22,50,0.08), inset 0 1px 0 rgba(255,255,255,.7)" },
  title: { margin: 0, fontSize: 22, fontWeight: 800 },
  subtitle: { color: "#64748b", fontSize: 13, marginTop: 4 },
  pregunta: { fontSize: 18, lineHeight: 1.6, whiteSpace: "pre-wrap" }, // ↑ tamaño pedido
  consejo: { marginTop: 8, color: "#64748b", fontSize: 13 },
  sep: { height: 10 },
  btnRow: { display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 },
  btn: { padding: "10px 12px", borderRadius: 12, border: "none", cursor: "pointer", fontWeight: 800 },
  prim: { background: "#0ea5e9", color: "white" },
  ok: { background: "rgba(16,185,129,1)", color: "white" },
  warn: { background: "rgba(234,179,8,1)", color: "#0f172a" },
  danger: { background: "rgba(239,68,68,1)", color: "white" },
  answerBox: { marginTop: 10, padding: 12, borderRadius: 12, border: "1px solid #e2e8f0", background: "#fafafa" },
  endBox: { textAlign: "center", padding: 24, borderRadius: 16, border: "1px solid #e2e8f0", background: "white" },
  modalBackdrop: { position: "fixed", inset: 0, background: "rgba(15,23,42,.35)", display: "grid", placeItems: "center", zIndex: 1000000 },
  modal: { width: 720, maxWidth: "94vw", background: "white", borderRadius: 16, padding: 16, border: "1px solid #e2e8f0",
           boxShadow: "0 20px 60px rgba(2,6,23,.25)" },
  label: { fontSize: 13, color: "#334155", display: "block", marginTop: 8 },
  input: { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e2e8f0", outline: "none", resize: "vertical", minHeight: 120 },
};

export default function Repaso({ fichas = [], usuario, onSalir }) {
  const userKey = (usuario?.email || usuario?.nombre || "anon").trim();
  const hoy = hoyLocalISO();

  // Fuente total de fichas (banco LS o estáticas)
  const todasFichas = useMemo(() => {
    const bank = getBancoFichas();
    const base = Array.isArray(bank) && bank.length > 0 ? bank : (Array.isArray(FICHAS_STATIC) ? FICHAS_STATIC : []);
    return base;
  }, []);

  // ¿Modo día (fichas vacías viene del selector) o modo custom?
  const esModoDia = !Array.isArray(fichas) || fichas.length === 0;

  // Ronda actual
  const [lote, setLote] = useState([]);
  const [idx, setIdx] = useState(0);
  const [mostrarRespuesta, setMostrarRespuesta] = useState(false);
  const [fin, setFin] = useState(false);

  // Modal de incidencia (NO avanza la ficha)
  const [incOpen, setIncOpen] = useState(false);
  const [incText, setIncText] = useState("");

  // Construir lote inicial
  useEffect(() => {
    if (esModoDia) {
      const diario = construirSetDiario(todasFichas, userKey);
      setLote(diario);
      setIdx(0);
      setFin(diario.length === 0);
      if (import.meta?.env?.DEV) console.debug("[Repaso] set diario ->", diario.length);
    } else {
      // modo personalizado: usar las fichas pasadas
      const custom = Array.isArray(fichas) ? fichas : [];
      setLote(custom);
      setIdx(0);
      setFin(custom.length === 0);
      if (import.meta?.env?.DEV) console.debug("[Repaso] set custom ->", custom.length);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esModoDia, todasFichas, userKey, fichas]);

  const actual = lote[idx] || null;

  // Avanzar tras responder (sí/no). No se avanza al reportar incidencia.
  function siguiente() {
    const next = idx + 1;
    if (next < lote.length) {
      setIdx(next);
      setMostrarRespuesta(false);
    } else {
      setFin(true);
    }
  }

  // ===== Algoritmo de repetición (MODIFICADO SOLO PARA "sabía") =====
  function registrarResultado(sabia) {
    if (!actual) return;
    const k = keyDeFicha(actual);
    const data = loadProgreso(userKey);
    const prog = data[k] || {};

    let next;

    if (sabia) {
      // Incrementamos contador de veces que esta ficha ha sido marcada como sabida
      const vecesPrevias = Number(prog.vecesSabida || 0);
      const dias = diasParaSiguiente(vecesPrevias); // usa secuencia 3-7-10-15-10-15-10-15-10-10
      next = addDaysISO(hoy, dias);

      prog.vecesSabida = vecesPrevias + 1;
      // Para la estadística de hoy: mantenemos tu campo "aciertos" como venías usando
      prog.aciertos = (prog.aciertos || 0) + 1;

    } else {
      // Fallo → se repite mañana y resetea el contador de sabidas
      next = addDaysISO(hoy, 1);
      prog.vecesSabida = 0;
      prog.aciertos = 0; // para la estadística de hoy cuenta como no acertada
    }

    // Campos existentes que ya usabas
    prog.ultima = hoy;
    prog.next   = next;

    data[k] = prog;
    saveProgreso(userKey, data);

    // Notificar a PantallaMenu para refrescar estadísticas/racha
    window.dispatchEvent(new Event("rx-progreso-actualizado"));

    // Siguiente ficha
    siguiente();
  }

  // Enviar incidencia (sin avanzar ni cerrar la ficha)
  async function enviarIncidencia() {
    if (!actual || !incText.trim()) return;
    const payload = {
      user_id: userKey,
      tipo: "ficha",
      item_id: keyDeFicha(actual),
      tema: actual?.tema ?? "",
      pregunta: actual?.pregunta ?? "",
      respuesta: actual?.respuesta ?? "",
      texto: incText.trim(),
      fecha: new Date().toISOString(),
    };
    const ok = addIncidencia(payload);
    if (ok) {
      setIncOpen(false);
      setIncText("");
    } else {
      // feedback mínimo; no cambiamos ficha
      console.warn("[Repaso] No se pudo registrar la incidencia");
      setIncOpen(false);
    }
  }

  /* ===== Render ===== */
  if (fin) {
    return (
      <div style={styles.page}>
        <div style={styles.top}>
          <div>
            <h1 style={styles.title}>Fichas de repaso</h1>
            <div style={styles.subtitle}>{esModoDia ? "Ronda del día completada" : "Ronda personalizada completada"}</div>
          </div>
        </div>

        <div style={styles.endBox}>
          <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>No tienes más fichas para hoy</div>
          <div style={{ color: "#64748b" }}>¡Buen trabajo! Vuelve mañana para continuar con tu plan.</div>
          <div style={{ marginTop: 12 }}>
            <button type="button" style={{ ...styles.btn, ...styles.prim }} onClick={onSalir}>Entendido</button>
          </div>
        </div>
      </div>
    );
  }

  if (!actual) {
    return (
      <div style={styles.page}>
        <div style={styles.top}>
          <div>
            <h1 style={styles.title}>Fichas de repaso</h1>
            <div style={styles.subtitle}>{esModoDia ? "Ronda del día" : "Ronda personalizada"}</div>
          </div>
        </div>
        <div style={styles.card}>Preparando tus fichas…</div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.top}>
        <div>
          <h1 style={styles.title}>Fichas de repaso</h1>
          <div style={styles.subtitle}>
            Tema: <strong>{actual.tema || "—"}</strong> · Dificultad: <strong>{(actual.dificultad || "media")}</strong> · Ficha <strong>{idx + 1}</strong> / {lote.length}
          </div>
        </div>
      </div>

      <div style={styles.card}>
        {/* Enunciado */}
        <div style={styles.pregunta}>{actual.pregunta}</div>
        <div style={styles.consejo}>💡 Consejo: lee y contesta mentalmente antes de ver la solución.</div>

        {/* Mostrar respuesta */}
        {!mostrarRespuesta ? (
          <div style={styles.btnRow}>
            <button type="button" style={{ ...styles.btn, ...styles.prim }} onClick={() => setMostrarRespuesta(true)}>
              Mostrar respuesta
            </button>
          </div>
        ) : (
          <>
            <div style={styles.answerBox}>
              <div style={{ fontWeight: 800, marginBottom: 6 }}>Respuesta</div>
              <div style={{ whiteSpace: "pre-wrap" }}>{actual.respuesta}</div>
            </div>

            <div style={styles.btnRow}>
              <button type="button" style={{ ...styles.btn, ...styles.ok }} onClick={() => registrarResultado(true)}>
                Lo sabía
              </button>
              <button type="button" style={{ ...styles.btn, ...styles.warn }} onClick={() => registrarResultado(false)}>
                No lo sabía
              </button>
              <button
                type="button"
                style={{ ...styles.btn, ...styles.danger }}
                onClick={() => { setIncOpen(true); setIncText(""); }}
              >
                Tengo dudas sobre la respuesta / incidencia
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modal incidencia (no avanza ni cierra ficha) */}
      {incOpen && (
        <div style={styles.modalBackdrop} onClick={() => setIncOpen(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: 0, fontSize: 18 }}>Reportar incidencia</h3>
            <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
              Tema: <strong>{actual.tema || "—"}</strong>
            </div>
            <label style={styles.label} htmlFor="inc-text">Describe el problema</label>
            <textarea
              id="inc-text"
              name="incidenciaFicha"
              style={{ ...styles.input, marginTop: 6 }}
              value={incText}
              onChange={(e) => setIncText(e.target.value)}
              placeholder="Ej.: Creo que la respuesta está incompleta / hay un error de redacción…"
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button type="button" style={{ ...styles.btn, background: "#e2e8f0", color: "#0f172a" }} onClick={() => setIncOpen(false)}>
                Cancelar
              </button>
              <button type="button" style={{ ...styles.btn, ...styles.prim }} onClick={enviarIncidencia} disabled={!incText.trim()}>
                Enviar incidencia
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
