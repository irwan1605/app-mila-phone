// src/pages/Sperpar.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
  FaSearch,
  FaEdit,
  FaTrash,
  FaCheck,
  FaTimes,
  FaRedo,
  FaFileUpload,
  FaDownload,
  FaPlus,
  FaChevronDown,
} from "react-icons/fa";

const LS_KEY = "sparepartRows_v2"; // bump version agar schema baru bersih

function normalizeHeader(h) {
  if (!h) return "";
  const s = String(h).trim().toLowerCase();
  return s
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_{2,}/g, "_");
}

// YYYY-MM-DD
function pad2(n) {
  return n < 10 ? `0${n}` : `${n}`;
}
function toDateStr(v) {
  if (!v && v !== 0) return "";
  // jika Date object
  if (v instanceof Date && !isNaN(v)) {
    const y = v.getFullYear();
    const m = pad2(v.getMonth() + 1);
    const d = pad2(v.getDate());
    return `${y}-${m}-${d}`;
  }
  // jika angka (Excel serial)
  if (typeof v === "number" && isFinite(v)) {
    try {
      const o = XLSX.SSF.parse_date_code(v);
      if (o && o.y && o.m && o.d) {
        return `${o.y}-${pad2(o.m)}-${pad2(o.d)}`;
      }
    } catch {}
    const epoch = new Date(Math.round((v - 25569) * 86400 * 1000));
    if (!isNaN(epoch)) return toDateStr(epoch);
  }
  // jika string ISO/umum
  const d = new Date(v);
  if (!isNaN(d)) return toDateStr(d);
  return "";
}

function num(v) {
  if (v === null || v === undefined || v === "") return 0;
  const t = typeof v === "string" ? v.replace(/[^\d.-]/g, "") : v;
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

function mapRow(raw) {
  const obj = {};
  for (const k of Object.keys(raw)) obj[normalizeHeader(k)] = raw[k];

  const get = (...cands) => {
    for (const c of cands) {
      if (obj[c] !== undefined && obj[c] !== null && obj[c] !== "") return obj[c];
    }
    return "";
  };

  const code = get("kode", "sku", "id", "kode_barang", "item_code");
  const name = get("nama", "nama_barang", "barang", "item_name", "nama_sparepart");
  const category = get("kategori", "category", "jenis");
  const store = get("toko", "lokasi", "gudang", "cabang");
  const unit = get("satuan", "unit");
  const note = get("keterangan", "note", "catatan");

  const date = toDateStr(get("tanggal", "date", "tgl"));
  const opening = num(get("stock_awal", "stok_awal", "opening", "opening_stock"));
  const inQty = num(get("masuk", "qty_in", "in", "stock_in", "stok_masuk"));
  const outQty = num(get("keluar", "qty_out", "out", "stock_out", "stok_keluar"));
  let stock = num(get("stok", "stock", "qty", "jumlah", "kuantitas"));
  if (!stock && (opening || inQty || outQty)) {
    stock = opening + inQty - outQty;
  }

  const price = num(get("harga", "price", "harga_satuan"));
  const statusRaw = String(get("status", "approval", "verifikasi") || "").trim().toLowerCase();
  let status = "Pending";
  if (["approve", "approved", "ok", "setuju", "valid"].includes(statusRaw)) status = "Approved";
  if (["reject", "rejected", "tolak", "invalid"].includes(statusRaw)) status = "Rejected";

  return {
    id: code || `XLS-${Math.random().toString(36).slice(2, 8)}`,
    code: code || "",
    name: name || "",
    category: category || "",
    store: store || "",
    unit: unit || "",
    note: note || "",
    // baru
    date: date || "",
    opening,
    in: inQty,
    out: outQty,
    // lama
    stock,
    price,
    status,
  };
}

function formatCurrency(n) {
  try {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(n || 0));
  } catch {
    return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
  }
}

