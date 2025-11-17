// src/pages/Reports/FinanceReport.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

import TOKO_LABELS, { ALL_TOKO_IDS } from "../../data/TokoLabels";
import { PAYMENT_METHODS } from "../../data/ListDataPenjualan";

/* ================= Utils ================= */
const toNum = (v) => (isNaN(Number(v)) ? 0 : Number(v));
const safeStr = (v) => (v == null ? "" : String(v));
const pad2 = (n) => String(n).padStart(2, "0");

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
    // normalisasi yyyy-mm-dd atau dd/mm/yyyy
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

/* ================= LocalStorage helpers ================= */
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

/* ============== Import normalizer (fleksibel header) ============== */
function nameToTokoId(val) {
  if (val == null) return ALL_TOKO_IDS[0] || 1;
  const s = String(val).trim();
  if (/^\d+$/.test(s)) {
    const id = Number(s);
    if (TOKO_LABELS[id]) return id;
  }
  // cari by label
  const found = Object.entries(TOKO_LABELS).find(
    ([, label]) => String(label).toLowerCase() === s.toLowerCase()
  );
  if (found) return Number(found[0]);
  // fallback
  return ALL_TOKO_IDS[0] || 1;
}

function nameToKategori(val) {
  if (!val) return PAYMENT_METHODS?.[0] || "Cash";
  const s = String(val).trim().toLowerCase();
  const hit = PAYMENT_METHODS.find((m) => m.toLowerCase() === s);
  return hit || PAYMENT_METHODS?.[0] || "Cash";
}

