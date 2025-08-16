// src/SelectorRonda.jsx
import { useEffect, useMemo, useState } from "react";
import { getFichasEfectivas } from "./utils/bancos";

/**
 * Props:
 * - fichas: array estático (fallback /data/fichas.js)
 * - onRepasoDia()
 * - onRepasoCustom(fichasSeleccionadas)
 */
export default function SelectorRonda({ fichas = [], onRepasoDia, onRepasoCustom }) {
  // Carga preferente desde LS; si no hay, usa las props
  const leerFichas = () => {
    const res = getFichasEfectivas(fichas || []);
    if (import.meta?.env?.DEV) {
      console.debug("[SelectorRonda] leerFichas -> usado:", Array.isArray(res) ? res.length : 0);
    }
    return res;
  };

  const [todasFichas, setTodasFichas] = useState(() => leerFichas());

  // Releer al importar (evento) y si cambian las props
  useEffect(() => {
    const onUpd = () => setTodasFichas(leerFichas());
    window.addEventListener("rx-bancos-actualizados", onUpd);
    return () => window.removeEventListener("rx-bancos-actualizados", onUpd);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { setTodasFichas(leerFichas()); /* eslint-disable-line */ }, [fichas]);

  // Derivados
  const temasDisponibles = useMemo(
    () => Array.from(new Set((todasFichas || []).map((f) => f.tema).filter(Boolean))),
    [todasFichas]
  );
  const difsDisponibles = useMemo(
    () => Array.from(new Set((todasFichas || []).map((f) => (f.dificultad || "").toLowerCase()).filter(Boolean))),
    [todasFichas]
  );

  // Filtros (multi)
  const [temasSel, setTemasSel] = useState([]);
  const [difsSel, setDifsSel] = useState([]);
  const [cantidad, setCantidad] = useState(20);

  const poolCustom = useMemo(() => {
    let base = [...todasFichas];
    if (temasSel.length) base = base.filter((f) => temasSel.includes(f.tema));
    if (difsSel.length) base = base.filter((f) => difsSel.includes((f.dificultad || "").toLowerCase()));
    return base;
  }, [todasFichas, temasSel, difsSel]);

  const lanzarDia = () => {
    if (!onRepasoDia) {
      if (import.meta?.env?.DEV) console.warn("[SelectorRonda] onRepasoDia no definido");
      return;
    }
    if (import.meta?.env?.DEV) console.debug("[SelectorRonda] click Empezar (día)");
    onRepasoDia();
  };

  const lanzarCustom = () => {
    if (!onRepasoCustom) {
      if (import.meta?.env?.DEV) console.warn("[SelectorRonda] onRepasoCustom no definido");
      return;
    }
    const n = clampCantidad(cantidad, poolCustom.length);
    const lote = shuffle(poolCustom).slice(0, n);
    if (import.meta?.env?.DEV) console.debug("[SelectorRonda] click Empezar específico -> pool:", poolCustom.length, " | n:", n, " | lote:", lote.length);
    onRepasoCustom(lote);
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div>
        <h2 style={{ margin: "0 0 4px" }}>Estas son tus fichas disponibles</h2>
      </div>

      {/* Tu repaso del día pendiente */}
      <div style={bigCard}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>Tu repaso del día pendiente</div>
        <div style={{ color: "#64748b", marginTop: 4 }}>Empieza con tu repaso de fichas diario</div>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
          <button type="button" style={btnPrim} onClick={lanzarDia}>Empezar</button>
        </div>
      </div>

      {/* Repaso específico */}
      <div style={card}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>Repaso específico</div>
        <div style={{ color: "#64748b", marginTop: 4 }}>Elige tu propias fichas de repaso</div>

        {/* Temas (multi) */}
        <div style={{ marginTop: 10 }}>
          <label style={label}>Temas:</label>
          <MultiBox opciones={temasDisponibles} seleccion={temasSel} onChange={setTemasSel} />
        </div>

        {/* Dificultad (multi) */}
        <div style={{ marginTop: 10 }}>
          <label style={label}>Dificultad:</label>
          <MultiBox opciones={difsDisponibles} seleccion={difsSel} onChange={setDifsSel} />
        </div>

        {/* Cantidad */}
        <div style={{ marginTop: 10 }}>
          <label style={label}>Cantidad de fichas:</label>
          <input
            type="number"
            min="1"
            max={Math.max(poolCustom.length, 1)}
            value={cantidad}
            onChange={(e) => setCantidad(parseInt(e.target.value) || 1)}
            style={input}
          />
          <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
            Disponibles con el filtro: <strong>{poolCustom.length}</strong>
            {cantidad > poolCustom.length && <> — se usarán <strong>{poolCustom.length}</strong></>}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <button type="button" style={btnPrim} onClick={lanzarCustom}>Empezar repaso específico</button>
        </div>
      </div>
    </div>
  );
}

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

/* Utils */
function clampCantidad(n, max) {
  const v = Number(n);
  if (!Number.isFinite(v)) return 20;
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

/* Estilos (sin cambios) */
const card = {
  padding: 16,
  borderRadius: 16,
  border: "1px solid #e6e9f2",
  background: "white",
  boxShadow: "0 12px 30px rgba(20,22,50,0.08), inset 0 1px 0 rgba(255,255,255,.7)",
};
const bigCard = { ...card, minHeight: 120 };
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
