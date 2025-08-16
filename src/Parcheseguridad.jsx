import { useEffect, useMemo, useState } from "react";
import { addIncidencia } from "./utils/incidencias";

/**
 * Props:
 *  - fichas: Array<{ id?, pregunta, enunciado?, respuesta, tema, dificultad, ... }>
 *  - usuario: { email?, nombre? }
 *  - onSalir: () => void
 */
export default function Repaso({ fichas = [], usuario, onSalir }) {
  const userKey = (usuario?.email || usuario?.nombre || "anon").trim();
  const storageKey = `progreso_fichas_v1:${userKey}`;
  const hoyISO = useMemo(() => hoyLocalISO(), []);

  const [progreso, setProgreso] = useState(() => loadJSON(storageKey, {}));
  const [indice, setIndice] = useState(0);
  const [mostrarRespuesta, setMostrarRespuesta] = useState(false);
  const [fin, setFin] = useState(false);

  // Incidencias (fichas)
  const [incidenciaActiva, setIncidenciaActiva] = useState(false);
  const [textoIncidencia, setTextoIncidencia] = useState("");
  const [incidenciaEnviada, setIncidenciaEnviada] = useState(false);
  const [toast, setToast] = useState("");

  const total = fichas.length;
  const fichaActual = fichas[indice] || null;

  useEffect(() => {
    if (fin) return;
    // no permitir rehacer la misma ficha hoy
    if (fichaActual) {
      const k = fichaKey(fichaActual);
      const reg = progreso[k];
      if (reg && reg.ultima === hoyISO) avanzar();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indice, total, fin]);

  function fichaKey(f) {
    const k = f?.id ?? `${f?.pregunta || f?.enunciado || ""}||${f?.tema || ""}||${f?.dificultad || ""}`;
    return String(k);
  }

  function registrarResultado(ficha, estado) {
    const k = fichaKey(ficha);
    const prev = progreso[k] || null;

    let repeticiones = 0;
    if (estado === "sabida") {
      repeticiones = prev && prev.estado === "sabida" ? (prev.repeticiones || 1) + 1 : 1;
    } else if (estado === "no-sabida") {
      repeticiones = 0;
    } else if (estado === "duda") {
      repeticiones = prev?.repeticiones || 0;
    }

    const reg = {
      ultima: hoyISO,
      estado,
      repeticiones,                          // 3 días (1) / 7 días (≥2)
      aciertos: estado === "sabida" ? 1 : 0, // para la estadística del menú
    };

    const next = { ...progreso, [k]: reg };
    setProgreso(next);
    saveJSON(storageKey, next);
    // avisar al menú para refrescar estadística
    window.dispatchEvent(new Event("rx-progreso-actualizado"));
  }

  function onLoSabia() {
    if (!fichaActual) return;
    registrarResultado(fichaActual, "sabida");
    setIncidenciaActiva(false);
    setTextoIncidencia("");
    setIncidenciaEnviada(false);
    setMostrarRespuesta(false);
    avanzar();
  }

  function onNoLoSabia() {
    if (!fichaActual) return;
    registrarResultado(fichaActual, "no-sabida");
    setIncidenciaActiva(false);
    setTextoIncidencia("");
    setIncidenciaEnviada(false);
    setMostrarRespuesta(false);
    avanzar();
  }

  function onTengoDudas() {
    setIncidenciaActiva(true);
  }

  function enviarIncidencia() {
    if (!fichaActual || !textoIncidencia.trim()) return;

    // Guardamos la incidencia (NO avanzamos, NO cambiamos progreso)
    const comentario = textoIncidencia.trim();
    addIncidencia({
      tipo: "ficha",
      usuario: userKey,
      pregunta: (fichaActual.pregunta || fichaActual.enunciado || "").toString(),
      respuesta: fichaActual.respuesta ?? "",
      comentario,              // compatibilidad Incidencias.jsx reciente
      detalle: comentario,     // compatibilidad versiones previas
      texto: comentario,       // compatibilidad extra
      fecha: new Date().toISOString(),
      estado: "pendiente",
    });

    // feedback UI, permaneciendo en la misma ficha
    setIncidenciaActiva(false);
    setIncidenciaEnviada(true);
    setToast("Incidencia registrada");
    setTimeout(() => setToast(""), 1800);
  }

  function avanzar() {
    if (indice + 1 < total) setIndice((i) => i + 1);
    else setFin(true);
  }

  // FIN de ronda
  if (fin || !fichaActual) {
    return (
      <div style={wrap}>
        <h2 style={{ marginTop: 0 }}>Fichas de repaso</h2>
        <div style={card}>
          <p style={{ marginTop: 0 }}>No tienes más fichas para hoy</p>
          <button type="button" style={btn} onClick={onSalir}>Entendido</button>
        </div>
      </div>
    );
  }

  // Asegurar que SIEMPRE mostramos la PREGUNTA en grande
  const textoPregunta =
    (fichaActual.pregunta && String(fichaActual.pregunta)) ||
    (fichaActual.enunciado && String(fichaActual.enunciado)) ||
    "(Sin pregunta)";

  return (
    <div style={wrap}>
      <h2 style={{ marginTop: 0 }}>Fichas de repaso</h2>

      <div style={card}>
        <div style={{ marginBottom: 8, color: "#64748b", fontSize: 14 }}>
          Consejo: <em>lee la pregunta, intenta responder mentalmente y luego revela la respuesta.</em>
        </div>

        {/* PREGUNTA (más grande) */}
        <div style={preguntaBox}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>
            {textoPregunta}
          </div>
          <div style={{ opacity: 0.7, fontSize: 12, marginTop: 6 }}>
            Tema: {fichaActual.tema} · Dificultad: {fichaActual.dificultad}
          </div>
        </div>

        {/* Flujo exacto: primero "Mostrar respuesta"; luego respuesta + 3 botones */}
        {!mostrarRespuesta ? (
          <button type="button" style={btnPrim} onClick={() => setMostrarRespuesta(true)}>
            Mostrar respuesta
          </button>
        ) : (
          <>
            <div style={respuestaBox}>
              {renderRespuesta(fichaActual.respuesta)}
            </div>

            {/* Bloque de incidencia (inline) */}
            {!incidenciaActiva ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <button type="button" style={btnOk} onClick={onLoSabia}>La sabía</button>
                <button type="button" style={btn} onClick={onNoLoSabia}>No la sabía</button>

                <button
                  type="button"
                  style={{ ...btnWarn, opacity: incidenciaEnviada ? 0.75 : 1 }}
                  onClick={() => !incidenciaEnviada && onTengoDudas()}
                  disabled={incidenciaEnviada}
                  title={incidenciaEnviada ? "Incidencia ya registrada" : "Reportar incidencia"}
                >
                  Tengo dudas de esta respuesta / incidencia
                </button>

                {incidenciaEnviada && (
                  <span style={{ color: "#16a34a", fontWeight: 700, marginLeft: 6 }}>
                    Incidencia registrada
                  </span>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                <textarea
                  style={textarea}
                  placeholder="Describe la incidencia o duda..."
                  value={textoIncidencia}
                  onChange={(e) => setTextoIncidencia(e.target.value)}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    style={{ ...btnOk, opacity: textoIncidencia.trim() ? 1 : 0.7 }}
                    onClick={enviarIncidencia}
                    disabled={!textoIncidencia.trim()}
                  >
                    Enviar incidencia
                  </button>
                  <button
                    type="button"
                    style={btn}
                    onClick={() => { setIncidenciaActiva(false); setTextoIncidencia(""); }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div style={{ color: "#475569", marginTop: 8 }}>
        Ficha {indice + 1} de {total}
      </div>

      {toast && (
        <div style={toastBox}>{toast}</div>
      )}
    </div>
  );
}

/* ===== Helpers ===== */
function hoyLocalISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function loadJSON(key, fallback) {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
}
function saveJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}
function renderRespuesta(respuesta) {
  if (respuesta == null) return <em>(Sin respuesta)</em>;
  if (typeof respuesta === "string") return <div>{respuesta}</div>;
  try { return <pre style={{ whiteSpace: "pre-wrap", margin: 0 }}>{JSON.stringify(respuesta, null, 2)}</pre>; }
  catch { return <div>{String(respuesta)}</div>; }
}

/* ===== Estilos (coherentes con tu UI) ===== */
const wrap = { display: "flex", flexDirection: "column", gap: 12 };
const card = {
  padding: 16, borderRadius: 16, border: "1px solid #e6e9f2",
  background: "white", boxShadow: "0 12px 30px rgba(20,22,50,0.08), inset 0 1px 0 rgba(255,255,255,.7)",
};
const preguntaBox = { padding: 12, borderRadius: 12, background: "#f8fafc", border: "1px solid #e2e8f0", marginBottom: 12 };
const respuestaBox = { padding: 12, borderRadius: 12, background: "#ecfeff", border: "1px solid #bae6fd", margin: "12px 0" };
const btn = { padding: "10px 12px", borderRadius: 10, border: "1px solid #e2e8f0", background: "white", cursor: "pointer" };
const btnPrim = { ...btn, background: "#0ea5e9", color: "white", border: "none", fontWeight: 800 };
const btnOk = { ...btn, background: "#10b981", color: "white", border: "none", fontWeight: 800 };
const btnWarn = { ...btn, background: "#f59e0b", color: "white", border: "none", fontWeight: 800 };
const textarea = { width: "100%", minHeight: 80, borderRadius: 8, border: "1px solid #e2e8f0", padding: 8 };
const toastBox = { position: "fixed", right: 16, bottom: 16, background: "rgba(20,83,45,.95)", color: "white", padding: "8px 12px", borderRadius: 10, fontWeight: 800, zIndex: 5 };
