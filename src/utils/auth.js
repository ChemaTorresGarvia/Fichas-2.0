// src/utils/auth.js
import { createClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase = null;
if (URL && KEY) supabase = createClient(URL, KEY);

function authDisponible() {
  return !!supabase;
}

async function enviarResetPassword(email) {
  if (!supabase) return { ok: false, reason: "SUPABASE_OFF" };
  if (!email) return { ok: false, error: new Error("Email requerido") };
  const redirectTo = `${window.location.origin}/reset-password`;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) return { ok: false, error };
  return { ok: true };
}

async function actualizarPassword(nuevaPassword) {
  if (!supabase) return { ok: false, reason: "SUPABASE_OFF" };
  const { data, error } = await supabase.auth.updateUser({ password: nuevaPassword });
  if (error) return { ok: false, error };
  return { ok: true, data };
}

export { authDisponible, enviarResetPassword, actualizarPassword };
