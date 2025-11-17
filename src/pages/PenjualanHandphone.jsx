// src/pages/PenjualanHandphone.jsx
import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

// Master harga & katalog produk (jika tersedia untuk HP)
import {
  getBrandIndex,
  getProductsByBrand,
  findHarga,
} from "../data/MasterDataHargaPenjualan";

// List/dropdown + helper keuangan
import {
  TOKO_LIST,
  PAYMENT_METHODS,
  PRICE_CATEGORIES,
  TENOR_OPTIONS,
  getMdr,
  getSalesByToko,
  getBungaByTenor, // pastikan sudah ada di ListDataPenjualan.js
} from "../data/ListDataPenjualan";

/* ================= Utils ================= */
const toNum = (v) => (isNaN(Number(v)) ? 0 : Number(v));
const unique = (arr) =>
  Array.from(new Set((arr || []).map((x) => (x ?? "").toString().trim()).filter(Boolean)));

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

const todayStr = () => new Date().toISOString().slice(0, 10);

/* Ambil daftar warna dari index brand lokal (pengganti getWarnaByBrandProduct) */
function getWarnaOptions(brand, produk) {
  if (!brand || !produk) return [];
  try {
    const idx = getBrandIndex() || [];
    const b = idx.find((x) => x.brand === brand);
    const p = b?.products?.find((pp) => (pp.name || pp.product || "").toString() === produk);
    // fallback jika skema warna beda: 'warna', 'colors', 'variants'
    return (
      p?.warna ||
      p?.colors ||
      p?.variants?.map((v) => v.warna || v.color).filter(Boolean) ||
      []
    );
  } catch {
    return [];
  }
}

function computeFinancials(row) {
  const qty = toNum(row.qty);
  const harga = toNum(row.harga);
  const base = qty * harga;

  const addOns =
    toNum(row.ongkir) +
    toNum(row.accAmount1) +
    toNum(row.accAmount2) +
    toNum(row.bundlingAmount);

  const subtotal = base + addOns;

  const mdrPct =
    getMdr({
      method: row.paymentMethod,
      toko: row.tokoRef,
      brand: row.brand,
    }) || 0;

  const mdrFee = subtotal * (Number(mdrPct) / 100);
  const net = subtotal - mdrFee;

  const method = (row.paymentMethod || "").toLowerCase();
  if (method === "kredit") {
    const dp = Math.max(toNum(row.dp), 0);
    const tenor = Math.max(toNum(row.tenor), 0);
    const bungaRate = Math.max(toNum(row.bunga), 0) / 100;
    const principal = Math.max(subtotal - dp, 0);
    const totalBunga = principal * bungaRate * (tenor || 0);
    const cicilan = tenor > 0 ? (principal + totalBunga) / tenor : 0;
    const grandTotal = dp + principal + totalBunga;
    return {
      base,
      addOns,
      subtotal,
      mdrPct,
      mdrFee,
      net,
      dp,
      tenor,
      bungaRate,
      principal,
      totalBunga,
      cicilan,
      grandTotal,
    };
  }

  return {
    base,
    addOns,
    subtotal,
    mdrPct,
    mdrFee,
    net,
    dp: toNum(row.dp),
    tenor: 0,
    bungaRate: 0,
    principal: subtotal,
    totalBunga: 0,
    cicilan: 0,
    grandTotal: subtotal,
  };
}

