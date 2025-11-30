// src/pages/Sperpart.jsx
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

import { db } from "../services/FirebaseInit";
import { onValue, push, ref, remove, set, update } from "firebase/database";

const LS_KEY = "sparepartRows_v2"; // localStorage modul sparepart

// MASTER LIST NAMA SPAREPART (dropdown)
const SPAREPART_NAMES = [
  "AS RODA - As Roda Depan Sepeda Listrik",
  "AS RODA - As Roda Motor Listrik",
  "BAN DALAM - RING 10 14-2.50",
  "BAN DALAM - RING 10 14-3.00",
  "BAN DALAM - RING 8",
  "BAN TUBELES - RING 16 16-2.125",
  "BAN TUBELES - RING 10 100/80",
  "BAN TUBELES - RING 10 14-2.50",
  "BAN TUBELES - RING 10 14-2.75",
  "BAN TUBELES - RING 10 14-3.00",
  "BAN TUBELES - RING 12 120/70",
  "BAN TUBELES - RING 12 16-2.15",
  "BAN TUBELES - RING 12 90/90",
  "BAN TUBELES - RING 8 14-3.00",
  "BATERAI LIFEPO 4 12V - Satuan",
  "BATERAI LIFEPO 4 60V - Satuan",
  "BATERAI LIFEPO 4 48V 12A - Satuan",
  "BATERAI LIFEPO 4 48V 20A - Satuan",
  "BATERAI LITHIUM PHYLYON - 48v 12a",
  "BATERAI LITHIUM PHYLYON - 48V 20A",
  "BATERAI LITHIUM PHYLYON - 60V 24A",
  "BATERAI LITHIUM PHYLYON - 72v 24a",
  "BATERAI SLA 12V 12A - Satuan 12V 12A",
  "BATERAI SLA 12V 20A - Satuan 12V 20A",
  "BEARING DUDUKAN - MAGICAL 3 LITHIUM",
  "BEARING DUDUKAN - STAREER 2 PRO",
  "BOX ADV",
  "CHARGER LITHIUM - 48V",
  "CHARGER LITHIUM - 60V",
  "CHARGER LITHIUM - 72V",
  "CHARGER SLA - 48V 12A",
  "CHARGER SLA - 48V 20A",
  "CHARGER SLA - 60V 20A",
  "CHARGER SLA - 72V 20A",
  "CHARGER SLA - LISGO 48V 12A",
  "CONTROLLER - 36/48",
  "CONTROLLER - 48/60",
  "CONTROLLER - 48V 800W",
  "CONTROLLER - 60V 1000W",
  "CONTROLLER - 72V 2000W",
  "CONTROLLER - MAGICAL 3 LIT",
  "COVER BODY UWINFLY - COVER BODY D60",
  "COVER BODY UWINFLY - COVER BODY T3S PRO",
  "DINAMO - 500 Watt",
  "DRUM BRAKE - Sepeda Listrik",
  "DUDUKAN LCD SELIS",
  "EMBLEM - Emblem Uwinfly T3S",
  "EMBLEM - Emblem Uwinfly T80",
  "FLASHER MOTOR KAKI 3",
  "FOOT STEP - Sepeda Listrik",
  "GEAR - Fullset Rantai",
  "GEAR - Gear Belakang",
  "GEAR - Gear Depan",
  "HAL SENSOR - Hall Sensor Kecil",
  "HAL SENSOR - Selis Molis",
  "HANDLE GRIP - Fullset Kanan",
  "HANDLE GRIP - Fullset Kiri",
  "HANDLE GRIP - Karet Grip Only",
  "HANDLE REM - Motor Listrik",
  "HANDLE REM - Sepeda Listrik",
  "HEADLAMP - Motor Listrik",
  "HEADLAMP - Sepeda Listrik",
  "KABEL BATTERAI - 1 SET",
  "KABEL BATTERAI - Kabel Batterai Panjang",
  "KABEL BATTERAI - Kabel Batterai Pendek",
  "KABEL BATTERAI - Kabel Batterai SLA Universal",
  "KABEL LITHIUM - 48V",
  "KABEL LITHIUM - 60V",
  "KABEL LITHIUM - 72V",
  "KABEL REM - Depan Molis",
  "KAMVAS REM - Tromol 8cm",
  "KARET TAMBAL BAN",
  "KLAKSON - Motor Listrik",
  "KLAKSON - Sepeda Listrik",
  "KOMSTIR - Motor Listrik",
  "KOMSTIR - Sepeda Listrik",
  "KUNCI KONTAK - Motor Listrik",
  "KUNCI KONTAK - Sepeda Listrik",
  "LAMPU SEIN - Sepeda Listrik",
  "LCD SPEEDOMETER - Motor Listrik",
  "LCD SPEEDOMETER - Sepeda Listrik",
  "MAIN KABEL - Motor Listrik",
  "MAIN KABEL - Sepeda Listrik",
  "MCB - Molis 30A",
  "MCB - Molis 40A",
  "MCB - Selis 30A",
  "PEDAL - Sepeda Listrik",
  "PENTIL TUBELES - Selis Molis",
  "PORT BATERAI",
  "PORT CHARGER - LITHIUM",
  "PORT CHARGER - UNIVERSAL",
  "REDUCER - Motor Listrik",
  "REDUCER - Sepeda Listrik",
  "REMOTE CONTROL - Motor Listrik",
  "REMOTE CONTROL - Sepeda Listrik",
  "RUMAH BAUT KERAMIK",
  "SAKLAR - SAKLAR UWINFLY GN",
  "SAMBUNGAN RANTAI SELIS",
  "SEKRING - Rumah Sekring",
  "SEKRING - Sekring Only",
  "SENSOR REM - Motor Listrik",
  "SENSOR REM - Sepeda Listrik",
  "SKUN AKI",
  "SOCKET INPUT MOLIS",
  "SPION - Cover List Spion",
  "SPION - Motor Listrik",
  "SPION - Sepeda Listrik",
  "STANDAR 1 - Motor Listrik",
  "STANDAR 1 - Sepeda Listrik",
  "STANDAR 2 - Motor Listrik",
  "STANDAR 2 - Sepeda Listrik",
  "STANG - Sepeda Listrik",
  "STOPLAMP - Stoplamp Ofero Stareer 2 Motor",
  "STOPLAMP - Stoplamp Uwinfly T80",
  "SUPNOVA - Selis Molis",
  "KABEL BOX BATTERAI STARREER 3 LITHIUM",
  "TORTOL GAS - MOLIS",
  "TORTOL GAS - SELIS",
  "TUAS PEDAL - Sepeda Listrik",
  "TUTUP PENTIL",
  "VELG DEPAN - Tromol 8cm",
  "VISOR - Sepeda Listrik",
  "SEGITA SELISMOLIS",
];

