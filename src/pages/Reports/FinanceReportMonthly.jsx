// src/pages/Reports/FinanceReportMonthly.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import TOKO_LABELS, { ALL_TOKO_IDS } from "../../data/TokoLabels";
import { PAYMENT_METHODS } from "../../data/ListDataPenjualan";

/* ============== Utils ============== */
const toNum = (v) => (isNaN(Number(v)) ? 0 : Number(v));
const safeStr = (v) => (v == null ? "" : String(v));
const pad2 = (n) => String(n).padStart(2, "0");
const MONTHS = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatCurrency(n) {
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(toNum(n));
  } catch {
    return `Rp ${toNum(n).toLocaleString("id-ID")}`;
  }
}

function parseXlsxDate(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number" && XLSX.SSF?.parse_date_code) {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return new Date(Date.UTC(d.y, d.m - 1, d.d)).toISOString().slice(0, 10);
  }
  if (typeof v === "string" && v.trim()) {
    const s = v.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/.exec(s);
    if (m) {
      const dd = pad2(m[1]);
      const MM = pad2(m[2]);
      const yyyy = m[3].length === 2 ? `20${m[3]}` : m[3];
      return `${yyyy}-${MM}-${dd}`;
    }
    return s;
  }
  return todayStr();
}

/* ============== Storage ============== */
const LS_KEY = "KEUANGAN_SETORAN_V1";
function loadRows() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const arr = JSON.parse(raw || "[]");
    if (Array.isArray(arr)) return arr;
    return [];
  } catch {
    return [];
  }
}
function saveRows(rows) {
  localStorage.setItem(LS_KEY, JSON.stringify(rows));
}

/* ============== Import normalizer (sama dgn halaman harian) ============== */
function nameToTokoId(val) {
  if (val == null) return ALL_TOKO_IDS[0] || 1;
  const s = String(val).trim();
  if (/^\d+$/.test(s)) {
    const id = Number(s);
    if (TOKO_LABELS[id]) return id;
  }
  const found = Object.entries(TOKO_LABELS).find(
    ([, label]) => String(label).toLowerCase() === s.toLowerCase()
  );
  if (found) return Number(found[0]);
  return ALL_TOKO_IDS[0] || 1;
}
function nameToKategori(val) {
  if (!val) return PAYMENT_METHODS?.[0] || "Cash";
  const s = String(val).trim().toLowerCase();
  const hit = PAYMENT_METHODS.find((m) => m.toLowerCase() === s);
  return hit || PAYMENT_METHODS?.[0] || "Cash";
}
function normalizeImportedRow(row) {
  const lower = Object.fromEntries(
    Object.entries(row).map(([k, v]) => [String(k).trim().toLowerCase(), v])
  );
  const pick = (...keys) => {
    for (const k of keys) {
      if (k in lower && lower[k] != null && `${lower[k]}`.trim() !== "") return lower[k];
    }
    return undefined;
  };
  const tanggal = parseXlsxDate(
    pick("tanggal", "date", "tgl", "tgl setoran", "tgl_transaksi", "tanggal transaksi")
  );
  const tokoRaw = pick("toko id", "toko", "store", "outlet");
  const kategoriRaw = pick("kategori", "kategori pembayaran", "payment", "metode", "payment method");
  const jumlah = toNum(pick("jumlah", "nominal", "amount", "nilai", "setoran"));
  const keterangan = pick("keterangan", "note", "catatan") || "";
  const refNo = pick("no referensi", "no. referensi", "ref", "no ref", "ref no") || "";
  const dibuatOleh = pick("dibuat oleh", "dibuat_oleh", "creator", "oleh") || "";
  return {
    tanggal,
    tokoId: nameToTokoId(tokoRaw),
    kategori: nameToKategori(kategoriRaw),
    jumlah,
    keterangan,
    refNo,
    dibuatOleh,
  };
}

