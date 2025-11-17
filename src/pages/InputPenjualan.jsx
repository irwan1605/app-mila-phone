// src/pages/InputPenjualan.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";

/* ====== Toko & Master Harga ====== */
import TOKO_LABELS from "../data/TokoLabels";
import { getBrandIndex, findHarga } from "../data/MasterDataHargaPenjualan";

/* ====== Master List & Helper ====== */
import {
  PAYMENT_METHODS,
  PRICE_CATEGORIES,
  MP_PROTECT_OPTIONS,
  TENOR_OPTIONS,
  TOKO_LIST,
  getSalesByToko,
  getMdr,
  getBateraiByBrandProduct,
  getChargerByBrandProduct,
  getBungaByTenor, // <-- pastikan ada di ListDataPenjualan
} from "../data/ListDataPenjualan";

/* ================= Utils ================= */
const toNum = (v) => (isNaN(Number(v)) ? 0 : Number(v));
const unique = (arr) =>
  Array.from(new Set((arr || []).map((x) => (x ?? "").toString().trim()).filter(Boolean)));

function formatCurrency(n) {
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(n || 0);
  } catch {
    return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
  }
}

function parseXlsxDate(v) {
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number" && XLSX.SSF?.parse_date_code) {
    const d = XLSX.SSF.parse_date_code(v);
    if (d) return new Date(Date.UTC(d.y, d.m - 1, d.d)).toISOString().slice(0, 10);
  }
  if (typeof v === "string" && v.trim()) return v;
  return new Date().toISOString().slice(0, 10);
}

function normalizeRowFromExcel(row) {
  const lower = Object.fromEntries(
    Object.entries(row).map(([k, v]) => [String(k).trim().toLowerCase(), v])
  );
  const pick = (...keys) => {
    for (const k of keys) {
      if (k in lower && lower[k] !== undefined && lower[k] !== null && `${lower[k]}`.trim() !== "")
        return lower[k];
    }
    return undefined;
  };

  const tanggal = parseXlsxDate(pick("tanggal", "tgl transaksi", "tgl", "date"));
  const brand = pick("brand", "merk");
  const produk = pick("produk", "product", "type", "tipe", "name") || "";
  const warna = pick("warna", "color") || "";
  const qty = toNum(pick("qty", "jumlah"));
  const srp = toNum(pick("srp"));
  const grosir = toNum(pick("grosir"));
  const hargaTypeRaw = (pick("harga dipakai", "tipe harga") || (grosir ? "GROSIR" : "SRP")) + "";
  const hargaType = /grosir/i.test(hargaTypeRaw) ? "GROSIR" : "SRP";
  const harga = toNum(pick("harga", "amount")) || (grosir || srp);
  const kategori = pick("kategori", "category") || "Motor Listrik";
  const baterai = pick("baterai", "battery") || "";
  const charger = pick("charger") || "";
  const priceCategory = pick("kategori harga", "kategoriharga") || "";
  const mpProtect = pick("mp protect", "mp proteck") || "";

  const paymentMethod = (pick("payment method", "pembayaran") || "Cash") + "";
  const leasingName = pick("pembayaran melalui", "leasing") || "";
  const tenor = toNum(pick("tenor", "bulan"));
  const bunga = toNum(pick("bunga", "interest"));
  const dp = toNum(pick("dp"));
  const dpMerchant = toNum(pick("dp merchant", "dp user via merchant"));
  const dpToko = toNum(pick("dp toko"));
  const dpTalangan = toNum(pick("dp talangan"));

  const imei1 = pick("imei/no dinamo/rangka", "imei", "serial", "no rangka") || "";
  const imei2 = pick("imei/no dinamo/rangka 2", "imei2", "serial2", "no rangka 2") || "";
  const ongkirHsCard = toNum(pick("ongkir/hs card", "ongkir", "hs card"));
  const aksesoris1Desc = pick("aksesoris 1", "aksesoris/sparepart");
  const aksesoris1Amount = toNum(pick("aksesoris 1 rp", "aksesoris/sparepart rp"));
  const aksesoris2Desc = pick("aksesoris 2", "aksesoris/sparepart 2");
  const aksesoris2Amount = toNum(pick("aksesoris 2 rp", "aksesoris/sparepart 2 rp"));
  const bundlingProtectAmount = toNum(pick("bundling mp proteck"));

  const akunPelanggan = pick("akun pelanggan", "akun transaksi (pelanggan)");
  const noHp = pick("no hp", "wa", "whatsapp");
  const noKontrak = pick("no. kontrak", "id order");
  const note = pick("note", "catatan");

  return {
    tanggal,
    brand,
    produk,
    warna,
    qty,
    srp,
    grosir,
    hargaType,
    harga,
    kategori,
    baterai,
    charger,
    priceCategory,
    mpProtect,
    paymentMethod,
    leasingName,
    tenor,
    bunga,
    dp,
    dpMerchant,
    dpToko,
    dpTalangan,
    imei1,
    imei2,
    ongkirHsCard,
    aksesoris1Desc,
    aksesoris1Amount,
    aksesoris2Desc,
    aksesoris2Amount,
    bundlingProtectAmount,
    akunPelanggan,
    noHp,
    noKontrak,
    note,
  };
}

