import { useEffect, useMemo, useRef, useState } from "react";
import { registrarActividad } from "./utils/racha";
import { addIncidencia } from "./utils/incidencias";

const styles = {
  root: { position: "relative", zIndex: 2, pointerEvents: "auto", minHeight: "100%" },
  page: { padding: "1rem", fontFamily: "sans-serif", color: "#0f172a", maxWidth: 980, margin: "0 auto" },
  topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, zIndex: 2 },
  salirBtn: { padding: "10px 12px", borderRadius: 12, border: "none", cursor: "pointer", fontWeight: 800, background: "#991b1b", color: "white" },
  card: { padding: "1rem", borderRadius: 20, border: "1px solid #e6e9f2", background: "white", boxShadow: "0 12px 30px rgba(20,22,50,0.08), inset 0 1px 0 rgba(255,255,255,.7)", position: "relative", zIndex: 2 },
  title: { margin: 0, fontSize: 22 },
  subtitle: { color: "#64748b", fontSize: 13, marginTop: 4 },
  enunciado: { fontSize: 18, lineHeight: 1.5, whiteSpace: "pre-wrap" },
  opciones: { display: "grid", gap: 8, marginTop: 12 },
  opcionWrap: { display: "grid", gridTemplateColumns: "auto 1fr", gap: 10, alignItems: "start" },
  radio: { width: 18, height: 18, marginTop: 4, cursor: "pointer" },
  labelBtn: { display: "block", width: "100%", padding: "10px 12px", borderRadius: 12, border: "1px solid #e2e8f0", background: "white", cursor: "pointer" },
  labelBtnActive: { outline: "2px solid #0ea5e9", boxShadow: "0 0 0 4px rgba(14,165,233,.2)" },
  nextRow: { display: "flex", justifyContent: "flex-end", marginTop: 12, gap: 8 },
  btn: { padding: "10px 12px", borderRadius: 12, border: "none", cursor: "pointer", fontWeight: 700 },
  btnPrim: { background: "#0ea5e9", color: "white" },
  badge: { position: "fixed", right: 16, bottom: 16, background: "rgba(2,6,23,.85)", color: "white", padding: "8px 12px", borderRadius: 12, zIndex: 3, fontSize: 13, pointerEvents: "none" },
  resumenBlock: { marginTop: 12, padding: 12, borderRadius: 14, border: "1px solid #e2e8f0", background: "white" },
  correct: { background: "rgba(34,197,94,.12)", border: "1px solid rgba(34,197,94,.35)" },
  wrong: { background: "rgba(239,68,68,.12)", border: "1px solid rgba(239,68,68,.35)" },
  incBtn: { padding: "8px 10px", borderRadius: 10, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", fontWeight: 600, marginTop: 8 },
  modalBackdrop: { position: "fixed", inset: 0, background: "rgba(15,23,42,0.35)", display: "grid", placeItems: "center", zIndex: 1000000 },
  modal: { width: 720, maxWidth: "94vw", background: "white", borderRadius: 16, padding: 16, border: "1px solid #e2e8f0", boxShadow: "0 20px 60px rgba(2,6,23,.25)" },
  label: { fontSize: 13, color: "#334155", display: "block", marginTop: 8 },
  input: { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e2e8f0", outline: "none", resize: "vertical", minHeight: 120 },
};

function clampCantidad(n) {
  const v = Number(n); if (!Number.isFinite(v)) return 20; return Math.max(1, Math.min(v, 40));
}
function sampleHastaN(arr, n) {
  const a = [...(arr || [])];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, n);
}

