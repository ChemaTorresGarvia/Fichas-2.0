// src/ImportarExamenes.jsx
import { useState } from "react";
import * as XLSX from "xlsx";
import { normalizarExamenes, mergeExamenes } from "./utils/bancos";

export default function ImportarExamenes() {
  const [modo, setModo] = useState("add");           // add | replace
  const [preview, setPreview] = useState([]);        // solo vista previa (20)
  const [parsedAll, setParsedAll] = useState([]);    // TODAS las filas válidas
  const [errores, setErrores] = useState([]);
  const [okMsg, setOkMsg] = useState("");

  function resetMsgs() { setErrores([]); setOkMsg(""); }

  function onFile(e) {
    resetMsgs();
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const wb = XLSX.read(reader.result, { type: "binary" });
        const rows = leerFilasDeWorkbook(wb); // 🔹 filas crudas de todas las hojas “examen*” o 1ª hoja
        console.debug("[ImportarExamenes] filas leídas del XLSX (todas hojas relevantes):", rows.length);

        const preguntas = normalizarExamenes(rows); // ↪️ NO recorta
        console.debug("[ImportarExamenes] válidas tras normalizar:", preguntas.length);
        if (import.meta?.env?.DEV) {
          const sample = preguntas.slice(0, 3).map(p => ({
            tema: p.tema, dif: p.dificultad, ok: p.correcta, en: p.enunciado?.slice(0,60)
          }));
          console.debug("[ImportarExamenes] sample normalizadas:", sample);
        }

        setParsedAll(preguntas);                 // TODAS
        const warns = [];
        if (preguntas.length === 0) warns.push("No se han encontrado preguntas de examen válidas (necesitan 4 opciones y 'Correcta').");
        setPreview(preguntas.slice(0, 20));      // vista previa
        setErrores(warns);
      } catch (err) {
        setErrores([`Error al leer el archivo: ${err?.message || String(err)}`]);
        setPreview([]);
        setParsedAll([]);
        console.debug("[ImportarExamenes] error parsing:", err);
      }
    };
    reader.readAsBinaryString(file);
  }

  function importar() {
    resetMsgs();
    if (parsedAll.length === 0) {
      setErrores(["No hay preguntas válidas para importar."]);
      return;
    }
    const res = mergeExamenes(parsedAll, modo); // usar TODAS
    console.debug("[ImportarExamenes] tras merge, tamaño en banco:", Array.isArray(res) ? res.length : res);
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
            <label><input type="radio" name="modoE" value="add" checked={modo==="add"} onChange={() => setModo("add")} /> Añadir al banco</label>
            <label><input type="radio" name="modoE" value="replace" checked={modo==="replace"} onChange={() => setModo("replace")} /> Sustituir por completo</label>
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
                    <th>Tema</th><th>Dificultad</th><th>Enunciado</th><th>A</th><th>B</th><th>C</th><th>D</th><th>Correcta</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((q,i)=>(
                    <tr key={i}>
                      <td>{q.tema}</td>
                      <td>{q.dificultad}</td>
                      <td>{q.enunciado}</td>
                      <td>{q.opciones[0]}</td>
                      <td>{q.opciones[1]}</td>
                      <td>{q.opciones[2]}</td>
                      <td>{q.opciones[3]}</td>
                      <td style={{ textAlign:"center" }}>{q.correcta}</td>
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

/* ===== Lectura robusta de hojas ===== */
/**
 * Lee todas las filas de las hojas cuyo nombre contenga "examen".
 * Si no hay ninguna, usa la primera hoja. Fuerza !ref a A1:I10000 para no quedarnos cortos.
 */
function leerFilasDeWorkbook(wb) {
  const nombres = wb.SheetNames || [];
  const candidatas = nombres.filter(n => n && n.toLowerCase().includes("examen"));
  const aLeer = candidatas.length > 0 ? candidatas : [nombres[0]].filter(Boolean);

  const todas = [];
  const MAX_FILAS = 10000; // columnas A..I (ID, Tema, Dificultad, Enunciado, A, B, C, D, Correcta)
  for (let i = 0; i < aLeer.length; i++) {
    const hojaNombre = aLeer[i];
    const ws = wb.Sheets[hojaNombre];
    if (!ws) continue;

    // Fuerza un !ref amplio (evita rangos “cortos” guardados por Excel)
    ws["!ref"] = `A1:I${MAX_FILAS}`;

    const rows = XLSX.utils.sheet_to_json(ws, { defval: "", blankrows: false });
    console.debug(`[ImportarExamenes] hoja usada: ${hojaNombre} | filas XLSX:`, rows.length);
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
