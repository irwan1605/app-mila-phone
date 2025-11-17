// src/pages/stock/StockMotorListrik.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

import TOKO_LABELS from "../../data/TokoLabels";
import { getStockIndex } from "../../data/StockBarang";
import {
  transferStock,
  CENTRAL_NAME,
  onStockChange,
} from "../../data/StockTransfer";
import { writeStockCounters } from "../../data/StockCounters";

const LOCAL_KEY = "MMT_STOCK_MOLIS_LOCAL_V1";

const toNum = (v) => (isNaN(Number(v)) ? 0 : Number(v));
const today = () => new Date().toISOString().slice(0, 10);

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || null;
  } catch {
    return null;
  }
}

const makeKey = (row) => {
  const imei = (row.imei || row.noRangka || row.serial || "")
    .toString()
    .trim()
    .toLowerCase();
  const nama = (row.namaBarang || row.nama || row.name || "")
    .toString()
    .trim()
    .toLowerCase();
  return imei || nama;
};

function readLocalMap() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function writeLocalMap(map) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(map));
  } catch {}
}

function mergeRowsForToko(tokoName) {
  const idx = getStockIndex(tokoName) || {};
  const base = Array.isArray(idx.motor_listrik) ? idx.motor_listrik : [];

  const map = readLocalMap();
  const localArr = Array.isArray(map[tokoName]) ? map[tokoName] : [];

  const baseMap = new Map();

  for (const r of base) {
    baseMap.set(makeKey(r), {
      source: "base",
      tanggal: r.tanggal ? String(r.tanggal).slice(0, 10) : "",
      tokoName,
      namaBarang: r.namaBarang || r.nama || r.name || "",
      imei: (r.imei || r.noRangka || r.serial || "").toString(),
      stokSistem: toNum(r.stokSistem ?? r.stok_sistem ?? r.stok ?? 0),
      stokFisik: toNum(r.stokFisik ?? r.stok_fisik ?? 0),
      keterangan: r.keterangan || r.note || "",
    });
  }

  for (const r of localArr) {
    const k = makeKey(r);
    baseMap.set(k, {
      source: "local",
      tanggal: r.tanggal ? String(r.tanggal).slice(0, 10) : today(),
      tokoName,
      namaBarang: r.namaBarang || "",
      imei: (r.imei || r.noRangka || "").toString(),
      stokSistem: toNum(r.stokSistem),
      stokFisik: toNum(r.stokFisik),
      keterangan: r.keterangan || "",
    });
  }

  return Array.from(baseMap.values()).map((x, i) => ({ id: i + 1, ...x }));
}