// =======================
// Helper function
// =======================
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
  if (v instanceof Date && !isNaN(v)) {
    const y = v.getFullYear();
    const m = pad2(v.getMonth() + 1);
    const d = pad2(v.getDate());
    return `${y}-${m}-${d}`;
  }
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

// Mapping dari Excel/JSON ke shape data
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
  const statusRaw = String(
    get("status", "approval", "verifikasi") || ""
  )
    .trim()
    .toLowerCase();
  let status = "Pending";
  if (["approve", "approved", "ok", "setuju", "valid"].includes(statusRaw))
    status = "Approved";
  if (["reject", "rejected", "tolak", "invalid"].includes(statusRaw))
    status = "Rejected";

  return {
    id: code || `XLS-${Math.random().toString(36).slice(2, 8)}`,
    code: code || "",
    name: name || "",
    category: category || "",
    store: store || "",
    unit: unit || "",
    note: note || "",
    date: date || "",
    opening,
    in: inQty,
    out: outQty,
    stock,
    price,
    status,
  };
}

function formatCurrency(n) {
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(Number(n || 0));
  } catch {
    return `Rp ${Number(n || 0).toLocaleString("id-ID")}`;
  }
}

const calcTotalBayar = (qty, hargaSupplier) =>
  Number(qty || 0) * Number(hargaSupplier || 0);

