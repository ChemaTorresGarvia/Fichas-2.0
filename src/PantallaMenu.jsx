import { useEffect, useMemo, useState } from "react";
import { traerRacha } from "./utils/racha";
import CircularProgress from "./components/_circle";
import SelectorExamen from "./SelectorExamen";
import Examen from "./Examen";
import SelectorRonda from "./SelectorRonda";
import Repaso from "./Repaso";
import Incidencias from "./Incidencias";
import { EXAMENES } from "./data/examenes";
import { FICHAS } from "./data/fichas";
import ImportarFichas from "./ImportarFichas";
import ImportarExamenes from "./ImportarExamenes";



/** ===== Layout con logo fijo, nombre centrado y marca de agua ===== */
function Layout({ usuario, onSalir, showMenu, onMenu, children }) {
  const userName = usuario?.nombre || usuario?.email || "Usuario";
  return (
    <div style={layoutWrap}>
      {/* Marca de agua */}
      <div style={watermark} aria-hidden />

      {/* Header con logo izq, nombre centro, botones dcha */}
      <div style={headerBar}>
        <div style={headerLeft}>
          <img
            src="/FOE Oposiciones sin fondo.png"
            alt="FOE"
            style={logoHeader}
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
        </div>

        <div style={headerCenter} title={userName}>
          <div style={userNameStyle}>{userName}</div>
        </div>

        <div style={headerRight}>
          {showMenu && (
            <button type="button" style={btn} onClick={onMenu}>
              Menú
            </button>
          )}
          <button
            type="button"
            style={{ ...btn, background: "#ef4444", color: "#fff" }}
            onClick={onSalir}
          >
            Salir
          </button>
        </div>
      </div>

      <div style={content}>{children}</div>
    </div>
  );
}