/* ================= Komponen ================= */
export default function PenjualanHandphone() {
  /* ---------- sumber pilihan brand/produk dari master (opsional) ---------- */
  const brandIndex = useMemo(() => getBrandIndex() || [], []);
  const brandOptions = useMemo(() => unique((brandIndex || []).map((b) => b.brand)), [brandIndex]);

  /* ---------- dataset (localStorage) ---------- */
  const LS_KEY = "hp_sales_pusat_v1";

  const [rows, setRows] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(LS_KEY));
      if (Array.isArray(raw)) return raw;
      return [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(rows));
  }, [rows]);

  /* ---------- filter & search ---------- */
  const [q, setQ] = useState("");
  const [filterToko, setFilterToko] = useState("Semua");
  const [filterMethod, setFilterMethod] = useState("Semua");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filteredRows = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterToko !== "Semua" && (r.tokoRef || "") !== filterToko) return false;
      if (filterMethod !== "Semua" && (r.paymentMethod || "") !== filterMethod) return false;

      if (dateFrom && (r.tanggal || "") < dateFrom) return false;
      if (dateTo && (r.tanggal || "") > dateTo) return false;

      if (ql) {
        const hay = [
          r.produk,
          r.brand,
          r.imei,
          r.salesName,
          r.leasingName,
          r.tokoRef,
          r.storeName,
          r.note,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(ql)) return false;
      }
      return true;
    });
  }, [rows, q, filterToko, filterMethod, dateFrom, dateTo]);

  /* ---------- ringkasan ---------- */
  const summary = useMemo(() => {
    return filteredRows.reduce(
      (acc, r) => {
        const f = computeFinancials(r);
        acc.count += 1;
        acc.qty += toNum(r.qty);
        acc.subtotal += f.subtotal;
        acc.net += f.net;
        return acc;
      },
      { count: 0, qty: 0, subtotal: 0, net: 0 }
    );
  }, [filteredRows]);

  /* ---------- form add ---------- */
  const [form, setForm] = useState({
    tanggal: todayStr(),
    tokoRef: TOKO_LIST?.[0] || "",
    storeName: "",
    salesName: "",
    shName: "",
    slName: "",
    nik: "",
    // produk
    brand: brandOptions?.[0] || "",
    produk: "",
    warna: "",
    imei: "",
    qty: 1,
    hargaType: "SRP", // untuk lookup preferensi harga di master
    srp: 0,
    grosir: 0,
    harga: 0,
    kategori: "Handphone",
    priceCategory: PRICE_CATEGORIES?.[0] || "",
    // payment
    paymentMethod: PAYMENT_METHODS?.[0] || "Cash",
    leasingName: "",
    tenor: 0,
    bunga: 0, // auto by tenor
    dp: 0,
    dpMerchant: 0,
    dpToko: 0,
    dpTalangan: 0,
    // addons sederhana
    ongkir: 0,
    accName1: "",
    accAmount1: 0,
    accName2: "",
    accAmount2: 0,
    bundlingName: "",
    bundlingAmount: 0,
    // note
    note: "",
    approved: false,
  });

  // pilihan produk/warna by brand dari master (jika tersedia)
  const productOptions = useMemo(() => {
    if (!form.brand) return [];
    try {
      return getProductsByBrand(form.brand) || [];
    } catch {
      return [];
    }
  }, [form.brand]);

  const warnaOptions = useMemo(() => getWarnaOptions(form.brand, form.produk), [form.brand, form.produk]);

  // harga otomatis kalau ada di master
  useEffect(() => {
    if (!form.produk) return;
    const row = findHarga({
      brand: form.brand,
      name: form.produk,
      warna: form.warna,
      prefer: form.hargaType === "SRP" ? "srp" : "grosir",
    });
    if (row) {
      setForm((f) => ({
        ...f,
        srp: toNum(row.srp),
        grosir: toNum(row.grosir),
        harga: toNum(row.harga) || toNum(row[f.hargaType?.toLowerCase?.() || "grosir"]) || 0,
      }));
    }
  }, [form.brand, form.produk, form.warna, form.hargaType]);

  // isi data sales otomatis saat pilih toko & nama sales
  const salesOptions = useMemo(() => getSalesByToko(form.tokoRef) || [], [form.tokoRef]);

  useEffect(() => {
    if (!form.salesName) return;
    const s =
      salesOptions.find((x) => (x.name || "").toLowerCase() === form.salesName.toLowerCase()) ||
      null;
    if (s) {
      setForm((f) => ({
        ...f,
        nik: f.nik || s.nik || "",
        storeName: f.storeName || s.store || "",
        shName: f.shName || s.sh || "",
        slName: f.sl || f.slName || "",
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.salesName, salesOptions]);

  // bunga auto by tenor
  useEffect(() => {
    if (!form.tenor) {
      setForm((f) => ({ ...f, bunga: 0 }));
      return;
    }
    const p = getBungaByTenor({
      tenor: Number(form.tenor),
      method: form.paymentMethod,
      brand: form.brand,
      toko: form.tokoRef,
    });
    setForm((f) => ({ ...f, bunga: Number(p || 0) }));
  }, [form.tenor, form.paymentMethod, form.brand, form.tokoRef]);

  // add row
  const addRow = () => {
    const newRow = {
      id: rows.length ? Math.max(...rows.map((r) => Number(r.id) || 0)) + 1 : 1,
      ...form,
      qty: toNum(form.qty),
      srp: toNum(form.srp),
      grosir: toNum(form.grosir),
      harga: toNum(form.harga),
      dp: toNum(form.dp),
      dpMerchant: toNum(form.dpMerchant),
      dpToko: toNum(form.dpToko),
      dpTalangan: toNum(form.dpTalangan),
      ongkir: toNum(form.ongkir),
      accAmount1: toNum(form.accAmount1),
      accAmount2: toNum(form.accAmount2),
      bundlingAmount: toNum(form.bundlingAmount),
      approved: !!form.approved,
    };
    setRows((prev) => [newRow, ...prev]);

    // reset ringan
    setForm((f) => ({
      ...f,
      produk: "",
      warna: "",
      imei: "",
      qty: 1,
      harga: 0,
      dp: 0,
      dpMerchant: 0,
      dpToko: 0,
      dpTalangan: 0,
      ongkir: 0,
      accName1: "",
      accAmount1: 0,
      accName2: "",
      accAmount2: 0,
      bundlingName: "",
      bundlingAmount: 0,
      note: "",
      approved: false,
    }));
  };

  /* ---------- edit/delete ---------- */
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
    setRows((prev) => prev.map((r) => (r.id === editingId ? { ...editDraft } : r)));
    cancelEdit();
  };
  const deleteRow = (id) => {
    if (!window.confirm("Hapus baris ini?")) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  /* ---------- export ---------- */
  const exportExcel = () => {
    const data = filteredRows.map((r) => {
      const f = computeFinancials(r);
      return {
        TANGGAL: r.tanggal,
        TOKO: r.tokoRef,
        STORE: r.storeName,
        SALES: r.salesName,
        BRAND: r.brand,
        PRODUK: r.produk,
        WARNA: r.warna,
        IMEI: r.imei,
        QTY: r.qty,
        HARGA_DIPAKAI: r.hargaType,
        HARGA: r.harga,
        ADDON_ONGKIR: r.ongkir,
        ADDON_ACC1: r.accAmount1,
        ADDON_ACC2: r.accAmount2,
        ADDON_BUNDLING: r.bundlingAmount,
        SUBTOTAL: Math.round(f.subtotal),
        MDR_PCT: Number(f.mdrPct).toFixed(2),
        MDR_FEE: Math.round(f.mdrFee),
        NET: Math.round(f.net),
        PAYMENT: r.paymentMethod,
        LEASING: r.leasingName,
        TENOR: r.tenor,
        BUNGA_PCT: r.bunga,
        CICILAN: Math.round(f.cicilan),
        GRAND_TOTAL: Math.round(f.grandTotal),
        DP_UTAMA: r.dp,
        DP_MERCHANT: r.dpMerchant,
        DP_TOKO: r.dpToko,
        DP_TALANGAN: r.dpTalangan,
        NOTE: r.note,
        STATUS: r.approved ? "APPROVED" : "DRAFT",
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "HP_PENJUALAN");
    const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    XLSX.writeFile(wb, `PENJUALAN_HANDPHONE_PUSAT_${ymd}.xlsx`);
  };

  /* ---------- derived view ---------- */
  const finPreview = useMemo(() => computeFinancials(form), [form]);
  const mdrAutoPct = useMemo(
    () => Number(getMdr({ method: form.paymentMethod, toko: form.tokoRef, brand: form.brand }) || 0),
    [form.paymentMethod, form.tokoRef, form.brand]
  );

  /* ---------- UI ---------- */
  return (
    <div className="space-y-6">
      {/* Header + Back */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Penjualan Handphone — Pusat Mila Phone</h1>
          <p className="text-slate-600">
            Monitor & input lintas toko. Harga/MDR/bunga otomatis dari folder <code>data</code>.
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

      {/* Filter bar */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-3">
            <label className="text-xs text-slate-600">Cari</label>
            <input
              className="w-full border rounded px-2 py-1"
              placeholder="produk/IMEI/sales/leasing/note"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="md:col-span-3">
            <label className="text-xs text-slate-600">Toko</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={filterToko}
              onChange={(e) => setFilterToko(e.target.value)}
            >
              <option>Semua</option>
              {TOKO_LIST.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-slate-600">Metode</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
            >
              <option>Semua</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-slate-600">Dari Tanggal</label>
            <input
              type="date"
              className="w-full border rounded px-2 py-1"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="md:col-span-2">
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

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Transaksi</div>
          <div className="mt-1 text-2xl font-semibold">{summary.count}</div>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Total Qty</div>
          <div className="mt-1 text-2xl font-semibold">{summary.qty}</div>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Subtotal</div>
          <div className="mt-1 text-2xl font-semibold">{fmtIDR(summary.subtotal)}</div>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">NET</div>
          <div className="mt-1 text-2xl font-semibold">{fmtIDR(summary.net)}</div>
        </div>
      </div>

      {/* Form Tambah */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Tambah Data</h2>

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
            <label className="text-xs text-slate-600">Toko</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={form.tokoRef}
              onChange={(e) =>
                setForm({
                  ...form,
                  tokoRef: e.target.value,
                  salesName: "",
                  storeName: "",
                  shName: "",
                  slName: "",
                })
              }
            >
              {TOKO_LIST.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-slate-600">Sales</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={form.salesName}
              onChange={(e) => setForm({ ...form, salesName: e.target.value })}
            >
              <option value="">— Pilih Sales —</option>
              {(getSalesByToko(form.tokoRef) || []).map((s) => (
                <option key={s.nik || s.name} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-600">Store</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={form.storeName}
              onChange={(e) => setForm({ ...form, storeName: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">NIK</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={form.nik}
              onChange={(e) => setForm({ ...form, nik: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mt-3">
          <div>
            <label className="text-xs text-slate-600">Brand</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value, produk: "", warna: "" })}
            >
              <option value="">— Pilih Brand —</option>
              {brandOptions.map((b) => (
                <option key={b} value={b}>
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
              onChange={(e) => setForm({ ...form, produk: e.target.value, warna: "" })}
            >
              <option value="">— Pilih Produk —</option>
              {productOptions.map((p) => (
                <option key={`${form.brand}-${p}`} value={p}>
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
              <option value="">— Pilih Warna —</option>
              {getWarnaOptions(form.brand, form.produk).map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-600">IMEI</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={form.imei}
              onChange={(e) => setForm({ ...form, imei: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">Qty</label>
            <input
              type="number"
              min={0}
              className="w-full border rounded px-2 py-1 text-right"
              value={form.qty}
              onChange={(e) => setForm({ ...form, qty: toNum(e.target.value) })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mt-3">
          <div>
            <label className="text-xs text-slate-600">Harga Dipakai</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={form.hargaType}
              onChange={(e) => setForm({ ...form, hargaType: e.target.value })}
            >
              <option value="SRP">SRP</option>
              <option value="GROSIR">GROSIR</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-600">SRP</label>
            <input
              type="number"
              min={0}
              className="w-full border rounded px-2 py-1 text-right"
              value={form.srp}
              onChange={(e) => setForm({ ...form, srp: toNum(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">GROSIR</label>
            <input
              type="number"
              min={0}
              className="w-full border rounded px-2 py-1 text-right"
              value={form.grosir}
              onChange={(e) => setForm({ ...form, grosir: toNum(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">Harga</label>
            <input
              type="number"
              min={0}
              className="w-full border rounded px-2 py-1 text-right"
              value={form.harga}
              onChange={(e) => setForm({ ...form, harga: toNum(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">Subtotal</label>
            <input
              readOnly
              className="w-full border rounded px-2 py-1 bg-slate-50 text-right"
              value={fmtIDR(finPreview.subtotal)}
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">MDR % / Fee</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                readOnly
                className="border rounded px-2 py-1 bg-slate-50 text-right"
                value={mdrAutoPct.toFixed(2)}
              />
              <input
                readOnly
                className="border rounded px-2 py-1 bg-slate-50 text-right"
                value={`- ${fmtIDR(finPreview.mdrFee)}`}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mt-3">
          <div className="md:col-span-2">
            <label className="text-xs text-slate-600">Metode & Harga</label>
            <div className="grid grid-cols-2 gap-2">
              <select
                className="border rounded px-2 py-1"
                value={form.paymentMethod}
                onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                className="border rounded px-2 py-1 bg-slate-50 text-right"
                readOnly
                value={fmtIDR(finPreview.net)}
                title="NET setelah MDR"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-600">Leasing/Bank</label>
            <input
              className="w-full border rounded px-2 py-1"
              placeholder="Nama Leasing/Bank"
              value={form.leasingName}
              onChange={(e) => setForm({ ...form, leasingName: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs text-slate-600">Tenor</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={form.tenor}
              onChange={(e) => setForm({ ...form, tenor: toNum(e.target.value) })}
              disabled={String(form.paymentMethod).toLowerCase() !== "kredit"}
            >
              <option value={0}>— Pilih —</option>
              {TENOR_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-600">Bunga %</label>
            <input
              readOnly
              className="w-full border rounded px-2 py-1 bg-slate-50 text-right"
              value={Number(form.bunga || 0).toFixed(2)}
            />
          </div>

          <div>
            <label className="text-xs text-slate-600">Cicilan/Bln</label>
            <input
              readOnly
              className="w-full border rounded px-2 py-1 bg-slate-50 text-right"
              value={fmtIDR(finPreview.cicilan)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mt-3">
          <div>
            <label className="text-xs text-slate-600">DP Utama</label>
            <input
              type="number"
              min={0}
              className="w-full border rounded px-2 py-1 text-right"
              value={form.dp}
              onChange={(e) => setForm({ ...form, dp: toNum(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">DP Merchant</label>
            <input
              type="number"
              min={0}
              className="w-full border rounded px-2 py-1 text-right"
              value={form.dpMerchant}
              onChange={(e) => setForm({ ...form, dpMerchant: toNum(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">DP Toko</label>
            <input
              type="number"
              min={0}
              className="w-full border rounded px-2 py-1 text-right"
              value={form.dpToko}
              onChange={(e) => setForm({ ...form, dpToko: toNum(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">DP Talangan</label>
            <input
              type="number"
              min={0}
              className="w-full border rounded px-2 py-1 text-right"
              value={form.dpTalangan}
              onChange={(e) => setForm({ ...form, dpTalangan: toNum(e.target.value) })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-slate-600">Note</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-3">
          <button
            onClick={addRow}
            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-semibold shadow-sm"
          >
            Tambah
          </button>
        </div>
      </div>

      {/* Tabel */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Data Penjualan (Terfilter)</h2>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Tanggal</th>
                <th className="px-3 py-2 text-left">Toko</th>
                <th className="px-3 py-2 text-left">Store</th>
                <th className="px-3 py-2 text-left">Sales</th>
                <th className="px-3 py-2 text-left">Brand</th>
                <th className="px-3 py-2 text-left">Produk</th>
                <th className="px-3 py-2 text-left">Warna</th>
                <th className="px-3 py-2 text-left">IMEI</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Harga</th>
                <th className="px-3 py-2 text-right">Subtotal</th>
                <th className="px-3 py-2 text-right">MDR %</th>
                <th className="px-3 py-2 text-right">NET</th>
                <th className="px-3 py-2 text-left">Metode</th>
                <th className="px-3 py-2 text-left">Leasing</th>
                <th className="px-3 py-2 text-right">Tenor</th>
                <th className="px-3 py-2 text-right">Bunga%</th>
                <th className="px-3 py-2 text-right">Cicilan</th>
                <th className="px-3 py-2 text-right">Grand</th>
                <th className="px-3 py-2 text-left">Note</th>
                <th className="px-3 py-2 text-left">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => {
                const isEditing = editingId === row.id;
                const f = computeFinancials(isEditing ? editDraft : row);

                if (isEditing && editDraft) {
                  const salesOpt = getSalesByToko(editDraft.tokoRef || "") || [];
                  const brandOpts = brandOptions;
                  const productOpts =
                    (editDraft.brand && getProductsByBrand(editDraft.brand)) || [];
                  const warnaOpts = getWarnaOptions(editDraft.brand, editDraft.produk);

                  const mdrPctRow = Number(
                    getMdr({
                      method: editDraft.paymentMethod,
                      toko: editDraft.tokoRef,
                      brand: editDraft.brand,
                    }) || 0
                  );

                  return (
                    <tr key={row.id} className="border-b last:border-0 bg-slate-50/40">
                      <td className="px-3 py-2">
                        <input
                          type="date"
                          className="border rounded px-2 py-1"
                          value={editDraft.tanggal}
                          onChange={(e) => setEditDraft((d) => ({ ...d, tanggal: e.target.value }))}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="border rounded px-2 py-1"
                          value={editDraft.tokoRef}
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              tokoRef: e.target.value,
                              salesName: "",
                              storeName: "",
                              shName: "",
                              slName: "",
                            }))
                          }
                        >
                          {TOKO_LIST.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="border rounded px-2 py-1"
                          value={editDraft.storeName || ""}
                          onChange={(e) =>
                            setEditDraft((d) => ({ ...d, storeName: e.target.value }))
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="border rounded px-2 py-1"
                          value={editDraft.salesName || ""}
                          onChange={(e) =>
                            setEditDraft((d) => ({ ...d, salesName: e.target.value }))
                          }
                        >
                          <option value="">— Pilih —</option>
                          {salesOpt.map((s) => (
                            <option key={s.nik || s.name} value={s.name}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="border rounded px-2 py-1"
                          value={editDraft.brand || ""}
                          onChange={(e) =>
                            setEditDraft((d) => ({ ...d, brand: e.target.value, produk: "", warna: "" }))
                          }
                        >
                          <option value="">— Brand —</option>
                          {brandOpts.map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="border rounded px-2 py-1"
                          value={editDraft.produk || ""}
                          onChange={(e) =>
                            setEditDraft((d) => ({ ...d, produk: e.target.value, warna: "" }))
                          }
                        >
                          <option value="">— Produk —</option>
                          {productOpts.map((p) => (
                            <option key={`${editDraft.brand}-${p}`} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="border rounded px-2 py-1"
                          value={editDraft.warna || ""}
                          onChange={(e) => setEditDraft((d) => ({ ...d, warna: e.target.value }))}
                        >
                          <option value="">— Warna —</option>
                          {warnaOpts.map((w) => (
                            <option key={w} value={w}>
                              {w}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="border rounded px-2 py-1"
                          value={editDraft.imei || ""}
                          onChange={(e) => setEditDraft((d) => ({ ...d, imei: e.target.value }))}
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
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          className="border rounded px-2 py-1 text-right w-28"
                          value={editDraft.harga}
                          onChange={(e) =>
                            setEditDraft((d) => ({ ...d, harga: toNum(e.target.value) }))
                          }
                        />
                      </td>
                      <td className="px-3 py-2 text-right">{fmtIDR(f.subtotal)}</td>
                      <td className="px-3 py-2 text-right">{mdrPctRow.toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">{fmtIDR(f.net)}</td>
                      <td className="px-3 py-2">
                        <select
                          className="border rounded px-2 py-1"
                          value={editDraft.paymentMethod}
                          onChange={(e) =>
                            setEditDraft((d) => ({ ...d, paymentMethod: e.target.value, tenor: 0, bunga: 0 }))
                          }
                        >
                          {PAYMENT_METHODS.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="border rounded px-2 py-1"
                          value={editDraft.leasingName || ""}
                          onChange={(e) =>
                            setEditDraft((d) => ({ ...d, leasingName: e.target.value }))
                          }
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <select
                          className="border rounded px-2 py-1 w-24"
                          value={editDraft.tenor || 0}
                          onChange={(e) => {
                            const t = toNum(e.target.value);
                            const bungaAuto = getBungaByTenor({
                              tenor: t,
                              method: editDraft.paymentMethod,
                              brand: editDraft.brand,
                              toko: editDraft.tokoRef,
                            });
                            setEditDraft((d) => ({ ...d, tenor: t, bunga: Number(bungaAuto || 0) }));
                          }}
                          disabled={String(editDraft.paymentMethod).toLowerCase() !== "kredit"}
                        >
                          <option value={0}>—</option>
                          {TENOR_OPTIONS.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          readOnly
                          className="border rounded px-2 py-1 bg-slate-50 text-right w-20"
                          value={Number(editDraft.bunga || 0).toFixed(2)}
                        />
                      </td>
                      <td className="px-3 py-2 text-right">{fmtIDR(f.cicilan)}</td>
                      <td className="px-3 py-2 text-right">{fmtIDR(f.grandTotal)}</td>
                      <td className="px-3 py-2">
                        <input
                          className="border rounded px-2 py-1 w-44"
                          value={editDraft.note || ""}
                          onChange={(e) => setEditDraft((d) => ({ ...d, note: e.target.value }))}
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

                const mdrPctStatic = Number(
                  getMdr({
                    method: row.paymentMethod,
                    toko: row.tokoRef,
                    brand: row.brand,
                  }) || 0
                );

                return (
                  <tr key={row.id} className="border-b last:border-0">
                    <td className="px-3 py-2">{row.tanggal}</td>
                    <td className="px-3 py-2">{row.tokoRef}</td>
                    <td className="px-3 py-2">{row.storeName || "-"}</td>
                    <td className="px-3 py-2">{row.salesName || "-"}</td>
                    <td className="px-3 py-2">{row.brand || "-"}</td>
                    <td className="px-3 py-2">{row.produk || "-"}</td>
                    <td className="px-3 py-2">{row.warna || "-"}</td>
                    <td className="px-3 py-2">{row.imei || "-"}</td>
                    <td className="px-3 py-2 text-right">{row.qty}</td>
                    <td className="px-3 py-2 text-right">{fmtIDR(row.harga)}</td>
                    <td className="px-3 py-2 text-right">{fmtIDR(f.subtotal)}</td>
                    <td className="px-3 py-2 text-right">{mdrPctStatic.toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{fmtIDR(f.net)}</td>
                    <td className="px-3 py-2">{row.paymentMethod}</td>
                    <td className="px-3 py-2">{row.leasingName || "-"}</td>
                    <td className="px-3 py-2 text-right">{row.tenor || 0}</td>
                    <td className="px-3 py-2 text-right">{Number(row.bunga || 0).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right">{fmtIDR(f.cicilan)}</td>
                    <td className="px-3 py-2 text-right">{fmtIDR(f.grandTotal)}</td>
                    <td className="px-3 py-2">{row.note || "-"}</td>
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
                  <td colSpan={21} className="px-3 py-6 text-center text-slate-500">
                    Belum ada data sesuai filter/kata kunci.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Catatan: bunga% otomatis via <code>getBungaByTenor(&#123;tenor, method, brand, toko&#125;)</code>,
        MDR% otomatis via <code>getMdr(&#123;method, toko, brand&#125;)</code>. Harga otomatis (jika ada) via{" "}
        <code>findHarga</code>. Warna diambil lokal dari <code>getBrandIndex()</code>.
      </p>
    </div>
  );
}
