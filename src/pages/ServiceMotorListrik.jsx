// src/pages/ServiceMotorListrik.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { useNavigate } from "react-router-dom";

import TOKO_LABELS, { ALL_TOKO_IDS } from "../data/TokoLabels";
import { getBrandIndex } from "../data/MasterDataHargaPenjualan";
import { getSalesByToko } from "../data/ListDataPenjualan";

/* ================= Utils ================= */
const toNum = (v) => (isNaN(Number(v)) ? 0 : Number(v));
const unique = (arr) => Array.from(new Set((arr || []).filter(Boolean)));
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

/* ================= LocalStorage ================= */
const LS_KEY = "MMT_SERVICE_MOLIS_V1";

function loadRows() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const j = JSON.parse(raw || "[]");
    return Array.isArray(j) ? j : [];
  } catch {
    return [];
  }
}
function saveRows(rows) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(rows));
  } catch {}
}

/* ================= Page ================= */
export default function ServiceMotorListrik({ user }) {
  const navigate = useNavigate();

  // Role & toko context
  const isSuperAdmin = user?.role === "superadmin";
  const isAdmin = user?.role === "admin";
  const picMatch = /^pic_toko(\d+)$/i.exec(user?.role || "");
  const picTokoId = picMatch ? Number(picMatch[1]) : (user?.toko ? Number(user.toko) : null);

  const [serviceTokoId, setServiceTokoId] = useState(
    isSuperAdmin || isAdmin ? ALL_TOKO_IDS[0] : picTokoId || ALL_TOKO_IDS[0]
  );
  const serviceTokoName = TOKO_LABELS[serviceTokoId];

  // master brand/product/warna
  const brandIndex = useMemo(() => getBrandIndex(), []);
  const brandOptions = useMemo(() => brandIndex.map((b) => b.brand), [brandIndex]);

  // rows
  const [rows, setRows] = useState(() => loadRows());

  // visible rows
  const visibleRows = useMemo(() => {
    if (isSuperAdmin || isAdmin) return rows;
    if (picTokoId) return rows.filter((r) => Number(r.tokoServiceId) === picTokoId);
    return [];
  }, [rows, isSuperAdmin, isAdmin, picTokoId]);

  // form
  const [form, setForm] = useState(() => ({
    tanggalMasuk: new Date().toISOString().slice(0, 10),
    tokoAsalId: isSuperAdmin || isAdmin ? ALL_TOKO_IDS[0] : picTokoId || ALL_TOKO_IDS[0],
    tokoServiceId: isSuperAdmin || isAdmin ? ALL_TOKO_IDS[0] : picTokoId || ALL_TOKO_IDS[0],

    pelangganNama: "",
    pelangganHp: "",

    brand: brandOptions[0] || "",
    produk: "",
    warna: "",
    noDinamo: "",
    noRangka: "",

    keluhan: "",
    diagnosa: "",
    sparepart: "",
    biayaSparepart: 0,
    ongkosService: 0,
    status: "Masuk",
    teknisi: "",
    estimasiSelesai: "",
    tanggalSelesai: "",
    catatan: "",
  }));

  // sinkron toko service di header -> form
  useEffect(() => {
    setForm((f) => ({ ...f, tokoServiceId: serviceTokoId }));
  }, [serviceTokoId]);

  const productOptions = useMemo(() => {
    const b = brandIndex.find((x) => x.brand === form.brand);
    return b ? b.products.map((p) => p.name) : [];
  }, [brandIndex, form.brand]);

  const warnaOptions = useMemo(() => {
    const b = brandIndex.find((x) => x.brand === form.brand);
    const p = b?.products.find((pp) => pp.name === form.produk);
    return p?.warna || [];
  }, [brandIndex, form.brand, form.produk]);

  // teknisi list
  const teknisiOptions = useMemo(() => {
    const list = getSalesByToko(serviceTokoName) || [];
    const tuyul = unique(list.map((x) => x.tuyul).filter(Boolean));
    const sales = unique(list.map((x) => x.name).filter(Boolean));
    return unique([...tuyul, ...sales]);
  }, [serviceTokoName]);

  // import
  const fileRef = useRef(null);
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
        const tokoAsalName = pick("toko_asal", "toko asal", "asal");
        const tokoServiceName = pick("toko_service", "toko service", "bengkel");
        const tokoAsalId =
          ALL_TOKO_IDS.find((id) => TOKO_LABELS[id] === tokoAsalName) ?? form.tokoAsalId;
        const tokoServiceId =
          ALL_TOKO_IDS.find((id) => TOKO_LABELS[id] === tokoServiceName) ?? serviceTokoId;

        return {
          id: rows.length + i + 1,
          tanggalMasuk: parseXlsxDate(pick("tanggal masuk", "tanggal", "date")),
          tokoAsalId,
          tokoServiceId,
          pelangganNama: pick("pelanggan", "nama pelanggan"),
          pelangganHp: pick("no hp", "wa", "whatsapp"),
          brand: pick("brand", "merk"),
          produk: pick("produk", "model", "tipe"),
          warna: pick("warna", "color"),
          noDinamo: pick("no dinamo", "dinamo"),
          noRangka: pick("no rangka", "frame"),
          keluhan: pick("keluhan", "masalah"),
          diagnosa: pick("diagnosa"),
          sparepart: pick("sparepart", "part"),
          biayaSparepart: toNum(pick("biaya sparepart", "biaya_sparepart")),
          ongkosService: toNum(pick("ongkos", "ongkos service", "biaya jasa")),
          status: pick("status") || "Masuk",
          teknisi: pick("teknisi"),
          estimasiSelesai: parseXlsxDate(pick("estimasi selesai", "eta")),
          tanggalSelesai: parseXlsxDate(pick("tanggal selesai", "done")),
          catatan: pick("catatan", "note"),
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
    const data = visibleRows.map((r) => ({
      TANGGAL_MASUK: r.tanggalMasuk,
      TOKO_ASAL: TOKO_LABELS[r.tokoAsalId],
      TOKO_SERVICE: TOKO_LABELS[r.tokoServiceId],
      PELANGGAN: r.pelangganNama,
      NO_HP: r.pelangganHp,
      BRAND: r.brand,
      PRODUK: r.produk,
      WARNA: r.warna,
      NO_DINAMO: r.noDinamo,
      NO_RANGKA: r.noRangka,
      KELUHAN: r.keluhan,
      DIAGNOSA: r.diagnosa,
      SPAREPART: r.sparepart,
      BIAYA_SPAREPART: r.biayaSparepart,
      ONGKOS_SERVICE: r.ongkosService,
      TOTAL_BIAYA: toNum(r.biayaSparepart) + toNum(r.ongkosService),
      STATUS: r.status,
      TEKNISI: r.teknisi,
      ESTIMASI_SELESAI: r.estimasiSelesai,
      TANGGAL_SELESAI: r.tanggalSelesai,
      CATATAN: r.catatan,
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Service Molis");
    const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    XLSX.writeFile(wb, `SERVICE_MOTOR_LISTRIK_${TOKO_LABELS[serviceTokoId]}_${ymd}.xlsx`);
  };

  // tambah row
  const addRow = () => {
    const id = rows.length ? Math.max(...rows.map((r) => Number(r.id) || 0)) + 1 : 1;
    const newRow = { id, ...form };
    setRows((prev) => {
      const next = [newRow, ...prev];
      saveRows(next);
      return next;
    });
    setForm((f) => ({
      ...f,
      pelangganNama: "",
      pelangganHp: "",
      produk: "",
      warna: "",
      noDinamo: "",
      noRangka: "",
      keluhan: "",
      diagnosa: "",
      sparepart: "",
      biayaSparepart: 0,
      ongkosService: 0,
      status: "Masuk",
      teknisi: "",
      estimasiSelesai: "",
      tanggalSelesai: "",
      catatan: "",
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
    if (!window.confirm("Hapus data service ini?")) return;
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      saveRows(next);
      return next;
    });
  };

  const totals = useMemo(() => {
    return visibleRows.reduce(
      (acc, r) => {
        acc.count += 1;
        acc.value += toNum(r.biayaSparepart) + toNum(r.ongkosService);
        return acc;
      },
      { count: 0, value: 0 }
    );
  }, [visibleRows]);

  const back = () => navigate(-1);

  /* ================= Render ================= */
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Service Motor Listrik Mila Phone</h1>
          <p className="text-slate-600">
            Alur service antar toko. {isSuperAdmin || isAdmin ? "Mode pusat (lihat semua toko)." : "Mode PIC (toko sendiri)."}
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

      {/* Ringkas + picker toko untuk pusat */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Total Tiket</div>
          <div className="mt-1 text-2xl font-semibold">{totals.count}</div>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Total Perkiraan Biaya</div>
          <div className="mt-1 text-2xl font-semibold">{formatCurrency(totals.value)}</div>
        </div>
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <div className="text-sm text-slate-500">Toko Service Aktif</div>
          <div className="mt-1 text-2xl font-semibold">{TOKO_LABELS[serviceTokoId]}</div>
        </div>
      </div>

      {(isSuperAdmin || isAdmin) && (
        <div className="rounded-2xl border bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-600">Toko Service (bengkel)</label>
              <select
                className="w-full border rounded px-2 py-1"
                value={serviceTokoId}
                onChange={(e) => setServiceTokoId(Number(e.target.value))}
              >
                {ALL_TOKO_IDS.map((id) => (
                  <option key={id} value={id}>
                    {TOKO_LABELS[id]}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Form */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold mb-3">Form Service</h2>
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div>
            <label className="text-xs text-slate-600">Tanggal Masuk</label>
            <input
              type="date"
              className="w-full border rounded px-2 py-1"
              value={form.tanggalMasuk}
              onChange={(e) => setForm({ ...form, tanggalMasuk: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs text-slate-600">Toko Asal</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={form.tokoAsalId}
              onChange={(e) => setForm({ ...form, tokoAsalId: Number(e.target.value) })}
            >
              {ALL_TOKO_IDS.map((id) => (
                <option key={id} value={id}>
                  {TOKO_LABELS[id]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-600">Toko Service</label>
            <select
              disabled={!(isSuperAdmin || isAdmin)}
              className={`w-full border rounded px-2 py-1 ${!(isSuperAdmin || isAdmin) ? "bg-slate-50" : ""}`}
              value={form.tokoServiceId}
              onChange={(e) => setForm({ ...form, tokoServiceId: Number(e.target.value) })}
            >
              {ALL_TOKO_IDS.map((id) => (
                <option key={id} value={id}>
                  {TOKO_LABELS[id]}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-slate-600">Nama Pelanggan</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={form.pelangganNama}
              onChange={(e) => setForm({ ...form, pelangganNama: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs text-slate-600">No HP/WA</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={form.pelangganHp}
              onChange={(e) => setForm({ ...form, pelangganHp: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mt-3">
          <div className="md:col-span-2">
            <label className="text-xs text-slate-600">Brand</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={form.brand}
              onChange={(e) => setForm({ ...form, brand: e.target.value, produk: "", warna: "" })}
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
              value={form.produk}
              onChange={(e) => setForm({ ...form, produk: e.target.value, warna: "" })}
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
            <label className="text-xs text-slate-600">No Dinamo</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={form.noDinamo}
              onChange={(e) => setForm({ ...form, noDinamo: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mt-3">
          <div className="md:col-span-3">
            <label className="text-xs text-slate-600">Keluhan</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={form.keluhan}
              onChange={(e) => setForm({ ...form, keluhan: e.target.value })}
            />
          </div>
          <div className="md:col-span-3">
            <label className="text-xs text-slate-600">Diagnosa</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={form.diagnosa}
              onChange={(e) => setForm({ ...form, diagnosa: e.target.value })}
            />
          </div>

          <div className="md:col-span-2">
            <label className="text-xs text-slate-600">Sparepart</label>
            <input
              className="w-full border rounded px-2 py-1"
              placeholder="Nama part"
              value={form.sparepart}
              onChange={(e) => setForm({ ...form, sparepart: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">Biaya Sparepart</label>
            <input
              type="number"
              min={0}
              className="w-full border rounded px-2 py-1 text-right"
              value={form.biayaSparepart}
              onChange={(e) => setForm({ ...form, biayaSparepart: toNum(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">Ongkos Service</label>
            <input
              type="number"
              min={0}
              className="w-full border rounded px-2 py-1 text-right"
              value={form.ongkosService}
              onChange={(e) => setForm({ ...form, ongkosService: toNum(e.target.value) })}
            />
          </div>
          <div>
            <label className="text-xs text-slate-600">Status</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              <option>Masuk</option>
              <option>Proses</option>
              <option>Selesai</option>
              <option>Diambil</option>
              <option>Cancel</option>
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-600">Teknisi</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={form.teknisi}
              onChange={(e) => setForm({ ...form, teknisi: e.target.value })}
            >
              <option value="">— Pilih —</option>
              {teknisiOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-600">Estimasi Selesai</label>
            <input
              type="date"
              className="w-full border rounded px-2 py-1"
              value={form.estimasiSelesai}
              onChange={(e) => setForm({ ...form, estimasiSelesai: e.target.value })}
            />
          </div>

          <div>
            <label className="text-xs text-slate-600">Tanggal Selesai</label>
            <input
              type="date"
              className="w-full border rounded px-2 py-1"
              value={form.tanggalSelesai}
              onChange={(e) => setForm({ ...form, tanggalSelesai: e.target.value })}
            />
          </div>

          <div className="md:col-span-6">
            <label className="text-xs text-slate-600">Catatan</label>
            <input
              className="w-full border rounded px-2 py-1"
              value={form.catatan}
              onChange={(e) => setForm({ ...form, catatan: e.target.value })}
            />
          </div>
        </div>

        {/* Preview total & action */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
          <div className="rounded-lg border bg-slate-50 p-3">
            <div className="text-xs text-slate-500">Total Perkiraan</div>
            <div className="font-semibold">
              {formatCurrency(toNum(form.biayaSparepart) + toNum(form.ongkosService))}
            </div>
          </div>
          <div className="md:col-span-3 flex items-end">
            <button
              onClick={addRow}
              className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-semibold shadow-sm w-full md:w-auto"
            >
              Tambah
            </button>
          </div>
        </div>
      </div>

      {/* Tabel */}
      <div className="rounded-2xl border bg-white p-4 shadow-sm overflow-x-auto">
        <h2 className="text-lg font-semibold mb-3">Daftar Service</h2>
        <table className="min-w-[1200px] text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left">Tgl Masuk</th>
              <th className="px-3 py-2 text-left">Toko Asal</th>
              <th className="px-3 py-2 text-left">Toko Service</th>
              <th className="px-3 py-2 text-left">Pelanggan</th>
              <th className="px-3 py-2 text-left">HP/WA</th>
              <th className="px-3 py-2 text-left">Brand</th>
              <th className="px-3 py-2 text-left">Produk</th>
              <th className="px-3 py-2 text-left">Warna</th>
              <th className="px-3 py-2 text-left">No Dinamo</th>
              <th className="px-3 py-2 text-left">No Rangka</th>
              <th className="px-3 py-2 text-left">Keluhan</th>
              <th className="px-3 py-2 text-left">Diagnosa</th>
              <th className="px-3 py-2 text-right">Biaya Part</th>
              <th className="px-3 py-2 text-right">Ongkos</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Teknisi</th>
              <th className="px-3 py-2 text-left">ETA</th>
              <th className="px-3 py-2 text-left">Selesai</th>
              <th className="px-3 py-2 text-left">Catatan</th>
              <th className="px-3 py-2 text-left">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((r) => {
              const editing = editingId === r.id;
              if (editing && draft) {
                return (
                  <tr key={r.id} className="border-b last:border-0 bg-slate-50/60">
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        className="border rounded px-2 py-1"
                        value={draft.tanggalMasuk}
                        onChange={(e) => setDraft((d) => ({ ...d, tanggalMasuk: e.target.value }))}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="border rounded px-2 py-1"
                        value={draft.tokoAsalId}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, tokoAsalId: Number(e.target.value) }))
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
                      <select
                        disabled={!(isSuperAdmin || isAdmin)}
                        className={`border rounded px-2 py-1 ${!(isSuperAdmin || isAdmin) ? "bg-slate-50" : ""}`}
                        value={draft.tokoServiceId}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, tokoServiceId: Number(e.target.value) }))
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
                        value={draft.pelangganNama}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, pelangganNama: e.target.value }))
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="border rounded px-2 py-1"
                        value={draft.pelangganHp}
                        onChange={(e) => setDraft((d) => ({ ...d, pelangganHp: e.target.value }))}
                      />
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
                        value={draft.produk}
                        onChange={(e) => setDraft((d) => ({ ...d, produk: e.target.value }))}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="border rounded px-2 py-1"
                        value={draft.warna}
                        onChange={(e) => setDraft((d) => ({ ...d, warna: e.target.value }))}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="border rounded px-2 py-1"
                        value={draft.noDinamo}
                        onChange={(e) => setDraft((d) => ({ ...d, noDinamo: e.target.value }))}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="border rounded px-2 py-1"
                        value={draft.noRangka}
                        onChange={(e) => setDraft((d) => ({ ...d, noRangka: e.target.value }))}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="border rounded px-2 py-1 w-48"
                        value={draft.keluhan}
                        onChange={(e) => setDraft((d) => ({ ...d, keluhan: e.target.value }))}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="border rounded px-2 py-1 w-48"
                        value={draft.diagnosa}
                        onChange={(e) => setDraft((d) => ({ ...d, diagnosa: e.target.value }))}
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        className="border rounded px-2 py-1 text-right w-24"
                        value={draft.biayaSparepart}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, biayaSparepart: toNum(e.target.value) }))
                        }
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        className="border rounded px-2 py-1 text-right w-24"
                        value={draft.ongkosService}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, ongkosService: toNum(e.target.value) }))
                        }
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      {formatCurrency(toNum(draft.biayaSparepart) + toNum(draft.ongkosService))}
                    </td>
                    <td className="px-3 py-2">
                      <select
                        className="border rounded px-2 py-1"
                        value={draft.status}
                        onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
                      >
                        <option>Masuk</option>
                        <option>Proses</option>
                        <option>Selesai</option>
                        <option>Diambil</option>
                        <option>Cancel</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="border rounded px-2 py-1"
                        value={draft.teknisi}
                        onChange={(e) => setDraft((d) => ({ ...d, teknisi: e.target.value }))}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        className="border rounded px-2 py-1"
                        value={draft.estimasiSelesai}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, estimasiSelesai: e.target.value }))
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="date"
                        className="border rounded px-2 py-1"
                        value={draft.tanggalSelesai}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, tanggalSelesai: e.target.value }))
                        }
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        className="border rounded px-2 py-1 w-48"
                        value={draft.catatan}
                        onChange={(e) => setDraft((d) => ({ ...d, catatan: e.target.value }))}
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

              return (
                <tr key={r.id} className="border-b last:border-0">
                  <td className="px-3 py-2">{r.tanggalMasuk}</td>
                  <td className="px-3 py-2">{TOKO_LABELS[r.tokoAsalId]}</td>
                  <td className="px-3 py-2">{TOKO_LABELS[r.tokoServiceId]}</td>
                  <td className="px-3 py-2">{r.pelangganNama}</td>
                  <td className="px-3 py-2">{r.pelangganHp}</td>
                  <td className="px-3 py-2">{r.brand}</td>
                  <td className="px-3 py-2">{r.produk}</td>
                  <td className="px-3 py-2">{r.warna || "-"}</td>
                  <td className="px-3 py-2">{r.noDinamo || "-"}</td>
                  <td className="px-3 py-2">{r.noRangka || "-"}</td>
                  <td className="px-3 py-2">{r.keluhan || "-"}</td>
                  <td className="px-3 py-2">{r.diagnosa || "-"}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(r.biayaSparepart)}</td>
                  <td className="px-3 py-2 text-right">{formatCurrency(r.ongkosService)}</td>
                  <td className="px-3 py-2 text-right">
                    {formatCurrency(toNum(r.biayaSparepart) + toNum(r.ongkosService))}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] ${
                        r.status === "Selesai"
                          ? "bg-green-100 text-green-700"
                          : r.status === "Proses"
                          ? "bg-blue-100 text-blue-700"
                          : r.status === "Diambil"
                          ? "bg-emerald-100 text-emerald-700"
                          : r.status === "Cancel"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">{r.teknisi || "-"}</td>
                  <td className="px-3 py-2">{r.estimasiSelesai || "-"}</td>
                  <td className="px-3 py-2">{r.tanggalSelesai || "-"}</td>
                  <td className="px-3 py-2">{r.catatan || "-"}</td>
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
            {visibleRows.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-slate-500" colSpan={20}>
                  Belum ada data service.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        Data disimpan di browser (localStorage) key <code>{LS_KEY}</code>. Saran brand/produk/warna
        diambil dari <code>getBrandIndex()</code> (MasterDataHargaPenjualan).
      </p>
    </div>
  );
}