/* ================= Perhitungan ================= */
function computeFinancials(row, tokoName) {
  const qty = toNum(row.qty);
  const harga = toNum(row.harga);
  const base = qty * harga;

  const addOns =
    toNum(row.ongkirHsCard) +
    toNum(row.aksesoris1Amount) +
    toNum(row.aksesoris2Amount) +
    toNum(row.bundlingProtectAmount);

  const subtotal = base + addOns;

  const mdrPct =
    getMdr({
      method: row.paymentMethod,
      toko: tokoName,
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
    const totalBunga = principal * bungaRate * tenor;
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
    tenor: toNum(row.tenor),
    bungaRate: toNum(row.bunga) / 100,
    principal: subtotal,
    totalBunga: 0,
    cicilan: 0,
    grandTotal: subtotal,
  };
}

/* ================= Komponen ================= */
export default function InputPenjualan({ user }) {
  /* ------ Toko aktif ------ */
  const defaultTokoId =
    user?.role?.startsWith("pic_toko")
      ? Number(user?.toko || String(user?.role).replace("pic_toko", "") || 1)
      : 1;

  const [tokoId, setTokoId] = useState(defaultTokoId);
  const tokoName = useMemo(() => TOKO_LABELS[Number(tokoId)] || `Toko ${tokoId}`, [tokoId]);

  /* ------ Sales by toko ------ */
  const salesOptions = useMemo(() => getSalesByToko(tokoName), [tokoName]);

  /* ------ Brand/Product/Warna ------ */
  const brandIndex = useMemo(() => getBrandIndex(), []);
  const brandOptions = useMemo(() => brandIndex.map((b) => b.brand), [brandIndex]);

  /* ------ Form ------ */
  const [form, setForm] = useState(() => ({
    tanggal: new Date().toISOString().slice(0, 10),
    tokoRef: tokoName,

    // Identitas
    akunPelanggan: "",
    noHp: "",
    noKontrak: "",
    note: "",

    // Sales
    salesName: "",
    shName: "",
    slName: "",
    storeName: "",
    nik: "",
    tuyulName: "",

    // Produk
    brand: brandOptions[0] || "",
    produk: "",
    warna: "",
    baterai: "",
    charger: "",
    qty: 1,

    // Harga
    hargaType: "GROSIR",
    srp: 0,
    grosir: 0,
    harga: 0,
    kategori: "Motor Listrik",
    priceCategory: PRICE_CATEGORIES?.[0] || "",
    mpProtect: "",

    // Pembayaran
    paymentMethod: PAYMENT_METHODS[0] || "Cash",
    leasingName: "",
    tenor: 0,
    bunga: 0,
    dp: 0,
    dpMerchant: 0,
    dpToko: 0,
    dpTalangan: 0,

    // Addons
    imei1: "",
    imei2: "",
    ongkirHsCard: 0,
    aksesoris1Desc: "",
    aksesoris1Amount: 0,
    aksesoris2Desc: "",
    aksesoris2Amount: 0,
    bundlingProtectAmount: 0,
    free1: "",
    free2: "",
    free3: "",
  }));

  // sinkron tokoRef saat ganti toko
  useEffect(() => {
    setForm((f) => ({ ...f, tokoRef: tokoName }));
  }, [tokoName]);

  // dropdown product
  const productOptions = useMemo(() => {
    if (!form.brand) return [];
    const b = getBrandIndex().find((x) => x.brand === form.brand);
    return b ? b.products.map((p) => p.name) : [];
  }, [form.brand]);

  const warnaOptions = useMemo(() => {
    if (!form.brand || !form.produk) return [];
    const b = getBrandIndex().find((x) => x.brand === form.brand);
    const p = b?.products.find((pp) => pp.name === form.produk);
    return p ? p.warna : [];
  }, [form.brand, form.produk]);

  const bateraiOptions = useMemo(
    () => getBateraiByBrandProduct(form.brand, form.produk) || [],
    [form.brand, form.produk]
  );
  const chargerOptions = useMemo(
    () => getChargerByBrandProduct(form.brand, form.produk) || [],
    [form.brand, form.produk]
  );

  // Auto harga dari master
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
        harga: toNum(row.harga),
        kategori: row.kategori || f.kategori,
      }));
    }
  }, [form.brand, form.produk, form.warna, form.hargaType]);

  // Auto isi data sales terkait
  useEffect(() => {
    if (!form.salesName) return;
    const sales =
      salesOptions.find((s) => (s.name || "").toLowerCase() === form.salesName.toLowerCase()) ||
      null;
    if (sales) {
      setForm((f) => ({
        ...f,
        nik: f.nik || sales.nik || "",
        tokoRef: f.tokoRef || sales.toko || tokoName,
        storeName: f.storeName || sales.store || "",
        shName: f.shName || sales.sh || "",
        slName: f.slName || sales.sl || "",
        tuyulName: f.tuyulName || sales.tuyul || "",
      }));
    }
  }, [form.salesName, salesOptions, tokoName]);

  // Auto bunga dari tenor
  useEffect(() => {
    const t = toNum(form.tenor);
    if (!t) {
      setForm((f) => ({ ...f, bunga: 0 }));
      return;
    }
    try {
      const persen =
        getBungaByTenor?.({
          tenor: t,
          method: form.paymentMethod,
          brand: form.brand,
          toko: tokoName,
        }) ?? 0;
      setForm((f) => ({ ...f, bunga: toNum(persen) }));
    } catch {
      // fallback manual
    }
  }, [form.tenor, form.paymentMethod, form.brand, tokoName]);

  const onChangeBrand = (val) =>
    setForm((f) => ({ ...f, brand: val, produk: "", warna: "", baterai: "", charger: "" }));
  const onChangeProduk = (val) =>
    setForm((f) => ({ ...f, produk: val, warna: "", baterai: "", charger: "" }));

  /* ------ Preview perhitungan ------ */
  const fin = useMemo(() => computeFinancials(form, tokoName), [form, tokoName]);

  /* ------ Table data ------ */
  const [rows, setRows] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);

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
      ongkirHsCard: toNum(form.ongkirHsCard),
      aksesoris1Amount: toNum(form.aksesoris1Amount),
      aksesoris2Amount: toNum(form.aksesoris2Amount),
      bundlingProtectAmount: toNum(form.bundlingProtectAmount),
    };
    setRows((prev) => [newRow, ...prev]);
  };

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

  /* ------ Export & Import ------ */
  const fileInputRef = useRef(null);

  const handleExport = () => {
    const data = rows.map((r) => {
      const f = computeFinancials(r, tokoName);
      return {
        TANGGAL: r.tanggal,
        TOKO: r.tokoRef,
        BRAND: r.brand,
        PRODUK: r.produk,
        WARNA: r.warna,
        BATERAI: r.baterai,
        CHARGER: r.charger,
        QTY: r.qty,
        HARGA_DIPAKAI: r.hargaType,
        HARGA: r.harga,
        SUBTOTAL: f.subtotal,
        MDR_PCT: Number(f.mdrPct).toFixed(2),
        MDR_FEE: Math.round(f.mdrFee),
        NET: Math.round(f.net),
        PAYMENT: r.paymentMethod,
        LEASING: r.leasingName,
        DP: r.dp,
        DP_MERCHANT: r.dpMerchant,
        DP_TOKO: r.dpToko,
        DP_TALANGAN: r.dpTalangan,
        TENOR: r.tenor,
        BUNGA_PCT: r.bunga,
        CICILAN_PER_BULAN: Math.round(f.cicilan),
        GRAND_TOTAL: Math.round(f.grandTotal),
        IMEI_1: r.imei1,
        IMEI_2: r.imei2,
        ONGKIR_HS_CARD: r.ongkirHsCard,
        ACC1: r.aksesoris1Desc,
        ACC1_RP: r.aksesoris1Amount,
        ACC2: r.aksesoris2Desc,
        ACC2_RP: r.aksesoris2Amount,
        MP_PROTECT_RP: r.bundlingProtectAmount,
        PRICE_CAT: r.priceCategory,
        MP_PROTECT: r.mpProtect,
        SALES: r.salesName,
        SH: r.shName,
        SL: r.slName,
        STORE: r.storeName,
        NIK: r.nik,
        TUYUL: r.tuyulName,
        AKUN: r.akunPelanggan,
        NO_HP: r.noHp,
        NO_KONTRAK: r.noKontrak,
        NOTE: r.note,
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "INPUT_PENJUALAN");
    const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const safeName = (tokoName || "").replace(/[^\p{L}\p{N}_-]+/gu, "_");
    XLSX.writeFile(wb, `INPUT_PENJUALAN_${safeName}_${ymd}.xlsx`);
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await file.arrayBuffer();
      const wb = XLSX.read(data, { type: "array" });
      const sheetName = wb.SheetNames[0];
      const ws = wb.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const normalized = json.map(normalizeRowFromExcel);

      const today = new Date().toISOString().slice(0, 10);
      const toRows = normalized.map((r, i) => ({
        id: rows.length + i + 1,
        ...r,
        tanggal: r.tanggal || today,
        hargaType: r.hargaType || (r.grosir ? "GROSIR" : "SRP"),
        paymentMethod:
          PAYMENT_METHODS.find(
            (m) => m.toLowerCase() === String(r.paymentMethod || "").toLowerCase()
          ) || "Cash",
        qty: toNum(r.qty),
        srp: toNum(r.srp),
        grosir: toNum(r.grosir),
        harga: toNum(r.harga || (r.grosir ? r.grosir : r.srp) || 0),
        dp: toNum(r.dp),
        dpMerchant: toNum(r.dpMerchant),
        dpToko: toNum(r.dpToko),
        dpTalangan: toNum(r.dpTalangan),
        ongkirHsCard: toNum(r.ongkirHsCard),
        aksesoris1Amount: toNum(r.aksesoris1Amount),
        aksesoris2Amount: toNum(r.aksesoris2Amount),
        bundlingProtectAmount: toNum(r.bundlingProtectAmount),
        tokoRef: r.tokoRef || tokoName,
      }));

      setRows((prev) => [...prev, ...toRows]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      console.error("Gagal import Excel:", err);
      alert("File Excel tidak dikenali. Pastikan format kolom sesuai header.");
    }
  };

  /* ================= Render ================= */
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-col md:flex-row">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Input Penjualan Pusat Mila Phone</h1>
          <p className="text-slate-600 mt-1">
            Form input + tabel ringkas dan Tenor aktif
          </p>
        </div>
  
        <div className="flex flex-wrap items-center gap-2">
          {/* Pilih toko (lock jika pic_toko) */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Toko:</span>
            {user?.role?.startsWith("pic_toko") ? (
              <span className="px-3 py-2 border rounded-lg bg-slate-50 text-sm">{tokoName}</span>
            ) : (
              <select
                className="border rounded-lg px-3 py-2 text-sm"
                value={tokoId}
                onChange={(e) => setTokoId(Number(e.target.value))}
              >
                {TOKO_LIST.map((name, idx) => (
                  <option key={name} value={idx + 1}>
                    {name}
                  </option>
                ))}
              </select>
            )}
          </div>
  
          {/* Import/Export */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx"
            onChange={handleImportExcel}
            className="hidden"
            id="excel-input"
          />
          <label
            htmlFor="excel-input"
            className="cursor-pointer rounded-lg border bg-white px-3 py-2 text-sm shadow-sm hover:bg-slate-50"
            title="Import Excel (.xlsx)"
          >
            Import Excel
          </label>
          <button
            onClick={handleExport}
            className="rounded-lg border bg-white px-3 py-2 text-sm shadow-sm hover:bg-slate-50"
            title="Export (.xlsx)"
          >
            Export Excel
          </button>
        </div>
      </div>
  
      {/* PO Penjualan */}
      <div className="rounded-2xl border bg-white p-4 md:p-5 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">PO PENJUALAN</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div>
            <label className="text-xs text-slate-600">Tanggal</label>
            <input
              type="date"
              className="w-full border rounded-lg px-2 py-2"
              value={form.tanggal}
              onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
            />
          </div>
  
          <div className="lg:col-span-2">
            <label className="text-xs text-slate-600">Akun (Pelanggan)</label>
            <input
              className="w-full border rounded-lg px-2 py-2"
              value={form.akunPelanggan}
              onChange={(e) => setForm({ ...form, akunPelanggan: e.target.value })}
            />
          </div>
  
          <div>
            <label className="text-xs text-slate-600">No HP/WA</label>
            <input
              className="w-full border rounded-lg px-2 py-2"
              value={form.noHp}
              onChange={(e) => setForm({ ...form, noHp: e.target.value })}
            />
          </div>
  
          <div>
            <label className="text-xs text-slate-600">No. Kontrak/Order</label>
            <input
              className="w-full border rounded-lg px-2 py-2"
              value={form.noKontrak}
              onChange={(e) => setForm({ ...form, noKontrak: e.target.value })}
            />
          </div>
  
          <div className="lg:col-span-2">
            <label className="text-xs text-slate-600">Note</label>
            <input
              className="w-full border rounded-lg px-2 py-2"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>
        </div>
      </div>
  
      {/* Produk & Harga */}
      <div className="rounded-2xl border bg-white p-4 md:p-5 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">PRODUK & HARGA</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2">
            <label className="text-xs text-slate-600">Brand & Produk</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                className="border rounded-lg px-2 py-2"
                value={form.brand}
                onChange={(e) => onChangeBrand(e.target.value)}
              >
                {brandOptions.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
              <select
                className="border rounded-lg px-2 py-2"
                value={form.produk}
                onChange={(e) => onChangeProduk(e.target.value)}
              >
                <option value="">— Pilih Produk —</option>
                {productOptions.map((p) => (
                  <option key={`${form.brand}-${p}`} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>
  
          <div>
            <label className="text-xs text-slate-600">Warna</label>
            <select
              className="w-full border rounded-lg px-2 py-2"
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
              className="w-full border rounded-lg px-2 py-2"
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
              className="w-full border rounded-lg px-2 py-2"
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
  
          <div>
            <label className="text-xs text-slate-600">Qty</label>
            <input
              type="number"
              min={1}
              className="w-full border rounded-lg px-2 py-2 text-right"
              value={form.qty}
              onChange={(e) => setForm({ ...form, qty: toNum(e.target.value) })}
            />
          </div>
  
          <div>
            <label className="text-xs text-slate-600">Harga Dipakai</label>
            <select
              className="w-full border rounded-lg px-2 py-2"
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
              className="w-full border rounded-lg px-2 py-2 text-right"
              value={form.srp}
              onChange={(e) => setForm({ ...form, srp: toNum(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">Grosir</label>
            <input
              type="number"
              min={0}
              className="w-full border rounded-lg px-2 py-2 text-right"
              value={form.grosir}
              onChange={(e) => setForm({ ...form, grosir: toNum(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">Harga (auto)</label>
            <input
              readOnly
              className="w-full border rounded-lg px-2 py-2 bg-slate-50 text-right"
              value={form.harga}
            />
          </div>
  
          <div>
            <label className="text-xs text-slate-600">Kategori Harga</label>
            <select
              className="w-full border rounded-lg px-2 py-2"
              value={form.priceCategory}
              onChange={(e) => setForm({ ...form, priceCategory: e.target.value })}
            >
              {PRICE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
  
          <div className="lg:col-span-2">
            <label className="text-xs text-slate-600">Bundling MP Protect</label>
            <select
              className="w-full border rounded-lg px-2 py-2"
              value={form.mpProtect}
              onChange={(e) => setForm({ ...form, mpProtect: e.target.value })}
            >
              <option value="">— Pilih —</option>
              {MP_PROTECT_OPTIONS.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
  
      {/* PAYMENT */}
      <div className="rounded-2xl border bg-white p-4 md:p-5 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">PAYMENT</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2">
            <label className="text-xs text-slate-600">Pembayaran Melalui</label>
            <input
              className="w-full border rounded-lg px-2 py-2"
              placeholder="Nama Leasing/Bank"
              value={form.leasingName}
              onChange={(e) => setForm({ ...form, leasingName: e.target.value })}
            />
          </div>
  
          <div className="lg:col-span-2">
            <label className="text-xs text-slate-600">Payment & Harga</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                className="border rounded-lg px-2 py-2"
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
                type="number"
                min={0}
                className="border rounded-lg px-2 py-2 text-right"
                value={form.harga}
                onChange={(e) => setForm({ ...form, harga: toNum(e.target.value) })}
              />
            </div>
          </div>
  
          <div>
            <label className="text-xs text-slate-600">MDR % (auto)</label>
            <input
              readOnly
              className="w-full border rounded-lg px-2 py-2 bg-slate-50 text-right"
              value={Number(
                getMdr({ method: form.paymentMethod, toko: tokoName, brand: form.brand }) || 0
              ).toFixed(2)}
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">MDR Fee (auto)</label>
            <input
              readOnly
              className="w-full border rounded-lg px-2 py-2 bg-slate-50 text-right"
              value={formatCurrency(fin.mdrFee)}
            />
          </div>
  
          <div>
            <label className="text-xs text-slate-600">Tenor</label>
            <select
              className="w-full border rounded-lg px-2 py-2"
              value={form.tenor}
              onChange={(e) => setForm({ ...form, tenor: toNum(e.target.value) })}
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
            <label className="text-xs text-slate-600">DP (Utama)</label>
            <input
              type="number"
              min={0}
              className="w-full border rounded-lg px-2 py-2 text-right"
              value={form.dp}
              onChange={(e) => setForm({ ...form, dp: toNum(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">DP Merchant (Piutang)</label>
            <input
              type="number"
              min={0}
              className="w-full border rounded-lg px-2 py-2 text-right"
              value={form.dpMerchant}
              onChange={(e) => setForm({ ...form, dpMerchant: toNum(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">DP Toko (Cash)</label>
            <input
              type="number"
              min={0}
              className="w-full border rounded-lg px-2 py-2 text-right"
              value={form.dpToko}
              onChange={(e) => setForm({ ...form, dpToko: toNum(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">DP Talangan</label>
            <input
              type="number"
              min={0}
              className="w-full border rounded-lg px-2 py-2 text-right"
              value={form.dpTalangan}
              onChange={(e) => setForm({ ...form, dpTalangan: toNum(e.target.value) })}
            />
          </div>
        </div>
      </div>
  
      {/* Addons & Identifikasi */}
      <div className="rounded-2xl border bg-white p-4 md:p-5 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">ADDONS & IDENTIFIKASI</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-3">
            <label className="text-xs text-slate-600">IMEI/No Dinamo/Rangka</label>
            <input
              className="w-full border rounded-lg px-2 py-2"
              value={form.imei1}
              onChange={(e) => setForm({ ...form, imei1: e.target.value })}
            />
          </div>
          <div className="lg:col-span-3">
            <label className="text-xs text-slate-600">IMEI/No Dinamo/Rangka 2</label>
            <input
              className="w-full border rounded-lg px-2 py-2"
              value={form.imei2}
              onChange={(e) => setForm({ ...form, imei2: e.target.value })}
            />
          </div>
  
          <div>
            <label className="text-xs text-slate-600">Ongkir/HS Card</label>
            <input
              type="number"
              min={0}
              className="w-full border rounded-lg px-2 py-2 text-right"
              value={form.ongkirHsCard}
              onChange={(e) => setForm({ ...form, ongkirHsCard: toNum(e.target.value) })}
            />
          </div>
  
          <div className="lg:col-span-2">
            <label className="text-xs text-slate-600">Aksesoris/Sparepart 1</label>
            <input
              className="w-full border rounded-lg px-2 py-2"
              value={form.aksesoris1Desc}
              onChange={(e) => setForm({ ...form, aksesoris1Desc: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">Total Harga</label>
            <input
              type="number"
              min={0}
              className="w-full border rounded-lg px-2 py-2 text-right"
              value={form.aksesoris1Amount}
              onChange={(e) => setForm({ ...form, aksesoris1Amount: toNum(e.target.value) })}
            />
          </div>
  
          <div className="lg:col-span-2">
            <label className="text-xs text-slate-600">Aksesoris/Sparepart 2</label>
            <input
              className="w-full border rounded-lg px-2 py-2"
              value={form.aksesoris2Desc}
              onChange={(e) => setForm({ ...form, aksesoris2Desc: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">Total Harga</label>
            <input
              type="number"
              min={0}
              className="w-full border rounded-lg px-2 py-2 text-right"
              value={form.aksesoris2Amount}
              onChange={(e) => setForm({ ...form, aksesoris2Amount: toNum(e.target.value) })}
            />
          </div>
  
          <div className="lg:col-span-2">
            <label className="text-xs text-slate-600">Bundling MP Protect (Rp)</label>
            <input
              type="number"
              min={0}
              className="w-full border rounded-lg px-2 py-2 text-right"
              value={form.bundlingProtectAmount}
              onChange={(e) => setForm({ ...form, bundlingProtectAmount: toNum(e.target.value) })}
            />
          </div>
  
          <div>
            <label className="text-xs text-slate-600">FREE/Kelengkapan 1</label>
            <input
              className="w-full border rounded-lg px-2 py-2"
              value={form.free1}
              onChange={(e) => setForm({ ...form, free1: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">FREE/Kelengkapan 2</label>
            <input
              className="w-full border rounded-lg px-2 py-2"
              value={form.free2}
              onChange={(e) => setForm({ ...form, free2: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">FREE/Kelengkapan 3</label>
            <input
              className="w-full border rounded-lg px-2 py-2"
              value={form.free3}
              onChange={(e) => setForm({ ...form, free3: e.target.value })}
            />
          </div>
        </div>
      </div>
  
      {/* Ringkasan */}
      <div className="rounded-2xl border bg-white p-4 md:p-5 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">RINGKASAN</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="rounded-xl border p-3">
            <div className="text-xs text-slate-500">Subtotal</div>
            <div className="text-lg font-semibold">{formatCurrency(fin.subtotal)}</div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-slate-500">MDR %</div>
            <div className="text-lg font-semibold">{Number(fin.mdrPct).toFixed(2)}%</div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-slate-500">MDR Fee</div>
            <div className="text-lg font-semibold">{formatCurrency(fin.mdrFee)}</div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-slate-500">Cicilan/Bulan</div>
            <div className="text-lg font-semibold">{formatCurrency(fin.cicilan)}</div>
          </div>
          <div className="rounded-xl border p-3">
            <div className="text-xs text-slate-500">Grand Total</div>
            <div className="text-lg font-semibold">{formatCurrency(fin.grandTotal)}</div>
          </div>
        </div>
  
        <div className="mt-3">
          <button
            onClick={addRow}
            className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-semibold shadow-sm"
          >
            Tambah ke Tabel
          </button>
        </div>
      </div>
  
      {/* Data Input - Responsive */}
      <div className="rounded-2xl border bg-white p-4 md:p-5 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Data Input</h2>
  
        {/* Kartu (mobile & tablet) */}
        <div className="grid gap-3 lg:hidden">
          {rows.length === 0 && (
            <div className="text-center text-slate-500 py-6">Belum ada data input.</div>
          )}
          {rows.map((row) => {
            const f = computeFinancials(row, tokoName);
            const isEditing = editingId === row.id;
  
            if (isEditing && editDraft) {
              const fe = computeFinancials(editDraft, tokoName);
              return (
                <div key={row.id} className="rounded-xl border p-3 bg-slate-50/70 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      className="border rounded-lg px-2 py-2"
                      value={editDraft.tanggal}
                      onChange={(e) => setEditDraft((d) => ({ ...d, tanggal: e.target.value }))}
                    />
                    <input
                      className="border rounded-lg px-2 py-2"
                      value={editDraft.tokoRef}
                      onChange={(e) => setEditDraft((d) => ({ ...d, tokoRef: e.target.value }))}
                    />
                    <input
                      className="border rounded-lg px-2 py-2"
                      value={editDraft.brand}
                      onChange={(e) => setEditDraft((d) => ({ ...d, brand: e.target.value }))}
                    />
                    <input
                      className="border rounded-lg px-2 py-2"
                      value={editDraft.produk}
                      onChange={(e) => setEditDraft((d) => ({ ...d, produk: e.target.value }))}
                    />
                    <input
                      className="border rounded-lg px-2 py-2"
                      value={editDraft.warna}
                      onChange={(e) => setEditDraft((d) => ({ ...d, warna: e.target.value }))}
                    />
                    <input
                      type="number"
                      className="border rounded-lg px-2 py-2 text-right"
                      value={editDraft.qty}
                      onChange={(e) => setEditDraft((d) => ({ ...d, qty: toNum(e.target.value) }))}
                    />
                    <select
                      className="border rounded-lg px-2 py-2"
                      value={editDraft.hargaType}
                      onChange={(e) => setEditDraft((d) => ({ ...d, hargaType: e.target.value }))}
                    >
                      <option value="GROSIR">GROSIR</option>
                      <option value="SRP">SRP</option>
                    </select>
                    <input
                      type="number"
                      className="border rounded-lg px-2 py-2 text-right"
                      value={editDraft.harga}
                      onChange={(e) => setEditDraft((d) => ({ ...d, harga: toNum(e.target.value) }))}
                    />
                    <select
                      className="border rounded-lg px-2 py-2"
                      value={editDraft.paymentMethod}
                      onChange={(e) =>
                        setEditDraft((d) => ({ ...d, paymentMethod: e.target.value }))
                      }
                    >
                      {PAYMENT_METHODS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      className="border rounded-lg px-2 py-2 text-right"
                      value={editDraft.tenor}
                      onChange={(e) => setEditDraft((d) => ({ ...d, tenor: toNum(e.target.value) }))}
                    />
                    <input
                      type="number"
                      className="border rounded-lg px-2 py-2 text-right"
                      value={editDraft.bunga}
                      onChange={(e) => setEditDraft((d) => ({ ...d, bunga: toNum(e.target.value) }))}
                    />
                  </div>
  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="text-xs text-slate-500">Cicilan/bln</div>
                    <div className="text-right font-semibold">{formatCurrency(fe.cicilan)}</div>
                    <div className="text-xs text-slate-500">Grand Total</div>
                    <div className="text-right font-semibold">{formatCurrency(fe.grandTotal)}</div>
                  </div>
  
                  <input
                    className="border rounded-lg px-2 py-2 w-full"
                    placeholder="IMEI/No Rangka"
                    value={editDraft.imei1}
                    onChange={(e) => setEditDraft((d) => ({ ...d, imei1: e.target.value }))}
                  />
  
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={saveEdit}
                      className="px-3 py-2 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700"
                    >
                      Simpan
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-2 text-xs rounded-lg bg-slate-100 hover:bg-slate-200"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              );
            }
  
            return (
              <div key={row.id} className="rounded-xl border p-3 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-medium">{row.produk || row.brand}</div>
                  <div className="text-xs text-slate-500">{row.tanggal}</div>
                </div>
                <div className="text-sm text-slate-600">{row.tokoRef} • {row.brand} • {row.warna || "-"}</div>
  
                <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mt-2">
                  <div>Qty</div>
                  <div className="text-right">{row.qty}</div>
                  <div>Harga</div>
                  <div className="text-right">{formatCurrency(row.harga)}</div>
                  <div>Payment</div>
                  <div className="text-right">{row.paymentMethod}</div>
                  <div>Cicilan/bln</div>
                  <div className="text-right">{formatCurrency(f.cicilan)}</div>
                  <div>Grand Total</div>
                  <div className="text-right font-semibold">{formatCurrency(f.grandTotal)}</div>
                  <div>IMEI/No Rangka</div>
                  <div className="text-right">{row.imei1 || "-"}</div>
                </div>
  
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    onClick={() => beginEdit(row)}
                    className="px-3 py-2 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteRow(row.id)}
                    className="px-3 py-2 text-xs rounded-lg bg-red-600 text-white hover:bg-red-700"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            );
          })}
        </div>
  
        {/* Tabel (desktop) */}
        <div className="hidden lg:block">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left">Tanggal</th>
                  <th className="px-3 py-2 text-left">Toko</th>
                  <th className="px-3 py-2 text-left">Brand</th>
                  <th className="px-3 py-2 text-left">Produk</th>
                  <th className="px-3 py-2 text-left">Warna</th>
                  <th className="px-3 py-2 text-right">Qty</th>
                  <th className="px-3 py-2 text-left">HargaDipakai</th>
                  <th className="px-3 py-2 text-right">Harga</th>
                  <th className="px-3 py-2 text-left">Payment</th>
                  <th className="px-3 py-2 text-right">Tenor</th>
                  <th className="px-3 py-2 text-right">Cicilan/bln</th>
                  <th className="px-3 py-2 text-right">Grand Total</th>
                  <th className="px-3 py-2 text-left">IMEI/No Rangka</th>
                  <th className="px-3 py-2 text-left">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const f = computeFinancials(row, tokoName);
                  const isEditing = editingId === row.id;
  
                  if (isEditing && editDraft) {
                    const fe = computeFinancials(editDraft, tokoName);
                    return (
                      <tr key={row.id} className="border-b last:border-0 bg-slate-50">
                        <td className="px-3 py-2">
                          <input
                            type="date"
                            className="border rounded-lg px-2 py-1"
                            value={editDraft.tanggal}
                            onChange={(e) => setEditDraft((d) => ({ ...d, tanggal: e.target.value }))}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            className="border rounded-lg px-2 py-1 w-36"
                            value={editDraft.tokoRef}
                            onChange={(e) => setEditDraft((d) => ({ ...d, tokoRef: e.target.value }))}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            className="border rounded-lg px-2 py-1 w-32"
                            value={editDraft.brand}
                            onChange={(e) => setEditDraft((d) => ({ ...d, brand: e.target.value }))}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            className="border rounded-lg px-2 py-1 w-32"
                            value={editDraft.produk}
                            onChange={(e) => setEditDraft((d) => ({ ...d, produk: e.target.value }))}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            className="border rounded-lg px-2 py-1 w-24"
                            value={editDraft.warna}
                            onChange={(e) => setEditDraft((d) => ({ ...d, warna: e.target.value }))}
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            className="border rounded-lg px-2 py-1 text-right w-20"
                            value={editDraft.qty}
                            onChange={(e) => setEditDraft((d) => ({ ...d, qty: toNum(e.target.value) }))}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className="border rounded-lg px-2 py-1"
                            value={editDraft.hargaType}
                            onChange={(e) => setEditDraft((d) => ({ ...d, hargaType: e.target.value }))}
                          >
                            <option value="GROSIR">GROSIR</option>
                            <option value="SRP">SRP</option>
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            className="border rounded-lg px-2 py-1 text-right w-24"
                            value={editDraft.harga}
                            onChange={(e) => setEditDraft((d) => ({ ...d, harga: toNum(e.target.value) }))}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <select
                            className="border rounded-lg px-2 py-1"
                            value={editDraft.paymentMethod}
                            onChange={(e) =>
                              setEditDraft((d) => ({ ...d, paymentMethod: e.target.value }))
                            }
                          >
                            {PAYMENT_METHODS.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            className="border rounded-lg px-2 py-1 text-right w-16"
                            value={editDraft.tenor}
                            onChange={(e) => setEditDraft((d) => ({ ...d, tenor: toNum(e.target.value) }))}
                          />
                        </td>
                        <td className="px-3 py-2 text-right">
                          <input
                            type="number"
                            className="border rounded-lg px-2 py-1 text-right w-20"
                            value={editDraft.bunga}
                            onChange={(e) => setEditDraft((d) => ({ ...d, bunga: toNum(e.target.value) }))}
                          />
                        </td>
                        <td className="px-3 py-2 text-right">{formatCurrency(fe.cicilan)}</td>
                        <td className="px-3 py-2 text-right">{formatCurrency(fe.grandTotal)}</td>
                        <td className="px-3 py-2">
                          <input
                            className="border rounded-lg px-2 py-1 w-48"
                            value={editDraft.imei1}
                            onChange={(e) => setEditDraft((d) => ({ ...d, imei1: e.target.value }))}
                          />
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            <button
                              onClick={saveEdit}
                              className="px-3 py-2 text-xs rounded-lg bg-green-600 text-white hover:bg-green-700"
                            >
                              Simpan
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="px-3 py-2 text-xs rounded-lg bg-slate-100 hover:bg-slate-200"
                            >
                              Batal
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }
  
                  return (
                    <tr key={row.id} className="border-b last:border-0">
                      <td className="px-3 py-2">{row.tanggal}</td>
                      <td className="px-3 py-2">{row.tokoRef}</td>
                      <td className="px-3 py-2">{row.brand}</td>
                      <td className="px-3 py-2">{row.produk}</td>
                      <td className="px-3 py-2">{row.warna}</td>
                      <td className="px-3 py-2 text-right">{row.qty}</td>
                      <td className="px-3 py-2">{row.hargaType}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(row.harga)}</td>
                      <td className="px-3 py-2">{row.paymentMethod}</td>
                      <td className="px-3 py-2 text-right">{row.tenor || 0}</td>
                      <td className="px-3 py-2 text-right">{toNum(row.bunga).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">
                        {formatCurrency(computeFinancials(row, tokoName).cicilan)}
                      </td>
                      <td className="px-3 py-2 text-right">
                        {formatCurrency(computeFinancials(row, tokoName).grandTotal)}
                      </td>
                      <td className="px-3 py-2">{row.imei1 || "-"}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => beginEdit(row)}
                            className="px-3 py-2 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteRow(row.id)}
                            className="px-3 py-2 text-xs rounded-lg bg-red-600 text-white hover:bg-red-700"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={15} className="px-3 py-6 text-center text-slate-500">
                      Belum ada data input.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
  
      <p className="text-xs text-slate-500">
        Tenor aktif & bunga% otomatis menggunakan helper <code>getBungaByTenor</code>. MDR% otomatis
        dari <code>getMdr</code>. Harga auto mengikuti katalog <code>MasterDataHargaPenjualan</code>.
      </p>
    </div>
  );
}  