/** ===== Pantalla principal ===== */
export default function PantallaMenu({ usuario, esAdmin = false, onSalir }) {
  const [fase, setFase] = useState("menu");
  const [sesionExamen, setSesionExamen] = useState({ preguntas: [], cantidad: 0 });
  const [sesionRepaso, setSesionRepaso] = useState({ fichas: [] });

  // ---- Parche: refrescar estadística cuando Repaso emite el evento global ----
  const [refreshTick, setRefreshTick] = useState(0);
  useEffect(() => {
    const handler = () => setRefreshTick((n) => n + 1);
    window.addEventListener("rx-progreso-actualizado", handler);
    return () => window.removeEventListener("rx-progreso-actualizado", handler);
  }, []);
  // ---------------------------------------------------------------------------

  const userKey = (usuario?.email || usuario?.nombre || "anon").trim();

  // Estadística y racha (con fecha LOCAL y clave por usuario)
  const progresoHoy = useMemo(() => calcProgresoHoy(userKey), [userKey, refreshTick]);
  const racha = useMemo(() => traerRacha(userKey), [userKey, refreshTick]);

  // Datos disponibles
  const temasExamen = useMemo(() => Array.from(new Set(EXAMENES.map((x) => x.tema))).sort(), []);
  const temasFichas = useMemo(() => Array.from(new Set(FICHAS.map((x) => x.tema))).sort(), []);

  // Navegación
  const irExamenes = () => setFase("selectorExamen");
  const irFichas = () => setFase("selectorRonda");
  const irIncidencias = () => setFase("incidencias");
  const irImportarFichas = () => setFase("importarFichas");
  const irImportarExamenes = () => setFase("importarExamenes");

  /** ===== Subpantallas ===== */
  if (fase === "selectorExamen") {
    return (
      <Layout usuario={usuario} onSalir={onSalir} showMenu onMenu={() => setFase("menu")}>
        <SelectorExamen
          preguntas={EXAMENES}
          temasDisponibles={temasExamen}
          onIniciar={(lista, n) => {
            console.debug("[PantallaMenu] onIniciar <- del selector | n:", n, "| lista.length:", lista?.length);
          const efectivo = Array.isArray(lista) ? lista.slice(0, Number(n) || lista.length) : [];
          // 👇 logs defensivos para comprobar qué llega
          if (import.meta?.env?.DEV) {
          console.debug("[PantallaMenu] onIniciar -> n:", n, "| lista:", lista?.length, "| efectivo:", efectivo.length);
          }
          setSesionExamen({ preguntas: efectivo, cantidad: efectivo.length });
          setFase("examen");
          }}
          onSalir={() => setFase("menu")}
        />
      </Layout>
    );
  }

  if (fase === "examen") {
    return (
      <Layout usuario={usuario} onSalir={onSalir} showMenu onMenu={() => setFase("selectorExamen")}>
        <Examen
          preguntas={sesionExamen.preguntas}
          cantidad={sesionExamen?.cantidad ?? sesionExamen?.preguntas?.length ?? 10}
          usuario={usuario}
          onSalir={() => setFase("selectorExamen")}
        />
      </Layout>
    );
  }

  if (fase === "selectorRonda") {
    return (
      <Layout usuario={usuario} onSalir={onSalir} showMenu onMenu={() => setFase("menu")}>
      <SelectorRonda
        fichas={FICHAS}
        onRepasoDia={() => {
          // Repaso del día: deja que Repaso calcule su set diario (array vacío está bien)
          if (import.meta?.env?.DEV) console.debug("[PantallaMenu] onRepasoDia");
          setSesionRepaso({ fichas: [] });
          setFase("repaso");
        }}
        onRepasoCustom={(lista) => {
          if (import.meta?.env?.DEV) console.debug("[PantallaMenu] onRepasoCustom | lista:", lista?.length);
          setSesionRepaso({ fichas: Array.isArray(lista) ? lista : [] });
          setFase("repaso");
        }}

       
         
        />
      </Layout>
    );
  }

  if (fase === "repaso") {
    return (
      <Layout usuario={usuario} onSalir={onSalir} showMenu onMenu={() => setFase("selectorRonda")}>
        <Repaso
          fichas={sesionRepaso.fichas}
          usuario={usuario}
          onSalir={() => setFase("selectorRonda")}
        />
      </Layout>
    );
  }

  if (fase === "incidencias") {
    // Solo accesible para admin (usuario no tiene botón para entrar)
    return (
      <Layout usuario={usuario} onSalir={onSalir} showMenu onMenu={() => setFase("menu")}>
        <Incidencias onSalir={() => setFase("menu")} />
      </Layout>
    );
  }

  if (fase === "importarFichas") {
    return (
      <Layout usuario={usuario} onSalir={onSalir} showMenu onMenu={() => setFase("menu")}>
        <h2 style={{ marginTop: 0 }}>Cargar Fichas (admin)</h2>
        <ImportarFichas />
        <button onClick={() => setFase("menu")} style={btn}>Volver al menú</button>
      </Layout>
    );
  }

  if (fase === "importarExamenes") {
    return (
      <Layout usuario={usuario} onSalir={onSalir} showMenu onMenu={() => setFase("menu")}>
        <h2 style={{ marginTop: 0 }}>Cargar Exámenes (admin)</h2>
        <ImportarExamenes />
        <button onClick={() => setFase("menu")} style={btn}>Volver al menú</button>
      </Layout>
    );
  }

  /** ===== Menú principal ===== */
  return (
    <Layout usuario={usuario} onSalir={onSalir}>
      <div style={gridMain}>
        {/* Fila 1: tarjeta grande estadísticas */}
        <div style={{ ...card, gridColumn: "1 / -1" }}>
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>Progreso de hoy</h3>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <CircularProgress percent={progresoHoy.porcentaje} size={140} stroke={12} />
            <div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>
                {progresoHoy.correctasHoy} / {progresoHoy.totalHoy}
              </div>
              <div style={{ color: "#475569" }}>{progresoHoy.porcentaje}% correcto</div>
              <div style={{ marginTop: 8 }}>
                🔥 Racha: <strong>{racha?.racha_actual || 0}</strong> (récord {racha?.racha_record || 0})
              </div>
            </div>
          </div>
        </div>

        {/* Fila 2: dos medias */}
        <div style={card}>
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>Fichas de Repaso</h3>
          <p style={{ marginTop: 0, color: "#475569" }}>Repasa con las fichas del día o elige por temas.</p>
          <button type="button" style={btnPrim} onClick={irFichas}>
            ➜ Ir a Fichas de Repaso
          </button>
        </div>

        <div style={card}>
          <h3 style={{ marginTop: 0, marginBottom: 8 }}>Simulador de Exámenes</h3>
          <p style={{ marginTop: 0, color: "#475569" }}>Examen aleatorio o a la carta.</p>
          <button type="button" style={btnPrim} onClick={irExamenes}>
            ➜ Ir a Simulador de Exámenes
          </button>
        </div>

        {/* Fila admin: solo si esAdmin */}
        {esAdmin && (
          <>
            <div style={card}>
              <h3 style={{ marginTop: 0, marginBottom: 8 }}>Cargar Fichas (admin)</h3>
              <p style={{ marginTop: 0, color: "#475569" }}>Importa fichas (Excel/CSV). Después → Supabase.</p>
              <button type="button" style={btnSec} onClick={irImportarFichas}>
                Cargar Fichas
              </button>
            </div>

            <div style={card}>
              <h3 style={{ marginTop: 0, marginBottom: 8 }}>Cargar Exámenes (admin)</h3>
              <p style={{ marginTop: 0, color: "#475569" }}>Importa exámenes (Excel/CSV). Después → Supabase.</p>
              <button type="button" style={btnSec} onClick={irImportarExamenes}>
                Cargar Exámenes
              </button>
            </div>

            <div style={card}>
              <h3 style={{ marginTop: 0, marginBottom: 8 }}>Incidencias (admin)</h3>
              <p style={{ marginTop: 0, color: "#475569" }}>Consulta y resuelve incidencias reportadas.</p>
              <button type="button" style={{ ...btn, fontWeight: 700 }} onClick={irIncidencias}>
                Ver incidencias
              </button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

/* ======= Utilidades y estilos ======= */

function hoyLocalISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function calcProgresoHoy(userKey) {
  try {
    const storageKey = `progreso_fichas_v1:${String(userKey || "anon").trim()}`;
    const raw = localStorage.getItem(storageKey);
    const data = raw ? JSON.parse(raw) : null;
    if (!data || typeof data !== "object") return { correctasHoy: 0, totalHoy: 0, porcentaje: 0 };

    const today = hoyLocalISO(); // fecha local
    let totalHoy = 0,
      correctasHoy = 0;

    for (const k of Object.keys(data)) {
      const it = data[k];
      if (!it || typeof it !== "object") continue;
      if (it.ultima === today) {
        totalHoy += 1;
        if ((it.aciertos || 0) > 0) correctasHoy += 1;
      }
    }

    const porcentaje = totalHoy ? Math.round((100 * correctasHoy) / totalHoy) : 0;
    return { correctasHoy, totalHoy, porcentaje };
  } catch {
    return { correctasHoy: 0, totalHoy: 0, porcentaje: 0 };
  }
}

const layoutWrap = {
  minHeight: "100vh",
  position: "relative",
  background: "#f7f8fb",
};

const headerBar = {
  position: "sticky",
  top: 0,
  zIndex: 5,
  display: "grid",
  gridTemplateColumns: "auto 1fr auto", // izq (logo) - centro (usuario) - dcha (botones)
  alignItems: "center",
  gap: 12,
  padding: "10px 12px",
  background: "rgba(255,255,255,0.85)",
  backdropFilter: "saturate(120%) blur(6px)",
  borderBottom: "1px solid #e6e9f2",
};

const headerLeft = { display: "flex", alignItems: "center" };
const headerCenter = {
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  textAlign: "center",
  overflow: "hidden",
};
const headerRight = { display: "flex", gap: 8, justifyContent: "flex-end", alignItems: "center" };

const userNameStyle = {
  fontWeight: 700,
  fontSize: 16,
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  overflow: "hidden",
};

const logoHeader = {
  width: 120,
  height: "auto",
  objectFit: "contain",
};

const watermark = {
  position: "fixed",
  inset: 0,
  backgroundImage: "url('/FOE Oposiciones sin fondo.png')",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "center",
  backgroundSize: "min(60vw, 700px)",
  opacity: 0.06,
  pointerEvents: "none",
  zIndex: 0,
};

const content = {
  position: "relative",
  zIndex: 1,
  padding: "16px",
  maxWidth: 1100,
  margin: "0 auto",
};

const gridMain = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 16,
};

const card = {
  padding: 16,
  borderRadius: 16,
  border: "1px solid #e6e9f2",
  background: "white",
  boxShadow: "0 12px 30px rgba(20,22,50,0.08), inset 0 1px 0 rgba(255,255,255,.7)",
  minHeight: 120,
};

const btn = {
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  background: "white",
  cursor: "pointer",
};

const btnPrim = { ...btn, background: "#0ea5e9", color: "white", border: "none", fontWeight: 800 };
const btnSec = { ...btn, background: "#f1f5f9", border: "none", fontWeight: 700 };
