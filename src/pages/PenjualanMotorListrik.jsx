// src/pages/PenjualanMotorListrik.jsx
import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";

import {
  getBrandIndex,
  getProductsByBrand,
  findHarga,
} from "../data/MasterDataHargaPenjualan";
import {
  TOKO_LIST,
  PAYMENT_METHODS,
  PRICE_CATEGORIES,
  TENOR_OPTIONS,
  getMdr,
  getSalesByToko,
  getBungaByTenor,
  getBateraiByBrandProduct,
  getChargerByBrandProduct,
} from "../data/ListDataPenjualan";

/* Utils */
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

function getWarnaOptions(brand, produk) {
  if (!brand || !produk) return [];
  try {
    const idx = getBrandIndex() || [];
    const b = idx.find((x) => x.brand === brand);
    const p = b?.products?.find(
      (pp) => (pp.name || pp.product || "").toString() === produk
    );
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

/* Perhitungan */
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

export default function PenjualanMotorListrik() {
  /* Master */
  const brandIndex = useMemo(() => getBrandIndex() || [], []);
  const brandOptions = useMemo(
    () => Array.from(new Set((brandIndex || []).map((b) => b.brand))),
    [brandIndex]
  );

  /* Storage */
  const LS_KEY = "molis_sales_pusat_v1";
  const [rows, setRows] = useState(() => {
    try {
      const raw = JSON.parse(localStorage.getItem(LS_KEY));
      return Array.isArray(raw) ? raw : [];
    } catch {
      return [];
    }
  });
  useEffect(() => localStorage.setItem(LS_KEY, JSON.stringify(rows)), [rows]);

  /* Filter */
  const [q, setQ] = useState("");
  const [filterToko, setFilterToko] = useState("Semua");
  const [filterMethod, setFilterMethod] = useState("Semua");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filteredRows = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterToko !== "Semua" && (r.tokoRef || "") !== filterToko)
        return false;
      if (filterMethod !== "Semua" && (r.paymentMethod || "") !== filterMethod)
        return false;
      if (dateFrom && (r.tanggal || "") < dateFrom) return false;
      if (dateTo && (r.tanggal || "") > dateTo) return false;
      if (ql) {
        const hay = [
          r.produk,
          r.brand,
          r.noDinamo,
          r.noRangka,
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

  /* Summary */
  const summary = useMemo(
    () =>
      filteredRows.reduce(
        (acc, r) => {
          const f = computeFinancials(r);
          acc.count += 1;
          acc.qty += toNum(r.qty);
          acc.subtotal += f.subtotal;
          acc.net += f.net;
          return acc;
        },
        { count: 0, qty: 0, subtotal: 0, net: 0 }
      ),
    [filteredRows]
  );

  /* Form add */
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
    baterai: "",
    charger: "",
    noDinamo: "",
    noRangka: "",
    qty: 1,
    hargaType: "GROSIR", // kebiasaan MOLIS pakai GROSIR
    srp: 0,
    grosir: 0,
    harga: 0,
    kategori: "Motor Listrik",
    priceCategory: PRICE_CATEGORIES?.[0] || "",
    // payment
    paymentMethod: PAYMENT_METHODS?.[0] || "Cash",
    leasingName: "",
    tenor: 0,
    bunga: 0,
    dp: 0,
    dpMerchant: 0,
    dpToko: 0,
    dpTalangan: 0,
    // addons
    ongkir: 0,
    accName1: "",
    accAmount1: 0,
    accName2: "",
    accAmount2: 0,
    bundlingName: "",
    bundlingAmount: 0,
    note: "",
    approved: false,
  });

  const productOptions = useMemo(() => {
    if (!form.brand) return [];
    try {
      return getProductsByBrand(form.brand) || [];
    } catch {
      return [];
    }
  }, [form.brand]);

  const warnaOptions = useMemo(
    () => getWarnaOptions(form.brand, form.produk),
    [form.brand, form.produk]
  );
  const bateraiOptions = useMemo(
    () => getBateraiByBrandProduct(form.brand, form.produk) || [],
    [form.brand, form.produk]
  );
  const chargerOptions = useMemo(
    () => getChargerByBrandProduct(form.brand, form.produk) || [],
    [form.brand, form.produk]
  );

  // harga auto
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
        harga:
          toNum(row.harga) ||
          toNum(row[f.hargaType?.toLowerCase?.() || "grosir"]) ||
          0,
      }));
    }
  }, [form.brand, form.produk, form.warna, form.hargaType]);

  // sales auto
  const salesOptions = useMemo(
    () => getSalesByToko(form.tokoRef) || [],
    [form.tokoRef]
  );
  useEffect(() => {
    if (!form.salesName) return;
    const s =
      salesOptions.find(
        (x) => (x.name || "").toLowerCase() === form.salesName.toLowerCase()
      ) || null;
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

  // bunga auto
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
      baterai: "",
      charger: "",
      noDinamo: "",
      noRangka: "",
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

  /* Edit/Delete */
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
    setRows((prev) =>
      prev.map((r) => (r.id === editingId ? { ...editDraft } : r))
    );
    cancelEdit();
  };
  const deleteRow = (id) => {
    if (!window.confirm("Hapus baris ini?")) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  /* Export */
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
        BATERAI: r.baterai,
        CHARGER: r.charger,
        NO_DINAMO: r.noDinamo,
        NO_RANGKA: r.noRangka,
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
        NOTE: r.note,
        STATUS: r.approved ? "APPROVED" : "DRAFT",
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MOLIS_PENJUALAN");
    const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    XLSX.writeFile(wb, `PENJUALAN_MOTOR_LISTRIK_PUSAT_${ymd}.xlsx`);
  };

  const finPreview = useMemo(() => computeFinancials(form), [form]);
  const mdrAutoPct = useMemo(
    () =>
      Number(
        getMdr({
          method: form.paymentMethod,
          toko: form.tokoRef,
          brand: form.brand,
        }) || 0
      ),
    [form.paymentMethod, form.tokoRef, form.brand]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">
            Penjualan Motor Listrik — Pusat Mila Phone
          </h1>
          <p className="text-slate-600">
            Tambah/edit/hapus, filter, export. MDR/bunga/harga otomatis dari
            data.
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
              placeholder="produk/no dinamo/no rangka/sales/leasing/note"
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
            <label className="text-xs text-slate-600">Dari</label>
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

      {/* Summary */}
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
          <div className="mt-1 text-2xl font-semibold">
            {fmtIDR(summary.subtotal)}
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">NET</div>
          <div className="mt-1 text-2xl font-semibold">
            {fmtIDR(summary.net)}
          </div>
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
              onChange={(e) =>
                setForm({
                  ...form,
                  brand: e.target.value,
                  produk: "",
                  warna: "",
                  baterai: "",
                  charger: "",
                })
              }
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
              onChange={(e) =>
                setForm({
                  ...form,
                  produk: e.target.value,
                  warna: "",
                  baterai: "",
                  charger: "",
                })
              }
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
              {warnaOptions.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-600">Baterai</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={form.baterai}
              onChange={(e) => setForm({ ...form, baterai: e.target.value })}
            >
              <option value="">— Pilih —</option>
              {bateraiOptions.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-600">Charger</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={form.charger}
              onChange={(e) => setForm({ ...form, charger: e.target.value })}
            >
              <option value="">— Pilih —</option>
              {chargerOptions.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mt-3">
          <div className="md:col-span-2">
            <label className="text-xs text-slate-600">No Dinamo</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={form.noDinamo}
              onChange={(e) => setForm({ ...form, noDinamo: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-slate-600">No Rangka</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={form.noRangka}
              onChange={(e) => setForm({ ...form, noRangka: e.target.value })}
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
              <option value="GROSIR">GROSIR</option>
              <option value="SRP">SRP</option>
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
              onChange={(e) =>
                setForm({ ...form, grosir: toNum(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">Harga</label>
            <input
              type="number"
              min={0}
              className="w-full border rounded px-2 py-1 text-right"
              value={form.harga}
              onChange={(e) =>
                setForm({ ...form, harga: toNum(e.target.value) })
              }
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
            <label className="text-xs text-slate-600">Metode & NET</label>
            <div className="grid grid-cols-2 gap-2">
              <select
                className="border rounded px-2 py-1"
                value={form.paymentMethod}
                onChange={(e) =>
                  setForm({ ...form, paymentMethod: e.target.value })
                }
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
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-600">Leasing/Bank</label>
            <input
              className="w-full border rounded px-2 py-1"
              placeholder="Nama Leasing/Bank"
              value={form.leasingName}
              onChange={(e) =>
                setForm({ ...form, leasingName: e.target.value })
              }
            />
          </div>

          <div>
            <label className="text-xs text-slate-600">Tenor</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={form.tenor}
              onChange={(e) =>
                setForm({ ...form, tenor: toNum(e.target.value) })
              }
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
              onChange={(e) =>
                setForm({ ...form, dpMerchant: toNum(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">DP Toko</label>
            <input
              type="number"
              min={0}
              className="w-full border rounded px-2 py-1 text-right"
              value={form.dpToko}
              onChange={(e) =>
                setForm({ ...form, dpToko: toNum(e.target.value) })
              }
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">DP Talangan</label>
            <input
              type="number"
              min={0}
              className="w-full border rounded px-2 py-1 text-right"
              value={form.dpTalangan}
              onChange={(e) =>
                setForm({ ...form, dpTalangan: toNum(e.target.value) })
              }
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
        <h2 className="text-lg font-semibold mb-3">
          Data Penjualan (Terfilter)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1400px] text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">Tanggal</th>
                <th className="px-3 py-2 text-left">Toko</th>
                <th className="px-3 py-2 text-left">Store</th>
                <th className="px-3 py-2 text-left">Sales</th>
                <th className="px-3 py-2 text-left">Brand</th>
                <th className="px-3 py-2 text-left">Produk</th>
                <th className="px-3 py-2 text-left">Warna</th>
                <th className="px-3 py-2 text-left">Baterai</th>
                <th className="px-3 py-2 text-left">Charger</th>
                <th className="px-3 py-2 text-left">No Dinamo</th>
                <th className="px-3 py-2 text-left">No Rangka</th>
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
                  const brandOpts = brandOptions;
                  const productOpts =
                    (editDraft.brand && getProductsByBrand(editDraft.brand)) ||
                    [];
                  const warnaOpts = getWarnaOptions(
                    editDraft.brand,
                    editDraft.produk
                  );
                  const batOpts =
                    getBateraiByBrandProduct(
                      editDraft.brand,
                      editDraft.produk
                    ) || [];
                  const chgOpts =
                    getChargerByBrandProduct(
                      editDraft.brand,
                      editDraft.produk
                    ) || [];
                  const mdrPctRow = Number(
                    getMdr({
                      method: editDraft.paymentMethod,
                      toko: editDraft.tokoRef,
                      brand: editDraft.brand,
                    }) || 0
                  );

                  return (
                    <tr
                      key={row.id}
                      className="border-b last:border-0 bg-slate-50/40"
                    >
                      <td className="px-3 py-2">
                        <input
                          type="date"
                          className="border rounded px-2 py-1"
                          value={editDraft.tanggal}
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              tanggal: e.target.value,
                            }))
                          }
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
                            setEditDraft((d) => ({
                              ...d,
                              storeName: e.target.value,
                            }))
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="border rounded px-2 py-1"
                          value={editDraft.salesName || ""}
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              salesName: e.target.value,
                            }))
                          }
                        >
                          <option value="">— Pilih —</option>
                          {(getSalesByToko(editDraft.tokoRef || "") || []).map(
                            (s) => (
                              <option key={s.nik || s.name} value={s.name}>
                                {s.name}
                              </option>
                            )
                          )}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="border rounded px-2 py-1"
                          value={editDraft.brand || ""}
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              brand: e.target.value,
                              produk: "",
                              warna: "",
                              baterai: "",
                              charger: "",
                            }))
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
                            setEditDraft((d) => ({
                              ...d,
                              produk: e.target.value,
                              warna: "",
                              baterai: "",
                              charger: "",
                            }))
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
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              warna: e.target.value,
                            }))
                          }
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
                        <select
                          className="border rounded px-2 py-1"
                          value={editDraft.baterai || ""}
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              baterai: e.target.value,
                            }))
                          }
                        >
                          <option value="">— Pilih —</option>
                          {batOpts.map((x) => (
                            <option key={x} value={x}>
                              {x}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          className="border rounded px-2 py-1"
                          value={editDraft.charger || ""}
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              charger: e.target.value,
                            }))
                          }
                        >
                          <option value="">— Pilih —</option>
                          {chgOpts.map((x) => (
                            <option key={x} value={x}>
                              {x}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="border rounded px-2 py-1"
                          value={editDraft.noDinamo || ""}
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              noDinamo: e.target.value,
                            }))
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="border rounded px-2 py-1"
                          value={editDraft.noRangka || ""}
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              noRangka: e.target.value,
                            }))
                          }
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          className="border rounded px-2 py-1 text-right w-24"
                          value={editDraft.qty}
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              qty: toNum(e.target.value),
                            }))
                          }
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="number"
                          className="border rounded px-2 py-1 text-right w-28"
                          value={editDraft.harga}
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              harga: toNum(e.target.value),
                            }))
                          }
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        {fmtIDR(f.subtotal)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {mdrPctRow.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right">{fmtIDR(f.net)}</td>
                      <td className="px-3 py-2">
                        <select
                          className="border rounded px-2 py-1"
                          value={editDraft.paymentMethod}
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              paymentMethod: e.target.value,
                              tenor: 0,
                              bunga: 0,
                            }))
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
                            setEditDraft((d) => ({
                              ...d,
                              leasingName: e.target.value,
                            }))
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
                            setEditDraft((d) => ({
                              ...d,
                              tenor: t,
                              bunga: Number(bungaAuto || 0),
                            }));
                          }}
                          disabled={
                            String(editDraft.paymentMethod).toLowerCase() !==
                            "kredit"
                          }
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
                      <td className="px-3 py-2 text-right">
                        {fmtIDR(f.cicilan)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {fmtIDR(f.grandTotal)}
                      </td>
                      <td className="px-3 py-2">
                        <input
                          className="border rounded px-2 py-1 w-44"
                          value={editDraft.note || ""}
                          onChange={(e) =>
                            setEditDraft((d) => ({
                              ...d,
                              note: e.target.value,
                            }))
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
                    <td className="px-3 py-2">{row.baterai || "-"}</td>
                    <td className="px-3 py-2">{row.charger || "-"}</td>
                    <td className="px-3 py-2">{row.noDinamo || "-"}</td>
                    <td className="px-3 py-2">{row.noRangka || "-"}</td>
                    <td className="px-3 py-2 text-right">{row.qty}</td>
                    <td className="px-3 py-2 text-right">
                      {fmtIDR(row.harga)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {fmtIDR(f.subtotal)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {mdrPctStatic.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right">{fmtIDR(f.net)}</td>
                    <td className="px-3 py-2">{row.paymentMethod}</td>
                    <td className="px-3 py-2">{row.leasingName || "-"}</td>
                    <td className="px-3 py-2 text-right">{row.tenor || 0}</td>
                    <td className="px-3 py-2 text-right">
                      {Number(row.bunga || 0).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {fmtIDR(f.cicilan)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {fmtIDR(f.grandTotal)}
                    </td>
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
                  <td
                    colSpan={24}
                    className="px-3 py-6 text-center text-slate-500"
                  >
                    Belum ada data sesuai filter/kata kunci.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Bunga otomatis via <code>getBungaByTenor</code>, MDR otomatis via{" "}
        <code>getMdr</code>, warna dari <code>getBrandIndex()</code>,
        baterai/charger via helper data, harga via <code>findHarga</code>.
      </p>
    </div>
  );
}
