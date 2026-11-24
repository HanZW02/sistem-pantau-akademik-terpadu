import React, { useMemo, useState } from 'react';
import {
  GraduationCap,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Download,
  Filter,
  Layers,
  MapPin,
  User,
} from 'lucide-react';
import type { Mahasiswa, Nilai, Jadwal, Ukt } from '../../types/sipadu';
import { MetricCard } from '../common/MetricCard';
import { IpkTrendChart } from '../charts/IpkTrendChart';
import { AttendanceDonut } from '../charts/AttendanceDonut';
// TODO: dua data ini masih contoh. Ganti setelah tabel kehadiran dipakai.
import { mockSemesterGpa, mockKehadiranSummary } from '../../data/mockData';

interface MahasiswaDashboardProps {
  mahasiswa: Mahasiswa;
  nilaiList: Nilai[];
  jadwalList: Jadwal[];
  uktList: Ukt[];
  prodiNama?: string;
}

type Tab = 'ringkasan' | 'nilai' | 'jadwal' | 'presensi' | 'ukt';

// Syarat kelulusan S1 (belum ada kolomnya di database)
const TARGET_SKS = 144;

// ---------- helper ----------
const num = (v: unknown) => Number(v) || 0;
const rupiah = (v: unknown) => `Rp ${num(v).toLocaleString('id-ID')}`;
const fmt = (v: number | null) => (v === null ? '—' : v.toFixed(2));

const sksOf = (n: Nilai) => num(n.mata_kuliah?.sks);
const mutuOf = (n: Nilai) => num(n.bobot) * sksOf(n);
const ipsOf = (rows: Nilai[]): number | null => {
  const sks = rows.reduce((a, n) => a + sksOf(n), 0);
  return sks > 0 ? rows.reduce((a, n) => a + mutuOf(n), 0) / sks : null;
};

const UKT_STYLE: Record<
  Ukt['status'],
  { label: string; box: string; head: string; amount: string; sub: string; badge: string; pill: string }
> = {
  lunas: {
    label: 'LUNAS',
    box: 'bg-emerald-50 border-emerald-200',
    head: 'text-emerald-800',
    amount: 'text-emerald-900',
    sub: 'text-emerald-700',
    badge: 'bg-emerald-600 text-white',
    pill: 'bg-emerald-100 text-emerald-800',
  },
  cicilan: {
    label: 'CICILAN',
    box: 'bg-amber-50 border-amber-200',
    head: 'text-amber-800',
    amount: 'text-amber-900',
    sub: 'text-amber-700',
    badge: 'bg-amber-600 text-white',
    pill: 'bg-amber-100 text-amber-800',
  },
  belum_bayar: {
    label: 'BELUM BAYAR',
    box: 'bg-red-50 border-red-200',
    head: 'text-red-800',
    amount: 'text-red-900',
    sub: 'text-red-700',
    badge: 'bg-red-600 text-white',
    pill: 'bg-red-100 text-red-800',
  },
};

