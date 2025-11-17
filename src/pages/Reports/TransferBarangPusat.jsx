// src/pages/Reports/TransferBarangPusat.jsx
import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

// Helper stok dari folder data
import {
  getStockIndex,
  STOCK_ALL, // agregat semua toko (dipakai untuk Pusat)
} from "../../data/StockBarang";

// Daftar toko & util lain dari data penjualan (nama toko seragam)
import { TOKO_LIST } from "../../data/ListDataPenjualan";

/* =========================================================================
   Utils
   ========================================================================= */
const toNum = (v) => (isNaN(Number(v)) ? 0 : Number(v));
const todayStr = () => new Date().toISOString().slice(0, 10);
const fmtIDR = (n) => {
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(n || 0);
  } catch {
    return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
  }
};

// Nama konsisten untuk pusat (kalau tidak ada di TOKO_LIST)
const PUSAT_NAME = "GUDANG PUSAT";

/** Buat key unik item per kategori (agar stok <> ledger konsisten) */
function makeItemKey(category, row) {
  const brand = (row.brand || "").trim();
  const name = (row.product || row.produk || row.name || "").trim();
  const warna = (row.warna || "").trim();
  if (category === "Handphone") {
    const imei = (row.imei || row.serial || "").trim();
    return `HP|${brand}|${name}|${warna}|${imei}`;
  }
  if (category === "Motor Listrik") {
    const dinamo = (row.no_dinamo || row.noDinamo || "").trim();
    return `MTR|${brand}|${name}|${warna}|${dinamo}`;
  }
  // Accessories
  const serial = (row.serial || row.imei || "-").trim();
  return `ACC|${brand}|${name}|${warna}|${serial}`;
}

/** Ambil stok dasar (dari master) untuk satu item di satu toko */
function getBaseQty(category, toko, itemKey) {
  const idx = toko === PUSAT_NAME ? STOCK_ALL : getStockIndex(toko);
  const list =
    category === "Handphone"
      ? idx.handphone
      : category === "Motor Listrik"
      ? idx.motor_listrik
      : idx.accessories;
  const qty = list
    .filter((r) => makeItemKey(category, r) === itemKey)
    .reduce((acc, r) => acc + (toNum(r.stok_sistem) || toNum(r.stok_fisik) || 0), 0);
  return qty;
}

/** Hitung net mutasi dari jurnal transfer (masuk-keluar) utk satu item+toko */
function getLedgerDelta(rows, toko, itemKey) {
  let delta = 0;
  for (const r of rows) {
    if (r.itemKey !== itemKey) continue;
    if (r.asal === toko) delta -= toNum(r.qty);
    if (r.tujuan === toko) delta += toNum(r.qty);
  }
  return delta;
}

/** Daftar kategori yang didukung */
const KATEGORI = ["Accessories", "Handphone", "Motor Listrik"];

/* =========================================================================
   Komponen utama
   ========================================================================= */
