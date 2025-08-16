// src/ResetPassword.jsx
import { useEffect, useMemo, useState } from "react";
import { authDisponible, enviarResetPassword, actualizarPassword } from "./utils/auth";

export default function ResetPassword({ onSalir }) {
  const disponible = authDisponible();

  // Detectar si venimos desde el email de Supabase con token de recuperación
  const [hash, setHash] = useState("");
  useEffect(() => {
    setHash(window.location.hash || "");
  }, []);
  const enModoRecovery = useMemo(() => {
    const h = (hash || "").toLowerCase();
    return h.includes("type=recovery") || /access_token=/i.test(h);
  }, [hash]);

  return (
    <div style={wrap}>
      <div style={watermark} aria-hidden />
      <div style={card}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
          <img
            src="/FOE Oposiciones sin fondo.png"
            alt="FOE"
            style={{ width: 120, height: "auto", objectFit: "contain" }}
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
          <h2 style={{ margin: 0 }}>Restablecer contraseña</h2>
        </div>

        {!disponible ? (
          <AvisoSupabase />
        ) : enModoRecovery ? (
          <SetNuevaPassword onSalir={onSalir} />
        ) : (
          <SolicitarEnlace onSalir={onSalir} />
        )}
      </div>
    </div>
  );
}

/* =========== Subcomponentes =========== */

function SolicitarEnlace({ onSalir }) {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    if (!email) return;
    setLoading(true);
    const res = await enviarResetPassword(email.trim());
    setLoading(false);
    if (res.ok) setMsg("Te hemos enviado un enlace para restablecer tu contraseña.");
    else if (res.reason === "SUPABASE_OFF") setMsg("Recuperación disponible al activar Supabase.");
    else setMsg(res.error?.message || "No se pudo enviar el email de recuperación.");
  }

  return (
    <>
      <p style={pMuted}>
        Introduce tu correo y te enviaremos un enlace seguro para cambiar tu contraseña.
      </p>
      <form onSubmit={onSubmit} style={form}>
        <label style={label}>
          Correo electrónico
          <input
            type="email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            style={input}
            required
          />
        </label>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
          <button type="button" style={btn} onClick={()=>onSalir?.()}>Volver al login</button>
          <button type="submit" disabled={loading || !email} style={btnPrim}>
            {loading ? "Enviando…" : "Enviar enlace"}
          </button>
        </div>
      </form>
      {msg && <div style={okMsg}>{msg}</div>}
    </>
  );
}

function SetNuevaPassword({ onSalir }) {
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const puede = useMemo(() => pass && pass.length >= 8 && pass === pass2, [pass, pass2]);

  async function onSubmit(e) {
    e.preventDefault();
    setMsg("");
    if (!puede) return;
    setLoading(true);
    const res = await actualizarPassword(pass);
    setLoading(false);
    if (res.ok) {
      setMsg("Contraseña actualizada. Ya puedes iniciar sesión.");
    } else if (res.reason === "SUPABASE_OFF") {
      setMsg("Recuperación disponible al activar Supabase.");
    } else {
      setMsg(res.error?.message || "No se pudo actualizar la contraseña.");
    }
  }

  return (
    <>
      <p style={pMuted}>
        Escribe tu nueva contraseña. Debe tener al menos 8 caracteres.
      </p>
      <form onSubmit={onSubmit} style={form}>
        <label style={label}>
          Nueva contraseña
          <input type="password" value={pass} onChange={(e)=>setPass(e.target.value)} style={input} minLength={8} required />
        </label>
        <label style={label}>
          Repetir contraseña
          <input type="password" value={pass2} onChange={(e)=>setPass2(e.target.value)} style={input} minLength={8} required />
        </label>
        <div style={{ display:"flex", justifyContent:"flex-end", gap:8 }}>
          <button type="button" style={btn} onClick={()=>onSalir?.()}>Volver al login</button>
          <button type="submit" disabled={!puede || loading} style={btnPrim}>
            {loading ? "Guardando…" : "Guardar contraseña"}
          </button>
        </div>
      </form>
      {msg && <div style={okMsg}>{msg}</div>}
    </>
  );
}

function AvisoSupabase() {
  return (
    <div style={warnBox}>
      <div style={{ fontWeight: 800, marginBottom: 6 }}>Configuración pendiente</div>
      <div>
        Esta pantalla quedará activa cuando se configure Supabase:
        <ul style={{ marginTop: 6 }}>
          <li>Variables <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_ANON_KEY</code>.</li>
          <li>Auth → URL settings: permitir <code>/reset-password</code> (dev y prod).</li>
          <li>SMTP configurado para enviar correos.</li>
        </ul>
      </div>
    </div>
  );
}

/* =========== Estilos =========== */
const wrap = { minHeight: "100vh", display: "grid", placeItems: "center", background: "#f7f8fb", position: "relative", padding: 16 };
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
const card = {
  width: "min(92vw, 540px)",
  background: "white",
  border: "1px solid #e6e9f2",
  borderRadius: 20,
  padding: 20,
  boxShadow: "0 12px 30px rgba(20,22,50,0.08), inset 0 1px 0 rgba(255,255,255,.7)",
  position: "relative",
  zIndex: 1,
};
const form = { display: "grid", gap: 10, marginTop: 8 };
const label = { fontWeight: 600, fontSize: 14 };
const input = { width: "100%", padding: "10px 12px", borderRadius: 10, border: "1px solid #e2e8f0" };
const btn = { padding: "10px 12px", borderRadius: 10, border: "1px solid #e2e8f0", background: "white", cursor: "pointer", fontWeight: 700 };
const btnPrim = { padding: "10px 12px", borderRadius: 10, background: "#0ea5e9", color: "white", border: "none", fontWeight: 800, cursor: "pointer" };
const pMuted = { color: "#475569", marginTop: 6 };
const okMsg = { marginTop: 10, background: "rgba(16,185,129,.12)", border: "1px solid rgba(16,185,129,.35)", padding: 8, borderRadius: 10, color: "#065f46", fontWeight: 700 };
const warnBox = { background: "rgba(234,179,8,.12)", border: "1px solid rgba(234,179,8,.35)", padding: 10, borderRadius: 12, color: "#713f12" };
