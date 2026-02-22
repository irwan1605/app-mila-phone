// ================================
// FinanceReport.jsx — FINAL
// Realtime Firebase + TIPE: SETORAN
// ================================

import React, { useEffect, useMemo, useRef, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../../firebase/FirebaseInit";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useLocation } from "react-router-dom";

// ===== Firebase Services =====
import {
  listenAllTransaksi,
  addTransaksi,
  updateTransaksi,
  deleteTransaksi,
  listenPaymentJenis,
  listenMasterPaymentMetode,
} from "../../services/FirebaseService";

// ===== Konfigurasi Toko =====
const fallbackTokoNames = [
  "CILANGKAP PUSAT",
  "CIBINONG",
  "GAS ALAM",
  "CITEUREUP",
  "CIRACAS",
  "METLAND 1",
  "METLAND 2",
  "PITARA",
  "KOTA WISATA",
  "SAWANGAN",
];

const ALL_TOKO = fallbackTokoNames;

// ===== Utils =====
const toNum = (v) => (isNaN(Number(v)) ? 0 : Number(v));
const safeStr = (v) => (v == null ? "" : String(v));
const pad2 = (n) => String(n).padStart(2, "0");

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const formatCurrency = (n) => {
  try {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
    }).format(toNum(n));
  } catch {
    return `Rp ${toNum(n).toLocaleString("id-ID")}`;
  }
};

// ===============================
// Generate No Pre Order
// ===============================
const generateNoPreOrder = (tokoName, existingSetoran = []) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const yyyymm = `${year}${month}`;

  const kodeToko =
    tokoName?.split(" ")[0]?.substring(0, 3).toUpperCase() || "TKS";

  // filter hanya bulan ini
  const bulanIni = existingSetoran.filter((s) =>
    (s.NO_PRE_ORDER || "").includes(yyyymm)
  );

  const urut = String(bulanIni.length + 1).padStart(4, "0");

  return `PO/${kodeToko}/${yyyymm}/${urut}`;
};

// ===============================
// Normalizer Record Firebase
// ===============================
function normalizeRecord(r) {
  return {
    id: r.id || r._id || r.key || r.ID || String(Date.now()) + Math.random(),

    TIPE: String(r.TIPE || "").toUpperCase(),

    TANGGAL_TRANSAKSI: r.TANGGAL_TRANSAKSI || todayStr(),
    NAMA_TOKO: r.NAMA_TOKO || "CILANGKAP PUSAT",

    // ===== TAHAP 1 =====
    NAMA_PELANGGAN: r.NAMA_PELANGGAN || "",
    ID_PELANGGAN: r.ID_PELANGGAN || "",
    NO_TLP: r.NO_TLP || "",
    STORE_HEAD: r.STORE_HEAD || "",
    NAMA_SALES: r.NAMA_SALES || "",
    SALES_HANDLE: r.SALES_HANDLE || "",

    // ===== TAHAP 2 =====
    DETAIL_BARANG: Array.isArray(r.DETAIL_BARANG) ? r.DETAIL_BARANG : [],
    GRAND_TOTAL_BARANG: toNum(r.GRAND_TOTAL_BARANG || 0),

    // ===== TAHAP 3 =====
    PAYMENT_STATUS: r.PAYMENT_STATUS || "",
    PAYMENT_METHOD: r.PAYMENT_METHOD || "",
    MDR: toNum(r.MDR || 0),
    DP_TALANGAN: toNum(r.DP_TALANGAN || 0),
    TENOR: r.TENOR || "",
    KETERANGAN_PAYMENT: r.KETERANGAN_PAYMENT || "",

    // ===== SETORAN =====
    KATEGORI_PEMBAYARAN: r.KATEGORI_PEMBAYARAN || "",
    JUMLAH_SETORAN: toNum(r.JUMLAH_SETORAN || r.TOTAL || 0),
    REF_SETORAN: r.REF_SETORAN || "",
    DIBUAT_OLEH: r.DIBUAT_OLEH || "",
    STATUS: r.STATUS || "Pending",

    TOTAL: toNum(r.TOTAL || r.JUMLAH_SETORAN || 0),
  };
}

