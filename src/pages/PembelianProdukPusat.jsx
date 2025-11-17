// src/pages/PembelianProdukPusat.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

// Data master
import TOKO_LABELS, { ALL_TOKO_IDS } from "../data/TokoLabels";
import { getBrandIndex, findHarga } from "../data/MasterDataHargaPenjualan";
import { PAYMENT_METHODS, TENOR_OPTIONS } from "../data/ListDataPenjualan";
import { VENDORS, PURCHASE_CATEGORIES } from "../data/Vendors";

/* ========== Utils ========== */
const toNum = (v) => (isNaN(Number(v)) ? 0 : Number(v));
const unique = (arr) =>
  Array.from(new Set((arr || []).map((x) => `${x ?? ""}`.trim()).filter(Boolean)));

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

/* ========== LocalStorage ========== */
const LS_KEY = "MMT_PEMBELIAN_PUSAT_V1";
function loadRows() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const j = JSON.parse(raw || "[]");
    if (Array.isArray(j)) return j;
    return [];
  } catch {
    return [];
  }
}
function saveRows(rows) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(rows));
  } catch {}
}

/* ========== Hitung ========== */
function computeTotals(row) {
  const qty = Math.max(0, toNum(row.qty));
  const price = Math.max(0, toNum(row.unitPrice));
  const disc = Math.max(0, toNum(row.discount)); // rupiah
  const taxPct = Math.max(0, toNum(row.taxPct)); // persen

  const gross = qty * price;
  const afterDisc = Math.max(0, gross - disc);
  const tax = afterDisc * (taxPct / 100);
  const total = afterDisc + tax;

  return { gross, afterDisc, tax, total };
}

