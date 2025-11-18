// src/pages/Reports/SalesReport.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FaFileExcel,
  FaFilePdf,
  FaFilter,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
  FaCheckCircle,
  FaEdit,
  FaTrash,
} from "react-icons/fa";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import {
  listenAllTransaksi,
  updateTransaksi,
  deleteTransaksi,
} from "../../services/FirebaseService";

/* fallback toko names (same list used across app) */
const fallbackTokoNames = [
  "CILANGKAP",
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

export default function SalesReport() {
  const [allData, setAllData] = useState([]);
  const [filterToko, setFilterToko] = useState("semua");
  const [filterSales, setFilterSales] = useState("semua");
  const [filterBrand, setFilterBrand] = useState("semua");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");
  const [search, setSearch] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 12;

  const tableRef = useRef(null);

  // subscribe realtime to all transaksi
  useEffect(() => {
    if (typeof listenAllTransaksi === "function") {
      const unsub = listenAllTransaksi((items = []) => {
        const normalized = (items || []).map((r) => normalizeRecord(r));
        // sort by date desc
        normalized.sort(
          (a, b) =>
            new Date(b.TANGGAL_TRANSAKSI || b.TANGGAL || 0) -
            new Date(a.TANGGAL_TRANSAKSI || a.TANGGAL || 0)
        );
        setAllData(normalized);
        setCurrentPage(1);
      });
      return () => unsub && unsub();
    } else {
      console.warn("listenAllTransaksi not found in FirebaseService");
      setAllData([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // normalize record so fields always present
  const normalizeRecord = (r = {}) => {
    return {
      id: r.id ?? r._id ?? r.key ?? String(Date.now() + Math.random()),
      TANGGAL_TRANSAKSI: r.TANGGAL_TRANSAKSI || r.TANGGAL || "",
      NO_INVOICE: r.NO_INVOICE || "",
      NAMA_USER: r.NAMA_USER || "",
      NO_HP_USER: r.NAMA_PIC_TOKO || "",
      NAMA_PIC_TOKO: r.NAMA_PIC_TOKO || "",
      NAMA_SALES: r.NAMA_SALES || "",
      TITIPAN_REFERENSI: r.TITIPAN_REFERENSI || "",
      NAMA_TOKO: r.NAMA_TOKO || r.TOKO || "",
      NAMA_BRAND: r.NAMA_BRAND || r.BRAND || "",
      NAMA_BARANG: r.NAMA_BARANG || r.BARANG || "",
      QTY: Number(r.QTY || 0),
      NOMOR_UNIK: r.NOMOR_UNIK || r.IMEI || r.NO_DINAMO || r.NO_RANGKA || "",
      IMEI: r.IMEI || "",
      NO_DINAMO: r.NO_DINAMO || "",
      NO_RANGKA: r.NO_RANGKA || "",
      KATEGORI_HARGA: r.KATEGORI_HARGA || "",
      HARGA_UNIT: Number(r.HARGA_UNIT || r.HARGA || 0),
      PAYMENT_METODE: r.PAYMENT_METODE || "",
      SYSTEM_PAYMENT: r.SYSTEM_PAYMENT || "",
      MDR: Number(r.MDR || 0),
      POTONGAN_MDR: Number(r.POTONGAN_MDR || 0),
      NO_ORDER_KONTRAK: r.NO_ORDER_KONTRAK || "",
      TENOR: r.TENOR || "",
      DP_USER_MERCHANT: Number(r.DP_USER_MERCHANT || 0),
      DP_USER_TOKO: Number(r.DP_USER_TOKO || 0),
      REQUEST_DP_TALANGAN: Number(r.REQUEST_DP_TALANGAN || 0),
      KETERANGAN: r.KETERANGAN || "",
      STATUS: r.STATUS || "Pending",
      TOTAL:
        Number(r.TOTAL) ||
        Number(r.QTY || 0) * Number(r.HARGA_UNIT || r.HARGA || 0) ||
        0,
      _raw: r,
    };
  };

  // derive lists for selects
  const tokoOptions = useMemo(() => {
    const names = [
      ...new Set(allData.map((r) => r.NAMA_TOKO || r.TOKO).filter(Boolean)),
    ];
    return names.length ? names : fallbackTokoNames;
  }, [allData]);

  const salesOptions = useMemo(() => {
    return [...new Set(allData.map((r) => r.NAMA_SALES).filter(Boolean))];
  }, [allData]);

  const brandOptions = useMemo(() => {
    return [...new Set(allData.map((r) => r.NAMA_BRAND).filter(Boolean))];
  }, [allData]);

  // filteredData
  const filteredData = useMemo(() => {
    return allData.filter((r) => {
      let ok = true;
      if (filterToko !== "semua")
        ok = ok && (r.NAMA_TOKO || r.TOKO) === filterToko;
      if (filterSales !== "semua") ok = ok && r.NAMA_SALES === filterSales;
      if (filterBrand !== "semua") ok = ok && r.NAMA_BRAND === filterBrand;
      if (filterStatus !== "semua") ok = ok && r.STATUS === filterStatus;
      if (filterStart) {
        const start = new Date(filterStart).setHours(0, 0, 0, 0);
        const d = new Date(r.TANGGAL_TRANSAKSI || r.TANGGAL || 0);
        ok = ok && d >= start;
      }
      if (filterEnd) {
        const end = new Date(filterEnd).setHours(23, 59, 59, 999);
        const d = new Date(r.TANGGAL_TRANSAKSI || r.TANGGAL || 0);
        ok = ok && d <= end;
      }
      if (search.trim()) {
        const s = search.trim().toLowerCase();
        ok =
          ok &&
          (String(r.NO_INVOICE || "")
            .toLowerCase()
            .includes(s) ||
            String(r.NAMA_USER || "")
              .toLowerCase()
              .includes(s) ||
            String(r.NOMOR_UNIK || "")
              .toLowerCase()
              .includes(s) ||
            String(r.NAMA_BARANG || "")
              .toLowerCase()
              .includes(s));
      }
      return ok;
    });
  }, [
    allData,
    filterToko,
    filterSales,
    filterBrand,
    filterStatus,
    filterStart,
    filterEnd,
    search,
  ]);

  // totals
  const totalOmzet = useMemo(() => {
    return filteredData.reduce((sum, r) => sum + Number(r.TOTAL || 0), 0);
  }, [filteredData]);

  const totalQty = useMemo(() => {
    return filteredData.reduce((sum, r) => sum + Number(r.QTY || 0), 0);
  }, [filteredData]);

  // pagination
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredData.length / rowsPerPage)),
    [filteredData.length]
  );
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, currentPage]);

  const prevPage = () => currentPage > 1 && setCurrentPage((p) => p - 1);
  const nextPage = () =>
    currentPage < totalPages && setCurrentPage((p) => p + 1);

  // export excel
  const handleExportExcel = (rows = filteredData) => {
    try {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "SalesReport");
      XLSX.writeFile(
        wb,
        `SalesReport_${new Date().toISOString().slice(0, 10)}.xlsx`
      );
    } catch (e) {
      console.error("Export Excel failed", e);
      alert("Gagal export Excel");
    }
  };

  // export PDF (render table)
  const handleExportPDF = async (rows = filteredData) => {
    try {
      const el = tableRef.current;
      if (!el) {
        alert("Tabel tidak ditemukan");
        return;
      }
      const canvas = await html2canvas(el, { scale: 1.5 });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "mm", "a4");
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(img, "PNG", 0, 0, w, h);
      pdf.save(`SalesReport_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error("Export PDF failed", e);
      alert("Gagal export PDF");
    }
  };

  // action handlers: approve/reject/delete/edit
  const handleApproval = async (row, status) => {
    try {
      const tokoName = row.NAMA_TOKO || row.TOKO || "";
      const tokoId =
        fallbackTokoNames.findIndex(
          (t) => String(t).toUpperCase() === String(tokoName).toUpperCase()
        ) + 1;
      if (!tokoId) {
        alert("Gagal: toko tidak dikenali.");
        return;
      }
      if (typeof updateTransaksi === "function") {
        await updateTransaksi(tokoId, row.id, { STATUS: status });
      } else {
        console.warn("updateTransaksi not found");
      }
      setAllData((d) =>
        d.map((x) => (x.id === row.id ? { ...x, STATUS: status } : x))
      );
    } catch (err) {
      console.error("Approval error:", err);
      alert("Gagal mengubah status.");
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm("Yakin menghapus transaksi ini?")) return;
    try {
      const tokoName = row.NAMA_TOKO || row.TOKO || "";
      const tokoId =
        fallbackTokoNames.findIndex(
          (t) => String(t).toUpperCase() === String(tokoName).toUpperCase()
        ) + 1;
      if (!tokoId) {
        alert("Gagal: toko tidak dikenali.");
        return;
      }
      if (typeof deleteTransaksi === "function") {
        await deleteTransaksi(tokoId, row.id);
      } else {
        console.warn("deleteTransaksi not found");
      }
      setAllData((d) => d.filter((x) => x.id !== row.id));
    } catch (err) {
      console.error("Delete error:", err);
      alert("Gagal menghapus data.");
    }
  };

  const handleEdit = (row) => {
    // store record to localStorage so DataManagement (route /transaksi) can pick it up
    try {
      localStorage.setItem("edit_transaksi", JSON.stringify(row));
      // navigate to DataManagement route (you said /transaksi)
      window.location.href = "/transaksi";
    } catch (e) {
      console.error("Edit redirect error:", e);
      alert("Gagal membuka halaman edit.");
    }
  };

  // nice format helper
  const fmt = (v) => {
    try {
      return Number(v || 0).toLocaleString("id-ID");
    } catch {
      return String(v || "");
    }
  };

  return (
    <div className="p-4 bg-gray-100 rounded-xl shadow-md">
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-lg shadow mb-4">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">
          Sales Report — Pusat (Realtime)
        </h2>
      </div>
      {/* filters */}
      <div className="bg-white p-3 rounded shadow mb-4 flex flex-wrap gap-3 items-center">
        <FaFilter className="text-gray-600" />

        <select
          value={filterToko}
          onChange={(e) => setFilterToko(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="semua">Semua Toko</option>
          {tokoOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          value={filterSales}
          onChange={(e) => setFilterSales(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="semua">Semua Sales</option>
          {salesOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={filterBrand}
          onChange={(e) => setFilterBrand(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="semua">Semua Brand</option>
          {brandOptions.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="semua">Semua Status</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>

        <label className="text-sm">Dari:</label>
        <input
          type="date"
          value={filterStart}
          onChange={(e) => setFilterStart(e.target.value)}
          className="p-2 border rounded"
        />

        <label className="text-sm">Sampai:</label>
        <input
          type="date"
          value={filterEnd}
          onChange={(e) => setFilterEnd(e.target.value)}
          className="p-2 border rounded"
        />

        <div className="ml-auto flex items-center space-x-2">
          <div className="flex items-center border rounded p-1">
            <FaSearch className="mx-2 text-gray-500" />
            <input
              placeholder="Cari invoice, user, nomor unik, barang..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="p-1 outline-none"
            />
          </div>

          <button
            onClick={() => handleExportExcel()}
            className="px-3 py-1 bg-green-600 text-white rounded flex items-center"
          >
            <FaFileExcel className="mr-2" /> Excel
          </button>

          <button
            onClick={() => handleExportPDF()}
            className="px-3 py-1 bg-red-600 text-white rounded flex items-center"
          >
            <FaFilePdf className="mr-2" /> PDF
          </button>
        </div>
      </div>

      {/* summary */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-white p-3 rounded shadow text-center">
          <div className="text-sm text-gray-600">Total Transaksi</div>
          <div className="text-2xl font-bold">{filteredData.length}</div>
        </div>

        <div className="bg-white p-3 rounded shadow text-center">
          <div className="text-sm text-gray-600">Total Qty</div>
          <div className="text-2xl font-bold">{fmt(totalQty)}</div>
        </div>

        <div className="bg-white p-3 rounded shadow text-center">
          <div className="text-sm text-gray-600">Total Omzet</div>
          <div className="text-2xl font-bold text-green-600">
            Rp {fmt(totalOmzet)}
          </div>
        </div>
      </div>

      {/* table */}
      <div className="bg-white rounded shadow overflow-x-auto">
        <table ref={tableRef} className="w-full text-sm border-collapse">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="p-2 border">Tanggal</th>
              <th className="p-2 border">Invoice</th>
              <th className="p-2 border">User</th>
              <th className="p-2 border">HP</th>
              <th className="p-2 border">PIC Toko</th>
              <th className="p-2 border">Sales</th>
              <th className="p-2 border">Referensi</th>
              <th className="p-2 border">Toko</th>
              <th className="p-2 border">Brand</th>
              <th className="p-2 border">Barang</th>
              <th className="p-2 border">Qty</th>
              <th className="p-2 border">No EMEI</th>
              <th className="p-2 border">Harga Unit</th>
              <th className="p-2 border">Total</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {paginated.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="p-2 border">{r.TANGGAL_TRANSAKSI}</td>
                <td className="p-2 border">{r.NO_INVOICE}</td>
                <td className="p-2 border">{r.NAMA_USER}</td>
                <td className="p-2 border">{r.NO_HP_USER}</td>
                <td className="p-2 border">{r.NAMA_PIC_TOKO}</td>
                <td className="p-2 border">{r.NAMA_SALES}</td>
                <td className="p-2 border">{r.TITIPAN_REFERENSI}</td>
                <td className="p-2 border">{r.NAMA_TOKO}</td>
                <td className="p-2 border">{r.NAMA_BRAND}</td>
                <td className="p-2 border">{r.NAMA_BARANG}</td>
                <td className="p-2 border text-center">{r.QTY}</td>
                <td className="p-2 border">{r.NOMOR_UNIK}</td>
                <td className="p-2 border text-right">{fmt(r.HARGA_UNIT)}</td>
                <td className="p-2 border text-right">{fmt(r.TOTAL)}</td>
                <td
                  className={`p-2 border font-semibold ${
                    r.STATUS === "Approved"
                      ? "text-green-600"
                      : r.STATUS === "Rejected"
                      ? "text-red-600"
                      : "text-yellow-600"
                  }`}
                >
                  {r.STATUS}
                </td>

                {/* AKSI */}
                <td className="p-2 border text-center space-x-2">
                  <button
                    onClick={() => handleApproval(r, "Approved")}
                    className="text-green-600 hover:text-green-800 mr-2"
                    title="Approve"
                  >
                    <FaCheckCircle />
                  </button>

                  <button
                    onClick={() => handleEdit(r)}
                    className="text-blue-600 hover:text-blue-800 mr-2"
                    title="Edit"
                  >
                    <FaEdit />
                  </button>

                  <button
                    onClick={() => handleDelete(r)}
                    className="text-red-600 hover:text-red-800"
                    title="Delete"
                  >
                    <FaTrash />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      <div className="flex justify-between items-center mt-3 text-sm">
        <span>
          Halaman {currentPage} dari {totalPages} ({filteredData.length} data)
        </span>

        <div>
          <button
            onClick={prevPage}
            disabled={currentPage === 1}
            className="px-2 py-1 border rounded mr-2 disabled:opacity-40"
          >
            <FaChevronLeft />
          </button>
          <button
            onClick={nextPage}
            disabled={currentPage === totalPages}
            className="px-2 py-1 border rounded disabled:opacity-40"
          >
            <FaChevronRight />
          </button>
        </div>
      </div>
    </div>
  );
}
