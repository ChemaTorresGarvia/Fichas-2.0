// src/SelectorExamen.jsx
import { useEffect, useMemo, useState } from "react";
import { getBancoExamenes } from "./utils/bancos";

/**
 * Props:
 * - preguntas: array estático (fallback /data/examenes.js)
 * - onIniciar(seleccionadas, cantidad)
 */
export default function SelectorExamen({ preguntas = [], onIniciar }) {
  // Preferir banco importado; si no hay, usar props.preguntas
  const leerPreguntas = () => {
    const ls = getBancoExamenes();
    return Array.isArray(ls) && ls.length > 0 ? ls : (preguntas || []);
  };

  const [poolBase, setPoolBase] = useState(() => leerPreguntas());

  // Releer al importar (evento) y si cambian las props
  useEffect(() => {
    const onUpd = () => setPoolBase(leerPreguntas());
    window.addEventListener("rx-bancos-actualizados", onUpd);
    return () => window.removeEventListener("rx-bancos-actualizados", onUpd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { setPoolBase(leerPreguntas()); /* eslint-disable-line */ }, [preguntas]);

  // === Derivados para filtros (temas y dificultades disponibles) ===
  const temasDisponibles = useMemo(
    () => Array.from(new Set((poolBase || []).map(p => p.tema).filter(Boolean))),
    [poolBase]
  );
  const difsDisponibles = useMemo(
    () => Array.from(new Set((poolBase || []).map(p => (p.dificultad || "").toLowerCase()).filter(Boolean))),
    [poolBase]
  );

  // === Estado de filtros (multi igual que en SelectorRonda) ===
  const [temasSel, setTemasSel] = useState([]);     // [] = todos
  const [difsSel, setDifsSel] = useState([]);       // [] = todas
  const [cantidad, setCantidad] = useState(30);     // subimos default

  // Pool filtrado según selección
  const poolFiltrado = useMemo(() => {
    let base = [...poolBase];
    if (temasSel.length) base = base.filter(p => temasSel.includes(p.tema));
    if (difsSel.length) base = base.filter(p => difsSel.includes((p.dificultad || "").toLowerCase()));
    return base;
  }, [poolBase, temasSel, difsSel]);

  // DEBUG: tamaño del pool y cantidad pedida
  useEffect(() => {
    console.debug("[SelectorExamen] poolFiltrado:", poolFiltrado.length, "| cantidad actual:", cantidad);
  }, [poolFiltrado, cantidad]);

  // Iniciar examen con el filtro activo
  const iniciarExamen = () => {
    if (!onIniciar) {
      if (import.meta?.env?.DEV) console.warn("[SelectorExamen] onIniciar no definido");
      return;
    }
    const disponibles = poolFiltrado.length;
    const n = clampCantidad(cantidad, disponibles);          // cap final
    console.debug("[SelectorExamen] click Iniciar -> n:", n, " | disponibles:", disponibles);
    const seleccionadas = shuffle(poolFiltrado).slice(0, n); // preguntas a usar
    onIniciar(seleccionadas, n);                             // 🚀 navegará a examen
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <h2 style={{ margin: 0 }}>Seleccionar examen</h2>

      <div style={card}>
        {/* Temas (multi) */}
        <label style={label}>Temas:</label>
        <MultiBox
          opciones={temasDisponibles}
          seleccion={temasSel}
          onChange={setTemasSel}
        />

        {/* Dificultad (multi) */}
        <div style={{ marginTop: 10 }}>
          <label style={label}>Dificultad:</label>
          <MultiBox
            opciones={difsDisponibles}
            seleccion={difsSel}
            onChange={setDifsSel}
          />
        </div>

        {/* Cantidad */}
        <div style={{ marginTop: 10 }}>
          <label style={label}>Cantidad de preguntas:</label>
          <input
            type="number"
            min="1"
            max={Math.max(poolFiltrado.length, 1)}   // tope visual (no bloquea iniciar)
            value={cantidad}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              const val = Number.isFinite(v) ? v : 1;
              console.debug("[SelectorExamen] onChange cantidad ->", val);
              setCantidad(val);
            }}
            style={input}
          />
          <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
            Disponibles con el filtro: <strong>{poolFiltrado.length}</strong>
            {cantidad > poolFiltrado.length && <> — se usarán <strong>{poolFiltrado.length}</strong></>}
          </div>
        </div>

        <button type="button" style={{ ...btnPrim, marginTop: 12 }} onClick={iniciarExamen}>
          Iniciar examen
        </button>
      </div>
    </div>
  );
}

/* ====== Componentes auxiliares de selección múltiple (idénticos a SelectorRonda) ====== */
function MultiBox({ opciones = [], seleccion = [], onChange }) {
  const toggle = (val) => {
    if (seleccion.includes(val)) onChange(seleccion.filter((v) => v !== val));
    else onChange([...seleccion, val]);
  };
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {opciones.map((op) => (
        <button
          key={op}
          type="button"
          onClick={() => toggle(op)}
          style={{
            padding: "8px 10px",
            borderRadius: 999,
            border: `1px solid ${seleccion.includes(op) ? "#0ea5e9" : "#e2e8f0"}`,
            background: seleccion.includes(op) ? "#0ea5e9" : "white",
            color: seleccion.includes(op) ? "white" : "#0f172a",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          {op}
        </button>
      ))}
      {opciones.length === 0 && <span style={{ color: "#94a3b8" }}>Sin opciones</span>}
    </div>
  );
}

/* ===== Utils ===== */
function clampCantidad(n, max) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 30;
  return Math.max(1, Math.min(v, max || 1));
}
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ===== Estilos (sin cambios de look&feel) ===== */
const card = {
  padding: 16,
  borderRadius: 16,
  border: "1px solid #e6e9f2",
  background: "white",
  boxShadow: "0 12px 30px rgba(20,22,50,0.08), inset 0 1px 0 rgba(255,255,255,.7)",
  display: "flex",
  flexDirection: "column",
  gap: 12,
};
const label = { fontWeight: 600, display: "block", marginBottom: 6 };
const input = { padding: "8px 10px", borderRadius: 8, border: "1px solid #e2e8f0" };
const btnPrim = {
  padding: "10px 12px",
  borderRadius: 10,
  background: "#0ea5e9",
  color: "white",
  border: "none",
  fontWeight: 800,
  cursor: "pointer",
};
