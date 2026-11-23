/**
 * authService.ts
 * Autentikasi custom menggunakan tabel public.users dan public.parent_access_tokens.
 * TIDAK menggunakan Supabase Auth (supabase.auth.*) sama sekali.
 */
import { supabase } from '../lib/supabase';

export type SessionRole = 'mahasiswa' | 'admin' | 'orang_tua';

export interface SipaduSession {
  userId: number | null;        // id dari tabel users (null untuk orang tua)
  role: SessionRole;
  username: string;
  mahasiswaId: number | null;   // id mahasiswa yang terkait (atau yang dipantau orang tua)
}

const SESSION_KEY = 'sipadu_session';

// =============================================
// Simpan & ambil session dari localStorage
// =============================================

export function saveSession(session: SipaduSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession(): SipaduSession | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SipaduSession;
  } catch {
    return null;
  }
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

// =============================================
// Login Mahasiswa / Admin
// Memeriksa username + password di tabel users
// =============================================

export async function loginWithPassword(
  username: string,
  password: string
): Promise<{ success: true; session: SipaduSession } | { success: false; error: string }> {
  if (!username.trim() || !password.trim()) {
    return { success: false, error: 'Username dan kata sandi tidak boleh kosong.' };
  }

  // Query tabel users berdasarkan username
  const { data: user, error } = await supabase
    .from('users')
    .select('id, username, password_hash, role')
    .eq('username', username.trim())
    .maybeSingle();

  if (error) {
    console.error('DB error:', error);
    return { success: false, error: 'Terjadi kesalahan pada server. Coba lagi.' };
  }

  if (!user) {
    return { success: false, error: 'Username tidak ditemukan.' };
  }

  // Verifikasi password — untuk prototipe ini kita bandingkan plaintext dulu.
  // Di produksi, gunakan bcrypt verify di server-side / Edge Function.
  const passwordMatch = password === user.password_hash || await verifyPassword(password, user.password_hash);

  if (!passwordMatch) {
    return { success: false, error: 'Kata sandi salah.' };
  }

  // Kalau mahasiswa, ambil juga mahasiswa_id-nya
  let mahasiswaId: number | null = null;
  if (user.role === 'mahasiswa') {
    const { data: mhs } = await supabase
      .from('mahasiswa')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    mahasiswaId = mhs?.id ?? null;
  }

  const session: SipaduSession = {
    userId: user.id,
    role: user.role as SessionRole,
    username: user.username,
    mahasiswaId,
  };

  saveSession(session);
  return { success: true, session };
}

// =============================================
// Login Orang Tua menggunakan token
// Memeriksa token di tabel parent_access_tokens
// =============================================

export async function loginWithToken(
  token: string
): Promise<{ success: true; session: SipaduSession } | { success: false; error: string }> {
  if (!token.trim()) {
    return { success: false, error: 'Token tidak boleh kosong.' };
  }

  // Cari token yang aktif di tabel parent_access_tokens
  const { data: tokenRow, error } = await supabase
    .from('parent_access_tokens')
    .select('id, mahasiswa_id, is_active, revoked_at, mahasiswa(nim, nama)')
    .eq('token', token.trim())
    .maybeSingle();

  if (error) {
    console.error('DB error:', error);
    return { success: false, error: 'Terjadi kesalahan pada server. Coba lagi.' };
  }

  if (!tokenRow) {
    return { success: false, error: 'Token tidak valid atau tidak ditemukan.' };
  }

  if (!tokenRow.is_active || tokenRow.revoked_at) {
    return { success: false, error: 'Token ini sudah tidak aktif atau telah dicabut oleh admin.' };
  }

  // Catat log akses token (fire-and-forget, abaikan error)
  try {
    await supabase.from('token_access_logs').insert({
      token_id: tokenRow.id,
      ip_address: '0.0.0.0',
      user_agent: navigator.userAgent,
      status: 'success',
    });
  } catch { /* abaikan */ }

  // Update last_used_at pada token
  try {
    await supabase
      .from('parent_access_tokens')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', tokenRow.id);
  } catch { /* abaikan */ }

  const mhs = tokenRow.mahasiswa as any;
  const session: SipaduSession = {
    userId: null,
    role: 'orang_tua',
    username: `Orang Tua dari ${mhs?.nama ?? 'Mahasiswa'}`,
    mahasiswaId: tokenRow.mahasiswa_id,
  };

  saveSession(session);
  return { success: true, session };
}

// =============================================
// Verifikasi password sederhana (plaintext untuk prototipe)
// Jika password_hash di DB berbentuk bcrypt ($2a$...), ini selalu false
// dan login bisa tetap jalan dengan password == password_hash fallback di atas
// =============================================
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // Untuk prototipe: bandingkan langsung
  // Di produksi: panggil Supabase Edge Function yang menjalankan bcrypt.compare
  return password === hash;
}