// =====================================================
//                  MAIN COMPONENT
// =====================================================
export default function FinanceReport() {
  // Semua transaksi pusat (setoran + penjualan)
  const [allData, setAllData] = useState([]);
  const [setoran, setSetoran] = useState([]);
  const [pengeluaran, setPengeluaran] = useState([]);
  const [masterPayment, setMasterPayment] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentJenisList, setPaymentJenisList] = useState([]);
  const [masterPaymentMetode, setMasterPaymentMetode] = useState([]);
  const location = useLocation();
  const onlyMyToko = location.state?.onlyMyToko || false;
  const tokoIdFromState = location.state?.tokoId || null;
  const tokoNameFromState = location.state?.tokoName || null;

  const loggedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const role = String(loggedUser?.role || "").toLowerCase();

  const isSPV = role.startsWith("spv_toko");
  const isSuper = role === "superadmin" || role === "admin" || isSPV;

  const [masterBarang, setMasterBarang] = useState([]);

  useEffect(() => {
    const unsub = onValue(ref(db, "master_barang"), (snap) => {
      const arr = [];
      snap.forEach((c) => {
        const v = c.val();
        if (!v) return;

        arr.push({
          kategori: v.kategori || "",
          brand: v.brand || "",
          nama: v.nama || "",
        });
      });

      setMasterBarang(arr);
    });

    return () => unsub();
  }, []);



  useEffect(() => {
    const unsub = listenAllTransaksi((items) => {
      const metode = new Set();

      (items || []).forEach((r) => {
        if (r.KATEGORI_PEMBAYARAN) {
          metode.add(r.KATEGORI_PEMBAYARAN);
        }
      });

      setMasterPayment(Array.from(metode));
    });

    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    const unsub = onValue(ref(db, "master_payment_metode"), (snap) => {
      const arr = [];

      snap.forEach((c) => {
        const v = c.val();
        if (!v) return;

        arr.push(v.nama || v.NAMA || "");
      });

      setPaymentMethods(arr);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onValue(ref(db, "master_bank"), (snap) => {
      const arr = [];

      snap.forEach((child) => {
        const val = child.val();

        console.log("MASTER BANK:", val); // DEBUG

        if (val?.jenis) {
          arr.push(String(val.jenis).toUpperCase());
        }
      });

      console.log("JENIS LIST:", arr); // DEBUG

      setPaymentJenisList(arr);
    });

    return () => unsub();
  }, []);
  useEffect(() => {
    const unsub = listenPaymentJenis((list) => {
      console.log("JENIS LIST:", list);
      setPaymentJenisList(list);
    });

    return () => unsub && unsub();
  }, []);

  // Filter
  const [filter, setFilter] = useState({
    toko: "ALL",
    status: "ALL",
    kategori: "ALL",
    dateFrom: "",
    dateTo: "",
    search: "",
  });

  const formEmpty = {
    TIPE: "SETORAN",
    TANGGAL_TRANSAKSI: todayStr(),
    NAMA_TOKO: "CILANGKAP PUSAT",

    // ===== TAHAP 1 =====
    NAMA_PELANGGAN: "",
    ID_PELANGGAN: "",
    NO_TLP: "",
    STORE_HEAD: "",
    NAMA_SALES: "",
    SALES_HANDLE: "",

    // ===== TAHAP 2 =====
    DETAIL_BARANG: [], // array item
    GRAND_TOTAL_BARANG: 0,

    // ===== TAHAP 3 =====
    PAYMENT_STATUS: "LUNAS",
    PAYMENT_METHOD: "CASH",
    PAYMENT_DETAIL: null,
    MDR: 0,
    DP_TALANGAN: 0,
    TENOR: "",
    KETERANGAN_PAYMENT: "",

    // ===== SETORAN CORE =====
    KATEGORI_PEMBAYARAN: "",
    JUMLAH_SETORAN: 0,
    REF_SETORAN: "",
    DIBUAT_OLEH: "",
    STATUS: "Pending",
  };

  const [form, setForm] = useState(formEmpty);
  const [editId, setEditId] = useState(null);
  
  // ===============================
  // AUTO GENERATE NO PRE ORDER
  // ===============================
  useEffect(() => {
    if (!editId && !form.NO_PRE_ORDER) {
      const newNo = generateNoPreOrder(
        form.NAMA_TOKO,
        setoran
      );
  
      setForm((prev) => ({
        ...prev,
        NO_PRE_ORDER: newNo,
      }));
    }
  }, [form.NAMA_TOKO, setoran, editId]);

  const tableRef = useRef(null);
  const fileRef = useRef(null);

  // ===============================
  // Realtime Listener Firebase
  // ===============================
  useEffect(() => {
    const unsub = listenAllTransaksi((items) => {
      const map = (items || []).map(normalizeRecord);

      setAllData(map);

      setSetoran(map.filter((x) => x.TIPE === "SETORAN"));

      setPengeluaran(map.filter((x) => x.TIPE === "PENGELUARAN"));
    });

    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    const unsub = listenMasterPaymentMetode((data) => {
      setMasterPaymentMetode(Array.isArray(data) ? data : []);
    });

    return () => unsub && unsub();
  }, []);

  const paymentJenisOptions = useMemo(() => {
    return [
      ...new Set(
        masterPaymentMetode.flatMap((m) =>
          Array.isArray(m.paymentMetode)
            ? m.paymentMetode
            : m.paymentMetode
            ? [m.paymentMetode]
            : []
        )
      ),
    ];
  }, [masterPaymentMetode]);

  const tokoNameToId = (name) => ALL_TOKO.findIndex((t) => t === name) + 1 || 1;

  // ===============================
  // Filtering
  // ===============================
  const filteredSetoran = useMemo(() => {
    return setoran.filter((s) => {
      // ✅ PIC hanya lihat toko sendiri
      if (!isSuper) {
        const tokoLogin =
          tokoNameFromState || loggedUser?.tokoNama || loggedUser?.toko;

        if (s.NAMA_TOKO !== tokoLogin) return false;
      }

      if (filter.toko !== "ALL" && s.NAMA_TOKO !== filter.toko) return false;
      if (filter.status !== "ALL" && s.STATUS !== filter.status) return false;

      if (
        filter.kategori !== "ALL" &&
        s.KATEGORI_PEMBAYARAN !== filter.kategori
      )
        return false;

      if (filter.dateFrom && s.TANGGAL_TRANSAKSI < filter.dateFrom)
        return false;
      if (filter.dateTo && s.TANGGAL_TRANSAKSI > filter.dateTo) return false;

      if (filter.search) {
        const q = filter.search.toLowerCase();
        const hay =
          `${s.NAMA_TOKO} ${s.KETERANGAN} ${s.REF_SETORAN} ${s.DIBUAT_OLEH}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [setoran, filter, isSuper, tokoNameFromState]);

  const filteredPengeluaran = useMemo(() => {
    return pengeluaran.filter((s) => {
      if (filter.toko !== "ALL" && s.NAMA_TOKO !== filter.toko) return false;
      if (filter.status !== "ALL" && s.STATUS !== filter.status) return false;

      if (filter.dateFrom && s.TANGGAL_TRANSAKSI < filter.dateFrom)
        return false;
      if (filter.dateTo && s.TANGGAL_TRANSAKSI > filter.dateTo) return false;

      if (filter.search) {
        const q = filter.search.toLowerCase();
        const hay =
          `${s.NAMA_TOKO} ${s.KETERANGAN} ${s.REF_SETORAN} ${s.DIBUAT_OLEH}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [pengeluaran, filter]);

  const totalAllPengeluaran = useMemo(
    () => pengeluaran.reduce((a, b) => a + toNum(b.JUMLAH_SETORAN), 0),
    [pengeluaran]
  );

  const totalFilteredPengeluaran = useMemo(
    () => filteredPengeluaran.reduce((a, b) => a + toNum(b.JUMLAH_SETORAN), 0),
    [filteredPengeluaran]
  );

  // ===============================
  // Summary
  // ===============================
  const totalAllSetoran = useMemo(
    () => setoran.reduce((a, b) => a + toNum(b.JUMLAH_SETORAN), 0),
    [setoran]
  );

  const totalFilteredSetoran = useMemo(
    () => filteredSetoran.reduce((a, b) => a + toNum(b.JUMLAH_SETORAN), 0),
    [filteredSetoran]
  );

  const totalPerTokoAll = useMemo(() => {
    const map = new Map();
    setoran.forEach((s) => {
      const name = s.NAMA_TOKO;
      map.set(name, (map.get(name) || 0) + toNum(s.JUMLAH_SETORAN));
    });
    return Array.from(map.entries()).map(([tokoName, total]) => ({
      tokoName,
      total,
    }));
  }, [setoran]);

  const totalPerKategoriAll = useMemo(() => {
    const map = new Map();
    setoran.forEach((s) => {
      const k = s.KATEGORI_PEMBAYARAN || "Unknown";
      map.set(k, (map.get(k) || 0) + toNum(s.JUMLAH_SETORAN));
    });
    return Array.from(map.entries()).map(([kategori, total]) => ({
      kategori,
      total,
    }));
  }, [setoran]);

  // ===============================
  // Pagination
  // ===============================
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const totalPages = Math.max(
    1,
    Math.ceil(filteredSetoran.length / rowsPerPage)
  );

  const paginatedSetoran = filteredSetoran.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const paginatedPengeluaran = filteredPengeluaran.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // ===============================
  // CRUD: Add / Edit / Delete / Status
  // ===============================
  const addSetoran = async () => {
    if (!form.TANGGAL_TRANSAKSI || !form.NAMA_TOKO) {
      alert("Tanggal dan Toko wajib diisi");
      return;
    }

    const payload = {
      ...form,

      GRAND_TOTAL_BARANG: toNum(form.GRAND_TOTAL_BARANG),

      JUMLAH_SETORAN: toNum(form.GRAND_TOTAL_BARANG),
      TOTAL: toNum(form.GRAND_TOTAL_BARANG),

      TIPE: "SETORAN",
    };

    const tokoId = tokoNameToId(form.NAMA_TOKO);
    await addTransaksi(tokoId, payload);

    setForm(formEmpty);
  };

  const beginEdit = (row) => {
    setForm(row);
    setEditId(row.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveEdit = async () => {
    const tokoId = tokoNameToId(form.NAMA_TOKO);
    await updateTransaksi(tokoId, editId, {
      ...form,
      TOTAL: toNum(form.JUMLAH_SETORAN),
    });
    setForm(formEmpty);
    setEditId(null);
  };

  setTimeout(() => {
    const newNo = generateNoPreOrder(form.NAMA_TOKO, setoran);
    setForm((prev) => ({
      ...formEmpty,
      NO_PRE_ORDER: newNo,
    }));
  }, 200);

  const deleteSetoran = async (id, tokoName) => {
    if (!window.confirm("Hapus setoran ini?")) return;
    const tokoId = tokoNameToId(tokoName);
    await deleteTransaksi(tokoId, id);
  };

  const updateStatus = async (id, tokoName, status) => {
    const tokoId = tokoNameToId(tokoName);
    await updateTransaksi(tokoId, id, { STATUS: status });
  };

  const addPengeluaran = async () => {
    if (!form.TANGGAL_TRANSAKSI || !form.NAMA_TOKO) {
      alert("Tanggal dan Toko wajib diisi");
      return;
    }

    const payload = {
      ...form,
      TOTAL: toNum(form.JUMLAH_SETORAN),
      TIPE: "PENGELUARAN",
      STATUS: "Approved",
    };

    const tokoId = tokoNameToId(form.NAMA_TOKO);
    await addTransaksi(tokoId, payload);
    setForm(formEmpty);
  };

  // ===============================
  // Import Excel
  // ===============================
  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json(ws, { defval: "" });

      for (const row of json) {
        const payload = {
          TIPE: "SETORAN",
          TANGGAL_TRANSAKSI: row.Tanggal || todayStr(),
          NAMA_TOKO: row.Toko || "PUSAT",
          KATEGORI_PEMBAYARAN: row.Kategori || "",
          JUMLAH_SETORAN: toNum(row.Jumlah || 0),
          REF_SETORAN: row["No Ref"] || "",
          KETERANGAN: row.Keterangan || "",
          DIBUAT_OLEH: row["Dibuat Oleh"] || "",
          STATUS: "Pending",
          TOTAL: toNum(row.Jumlah || 0),
        };

        const tokoId = tokoNameToId(payload.NAMA_TOKO);
        await addTransaksi(tokoId, payload);
      }

      alert("Import selesai!");
      fileRef.current.value = "";
    } catch (err) {
      console.error(err);
      alert("Gagal import file.");
    }
  };

  // ===============================
  // Export Excel
  // ===============================
  const exportExcel = (rows) => {
    const data = rows.map((r, i) => ({
      No: i + 1,
      "No Pre Order": r.NO_PRE_ORDER,
      Tanggal: r.TANGGAL_TRANSAKSI,
      Toko: r.NAMA_TOKO,
      Pelanggan: r.NAMA_PELANGGAN,
      "ID Pelanggan": r.ID_PELANGGAN,
      "No TLP": r.NO_TLP,
      Sales: r.NAMA_SALES,
      Barang: r.NAMA_BARANG,
      QTY: r.QTY,
      Harga: r.HARGA,
      DP: r.DP_PAYMENT,
      Total: r.QTY * r.HARGA,
      Status: r.STATUS,
    }));
  
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Setoran");
    XLSX.writeFile(wb, "FinanceReport_Setoran.xlsx");
  };

  // ===============================
  // Export PDF
  // ===============================
  const exportPDF = async () => {
    if (!tableRef.current) return;
    const canvas = await html2canvas(tableRef.current, { scale: 1.5 });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("l", "mm", "a4");
    pdf.addImage(img, "PNG", 0, 0, 297, (canvas.height * 297) / canvas.width);
    pdf.save("FinanceReport_Setoran.pdf");
  };

  useEffect(() => {
  const total =
    Number(form.QTY || 0) *
    Number(form.HARGA || 0);

  setForm((prev) => ({
    ...prev,
    GRAND_TOTAL_BARANG: total,
    JUMLAH_SETORAN: total,
  }));
}, [form.QTY, form.HARGA]);

  // =====================================================
  //                      JSX UI
  // =====================================================
  return (
    <div className="p-4 space-y-6">
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-lg shadow mb-4">
        <h1 className="text-2xl font-bold">
          Finance Report — Setoran (CILANGKAP PUSAT)
        </h1>
        <p className="text-sm text-slate-600">
          Semua setoran disimpan sebagai transaksi bertipe{" "}
          <code>"SETORAN Pre ORDER DAN PENGELUARAN"</code>.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <label className=" px-3 py-2 text-xl text-bold font-bold bg-white ">
          SETORAN Pre ORDER PENJUALAN
        </label>

        <label
          onClick={() => exportExcel(filteredSetoran)}
          className="cursor-pointer px-3 py-2 border bg-white rounded"
        >
          Import Excel
          <input
            type="file"
            accept=".xlsx,.xls"
            ref={fileRef}
            onChange={handleImport}
            className="hidden"
          />
        </label>

        <button
          onClick={() => exportExcel(filteredSetoran)}
          className="px-3 py-2 border bg-white rounded"
        >
          Export Excel
        </button>
        <button
          onClick={() => exportPDF()}
          className="px-3 py-2 border bg-white rounded"
        >
          Export PDF
        </button>
      </div>

      {/* Filters + Form */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Filters */}
        <div className="border rounded-xl p-4 bg-white shadow">
          <h3 className="font-semibold mb-2">Filter</h3>

          <div className="space-y-2">
            <div>
              <label className="text-xs">Toko</label>
              <select
                value={filter.toko}
                onChange={(e) => {
                  setFilter((f) => ({ ...f, toko: e.target.value }));
                  setCurrentPage(1);
                }}
                className="w-full border rounded p-1"
              >
                <option value="ALL">Semua</option>
                {isSuper ? (
                  ALL_TOKO.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))
                ) : (
                  <option value={loggedUser?.tokoNama || loggedUser?.toko}>
                    {loggedUser?.tokoNama || loggedUser?.toko}
                  </option>
                )}
              </select>
            </div>

            <div>
              <label className="text-xs">Status</label>
              <select
                value={filter.status}
                onChange={(e) => {
                  setFilter((f) => ({ ...f, status: e.target.value }));
                  setCurrentPage(1);
                }}
                className="w-full border rounded p-1"
              >
                <option value="ALL">Semua</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            {/* KATEGORI PAYMENT USER */}
            <div>
              <label className="text-xs">Kategori Payment User</label>
              <select
                value={form.KATEGORI_PEMBAYARAN || ""}
                onChange={(e) =>
                  setForm({ ...form, KATEGORI_PEMBAYARAN: e.target.value })
                }
                className="w-full border rounded p-1"
              >
                <option value="">Pilih Kategori</option>
                {paymentJenisOptions.map((j, i) => (
                  <option key={i} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs">Cari</label>
              <input
                value={filter.search}
                placeholder="Keterangan / Ref / Pembuat"
                onChange={(e) => {
                  setFilter((f) => ({ ...f, search: e.target.value }));
                  setCurrentPage(1);
                }}
                className="w-full border rounded p-1"
              />
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="border rounded-xl p-4 bg-white shadow md:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <h3 className="font-semibold mb-3">
              {editId ? "Edit Setoran" : "Tambah SETORAN Pre ORDER PENJUALAN"}
            </h3>

            {/* NO PRE ORDER */}
            <div>
              <label className="text-xs">No Pre Order</label>
              <input
                value={form.NO_PRE_ORDER || ""}
                onChange={(e) =>
                  setForm({ ...form, NO_PRE_ORDER: e.target.value })
                }
                className="w-full border rounded p-1"
              />
            </div>

            {/* TANGGAL */}
            <div>
              <label className="text-xs">Tanggal</label>
              <input
                type="date"
                value={form.TANGGAL_TRANSAKSI}
                onChange={(e) =>
                  setForm({ ...form, TANGGAL_TRANSAKSI: e.target.value })
                }
                className="w-full border rounded p-1"
              />
            </div>

            {/* TOKO */}
            <div>
              <label className="text-xs">Nama Toko</label>
              <select
                value={form.NAMA_TOKO}
                onChange={(e) =>
                  setForm({ ...form, NAMA_TOKO: e.target.value })
                }
                className="w-full border rounded p-1"
              >
                {ALL_TOKO.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* NAMA PELANGGAN */}
            <div>
              <label className="text-xs">Nama Pelanggan</label>
              <input
                value={form.NAMA_PELANGGAN || ""}
                onChange={(e) =>
                  setForm({ ...form, NAMA_PELANGGAN: e.target.value })
                }
                className="w-full border rounded p-1"
              />
            </div>

            {/* ID PELANGGAN */}
            <div>
              <label className="text-xs">ID Pelanggan</label>
              <input
                value={form.ID_PELANGGAN || ""}
                onChange={(e) =>
                  setForm({ ...form, ID_PELANGGAN: e.target.value })
                }
                className="w-full border rounded p-1"
              />
            </div>

            {/* NO TLP */}
            <div>
              <label className="text-xs">No TLP</label>
              <input
                value={form.NO_TLP || ""}
                onChange={(e) => setForm({ ...form, NO_TLP: e.target.value })}
                className="w-full border rounded p-1"
              />
            </div>

            {/* STORE HEAD */}
            <div>
              <label className="text-xs">Store Head</label>
              <input
                value={form.STORE_HEAD || ""}
                onChange={(e) =>
                  setForm({ ...form, STORE_HEAD: e.target.value })
                }
                className="w-full border rounded p-1"
              />
            </div>

            {/* SALES */}
            <div>
              <label className="text-xs">Nama Sales</label>
              <input
                value={form.NAMA_SALES || ""}
                onChange={(e) =>
                  setForm({ ...form, NAMA_SALES: e.target.value })
                }
                className="w-full border rounded p-1"
              />
            </div>

            {/* SALES HANDLE */}
            <div>
              <label className="text-xs">Sales Handle</label>
              <input
                value={form.SALES_HANDLE || ""}
                onChange={(e) =>
                  setForm({ ...form, SALES_HANDLE: e.target.value })
                }
                className="w-full border rounded p-1"
              />
            </div>

            {/* KATEGORI BARANG */}
            <div>
              <label className="text-xs">Kategori Barang</label>
              <input
                value={form.KATEGORI_BARANG || ""}
                onChange={(e) =>
                  setForm({ ...form, KATEGORI_BARANG: e.target.value })
                }
                className="w-full border rounded p-1"
              />
            </div>

            {/* BRAND */}
            <div>
              <label className="text-xs">Nama Brand</label>
              <input
                list="brand-list"
                value={form.NAMA_BRAND || ""}
                onChange={(e) =>
                  setForm({ ...form, NAMA_BRAND: e.target.value })
                }
                className="w-full border rounded p-1"
              />

              <datalist id="brand-list">
                {[...new Set(masterBarang.map((b) => b.brand))].map((b, i) => (
                  <option key={i} value={b} />
                ))}
              </datalist>
            </div>

            {/* BARANG */}
            <div>
              <label className="text-xs">Nama Barang</label>
              <input
                list="barang-list"
                value={form.NAMA_BARANG || ""}
                onChange={(e) =>
                  setForm({ ...form, NAMA_BARANG: e.target.value })
                }
                className="w-full border rounded p-1"
              />

              <datalist id="barang-list">
                {masterBarang
                  .filter((b) =>
                    form.NAMA_BRAND ? b.brand === form.NAMA_BRAND : true
                  )
                  .map((b, i) => (
                    <option key={i} value={b.nama} />
                  ))}
              </datalist>
            </div>

            {/* QTY */}
            <div>
              <label className="text-xs">QTY</label>
              <input
                type="number"
                value={form.QTY || 0}
                onChange={(e) =>
                  setForm({ ...form, QTY: Number(e.target.value) })
                }
                className="w-full border rounded p-1"
              />
            </div>

            {/* HARGA */}
            <div>
              <label className="text-xs">Harga</label>
              <input
                type="number"
                value={form.HARGA || 0}
                onChange={(e) =>
                  setForm({ ...form, HARGA: Number(e.target.value) })
                }
                className="w-full border rounded p-1"
              />
            </div>

            {/* DP */}
            <div>
              <label className="text-xs">Kategori Payment Metode User</label>
              <select
                value={filter.kategori}
                onChange={(e) => {
                  setFilter((f) => ({ ...f, kategori: e.target.value }));
                  setCurrentPage(1);
                }}
                className="w-full border rounded p-1"
              >
                <option value="ALL">Semua</option>
                <option value="Cash">Cash</option>
                <option value="QRIS">QRIS</option>
                <option value="Transfer">Transfer</option>
              </select>
            </div>

            {/* DP */}
            <div>
              <label className="text-xs">DP Payment Metode User</label>
              <input
                type="number"
                value={form.DP_PAYMENT || 0}
                onChange={(e) =>
                  setForm({ ...form, DP_PAYMENT: Number(e.target.value) })
                }
                className="w-full border rounded p-1"
              />
            </div>

            {/* TOTAL AUTO */}
            <div>
              <label className="text-xs">Total</label>
              <input
                readOnly
                value={formatCurrency((form.QTY || 0) * (form.HARGA || 0))}
                className="w-full border rounded p-1 bg-gray-100 font-semibold"
              />
            </div>

            {/* BUTTONS */}
            <div className="md:col-span-4 flex gap-2 mt-3">
              {editId ? (
                <>
                  <button
                    onClick={saveEdit}
                    className="px-4 py-2 bg-emerald-600 text-white rounded"
                  >
                    Simpan Perubahan
                  </button>
                  <button
                    onClick={() => {
                      setForm(formEmpty);
                      setEditId(null);
                    }}
                    className="px-4 py-2 border rounded"
                  >
                    Batal
                  </button>
                </>
              ) : (
                <button
                  onClick={addSetoran}
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  Tambah SETORAN Pre ORDER PENJUALAN
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      {/* TABEL */}
      <div className="border rounded-xl p-4 bg-white shadow">
        <h3 className="font-semibold mb-2">
          Daftar SETORAN Pre ORDER PENJUALAN
        </h3>

        <div className="text-sm mb-2">
          Menampilkan <b>{filteredSetoran.length}</b> data — Total:{" "}
          {formatCurrency(totalFilteredSetoran)}
        </div>

        <div ref={tableRef} className="overflow-x-auto">
          <table className="min-w-[1400px] w-full text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-2 text-center">No</th>
                <th className="px-3 py-2 text-left">No Pre Order</th>
                <th className="px-3 py-2 text-left">Tanggal</th>
                <th className="px-3 py-2 text-left">Toko</th>
                <th className="px-3 py-2 text-left">Nama Pelanggan</th>
                <th className="px-3 py-2 text-left">ID Pelanggan</th>
                <th className="px-3 py-2 text-left">No TLP</th>
                <th className="px-3 py-2 text-left">Store Head</th>
                <th className="px-3 py-2 text-left">Sales</th>
                <th className="px-3 py-2 text-left">Sales Handle</th>
                <th className="px-3 py-2 text-left">Kategori</th>
                <th className="px-3 py-2 text-left">Brand</th>
                <th className="px-3 py-2 text-left">Barang</th>
                <th className="px-3 py-2 text-center">QTY</th>
                <th className="px-3 py-2 text-right">Harga</th>
                <th className="px-3 py-2 text-right">Kategori Payment</th>
                <th className="px-3 py-2 text-right">DP Payment</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Aksi</th>
              </tr>
            </thead>

            <tbody>
              {paginatedSetoran.length === 0 ? (
                <tr>
                  <td colSpan={18} className="py-6 text-center text-slate-500">
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                paginatedSetoran.map((r, index) => {
                  const total = Number(r.QTY || 0) * Number(r.HARGA || 0);

                  const nomor = (currentPage - 1) * rowsPerPage + index + 1;

                  return (
                    <tr key={r.id} className="border-b hover:bg-slate-50">
                      <td className="px-3 py-2 text-center font-semibold">
                        {nomor}
                      </td>
                      <td className="px-3 py-2 font-semibold">
                        {r.NO_PRE_ORDER}
                      </td>

                      <td className="px-3 py-2">{r.TANGGAL_TRANSAKSI}</td>

                      <td className="px-3 py-2">{r.NAMA_TOKO}</td>

                      <td className="px-3 py-2">{r.NAMA_PELANGGAN}</td>

                      <td className="px-3 py-2">{r.ID_PELANGGAN}</td>

                      <td className="px-3 py-2">{r.NO_TLP}</td>

                      <td className="px-3 py-2">{r.STORE_HEAD}</td>

                      <td className="px-3 py-2">{r.NAMA_SALES}</td>

                      <td className="px-3 py-2">{r.SALES_HANDLE}</td>

                      <td className="px-3 py-2">{r.KATEGORI_BARANG}</td>

                      <td className="px-3 py-2">{r.NAMA_BRAND}</td>

                      <td className="px-3 py-2">{r.NAMA_BARANG}</td>

                      <td className="px-3 py-2 text-center">{r.QTY}</td>

                      <td className="px-3 py-2 text-right">
                        {formatCurrency(r.HARGA)}
                      </td>

                      <td className="px-3 py-2 text-right">
                        {r.KATEGORI_PEMBAYARAN}
                      </td>

                      <td className="px-3 py-2 text-right">
                        {formatCurrency(r.DP_PAYMENT)}
                      </td>

                      <td className="px-3 py-2 text-right font-bold text-green-700">
                        {formatCurrency(total)}
                      </td>

                      <td className="px-3 py-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            r.STATUS === "Approved"
                              ? "bg-green-100 text-green-700"
                              : r.STATUS === "Rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {r.STATUS}
                        </span>
                      </td>

                      <td className="px-3 py-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() =>
                              updateStatus(r.id, r.NAMA_TOKO, "Approved")
                            }
                            className="px-2 py-1 text-xs bg-green-600 text-white rounded"
                          >
                            Approve
                          </button>

                          <button
                            onClick={() =>
                              updateStatus(r.id, r.NAMA_TOKO, "Rejected")
                            }
                            className="px-2 py-1 text-xs bg-orange-600 text-white rounded"
                          >
                            Reject
                          </button>

                          <button
                            onClick={() => beginEdit(r)}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded"
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => deleteSetoran(r.id, r.NAMA_TOKO)}
                            className="px-2 py-1 text-xs bg-red-600 text-white rounded"
                          >
                            Hapus
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-3 text-sm">
          <div>
            Halaman {currentPage} / {totalPages}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 border rounded disabled:opacity-40"
            >
              Prev
            </button>

            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2 py-1 border rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className=" px-3 py-2 text-xl text-bold font-bold bg-white ">
          LAPORAN PENGELUARAN
        </label>

        <label className="cursor-pointer px-3 py-2 border bg-white rounded">
          Import Excel
          <input
            type="file"
            accept=".xlsx,.xls"
            ref={fileRef}
            onChange={handleImport}
            className="hidden"
          />
        </label>

        <button
          onClick={() => exportExcel(filteredPengeluaran)}
          className="px-3 py-2 border bg-white rounded"
        >
          Export Excel
        </button>
        <button
          onClick={() => exportPDF()}
          className="px-3 py-2 border bg-white rounded"
        >
          Export PDF
        </button>
      </div>

      {/* Filters + Form */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Filters */}
        <div className="border rounded-xl p-4 bg-white shadow">
          <h3 className="font-semibold mb-2">Filter</h3>

          <div className="space-y-2">
            <div>
              <label className="text-xs">Toko</label>
              <select
                value={filter.toko}
                onChange={(e) => {
                  setFilter((f) => ({ ...f, toko: e.target.value }));
                  setCurrentPage(1);
                }}
                className="w-full border rounded p-1"
              >
                <option value="ALL">Semua</option>
                {ALL_TOKO.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs">Status</label>
              <select
                value={filter.status}
                onChange={(e) => {
                  setFilter((f) => ({ ...f, status: e.target.value }));
                  setCurrentPage(1);
                }}
                className="w-full border rounded p-1"
              >
                <option value="ALL">Semua</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>

            <div>
              <label className="text-xs">Kategori</label>
              <select
                value={filter.kategori}
                onChange={(e) => {
                  setFilter((f) => ({ ...f, kategori: e.target.value }));
                  setCurrentPage(1);
                }}
                className="w-full border rounded p-1"
              >
                <option value="ALL">Semua</option>
                <option value="Cash">Cash</option>
                <option value="QRIS">QRIS</option>
                <option value="Transfer">Transfer</option>
              </select>
            </div>

            <div>
              <label className="text-xs">Cari</label>
              <input
                value={filter.search}
                placeholder="Keterangan / Ref / Pembuat"
                onChange={(e) => {
                  setFilter((f) => ({ ...f, search: e.target.value }));
                  setCurrentPage(1);
                }}
                className="w-full border rounded p-1"
              />
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="border rounded-xl p-4 bg-white shadow md:col-span-2">
          <h3 className="font-semibold mb-3">
            {editId ? "Edit Pengeluaran" : "Tambah Pengeluaran"}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs">Tanggal</label>
              <input
                type="date"
                value={form.TANGGAL_TRANSAKSI}
                onChange={(e) =>
                  setForm({ ...form, TANGGAL_TRANSAKSI: e.target.value })
                }
                className="w-full border rounded p-1"
              />
            </div>

            <div>
              <label className="text-xs">Toko</label>
              <select
                value={form.NAMA_TOKO}
                onChange={(e) =>
                  setForm({ ...form, NAMA_TOKO: e.target.value })
                }
                className="w-full border rounded p-1"
              >
                {ALL_TOKO.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs">Kategori</label>
              <input
                list="payment-method-list"
                value={form.KATEGORI_PEMBAYARAN}
                onChange={(e) =>
                  setForm({ ...form, KATEGORI_PEMBAYARAN: e.target.value })
                }
                placeholder="Pilih / ketik kategori"
                className="w-full border rounded p-1"
              />

              <datalist id="payment-method-list">
                {paymentMethods.map((m, i) => (
                  <option key={i} value={m} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="text-xs">Jumlah</label>
              <input
                type="number"
                value={form.JUMLAH_SETORAN}
                onChange={(e) =>
                  setForm({ ...form, JUMLAH_SETORAN: toNum(e.target.value) })
                }
                className="w-full border rounded p-1 text-right"
              />
            </div>

            <div>
              <label className="text-xs">No Ref</label>
              <input
                value={form.REF_SETORAN}
                onChange={(e) =>
                  setForm({ ...form, REF_SETORAN: e.target.value })
                }
                className="w-full border rounded p-1"
              />
            </div>

            <div>
              <label className="text-xs">Dibuat Oleh</label>
              <input
                value={form.DIBUAT_OLEH}
                onChange={(e) =>
                  setForm({ ...form, DIBUAT_OLEH: e.target.value })
                }
                className="w-full border rounded p-1"
              />
            </div>

            <div className="md:col-span-3">
              <label className="text-xs">Keterangan</label>
              <input
                value={form.KETERANGAN}
                onChange={(e) =>
                  setForm({ ...form, KETERANGAN: e.target.value })
                }
                className="w-full border rounded p-1"
              />
            </div>

            {/* Buttons */}
            <div className="md:col-span-3 flex gap-2">
              {editId ? (
                <>
                  <button
                    onClick={saveEdit}
                    className="px-4 py-2 bg-emerald-600 text-white rounded"
                  >
                    Simpan Perubahan
                  </button>
                  <button
                    onClick={() => {
                      setForm(formEmpty);
                      setEditId(null);
                    }}
                    className="px-4 py-2 border rounded"
                  >
                    Batal
                  </button>
                </>
              ) : (
                <button
                  onClick={addPengeluaran}
                  className="px-4 py-2 bg-red-600 text-white rounded"
                >
                  Tambah Pengeluaran
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border rounded-xl p-4 bg-white shadow">
          <div className="text-sm text-slate-500">Total Semua Pengeluaran</div>
          <div className="text-2xl font-bold">
            {formatCurrency(totalAllPengeluaran)}
          </div>
        </div>

        <div className="border rounded-xl p-4 bg-white shadow md:col-span-3">
          <div className="text-sm text-slate-600">Total (Filter)</div>
          <div className="text-xl font-bold">
            {formatCurrency(totalFilteredPengeluaran)}
          </div>
        </div>
      </div>

      {/* Per Toko */}
      <div className="border rounded-xl p-4 bg-white shadow">
        <h2 className="font-semibold mb-3">Total Pengeluaran Per Toko</h2>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {totalPerTokoAll.map((t) => (
            <div key={t.tokoName} className="p-3 border rounded bg-white">
              <div className="text-xs">{t.tokoName}</div>
              <div className="text-lg font-bold">{formatCurrency(t.total)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* TABEL */}
      <div className="border rounded-xl p-4 bg-white shadow">
        <h3 className="font-semibold mb-2">Daftar Pengeluaran</h3>

        <div className="text-sm mb-2">
          Menampilkan <b>{filteredSetoran.length}</b> data — Total:{" "}
          {formatCurrency(totalFilteredSetoran)}
        </div>

        <div ref={tableRef} className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-2 text-left">Tanggal</th>
                <th className="px-3 py-2 text-left">Toko</th>
                <th className="px-3 py-2 text-left">Kategori</th>
                <th className="px-3 py-2 text-right">Jumlah</th>
                <th className="px-3 py-2 text-left">Ref</th>
                <th className="px-3 py-2 text-left">Keterangan</th>
                <th className="px-3 py-2 text-left">Dibuat Oleh</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-left">Aksi</th>
              </tr>
            </thead>

            <tbody>
              {paginatedPengeluaran.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-slate-500">
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                paginatedPengeluaran.map((r) => (
                  <tr key={r.id} className="border-b hover:bg-slate-50">
                    <td className="px-3 py-2">{r.TANGGAL_TRANSAKSI}</td>
                    <td className="px-3 py-2">{r.NAMA_TOKO}</td>
                    <td className="px-3 py-2">{r.KATEGORI_PEMBAYARAN}</td>
                    <td className="px-3 py-2 text-right">
                      {formatCurrency(r.JUMLAH_SETORAN)}
                    </td>
                    <td className="px-3 py-2">{r.REF_SETORAN || "-"}</td>
                    <td className="px-3 py-2">{r.KETERANGAN || "-"}</td>
                    <td className="px-3 py-2">{r.DIBUAT_OLEH || "-"}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          r.STATUS === "Approved"
                            ? "bg-green-100 text-green-700"
                            : r.STATUS === "Rejected"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                        }`}
                      >
                        {r.STATUS}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            updateStatus(r.id, r.NAMA_TOKO, "Approved")
                          }
                          className="px-2 py-1 text-xs bg-green-600 text-white rounded"
                        >
                          Approve
                        </button>

                        <button
                          onClick={() =>
                            updateStatus(r.id, r.NAMA_TOKO, "Rejected")
                          }
                          className="px-2 py-1 text-xs bg-orange-600 text-white rounded"
                        >
                          Reject
                        </button>

                        <button
                          onClick={() => beginEdit(r)}
                          className="px-2 py-1 text-xs bg-blue-600 text-white rounded"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => deleteSetoran(r.id, r.NAMA_TOKO)}
                          className="px-2 py-1 text-xs bg-red-600 text-white rounded"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex justify-between items-center mt-3 text-sm">
          <div>
            Halaman {currentPage} / {totalPages}
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 border rounded disabled:opacity-40"
            >
              Prev
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2 py-1 border rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        *Catatan: Data disimpan ke Firebase realtime sebagai transaksi bertipe
        <code> "PENGELUARAN"</code>.
      </p>
    </div>
  );
}