/* ============== Komponen ============== */
export default function FinanceReportMonthly() {
  const [rows, setRows] = useState(() => loadRows());

  // Tahun default = tahun berjalan
  const yearNow = new Date().getFullYear();
  const [filter, setFilter] = useState({
    year: yearNow,
    tokoId: "ALL",
    kategori: "ALL",
  });

  useEffect(() => {
    saveRows(rows);
  }, [rows]);

  // Daftar tahun dari data + tahun berjalan
  const yearList = useMemo(() => {
    const set = new Set([yearNow]);
    for (const r of rows) {
      const y = Number(String(r.tanggal).slice(0, 4));
      if (!isNaN(y)) set.add(y);
    }
    return Array.from(set).sort((a, b) => b - a);
  }, [rows, yearNow]);

  // Filter tahun/toko/kategori
  const yearRows = useMemo(() => {
    return rows.filter((r) => {
      const y = Number(String(r.tanggal).slice(0, 4));
      if (y !== Number(filter.year)) return false;
      if (filter.tokoId !== "ALL" && Number(r.tokoId) !== Number(filter.tokoId)) return false;
      if (filter.kategori !== "ALL" && safeStr(r.kategori) !== filter.kategori) return false;
      return true;
    });
  }, [rows, filter]);

  // Total per bulan
  const totalPerBulan = useMemo(() => {
    const arr = Array(12).fill(0);
    for (const r of yearRows) {
      const m = Number(String(r.tanggal).slice(5, 7));
      if (!isNaN(m) && m >= 1 && m <= 12) arr[m - 1] += toNum(r.jumlah);
    }
    return arr;
  }, [yearRows]);

  // Pivot: kategori x bulan
  const kategoriPivot = useMemo(() => {
    const cats = Array.from(new Set(yearRows.map((r) => safeStr(r.kategori))));
    const table = cats.map((cat) => {
      const row = { kategori: cat, months: Array(12).fill(0), total: 0 };
      for (const r of yearRows) {
        if (safeStr(r.kategori) !== cat) continue;
        const m = Number(String(r.tanggal).slice(5, 7));
        if (!isNaN(m) && m >= 1 && m <= 12) {
          row.months[m - 1] += toNum(r.jumlah);
          row.total += toNum(r.jumlah);
        }
      }
      return row;
    });
    // urutkan by total desc
    table.sort((a, b) => b.total - a.total);
    return table;
  }, [yearRows]);

  // Pivot: toko x bulan
  const tokoPivot = useMemo(() => {
    const tokoIds = Array.from(new Set(yearRows.map((r) => Number(r.tokoId))));
    const table = tokoIds.map((tid) => {
      const row = { tokoId: tid, tokoName: TOKO_LABELS[tid] || tid, months: Array(12).fill(0), total: 0 };
      for (const r of yearRows) {
        if (Number(r.tokoId) !== tid) continue;
        const m = Number(String(r.tanggal).slice(5, 7));
        if (!isNaN(m) && m >= 1 && m <= 12) {
          row.months[m - 1] += toNum(r.jumlah);
          row.total += toNum(r.jumlah);
        }
      }
      return row;
    });
    table.sort((a, b) => b.total - a.total);
    return table;
  }, [yearRows]);

  const grandTotalYear = useMemo(() => totalPerBulan.reduce((a, v) => a + v, 0), [totalPerBulan]);

  // Import/Export
  const fileRef = useRef(null);
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const sheetName =
        wb.SheetNames.find((n) => /setoran|keuangan|finance|cash/i.test(n)) || wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const mapped = json.map(normalizeImportedRow);
      let maxId = rows.length ? Math.max(...rows.map((r) => Number(r.id) || 0)) : 0;
      const withId = mapped.map((r) => ({ ...r, id: ++maxId }));
      setRows((prev) => [...withId, ...prev]);
    } catch (err) {
      console.error("Gagal import:", err);
      alert("File Excel tidak dikenali. Pastikan kolom tanggal/toko/kategori/jumlah ada.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleExport = () => {
    // Sheet 1: Total per bulan
    const s1 = MONTHS.map((m, i) => ({ Bulan: m, Total: toNum(totalPerBulan[i]) }));
    // Sheet 2: Pivot kategori
    const s2 = kategoriPivot.map((r) => {
      const obj = { Kategori: r.kategori, Total: r.total };
      r.months.forEach((v, idx) => (obj[MONTHS[idx]] = toNum(v)));
      return obj;
    });
    // Sheet 3: Pivot toko
    const s3 = tokoPivot.map((r) => {
      const obj = { Toko: r.tokoName, Total: r.total };
      r.months.forEach((v, idx) => (obj[MONTHS[idx]] = toNum(v)));
      return obj;
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(s1), "Total per Bulan");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(s2), "Pivot Kategori");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(s3), "Pivot Toko");
    const y = String(filter.year);
    XLSX.writeFile(wb, `Rekap_Keuangan_Bulanan_${y}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Rekap Keuangan Bulanan</h1>
          <p className="text-slate-600">
            Rekap total setoran per bulan, pivot per kategori & per toko. Import dari Dashboard Toko
            (Excel) didukung.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImport}
            className="hidden"
            id="import-setoran-monthly"
          />
          <label
            htmlFor="import-setoran-monthly"
            className="cursor-pointer rounded-lg border bg-white px-3 py-2 text-sm shadow-sm hover:bg-slate-50"
            title="Import setoran (.xlsx)"
          >
            Import Excel
          </label>
          <button
            onClick={handleExport}
            className="rounded-lg border bg-white px-3 py-2 text-sm shadow-sm hover:bg-slate-50"
          >
            Export Excel
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Filter</h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div>
            <label className="text-xs text-slate-600">Tahun</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={filter.year}
              onChange={(e) => setFilter((f) => ({ ...f, year: Number(e.target.value) }))}
            >
              {yearList.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-600">Toko</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={filter.tokoId}
              onChange={(e) => setFilter((f) => ({ ...f, tokoId: e.target.value }))}
            >
              <option value="ALL">Semua</option>
              {ALL_TOKO_IDS.map((id) => (
                <option key={id} value={id}>
                  {TOKO_LABELS[id]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-600">Kategori</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={filter.kategori}
              onChange={(e) => setFilter((f) => ({ ...f, kategori: e.target.value }))}
            >
              <option value="ALL">Semua</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Ringkasan tahun */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Total Tahun {filter.year}</div>
          <div className="mt-1 text-2xl font-semibold">{formatCurrency(grandTotalYear)}</div>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm md:col-span-3">
          <div className="text-sm text-slate-500 mb-2">Total per Bulan</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {totalPerBulan.map((v, i) => (
              <div key={i} className="rounded-lg border px-3 py-2 bg-slate-50">
                <div className="text-xs text-slate-500">{MONTHS[i]}</div>
                <div className="text-sm font-semibold">{formatCurrency(v)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pivot per kategori */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Pivot — Kategori × Bulan</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Kategori</th>
                {MONTHS.map((m) => (
                  <th key={m} className="px-3 py-2 text-right">
                    {m}
                  </th>
                ))}
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {kategoriPivot.map((r) => (
                <tr key={r.kategori} className="border-b last:border-0">
                  <td className="px-3 py-2">{r.kategori}</td>
                  {r.months.map((val, idx) => (
                    <td key={idx} className="px-3 py-2 text-right">
                      {formatCurrency(val)}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-semibold">{formatCurrency(r.total)}</td>
                </tr>
              ))}
              {kategoriPivot.length === 0 && (
                <tr>
                  <td colSpan={14} className="px-3 py-6 text-center text-slate-500">
                    Tidak ada data pada tahun ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pivot per toko */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Pivot — Toko × Bulan</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Toko</th>
                {MONTHS.map((m) => (
                  <th key={m} className="px-3 py-2 text-right">
                    {m}
                  </th>
                ))}
                <th className="px-3 py-2 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {tokoPivot.map((r) => (
                <tr key={r.tokoId} className="border-b last:border-0">
                  <td className="px-3 py-2">{r.tokoName}</td>
                  {r.months.map((val, idx) => (
                    <td key={idx} className="px-3 py-2 text-right">
                      {formatCurrency(val)}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-semibold">{formatCurrency(r.total)}</td>
                </tr>
              ))}
              {tokoPivot.length === 0 && (
                <tr>
                  <td colSpan={14} className="px-3 py-6 text-center text-slate-500">
                    Tidak ada data pada tahun ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Data diambil dari <code>localStorage</code> key <code>{LS_KEY}</code> (sama dengan halaman
        harian). Import menerima header fleksibel: <em>Tanggal, Toko, Kategori, Jumlah, ...</em>
      </p>
    </div>
  );
}
