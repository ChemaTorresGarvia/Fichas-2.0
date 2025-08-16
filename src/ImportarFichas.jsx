// src/ImportarFichas.jsx
import { useState } from "react";
import * as XLSX from "xlsx";
import { normalizarFichas, mergeFichas } from "./utils/bancos";

export default function ImportarFichas() {
  const [modo, setModo] = useState("add");        // add | replace
  const [preview, setPreview] = useState([]);     // vista previa (20)
  const [parsedAll, setParsedAll] = useState([]); // TODAS
  const [errores, setErrores] = useState([]);
  const [okMsg, setOkMsg] = useState("");

  const resetMsgs = () => { setErrores([]); setOkMsg(""); };

  function onFile(e) {
    resetMsgs();
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onerror = (err) => {
      console.debug("[ImportarFichas] FileReader error:", err);
      setErrores(["No se ha podido leer el archivo (FileReader)."]);
    };

    reader.onload = () => {
      try {
        const wb = XLSX.read(reader.result, { type: "binary" });
        if (!wb || !wb.SheetNames || wb.SheetNames.length === 0) {
          setErrores(["El libro no contiene hojas."]);
          setPreview([]); setParsedAll([]); return;
        }

        // Lee todas las hojas cuyo nombre contenga "ficha"; si no hay, usa la primera
        const rows = leerFilasFichas(wb);
        console.debug("[ImportarFichas] filas leídas del XLSX (todas hojas relevantes):", rows.length);

        const fichasNorm = normalizarFichas(rows);
        console.debug("[ImportarFichas] válidas tras normalizar:", fichasNorm.length);
        if (import.meta?.env?.DEV) {
          const sample = fichasNorm.slice(0, 3).map(f => ({
            tema: f.tema, dif: f.dificultad, preg: f.pregunta?.slice(0,60)
          }));
          console.debug("[ImportarFichas] sample normalizadas:", sample);
        }

        const warns = [];
        if (fichasNorm.length === 0) {
          warns.push("No se han encontrado fichas válidas (necesitan Pregunta/Respuesta).");
        }

        setParsedAll(fichasNorm);                  // TODAS
        setPreview(fichasNorm.slice(0, 20));       // vista previa
        setErrores(warns);
      } catch (err) {
        console.debug("[ImportarFichas] error al procesar XLSX:", err);
        setErrores([`Error al leer el archivo: ${err?.message || String(err)}`]);
        setPreview([]); setParsedAll([]);
      }
    };

    // Muy importante: binario para evitar problemas con XLSX.read
    reader.readAsBinaryString(file);
  }

  function importar() {
    resetMsgs();
    if (!Array.isArray(parsedAll) || parsedAll.length === 0) {
      setErrores(["No hay fichas válidas para importar."]);
      return;
    }
    const res = mergeFichas(parsedAll, modo);  // usa TODAS
    console.debug("[ImportarFichas] tras merge, tamaño en banco:", Array.isArray(res) ? res.length : res);
    setOkMsg(`Importación completada. Total en banco: ${res.length}`);
  }

  return (
    <div style={wrap}>
      <div style={card}>
        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <input type="file" accept=".xlsx" onChange={onFile} />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <span><strong>Modo:</strong></span>
            <label><input type="radio" name="modoF" value="add" checked={modo==="add"} onChange={() => setModo("add")} /> Añadir al banco</label>
            <label><input type="radio" name="modoF" value="replace" checked={modo==="replace"} onChange={() => setModo("replace")} /> Sustituir por completo</label>
          </div>

          {errores.length > 0 && (
            <div style={errorBox}>{errores.map((e,i)=><div key={i}>• {e}</div>)}</div>
          )}
          {okMsg && <div style={okBox}>{okMsg}</div>}

          <div>
            <div style={{ fontWeight: 800, marginBottom: 6 }}>Vista previa (máx. 20)</div>
            {preview.length === 0 ? (
              <div style={muted}>Sin datos aún.</div>
            ) : (
              <table style={table}>
                <thead>
                  <tr>
                    <th>Tema</th>
                    <th>Dificultad</th>
                    <th>Pregunta</th>
                    <th>Respuesta</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((f,i)=>(
                    <tr key={i}>
                      <td>{f.tema}</td>
                      <td>{f.dificultad}</td>
                      <td>{f.pregunta}</td>
                      <td>{f.respuesta}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
            <button style={btnPrim} onClick={importar}>Importar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ======== Helpers de lectura robusta ======== */
/**
 * Lee todas las filas de hojas cuyo nombre contenga “ficha”.
 * Si no hay, usa la primera hoja. Fuerza !ref a A1:E10000 (ID, Tema, Dificultad, Pregunta/Enunciado, Respuesta).
 */
function leerFilasFichas(wb) {
  const names = wb.SheetNames || [];
  const candidatas = names.filter(n => n && n.toLowerCase().includes("ficha"));
  const aLeer = candidatas.length ? candidatas : [names[0]].filter(Boolean);

  const todas = [];
  const MAX_FILAS = 10000;
  for (const hojaNombre of aLeer) {
    const ws = wb.Sheets[hojaNombre];
    if (!ws) continue;

    // Forzar rango amplio (evita !ref “corto” guardado por Excel)
    ws["!ref"] = `A1:E${MAX_FILAS}`;

    const rows = XLSX.utils.sheet_to_json(ws, { defval: "", blankrows: false });
    console.debug(`[ImportarFichas] hoja usada: ${hojaNombre} | filas:`, rows.length);
    todas.push(...rows);
  }
  return todas;
}

/* ===== Estilos coherentes ===== */
const wrap = { display:"flex", flexDirection:"column", gap:12 };
const card = { padding:16, borderRadius:16, border:"1px solid #e6e9f2", background:"white", boxShadow:"0 12px 30px rgba(20,22,50,0.08), inset 0 1px 0 rgba(255,255,255,.7)" };
const btnPrim = { padding:"10px 12px", borderRadius:10, background:"#0ea5e9", color:"white", border:"none", fontWeight:800, cursor:"pointer" };
const table = { width:"100%", borderCollapse:"collapse" };
const muted = { color:"#64748b" };
const okBox = { background:"rgba(16,185,129,.12)", border:"1px solid rgba(16,185,129,.35)", padding:8, borderRadius:10, color:"#065f46", fontWeight:700 };
const errorBox = { background:"rgba(239,68,68,.08)", border:"1px solid rgba(239,68,68,.35)", padding:8, borderRadius:10, color:"#7f1d1d", fontWeight:700 };
