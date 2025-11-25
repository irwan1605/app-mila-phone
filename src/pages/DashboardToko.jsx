// src/pages/DashboardToko.jsx — FULL FIXED VERSION
import React, { useEffect, useMemo, useState } from "react";
import {
  listenTransaksiByToko,
  addTransaksi,
  updateTransaksi,
  deleteTransaksi,
  getTokoName,
} from "../services/FirebaseService";

import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaFileExcel,
  FaFilePdf,
  FaFilter,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";

import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";

export default function DashboardToko({ tokoId }) {
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

  const [tokoName, setTokoName] = useState("Loading...");
  const [data, setData] = useState([]);
  const [form, setForm] = useState({});
  const [editId, setEditId] = useState(null);

  const [filterType, setFilterType] = useState("semua");
  const [filterValue, setFilterValue] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const [detailData, setDetailData] = useState(null);

  // ======================================================
  // LISTENER FIREBASE
  // ======================================================
  useEffect(() => {
    getTokoName(tokoId).then((name) => {
      setTokoName(name || fallbackTokoNames[tokoId - 1] || `Toko ${tokoId}`);
    });

    const unsub = listenTransaksiByToko(tokoId, (items) => {
      const formatted = (items || []).map((r) => {
        // harga aman tanpa ?? operator
        const hargaUnit =
          r.HARGA != null
            ? Number(r.HARGA)
            : r.HARGA_UNIT != null
            ? Number(r.HARGA_UNIT)
            : 0;

        const total =
          r.TOTAL != null ? Number(r.TOTAL) : Number(r.QTY || 0) * hargaUnit;

        return {
          id: r.id,
          ...r,
          QTY: Number(r.QTY || 0),
          HARGA_UNIT: hargaUnit,
          HARGA: hargaUnit,
          TOTAL: total,
          MDR: Number(r.MDR || 0),
          POTONGAN_MDR: Number(r.POTONGAN_MDR || 0),
          DP_USER_MERCHANT: Number(r.DP_USER_MERCHANT || 0),
          DP_USER_TOKO: Number(r.DP_USER_TOKO || 0),
          REQUEST_DP_TALANGAN: Number(r.REQUEST_DP_TALANGAN || 0),
        };
      });

      setData(formatted);
      setCurrentPage(1);
    });

    return () => unsub && unsub();
  }, [tokoId]);

  // ======================================================
  // AUTO GENERATE NO INVOICE (INV-YYYY-xxxxx)
  // ======================================================
  const generateInvoice = () => {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;

    let maxSeq = 0;
    data.forEach((r) => {
      if (r.NO_INVOICE && r.NO_INVOICE.startsWith(prefix)) {
        const seq = parseInt(r.NO_INVOICE.replace(prefix, ""), 10);
        if (!Number.isNaN(seq) && seq > maxSeq) maxSeq = seq;
      }
    });

    const next = String(maxSeq + 1).padStart(5, "0");
    return prefix + next;
  };

  // ======================================================
  // AUTO DETECT NOMOR UNIK (IMEI / DINAMO / RANGKA)
  // ======================================================
  const detectNomor = (val) => {
    if (!val) return { NOMOR_UNIK: "", IMEI: "", NO_DINAMO: "", NO_RANGKA: "" };

    const s = String(val).trim();
    const onlyDigits = /^\d+$/.test(s);

    // IMEI
    if (onlyDigits && s.length >= 14 && s.length <= 17) {
      return { NOMOR_UNIK: s, IMEI: s, NO_DINAMO: "", NO_RANGKA: "" };
    }
    // NO RANGKA
    if (/[A-Za-z]/.test(s) && /[0-9]/.test(s) && s.length >= 6) {
      return { NOMOR_UNIK: s, IMEI: "", NO_DINAMO: "", NO_RANGKA: s };
    }
    // fallback DINAMO
    return { NOMOR_UNIK: s, IMEI: "", NO_DINAMO: s, NO_RANGKA: "" };
  };

  // ======================================================
  // HANDLE FORM CHANGE
  // ======================================================
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const val = type === "number" ? Number(value || 0) : value;

    setForm((f) => ({ ...f, [name]: val }));
  };

  // ======================================================
  // SAVE (ADD / UPDATE)
  // ======================================================
  const handleSave = () => {
    const tanggal = form.TANGGAL_TRANSAKSI || form.TANGGAL;
    const brand = form.NAMA_BRAND || form.BRAND;
    const hargaUnit = Number(form.HARGA_UNIT || form.HARGA || 0);

    if (!tanggal || !brand || !hargaUnit) {
      alert("Isi minimal Tanggal, Nama Brand, Harga");
      return;
    }

    const nomor = detectNomor(
      form.NOMOR_UNIK || form.IMEI || form.NO_DINAMO || form.NO_RANGKA || ""
    );
    const invoice = form.NO_INVOICE || generateInvoice();
    const qty = Number(form.QTY || 0);
    const total = qty * hargaUnit;

    const payload = {
      TANGGAL: tanggal,
      TANGGAL_TRANSAKSI: tanggal,

      NO_INVOICE: invoice,
      NAMA_USER: form.NAMA_USER || "",
      NO_HP_USER: form.NO_HP_USER || "",
      NAMA_PIC_TOKO: form.NAMA_PIC_TOKO || "",
      NAMA_SALES: form.NAMA_SALES || "",
      TITIPAN_REFERENSI: form.TITIPAN_REFERENSI || "",

      TOKO: form.NAMA_TOKO || tokoName,
      NAMA_TOKO: form.NAMA_TOKO || tokoName,

      NAMA_BRAND: brand,
      NAMA_BARANG: form.NAMA_BARANG || "",

      QTY: qty,

      NOMOR_UNIK: nomor.NOMOR_UNIK,
      IMEI: nomor.IMEI,
      NO_DINAMO: nomor.NO_DINAMO,
      NO_RANGKA: nomor.NO_RANGKA,

      KATEGORI_HARGA: form.KATEGORI_HARGA || "",
      HARGA_UNIT: hargaUnit,
      HARGA: hargaUnit,

      PAYMENT_METODE: form.PAYMENT_METODE || "",
      SYSTEM_PAYMENT: form.SYSTEM_PAYMENT || "",

      TOTAL: total,
      MDR: Number(form.MDR || 0),
      POTONGAN_MDR: Number(form.POTONGAN_MDR || 0),

      NO_ORDER_KONTRAK: form.NO_ORDER_KONTRAK || "",
      TENOR: form.TENOR || "",

      DP_USER_MERCHANT: Number(form.DP_USER_MERCHANT || 0),
      DP_USER_TOKO: Number(form.DP_USER_TOKO || 0),
      REQUEST_DP_TALANGAN: Number(form.REQUEST_DP_TALANGAN || 0),

      KETERANGAN: form.KETERANGAN || "",
      STATUS: form.STATUS || "Pending",
    };

    if (editId) updateTransaksi(tokoId, editId, payload);
    else addTransaksi(tokoId, payload);

    setForm({});
    setEditId(null);
  };

  // ======================================================
  // FILTERING DATA
  // ======================================================
  const filteredData = useMemo(() => {
    if (filterType === "semua" || !filterValue) return data;

    // if user inputs a date like "2025-11-18" this will work
    const filterDate = new Date(filterValue);

    return data.filter((item) => {
      const itemDate = new Date(item.TANGGAL_TRANSAKSI || item.TANGGAL || null);
      if (!itemDate || isNaN(itemDate.getTime())) return false;

      if (filterType === "hari") {
        return (
          itemDate.getFullYear() === filterDate.getFullYear() &&
          itemDate.getMonth() === filterDate.getMonth() &&
          itemDate.getDate() === filterDate.getDate()
        );
      }

      if (filterType === "bulan") {
        return (
          itemDate.getFullYear() === filterDate.getFullYear() &&
          itemDate.getMonth() === filterDate.getMonth()
        );
      }

      if (filterType === "tahun") {
        return itemDate.getFullYear() === filterDate.getFullYear();
      }

      return true;
    });
  }, [data, filterType, filterValue]);

  // ======================================================
  // PAGINATION
  // ======================================================
  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, currentPage]);

  // ======================================================
  // EDIT DATA
  // ======================================================
  const handleEdit = (row) => {
    setEditId(row.id);
    // clone the row to avoid two-way mutation issues
    setForm({ ...row });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ======================================================
  // DELETE DATA
  // ======================================================
  const handleDelete = (id) => {
    if (!window.confirm("Yakin hapus data ini?")) return;
    deleteTransaksi(tokoId, id);
  };

  // ======================================================
  // EXPORT EXCEL
  // ======================================================
  const exportExcel = () => {
    try {
      // map to safe fields
      const rows = filteredData.map((r) => ({
        TANGGAL: r.TANGGAL_TRANSAKSI || r.TANGGAL || "",
        NO_INVOICE: r.NO_INVOICE || "",
        NAMA_USER: r.NAMA_USER || "",
        TOKO: r.TOKO || r.NAMA_TOKO || tokoName,
        NAMA_BRAND: r.NAMA_BRAND || "",
        NAMA_BARANG: r.NAMA_BARANG || "",
        QTY: r.QTY || 0,
        NOMOR_UNIK: r.NOMOR_UNIK || "",
        HARGA_UNIT: r.HARGA_UNIT || 0,
        PAYMENT_METODE: r.PAYMENT_METODE || "",
        TOTAL: r.TOTAL || 0,
        STATUS: r.STATUS || "",
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Data Toko");
      XLSX.writeFile(wb, `Export_Toko_${tokoName}.xlsx`);
    } catch (err) {
      console.error(err);
      alert("Gagal ekspor ke Excel");
    }
  };

  // ======================================================
  // EXPORT PDF
  // ======================================================
  const exportPDF = async () => {
    try {
      const table = document.getElementById("tokoTable");
      if (!table) {
        alert("Tabel tidak ditemukan untuk diekspor");
        return;
      }

      const canvas = await html2canvas(table, { scale: 1.5 });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      const imgWidth = pageWidth - 10; // margin
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let position = 5;
      pdf.addImage(imgData, "PNG", 5, position, imgWidth, imgHeight);
      pdf.save(`Export_Toko_${tokoName}.pdf`);
    } catch (err) {
      console.error(err);
      alert("Gagal ekspor ke PDF");
    }
  };

  // ======================================================
  // FORM INPUT (26 FIELD)
  // ======================================================
  return (
    <div className="p-4 bg-gray-100 rounded-xl shadow-md">
      <h2 className="text-xl font-bold mb-3">
        Dashboard Penjualan Toko – {tokoName}
      </h2>

      {/* ===================== FORM ===================== */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label>Tanggal Transaksi</label>
            <input
              type="date"
              name="TANGGAL_TRANSAKSI"
              value={form.TANGGAL_TRANSAKSI || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label>No Invoice (auto-generate jika kosong)</label>
            <input
              name="NO_INVOICE"
              value={form.NO_INVOICE || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              placeholder="INV-2025-00001"
            />
          </div>

          <div>
            <label>Nama User</label>
            <input
              name="NAMA_USER"
              value={form.NAMA_USER || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label>No HP User</label>
            <input
              name="NO_HP_USER"
              value={form.NO_HP_USER || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label>Nama PIC Toko</label>
            <input
              name="NAMA_PIC_TOKO"
              value={form.NAMA_PIC_TOKO || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label>Nama Sales</label>
            <input
              name="NAMA_SALES"
              value={form.NAMA_SALES || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label>Titipan / Referensi</label>
            <input
              name="TITIPAN_REFERENSI"
              value={form.TITIPAN_REFERENSI || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label>Nama Toko</label>
            <input
              name="NAMA_TOKO"
              value={form.NAMA_TOKO || tokoName}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label>Nama Brand</label>
            <input
              name="NAMA_BRAND"
              value={form.NAMA_BRAND || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label>Nama Barang</label>
            <input
              name="NAMA_BARANG"
              value={form.NAMA_BARANG || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label>Qty</label>
            <input
              type="number"
              name="QTY"
              value={form.QTY || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label>IMEI / No Dinamo / No Rangka</label>
            <input
              name="NOMOR_UNIK"
              value={form.NOMOR_UNIK || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              placeholder="Auto detect"
            />
          </div>

          <div>
            <label>Kategori Harga</label>
            <input
              name="KATEGORI_HARGA"
              value={form.KATEGORI_HARGA || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label>Harga Unit</label>
            <input
              type="number"
              name="HARGA_UNIT"
              value={form.HARGA_UNIT || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label>Payment Metode</label>
            <input
              name="PAYMENT_METODE"
              value={form.PAYMENT_METODE || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label>System Payment</label>
            <input
              name="SYSTEM_PAYMENT"
              value={form.SYSTEM_PAYMENT || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label>MDR</label>
            <input
              type="number"
              name="MDR"
              value={form.MDR || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label>Potongan MDR</label>
            <input
              type="number"
              name="POTONGAN_MDR"
              value={form.POTONGAN_MDR || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label>No Order / Kontrak</label>
            <input
              name="NO_ORDER_KONTRAK"
              value={form.NO_ORDER_KONTRAK || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label>Tenor</label>
            <input
              name="TENOR"
              value={form.TENOR || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label>DP Merchant</label>
            <input
              type="number"
              name="DP_USER_MERCHANT"
              value={form.DP_USER_MERCHANT || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label>DP ke Toko</label>
            <input
              type="number"
              name="DP_USER_TOKO"
              value={form.DP_USER_TOKO || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label>Request DP Talangan</label>
            <input
              type="number"
              name="REQUEST_DP_TALANGAN"
              value={form.REQUEST_DP_TALANGAN || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="col-span-3">
            <label>Keterangan</label>
            <textarea
              name="KETERANGAN"
              value={form.KETERANGAN || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label>Status</label>
            <select
              name="STATUS"
              value={form.STATUS || "Pending"}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            >
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleSave}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded flex items-center"
        >
          <FaPlus className="mr-2" /> {editId ? "Update" : "Tambah"} Data
        </button>
      </div>

      {/* ===================== FILTER ===================== */}
      <div className="flex items-center mb-4 space-x-3">
        <FaFilter />

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="semua">Semua</option>
          <option value="hari">Per Hari</option>
          <option value="bulan">Per Bulan</option>
          <option value="tahun">Per Tahun</option>
        </select>

        {filterType !== "semua" && (
          <input
            type="date"
            onChange={(e) => setFilterValue(e.target.value)}
            className="p-2 border rounded"
          />
        )}

        {/* EXPORT */}
        <div className="ml-auto flex items-center space-x-2">
          <button
            onClick={exportExcel}
            className="px-3 py-1 border rounded hover:bg-gray-200 text-sm"
          >
            <FaFileExcel className="inline mr-2" /> Excel
          </button>

          <button
            onClick={exportPDF}
            className="px-3 py-1 border rounded hover:bg-gray-200 text-sm"
          >
            <FaFilePdf className="inline mr-2" /> PDF
          </button>
        </div>
      </div>

      {/* ===================== TABLE ===================== */}
      <div className="bg-white rounded shadow overflow-x-auto" id="tokoTable">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="p-2 border">Tanggal</th>
              <th className="p-2 border">Invoice</th>
              <th className="p-2 border">User</th>
              <th className="p-2 border">Toko</th>
              <th className="p-2 border">Brand</th>
              <th className="p-2 border">Barang</th>
              <th className="p-2 border">Qty</th>
              <th className="p-2 border">Nomor IMEI</th>
              <th className="p-2 border">Harga</th>
              <th className="p-2 border">Payment</th>
              <th className="p-2 border">Total</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {paginated.map((r) => {
              const total = Number(r.TOTAL || 0);

              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="p-2 border">{r.TANGGAL_TRANSAKSI}</td>
                  <td className="p-2 border">{r.NO_INVOICE}</td>
                  <td className="p-2 border">{r.NAMA_USER}</td>
                  <td className="p-2 border">{r.TOKO || r.NAMA_TOKO}</td>
                  <td className="p-2 border">{r.NAMA_BRAND}</td>
                  <td className="p-2 border">{r.NAMA_BARANG}</td>
                  <td className="p-2 border text-center">{r.QTY}</td>
                  <td className="p-2 border">{r.NOMOR_UNIK}</td>
                  <td className="p-2 border text-right">
                    {Number(r.HARGA_UNIT || 0).toLocaleString()}
                  </td>
                  <td className="p-2 border">{r.PAYMENT_METODE}</td>
                  <td className="p-2 border text-right">
                    {total.toLocaleString()}
                  </td>
                  <td className="p-2 border">{r.STATUS}</td>

                  <td className="p-2 border text-center space-x-2">
                    <button
                      onClick={() => handleEdit(r)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <FaEdit />
                    </button>

                    <button
                      onClick={() => handleDelete(r.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <FaTrash />
                    </button>

                    <button
                      onClick={() => setDetailData(r)}
                      className="px-2 py-1 border rounded text-sm"
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ===================== PAGINATION ===================== */}
      <div className="flex justify-between items-center mt-3">
        <span>
          Halaman {currentPage} dari {totalPages}
        </span>

        <div>
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className="px-2 py-1 border rounded mr-2 disabled:opacity-40"
          >
            <FaChevronLeft />
          </button>

          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className="px-2 py-1 border rounded disabled:opacity-40"
          >
            <FaChevronRight />
          </button>
        </div>
      </div>

      {/* ===================== OMZET ===================== */}
      <div className="text-right mt-4 text-lg font-semibold">
        Total Omzet: Rp{" "}
        {filteredData
          .reduce((sum, r) => sum + Number(r.TOTAL || 0), 0)
          .toLocaleString("id-ID")}
      </div>

      {/* ===================== CHARTS ===================== */}
      <div className="grid grid-cols-2 gap-4 mt-6">
        {/* BAR CHART */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-3 text-center">
            Diagram Batang Omzet
          </h3>

          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={filteredData.map((r) => ({
                brand: r.NAMA_BRAND || "Unknown",
                omzet: Number(r.TOTAL || 0),
              }))}
            >
              <XAxis dataKey="brand" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="omzet" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* PIE CHART */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-3 text-center">Diagram Pie Omzet</h3>

          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={filteredData.map((r) => ({
                  brand: r.NAMA_BRAND || "Unknown",
                  omzet: Number(r.TOTAL || 0),
                }))}
                dataKey="omzet"
                nameKey="brand"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {filteredData.map((_, i) => (
                  <Cell
                    key={i}
                    fill={
                      ["#4F46E5", "#10B981", "#F59E0B", "#EF4444", "#3B82F6"][
                        i % 5
                      ]
                    }
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ===================== DETAIL MODAL ===================== */}
      {detailData && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white w-11/12 md:w-3/4 lg:w-2/3 p-4 rounded shadow-lg max-h-[80vh] overflow-auto">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">Detail Transaksi</h3>
              <button
                onClick={() => setDetailData(null)}
                className="px-2 py-1 border rounded"
              >
                Tutup
              </button>
            </div>

            <table className="w-full text-sm border-collapse">
              <tbody>
                {Object.entries(detailData).map(([key, value]) => {
                  if (key === "id") return null;
                  return (
                    <tr key={key} className="border-b">
                      <td className="p-2 font-semibold w-1/3">
                        {key.replace(/_/g, " ")}
                      </td>
                      <td className="p-2">{String(value ?? "")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