function normalizeImportedRow(row) {
  // bikin semua key lower tanpa spasi
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

/* ================== Komponen ================== */
export default function FinanceReport() {
  const [rows, setRows] = useState(() => loadRows());

  const [filter, setFilter] = useState({
    dateFrom: "",
    dateTo: "",
    tokoId: "ALL",
    kategori: "ALL",
    q: "",
  });

  const emptyForm = useMemo(
    () => ({
      id: null,
      tanggal: todayStr(),
      tokoId: ALL_TOKO_IDS[0] || 1,
      kategori: PAYMENT_METHODS?.[0] || "Cash",
      jumlah: 0,
      keterangan: "",
      refNo: "",
      dibuatOleh: "",
    }),
    []
  );
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    saveRows(rows);
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (filter.tokoId !== "ALL" && Number(r.tokoId) !== Number(filter.tokoId)) return false;
      if (filter.kategori !== "ALL" && safeStr(r.kategori) !== filter.kategori) return false;
      if (filter.dateFrom && safeStr(r.tanggal) < filter.dateFrom) return false;
      if (filter.dateTo && safeStr(r.tanggal) > filter.dateTo) return false;
      if (filter.q) {
        const q = filter.q.toLowerCase();
        const hay = `${safeStr(r.tanggal)} ${TOKO_LABELS[r.tokoId] || r.tokoId} ${safeStr(
          r.kategori
        )} ${safeStr(r.keterangan)} ${safeStr(r.refNo)} ${safeStr(r.dibuatOleh)}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, filter]);

  const totalSemua = useMemo(
    () => filteredRows.reduce((a, r) => a + toNum(r.jumlah), 0),
    [filteredRows]
  );

  const totalPerToko = useMemo(() => {
    const map = new Map();
    for (const r of filteredRows) {
      const key = Number(r.tokoId);
      map.set(key, (map.get(key) || 0) + toNum(r.jumlah));
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([tokoId, total]) => ({ tokoId, tokoName: TOKO_LABELS[tokoId] || tokoId, total }));
  }, [filteredRows]);

  const totalPerKategori = useMemo(() => {
    const map = new Map();
    for (const r of filteredRows) {
      const key = safeStr(r.kategori);
      map.set(key, (map.get(key) | 0) + toNum(r.jumlah));
    }
    return Array.from(map.entries()).map(([kategori, total]) => ({ kategori, total }));
  }, [filteredRows]);

  // --------- Handlers ---------
  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const addRow = () => {
    const id = rows.length ? Math.max(...rows.map((r) => Number(r.id) || 0)) + 1 : 1;
    const newRow = {
      id,
      tanggal: form.tanggal || todayStr(),
      tokoId: Number(form.tokoId),
      kategori: form.kategori || "Cash",
      jumlah: toNum(form.jumlah),
      keterangan: form.keterangan || "",
      refNo: form.refNo || "",
      dibuatOleh: form.dibuatOleh || "",
    };
    setRows((prev) => [newRow, ...prev]);
    resetForm();
  };

  const beginEdit = (row) => {
    setEditingId(row.id);
    setForm({
      id: row.id,
      tanggal: row.tanggal,
      tokoId: Number(row.tokoId),
      kategori: row.kategori,
      jumlah: toNum(row.jumlah),
      keterangan: row.keterangan || "",
      refNo: row.refNo || "",
      dibuatOleh: row.dibuatOleh || "",
    });
  };

  const saveEdit = () => {
    setRows((prev) => prev.map((r) => (r.id === editingId ? { ...form, jumlah: toNum(form.jumlah) } : r)));
    resetForm();
  };

  const deleteRow = (id) => {
    if (!window.confirm("Hapus setoran ini?")) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  // --------- Import & Export ---------
  const fileRef = useRef(null);

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      // pilih sheet paling mirip "setoran/keuangan" atau pertama
      const sheetName =
        wb.SheetNames.find((n) => /setoran|keuangan|finance|cash/i.test(n)) || wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const mapped = json.map(normalizeImportedRow);
      // assign id
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
    const data = filteredRows.map((r) => ({
      Tanggal: r.tanggal,
      Toko: TOKO_LABELS[r.tokoId] || r.tokoId,
      Kategori: r.kategori,
      Jumlah: toNum(r.jumlah),
      Keterangan: r.keterangan || "",
      "No. Referensi": r.refNo || "",
      "Dibuat Oleh": r.dibuatOleh || "",
    }));

    const summary1 = [
      { Judul: "Total Semua", Nilai: toNum(totalSemua) },
      ...totalPerKategori.map((x) => ({ Judul: `Kategori: ${x.kategori}`, Nilai: toNum(x.total) })),
      ...totalPerToko.map((x) => ({ Judul: `Toko: ${x.tokoName}`, Nilai: toNum(x.total) })),
    ];

    const wb = XLSX.utils.book_new();
    const wsData = XLSX.utils.json_to_sheet(data);
    const wsSummary = XLSX.utils.json_to_sheet(summary1);

    XLSX.utils.book_append_sheet(wb, wsData, "Setoran");
    XLSX.utils.book_append_sheet(wb, wsSummary, "Ringkasan");

    const ymd = todayStr().replace(/-/g, "");
    XLSX.writeFile(wb, `Laporan_Keuangan_Setoran_${ymd}.xlsx`);
  };

  const qRef = useRef(null);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Laporan Keuangan — Setoran Penjualan</h1>
          <p className="text-slate-600">
            Pemeriksaan setoran dari seluruh toko. Import dari Dashboard Toko (Excel) → otomatis
            masuk rekap pusat.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={handleImport}
            className="hidden"
            id="import-setoran"
          />
          <label
            htmlFor="import-setoran"
            className="cursor-pointer rounded-lg border bg-white px-3 py-2 text-sm shadow-sm hover:bg-slate-50"
            title="Import setoran dari dashboard toko (.xlsx)"
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

      {/* Ringkasan */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Total Semua Setoran</div>
          <div className="mt-1 text-2xl font-semibold">{formatCurrency(totalSemua)}</div>
        </div>

        <div className="rounded-2xl border bg-white p-5 shadow-sm md:col-span-3">
          <div className="text-sm text-slate-500 mb-2">Total per Kategori</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
            {totalPerKategori.map((x) => (
              <div key={x.kategori} className="rounded-lg border px-3 py-2 bg-slate-50">
                <div className="text-xs text-slate-500">{x.kategori}</div>
                <div className="text-sm font-semibold">{formatCurrency(x.total)}</div>
              </div>
            ))}
            {totalPerKategori.length === 0 && (
              <div className="text-sm text-slate-500">Belum ada data.</div>
            )}
          </div>
        </div>
      </div>

      {/* Total per toko */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Total per Toko</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {totalPerToko.map((x) => (
            <div key={x.tokoId} className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="text-sm text-slate-500">{x.tokoName}</div>
              <div className="text-xl font-semibold mt-1">{formatCurrency(x.total)}</div>
            </div>
          ))}
          {totalPerToko.length === 0 && (
            <div className="text-sm text-slate-500">Belum ada data.</div>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Filter</h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div>
            <label className="text-xs text-slate-600">Dari Tanggal</label>
            <input
              type="date"
              className="w-full border rounded px-2 py-1"
              value={filter.dateFrom}
              onChange={(e) => setFilter((f) => ({ ...f, dateFrom: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">Sampai Tanggal</label>
            <input
              type="date"
              className="w-full border rounded px-2 py-1"
              value={filter.dateTo}
              onChange={(e) => setFilter((f) => ({ ...f, dateTo: e.target.value }))}
            />
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
          <div className="md:col-span-2">
            <label className="text-xs text-slate-600">Cari (toko/keterangan/ref)</label>
            <input
              ref={qRef}
              className="w-full border rounded px-2 py-1"
              placeholder="Ketik kata kunci…"
              value={filter.q}
              onChange={(e) => setFilter((f) => ({ ...f, q: e.target.value }))}
            />
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => {
              setFilter({ dateFrom: "", dateTo: "", tokoId: "ALL", kategori: "ALL", q: "" });
              if (qRef.current) qRef.current.value = "";
            }}
            className="rounded-lg border bg-white px-3 py-2 text-sm shadow-sm hover:bg-slate-50"
          >
            Reset Filter
          </button>
          <button
            onClick={handleExport}
            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-semibold shadow-sm"
          >
            Export (sesuai filter)
          </button>
        </div>
      </div>

      {/* Form tambah / edit */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Input Setoran</h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div>
            <label className="text-xs text-slate-600">Tanggal</label>
            <input
              type="date"
              className="w-full border rounded px-2 py-1"
              value={form.tanggal}
              onChange={(e) => setForm((v) => ({ ...v, tanggal: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">Toko</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={form.tokoId}
              onChange={(e) => setForm((v) => ({ ...v, tokoId: Number(e.target.value) }))}
            >
              {ALL_TOKO_IDS.map((id) => (
                <option key={id} value={id}>
                  {TOKO_LABELS[id]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-600">Kategori Pembayaran</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={form.kategori}
              onChange={(e) => setForm((v) => ({ ...v, kategori: e.target.value }))}
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-600">Jumlah Setoran</label>
            <input
              type="number"
              min={0}
              className="w-full border rounded px-2 py-1 text-right"
              value={form.jumlah}
              onChange={(e) => setForm((v) => ({ ...v, jumlah: toNum(e.target.value) }))}
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">No. Referensi</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={form.refNo}
              onChange={(e) => setForm((v) => ({ ...v, refNo: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">Dibuat Oleh</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={form.dibuatOleh}
              onChange={(e) => setForm((v) => ({ ...v, dibuatOleh: e.target.value }))}
            />
          </div>

          <div className="md:col-span-6">
            <label className="text-xs text-slate-600">Keterangan</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={form.keterangan}
              onChange={(e) => setForm((v) => ({ ...v, keterangan: e.target.value }))}
            />
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          {editingId ? (
            <>
              <button
                onClick={saveEdit}
                className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-semibold shadow-sm"
              >
                Simpan Perubahan
              </button>
              <button
                onClick={resetForm}
                className="rounded-lg border bg-white px-3 py-2 text-sm shadow-sm hover:bg-slate-50"
              >
                Batal
              </button>
            </>
          ) : (
            <button
              onClick={addRow}
              className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-semibold shadow-sm"
            >
              Tambah Setoran
            </button>
          )}
        </div>
      </div>

      {/* Tabel data */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Data Setoran</h2>
          <div className="text-sm text-slate-600">
            Total (filter): <span className="font-semibold">{formatCurrency(totalSemua)}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Tanggal</th>
                <th className="px-3 py-2 text-left">Toko</th>
                <th className="px-3 py-2 text-left">Kategori</th>
                <th className="px-3 py-2 text-right">Jumlah</th>
                <th className="px-3 py-2 text-left">No. Referensi</th>
                <th className="px-3 py-2 text-left">Keterangan</th>
                <th className="px-3 py-2 text-left">Dibuat Oleh</th>
                <th className="px-3 py-2 text-left">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{r.tanggal}</td>
                  <td className="px-3 py-2">{TOKO_LABELS[r.tokoId] || r.tokoId}</td>
                  <td className="px-3 py-2">{r.kategori}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(r.jumlah)}</td>
                  <td className="px-3 py-2">{r.refNo || "-"}</td>
                  <td className="px-3 py-2">{r.keterangan || "-"}</td>
                  <td className="px-3 py-2">{r.dibuatOleh || "-"}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => beginEdit(r)}
                        className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteRow(r.id)}
                        className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700"
                      >
                        Hapus
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-slate-500">
                    Belum ada data setoran.
                  </td>
                </tr>
              )}
            </tbody>
            {totalPerKategori.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 font-semibold">
                  <td className="px-3 py-2" colSpan={3}>
                    Total per Kategori
                  </td>
                  <td className="px-3 py-2 text-right" colSpan={5}>
                    {totalPerKategori
                      .map((x) => `${x.kategori}: ${formatCurrency(x.total)}`)
                      .join("  •  ")}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        *Kategori pembayaran mengikuti <code>PAYMENT_METHODS</code> pada folder <code>data</code>.
        Setoran disimpan lokal (localStorage) dengan key <code>{LS_KEY}</code>. Import menerima
        header fleksibel: <em>Tanggal, Toko, Kategori, Jumlah, Keterangan, No Referensi, Dibuat Oleh</em>.
      </p>
    </div>
  );
}