export default function TransferBarangPusat() {
  // ==================== STORAGE (local) ====================
  const LS_KEY = "transfer_pusat_v1";

  const [rows, setRows] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(LS_KEY));
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  });
  useEffect(() => localStorage.setItem(LS_KEY, JSON.stringify(rows)), [rows]);

  // ==================== FILTER ====================
  const [q, setQ] = useState("");
  const [filterKategori, setFilterKategori] = useState("Semua");
  const [filterAsal, setFilterAsal] = useState("Semua");
  const [filterTujuan, setFilterTujuan] = useState("Semua");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filteredRows = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterKategori !== "Semua" && (r.kategori || "") !== filterKategori) return false;
      if (filterAsal !== "Semua" && (r.asal || "") !== filterAsal) return false;
      if (filterTujuan !== "Semua" && (r.tujuan || "") !== filterTujuan) return false;
      if (dateFrom && (r.tanggal || "") < dateFrom) return false;
      if (dateTo && (r.tanggal || "") > dateTo) return false;
      if (ql) {
        const hay = [
          r.brand,
          r.produk,
          r.warna,
          r.imei,
          r.serial,
          r.noDinamo,
          r.keterangan,
          r.asal,
          r.tujuan,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      return true;
    });
  }, [rows, q, filterKategori, filterAsal, filterTujuan, dateFrom, dateTo]);

  // ==================== RINGKASAN ====================
  const summary = useMemo(
    () =>
      filteredRows.reduce(
        (acc, r) => {
          acc.count += 1;
          acc.qty += toNum(r.qty);
          return acc;
        },
        { count: 0, qty: 0 }
      ),
    [filteredRows]
  );

  // ==================== FORM ADD ====================
  const tokoOptions = useMemo(() => {
    // tampilkan pusat + seluruh toko
    return [PUSAT_NAME, ...TOKO_LIST];
  }, []);

  const [form, setForm] = useState({
    tanggal: todayStr(),
    kategori: "Accessories",
    asal: PUSAT_NAME,
    tujuan: TOKO_LIST?.[0] || "",
    // detail produk:
    brand: "",
    produk: "",
    warna: "",
    imei: "", // handphone
    serial: "", // aksesori (kalau ada)
    noDinamo: "", // motor
    qty: 1,
    keterangan: "",
  });

  // Ambil stok index untuk ASAL (sumber list item)
  const stockIdxAsal = useMemo(
    () => (form.asal === PUSAT_NAME ? STOCK_ALL : getStockIndex(form.asal)),
    [form.asal]
  );

  const listByKategori = useMemo(() => {
    if (form.kategori === "Handphone") return stockIdxAsal.handphone || [];
    if (form.kategori === "Motor Listrik") return stockIdxAsal.motor_listrik || [];
    return stockIdxAsal.accessories || [];
  }, [stockIdxAsal, form.kategori]);

  const brandOptions = useMemo(() => {
    const set = new Set();
    for (const r of listByKategori) {
      if (r.brand) set.add(r.brand);
    }
    return Array.from(set);
  }, [listByKategori]);

  const productOptions = useMemo(() => {
    const set = new Set();
    for (const r of listByKategori) {
      if (!form.brand || r.brand === form.brand) {
        const nama = r.product || r.produk || r.name;
        if (nama) set.add(nama);
      }
    }
    return Array.from(set);
  }, [listByKategori, form.brand]);

  const warnaOptions = useMemo(() => {
    const set = new Set();
    for (const r of listByKategori) {
      if (
        (!form.brand || r.brand === form.brand) &&
        (!form.produk || (r.product || r.produk || r.name) === form.produk)
      ) {
        if (r.warna) set.add(r.warna);
      }
    }
    return Array.from(set);
  }, [listByKategori, form.brand, form.produk]);

  const identitasOptions = useMemo(() => {
    // untuk kategori yang pakai identitas (HP: imei/serial, Motor: no_dinamo)
    const ids = [];
    for (const r of listByKategori) {
      const okBrand = !form.brand || r.brand === form.brand;
      const okProduk = !form.produk || (r.product || r.produk || r.name) === form.produk;
      const okWarna = !form.warna || r.warna === form.warna;
      if (!okBrand || !okProduk || !okWarna) continue;

      if (form.kategori === "Handphone") {
        const idv = r.imei || r.serial;
        if (idv) ids.push(idv);
      } else if (form.kategori === "Motor Listrik") {
        const idv = r.no_dinamo || r.noDinamo;
        if (idv) ids.push(idv);
      } else {
        // Accessories, optional serial
        const idv = r.serial || r.imei || "-";
        if (idv) ids.push(idv);
      }
    }
    // unik + tidak kosong
    return Array.from(new Set(ids.filter(Boolean)));
  }, [listByKategori, form.brand, form.produk, form.warna, form.kategori]);

  // Batas qty (hp & motor biasanya 1 per identitas)
  const isSerialBased =
    form.kategori === "Handphone" || form.kategori === "Motor Listrik";

  // Stok asal terkini (base + jurnal)
  const currentItemKey = useMemo(() => {
    return makeItemKey(form.kategori, {
      brand: form.brand,
      product: form.produk,
      warna: form.warna,
      imei: form.imei || form.serial,
      no_dinamo: form.noDinamo,
    });
  }, [form.kategori, form.brand, form.produk, form.warna, form.imei, form.serial, form.noDinamo]);

  const stokAsalSaatIni = useMemo(() => {
    if (!form.brand || !form.produk) return 0;
    const base = getBaseQty(form.kategori, form.asal, currentItemKey);
    const delta = getLedgerDelta(rows, form.asal, currentItemKey);
    return base + delta;
  }, [rows, form.asal, form.kategori, form.brand, form.produk, form.warna, currentItemKey]);

  // Validasi & tambah
  const addTransfer = () => {
    if (!form.tanggal) return alert("Tanggal belum diisi.");
    if (!form.kategori) return alert("Kategori belum dipilih.");
    if (!form.asal || !form.tujuan) return alert("Asal & tujuan harus diisi.");
    if (form.asal === form.tujuan) return alert("Asal dan tujuan tidak boleh sama.");
    if (!form.brand || !form.produk)
      return alert("Brand/Produk belum lengkap.");

    const qty = isSerialBased ? 1 : Math.max(1, toNum(form.qty));
    if (stokAsalSaatIni < qty)
      return alert(`Stok asal tidak mencukupi. Sisa: ${stokAsalSaatIni}`);

    const newRow = {
      id: rows.length ? Math.max(...rows.map((r) => Number(r.id) || 0)) + 1 : 1,
      tanggal: form.tanggal,
      kategori: form.kategori,
      asal: form.asal,
      tujuan: form.tujuan,
      brand: form.brand,
      produk: form.produk,
      warna: form.warna,
      imei: form.kategori === "Handphone" ? form.imei || form.serial : "",
      serial:
        form.kategori === "Accessories" ? form.serial || form.imei || "" : "",
      noDinamo: form.kategori === "Motor Listrik" ? form.noDinamo : "",
      qty,
      keterangan: form.keterangan || "",
      itemKey: currentItemKey,
    };
    setRows((prev) => [newRow, ...prev]);

    // reset ringan (tetap pertahankan pilihan kategori/asal/tujuan agar cepat input batch)
    setForm((f) => ({
      ...f,
      brand: "",
      produk: "",
      warna: "",
      imei: "",
      serial: "",
      noDinamo: "",
      qty: isSerialBased ? 1 : 1,
      keterangan: "",
    }));
  };

  // Edit / Delete
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);

  const beginEdit = (row) => {
    setEditingId(row.id);
    setEditDraft({ ...row });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setEditDraft(null);
  };
  const saveEdit = () => {
    if (!editDraft) return;
    // Validasi stok untuk perubahan qty/asal/tujuan/item
    const key = editDraft.itemKey;
    const base = getBaseQty(editDraft.kategori, editDraft.asal, key);
    // hitung delta jurnal KECUALI baris yang lagi diedit
    const deltaKecuali = rows
      .filter((r) => r.id !== editingId)
      .reduce((acc, r) => acc + (r.asal === editDraft.asal && r.itemKey === key ? -toNum(r.qty) : 0) + (r.tujuan === editDraft.asal && r.itemKey === key ? toNum(r.qty) : 0), 0);
    const stokSaatIni = base + deltaKecuali;
    if (stokSaatIni < toNum(editDraft.qty))
      return alert(`Stok asal tidak cukup untuk perubahan ini. Sisa: ${stokSaatIni}`);

    setRows((prev) => prev.map((r) => (r.id === editingId ? { ...editDraft, qty: toNum(editDraft.qty) } : r)));
    cancelEdit();
  };
  const deleteRow = (id) => {
    if (!window.confirm("Hapus transfer ini?")) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  // Export Excel
  const exportExcel = () => {
    const data = filteredRows.map((r) => ({
      TANGGAL: r.tanggal,
      KATEGORI: r.kategori,
      ASAL: r.asal,
      TUJUAN: r.tujuan,
      BRAND: r.brand,
      PRODUK: r.produk,
      WARNA: r.warna,
      IMEI: r.imei,
      SERIAL: r.serial,
      NO_DINAMO: r.noDinamo,
      QTY: r.qty,
      KETERANGAN: r.keterangan,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TRANSFER_PUSAT");
    const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    XLSX.writeFile(wb, `TRANSFER_BARANG_PUSAT_${ymd}.xlsx`);
  };

  // ==================== RENDER ====================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            Laporan Transfer Barang — Gudang Pusat
          </h1>
          <p className="text-slate-600">
            Pencatatan alur transfer antar toko. Stok asal tervalidasi terhadap
            stok master + jurnal (local).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.history.back()}
            className="rounded-lg border bg-white px-3 py-2 text-sm shadow-sm hover:bg-slate-50"
          >
            ← Kembali
          </button>
          <button
            onClick={exportExcel}
            className="rounded-lg border bg-white px-3 py-2 text-sm shadow-sm hover:bg-slate-50"
          >
            Export (.xlsx)
          </button>
        </div>
      </div>

      {/* Filter */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-3">
            <label className="text-xs text-slate-600">Cari</label>
            <input
              className="w-full border rounded px-2 py-1"
              placeholder="brand/produk/warna/imei/serial/no dinamo/note"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="md:col-span-3">
            <label className="text-xs text-slate-600">Kategori</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={filterKategori}
              onChange={(e) => setFilterKategori(e.target.value)}
            >
              <option>Semua</option>
              {KATEGORI.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="text-xs text-slate-600">Asal</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={filterAsal}
              onChange={(e) => setFilterAsal(e.target.value)}
            >
              <option>Semua</option>
              {[PUSAT_NAME, ...TOKO_LIST].map((t) => (
                <option key={`fa-${t}`} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="text-xs text-slate-600">Tujuan</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={filterTujuan}
              onChange={(e) => setFilterTujuan(e.target.value)}
            >
              <option>Semua</option>
              {[PUSAT_NAME, ...TOKO_LIST].map((t) => (
                <option key={`ft-${t}`} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-1">
            <label className="text-xs text-slate-600">Dari</label>
            <input
              type="date"
              className="w-full border rounded px-2 py-1"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="md:col-span-1">
            <label className="text-xs text-slate-600">Sampai</label>
            <input
              type="date"
              className="w-full border rounded px-2 py-1"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Ringkasan */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Total Transaksi</div>
          <div className="mt-1 text-2xl font-semibold">{summary.count}</div>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Total Qty Dipindah</div>
          <div className="mt-1 text-2xl font-semibold">{summary.qty}</div>
        </div>
      </div>

      {/* Form Transfer */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Tambah Transfer</h2>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div>
            <label className="text-xs text-slate-600">Tanggal</label>
            <input
              type="date"
              className="w-full border rounded px-2 py-1"
              value={form.tanggal}
              onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs text-slate-600">Kategori</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={form.kategori}
              onChange={(e) =>
                setForm({
                  ...form,
                  kategori: e.target.value,
                  brand: "",
                  produk: "",
                  warna: "",
                  imei: "",
                  serial: "",
                  noDinamo: "",
                  qty: e.target.value === "Accessories" ? 1 : 1,
                })
              }
            >
              {KATEGORI.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-600">Asal</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={form.asal}
              onChange={(e) =>
                setForm({
                  ...form,
                  asal: e.target.value,
                  brand: "",
                  produk: "",
                  warna: "",
                  imei: "",
                  serial: "",
                  noDinamo: "",
                })
              }
            >
              {[PUSAT_NAME, ...TOKO_LIST].map((t) => (
                <option key={`asal-${t}`} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-600">Tujuan</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={form.tujuan}
              onChange={(e) => setForm({ ...form, tujuan: e.target.value })}
            >
              {[PUSAT_NAME, ...TOKO_LIST].map((t) => (
                <option key={`tujuan-${t}`} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-slate-600">Keterangan (opsional)</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={form.keterangan}
              onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
              placeholder="Catatan/Alasan transfer"
            />
          </div>
        </div>

        {/* Pilih item */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mt-3">
          <div>
            <label className="text-xs text-slate-600">Brand</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={form.brand}
              onChange={(e) =>
                setForm({ ...form, brand: e.target.value, produk: "", warna: "", imei: "", serial: "", noDinamo: "" })
              }
            >
              <option value="">— Pilih —</option>
              {brandOptions.map((b) => (
                <option key={`b-${b}`} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-slate-600">Produk</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={form.produk}
              onChange={(e) =>
                setForm({ ...form, produk: e.target.value, warna: "", imei: "", serial: "", noDinamo: "" })
              }
            >
              <option value="">— Pilih —</option>
              {productOptions.map((p) => (
                <option key={`p-${p}`} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-600">Warna</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={form.warna}
              onChange={(e) => setForm({ ...form, warna: e.target.value })}
            >
              <option value="">— Pilih —</option>
              {warnaOptions.map((w) => (
                <option key={`w-${w}`} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>

          {/* Identitas per kategori */}
          {form.kategori === "Handphone" && (
            <div className="md:col-span-2">
              <label className="text-xs text-slate-600">IMEI/Serial</label>
              <select
                className="w-full border rounded px-2 py-1"
                value={form.imei}
                onChange={(e) => setForm({ ...form, imei: e.target.value })}
              >
                <option value="">— Pilih —</option>
                {identitasOptions.map((idv) => (
                  <option key={`idv-${idv}`} value={idv}>
                    {idv}
                  </option>
                ))}
              </select>
            </div>
          )}

          {form.kategori === "Motor Listrik" && (
            <div className="md:col-span-2">
              <label className="text-xs text-slate-600">No Dinamo</label>
              <select
                className="w-full border rounded px-2 py-1"
                value={form.noDinamo}
                onChange={(e) => setForm({ ...form, noDinamo: e.target.value })}
              >
                <option value="">— Pilih —</option>
                {identitasOptions.map((idv) => (
                  <option key={`din-${idv}`} value={idv}>
                    {idv}
                  </option>
                ))}
              </select>
            </div>
          )}

          {form.kategori === "Accessories" && (
            <div className="md:col-span-2">
              <label className="text-xs text-slate-600">Serial (opsional)</label>
              <select
                className="w-full border rounded px-2 py-1"
                value={form.serial}
                onChange={(e) => setForm({ ...form, serial: e.target.value })}
              >
                <option value="">— (tanpa serial) —</option>
                {identitasOptions.map((idv) => (
                  <option key={`ser-${idv}`} value={idv}>
                    {idv}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Qty + info stok */}
          <div>
            <label className="text-xs text-slate-600">
              Qty {isSerialBased ? "(1 per identitas)" : ""}
            </label>
            <input
              type="number"
              min={1}
              className="w-full border rounded px-2 py-1 text-right"
              value={form.qty}
              onChange={(e) =>
                setForm({
                  ...form,
                  qty: isSerialBased ? 1 : Math.max(1, toNum(e.target.value)),
                })
              }
              disabled={isSerialBased}
            />
          </div>

          <div>
            <label className="text-xs text-slate-600">Stok Asal Saat Ini</label>
            <input
              readOnly
              className="w-full border rounded px-2 py-1 bg-slate-50 text-right"
              value={stokAsalSaatIni}
              title="Stok master + jurnal transfer"
            />
          </div>
        </div>

        <div className="mt-3">
          <button
            onClick={addTransfer}
            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-semibold shadow-sm"
          >
            Tambah Transfer
          </button>
        </div>
      </div>

      {/* Tabel Transfer */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Data Transfer (Terfilter)</h2>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Tanggal</th>
                <th className="px-3 py-2 text-left">Kategori</th>
                <th className="px-3 py-2 text-left">Asal</th>
                <th className="px-3 py-2 text-left">Tujuan</th>
                <th className="px-3 py-2 text-left">Brand</th>
                <th className="px-3 py-2 text-left">Produk</th>
                <th className="px-3 py-2 text-left">Warna</th>
                <th className="px-3 py-2 text-left">IMEI/Serial/No Dinamo</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-left">Keterangan</th>
                <th className="px-3 py-2 text-left">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const isEditing = editingId === row.id;

                if (isEditing && editDraft) {
                  return (
                    <tr key={row.id} className="border-b last:border-0 bg-slate-50/50">
                      <td className="px-3 py-2">
                        <input
                          type="date"
                          className="border rounded px-2 py-1"
                          value={editDraft.tanggal}
                          onChange={(e) =>
                            setEditDraft((d) => ({ ...d, tanggal: e.target.value }))
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="border rounded px-2 py-1"
                          value={editDraft.kategori}
                          onChange={(e) =>
                            setEditDraft((d) => ({ ...d, kategori: e.target.value }))
                          }
                        >
                          {KATEGORI.map((k) => (
                            <option key={`ek-${k}`} value={k}>
                              {k}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="border rounded px-2 py-1"
                          value={editDraft.asal}
                          onChange={(e) => setEditDraft((d) => ({ ...d, asal: e.target.value }))}
                        >
                          {[PUSAT_NAME, ...TOKO_LIST].map((t) => (
                            <option key={`ea-${t}`} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="border rounded px-2 py-1"
                          value={editDraft.tujuan}
                          onChange={(e) =>
                            setEditDraft((d) => ({ ...d, tujuan: e.target.value }))
                          }
                        >
                          {[PUSAT_NAME, ...TOKO_LIST].map((t) => (
                            <option key={`et-${t}`} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="border rounded px-2 py-1"
                          value={editDraft.brand || ""}
                          onChange={(e) =>
                            setEditDraft((d) => ({ ...d, brand: e.target.value }))
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="border rounded px-2 py-1"
                          value={editDraft.produk || ""}
                          onChange={(e) =>
                            setEditDraft((d) => ({ ...d, produk: e.target.value }))
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="border rounded px-2 py-1"
                          value={editDraft.warna || ""}
                          onChange={(e) =>
                            setEditDraft((d) => ({ ...d, warna: e.target.value }))
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="border rounded px-2 py-1 w-44"
                          value={editDraft.imei || editDraft.serial || editDraft.noDinamo || ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setEditDraft((d) => ({
                              ...d,
                              imei: d.kategori === "Handphone" ? val : "",
                              serial: d.kategori === "Accessories" ? val : "",
                              noDinamo: d.kategori === "Motor Listrik" ? val : "",
                            }));
                          }}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          className="border rounded px-2 py-1 text-right w-24"
                          value={editDraft.qty}
                          onChange={(e) =>
                            setEditDraft((d) => ({ ...d, qty: toNum(e.target.value) }))
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="border rounded px-2 py-1 w-56"
                          value={editDraft.keterangan || ""}
                          onChange={(e) =>
                            setEditDraft((d) => ({ ...d, keterangan: e.target.value }))
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button
                            onClick={saveEdit}
                            className="px-2 py-1 text-xs rounded bg-green-600 text-white hover:bg-green-700"
                          >
                            Simpan
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="px-2 py-1 text-xs rounded bg-slate-100 hover:bg-slate-200"
                          >
                            Batal
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }

                const ident =
                  row.kategori === "Handphone"
                    ? row.imei
                    : row.kategori === "Motor Listrik"
                    ? row.noDinamo
                    : row.serial || "-";

                return (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="px-3 py-2">{row.tanggal}</td>
                    <td className="px-3 py-2">{row.kategori}</td>
                    <td className="px-3 py-2">{row.asal}</td>
                    <td className="px-3 py-2">{row.tujuan}</td>
                    <td className="px-3 py-2">{row.brand}</td>
                    <td className="px-3 py-2">{row.produk}</td>
                    <td className="px-3 py-2">{row.warna || "-"}</td>
                    <td className="px-3 py-2">{ident || "-"}</td>
                    <td className="px-3 py-2 text-right">{row.qty}</td>
                    <td className="px-3 py-2">{row.keterangan || "-"}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => beginEdit(row)}
                          className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteRow(row.id)}
                          className="px-2 py-1 text-xs rounded bg-red-600 text-white hover:bg-red-700"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-3 py-6 text-center text-slate-500">
                    Belum ada data sesuai filter/kata kunci.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Sumber stok: helper <code>getStockIndex(toko)</code> dan <code>STOCK_ALL</code> (untuk {PUSAT_NAME}).{" "}
        Stok asal tervalidasi menggunakan stok master + jurnal transfer lokal.
      </p>
    </div>
  );
}