/* ========== Page ========== */
export default function PembelianProdukPusat({ user }) {
  const navigate = useNavigate();

  // role info
  const isAdmin = user?.role === "admin";
  const isSuperAdmin = user?.role === "superadmin";
  // hanya admin/superadmin yg boleh akses
  // (Kalau route-mu sudah di-guard, ini opsional)
  useEffect(() => {
    if (!isAdmin && !isSuperAdmin) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAdmin, isSuperAdmin, navigate]);

  // data master
  const brandIndex = useMemo(() => getBrandIndex(), []);
  const brandOptions = useMemo(() => brandIndex.map((b) => b.brand), [brandIndex]);

  // state list
  const [rows, setRows] = useState(() => loadRows());

  // form input
  const [form, setForm] = useState(() => ({
    date: new Date().toISOString().slice(0, 10),
    vendorId: VENDORS[0]?.id || "",
    kategori: PURCHASE_CATEGORIES[0],
    tokoTerimaId: ALL_TOKO_IDS[0] || 1,

    brand: brandOptions[0] || "",
    product: "",
    warna: "",
    qty: 1,
    unitPrice: 0,
    discount: 0,
    taxPct: 11,

    paymentMethod: PAYMENT_METHODS[0] || "Cash",
    tenor: 0,
    poNumber: "",
    note: "",
    status: "Draft", // Draft | Ordered | Received
  }));

  // opsi produk/warna
  const productOptions = useMemo(() => {
    if (!form.brand) return [];
    const b = brandIndex.find((x) => x.brand === form.brand);
    return b ? b.products.map((p) => p.name) : [];
  }, [brandIndex, form.brand]);

  const warnaOptions = useMemo(() => {
    if (!form.brand || !form.product) return [];
    const b = brandIndex.find((x) => x.brand === form.brand);
    const p = b?.products.find((pp) => pp.name === form.product);
    return p?.warna || [];
  }, [brandIndex, form.brand, form.product]);

  // auto ambil harga default (grosir) dari master saat product/warna berubah
  useEffect(() => {
    if (!form.brand || !form.product) return;
    const h = findHarga({
      brand: form.brand,
      name: form.product,
      warna: form.warna,
      prefer: "grosir",
    });
    if (h) {
      setForm((f) => ({ ...f, unitPrice: toNum(h.harga) || toNum(h.grosir) || toNum(h.srp) }));
    }
  }, [form.brand, form.product, form.warna]);

  // file input ref (import)
  const fileRef = useRef(null);

  // tambah datarow
  const addRow = () => {
    const id = rows.length ? Math.max(...rows.map((r) => Number(r.id) || 0)) + 1 : 1;
    const newRow = { id, ...form };
    setRows((prev) => {
      const next = [newRow, ...prev];
      saveRows(next);
      return next;
    });
    // reset ringan
    setForm((f) => ({
      ...f,
      product: "",
      warna: "",
      qty: 1,
      unitPrice: 0,
      discount: 0,
      taxPct: 11,
      poNumber: "",
      note: "",
      status: "Draft",
    }));
  };

  // edit
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);

  const beginEdit = (row) => {
    setEditingId(row.id);
    setDraft({ ...row });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
  };
  const saveEdit = () => {
    setRows((prev) => {
      const next = prev.map((r) => (r.id === editingId ? { ...draft } : r));
      saveRows(next);
      return next;
    });
    cancelEdit();
  };
  const deleteRow = (id) => {
    if (!window.confirm("Hapus transaksi pembelian ini?")) return;
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      saveRows(next);
      return next;
    });
  };

  // import
  const onImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "" });

      const norm = json.map((r, i) => {
        const lower = Object.fromEntries(
          Object.entries(r).map(([k, v]) => [String(k).trim().toLowerCase(), v])
        );
        const pick = (...keys) => {
          for (const k of keys) {
            if (k in lower && `${lower[k]}`.trim() !== "") return lower[k];
          }
          return "";
        };

        const brand = pick("brand", "merk", "merek");
        const product = pick("produk", "product", "type", "tipe", "model");
        const warna = pick("warna", "color");
        const qty = toNum(pick("qty", "jumlah"));
        const unitPrice = toNum(pick("harga", "unit price", "harga beli"));
        const discount = toNum(pick("discount", "disc", "potongan"));
        const taxPct = toNum(pick("ppn", "tax", "pajak"));
        const vendorName = pick("vendor", "supplier", "pemasok");
        const vendorId =
          VENDORS.find((v) => (v.name || "").toLowerCase() === (vendorName || "").toLowerCase())
            ?.id || VENDORS[0]?.id;
        const kategori = pick("kategori", "category") || PURCHASE_CATEGORIES[0];
        const tokoTerimaName = pick("toko", "toko terima", "store");
        const tokoTerimaId =
          ALL_TOKO_IDS.find((id) => TOKO_LABELS[id] === tokoTerimaName) || ALL_TOKO_IDS[0];

        return {
          id: rows.length + i + 1,
          date: parseXlsxDate(pick("tanggal", "date", "tgl")),
          vendorId,
          kategori,
          tokoTerimaId,
          brand,
          product,
          warna,
          qty,
          unitPrice,
          discount,
          taxPct: taxPct || 11,
          paymentMethod: pick("payment method", "metode bayar") || PAYMENT_METHODS[0],
          tenor: toNum(pick("tenor", "bulan")),
          poNumber: pick("po", "po number", "no po"),
          note: pick("note", "catatan"),
          status: pick("status") || "Draft",
        };
      });

      setRows((prev) => {
        const next = [...norm, ...prev];
        saveRows(next);
        return next;
      });
      if (fileRef.current) fileRef.current.value = "";
    } catch (err) {
      console.error(err);
      alert("Gagal import. Pastikan format kolom sesuai.");
    }
  };

  // export
  const onExport = () => {
    const data = rows.map((r) => {
      const t = computeTotals(r);
      return {
        TANGGAL: r.date,
        VENDOR: VENDORS.find((v) => v.id === r.vendorId)?.name || r.vendorId,
        KATEGORI: r.kategori,
        TOKO_TERIMA: TOKO_LABELS[r.tokoTerimaId] || r.tokoTerimaId,
        BRAND: r.brand,
        PRODUK: r.product,
        WARNA: r.warna,
        QTY: r.qty,
        HARGA_SATUAN: r.unitPrice,
        DISKON_RP: r.discount,
        PPN_PCT: r.taxPct,
        SUBTOTAL: t.afterDisc,
        PPN_NOMINAL: t.tax,
        TOTAL: t.total,
        PEMBAYARAN: r.paymentMethod,
        TENOR: r.tenor,
        NO_PO: r.poNumber,
        CATATAN: r.note,
        STATUS: r.status,
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Pembelian Pusat");
    const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    XLSX.writeFile(wb, `PEMBELIAN_PUSAT_${ymd}.xlsx`);
  };

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        const t = computeTotals(r);
        acc.count += 1;
        acc.qty += toNum(r.qty);
        acc.value += t.total;
        return acc;
      },
      { count: 0, qty: 0, value: 0 }
    );
  }, [rows]);

  const back = () => navigate(-1);

  /* ========== Render ========== */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Pembelian Produk Pusat Mila Phone</h1>
          <p className="text-slate-600">
            Alur pembelian antar vendor untuk pusat. Admin & Superadmin dapat menambah, mengubah, dan menghapus.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={back}
            className="rounded-lg border bg-white px-3 py-2 text-sm shadow-sm hover:bg-slate-50"
          >
            ← Kembali
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            id="import-xlsx"
            onChange={onImport}
          />
          <label
            htmlFor="import-xlsx"
            className="cursor-pointer rounded-lg border bg-white px-3 py-2 text-sm shadow-sm hover:bg-slate-50"
          >
            Import Excel
          </label>
          <button
            onClick={onExport}
            className="rounded-lg border bg-white px-3 py-2 text-sm shadow-sm hover:bg-slate-50"
          >
            Export Excel
          </button>
        </div>
      </div>

      {/* Ringkas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Total PO</div>
          <div className="mt-1 text-2xl font-semibold">{totals.count}</div>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Total Qty</div>
          <div className="mt-1 text-2xl font-semibold">{totals.qty}</div>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Total Nilai</div>
          <div className="mt-1 text-2xl font-semibold">{formatCurrency(totals.value)}</div>
        </div>
      </div>

      {/* Form */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Form Pembelian</h2>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div>
            <label className="text-xs text-slate-600">Tanggal</label>
            <input
              type="date"
              className="w-full border rounded px-2 py-1"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-slate-600">Vendor</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={form.vendorId}
              onChange={(e) => setForm({ ...form, vendorId: e.target.value })}
            >
              {VENDORS.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-600">Kategori</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={form.kategori}
              onChange={(e) => setForm({ ...form, kategori: e.target.value })}
            >
              {PURCHASE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-slate-600">Toko Penerima</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={form.tokoTerimaId}
              onChange={(e) => setForm({ ...form, tokoTerimaId: Number(e.target.value) })}
            >
              {ALL_TOKO_IDS.map((id) => (
                <option key={id} value={id}>
                  {TOKO_LABELS[id]}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-slate-600">Brand</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={form.brand}
              onChange={(e) =>
                setForm({ ...form, brand: e.target.value, product: "", warna: "" })
              }
            >
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
              value={form.product}
              onChange={(e) => setForm({ ...form, product: e.target.value, warna: "" })}
            >
              <option value="">— Pilih Produk —</option>
              {productOptions.map((p) => (
                <option key={p} value={p}>
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
            <label className="text-xs text-slate-600">Qty</label>
            <input
              type="number"
              min={1}
              className="w-full border rounded px-2 py-1 text-right"
              value={form.qty}
              onChange={(e) => setForm({ ...form, qty: toNum(e.target.value) })}
            />
          </div>

          <div>
            <label className="text-xs text-slate-600">Harga Satuan</label>
            <input
              type="number"
              min={0}
              className="w-full border rounded px-2 py-1 text-right"
              value={form.unitPrice}
              onChange={(e) => setForm({ ...form, unitPrice: toNum(e.target.value) })}
            />
          </div>

          <div>
            <label className="text-xs text-slate-600">Diskon (Rp)</label>
            <input
              type="number"
              min={0}
              className="w-full border rounded px-2 py-1 text-right"
              value={form.discount}
              onChange={(e) => setForm({ ...form, discount: toNum(e.target.value) })}
            />
          </div>

          <div>
            <label className="text-xs text-slate-600">PPN (%)</label>
            <input
              type="number"
              min={0}
              className="w-full border rounded px-2 py-1 text-right"
              value={form.taxPct}
              onChange={(e) => setForm({ ...form, taxPct: toNum(e.target.value) })}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-slate-600">Metode Bayar</label>
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
              <select
                className="border rounded px-2 py-1"
                value={form.tenor}
                onChange={(e) => setForm({ ...form, tenor: toNum(e.target.value) })}
              >
                <option value={0}>Tenor</option>
                {TENOR_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-slate-600">No. PO</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={form.poNumber}
              onChange={(e) => setForm({ ...form, poNumber: e.target.value })}
              placeholder="PO-XXXXXX"
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-slate-600">Status</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option value="Draft">Draft</option>
              <option value="Ordered">Ordered</option>
              <option value="Received">Received</option>
            </select>
          </div>

          <div className="md:col-span-6">
            <label className="text-xs text-slate-600">Catatan</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>
        </div>

        {/* Preview total */}
        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-3">
          {(() => {
            const t = computeTotals(form);
            return (
              <>
                <div className="rounded-lg border bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">Subtotal</div>
                  <div className="font-semibold">{formatCurrency(t.afterDisc)}</div>
                </div>
                <div className="rounded-lg border bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">PPN</div>
                  <div className="font-semibold">{formatCurrency(t.tax)}</div>
                </div>
                <div className="rounded-lg border bg-slate-50 p-3">
                  <div className="text-xs text-slate-500">TOTAL</div>
                  <div className="font-semibold">{formatCurrency(t.total)}</div>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={addRow}
                    className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-semibold shadow-sm w-full"
                  >
                    Tambah
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Tabel */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm overflow-x-auto">
        <h2 className="text-lg font-semibold mb-3">Daftar Pembelian</h2>
        <table className="min-w-[1200px] text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left">Tanggal</th>
              <th className="px-3 py-2 text-left">Vendor</th>
              <th className="px-3 py-2 text-left">Kategori</th>
              <th className="px-3 py-2 text-left">Toko Terima</th>
              <th className="px-3 py-2 text-left">Brand</th>
              <th className="px-3 py-2 text-left">Produk</th>
              <th className="px-3 py-2 text-left">Warna</th>
              <th className="px-3 py-2 text-right">Qty</th>
              <th className="px-3 py-2 text-right">Harga</th>
              <th className="px-3 py-2 text-right">Diskon</th>
              <th className="px-3 py-2 text-right">PPN %</th>
              <th className="px-3 py-2 text-right">Subtotal</th>
              <th className="px-3 py-2 text-right">PPN</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-left">Pembayaran</th>
              <th className="px-3 py-2 text-right">Tenor</th>
              <th className="px-3 py-2 text-left">No. PO</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Catatan</th>
              <th className="px-3 py-2 text-left">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const editing = editingId === r.id;
              if (editing && draft) {
                const t = computeTotals(draft);
                return (
                  <tr key={r.id} className="border-b last:border-0 bg-slate-50/60">
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        className="border rounded px-2 py-1"
                        value={draft.date}
                        onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="border rounded px-2 py-1"
                        value={draft.vendorId}
                        onChange={(e) => setDraft((d) => ({ ...d, vendorId: e.target.value }))}
                      >
                        {VENDORS.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="border rounded px-2 py-1"
                        value={draft.kategori}
                        onChange={(e) => setDraft((d) => ({ ...d, kategori: e.target.value }))}
                      >
                        {PURCHASE_CATEGORIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="border rounded px-2 py-1"
                        value={draft.tokoTerimaId}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, tokoTerimaId: Number(e.target.value) }))
                        }
                      >
                        {ALL_TOKO_IDS.map((id) => (
                          <option key={id} value={id}>
                            {TOKO_LABELS[id]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="border rounded px-2 py-1"
                        value={draft.brand}
                        onChange={(e) => setDraft((d) => ({ ...d, brand: e.target.value }))}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="border rounded px-2 py-1"
                        value={draft.product}
                        onChange={(e) => setDraft((d) => ({ ...d, product: e.target.value }))}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="border rounded px-2 py-1"
                        value={draft.warna}
                        onChange={(e) => setDraft((d) => ({ ...d, warna: e.target.value }))}
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        className="border rounded px-2 py-1 text-right w-24"
                        value={draft.qty}
                        onChange={(e) => setDraft((d) => ({ ...d, qty: toNum(e.target.value) }))}
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        className="border rounded px-2 py-1 text-right w-28"
                        value={draft.unitPrice}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, unitPrice: toNum(e.target.value) }))
                        }
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        className="border rounded px-2 py-1 text-right w-24"
                        value={draft.discount}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, discount: toNum(e.target.value) }))
                        }
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        className="border rounded px-2 py-1 text-right w-20"
                        value={draft.taxPct}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, taxPct: toNum(e.target.value) }))
                        }
                      />
                    </td>
                    <td className="px-3 py-2 text-right">{formatCurrency(t.afterDisc)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(t.tax)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(t.total)}</td>
                    <td className="px-3 py-2">
                      <select
                        className="border rounded px-2 py-1"
                        value={draft.paymentMethod}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, paymentMethod: e.target.value }))
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
                      <select
                        className="border rounded px-2 py-1"
                        value={draft.tenor}
                        onChange={(e) => setDraft((d) => ({ ...d, tenor: toNum(e.target.value) }))}
                      >
                        <option value={0}>0</option>
                        {TENOR_OPTIONS.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="border rounded px-2 py-1"
                        value={draft.poNumber}
                        onChange={(e) => setDraft((d) => ({ ...d, poNumber: e.target.value }))}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="border rounded px-2 py-1"
                        value={draft.status}
                        onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
                      >
                        <option value="Draft">Draft</option>
                        <option value="Ordered">Ordered</option>
                        <option value="Received">Received</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="border rounded px-2 py-1 w-48"
                        value={draft.note}
                        onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
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

              const t = computeTotals(r);
              return (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{r.date}</td>
                  <td className="px-3 py-2">{VENDORS.find((v) => v.id === r.vendorId)?.name || r.vendorId}</td>
                  <td className="px-3 py-2">{r.kategori}</td>
                  <td className="px-3 py-2">{TOKO_LABELS[r.tokoTerimaId] || r.tokoTerimaId}</td>
                  <td className="px-3 py-2">{r.brand}</td>
                  <td className="px-3 py-2">{r.product}</td>
                  <td className="px-3 py-2">{r.warna || "-"}</td>
                  <td className="px-3 py-2 text-right">{r.qty}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(r.unitPrice)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(r.discount)}</td>
                  <td className="px-3 py-2 text-right">{r.taxPct}%</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(t.afterDisc)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(t.tax)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(t.total)}</td>
                  <td className="px-3 py-2">{r.paymentMethod}</td>
                  <td className="px-3 py-2 text-right">{r.tenor || 0}</td>
                  <td className="px-3 py-2">{r.poNumber || "-"}</td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ${
                        r.status === "Received"
                          ? "bg-green-100 text-green-700"
                          : r.status === "Ordered"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">{r.note || "-"}</td>
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
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-slate-500" colSpan={20}>
                  Belum ada data pembelian.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        Data tersimpan di browser (localStorage) dengan key <code>{LS_KEY}</code>. Vendor & kategori diambil dari file <code>src/data/Vendors.js</code>. 
        Brand/Produk/Warna otomatis dari <code>MasterDataHargaPenjualan</code>.
      </p>
    </div>
  );
}
