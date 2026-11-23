import React from 'react';
import { GraduationCap, LogOut } from 'lucide-react';
import type { ActiveRole, Mahasiswa } from '../../types/sipadu';

interface HeaderProps {
  currentRole: ActiveRole;
  selectedMahasiswa: Mahasiswa;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  selectedMahasiswa,
  onLogout,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-900">SIPADU</h1>
              <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2 py-0.5 rounded-full">
                UIN Jakarta
              </span>
            </div>
            <p className="text-xs text-slate-500">Sistem Pantau Akademik Terpadu • FST</p>
          </div>
        </div>

        {/* User / Monitored Profile */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {currentRole === 'admin' ? (
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 px-3.5 py-1.5 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold text-sm">
                AD
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-900">Admin Akademik FST</p>
                <p className="text-[11px] text-purple-600 font-medium">Petugas Fakultas</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 px-3.5 py-1.5 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                {selectedMahasiswa.nama.charAt(0)}
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold text-slate-900">{selectedMahasiswa.nama}</p>
                  {currentRole === 'orang_tua' && (
                    <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                      Orang Tua (Anak: {selectedMahasiswa.nama.split(' ')[0]})
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500">
                  NIM: {selectedMahasiswa.nim} • Teknik Informatika
                </p>
              </div>
            </div>
          )}

          {onLogout && (
            <button
              onClick={onLogout}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              title="Keluar / Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
