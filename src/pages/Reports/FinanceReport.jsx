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
// Normalizer Record Firebase
// ===============================
function normalizeRecord(r) {
  return {
    id: r.id || r._id || r.key || r.ID || String(Date.now()) + Math.random(),

    TIPE: String(r.TIPE || "").toUpperCase(), // ✅ WAJIB

    TANGGAL_TRANSAKSI: r.TANGGAL_TRANSAKSI || todayStr(),
    NAMA_TOKO: r.NAMA_TOKO || "CILANGKAP PUSAT",
    KATEGORI_PEMBAYARAN: r.KATEGORI_PEMBAYARAN || "",
    JUMLAH_SETORAN: toNum(r.JUMLAH_SETORAN || r.TOTAL || 0),
    REF_SETORAN: r.REF_SETORAN || "",
    DIBUAT_OLEH: r.DIBUAT_OLEH || "",
    KETERANGAN: r.KETERANGAN || "",
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
    KATEGORI_PEMBAYARAN: "",
    JUMLAH_SETORAN: 0,
    REF_SETORAN: "",
    KETERANGAN: "",
    DIBUAT_OLEH: "",
    STATUS: "Pending",
  };

  const [form, setForm] = useState(formEmpty);
  const [editId, setEditId] = useState(null);

  const tableRef = useRef(null);
  const fileRef = useRef(null);

  // ===============================
  // Realtime Listener Firebase
  // ===============================
  useEffect(() => {
    const unsub = listenAllTransaksi((items) => {
      const map = (items || []).map(normalizeRecord);
  
      setAllData(map);
  
      setSetoran(
        map.filter((x) => x.TIPE === "SETORAN")
      );
  
      setPengeluaran(
        map.filter((x) => x.TIPE === "PENGELUARAN")
      );
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
  }, [setoran, filter]);

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
      TOTAL: toNum(form.JUMLAH_SETORAN),
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
    const data = rows.map((r) => ({
      Tanggal: r.TANGGAL_TRANSAKSI,
      Toko: r.NAMA_TOKO,
      Tipe: r.TIPE,
      Kategori: r.KATEGORI_PEMBAYARAN,
      Jumlah: r.JUMLAH_SETORAN,
      Keterangan: r.KETERANGAN,
      "No Ref": r.REF_SETORAN,
      "Dibuat Oleh": r.DIBUAT_OLEH,
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
          <code>"SETORAN DAN PENGELUARAN"</code>.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <label className=" px-3 py-2 text-xl text-bold font-bold bg-white ">
          SETORAN PENJUALAN
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
            {editId ? "Edit Setoran" : "Tambah Setoran"}
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
                list="paymentJenisList"
                value={form.KATEGORI_PEMBAYARAN}
                onChange={(e) =>
                  setForm({ ...form, KATEGORI_PEMBAYARAN: e.target.value })
                }
                placeholder="Pilih / ketik metode"
                className="w-full border rounded p-1"
              />

              <datalist id="paymentJenisList">
                {paymentJenisOptions.map((j, i) => (
                  <option key={i} value={j} />
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
                  onClick={addSetoran}
                  className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                  Tambah Setoran
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border rounded-xl p-4 bg-white shadow">
          <div className="text-sm text-slate-500">Total Semua Setoran</div>
          <div className="text-2xl font-bold">
            {formatCurrency(totalAllSetoran)}
          </div>
        </div>

        <div className="border rounded-xl p-4 bg-white shadow md:col-span-3">
          <div className="text-sm text-slate-600">Total (Filter)</div>
          <div className="text-xl font-bold">
            {formatCurrency(totalFilteredSetoran)}
          </div>
        </div>
      </div>

      {/* Per Toko */}
      <div className="border rounded-xl p-4 bg-white shadow">
        <h2 className="font-semibold mb-3">Total Per Toko</h2>
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
        <h3 className="font-semibold mb-2">Daftar Setoran</h3>

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
              {paginatedSetoran.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-6 text-center text-slate-500">
                    Tidak ada data
                  </td>
                </tr>
              ) : (
                paginatedSetoran.map((r) => (
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
            {formatCurrency(totalAllPengeluaran)
            }
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