export const MahasiswaDashboard: React.FC<MahasiswaDashboardProps> = ({
  mahasiswa,
  nilaiList,
  jadwalList,
  uktList,
  prodiNama,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('ringkasan');
  const [selectedSemester, setSelectedSemester] = useState<number | 'semua'>('semua');

  // ---------- semua angka dihitung dari data ----------
  const semesters = useMemo(
    () => Array.from(new Set(nilaiList.map((n) => n.semester))).sort((a, b) => b - a),
    [nilaiList]
  );
  const currentSemester = semesters[0] ?? null;

  const ipk = ipsOf(nilaiList);
  const ipsTerakhir =
    currentSemester === null ? null : ipsOf(nilaiList.filter((n) => n.semester === currentSemester));
  const totalSksSemua = nilaiList.reduce((a, n) => a + sksOf(n), 0);
  const persenSks = Math.min(100, Math.round((totalSksSemua / TARGET_SKS) * 100));

  const tahunAjaranOf = (sem: number) => nilaiList.find((n) => n.semester === sem)?.tahun_ajaran;
  const tahunAktif =
    (currentSemester !== null ? tahunAjaranOf(currentSemester) : undefined) ??
    uktList[0]?.tahun_ajaran ??
    '—';

  const filteredNilai =
    selectedSemester === 'semua' ? nilaiList : nilaiList.filter((n) => n.semester === selectedSemester);
  const totalSksFiltered = filteredNilai.reduce((a, n) => a + sksOf(n), 0);
  const calculatedIps = fmt(ipsOf(filteredNilai));

  // UKT terbaru = semester tertinggi
  const latestUkt: Ukt | undefined = [...uktList].sort((a, b) => b.semester - a.semester)[0];
  const uktStyle = latestUkt ? UKT_STYLE[latestUkt.status] : null;

  const tabs: { id: Tab; label: string; icon: typeof Layers }[] = [
    { id: 'ringkasan', label: 'Ringkasan Terpadu (UC-11)', icon: Layers },
    { id: 'nilai', label: 'Nilai & Transkrip (FR-04)', icon: BookOpen },
    { id: 'jadwal', label: 'Jadwal Kuliah (FR-07)', icon: Calendar },
    { id: 'presensi', label: 'Presensi (UC-08)', icon: CheckCircle2 },
    { id: 'ukt', label: 'Status UKT (FR-06)', icon: CreditCard },
  ];

  return (
    <div className="space-y-6">
      {/* Student Profile Identity Card */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white text-2xl font-bold shadow-inner">
              {mahasiswa.nama.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-bold tracking-tight">{mahasiswa.nama}</h2>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs px-2.5 py-0.5 rounded-full font-medium">
                  {mahasiswa.status.toUpperCase()}
                </span>
                <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs px-2.5 py-0.5 rounded-full font-medium">
                  Semester {currentSemester ?? '—'}
                </span>
              </div>
              <p className="text-sm text-slate-300 mt-1">
                NIM: <span className="font-mono font-medium text-white">{mahasiswa.nim}</span> • {prodiNama ?? '—'}
              </p>
              <div className="flex items-center gap-4 mt-2 text-xs text-slate-300 flex-wrap">
                <span className="flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  Dosen PA: {mahasiswa.dosen_pa ?? '—'}
                </span>
                <span>•</span>
                <span>Angkatan: {mahasiswa.angkatan}</span>
                <span>•</span>
                <span>Tahun Akademik: {tahunAktif}</span>
              </div>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/15 rounded-xl px-4 py-3 text-right hidden md:block">
            <p className="text-xs text-slate-300 font-medium">Jalur Akses Terautentikasi</p>
            <p className="text-sm font-bold text-white">Akun Mahasiswa</p>
            <p className="text-[11px] text-emerald-300">● Sesi Aktif Terverifikasi</p>
          </div>
        </div>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="IPK Kumulatif (FR-09)"
          value={fmt(ipk)}
          subtitle={`IPS Semester Terakhir: ${fmt(ipsTerakhir)}`}
          colorTheme="indigo"
          badge={{ text: `${nilaiList.length} mata kuliah`, variant: 'info' }}
          icon={<GraduationCap className="w-6 h-6" />}
        />

        <MetricCard
          title="Total SKS Diambil (FR-05)"
          value={`${totalSksSemua} SKS`}
          subtitle={`Target Kelulusan: ${TARGET_SKS} SKS (${persenSks}%)`}
          colorTheme="blue"
          badge={{ text: `Sem ${currentSemester ?? '—'}`, variant: 'info' }}
          icon={<BookOpen className="w-6 h-6" />}
        />

        {/* TODO: masih data contoh sampai tabel kehadiran dipakai */}
        <MetricCard
          title="Tingkat Presensi (UC-08)"
          value={`${mockKehadiranSummary.persentase}%`}
          subtitle="52 Hadir dari 56 Pertemuan"
          colorTheme="emerald"
          badge={{ text: 'Aman UAS', variant: 'success' }}
          icon={<CheckCircle2 className="w-6 h-6" />}
        />

        <MetricCard
          title={`Status UKT Sem ${latestUkt?.semester ?? '—'} (FR-06)`}
          value={uktStyle?.label ?? 'BELUM ADA DATA'}
          subtitle={latestUkt ? rupiah(latestUkt.jumlah) : 'Belum ada tagihan tercatat'}
          colorTheme="amber"
          badge={
            latestUkt?.status === 'lunas'
              ? { text: 'Terverifikasi', variant: 'success' }
              : { text: 'Belum lunas', variant: 'info' }
          }
          icon={<CreditCard className="w-6 h-6" />}
        />
      </div>

      {/* Navigation Tabs (FR-08: Penyatuan Dasbor Terpadu) */}
      <div className="bg-white border-b border-slate-200 rounded-t-xl px-4 pt-2">
        <div className="flex gap-2 sm:gap-6 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors cursor-pointer ${isActive
                    ? 'border-blue-600 text-blue-600 font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ringkasan */}
      {activeTab === 'ringkasan' && (
        <div className="space-y-6">
          {/* TODO: dua grafik ini masih data contoh */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <IpkTrendChart data={mockSemesterGpa} />
            <AttendanceDonut data={mockKehadiranSummary} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-slate-800">Jadwal Kuliah Semester Ini (FR-07)</h3>
                </div>
                <button
                  onClick={() => setActiveTab('jadwal')}
                  className="text-xs text-blue-600 font-semibold hover:underline cursor-pointer"
                >
                  Lihat Selengkapnya →
                </button>
              </div>

              {jadwalList.length === 0 && (
                <p className="text-sm text-slate-500 py-3">Belum ada jadwal kuliah tercatat.</p>
              )}
              <div className="divide-y divide-slate-100">
                {jadwalList.slice(0, 3).map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 text-center bg-blue-50 text-blue-700 py-1.5 rounded-lg border border-blue-100 font-medium">
                        <span className="text-xs font-bold block">{item.hari}</span>
                        <span className="text-[10px] text-blue-500 block">{item.jam_mulai}</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900">{item.mata_kuliah?.nama_mk}</h4>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {item.ruang?.kode_ruang} ({item.ruang?.gedung})
                          </span>
                          <span>•</span>
                          <span>{item.dosen?.nama}</span>
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-semibold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md shrink-0">
                      {item.mata_kuliah?.sks} SKS
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard className="w-5 h-5 text-amber-600" />
                  <h3 className="font-semibold text-slate-800">Status Pembayaran UKT</h3>
                </div>

                {latestUkt && uktStyle ? (
                  <div className={`${uktStyle.box} border rounded-xl p-4 my-3`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-medium ${uktStyle.head}`}>
                        Semester {latestUkt.semester} ({latestUkt.tahun_ajaran})
                      </span>
                      <span className={`${uktStyle.badge} font-bold text-xs px-2.5 py-0.5 rounded-full`}>
                        {uktStyle.label}
                      </span>
                    </div>
                    <p className={`text-2xl font-bold ${uktStyle.amount} mt-2`}>{rupiah(latestUkt.jumlah)}</p>
                    <p className={`text-[11px] ${uktStyle.sub} mt-1`}>
                      {latestUkt.status === 'lunas'
                        ? `Dibayar pada: ${latestUkt.tanggal_bayar ?? '-'} via ${latestUkt.metode_pembayaran ?? '-'}`
                        : `Jatuh tempo: ${latestUkt.jatuh_tempo}`}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 my-3">Belum ada tagihan UKT tercatat.</p>
                )}
              </div>

              <button
                onClick={() => setActiveTab('ukt')}
                className="w-full mt-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors text-center cursor-pointer"
              >
                Riwayat Pembayaran Lengkap
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nilai & Transkrip */}
      {activeTab === 'nilai' && (
        <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Transkrip Nilai Akademik (FR-04)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Daftar nilai hasil studi resmi yang tercatat di pangkalan data akademik
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedSemester}
                  onChange={(e) =>
                    setSelectedSemester(e.target.value === 'semua' ? 'semua' : Number(e.target.value))
                  }
                  className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 font-medium text-slate-700 cursor-pointer"
                >
                  <option value="semua">Semua Semester</option>
                  {semesters.map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                      {tahunAjaranOf(s) ? ` (${tahunAjaranOf(s)})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => alert('Fitur unduh transkrip resmi (PDF) telah siap dipanggil.')}
                className="flex items-center gap-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Unduh KHS
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">No</th>
                  <th className="py-3 px-4">Kode MK</th>
                  <th className="py-3 px-4">Nama Mata Kuliah</th>
                  <th className="py-3 px-4 text-center">Semester</th>
                  <th className="py-3 px-4 text-center">SKS</th>
                  <th className="py-3 px-4 text-center">Nilai Angka</th>
                  <th className="py-3 px-4 text-center">Nilai Huruf</th>
                  <th className="py-3 px-4 text-center">Bobot</th>
                  <th className="py-3 px-4 text-center">Mutu (SKS x Bobot)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                {filteredNilai.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-6 px-4 text-center text-slate-500">
                      Belum ada nilai tercatat.
                    </td>
                  </tr>
                )}
                {filteredNilai.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-blue-600">{item.mata_kuliah?.kode_mk}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">{item.mata_kuliah?.nama_mk}</td>
                    <td className="py-3 px-4 text-center font-medium">Sem {item.semester}</td>
                    <td className="py-3 px-4 text-center font-semibold">{item.mata_kuliah?.sks}</td>
                    <td className="py-3 px-4 text-center font-mono font-medium">{item.nilai_angka}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 font-bold rounded-md bg-emerald-100 text-emerald-800">
                        {item.nilai_huruf}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-mono">{num(item.bobot).toFixed(2)}</td>
                    <td className="py-3 px-4 text-center font-mono font-bold text-slate-800">
                      {mutuOf(item).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 font-semibold text-xs text-slate-800 border-t border-slate-200">
                <tr>
                  <td colSpan={4} className="py-3 px-4 text-right">Total SKS / IPS:</td>
                  <td className="py-3 px-4 text-center font-bold text-blue-600">{totalSksFiltered} SKS</td>
                  <td colSpan={3} className="py-3 px-4 text-right">Rata-Rata IPS:</td>
                  <td className="py-3 px-4 text-center font-bold text-indigo-700 font-mono text-sm">{calculatedIps}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Jadwal Kuliah */}
      {activeTab === 'jadwal' && (
        <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Jadwal Kuliah Mingguan (FR-07)</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tahun Akademik {jadwalList[0]?.tahun_ajaran ?? '—'} • Kampus FST UIN Syarif Hidayatullah Jakarta
              </p>
            </div>
            <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
              {jadwalList.length} Mata Kuliah Terjadwal
            </span>
          </div>

          {jadwalList.length === 0 && <p className="text-sm text-slate-500">Belum ada jadwal kuliah tercatat.</p>}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jadwalList.map((item) => (
              <div
                key={item.id}
                className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-blue-700 bg-blue-100/80 px-2.5 py-0.5 rounded-md">
                    {item.hari}
                  </span>
                  <span className="text-xs font-mono text-slate-600 flex items-center gap-1 font-semibold">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    {item.jam_mulai} - {item.jam_selesai} WIB
                  </span>
                </div>

                <h4 className="font-bold text-slate-900 text-sm mt-2">{item.mata_kuliah?.nama_mk}</h4>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  {item.mata_kuliah?.kode_mk} • {item.mata_kuliah?.sks} SKS
                </p>

                <div className="mt-4 pt-3 border-t border-slate-200/70 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {item.ruang?.kode_ruang} ({item.ruang?.gedung})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-600">
                    <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{item.dosen?.nama}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Presensi (TODO: masih data contoh) */}
      {activeTab === 'presensi' && (
        <div className="space-y-6">
          <AttendanceDonut data={mockKehadiranSummary} />
        </div>
      )}

      {/* UKT */}
      {activeTab === 'ukt' && (
        <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Riwayat Pembayaran UKT (FR-06)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Status pelunasan Uang Kuliah Tunggal dari semester awal hingga berjalan
            </p>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Semester</th>
                  <th className="py-3 px-4">Tahun Ajaran</th>
                  <th className="py-3 px-4">Jumlah Tagihan</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4">Jatuh Tempo</th>
                  <th className="py-3 px-4">Tanggal Pembayaran</th>
                  <th className="py-3 px-4">Kanal Bayar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 text-xs">
                {uktList.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-6 px-4 text-center text-slate-500">
                      Belum ada tagihan UKT tercatat.
                    </td>
                  </tr>
                )}
                {[...uktList]
                  .sort((a, b) => a.semester - b.semester)
                  .map((ukt) => (
                    <tr key={ukt.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-900">Semester {ukt.semester}</td>
                      <td className="py-3.5 px-4">{ukt.tahun_ajaran}</td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">{rupiah(ukt.jumlah)}</td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 font-bold rounded-full uppercase text-[11px] ${UKT_STYLE[ukt.status].pill}`}
                        >
                          {UKT_STYLE[ukt.status].label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">{ukt.jatuh_tempo}</td>
                      <td className="py-3.5 px-4 font-medium text-emerald-700">{ukt.tanggal_bayar || '-'}</td>
                      <td className="py-3.5 px-4 text-slate-600">{ukt.metode_pembayaran || '-'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};