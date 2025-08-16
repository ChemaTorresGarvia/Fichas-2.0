import { useEffect, useMemo, useState } from "react";
import {
  getIncidencias,
  setIncidencias,
  updateIncidencia,
  // No dependemos de delete/clear para evitar mismatches
} from "./utils/incidencias";

/**
 * Incidencias (solo admin)
 * - Filtros por tipo y estado, búsqueda, contadores y orden conmutable
 * - Export CSV (;) y borrar todas con confirmación
 * - Acciones por fila: revisar, resolver, volver a pendiente, borrar
 */
export default function Incidencias({ esAdmin = true }) {
  const [items, setItems] = useState(() => getIncidencias());
  const [confirmWipe, setConfirmWipe] = useState(false);

  // Filtros
  const [fTipo, setFTipo] = useState("todos"); // todos|ficha|examen
  const [fEstado, setFEstado] = useState("todos"); // todos|pendiente|revisada|resuelta
  const [q, setQ] = useState("");
  const [orden, setOrden] = useState("asc"); // asc = antiguas primero, desc = recientes primero

  // Sync con otros tabs/partes de la app
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === "incidencias_v1") setItems(getIncidencias());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Persistir al modificar localmente
  useEffect(() => {
    setIncidencias(items);
  }, [items]);

  // Derivados
  const counts = useMemo(() => {
    const c = {
      total: items.length,
      ficha: 0,
      examen: 0,
      pendiente: 0,
      revisada: 0,
      resuelta: 0,
    };
    for (const it of items) {
      if (it.tipo === "examen") c.examen++;
      else c.ficha++;
      const st = (it.estado || "pendiente").toLowerCase();
      if (st === "pendiente") c.pendiente++;
      if (st === "revisada") c.revisada++;
      if (st === "resuelta") c.resuelta++;
    }
    return c;
  }, [items]);

  const ordenadas = useMemo(() => {
    const base = [...items].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
    return orden === "asc" ? base : base.reverse();
  }, [items, orden]);

  const filtradas = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return ordenadas.filter((it) => {
      if (fTipo !== "todos" && it.tipo !== fTipo) return false;
      if (fEstado !== "todos" && (it.estado || "pendiente") !== fEstado) return false;
      if (!qq) return true;

      // Campos buscables
      const bloques = [
        it.usuario || it.user_id || "",
        it.pregunta || "",
        it.respuesta || "",
        it.comentario || it.detalle || it.texto || "",
        (it.tema || ""),
        ...(Array.isArray(it.opciones) ? it.opciones : []),
      ];
      return bloques.join(" | ").toLowerCase().includes(qq);
    });
  }, [ordenadas, fTipo, fEstado, q]);

  if (!esAdmin) {
    return (
      <div style={wrap}>
        <h2 style={{ marginTop: 0 }}>Incidencias</h2>
        <div style={card}>Acceso restringido. Solo disponible para administradores.</div>
      </div>
    );
  }

  /* ===== Acciones ===== */

  const marcarEstado = (id, estado) => {
    updateIncidencia(id, { estado });
    setItems(getIncidencias());
  };

  const borrarUno = (id) => {
    const next = getIncidencias().filter((x) => x.id !== id);
    setIncidencias(next);
    setItems(next);
  };

  const borrarTodas = () => {
    if (!confirmWipe) {
      setConfirmWipe(true);
      return;
    }
    setIncidencias([]);
    setItems([]);
    setConfirmWipe(false);
  };

  /* ====== B) EXPORT CSV — con respuesta_correcta (índice + texto) ====== */
  const exportCSV = () => {
    const header = [
      "id", "tipo", "fecha_hora", "usuario",
      "pregunta", "respuesta",
      "opcion_A", "opcion_B", "opcion_C", "opcion_D",
      "respuesta_usuario", "respuesta_correcta", "respuesta_correcta_texto",
      "comentario", "estado",
    ];
    const rows = filtradas.map((it) => {
      const o = Array.isArray(it.opciones) ? it.opciones : [];

      const rc =
        it.respuesta_correcta != null ? Number(it.respuesta_correcta)
        : (it.respuesta_correcta_texto ? (() => {
            const idx = o.findIndex((x) => x === it.respuesta_correcta_texto);
            return idx >= 0 ? idx + 1 : null;
          })() : null);

      const rcTexto =
        it.respuesta_correcta_texto || (rc != null ? (o[rc - 1] || "") : "");

      const row = [
        it.id || "",
        it.tipo || "",
        it.fecha || "",
        it.usuario || it.user_id || "",
        safe(it.pregunta),
        safe(it.respuesta ?? ""),
        safe(o[0] ?? ""),
        safe(o[1] ?? ""),
        safe(o[2] ?? ""),
        safe(o[3] ?? ""),
        it.respuesta_usuario != null ? String(it.respuesta_usuario) : "",
        rc != null ? String(rc) : "",
        safe(rcTexto),
        safe(it.comentario || it.detalle || it.texto || ""),
        it.estado || "pendiente",
      ];
      return row.map(csvField).join(";");
    });

    const csv = [header.join(";"), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const fechaNombre = new Date().toISOString().replace(/[:]/g, "-").slice(0, 19);
    a.href = url;
    a.download = `incidencias_${fechaNombre}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ===== UI ===== */

  return (
    <div style={wrap}>
      <h2 style={{ marginTop: 0 }}>Incidencias</h2>

      {/* Barra de controles */}
      <div style={{ ...card, display: "grid", gap: 10 }}>
        {/* Contadores */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Chip label={`Total ${counts.total}`} />
          <Chip label={`Fichas ${counts.ficha}`} tone="info" active={fTipo === "ficha"} onClick={() => setFTipo(fTipo === "ficha" ? "todos" : "ficha")} />
          <Chip label={`Exámenes ${counts.examen}`} tone="info" active={fTipo === "examen"} onClick={() => setFTipo(fTipo === "examen" ? "todos" : "examen")} />
          <Chip label={`Pendientes ${counts.pendiente}`} tone="warn" active={fEstado === "pendiente"} onClick={() => setFEstado(fEstado === "pendiente" ? "todos" : "pendiente")} />
          <Chip label={`Revisadas ${counts.revisada}`} tone="muted" active={fEstado === "revisada"} onClick={() => setFEstado(fEstado === "revisada" ? "todos" : "revisada")} />
          <Chip label={`Resueltas ${counts.resuelta}`} tone="ok" active={fEstado === "resuelta"} onClick={() => setFEstado(fEstado === "resuelta" ? "todos" : "resuelta")} />
        </div>

        {/* Buscador + orden + acciones globales */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="search"
            placeholder="Buscar por usuario, pregunta, comentario, tema u opción…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={input}
          />
          <button
            style={btn}
            onClick={() => setOrden((o) => (o === "asc" ? "desc" : "asc"))}
            title="Cambiar orden"
          >
            {orden === "asc" ? "Antiguas primero" : "Recientes primero"}
          </button>

          <div style={{ flex: 1 }} />

          <button style={btn} onClick={exportCSV}>Exportar CSV</button>
          {!confirmWipe ? (
            <button style={{ ...btn, ...btnWarn }} onClick={borrarTodas}>Borrar todas</button>
          ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ color: "#b45309", fontWeight: 700 }}>¿Seguro?</span>
              <button style={{ ...btn, ...btnDanger }} onClick={borrarTodas}>Sí, borrar todo</button>
              <button style={btn} onClick={() => setConfirmWipe(false)}>Cancelar</button>
            </div>
          )}
        </div>
      </div>

      {/* Listado */}
      {filtradas.length === 0 ? (
        <div style={card}>No hay incidencias que cumplan el filtro.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {filtradas.map((it) => (
            <div key={it.id} style={card}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <BadgeTipo tipo={it.tipo} />
                  <span style={{ color: "#475569", fontSize: 13 }}>{fmtFecha(it.fecha)}</span>
                </div>
                <div style={{ fontSize: 12, color: "#64748b" }}>
                  Estado: <strong>{(it.estado || "pendiente").toUpperCase()}</strong>
                </div>
              </div>

              <div style={{ marginTop: 6, color: "#334155", fontSize: 13 }}>
                <div><strong>Usuario:</strong> {it.usuario || it.user_id || "—"}</div>
                <div style={{ marginTop: 4 }}>
                  <strong>Pregunta:</strong> {it.pregunta || "—"}
                </div>

                {it.tipo === "ficha" && (
                  <>
                    <div style={{ marginTop: 4 }}>
                      <strong>Respuesta (ficha):</strong> {it.respuesta ?? "—"}
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <strong>Comentario:</strong> {it.comentario || it.detalle || it.texto || "—"}
                    </div>
                  </>
                )}

                {it.tipo === "examen" && (
                  <>
                    <div style={{ marginTop: 6 }}>
                      <strong>Opciones:</strong>
                      <ul style={{ margin: "6px 0 0 16px" }}>
                        {(it.opciones || []).slice(0, 4).map((op, i) => (
                          <li key={i}><strong>{String.fromCharCode(65 + i)}.</strong> {op}</li>
                        ))}
                      </ul>
                    </div>
                    <div style={{ marginTop: 4 }}>
                      <strong>Respuesta elegida (1-4):</strong>{" "}
                      {it.respuesta_usuario != null ? String(it.respuesta_usuario) : "—"}
                    </div>

                    {/* ====== A) MOSTRAR RESPUESTA CORRECTA — índice + texto con fallback ====== */}
                    {(() => {
                      const o = Array.isArray(it.opciones) ? it.opciones : [];
                      const rc =
                        it.respuesta_correcta != null ? Number(it.respuesta_correcta)
                        : (it.respuesta_correcta_texto ? (() => {
                            const idx = o.findIndex((x) => x === it.respuesta_correcta_texto);
                            return idx >= 0 ? idx + 1 : null;
                          })() : null);

                      const rcTexto =
                        it.respuesta_correcta_texto || (rc != null ? (o[rc - 1] || "") : "");

                      return (
                        <div style={{ marginTop: 4 }}>
                          <strong>Respuesta correcta (1-4):</strong>{" "}
                          {rc != null ? `${rc} — ${rcTexto}` : "—"}
                        </div>
                      );
                    })()}

                    <div style={{ marginTop: 4 }}>
                      <strong>Comentario:</strong> {it.comentario || it.detalle || it.texto || "—"}
                    </div>
                  </>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                <button style={btn} onClick={() => marcarEstado(it.id, "revisada")}>Marcar revisada</button>
                <button style={btnOk} onClick={() => marcarEstado(it.id, "resuelta")}>Marcar resuelta</button>
                <button style={btn} onClick={() => marcarEstado(it.id, "pendiente")}>Volver a pendiente</button>
                <button style={{ ...btn, ...btnDanger }} onClick={() => borrarUno(it.id)}>Borrar</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ====== Subcomponentes simples (chips/badges) ====== */

function Chip({ label, active, onClick, tone = "default" }) {
  const tones = {
    default: { bg: "#f1f5f9", border: "#e2e8f0", color: "#0f172a" },
    info: { bg: "#eff6ff", border: "#bfdbfe", color: "#1e3a8a" },
    warn: { bg: "#fffbeb", border: "#fde68a", color: "#92400e" },
    ok: { bg: "#ecfdf5", border: "#a7f3d0", color: "#065f46" },
  };
  const t = tones[tone] || tones.default;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        border: `1px solid ${t.border}`,
        background: active ? t.color : t.bg,
        color: active ? "white" : t.color,
        fontWeight: 800,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function BadgeTipo({ tipo }) {
  const isExam = tipo === "examen";
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 8px",
        borderRadius: 999,
        fontWeight: 800,
        fontSize: 12,
        background: isExam ? "rgba(14,165,233,.12)" : "rgba(99,102,241,.12)",
        color: isExam ? "#075985" : "#3730a3",
        border: `1px solid ${isExam ? "rgba(14,165,233,.35)" : "rgba(99,102,241,.35)"}`,
      }}
    >
      {isExam ? "Examen" : "Ficha"}
    </span>
  );
}

/* ===== Utils de presentación / CSV ===== */

function safe(v) {
  if (v == null) return "";
  return String(v);
}
function csvField(v) {
  const s = String(v ?? "");
  if (s.includes(";") || s.includes("\n") || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
function fmtFecha(iso) {
  try {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yy = d.getFullYear();
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${dd}/${mm}/${yy} ${hh}:${mi}`;
  } catch {
    return iso || "";
  }
}

/* ===== Estilos coherentes con la app ===== */

const wrap = { display: "flex", flexDirection: "column", gap: 12 };
const card = {
  padding: 16,
  borderRadius: 16,
  border: "1px solid #e6e9f2",
  background: "white",
  boxShadow: "0 12px 30px rgba(20,22,50,0.08), inset 0 1px 0 rgba(255,255,255,.7)",
};
const btn = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "white",
  cursor: "pointer",
  fontWeight: 700,
};
const btnOk = { ...btn, background: "#10b981", color: "white", border: "none" };
const btnWarn = { ...btn, background: "#f59e0b", color: "white", border: "none" };
const btnDanger = { ...btn, background: "#ef4444", color: "white", border: "none" };
const input = {
  minWidth: 260,
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  outline: "none",
};
