import { useEffect, useState } from "react";
// Si ya tienes PantallaMenu.jsx, lo usamos.
// Si no, de momento puedes comentar esta línea y después la activas.
import PantallaMenu from "./PantallaMenu.jsx";
// ⬇️ nuevos imports
//import ImportarFichas from "./ImportarFichas";
//import ImportarExamenes from "./ImportarExamenes";
import * as IF from "./ImportarFichas";
import * as IE from "./ImportarExamenes";
// Al principio de App.jsx
import ResetPassword from "./ResetPassword";
import * as auth from "./utils/auth";



// Normalizamos por si el archivo exporta default o export nombrado
const ImportarFichas = IF.default ?? IF.ImportarFichas;
const ImportarExamenes = IE.default ?? IE.ImportarExamenes;

/**
 * Reglas rápidas:
 * - En producción, la validación vendrá de Supabase (auth) y el rol lo obtendremos desde la BD / JWT.
 * - Ahora, en modo pre‑Supabase, validamos contra un pequeño diccionario local de prueba.
 * - Persistimos sesión mínima en localStorage para no perder el estado al refrescar.
 */

const USUARIOS_DEMO = {
  "admin@example.com": { password: "admin123", rol: "admin", nombre: "Administrador" },
  "user@example.com": { password: "user123", rol: "user", nombre: "Usuario" },
  "chema@example.com": { password: "chema", rol: "admin", nombre: "Chema" },
  "pilar@example.com": { password: "pi", rol: "admin", nombre: "Pi"},
  "luis@example.com": {password: "luis", rol: "user", nombre: "luis"},
  "guille@example.com": {password: "guille", rol: "admin", nombre: "Guille"},
  "angelica@example.com": {password: "angelica", rol: "user", nombre: "Angelica"},
  "romualdo@example.com": {password: "romualdo", rol: "admin", nombre: "Romualdo"},
};

export default function App() {
  const [fase, setFase] = useState("login"); // 'login' | 'menu'
  const [usuario, setUsuario] = useState(null);

  // Rehidratar sesión si existe
  useEffect(() => {
    const raw = localStorage.getItem("rx_usuario");
    if (raw) {
      try {
        const u = JSON.parse(raw);
        setUsuario(u);
        setFase("menu");
      } catch {
        localStorage.removeItem("rx_usuario");
      }
    }
  }, []);

  const handleLogin = async ({ email, password }) => {
  // Si hay Supabase disponible y tenemos la función, probamos login real
  if (auth.authDisponible?.() && auth.loginWithPassword) {
    const res = await auth.loginWithPassword(email, password);
    if (!res.ok) {
      return { ok: false, msg: res.error?.message || "No se pudo iniciar sesión" };
    }
    // Rol provisional (hasta perfiles RLS): por email en env o usuario por defecto
    const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || "")
      .split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
    const rol = adminEmails.includes((email || "").toLowerCase()) ? "admin" : "usuario";
    const u = { email, rol, nombre: res.user?.user_metadata?.name || email };
    setUsuario(u);
    localStorage.setItem("rx_usuario", JSON.stringify(u));
    setFase("menu");
    return { ok: true };
  }

  // Fallback: usuarios demo (tu lógica de siempre)
  const found = USUARIOS_DEMO[email];
  if (!found || found.password !== password) {
    return { ok: false, msg: "Credenciales no válidas" };
  }
  const u = { email, rol: found.rol, nombre: found.nombre };
  setUsuario(u);
  localStorage.setItem("rx_usuario", JSON.stringify(u));
  setFase("menu");
  return { ok: true };
};