export default function Sperpart() {
  // ========= TAB / SUB MENU =========
  const [activeTab, setActiveTab] = useState("master"); // master | pembelian | ketersediaan

  // ========= MASTER DATA SPAREPART (lama) =========
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [showAdd, setShowAdd] = useState(true);
  const [form, setForm] = useState({
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

  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(null);

  const fileExcelRef = useRef(null);
  const fileJsonRef = useRef(null);

  // ========= MASTER PEMBELIAN SPAREPART (Firebase) =========
  const [purchaseRows, setPurchaseRows] = useState([]);
  const [purchaseForm, setPurchaseForm] = useState({
    tanggal: "",
    noInvoice: "",
    namaSupplier: "",
    namaBarang: "",
    qty: "",
    hargaSupplier: "",
    hargaJual: "",
    totalBayar: 0,
    toko: "CILANGKAP PUSAT",
    statusBayar: "PENDING", // PENDING / LUNAS
    statusRequest: "PENDING", // PENDING / APPROVED / VOID
    note: "",
  });
  const [purchaseEditing, setPurchaseEditing] = useState(null);
  const [purchaseDraft, setPurchaseDraft] = useState(null);

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
      try {
        const r = await tryFetch("/data/sparepart.json");
        const data = await r.json();
        const mapped = data.map(mapRow);
        setRows(mapped);
        localStorage.setItem(LS_KEY, JSON.stringify(mapped));
        return;
      } catch {}

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
      setRows([]);
    })();
  }, []);

  // Persist master sparepart ke localStorage
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(rows));
  }, [rows]);

  // ====== Realtime Firebase: MASTER PEMBELIAN SPAREPART ======
  useEffect(() => {
    const r = ref(db, "sparepartPurchases");
    const unsub = onValue(
      r,
      (snap) => {
        const raw = snap.val() || {};
        const list = Object.entries(raw).map(([id, v]) => ({
          id,
          ...v,
        }));
        list.sort(
          (a, b) => new Date(b.tanggal || 0) - new Date(a.tanggal || 0)
        );
        setPurchaseRows(list);
      },
      (err) => {
        console.error("listen sparepartPurchases error:", err);
        setPurchaseRows([]);
      }
    );
    return () => unsub && unsub();
  }, []);

  // ===== Options Dropdown Nama Sparepart =====
  const nameOptions = useMemo(() => {
    const s = new Set(SPAREPART_NAMES);
    rows
      .map((r) => String(r.name || "").trim())
      .filter(Boolean)
      .forEach((nm) => s.add(nm));
    return Array.from(s).sort((a, b) => a.localeCompare(b, "id"));
  }, [rows]);

  const storeOptions = useMemo(() => {
    const s = new Set(
      rows.map((r) => String(r.store || "").trim()).filter(Boolean)
    );
    // fallback jika kosong
    if (s.size === 0) {
      ["CILANGKAP PUSAT", "CIBINONG", "GAS ALAM", "CITEUREUP"].forEach((t) =>
        s.add(t)
      );
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b, "id"));
  }, [rows]);

  // ===== Derived master sparepart =====
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

  // ===== Actions master sparepart =====
  const handleApprove = (id) =>
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "Approved" } : r))
    );
  const handleReject = (id) =>
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "Rejected" } : r))
    );
  const handleReset = (id) =>
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: "Pending" } : r))
    );

  const handleDelete = (id) => {
    const r = rows.find((x) => x.id === id);
    if (!window.confirm(`Hapus item "${r?.name || id}"?`)) return;
    setRows((prev) => prev.filter((x) => x.id !== id));
  };

  const openEdit = (row) => {
    setEditing(row);
    setDraft({ ...row });
  };
  const closeEdit = () => {
    setEditing(null);
    setDraft(null);
  };
  const saveEdit = () => {
    setRows((prev) =>
      prev.map((r) => (r.id === editing.id ? { ...r, ...draft } : r))
    );
    closeEdit();
  };

  const onChangeForm = (k, v) =>
    setForm((f) => ({
      ...f,
      [k]: v,
    }));

  const handleAdd = (e) => {
    e.preventDefault();
    const required = ["code", "name", "store"];
    for (const k of required) {
      if (!String(form[k] || "").trim()) {
        alert(`Field "${k.toUpperCase()}" wajib diisi.`);
        return;
      }
    }
    let stock = num(form.stock);
    const opening = num(form.opening);
    const inQty = num(form.in);
    const outQty = num(form.out);
    if (!stock) stock = opening + inQty - outQty;

    const id = `SP-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 6)}`;
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
      if (!Array.isArray(data))
        throw new Error("Format JSON harus array of objects");
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
    const blob = new Blob([JSON.stringify(rows, null, 2)], {
      type: "application/json",
    });
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

  // ========= MASTER PEMBELIAN SPAREPART – HANDLER =========
  const handlePurchaseChange = (field, value) => {
    setPurchaseForm((prev) => {
      const next = {
        ...prev,
        [field]: value,
      };
      const qty =
        field === "qty" ? Number(value || 0) : Number(next.qty || 0);
      const hs =
        field === "hargaSupplier"
          ? Number(value || 0)
          : Number(next.hargaSupplier || 0);
      next.totalBayar = calcTotalBayar(qty, hs);
      return next;
    });
  };

  const resetPurchaseForm = () =>
    setPurchaseForm({
      tanggal: "",
      noInvoice: "",
      namaSupplier: "",
      namaBarang: "",
      qty: "",
      hargaSupplier: "",
      hargaJual: "",
      totalBayar: 0,
      toko: "CILANGKAP PUSAT",
      statusBayar: "PENDING",
      statusRequest: "PENDING",
      note: "",
    });

  const handleAddPurchase = async (e) => {
    e.preventDefault();
    if (!purchaseForm.tanggal || !purchaseForm.noInvoice) {
      alert("Tanggal & No Invoice wajib diisi.");
      return;
    }
    if (!purchaseForm.namaSupplier || !purchaseForm.namaBarang) {
      alert("Nama Supplier & Nama Barang wajib diisi.");
      return;
    }
    try {
      const r = push(ref(db, "sparepartPurchases"));
      const payload = {
        tanggal: purchaseForm.tanggal,
        noInvoice: purchaseForm.noInvoice,
        namaSupplier: purchaseForm.namaSupplier,
        namaBarang: purchaseForm.namaBarang,
        qty: Number(purchaseForm.qty || 0),
        hargaSupplier: Number(purchaseForm.hargaSupplier || 0),
        hargaJual: Number(purchaseForm.hargaJual || 0),
        totalBayar: calcTotalBayar(
          purchaseForm.qty,
          purchaseForm.hargaSupplier
        ),
        toko: purchaseForm.toko || "CILANGKAP PUSAT",
        statusBayar: purchaseForm.statusBayar || "PENDING",
        statusRequest: purchaseForm.statusRequest || "PENDING",
        note: purchaseForm.note || "",
        createdAt: new Date().toISOString(),
      };
      await set(r, payload);
      resetPurchaseForm();
      alert("Pembelian sparepart berhasil disimpan.");
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan pembelian sparepart: " + err.message);
    }
  };

  const openPurchaseEdit = (row) => {
    setPurchaseEditing(row);
    setPurchaseDraft({ ...row });
  };

  const closePurchaseEdit = () => {
    setPurchaseEditing(null);
    setPurchaseDraft(null);
  };

  const handlePurchaseDraftChange = (field, value) => {
    setPurchaseDraft((prev) => {
      const next = { ...prev, [field]: value };
      const qty =
        field === "qty" ? Number(value || 0) : Number(next.qty || 0);
      const hs =
        field === "hargaSupplier"
          ? Number(value || 0)
          : Number(next.hargaSupplier || 0);
      next.totalBayar = calcTotalBayar(qty, hs);
      return next;
    });
  };

  const savePurchaseEdit = async () => {
    if (!purchaseEditing) return;
    try {
      const payload = {
        ...purchaseDraft,
        qty: Number(purchaseDraft.qty || 0),
        hargaSupplier: Number(purchaseDraft.hargaSupplier || 0),
        hargaJual: Number(purchaseDraft.hargaJual || 0),
        totalBayar: calcTotalBayar(
          purchaseDraft.qty,
          purchaseDraft.hargaSupplier
        ),
      };
      delete payload.id;
      await update(
        ref(db, `sparepartPurchases/${purchaseEditing.id}`),
        payload
      );
      closePurchaseEdit();
      alert("Data pembelian berhasil diupdate.");
    } catch (err) {
      console.error(err);
      alert("Gagal update data pembelian: " + err.message);
    }
  };

  const deletePurchase = async (row) => {
    if (
      !window.confirm(
        `Hapus data pembelian ${row.namaBarang} / Invoice ${row.noInvoice}?`
      )
    )
      return;
    try {
      await remove(ref(db, `sparepartPurchases/${row.id}`));
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus data: " + err.message);
    }
  };

  const setStatusBayar = async (row, status) => {
    try {
      await update(ref(db, `sparepartPurchases/${row.id}`), {
        statusBayar: status,
      });
    } catch (err) {
      console.error(err);
      alert("Gagal update status bayar: " + err.message);
    }
  };

  const setStatusRequest = async (row, status) => {
    try {
      const updates = { statusRequest: status };
      if (status === "VOID") {
        updates.note = "PENGEMBALIAN STOCK SUKSES";
      }
      await update(ref(db, `sparepartPurchases/${row.id}`), updates);
    } catch (err) {
      console.error(err);
      alert("Gagal update status request: " + err.message);
    }
  };

  const pusatRows = useMemo(
    () =>
      purchaseRows.filter((r) =>
        String(r.toko || "")
          .toUpperCase()
          .includes("CILANGKAP PUSAT")
      ),
    [purchaseRows]
  );

  const badgeStatusBayar = (s) =>
    s === "LUNAS"
      ? "bg-emerald-600"
      : "bg-amber-500"; // PENDING / lainnya

  const badgeStatusRequest = (s) =>
    s === "APPROVED"
      ? "bg-emerald-600"
      : s === "VOID"
      ? "bg-rose-600"
      : "bg-amber-500";

  // ========= RENDER =========
  return (
    <div className="max-w-[1200px] mx-auto py-4">
      {/* Header cantik */}
      <div className="mb-4 rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 text-white p-4 shadow-lg">
        <h1 className="text-xl md:text-2xl font-bold">
          MASTER DATA SPAREPART
        </h1>
        <p className="text-xs md:text-sm opacity-90 mt-1">
          Kelola master sparepart, pembelian, dan ketersediaan stok secara
          realtime & terintegrasi.
        </p>
      </div>

      {/* Tabs / Sub Menu */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTab("master")}
          className={`px-4 py-2 rounded-full text-sm font-semibold shadow transition ${
            activeTab === "master"
              ? "bg-sky-600 text-white"
              : "bg-white text-sky-700 border border-sky-200 hover:bg-sky-50"
          }`}
        >
          MASTER DATA SPAREPART
        </button>
        <button
          onClick={() => setActiveTab("pembelian")}
          className={`px-4 py-2 rounded-full text-sm font-semibold shadow transition ${
            activeTab === "pembelian"
              ? "bg-emerald-600 text-white"
              : "bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50"
          }`}
        >
          MASTER PEMBELIAN SPAREPART
        </button>
        <button
          onClick={() => setActiveTab("ketersediaan")}
          className={`px-4 py-2 rounded-full text-sm font-semibold shadow transition ${
            activeTab === "ketersediaan"
              ? "bg-amber-600 text-white"
              : "bg-white text-amber-700 border border-amber-200 hover:bg-amber-50"
          }`}
        >
          KETERSEDIAAN STOCK SPAREPART CILANGKAP PUSAT
        </button>
      </div>

      {/* ============= TAB 1: MASTER DATA SPAREPART ============= */}
      {activeTab === "master" && (
        <div className="space-y-4">
          {/* Header tools */}
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-lg font-semibold text-slate-800">
              Modul Sparepart
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center border rounded px-2 bg-white shadow-sm">
                <FaSearch className="opacity-70" />
                <input
                  placeholder="Cari kode / nama / kategori / toko…"
                  className="px-2 py-1 outline-none bg-transparent text-sm"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <select
                className="border rounded px-2 py-1 text-sm bg-white shadow-sm"
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
                className="border rounded px-2 py-1 text-sm bg-white shadow-sm"
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
                className="inline-flex items-center gap-2 px-3 py-1 rounded bg-slate-800 text-white text-sm shadow"
                onClick={() => {
                  localStorage.removeItem(LS_KEY);
                  window.location.reload();
                }}
                title="Muat ulang dari file sumber (JSON/Excel)"
              >
                <FaRedo />
                Reload
              </button>

              <label className="inline-flex items-center gap-2 px-3 py-1 rounded bg-blue-600 text-white text-sm cursor-pointer shadow">
                <FaFileUpload />
                Excel
                <input
                  ref={fileExcelRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => onImportExcel(e.target.files?.[0])}
                />
              </label>

              <label className="inline-flex items-center gap-2 px-3 py-1 rounded bg-blue-500 text-white text-sm cursor-pointer shadow">
                <FaFileUpload />
                JSON
                <input
                  ref={fileJsonRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => onImportJson(e.target.files?.[0])}
                />
              </label>

              <button
                className="inline-flex items-center gap-2 px-3 py-1 rounded bg-emerald-700 text-white text-sm shadow"
                onClick={exportJSON}
                title="Export JSON"
              >
                <FaDownload />
                JSON
              </button>
              <button
                className="inline-flex items-center gap-2 px-3 py-1 rounded bg-emerald-700 text-white text-sm shadow"
                onClick={exportExcel}
                title="Export Excel"
              >
                <FaDownload />
                Excel
              </button>
            </div>
          </div>

          {/* Add form */}
          <div className="mb-3 border rounded-xl overflow-hidden bg-white shadow-sm">
            <button
              className="w-full flex items-center justify-between px-3 py-2 bg-slate-50"
              onClick={() => setShowAdd((s) => !s)}
            >
              <span className="inline-flex items-center gap-2 font-medium text-slate-700">
                <FaPlus /> Tambah Data Sparepart
              </span>
              <FaChevronDown
                className={`transition ${showAdd ? "rotate-180" : ""}`}
              />
            </button>

            {showAdd && (
              <form
                onSubmit={handleAdd}
                className="p-3 grid grid-cols-1 md:grid-cols-3 gap-3"
              >
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
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm">
                  <div className="mb-1 text-slate-600">Kategori</div>
                  <input
                    className="w-full border rounded px-2 py-1"
                    value={form.category}
                    onChange={(e) =>
                      onChangeForm("category", e.target.value)
                    }
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
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
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

                <label className="text-sm">
                  <div className="mb-1 text-slate-600">Stock Awal</div>
                  <input
                    type="number"
                    className="w-full border rounded px-2 py-1"
                    value={form.opening}
                    onChange={(e) =>
                      onChangeForm("opening", Number(e.target.value))
                    }
                  />
                </label>
                <label className="text-sm">
                  <div className="mb-1 text-slate-600">Masuk</div>
                  <input
                    type="number"
                    className="w-full border rounded px-2 py-1"
                    value={form.in}
                    onChange={(e) =>
                      onChangeForm("in", Number(e.target.value))
                    }
                  />
                </label>
                <label className="text-sm">
                  <div className="mb-1 text-slate-600">Keluar</div>
                  <input
                    type="number"
                    className="w-full border rounded px-2 py-1"
                    value={form.out}
                    onChange={(e) =>
                      onChangeForm("out", Number(e.target.value))
                    }
                  />
                </label>

                <label className="text-sm">
                  <div className="mb-1 text-slate-600">
                    Stok (jika kosong dihitung otomatis)
                  </div>
                  <input
                    type="number"
                    className="w-full border rounded px-2 py-1"
                    value={form.stock}
                    onChange={(e) =>
                      onChangeForm("stock", Number(e.target.value))
                    }
                  />
                </label>

                <label className="text-sm">
                  <div className="mb-1 text-slate-600">Harga</div>
                  <input
                    type="number"
                    className="w-full border rounded px-2 py-1"
                    value={form.price}
                    onChange={(e) =>
                      onChangeForm("price", Number(e.target.value))
                    }
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
                  <button
                    type="reset"
                    className="px-3 py-1 rounded border text-sm"
                    onClick={() =>
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
                      })
                    }
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 rounded bg-blue-600 text-white text-sm"
                  >
                    Tambah
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Table master */}
          <div className="overflow-auto border rounded-xl bg-white shadow-sm">
            <table className="min-w-full text-xs md:text-sm">
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
                  <tr
                    key={r.id}
                    className="odd:bg-white even:bg-slate-50 [&>td]:px-3 [&>td]:py-2"
                  >
                    <td>{(page - 1) * pageSize + i + 1}</td>
                    <td>{r.date}</td>
                    <td className="font-mono">{r.code}</td>
                    <td className="max-w-[220px]">
                      <div className="truncate" title={r.name}>
                        {r.name}
                      </div>
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
                      <div className="truncate" title={r.note}>
                        {r.note}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`text-white text-[10px] px-2 py-1 rounded ${
                          r.status === "Approved"
                            ? "bg-emerald-600"
                            : r.status === "Rejected"
                            ? "bg-rose-600"
                            : "bg-amber-600"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1 md:gap-2">
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
                    <td
                      colSpan={15}
                      className="text-center text-slate-500 py-6"
                    >
                      Tidak ada data yang cocok.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2 text-xs">
            <div className="text-slate-600">
              Total: {filtered.length} baris • Halaman {page} / {pageCount}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-3 py-1 rounded border bg-white"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </button>
              <span className="text-sm">{page}</span>
              <button
                className="px-3 py-1 rounded border bg-white"
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
                  <button
                    className="text-slate-500"
                    onClick={closeEdit}
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="text-sm">
                    <div className="text-slate-600 mb-1">Tanggal</div>
                    <input
                      type="date"
                      className="w-full border rounded px-2 py-1"
                      value={draft.date || ""}
                      onChange={(e) =>
                        setDraft({ ...draft, date: e.target.value })
                      }
                    />
                  </label>
                  <label className="text-sm">
                    <div className="text-slate-600 mb-1">Kode</div>
                    <input
                      className="w-full border rounded px-2 py-1"
                      value={draft.code}
                      onChange={(e) =>
                        setDraft({ ...draft, code: e.target.value })
                      }
                    />
                  </label>
                  <label className="text-sm">
                    <div className="text-slate-600 mb-1">Nama Sparepart</div>
                    <select
                      className="w-full border rounded px-2 py-1"
                      value={draft.name}
                      onChange={(e) =>
                        setDraft({ ...draft, name: e.target.value })
                      }
                    >
                      <option value="">— pilih nama —</option>
                      {nameOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm">
                    <div className="text-slate-600 mb-1">Kategori</div>
                    <input
                      className="w-full border rounded px-2 py-1"
                      value={draft.category}
                      onChange={(e) =>
                        setDraft({ ...draft, category: e.target.value })
                      }
                    />
                  </label>
                  <label className="text-sm">
                    <div className="text-slate-600 mb-1">Nama Toko</div>
                    <select
                      className="w-full border rounded px-2 py-1"
                      value={draft.store}
                      onChange={(e) =>
                        setDraft({ ...draft, store: e.target.value })
                      }
                    >
                      <option value="">— pilih toko —</option>
                      {storeOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-sm">
                    <div className="text-slate-600 mb-1">Satuan</div>
                    <input
                      className="w-full border rounded px-2 py-1"
                      value={draft.unit}
                      onChange={(e) =>
                        setDraft({ ...draft, unit: e.target.value })
                      }
                    />
                  </label>

                  <label className="text-sm">
                    <div className="text-slate-600 mb-1">Stock Awal</div>
                    <input
                      type="number"
                      className="w-full border rounded px-2 py-1"
                      value={draft.opening}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          opening: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="text-sm">
                    <div className="text-slate-600 mb-1">Masuk</div>
                    <input
                      type="number"
                      className="w-full border rounded px-2 py-1"
                      value={draft.in}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          in: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="text-sm">
                    <div className="text-slate-600 mb-1">Keluar</div>
                    <input
                      type="number"
                      className="w-full border rounded px-2 py-1"
                      value={draft.out}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          out: Number(e.target.value),
                        })
                      }
                    />
                  </label>

                  <label className="text-sm">
                    <div className="text-slate-600 mb-1">Stok</div>
                    <input
                      type="number"
                      className="w-full border rounded px-2 py-1"
                      value={draft.stock}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          stock: Number(e.target.value),
                        })
                      }
                    />
                  </label>

                  <label className="text-sm">
                    <div className="text-slate-600 mb-1">Harga</div>
                    <input
                      type="number"
                      className="w-full border rounded px-2 py-1"
                      value={draft.price}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          price: Number(e.target.value),
                        })
                      }
                    />
                  </label>

                  <label className="text-sm md:col-span-3">
                    <div className="text-slate-600 mb-1">Keterangan</div>
                    <input
                      className="w-full border rounded px-2 py-1"
                      value={draft.note}
                      onChange={(e) =>
                        setDraft({ ...draft, note: e.target.value })
                      }
                    />
                  </label>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    className="px-3 py-1 rounded border text-sm"
                    onClick={closeEdit}
                    type="button"
                  >
                    Batal
                  </button>
                  <button
                    className="px-3 py-1 rounded bg-blue-600 text-white text-sm"
                    onClick={saveEdit}
                    type="button"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============= TAB 2: MASTER PEMBELIAN SPAREPART ============= */}
      {activeTab === "pembelian" && (
        <div className="space-y-4">
          {/* Tombol / form pembelian */}
          <div className="border rounded-2xl bg-white shadow-sm p-3">
            <h2 className="font-semibold text-slate-800 mb-2 text-sm md:text-base">
              Input Pembelian Stock Sparepart
            </h2>
            <form
              onSubmit={handleAddPurchase}
              className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs md:text-sm"
            >
              <label className="flex flex-col gap-1">
                <span>Tanggal</span>
                <input
                  type="date"
                  className="border rounded px-2 py-1"
                  value={purchaseForm.tanggal}
                  onChange={(e) =>
                    handlePurchaseChange("tanggal", e.target.value)
                  }
                  required
                />
              </label>
              <label className="flex flex-col gap-1">
                <span>No Invoice</span>
                <input
                  className="border rounded px-2 py-1"
                  value={purchaseForm.noInvoice}
                  onChange={(e) =>
                    handlePurchaseChange("noInvoice", e.target.value)
                  }
                  required
                />
              </label>
              <label className="flex flex-col gap-1">
                <span>Nama Supplier</span>
                <input
                  className="border rounded px-2 py-1"
                  value={purchaseForm.namaSupplier}
                  onChange={(e) =>
                    handlePurchaseChange("namaSupplier", e.target.value)
                  }
                  required
                />
              </label>
              <label className="flex flex-col gap-1">
                <span>Nama Toko</span>
                <input
                  className="border rounded px-2 py-1"
                  value={purchaseForm.toko}
                  onChange={(e) =>
                    handlePurchaseChange("toko", e.target.value)
                  }
                />
              </label>

              <label className="flex flex-col gap-1">
                <span>Nama Barang</span>
                <select
                  className="border rounded px-2 py-1"
                  value={purchaseForm.namaBarang}
                  onChange={(e) =>
                    handlePurchaseChange("namaBarang", e.target.value)
                  }
                  required
                >
                  <option value="">— pilih nama —</option>
                  {nameOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span>QTY</span>
                <input
                  type="number"
                  className="border rounded px-2 py-1"
                  value={purchaseForm.qty}
                  onChange={(e) =>
                    handlePurchaseChange("qty", e.target.value)
                  }
                  required
                />
              </label>

              <label className="flex flex-col gap-1">
                <span>Harga Supplier</span>
                <input
                  type="number"
                  className="border rounded px-2 py-1"
                  value={purchaseForm.hargaSupplier}
                  onChange={(e) =>
                    handlePurchaseChange("hargaSupplier", e.target.value)
                  }
                  required
                />
              </label>

              <label className="flex flex-col gap-1">
                <span>Harga Jual</span>
                <input
                  type="number"
                  className="border rounded px-2 py-1"
                  value={purchaseForm.hargaJual}
                  onChange={(e) =>
                    handlePurchaseChange("hargaJual", e.target.value)
                  }
                />
              </label>

              <label className="flex flex-col gap-1">
                <span>Total Bayar</span>
                <input
                  className="border rounded px-2 py-1 bg-slate-50"
                  value={formatCurrency(purchaseForm.totalBayar)}
                  readOnly
                />
              </label>

              <label className="flex flex-col gap-1">
                <span>Status Bayar</span>
                <select
                  className="border rounded px-2 py-1"
                  value={purchaseForm.statusBayar}
                  onChange={(e) =>
                    handlePurchaseChange("statusBayar", e.target.value)
                  }
                >
                  <option value="PENDING">PENDING</option>
                  <option value="LUNAS">LUNAS</option>
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span>Keterangan</span>
                <input
                  className="border rounded px-2 py-1"
                  value={purchaseForm.note}
                  onChange={(e) =>
                    handlePurchaseChange("note", e.target.value)
                  }
                />
              </label>

              <div className="md:col-span-4 flex justify-end gap-2 mt-1">
                <button
                  type="button"
                  onClick={resetPurchaseForm}
                  className="px-3 py-1 rounded border text-xs md:text-sm"
                >
                  Reset
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 rounded bg-emerald-600 text-white text-xs md:text-sm"
                >
                  Tambah Data
                </button>
              </div>
            </form>
          </div>

          {/* Tabel Pembelian */}
          <div className="border rounded-2xl bg-white shadow-sm overflow-auto">
            <table className="min-w-full text-xs md:text-sm">
              <thead className="bg-slate-100">
                <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
                  <th>Tanggal</th>
                  <th>No Invoice</th>
                  <th>Supplier</th>
                  <th>Nama Barang</th>
                  <th>Toko</th>
                  <th>Qty</th>
                  <th>Harga Supplier</th>
                  <th>Harga Jual</th>
                  <th>Total Bayar</th>
                  <th>Status Bayar</th>
                  <th>Status Request</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {purchaseRows.map((r) => (
                  <tr
                    key={r.id}
                    className="odd:bg-white even:bg-slate-50 [&>td]:px-3 [&>td]:py-2"
                  >
                    <td>{r.tanggal}</td>
                    <td>{r.noInvoice}</td>
                    <td>{r.namaSupplier}</td>
                    <td>{r.namaBarang}</td>
                    <td>{r.toko}</td>
                    <td>{r.qty}</td>
                    <td>{formatCurrency(r.hargaSupplier)}</td>
                    <td>{formatCurrency(r.hargaJual)}</td>
                    <td>{formatCurrency(r.totalBayar)}</td>
                    <td>
                      <span
                        className={`text-[10px] text-white px-2 py-1 rounded ${badgeStatusBayar(
                          r.statusBayar
                        )}`}
                      >
                        {r.statusBayar || "PENDING"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`text-[10px] text-white px-2 py-1 rounded ${badgeStatusRequest(
                          r.statusRequest
                        )}`}
                      >
                        {r.statusRequest || "PENDING"}
                      </span>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <button
                          className="px-2 py-1 rounded bg-emerald-600 text-white text-[10px]"
                          onClick={() => setStatusBayar(r, "LUNAS")}
                          title="Set LUNAS"
                        >
                          LUNAS
                        </button>
                        <button
                          className="px-2 py-1 rounded bg-amber-600 text-white text-[10px]"
                          onClick={() => setStatusRequest(r, "APPROVED")}
                          title="Approved Pending"
                        >
                          APPROVED
                        </button>
                        <button
                          className="px-2 py-1 rounded bg-rose-600 text-white text-[10px]"
                          onClick={() => setStatusRequest(r, "VOID")}
                          title="Approved VOID"
                        >
                          VOID
                        </button>
                        <button
                          className="px-2 py-1 rounded bg-blue-600 text-white text-[10px]"
                          onClick={() => openPurchaseEdit(r)}
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="px-2 py-1 rounded bg-slate-800 text-white text-[10px]"
                          onClick={() => deletePurchase(r)}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {purchaseRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={12}
                      className="text-center text-slate-500 py-6"
                    >
                      Belum ada data pembelian sparepart.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Modal Edit Pembelian */}
          {purchaseEditing && purchaseDraft && (
            <div className="fixed inset-0 bg-black/40 flex items-end md:items-center md:justify-center z-50">
              <div className="bg-white w-full md:max-w-3xl rounded-t-2xl md:rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold">Edit Pembelian Sparepart</h2>
                  <button
                    className="text-slate-500"
                    onClick={closePurchaseEdit}
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs md:text-sm">
                  <label className="flex flex-col gap-1">
                    <span>Tanggal</span>
                    <input
                      type="date"
                      className="border rounded px-2 py-1"
                      value={purchaseDraft.tanggal || ""}
                      onChange={(e) =>
                        handlePurchaseDraftChange("tanggal", e.target.value)
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span>No Invoice</span>
                    <input
                      className="border rounded px-2 py-1"
                      value={purchaseDraft.noInvoice || ""}
                      onChange={(e) =>
                        handlePurchaseDraftChange("noInvoice", e.target.value)
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span>Nama Supplier</span>
                    <input
                      className="border rounded px-2 py-1"
                      value={purchaseDraft.namaSupplier || ""}
                      onChange={(e) =>
                        handlePurchaseDraftChange(
                          "namaSupplier",
                          e.target.value
                        )
                      }
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span>Nama Toko</span>
                    <input
                      className="border rounded px-2 py-1"
                      value={purchaseDraft.toko || ""}
                      onChange={(e) =>
                        handlePurchaseDraftChange("toko", e.target.value)
                      }
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span>Nama Barang</span>
                    <select
                      className="border rounded px-2 py-1"
                      value={purchaseDraft.namaBarang || ""}
                      onChange={(e) =>
                        handlePurchaseDraftChange("namaBarang", e.target.value)
                      }
                    >
                      <option value="">— pilih nama —</option>
                      {nameOptions.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span>QTY</span>
                    <input
                      type="number"
                      className="border rounded px-2 py-1"
                      value={purchaseDraft.qty || ""}
                      onChange={(e) =>
                        handlePurchaseDraftChange("qty", e.target.value)
                      }
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span>Harga Supplier</span>
                    <input
                      type="number"
                      className="border rounded px-2 py-1"
                      value={purchaseDraft.hargaSupplier || ""}
                      onChange={(e) =>
                        handlePurchaseDraftChange(
                          "hargaSupplier",
                          e.target.value
                        )
                      }
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span>Harga Jual</span>
                    <input
                      type="number"
                      className="border rounded px-2 py-1"
                      value={purchaseDraft.hargaJual || ""}
                      onChange={(e) =>
                        handlePurchaseDraftChange("hargaJual", e.target.value)
                      }
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span>Total Bayar</span>
                    <input
                      className="border rounded px-2 py-1 bg-slate-50"
                      value={formatCurrency(purchaseDraft.totalBayar || 0)}
                      readOnly
                    />
                  </label>

                  <label className="flex flex-col gap-1">
                    <span>Status Bayar</span>
                    <select
                      className="border rounded px-2 py-1"
                      value={purchaseDraft.statusBayar || "PENDING"}
                      onChange={(e) =>
                        handlePurchaseDraftChange(
                          "statusBayar",
                          e.target.value
                        )
                      }
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="LUNAS">LUNAS</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-1">
                    <span>Status Request</span>
                    <select
                      className="border rounded px-2 py-1"
                      value={purchaseDraft.statusRequest || "PENDING"}
                      onChange={(e) =>
                        handlePurchaseDraftChange(
                          "statusRequest",
                          e.target.value
                        )
                      }
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="APPROVED">APPROVED</option>
                      <option value="VOID">VOID</option>
                    </select>
                  </label>

                  <label className="flex flex-col gap-1 md:col-span-2">
                    <span>Keterangan</span>
                    <input
                      className="border rounded px-2 py-1"
                      value={purchaseDraft.note || ""}
                      onChange={(e) =>
                        handlePurchaseDraftChange("note", e.target.value)
                      }
                    />
                  </label>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    className="px-3 py-1 rounded border text-xs md:text-sm"
                    type="button"
                    onClick={closePurchaseEdit}
                  >
                    Batal
                  </button>
                  <button
                    className="px-3 py-1 rounded bg-emerald-600 text-white text-xs md:text-sm"
                    type="button"
                    onClick={savePurchaseEdit}
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============= TAB 3: KETERSEDIAAN STOCK SPAREPART CILANGKAP PUSAT ============= */}
      {activeTab === "ketersediaan" && (
        <div className="space-y-3">
          <div className="border rounded-2xl bg-white shadow-sm p-3">
            <h2 className="font-semibold text-slate-800 text-sm md:text-base mb-1">
              Tabel Ketersediaan Stock Sparepart — CILANGKAP PUSAT
            </h2>
            <p className="text-xs text-slate-600">
              Data diambil dari MASTER PEMBELIAN SPAREPART (Firebase). Gunakan
              tombol{" "}
              <span className="font-semibold text-amber-600">
                APPROVED PENDING
              </span>{" "}
              &{" "}
              <span className="font-semibold text-rose-600">
                APPROVED VOID
              </span>{" "}
              untuk workflow request, dan tombol{" "}
              <span className="font-semibold text-emerald-600">LUNAS</span>{" "}
              untuk menandai pembayaran.
            </p>
          </div>

          <div className="border rounded-2xl bg-white shadow-sm overflow-auto">
            <table className="min-w-full text-xs md:text-sm">
              <thead className="bg-slate-100">
                <tr className="[&>th]:px-3 [&>th]:py-2 text-left">
                  <th>Tanggal</th>
                  <th>No Invoice</th>
                  <th>Nama Barang</th>
                  <th>Qty</th>
                  <th>Harga Supplier</th>
                  <th>Total Bayar</th>
                  <th>Status Bayar</th>
                  <th>Status Request</th>
                  <th>Keterangan</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pusatRows.map((r) => (
                  <tr
                    key={r.id}
                    className="odd:bg-white even:bg-slate-50 [&>td]:px-3 [&>td]:py-2"
                  >
                    <td>{r.tanggal}</td>
                    <td>{r.noInvoice}</td>
                    <td>{r.namaBarang}</td>
                    <td>{r.qty}</td>
                    <td>{formatCurrency(r.hargaSupplier)}</td>
                    <td>{formatCurrency(r.totalBayar)}</td>
                    <td>
                      <span
                        className={`text-[10px] text-white px-2 py-1 rounded ${badgeStatusBayar(
                          r.statusBayar
                        )}`}
                      >
                        {r.statusBayar || "PENDING"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`text-[10px] text-white px-2 py-1 rounded ${badgeStatusRequest(
                          r.statusRequest
                        )}`}
                      >
                        {r.statusRequest || "PENDING"}
                      </span>
                    </td>
                    <td>
                      {r.statusBayar === "LUNAS" && (
                        <span className="text-[10px] px-2 py-1 rounded bg-emerald-600 text-white inline-block mb-1">
                          LUNAS
                        </span>
                      )}
                      {r.statusRequest === "VOID" && (
                        <span className="text-[10px] px-2 py-1 rounded bg-emerald-600 text-white inline-block">
                          {r.note || "PENGEMBALIAN STOCK SUKSES"}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1">
                        <button
                          className="px-2 py-1 rounded bg-emerald-600 text-white text-[10px]"
                          onClick={() => setStatusBayar(r, "LUNAS")}
                        >
                          LUNAS
                        </button>
                        <button
                          className="px-2 py-1 rounded bg-amber-500 text-white text-[10px]"
                          onClick={() => setStatusRequest(r, "APPROVED")}
                        >
                          APPROVED PENDING
                        </button>
                        <button
                          className="px-2 py-1 rounded bg-rose-600 text-white text-[10px]"
                          onClick={() => setStatusRequest(r, "VOID")}
                        >
                          APPROVED VOID
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {pusatRows.length === 0 && (
                  <tr>
                    <td
                      colSpan={10}
                      className="text-center text-slate-500 py-6"
                    >
                      Belum ada data pembelian sparepart untuk CILANGKAP PUSAT.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