export default function Sperpar() {
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Add form
  const [showAdd, setShowAdd] = useState(true);
  const [form, setForm] = useState({
    code: "",
    name: "",
    category: "",
    store: "",
    unit: "",
    // baru
    date: "",
    opening: 0,
    in: 0,
    out: 0,
    // lama
    stock: 0,
    price: 0,
    note: "",
  });

  // Edit modal
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(null);

  // File input refs
  const fileExcelRef = useRef(null);
  const fileJsonRef = useRef(null);

  // ===== Initial load: localStorage -> JSON -> Excel =====
  useEffect(() => {
    const ls = localStorage.getItem(LS_KEY);
    if (ls) {
      try {
        const parsed = JSON.parse(ls);
        if (Array.isArray(parsed)) {
          setRows(parsed);
          return;
        }
      } catch {}
    }

    const tryFetch = async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Fetch ${url} -> ${res.status}`);
      return res;
    };

    (async () => {
      // JSON dulu
      try {
        const r = await tryFetch("/data/sparepart.json");
        const data = await r.json();
        const mapped = data.map(mapRow);
        setRows(mapped);
        localStorage.setItem(LS_KEY, JSON.stringify(mapped));
        return;
      } catch {}
      // Excel (sparpart.xlsx -> sparepart.xlsx)
      for (const u of ["/data/sparpart.xlsx", "/data/sparepart.xlsx"]) {
        try {
          const r = await tryFetch(u);
          const ab = await r.arrayBuffer();
          const wb = XLSX.read(ab, { type: "array", cellDates: true });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
          const mapped = json.map(mapRow);
          setRows(mapped);
          localStorage.setItem(LS_KEY, JSON.stringify(mapped));
          return;
        } catch {}
      }
      // Jika semua gagal: kosong
      setRows([]);
    })();
  }, []);

  // Persist changes
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(rows));
  }, [rows]);

  // ===== Options (dropdown) dari data =====
  const nameOptions = useMemo(() => {
    const s = new Set(rows.map((r) => String(r.name || "").trim()).filter(Boolean));
    return Array.from(s).sort((a, b) => a.localeCompare(b, "id"));
  }, [rows]);

  const storeOptions = useMemo(() => {
    const s = new Set(rows.map((r) => String(r.store || "").trim()).filter(Boolean));
    return Array.from(s).sort((a, b) => a.localeCompare(b, "id"));
  }, [rows]);

  // ===== Derived =====
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      const okQ =
        !q ||
        String(r.code).toLowerCase().includes(q) ||
        String(r.name).toLowerCase().includes(q) ||
        String(r.category).toLowerCase().includes(q) ||
        String(r.store).toLowerCase().includes(q);
      const okS = statusFilter === "ALL" || r.status === statusFilter;
      return okQ && okS;
    });
  }, [rows, query, statusFilter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [pageCount, page]);

  // ===== Actions: approve/reject/reset =====
  const handleApprove = (id) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "Approved" } : r)));
  const handleReject = (id) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "Rejected" } : r)));
  const handleReset = (id) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "Pending" } : r)));

  // ===== Actions: delete =====
  const handleDelete = (id) => {
    const r = rows.find((x) => x.id === id);
    if (!window.confirm(`Hapus item "${r?.name || id}"?`)) return;
    setRows((prev) => prev.filter((x) => x.id !== id));
  };

  // ===== Actions: edit =====
  const openEdit = (row) => {
    setEditing(row);
    setDraft({ ...row });
  };
  const closeEdit = () => {
    setEditing(null);
    setDraft(null);
  };
  const saveEdit = () => {
    setRows((prev) => prev.map((r) => (r.id === editing.id ? { ...r, ...draft } : r)));
    closeEdit();
  };

  // ===== Actions: add new =====
  const onChangeForm = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const handleAdd = (e) => {
    e.preventDefault();
    const required = ["code", "name", "store"];
    for (const k of required) {
      if (!String(form[k] || "").trim()) {
        alert(`Field "${k.toUpperCase()}" wajib diisi.`);
        return;
      }
    }
    // hitung stok jika kosong
    let stock = num(form.stock);
    const opening = num(form.opening);
    const inQty = num(form.in);
    const outQty = num(form.out);
    if (!stock) stock = opening + inQty - outQty;

    const id = `SP-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const newRow = {
      id,
      code: String(form.code || "").trim(),
      name: String(form.name || "").trim(),
      category: String(form.category || "").trim(),
      store: String(form.store || "").trim(),
      unit: String(form.unit || "").trim(),
      date: form.date || "",
      opening,
      in: inQty,
      out: outQty,
      stock,
      price: num(form.price),
      note: String(form.note || "").trim(),
      status: "Pending",
    };
    setRows((prev) => [newRow, ...prev]);
    setForm({
      code: "",
      name: "",
      category: "",
      store: "",
      unit: "",
      date: "",
      opening: 0,
      in: 0,
      out: 0,
      stock: 0,
      price: 0,
      note: "",
    });
    setShowAdd(false);
    setPage(1);
  };

  // ===== Import & Export =====
//   const fileExcelRef = useRef(null);
//   const fileJsonRef = useRef(null);

  const onImportExcel = async (file) => {
    if (!file) return;
    try {
      const ab = await file.arrayBuffer();
      const wb = XLSX.read(ab, { type: "array", cellDates: true });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      const mapped = json.map(mapRow);
      setRows(mapped);
      setPage(1);
    } catch (e) {
      alert("Gagal membaca Excel: " + e.message);
    } finally {
      if (fileExcelRef.current) fileExcelRef.current.value = "";
    }
  };

  const onImportJson = async (file) => {
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) throw new Error("Format JSON harus array of objects");
      const mapped = data.map(mapRow);
      setRows(mapped);
      setPage(1);
    } catch (e) {
      alert("Gagal membaca JSON: " + e.message);
    } finally {
      if (fileJsonRef.current) fileJsonRef.current.value = "";
    }
  };

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), {
      href: url,
      download: "sparepart.export.json",
    });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportExcel = () => {
    // Konversi rows ke worksheet lengkap
    const wsData = rows.map((r) => ({
      Tanggal: r.date,
      Kode: r.code,
      "Nama Sparepart": r.name,
      Kategori: r.category,
      Toko: r.store,
      Satuan: r.unit,
      "Stock Awal": r.opening,
      Masuk: r.in,
      Keluar: r.out,
      Stok: r.stock,
      Harga: r.price,
      Keterangan: r.note,
      Status: r.status,
    }));
    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sparepart");
    XLSX.writeFile(wb, "sparepart.export.xlsx");
  };

  const badgeClass = (s) =>
    s === "Approved"
      ? "bg-emerald-600"
      : s === "Rejected"
      ? "bg-rose-600"
      : "bg-amber-600";

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Header tools */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-xl font-semibold">Modul Sparepart</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center border rounded px-2">
            <FaSearch className="opacity-70" />
            <input
              placeholder="Cari kode / nama / kategori / toko…"
              className="px-2 py-1 outline-none bg-transparent"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <select
            className="border rounded px-2 py-1"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">Semua Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>

          <select
            className="border rounded px-2 py-1"
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(1);
            }}
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}/hal
              </option>
            ))}
          </select>

          <button
            className="inline-flex items-center gap-2 px-3 py-1 rounded bg-slate-800 text-white"
            onClick={() => {
              localStorage.removeItem(LS_KEY);
              window.location.reload();
            }}
            title="Muat ulang dari file sumber (JSON/Excel)"
          >
            <FaRedo />
            Reload
          </button>

          <label className="inline-flex items-center gap-2 px-3 py-1 rounded bg-blue-600 text-white cursor-pointer">
            <FaFileUpload />
            Import Excel
            <input
              ref={fileExcelRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => onImportExcel(e.target.files?.[0])}
            />
          </label>

          <label className="inline-flex items-center gap-2 px-3 py-1 rounded bg-indigo-600 text-white cursor-pointer">
            <FaFileUpload />
            Import JSON
            <input
              ref={fileJsonRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => onImportJson(e.target.files?.[0])}
            />
          </label>

          <button
            className="inline-flex items-center gap-2 px-3 py-1 rounded bg-emerald-700 text-white"
            onClick={exportJSON}
            title="Export JSON"
          >
            <FaDownload />
            JSON
          </button>
          <button
            className="inline-flex items-center gap-2 px-3 py-1 rounded bg-emerald-700 text-white"
            onClick={exportExcel}
            title="Export Excel"
          >
            <FaDownload />
            Excel
          </button>
        </div>
      </div>

      {/* Add form */}
      <div className="mb-3 border rounded">
        <button
          className="w-full flex items-center justify-between px-3 py-2 bg-slate-100"
          onClick={() => setShowAdd((s) => !s)}
        >
          <span className="inline-flex items-center gap-2 font-medium">
            <FaPlus /> Tambah Data Sparepart
          </span>
          <FaChevronDown className={`transition ${showAdd ? "rotate-180" : ""}`} />
        </button>

        {showAdd && (
          <form onSubmit={handleAdd} className="p-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            <label className="text-sm">
              <div className="mb-1 text-slate-600">Tanggal</div>
              <input
                type="date"
                className="w-full border rounded px-2 py-1"
                value={form.date}
                onChange={(e) => onChangeForm("date", e.target.value)}
              />
            </label>

            <label className="text-sm">
              <div className="mb-1 text-slate-600">Kode *</div>
              <input
                className="w-full border rounded px-2 py-1"
                value={form.code}
                onChange={(e) => onChangeForm("code", e.target.value)}
                required
              />
            </label>

            <label className="text-sm">
              <div className="mb-1 text-slate-600">Nama Sparepart *</div>
              <select
                className="w-full border rounded px-2 py-1"
                value={form.name}
                onChange={(e) => onChangeForm("name", e.target.value)}
                required
              >
                <option value="">— pilih nama —</option>
                {nameOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <div className="mb-1 text-slate-600">Kategori</div>
              <input
                className="w-full border rounded px-2 py-1"
                value={form.category}
                onChange={(e) => onChangeForm("category", e.target.value)}
              />
            </label>

            <label className="text-sm">
              <div className="mb-1 text-slate-600">Nama Toko *</div>
              <select
                className="w-full border rounded px-2 py-1"
                value={form.store}
                onChange={(e) => onChangeForm("store", e.target.value)}
                required
              >
                <option value="">— pilih toko —</option>
                {storeOptions.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              <div className="mb-1 text-slate-600">Satuan</div>
              <input
                className="w-full border rounded px-2 py-1"
                value={form.unit}
                onChange={(e) => onChangeForm("unit", e.target.value)}
              />
            </label>

            {/* Stock awal, masuk, keluar */}
            <label className="text-sm">
              <div className="mb-1 text-slate-600">Stock Awal</div>
              <input
                type="number"
                className="w-full border rounded px-2 py-1"
                value={form.opening}
                onChange={(e) => onChangeForm("opening", Number(e.target.value))}
              />
            </label>
            <label className="text-sm">
              <div className="mb-1 text-slate-600">Masuk</div>
              <input
                type="number"
                className="w-full border rounded px-2 py-1"
                value={form.in}
                onChange={(e) => onChangeForm("in", Number(e.target.value))}
              />
            </label>
            <label className="text-sm">
              <div className="mb-1 text-slate-600">Keluar</div>
              <input
                type="number"
                className="w-full border rounded px-2 py-1"
                value={form.out}
                onChange={(e) => onChangeForm("out", Number(e.target.value))}
              />
            </label>

            <label className="text-sm">
              <div className="mb-1 text-slate-600">Stok (jika kosong dihitung otomatis)</div>
              <input
                type="number"
                className="w-full border rounded px-2 py-1"
                value={form.stock}
                onChange={(e) => onChangeForm("stock", Number(e.target.value))}
              />
            </label>

            <label className="text-sm">
              <div className="mb-1 text-slate-600">Harga</div>
              <input
                type="number"
                className="w-full border rounded px-2 py-1"
                value={form.price}
                onChange={(e) => onChangeForm("price", Number(e.target.value))}
              />
            </label>

            <label className="text-sm md:col-span-3">
              <div className="mb-1 text-slate-600">Keterangan</div>
              <input
                className="w-full border rounded px-2 py-1"
                value={form.note}
                onChange={(e) => onChangeForm("note", e.target.value)}
              />
            </label>

            <div className="md:col-span-3 flex items-center justify-end gap-2">
              <button type="reset" className="px-3 py-1 rounded border"
                onClick={() => setForm({
                  code: "", name: "", category: "", store: "", unit: "",
                  date: "", opening: 0, in: 0, out: 0, stock: 0, price: 0, note: ""
                })}
              >
                Reset
              </button>
              <button type="submit" className="px-3 py-1 rounded bg-blue-600 text-white">
                Tambah
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Table */}
      <div className="overflow-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100">
            <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
              <th>#</th>
              <th>Tanggal</th>
              <th>Kode</th>
              <th>Nama</th>
              <th>Kategori</th>
              <th>Toko</th>
              <th>Sat.</th>
              <th>Stock Awal</th>
              <th>Masuk</th>
              <th>Keluar</th>
              <th>Stok</th>
              <th>Harga</th>
              <th>Keterangan</th>
              <th>Status</th>
              <th className="text-right">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r, i) => (
              <tr key={r.id} className="odd:bg-white even:bg-slate-50 [&>td]:px-3 [&>td]:py-2">
                <td>{(page - 1) * pageSize + i + 1}</td>
                <td>{r.date}</td>
                <td className="font-mono">{r.code}</td>
                <td className="max-w-[220px]">
                  <div className="truncate" title={r.name}>{r.name}</div>
                </td>
                <td>{r.category}</td>
                <td>{r.store}</td>
                <td>{r.unit}</td>
                <td>{r.opening}</td>
                <td>{r.in}</td>
                <td>{r.out}</td>
                <td className="font-medium">{r.stock}</td>
                <td>{formatCurrency(r.price)}</td>
                <td className="max-w-[240px]">
                  <div className="truncate" title={r.note}>{r.note}</div>
                </td>
                <td>
                  <span className={`text-white text-xs px-2 py-1 rounded ${
                    r.status === "Approved" ? "bg-emerald-600" :
                    r.status === "Rejected" ? "bg-rose-600" : "bg-amber-600"
                  }`}>
                    {r.status}
                  </span>
                </td>
                <td>
                  <div className="flex justify-end gap-2">
                    <button
                      className="px-2 py-1 rounded bg-emerald-600 text-white"
                      onClick={() => handleApprove(r.id)}
                      title="Approve"
                    >
                      <FaCheck />
                    </button>
                    <button
                      className="px-2 py-1 rounded bg-rose-600 text-white"
                      onClick={() => handleReject(r.id)}
                      title="Reject"
                    >
                      <FaTimes />
                    </button>
                    <button
                      className="px-2 py-1 rounded bg-amber-600 text-white"
                      onClick={() => handleReset(r.id)}
                      title="Reset ke Pending"
                    >
                      <FaRedo />
                    </button>
                    <button
                      className="px-2 py-1 rounded bg-blue-600 text-white"
                      onClick={() => openEdit(r)}
                      title="Edit"
                    >
                      <FaEdit />
                    </button>
                    <button
                      className="px-2 py-1 rounded bg-slate-800 text-white"
                      onClick={() => handleDelete(r.id)}
                      title="Delete"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={15} className="text-center text-slate-500 py-6">
                  Tidak ada data yang cocok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-3 flex items-center justify-between">
        <div className="text-xs text-slate-600">
          Total: {filtered.length} baris • Halaman {page} / {pageCount}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1 rounded border"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Prev
          </button>
          <span className="text-sm">{page}</span>
          <button
            className="px-3 py-1 rounded border"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          >
            Next
          </button>
        </div>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-end md:items-center md:justify-center z-50">
          <div className="bg-white w-full md:max-w-2xl rounded-t-2xl md:rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Edit Sparepart</h2>
              <button className="text-slate-500" onClick={closeEdit}>✕</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="text-sm">
                <div className="text-slate-600 mb-1">Tanggal</div>
                <input
                  type="date"
                  className="w-full border rounded px-2 py-1"
                  value={draft.date || ""}
                  onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                />
              </label>
              <label className="text-sm">
                <div className="text-slate-600 mb-1">Kode</div>
                <input
                  className="w-full border rounded px-2 py-1"
                  value={draft.code}
                  onChange={(e) => setDraft({ ...draft, code: e.target.value })}
                />
              </label>
              <label className="text-sm">
                <div className="text-slate-600 mb-1">Nama Sparepart</div>
                <select
                  className="w-full border rounded px-2 py-1"
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                >
                  <option value="">— pilih nama —</option>
                  {nameOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm">
                <div className="text-slate-600 mb-1">Kategori</div>
                <input
                  className="w-full border rounded px-2 py-1"
                  value={draft.category}
                  onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                />
              </label>
              <label className="text-sm">
                <div className="text-slate-600 mb-1">Nama Toko</div>
                <select
                  className="w-full border rounded px-2 py-1"
                  value={draft.store}
                  onChange={(e) => setDraft({ ...draft, store: e.target.value })}
                >
                  <option value="">— pilih toko —</option>
                  {storeOptions.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                <div className="text-slate-600 mb-1">Satuan</div>
                <input
                  className="w-full border rounded px-2 py-1"
                  value={draft.unit}
                  onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
                />
              </label>

              {/* Stock awal, masuk, keluar */}
              <label className="text-sm">
                <div className="text-slate-600 mb-1">Stock Awal</div>
                <input
                  type="number"
                  className="w-full border rounded px-2 py-1"
                  value={draft.opening}
                  onChange={(e) => setDraft({ ...draft, opening: Number(e.target.value) })}
                />
              </label>
              <label className="text-sm">
                <div className="text-slate-600 mb-1">Masuk</div>
                <input
                  type="number"
                  className="w-full border rounded px-2 py-1"
                  value={draft.in}
                  onChange={(e) => setDraft({ ...draft, in: Number(e.target.value) })}
                />
              </label>
              <label className="text-sm">
                <div className="text-slate-600 mb-1">Keluar</div>
                <input
                  type="number"
                  className="w-full border rounded px-2 py-1"
                  value={draft.out}
                  onChange={(e) => setDraft({ ...draft, out: Number(e.target.value) })}
                />
              </label>

              <label className="text-sm">
                <div className="text-slate-600 mb-1">Stok</div>
                <input
                  type="number"
                  className="w-full border rounded px-2 py-1"
                  value={draft.stock}
                  onChange={(e) => setDraft({ ...draft, stock: Number(e.target.value) })}
                />
              </label>
              <label className="text-sm">
                <div className="text-slate-600 mb-1">Harga</div>
                <input
                  type="number"
                  className="w-full border rounded px-2 py-1"
                  value={draft.price}
                  onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })}
                />
              </label>
              <label className="text-sm md:col-span-3">
                <div className="text-slate-600 mb-1">Keterangan</div>
                <input
                  className="w-full border rounded px-2 py-1"
                  value={draft.note}
                  onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                />
              </label>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="px-3 py-1 rounded border" onClick={closeEdit}>
                Batal
              </button>
              <button
                className="px-3 py-1 rounded bg-blue-600 text-white"
                onClick={saveEdit}
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
