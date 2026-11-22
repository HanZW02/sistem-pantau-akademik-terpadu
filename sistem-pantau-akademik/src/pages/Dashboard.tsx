import React, { useState, useEffect, useMemo } from 'react';
import type {
  ActiveRole,
  Mahasiswa,
  ParentAccessToken,
  TokenAccessLog,
  Ukt,
  Nilai,
  Jadwal,
  User,
} from '../types/sipadu';
import {
  checkSupabaseConnection,
  getMahasiswaList,
  getNilaiList,
  getJadwalList,
  getUktList,
  getParentTokens,
  getTokenLogs,
  getUsersList,
  generateParentTokenDb,
  revokeParentTokenDb,
  updateUktStatusDb,
} from '../services/academicService';
import { Header } from '../components/common/Header';
import { MahasiswaDashboard } from '../components/mahasiswa/MahasiswaDashboard';
import { OrangTuaDashboard } from '../components/orangtua/OrangTuaDashboard';
import { AdminDashboard } from '../components/admin/AdminDashboard';

// Fallback initial Mahasiswa in case database has not loaded or is empty
const defaultMahasiswa: Mahasiswa = {
  id: 1,
  nim: '1251420108',
  nama: 'Rasya Vikran Annadief',
  prodi_id: 1,
  angkatan: 2025,
  status: 'aktif',
  dosen_pa: 'Prof. Dr. Ir. M. Hatta, M.Kom',
};

