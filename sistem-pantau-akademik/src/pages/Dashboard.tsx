import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type {
  ActiveRole,
  Dosen,
  Jadwal,
  Mahasiswa,
  MataKuliah,
  Nilai,
  ParentAccessToken,
  Prodi,
  Ruang,
  TokenAccessLog,
  Ukt,
  User,
} from '../types/sipadu';
import { getSession, clearSession } from '../services/authService';
import { supabase } from '../lib/supabase';
import { Header } from '../components/common/Header';
import { MahasiswaDashboard } from '../components/mahasiswa/MahasiswaDashboard';
import { OrangTuaDashboard } from '../components/orangtua/OrangTuaDashboard';
import { AdminDashboard } from '../components/admin/AdminDashboard';

// ---------- helper ----------
const byId = <T extends { id: number }>(rows: T[]) =>
  new Map(rows.map((r) => [r.id, r]));

const sqlNow = () => new Date().toISOString().replace('T', ' ').substring(0, 19);

// Token + log akses (hanya dipakai admin). Join dilakukan di sini,
// jadi tidak butuh foreign key di Supabase.
async function fetchTokenData(mhsList: Mahasiswa[]) {
  const [t, l] = await Promise.all([
    supabase.from('parent_access_tokens').select('*').order('id', { ascending: false }),
    supabase.from('token_access_logs').select('*').order('id', { ascending: false }).limit(100),
  ]);
  if (t.error) throw new Error(`parent_access_tokens: ${t.error.message}`);
  if (l.error) throw new Error(`token_access_logs: ${l.error.message}`);

  const mhsMap = byId(mhsList);
  const tokenRows = (t.data ?? []) as ParentAccessToken[];
  const tokenMap = byId(tokenRows);

  const tokens = tokenRows.map((x) => ({ ...x, mahasiswa: mhsMap.get(x.mahasiswa_id) }));
  const logs = ((l.data ?? []) as TokenAccessLog[]).map((x) => ({
    ...x,
    token_preview:
      x.token_preview ?? `${tokenMap.get(x.token_id)?.token.substring(0, 20) ?? '—'}...`,
  }));
  return { tokens, logs };
}

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  const session = getSession();
  const currentRole: ActiveRole = (session?.role as ActiveRole) ?? 'mahasiswa';
  const sessionMahasiswaId = session?.mahasiswaId ?? null;
  const sessionUserId = session?.userId ?? null;

  const [mahasiswaList, setMahasiswaList] = useState<Mahasiswa[]>([]);
  const [selectedMahasiswa, setSelectedMahasiswa] = useState<Mahasiswa | null>(null);
  const [nilaiList, setNilaiList] = useState<Nilai[]>([]);
  const [jadwalList, setJadwalList] = useState<Jadwal[]>([]);
  const [uktList, setUktList] = useState<Ukt[]>([]);
  const [tokens, setTokens] = useState<ParentAccessToken[]>([]);
  const [tokenLogs, setTokenLogs] = useState<TokenAccessLog[]>([]);
  const [userList, setUserList] = useState<User[]>([]);
  const [prodiList, setProdiList] = useState<Prodi[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---------- ambil semua data dari Supabase ----------
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const scoped = currentRole !== 'admin';
        const mhsId = sessionMahasiswaId ?? -1;

        // Mahasiswa & orang tua hanya mengambil data satu mahasiswa
        let qMhs = supabase.from('mahasiswa').select('*').order('nama');
        let qNilai = supabase.from('nilai').select('*');
        let qUkt = supabase.from('ukt').select('*');
        if (scoped) {
          qMhs = qMhs.eq('id', mhsId);
          qNilai = qNilai.eq('mahasiswa_id', mhsId);
          qUkt = qUkt.eq('mahasiswa_id', mhsId);
        }

        const [mhs, mk, dosen, ruang, jadwal, nilai, ukt, prodi] = await Promise.all([
          qMhs,
          supabase.from('mata_kuliah').select('*'),
          supabase.from('dosen').select('*'),
          supabase.from('ruang').select('*'),
          supabase.from('jadwal').select('*'),
          qNilai,
          qUkt,
          supabase.from('prodi').select('*'),
        ]);

        const checks: [string, { error: { message: string } | null }][] = [
          ['mahasiswa', mhs], ['mata_kuliah', mk], ['dosen', dosen],
          ['ruang', ruang], ['jadwal', jadwal], ['nilai', nilai], ['ukt', ukt], ['prodi', prodi],
        ];
        for (const [name, res] of checks) {
          if (res.error) throw new Error(`${name}: ${res.error.message}`);
        }

        const mhsRows = (mhs.data ?? []) as Mahasiswa[];
        const mkMap = byId((mk.data ?? []) as MataKuliah[]);
        const dosenMap = byId((dosen.data ?? []) as Dosen[]);
        const ruangMap = byId((ruang.data ?? []) as Ruang[]);

        const nilaiRows = ((nilai.data ?? []) as Nilai[]).map((n) => ({
          ...n,
          mata_kuliah: mkMap.get(n.mata_kuliah_id),
        }));
        const jadwalRows = ((jadwal.data ?? []) as Jadwal[]).map((j) => ({
          ...j,
          mata_kuliah: mkMap.get(j.mata_kuliah_id),
          dosen: dosenMap.get(j.dosen_id),
          ruang: ruangMap.get(j.ruang_id),
        }));

        let tokenRows: ParentAccessToken[] = [];
        let logRows: TokenAccessLog[] = [];
        let userRows: User[] = [];
        if (!scoped) {
          const td = await fetchTokenData(mhsRows);
          tokenRows = td.tokens;
          logRows = td.logs;
          // password_hash sengaja tidak diambil
          const u = await supabase.from('users').select('id, username, role, created_at');
          if (u.error) throw new Error(`users: ${u.error.message}`);
          userRows = (u.data ?? []) as User[];
        }

        if (cancelled) return;
        setMahasiswaList(mhsRows);
        setSelectedMahasiswa(mhsRows[0] ?? null);
        setNilaiList(nilaiRows);
        setJadwalList(jadwalRows);
        setUktList((ukt.data ?? []) as Ukt[]);
        setProdiList((prodi.data ?? []) as Prodi[]);
        setTokens(tokenRows);
        setTokenLogs(logRows);
        setUserList(userRows);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Gagal mengambil data.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [currentRole, sessionMahasiswaId]);

  const handleLogout = () => {
    clearSession();
    navigate('/login', { replace: true });
  };

  const reloadTokens = async () => {
    try {
      const td = await fetchTokenData(mahasiswaList);
      setTokens(td.tokens);
      setTokenLogs(td.logs);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal memuat ulang token.');
    }
  };

  // ---------- Generate token (FR-01) ----------
  const handleGenerateToken = (mahasiswaId: number): string => {
    const target = mahasiswaList.find((m) => m.id === mahasiswaId) ?? mahasiswaList[0];
    const randomHex =
      Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    const tokenString = `TOKEN-PARENT-${target.nama.split(' ')[0].toUpperCase()}-2026-${randomHex}`;

    // Simpan ke database, lalu muat ulang supaya id token sama dengan di database
    void (async () => {
      const revoked = await supabase
        .from('parent_access_tokens')
        .update({ is_active: false, revoked_at: new Date().toISOString() })
        .eq('mahasiswa_id', mahasiswaId)
        .eq('is_active', true);
      const inserted = await supabase.from('parent_access_tokens').insert({
        mahasiswa_id: mahasiswaId,
        created_by: sessionUserId,
        token: tokenString,
        is_active: true,
      });
      const failure = revoked.error ?? inserted.error;
      if (failure) setError(`Token gagal disimpan: ${failure.message}`);
      await reloadTokens();
    })();

    return tokenString;
  };

  const handleRevokeToken = async (tokenId: number) => {
    const { error: err } = await supabase
      .from('parent_access_tokens')
      .update({ is_active: false, revoked_at: new Date().toISOString() })
      .eq('id', tokenId);
    if (err) {
      setError(`Token gagal dicabut: ${err.message}`);
      return;
    }
    setTokens((prev) =>
      prev.map((t) => (t.id === tokenId ? { ...t, is_active: false, revoked_at: sqlNow() } : t))
    );
  };

  const handleUpdateUktStatus = async (
    uktId: number,
    newStatus: 'lunas' | 'cicilan' | 'belum_bayar'
  ) => {
    const tanggal = newStatus === 'lunas' ? new Date().toISOString().split('T')[0] : null;
    const { error: err } = await supabase
      .from('ukt')
      .update({ status: newStatus, tanggal_bayar: tanggal })
      .eq('id', uktId);
    if (err) {
      setError(`Status UKT gagal disimpan: ${err.message}`);
      return;
    }
    setUktList((prev) =>
      prev.map((u) =>
        u.id === uktId ? { ...u, status: newStatus, tanggal_bayar: tanggal ?? undefined } : u
      )
    );
  };

  const handleSwitchToParentView = (mhs: Mahasiswa) => {
    setSelectedMahasiswa(mhs);
  };

  const studentId = selectedMahasiswa?.id;
  const currentStudentNilai = useMemo(
    () => nilaiList.filter((n) => n.mahasiswa_id === studentId),
    [nilaiList, studentId]
  );
  const currentStudentUkt = useMemo(
    () => uktList.filter((u) => u.mahasiswa_id === studentId),
    [uktList, studentId]
  );

  // ---------- tampilan ----------
  let body: React.ReactNode;
  if (loading) {
    body = <p className="text-slate-600">Memuat data…</p>;
  } else if (!selectedMahasiswa) {
    body = (
      <p className="text-slate-600">
        Belum ada data mahasiswa untuk akun ini. Periksa tabel mahasiswa di Supabase.
      </p>
    );
  } else if (currentRole === 'mahasiswa') {
    body = (
      <MahasiswaDashboard
        mahasiswa={selectedMahasiswa}
        nilaiList={currentStudentNilai}
        jadwalList={jadwalList}
        uktList={currentStudentUkt}
        prodiNama={prodiList.find((p) => p.id === selectedMahasiswa.prodi_id)?.nama}
      />
    );
  } else if (currentRole === 'orang_tua') {
    body = (
      <OrangTuaDashboard
        mahasiswa={selectedMahasiswa}
        nilaiList={currentStudentNilai}
        uktList={currentStudentUkt}
      />
    );
  } else {
    body = (
      <AdminDashboard
        mahasiswaList={mahasiswaList}
        tokens={tokens}
        tokenLogs={tokenLogs}
        nilaiList={nilaiList}
        uktList={uktList}
        userList={userList}
        onGenerateToken={handleGenerateToken}
        onRevokeToken={handleRevokeToken}
        onUpdateUktStatus={handleUpdateUktStatus}
        onSwitchToParentView={handleSwitchToParentView}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {selectedMahasiswa && (
        <Header
          currentRole={currentRole}
          selectedMahasiswa={selectedMahasiswa}
          onLogout={handleLogout}
        />
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {error && (
          <div
            role="alert"
            className="mb-4 rounded border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            {error}
          </div>
        )}
        {body}
        {!selectedMahasiswa && !loading && (
          <button
            type="button"
            onClick={handleLogout}
            className="mt-4 text-sm text-slate-700 underline"
          >
            Keluar
          </button>
        )}
      </main>

      <footer className="bg-white border-t border-slate-200 mt-12 py-6 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-semibold text-slate-700">
            SIPADU (Sistem Pantau Akademik Terpadu) • Implementasi FR-08
          </p>
          <p>Mata Kuliah Rekayasa Perangkat Lunak • UIN Syarif Hidayatullah Jakarta 2026</p>
          <p className="text-[11px] text-slate-400">
            Tim Pengembang: Rasya Vikran Annadief (1251420108), Rizki Mubarok (1251420042), Rasha Arrazi (1251420043), Rayhan Akmal Wibowo (1251420047)
          </p>
        </div>
      </footer>
    </div>
  );
};