const handleLogout = async () => {
  if (auth.authDisponible?.() && auth.logout) {
    await auth.logout();
  }
  setUsuario(null);
  localStorage.removeItem("rx_usuario");
  setFase("login");
};
//Salta a ResetPassword
  if (fase === "reset") {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#f7f8fb", position: "relative" }}>
      {/* Marca de agua como en login */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: "url('/FOE Oposiciones sin fondo.png')",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center",
          backgroundSize: "min(60vw, 700px)",
          opacity: 0.06,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div
        style={{
          width: "min(92vw, 520px)",
          background: "white",
          border: "1px solid #e6e9f2",
          borderRadius: 20,
          padding: 20,
          boxShadow: "0 12px 30px rgba(20,22,50,0.08), inset 0 1px 0 rgba(255,255,255,.7)",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
          <img
            src="/FOE Oposiciones sin fondo.png"
            alt="FOE"
            style={{ width: 120, height: "auto", objectFit: "contain" }}
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
          <h2 style={{ margin: 0 }}>Restablecer contraseña</h2>
        </div>

        {/* Pantalla de reseteo */}
        <ResetPassword />

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
          <button
            type="button"
            onClick={() => setFase("login")}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              background: "white",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            Volver al login
          </button>
        </div>
      </div>
    </div>
  );
}



  if (fase === "login") {
  return <Login onLogin={handleLogin} onReset={() => setFase("reset")} />;
  }


  // Fase 'menu'
  return (
    <PantallaMenu
      usuario={usuario}
      esAdmin={usuario?.rol === "admin"}
      onSalir={handleLogout}
      // Puedes pasar más props si tu PantallaMenu las necesita
      setFase={setFase}
    />
  );
}

function Login({ onLogin, onReset }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  // Para centrar: contenedor 100vh, flex, columna, gap; estilo simple y limpio
  const wrap = {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f7f8fb",
    padding: "24px",
  };
  const card = {
    width: "100%",
    maxWidth: 420,
    background: "#fff",
    borderRadius: "16px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.08)",
    padding: "28px",
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  };
  const titulo = {
    textAlign: "center",
    fontSize: "18px",
    fontWeight: 600,
    color: "#111827",
    lineHeight: 1.3,
  };
  const input = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
    outline: "none",
    fontSize: "14px",
  };
  const btn = {
    width: "100%",
    padding: "12px 14px",
    borderRadius: "12px",
    border: "none",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "14px",
    background: "#2563eb", // azul vivo para acción principal
    color: "#fff",
  };
  const help = {
    fontSize: "12px",
    color: "#6b7280",
    textAlign: "center",
  };
  const err = {
    fontSize: "13px",
    color: "#b91c1c",
    textAlign: "center",
    minHeight: "18px",
  };

  // Logo con fallback
  const logoStyle = { width: 120, height: "auto", margin: "0 auto" };
  const [logoSrc, setLogoSrc] = useState("/FOE Oposiciones sin fondo.png");
  const handleLogoError = () => setLogoSrc("/FOE BASICO.png");

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    const { ok, msg } = await onLogin({ email: email.trim(), password });
    if (!ok) setMsg(msg || "No se pudo iniciar sesión");
  };

  return (
    <div style={wrap}>
      <div style={card}>
        <img
          src={logoSrc}
          alt="FOE Oposiciones"
          style={logoStyle}
          onError={handleLogoError}
        />
        <div style={titulo}>
          Bienvenido/a a la Plataforma de Fichas y Exámenes
        </div>

        <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            style={input}
            type="email"
            placeholder="Correo electrónico"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            required
          />
          <input
            style={input}
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <button style={btn} type="submit">Entrar</button>
          <div style={{ marginTop: 8 }}>
          <button
           type="button"
           style={{ background: "none", border: "none", color: "#0ea5e9", cursor: "pointer" }}
           onClick={() => onReset?.()}
           >
           ¿Olvidaste tu contraseña?
          </button>
        </div>

        </form>

        <div style={err}>{msg}</div>
        <div style={help}>
          <div><strong>Version 2.0</strong></div>
          <div>Desarrollada por FOEXAM</div>
          <div>Todos los derechos reservados</div>
          <div>Más información en:</div>
          <div>www.foexam.es  @foexam</div>
        </div>
      </div>
    </div>
  );
}