export const Dashboard: React.FC = () => {
  // Global Active Role state (Mahasiswa, Orang Tua, Admin)
  const [currentRole, setCurrentRole] = useState<ActiveRole>('mahasiswa');

  // Supabase connection state
  const [isDbConnected, setIsDbConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Selected Mahasiswa Target
  const [selectedMahasiswa, setSelectedMahasiswa] = useState<Mahasiswa>(defaultMahasiswa);

  // Reactive State (Loaded 100% directly from Supabase PostgreSQL)
  const [mahasiswaList, setMahasiswaList] = useState<Mahasiswa[]>([]);
  const [tokens, setTokens] = useState<ParentAccessToken[]>([]);
  const [tokenLogs, setTokenLogs] = useState<TokenAccessLog[]>([]);
  const [nilaiList, setNilaiList] = useState<Nilai[]>([]);
  const [jadwalList, setJadwalList] = useState<Jadwal[]>([]);
  const [uktList, setUktList] = useState<Ukt[]>([]);
  const [userList, setUserList] = useState<User[]>([]);

  // Load data on component mount from Supabase
  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const { connected } = await checkSupabaseConnection();
        setIsDbConnected(connected);

        const [mhsData, nData, jData, uData, tData, lData, uListData] = await Promise.all([
          getMahasiswaList(),
          getNilaiList(),
          getJadwalList(),
          getUktList(),
          getParentTokens(),
          getTokenLogs(),
          getUsersList(),
        ]);

        if (mhsData && mhsData.length > 0) {
          setMahasiswaList(mhsData);
          setSelectedMahasiswa(mhsData[0]);
        }
        if (nData) setNilaiList(nData);
        if (jData) setJadwalList(jData);
        if (uData) setUktList(uData);
        if (tData) setTokens(tData);
        if (lData) setTokenLogs(lData);
        if (uListData) setUserList(uListData);
      } catch (err) {
        console.error('Error loading Supabase data:', err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  // Generate Token Handler (FR-01, UC-03, SD-03a)
  const handleGenerateToken = (mahasiswaId: number): string => {
    const targetMhs = mahasiswaList.find((m) => m.id === mahasiswaId) || selectedMahasiswa;
    const randomHex = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    const tokenString = `TOKEN-PARENT-${targetMhs.nama.split(' ')[0].toUpperCase()}-2026-${randomHex}`;

    // Deactivate previous active tokens for this student
    const updatedTokens = tokens.map((t) =>
      t.mahasiswa_id === mahasiswaId
        ? { ...t, is_active: false, revoked_at: new Date().toISOString().replace('T', ' ').substring(0, 19) }
        : t
    );

    const newToken: ParentAccessToken = {
      id: Date.now(),
      mahasiswa_id: mahasiswaId,
      mahasiswa: targetMhs,
      created_by: 1, // Admin
      token: tokenString,
      is_active: true,
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    setTokens([newToken, ...updatedTokens]);

    // Record audit log
    const newLog: TokenAccessLog = {
      id: Date.now(),
      token_id: newToken.id,
      token_preview: tokenString.substring(0, 18) + '...',
      ip_address: '182.253.14.88',
      user_agent: navigator.userAgent,
      status: 'success',
      accessed_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    setTokenLogs([newLog, ...tokenLogs]);

    // Persist to Supabase if connected
    generateParentTokenDb(mahasiswaId, tokenString).catch(console.error);

    return tokenString;
  };

  // Revoke Token Handler (FR-01, UC-03, SD-03b)
  const handleRevokeToken = (tokenId: number) => {
    setTokens((prev) =>
      prev.map((t) =>
        t.id === tokenId
          ? { ...t, is_active: false, revoked_at: new Date().toISOString().replace('T', ' ').substring(0, 19) }
          : t
      )
    );
    // Persist to Supabase if connected
    revokeParentTokenDb(tokenId).catch(console.error);
  };

  // Update UKT Status (FR-10, UC-06)
  const handleUpdateUktStatus = (uktId: number, newStatus: 'lunas' | 'cicilan' | 'belum_bayar') => {
    setUktList((prev) =>
      prev.map((u) =>
        u.id === uktId
          ? {
              ...u,
              status: newStatus,
              tanggal_bayar: newStatus === 'lunas' ? new Date().toISOString().split('T')[0] : undefined,
            }
          : u
      )
    );
    // Persist to Supabase if connected
    updateUktStatusDb(uktId, newStatus).catch(console.error);
  };

  // Switch to Parent View with specific student
  const handleSwitchToParentView = (mhs: Mahasiswa) => {
    setSelectedMahasiswa(mhs);
    setCurrentRole('orang_tua');
  };

  // Memoized student-specific data
  const currentStudentNilai = useMemo(
    () => nilaiList.filter((n) => n.mahasiswa_id === selectedMahasiswa.id),
    [nilaiList, selectedMahasiswa.id]
  );

  const currentStudentUkt = useMemo(
    () => uktList.filter((u) => u.mahasiswa_id === selectedMahasiswa.id),
    [uktList, selectedMahasiswa.id]
  );

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Top Header with Role Switcher & DB status */}
      <Header
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        selectedMahasiswa={selectedMahasiswa}
        allMahasiswa={mahasiswaList.length > 0 ? mahasiswaList : [selectedMahasiswa]}
        onMahasiswaChange={setSelectedMahasiswa}
        isDbConnected={isDbConnected}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-500 space-y-3">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium">Memuat data akademik dari Supabase...</p>
          </div>
        ) : (
          <>
            {currentRole === 'mahasiswa' && (
              <MahasiswaDashboard
                mahasiswa={selectedMahasiswa}
                nilaiList={currentStudentNilai}
                jadwalList={jadwalList}
                uktList={currentStudentUkt}
              />
            )}

            {currentRole === 'orang_tua' && (
              <OrangTuaDashboard
                mahasiswa={selectedMahasiswa}
                nilaiList={currentStudentNilai}
                uktList={currentStudentUkt}
              />
            )}

            {currentRole === 'admin' && (
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
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-12 py-6 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p className="font-semibold text-slate-700">
            SIPADU (Sistem Pantau Akademik Terpadu) • Implementasi FR-08
          </p>
          <p>
            Mata Kuliah Rekayasa Perangkat Lunak • UIN Syarif Hidayatullah Jakarta 2026
          </p>
          <p className="text-[11px] text-slate-400">
            Tim Pengembang: Rasya Vikran Annadief (1251420108), Rizki Mubarok (1251420042), Rasha Arrazi (1251420043), Rayhan Akmal Wibowo (1251420047)
          </p>
        </div>
      </footer>
    </div>
  );
};
