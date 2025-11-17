// src/pages/stock/StockMotorListrikPusat.jsx
import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import TOKO_LABELS, { ALL_TOKO_IDS } from "../../data/TokoLabels";
import { getStockIndex } from "../../data/StockBarang";
import { transferStock, CENTRAL_NAME, onStockChange } from "../../data/StockTransfer";

const LOCAL_KEY = "MMT_STOCK_MOLIS_LOCAL_V1";

const toNum = (v) => (isNaN(Number(v)) ? 0 : Number(v));
const today = () => new Date().toISOString().slice(0, 10);
const tokoNameFromId = (id) => TOKO_LABELS[Number(id)] || `Toko ${id}`;

// kunci untuk motor listrik: noDinamo (utama) → fallback nama
const makeKey = (row) => {
  const no = (row.noDinamo || row.no_dinamo || "").toString().trim().toLowerCase();
  const nama = (row.namaBarang || row.nama || "").toString().trim().toLowerCase();
  return no || nama;
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

function mergeRowsForPusat() {
  const idx = getStockIndex(CENTRAL_NAME) || {};
  const base = Array.isArray(idx.motor_listrik) ? idx.motor_listrik : [];
  const map = readLocalMap();
  const localArr = Array.isArray(map[CENTRAL_NAME]) ? map[CENTRAL_NAME] : [];

  const baseMap = new Map();
  for (const r of base) {
    baseMap.set(makeKey(r), {
      source: "base",
      tanggal: r.tanggal ? String(r.tanggal).slice(0, 10) : "",
      tokoName: CENTRAL_NAME,
      namaBarang: r.namaBarang || r.nama || r.name || r.product || "",
      noDinamo: (r.noDinamo || r.no_dinamo || r.serial || "").toString(),
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
      tokoName: CENTRAL_NAME,
      namaBarang: r.namaBarang || "",
      noDinamo: (r.noDinamo || r.no_dinamo || "").toString(),
      stokSistem: toNum(r.stokSistem),
      stokFisik: toNum(r.stokFisik),
      keterangan: r.keterangan || "",
    });
  }

  return Array.from(baseMap.values()).map((x, i) => ({ id: i + 1, ...x }));
}

export default function StockMotorListrikPusat({ user }) {
  const [rows, setRows] = useState(() => mergeRowsForPusat());
  const [filter, setFilter] = useState("");

  const [open, setOpen] = useState(false);
  const [targetRow, setTargetRow] = useState(null);
  const [tokoTargetId, setTokoTargetId] = useState(ALL_TOKO_IDS[0] || 1);
  const [qty, setQty] = useState(1);
  const [mode, setMode] = useState("fisik");
  const [syncSystem, setSyncSystem] = useState(false);
  const [note, setNote] = useState("");

  const [form, setForm] = useState({
    tanggal: today(),
    namaBarang: "",
    noDinamo: "",
    stokSistem: 0,
    stokFisik: 0,
    keterangan: "",
  });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    const unsub = onStockChange(() => setRows(mergeRowsForPusat()));
    return unsub;
  }, []);

  const filtered = useMemo(() => {
    if (!filter.trim()) return rows;
    const q = filter.trim().toLowerCase();
    return rows.filter(
      (r) =>
        (r.namaBarang || "").toLowerCase().includes(q) ||
        (r.noDinamo || "").toLowerCase().includes(q) ||
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
    setRows(mergeRowsForPusat());
  }
  function upsertLocalRow(row) {
    const map = readLocalMap();
    const arr = Array.isArray(map[CENTRAL_NAME]) ? [...map[CENTRAL_NAME]] : [];
    const k = makeKey(row);
    const without = arr.filter((x) => makeKey(x) !== k);
    without.push({
      tanggal: row.tanggal || today(),
      namaBarang: row.namaBarang || "",
      noDinamo: (row.noDinamo || "").toString(),
      stokSistem: toNum(row.stokSistem),
      stokFisik: toNum(row.stokFisik),
      keterangan: row.keterangan || "",
    });
    map[CENTRAL_NAME] = without;
    writeLocalMap(map);
    reload();
  }
  function removeLocalRow(row) {
    const map = readLocalMap();
    const arr = Array.isArray(map[CENTRAL_NAME]) ? [...map[CENTRAL_NAME]] : [];
    const k = makeKey(row);
    const filtered = arr.filter((x) => makeKey(x) !== k);
    map[CENTRAL_NAME] = filtered;
    writeLocalMap(map);
    reload();
  }

  function onClickTransfer(row) {
    setTargetRow(row);
    setQty(1);
    setMode("fisik");
    setSyncSystem(false);
    setNote("");
    setOpen(true);
  }
  async function doTransfer() {
    if (!targetRow) return;
    const tokoTujuan = tokoNameFromId(tokoTargetId);
    try {
      await transferStock({
        from: CENTRAL_NAME,
        to: tokoTujuan,
        category: "motor_listrik",
        keyFields: { noDinamo: targetRow.noDinamo, namaBarang: targetRow.namaBarang },
        qty: toNum(qty),
        mode,
        syncSystem,
        meta: { by: user?.username || user?.name || "system", note },
      });
      setOpen(false);
      reload();
      alert(`Berhasil transfer ${qty} unit ke ${tokoTujuan}.`);
    } catch (err) {
      alert(`Gagal transfer: ${err.message || err}`);
    }
  }

  function exportExcel() {
    const data = filtered.map((r) => ({
      TANGGAL: r.tanggal || "",
      LOKASI: CENTRAL_NAME,
      NAMA_BARANG: r.namaBarang,
      NO_DINAMO: r.noDinamo || "",
      STOK_SISTEM: r.stokSistem,
      STOK_FISIK: r.stokFisik,
      KETERANGAN: r.keterangan || "",
      SOURCE: r.source || "base",
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MOLIS_PUSAT");
    const ymd = today().replace(/-/g, "");
    XLSX.writeFile(wb, `STOCK_MOLIS_PUSAT_${ymd}.xlsx`);
  }

  function startEdit(row) {
    setEditingId(row.id);
    setForm({
      tanggal: row.tanggal || today(),
      namaBarang: row.namaBarang || "",
      noDinamo: row.noDinamo || "",
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
      noDinamo: "",
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
    if (!form.namaBarang && !form.noDinamo) {
      alert("Isi minimal Nama Barang atau No Dinamo");
      return;
    }
    upsertLocalRow(form);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Stok Motor Listrik — PUSAT</h1>
          <p className="text-slate-600 text-sm">Transfer ke toko via modal, data base + local override.</p>
        </div>
        <div className="flex gap-2">
          <input
            placeholder="Cari nama/No Dinamo/keterangan…"
            className="border rounded px-3 py-2 w-60"
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
        <h2 className="font-semibold text-lg mb-3">{editingId ? "Edit Stok (Local PUSAT)" : "Tambah Stok (Local PUSAT)"}</h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div>
            <label className="text-xs text-slate-600">Tanggal</label>
            <input
              type="date"
              className="border rounded px-2 py-1 w-full"
              value={form.tanggal}
              onChange={(e) => setForm((f) => ({ ...f, tanggal: e.target.value }))}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-slate-600">Nama Barang</label>
            <input
              className="border rounded px-2 py-1 w-full"
              value={form.namaBarang}
              onChange={(e) => setForm((f) => ({ ...f, namaBarang: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">No Dinamo</label>
            <input
              className="border rounded px-2 py-1 w-full"
              value={form.noDinamo}
              onChange={(e) => setForm((f) => ({ ...f, noDinamo: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">Stok Sistem</label>
            <input
              type="number"
              className="border rounded px-2 py-1 w-full text-right"
              value={form.stokSistem}
              onChange={(e) => setForm((f) => ({ ...f, stokSistem: toNum(e.target.value) }))}
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">Stok Fisik</label>
            <input
              type="number"
              className="border rounded px-2 py-1 w-full text-right"
              value={form.stokFisik}
              onChange={(e) => setForm((f) => ({ ...f, stokFisik: toNum(e.target.value) }))}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-slate-600">Keterangan</label>
            <input
              className="border rounded px-2 py-1 w-full"
              value={form.keterangan}
              onChange={(e) => setForm((f) => ({ ...f, keterangan: e.target.value }))}
            />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          {editingId ? (
            <>
              <button onClick={saveEdit} className="rounded bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm">
                Simpan Perubahan
              </button>
              <button onClick={cancelEdit} className="rounded border px-4 py-2 text-sm">
                Batal
              </button>
            </>
          ) : (
            <button onClick={addNew} className="rounded bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm">
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
                <th className="px-3 py-2 text-left">No Dinamo</th>
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
                  <td className="px-3 py-2">{r.noDinamo || "-"}</td>
                  <td className="px-3 py-2 text-right">{r.stokSistem}</td>
                  <td className="px-3 py-2 text-right">{r.stokFisik}</td>
                  <td className="px-3 py-2">{r.keterangan || "-"}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => onClickTransfer(r)}
                        className="rounded bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 text-xs"
                      >
                        Transfer
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
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-500">
                    Tidak ada data.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Transfer */}
      {open && targetRow && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-4 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-3">Transfer Motor Listrik dari PUSAT ke Toko</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <div className="text-sm">
                  <div><span className="text-slate-500">Nama:</span> <b>{targetRow.namaBarang}</b></div>
                  <div><span className="text-slate-500">No Dinamo:</span> <b>{targetRow.noDinamo || "-"}</b></div>
                  <div className="mt-1 text-xs text-slate-500">
                    Stok Fisik Saat Ini: {toNum(targetRow.stokFisik)} | Stok Sistem: {toNum(targetRow.stokSistem)}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-600">Toko Tujuan</label>
                <select
                  className="border rounded px-2 py-1 w-full"
                  value={tokoTargetId}
                  onChange={(e) => setTokoTargetId(Number(e.target.value))}
                >
                  {ALL_TOKO_IDS.map((id) => (
                    <option key={id} value={id}>
                      {TOKO_LABELS[id]}
                    </option>
                  ))}
                </select>
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
                  placeholder="Catatan transfer…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-4 flex gap-2 justify-end">
              <button className="border rounded px-4 py-2" onClick={() => setOpen(false)}>
                Batal
              </button>
              <button
                className="rounded bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2"
                onClick={doTransfer}
              >
                Kirim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
