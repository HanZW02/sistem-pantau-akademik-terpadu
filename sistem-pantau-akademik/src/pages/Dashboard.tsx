import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { ActiveRole, Mahasiswa, ParentAccessToken, TokenAccessLog, Ukt, Nilai } from '../types/sipadu';
import {
  mockMahasiswaList,
  mockNilai,
  mockJadwal,
  mockUktList,
  mockParentTokens,
  mockTokenLogs,
  mockUsers,
} from '../data/mockData';
import { getSession, clearSession } from '../services/authService';
import { supabase } from '../lib/supabase';
import { Header } from '../components/common/Header';
import { MahasiswaDashboard } from '../components/mahasiswa/MahasiswaDashboard';
import { OrangTuaDashboard } from '../components/orangtua/OrangTuaDashboard';
import { AdminDashboard } from '../components/admin/AdminDashboard';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();

  // Ambil session saat ini
  const session = getSession();

  // Role dashboard berdasarkan akun yang login
  const [currentRole] = useState<ActiveRole>(() => {
    return (session?.role as ActiveRole) ?? 'mahasiswa';
  });

  // Mahasiswa yang sedang ditampilkan
  // - Jika mahasiswa login: tampilkan data dirinya
  // - Jika orang tua login: tampilkan data anak (berdasarkan mahasiswaId dari session)
  // - Jika admin login: tampilkan data pertama dari list
  const [selectedMahasiswa, setSelectedMahasiswa] = useState<Mahasiswa>(() => {
    const mahasiswaId = session?.mahasiswaId;
    if (mahasiswaId) {
      const found = mockMahasiswaList.find((m) => m.id === mahasiswaId);
      if (found) return found;
    }
    return mockMahasiswaList[0];
  });

  // Data — sementara dari mockData, akan diganti Supabase setelah tabel siap
  const [mahasiswaList] = useState<Mahasiswa[]>(mockMahasiswaList);
  const [tokens, setTokens] = useState<ParentAccessToken[]>(mockParentTokens);
  const [tokenLogs, setTokenLogs] = useState<TokenAccessLog[]>(mockTokenLogs);
  const [nilaiList] = useState<Nilai[]>(mockNilai);
  const [uktList, setUktList] = useState<Ukt[]>(mockUktList);

  // Kalau orang tua login pakai token, coba ambil data mahasiswanya dari Supabase
  useEffect(() => {
    if (currentRole === 'orang_tua' && session?.mahasiswaId) {
      supabase
        .from('mahasiswa')
        .select('*')
        .eq('id', session.mahasiswaId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setSelectedMahasiswa(data as Mahasiswa);
        });
    }
    if (currentRole === 'mahasiswa' && session?.mahasiswaId) {
      supabase
        .from('mahasiswa')
        .select('*')
        .eq('id', session.mahasiswaId)
        .maybeSingle()
        .then(({ data }) => {
          if (data) setSelectedMahasiswa(data as Mahasiswa);
        });
    }
  }, [currentRole, session?.mahasiswaId]);

  const handleLogout = () => {
    clearSession();
    navigate('/login', { replace: true });
  };

  // Generate Token Handler (FR-01)
  const handleGenerateToken = (mahasiswaId: number): string => {
    const targetMhs = mahasiswaList.find((m) => m.id === mahasiswaId) || mahasiswaList[0];
    const randomHex = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    const tokenString = `TOKEN-PARENT-${targetMhs.nama.split(' ')[0].toUpperCase()}-2026-${randomHex}`;

    const updatedTokens = tokens.map((t) =>
      t.mahasiswa_id === mahasiswaId
        ? { ...t, is_active: false, revoked_at: new Date().toISOString().replace('T', ' ').substring(0, 19) }
        : t
    );

    const newToken: ParentAccessToken = {
      id: Date.now(),
      mahasiswa_id: mahasiswaId,
      mahasiswa: targetMhs,
      created_by: 1,
      token: tokenString,
      is_active: true,
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };

    setTokens([newToken, ...updatedTokens]);

    const newLog: TokenAccessLog = {
      id: Date.now(),
      token_id: newToken.id,
      token_preview: tokenString.substring(0, 20) + '...',
      ip_address: '—',
      user_agent: navigator.userAgent,
      status: 'success',
      accessed_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
    };
    setTokenLogs([newLog, ...tokenLogs]);

    // Simpan ke Supabase (fire-and-forget)
    void supabase.from('parent_access_tokens').insert({
      mahasiswa_id: mahasiswaId,
      created_by: session?.userId ?? 1,
      token: tokenString,
      is_active: true,
    });

    return tokenString;
  };

  const handleRevokeToken = (tokenId: number) => {
    setTokens((prev) =>
      prev.map((t) =>
        t.id === tokenId
          ? { ...t, is_active: false, revoked_at: new Date().toISOString().replace('T', ' ').substring(0, 19) }
          : t
      )
    );
    void supabase
      .from('parent_access_tokens')
      .update({ is_active: false, revoked_at: new Date().toISOString() })
      .eq('id', tokenId);
  };

  const handleUpdateUktStatus = (uktId: number, newStatus: 'lunas' | 'cicilan' | 'belum_bayar') => {
    setUktList((prev) =>
      prev.map((u) =>
        u.id === uktId
          ? { ...u, status: newStatus, tanggal_bayar: newStatus === 'lunas' ? new Date().toISOString().split('T')[0] : undefined }
          : u
      )
    );
  };

  const handleSwitchToParentView = (mhs: Mahasiswa) => {
    setSelectedMahasiswa(mhs);
  };

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
      <Header
        currentRole={currentRole}
        selectedMahasiswa={selectedMahasiswa}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {currentRole === 'mahasiswa' && (
          <MahasiswaDashboard
            mahasiswa={selectedMahasiswa}
            nilaiList={currentStudentNilai.length > 0 ? currentStudentNilai : mockNilai}
            jadwalList={mockJadwal}
            uktList={currentStudentUkt.length > 0 ? currentStudentUkt : mockUktList}
          />
        )}

        {currentRole === 'orang_tua' && (
          <OrangTuaDashboard
            mahasiswa={selectedMahasiswa}
            nilaiList={currentStudentNilai.length > 0 ? currentStudentNilai : mockNilai}
            uktList={currentStudentUkt.length > 0 ? currentStudentUkt : mockUktList}
          />
        )}

        {currentRole === 'admin' && (
          <AdminDashboard
            mahasiswaList={mahasiswaList}
            tokens={tokens}
            tokenLogs={tokenLogs}
            nilaiList={nilaiList}
            uktList={uktList}
            userList={mockUsers}
            onGenerateToken={handleGenerateToken}
            onRevokeToken={handleRevokeToken}
            onUpdateUktStatus={handleUpdateUktStatus}
            onSwitchToParentView={handleSwitchToParentView}
          />
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