export default function StockMotorListrik() {
  const navigate = useNavigate();
  const { id } = useParams();
  const tokoId = Number(id);
  const tokoName = TOKO_LABELS[tokoId] || `Toko ${tokoId}`;
  const user = getCurrentUser();

  const [rows, setRows] = useState(() => mergeRowsForToko(tokoName));
  const [filter, setFilter] = useState("");

  const [open, setOpen] = useState(false);
  const [targetRow, setTargetRow] = useState(null);
  const [qty, setQty] = useState(1);
  const [mode, setMode] = useState("fisik");
  const [syncSystem, setSyncSystem] = useState(false);
  const [note, setNote] = useState("");

  const [form, setForm] = useState({
    tanggal: today(),
    namaBarang: "",
    imei: "",
    stokSistem: 0,
    stokFisik: 0,
    keterangan: "",
  });
  const [editingId, setEditingId] = useState(null);

  // auto refresh saat ada perubahan dari modul transfer
  useEffect(() => {
    const unsub = onStockChange(() => setRows(mergeRowsForToko(tokoName)));
    return unsub;
  }, [tokoName]);

  // tulis counter ke global (dibaca Dashboard)
  useEffect(() => {
    const totalFisik = rows.reduce((a, r) => a + toNum(r.stokFisik), 0);
    try {
      writeStockCounters(tokoName, { motor_listrik: totalFisik });
    } catch {}
  }, [tokoName, rows]);

  const filtered = useMemo(() => {
    if (!filter.trim()) return rows;
    const q = filter.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (r.namaBarang || "").toLowerCase().includes(q) ||
        (r.imei || "").toLowerCase().includes(q) ||
        (r.keterangan || "").toLowerCase().includes(q)
    );
  }, [rows, filter]);

  const totals = useMemo(
    () =>
      filtered.reduce(
        (acc, r) => {
          acc.count += 1;
          acc.stokSistem += toNum(r.stokSistem);
          acc.stokFisik += toNum(r.stokFisik);
          return acc;
        },
        { count: 0, stokSistem: 0, stokFisik: 0 }
      ),
    [filtered]
  );

  function reload() {
    setRows(mergeRowsForToko(tokoName));
  }

  function upsertLocalRow(row) {
    const map = readLocalMap();
    const arr = Array.isArray(map[tokoName]) ? [...map[tokoName]] : [];
    const k = makeKey(row);
    const without = arr.filter((x) => makeKey(x) !== k);
    without.push({
      tanggal: row.tanggal || today(),
      namaBarang: row.namaBarang || "",
      imei: (row.imei || "").toString(),
      stokSistem: toNum(row.stokSistem),
      stokFisik: toNum(row.stokFisik),
      keterangan: row.keterangan || "",
    });
    map[tokoName] = without;
    writeLocalMap(map);
    reload();
  }

  function removeLocalRow(row) {
    const map = readLocalMap();
    const arr = Array.isArray(map[tokoName]) ? [...map[tokoName]] : [];
    const k = makeKey(row);
    const filteredArr = arr.filter((x) => makeKey(x) !== k);
    map[tokoName] = filteredArr;
    writeLocalMap(map);
    reload();
  }

  function onClickReturn(row) {
    setTargetRow(row);
    setQty(1);
    setMode("fisik");
    setSyncSystem(false);
    setNote("");
    setOpen(true);
  }

  async function doReturn() {
    if (!targetRow) return;
    try {
      await transferStock({
        from: tokoName,
        to: CENTRAL_NAME,
        category: "motor_listrik",
        keyFields: { imei: targetRow.imei, namaBarang: targetRow.namaBarang },
        qty: toNum(qty),
        mode,
        syncSystem,
        meta: { by: user?.username || user?.name || "system", note },
      });
      setOpen(false);
      reload();
      alert(`Berhasil retur ${qty} unit ke ${CENTRAL_NAME}.`);
    } catch (err) {
      alert(`Gagal retur: ${err.message || err}`);
    }
  }

  function exportExcel() {
    const data = filtered.map((r) => ({
      TANGGAL: r.tanggal || "",
      LOKASI: tokoName,
      NAMA_BARANG: r.namaBarang,
      IMEI_SERIAL: r.imei || "",
      STOK_SISTEM: r.stokSistem,
      STOK_FISIK: r.stokFisik,
      KETERANGAN: r.keterangan || "",
      SOURCE: r.source || "base",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MOLIS_TOKO");
    const ymd = today().replace(/-/g, "");
    const safe = tokoName.replace(/[^\p{L}\p{N}_-]+/gu, "_");
    XLSX.writeFile(wb, `STOCK_MOLIS_${safe}_${ymd}.xlsx`);
  }

  function startEdit(row) {
    setEditingId(row.id);
    setForm({
      tanggal: row.tanggal || today(),
      namaBarang: row.namaBarang || "",
      imei: row.imei || "",
      stokSistem: toNum(row.stokSistem),
      stokFisik: toNum(row.stokFisik),
      keterangan: row.keterangan || "",
    });
  }
  function cancelEdit() {
    setEditingId(null);
    setForm({
      tanggal: today(),
      namaBarang: "",
      imei: "",
      stokSistem: 0,
      stokFisik: 0,
      keterangan: "",
    });
  }
  function saveEdit() {
    upsertLocalRow(form);
    cancelEdit();
  }
  function addNew() {
    if (!form.namaBarang && !form.imei) {
      alert("Isi minimal Nama Barang atau IMEI/Serial");
      return;
    }
    upsertLocalRow(form);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            Stok Motor Listrik — {tokoName}
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg border bg-white px-3 py-2 text-sm shadow-sm hover:bg-slate-50"
          >
            Kembali
          </button>
          <input
            placeholder="Cari nama/IMEI/keterangan…"
            className="border rounded px-3 py-2 w-56"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
          <button
            onClick={exportExcel}
            className="rounded-lg border bg-white px-3 py-2 text-sm shadow-sm hover:bg-slate-50"
          >
            Export Excel
          </button>
        </div>
      </div>

      {/* Ringkas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-xl border p-4 bg-white">
          <div className="text-xs text-slate-500">Total Item</div>
          <div className="text-xl font-semibold">{totals.count}</div>
        </div>
        <div className="rounded-xl border p-4 bg-white">
          <div className="text-xs text-slate-500">Total Stok Sistem</div>
          <div className="text-xl font-semibold">{totals.stokSistem}</div>
        </div>
        <div className="rounded-xl border p-4 bg-white">
          <div className="text-xs text-slate-500">Total Stok Fisik</div>
          <div className="text-xl font-semibold">{totals.stokFisik}</div>
        </div>
      </div>

      {/* Form tambah / edit */}
      <div className="rounded-xl border p-4 bg-white">
        <h2 className="font-semibold text-lg mb-3">
          {editingId ? "Edit Stok (Local Toko)" : "Tambah Stok (Local Toko)"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div>
            <label className="text-xs text-slate-600">Tanggal</label>
            <input
              type="date"
              className="border rounded px-2 py-1 w-full"
              value={form.tanggal}
              onChange={(e) =>
                setForm((f) => ({ ...f, tanggal: e.target.value }))
              }
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-slate-600">Nama Barang</label>
            <input
              className="border rounded px-2 py-1 w-full"
              value={form.namaBarang}
              onChange={(e) =>
                setForm((f) => ({ ...f, namaBarang: e.target.value }))
              }
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">IMEI/Serial</label>
            <input
              className="border rounded px-2 py-1 w-full"
              value={form.imei}
              onChange={(e) => setForm((f) => ({ ...f, imei: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">Stok Sistem</label>
            <input
              type="number"
              className="border rounded px-2 py-1 w-full text-right"
              value={form.stokSistem}
              onChange={(e) =>
                setForm((f) => ({ ...f, stokSistem: toNum(e.target.value) }))
              }
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">Stok Fisik</label>
            <input
              type="number"
              className="border rounded px-2 py-1 w-full text-right"
              value={form.stokFisik}
              onChange={(e) =>
                setForm((f) => ({ ...f, stokFisik: toNum(e.target.value) }))
              }
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-slate-600">Keterangan</label>
            <input
              className="border rounded px-2 py-1 w-full"
              value={form.keterangan}
              onChange={(e) =>
                setForm((f) => ({ ...f, keterangan: e.target.value }))
              }
            />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          {editingId ? (
            <>
              <button
                onClick={saveEdit}
                className="rounded bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm"
              >
                Simpan Perubahan
              </button>
              <button
                onClick={cancelEdit}
                className="rounded border px-4 py-2 text-sm"
              >
                Batal
              </button>
            </>
          ) : (
            <button
              onClick={addNew}
              className="rounded bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm"
            >
              Tambah
            </button>
          )}
        </div>
      </div>

      {/* Tabel */}
      <div className="rounded-xl border bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Tanggal</th>
                <th className="px-3 py-2 text-left">Nama Barang</th>
                <th className="px-3 py-2 text-left">IMEI/Serial</th>
                <th className="px-3 py-2 text-right">Stok Sistem</th>
                <th className="px-3 py-2 text-right">Stok Fisik</th>
                <th className="px-3 py-2 text-left">Keterangan</th>
                <th className="px-3 py-2 text-left">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{r.tanggal || ""}</td>
                  <td className="px-3 py-2">{r.namaBarang}</td>
                  <td className="px-3 py-2">{r.imei || "-"}</td>
                  <td className="px-3 py-2 text-right">{r.stokSistem}</td>
                  <td className="px-3 py-2 text-right">{r.stokFisik}</td>
                  <td className="px-3 py-2">{r.keterangan || "-"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => onClickReturn(r)}
                        className="rounded bg-amber-600 hover:bg-amber-700 text-white px-2 py-1 text-xs"
                        title="Retur ke PUSAT"
                      >
                        Retur Pusat
                      </button>
                      <button
                        onClick={() => startEdit(r)}
                        className="rounded bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => removeLocalRow(r)}
                        className="rounded bg-red-600 hover:bg-red-700 text-white px-2 py-1 text-xs"
                      >
                        Hapus (Local)
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-6 text-center text-slate-500"
                  >
                    Tidak ada data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Retur PUSAT */}
      {open && targetRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-4 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-3">
              Retur Motor Listrik ke PUSAT
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <div className="text-sm">
                  <div>
                    <span className="text-slate-500">Nama:</span>{" "}
                    <b>{targetRow.namaBarang}</b>
                  </div>
                  <div>
                    <span className="text-slate-500">IMEI/Serial:</span>{" "}
                    <b>{targetRow.imei || "-"}</b>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    Stok Fisik Saat Ini: {toNum(targetRow.stokFisik)} | Stok
                    Sistem: {toNum(targetRow.stokSistem)}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-600">Qty</label>
                <input
                  type="number"
                  min={1}
                  className="border rounded px-2 py-1 w-full text-right"
                  value={qty}
                  onChange={(e) => setQty(toNum(e.target.value))}
                />
              </div>

              <div>
                <label className="text-xs text-slate-600">Mode</label>
                <select
                  className="border rounded px-2 py-1 w-full"
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                >
                  <option value="fisik">Fisik</option>
                  <option value="sistem">Sistem</option>
                  <option value="both">Fisik & Sistem</option>
                </select>
              </div>

              <div className="flex items-center gap-2 mt-6">
                <input
                  id="syncSystemMolis"
                  type="checkbox"
                  checked={syncSystem}
                  onChange={(e) => setSyncSystem(e.target.checked)}
                />
                <label htmlFor="syncSystemMolis" className="text-sm">
                  Ikut sinkron stok sistem (jika mode Fisik)
                </label>
              </div>

              <div className="md:col-span-2">
                <label className="text-xs text-slate-600">Catatan</label>
                <input
                  className="border rounded px-2 py-1 w-full"
                  placeholder="Catatan retur…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2 justify-end">
              <button
                className="border rounded px-4 py-2"
                onClick={() => setOpen(false)}
              >
                Batal
              </button>
              <button
                className="rounded bg-amber-600 hover:bg-amber-700 text-white px-4 py-2"
                onClick={doReturn}
              >
                Kirim Retur
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