export default function Examen({ preguntas = [], cantidad = 20, usuario, onSalir }) {
  const nDeseado = useMemo(() => clampCantidad(cantidad), [cantidad]);
  const banco = useMemo(() => {
    const limpias = (preguntas || []).filter((q) => q && Array.isArray(q.opciones) && q.opciones.length === 4 && [1,2,3,4].includes(Number(q.correcta)));
    const n = Math.min(nDeseado, limpias.length || 0);
    return n > 0 ? sampleHastaN(limpias, n) : [];
  }, [preguntas, nDeseado]);

  const total = banco.length;
  const [idx, setIdx] = useState(0);
  const [seleccion, setSeleccion] = useState(null);
  const [resultado, setResultado] = useState({});
  const [fin, setFin] = useState(false);
  const userKey = usuario?.id || usuario?.email || "anon";

  const actividadNotificada = useRef(false);
  const notificarActividad = () => { if (actividadNotificada.current) return; actividadNotificada.current = true; registrarActividad(userKey); };
  useEffect(() => setSeleccion(null), [idx]);

  const q = banco[idx] || null;
  const idKey = q ? q.id || `${q.tema}|${q.enunciado}` : null;

  function confirmarRespuesta() {
    if (!q || !seleccion) return;
    const ok = Number(seleccion) === Number(q.correcta);
    setResultado((r) => ({ ...r, [idKey]: { marcada: Number(seleccion), correcta: Number(q.correcta), ok, tema: q.tema, enunciado: q.enunciado, opciones: q.opciones } }));
    notificarActividad();
    if (idx + 1 < total) setIdx((i) => i + 1); else setFin(true);
  }

  const [incOpen, setIncOpen] = useState(false);
  const [incText, setIncText] = useState("");
  const [incFor, setIncFor] = useState(null);
  const [sendingInc, setSendingInc] = useState(false);
  const [toast, setToast] = useState("");

  // Sustituye tu función enviarIncidencia por esta
async function enviarIncidencia(question, marcada) {
  try {
    if (!question || !incText.trim()) return;

    setSendingInc(true);

    const correctaNum = Number(question?.correcta);
    const elegidaNum = marcada != null ? Number(marcada) : null;

    const payload = {
      user_id: userKey,
      tipo: "examen",
      item_id: question?.id ?? `${question?.tema || ""}|${question?.enunciado || ""}`,
      tema: question?.tema ?? "",
      enunciado: question?.enunciado ?? "",
      opciones: Array.isArray(question?.opciones) ? question.opciones : [],
      // añadimos ambas respuestas (número y texto)
      respuesta_correcta: Number.isFinite(correctaNum) ? correctaNum : null,
      respuesta_correcta_texto:
        Number.isFinite(correctaNum) && question?.opciones?.[correctaNum - 1] != null
          ? String(question.opciones[correctaNum - 1])
          : null,
      respuesta_usuario: elegidaNum,
      respuesta_usuario_texto:
        Number.isFinite(elegidaNum) && question?.opciones?.[elegidaNum - 1] != null
          ? String(question.opciones[elegidaNum - 1])
          : null,
      texto: incText.trim(),
      fecha: new Date().toISOString(),
    };

    const ok = addIncidencia(payload);

    setSendingInc(false);

    if (ok) {
      setIncOpen(false);
      setIncText("");
      setIncFor(null);
      setToast("Incidencia registrada");
      setTimeout(() => setToast(""), 2000);
    } else {
      setToast("No se pudo registrar la incidencia");
      setTimeout(() => setToast(""), 2000);
    }
  } catch (e) {
    setSendingInc(false);
    console.error("[Examen] enviarIncidencia error:", e);
    setToast("Error al registrar la incidencia");
    setTimeout(() => setToast(""), 2000);
  }
}


  if (!total) {
    return (
      <div style={styles.root}>
        <div style={styles.page}>
          <div style={styles.topbar}>
            <h1 style={styles.title}>Simulador de exámenes</h1>
          </div>
          <div style={styles.card}>
            No hay preguntas válidas para este examen.
            <div style={{ marginTop: 10 }}>
              <button type="button" style={{ ...styles.btn, ...styles.btnPrim }} onClick={onSalir}>Volver al selector</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      <div style={styles.page}>
        <div style={styles.topbar}>
          <div>
            <h1 style={styles.title}>Simulador de exámenes</h1>
            <div style={styles.subtitle}>
              {fin ? (<>Examen finalizado</>) : q ? (<>Tema: <strong>{q.tema}</strong> · Dificultad: <strong>{q.dificultad}</strong> · Pregunta <strong>{idx + 1}</strong> / {total}</>) : (<>Preparando…</>)}
            </div>
          </div>
        </div>

        {!fin ? (
          <div style={styles.card}>
            <div style={styles.enunciado}>{q.enunciado}</div>
            <div style={styles.opciones}>
              {q.opciones.map((opt, i) => {
                const val = i + 1; const inputId = `opt-${idx}-${val}`; const activo = seleccion === val;
                return (
                  <div key={inputId} style={styles.opcionWrap}>
                    <input id={inputId} name={`preg-${idx}`} type="radio" style={styles.radio} checked={!!activo} onChange={() => setSeleccion(val)} />
                    <label htmlFor={inputId} style={{ ...styles.labelBtn, ...(activo ? styles.labelBtnActive : null) }}>
                      <div style={{ fontWeight: 700, marginBottom: 4 }}>Opción {String.fromCharCode(64 + val)}</div>
                      <div style={{ whiteSpace: "pre-wrap" }}>{opt}</div>
                    </label>
                  </div>
                );
              })}
            </div>
            <div style={styles.nextRow}>
              <button type="button" style={{ ...styles.btn, ...styles.btnPrim }} onClick={confirmarRespuesta} disabled={!seleccion}>
                {idx + 1 < total ? "Siguiente" : "Finalizar examen"}
              </button>
            </div>
          </div>
        ) : (
          <div style={styles.card}>
            <h2 style={{ marginTop: 0 }}>Resumen del examen</h2>
            <div style={{ color: "#64748b", fontSize: 13, marginBottom: 8 }}>Total preguntas: <strong>{total}</strong></div>
            {banco.map((qq, k) => {
              const key = qq.id || `${qq.tema}|${qq.enunciado}`;
              const r = resultado[key] || { marcada: null, correcta: qq.correcta };
              return (
                <div key={key} style={styles.resumenBlock}>
                  <div style={{ fontWeight: 800, marginBottom: 6 }}>{k + 1}. {qq.enunciado}</div>
                  <div style={{ display: "grid", gap: 8 }}>
                    {qq.opciones.map((o, i) => {
                      const val = i + 1;
                      const isCorrect = val === Number(qq.correcta);
                      const isUserWrong = r.marcada != null && val === Number(r.marcada) && !isCorrect;
                      const boxStyle = isCorrect ? styles.correct : (isUserWrong ? styles.wrong : { background: "white" });
                      return (
                        <div key={i} style={{ padding: 10, borderRadius: 10, border: "1px solid #e2e8f0", ...boxStyle }}>
                          <strong>{String.fromCharCode(64 + val)}.</strong> {o}
                        </div>
                      );
                    })}
                  </div>
                  <button type="button" style={styles.incBtn} onClick={() => { setIncFor({ q: qq, marcada: r.marcada }); setIncText(""); setIncOpen(true); }}>
                    Reportar incidencia
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div style={styles.badge}>Preguntas: hecho <strong>{Object.keys(resultado).length}</strong> / quedan <strong>{Math.max(total - Object.keys(resultado).length, 0)}</strong></div>
      </div>

      {incOpen && (
        <div style={styles.modalBackdrop} onClick={() => !sendingInc && setIncOpen(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: 0, fontSize: 18 }}>Reportar incidencia</h3>
            {incFor?.q && (
              <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
                Tema: <strong>{incFor.q.tema}</strong> · Pregunta: <strong>{incFor.q.id}</strong> · Tu respuesta: <strong>{incFor.marcada ? String.fromCharCode(64 + incFor.marcada) : "—"}</strong>
              </div>
            )}
            <label style={styles.label} htmlFor="ex-inc-text">Describe el problema</label>
            <textarea id="ex-inc-text" name="incidenciaExamen" style={{ ...styles.input, marginTop: 6 }} value={incText} onChange={(e) => setIncText(e.target.value)} placeholder="Ej.: La opción correcta no coincide / redacción ambigua / error tipográfico…" />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
              <button type="button" style={{ ...styles.btn, background: "#e2e8f0", color: "#0f172a" }} onClick={() => setIncOpen(false)} disabled={sendingInc}>Cancelar</button>
              <button type="button" style={{ ...styles.btn, ...styles.btnPrim }} onClick={() => enviarIncidencia(incFor?.q, incFor?.marcada)} disabled={sendingInc || !incText.trim()}>
                {sendingInc ? "Enviando…" : "Enviar incidencia"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{ position: "fixed", right: 16, bottom: 58, background: "rgba(34,197,94,.1)", color: "#065f46", border: "1px solid rgba(34,197,94,.35)", padding: "8px 12px", borderRadius: 12, zIndex: 3, fontWeight: 700 }}>
          {toast}
        </div>
      )}
    </div>
  );
}
