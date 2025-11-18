// src/pages/DataManagement.jsx — FINAL (Per-Toko, Realtime, Sinkron)
// Requirements: ../services/FirebaseService must export:
// listenTransaksiByToko(tokoId, callback), addTransaksi(tokoId, payload),
// updateTransaksi(tokoId, id, payload), deleteTransaksi(tokoId, id), getTokoName(optional)
// If any function missing, you'll see console warnings but UI fallbacks remain.

import React, { useEffect, useMemo, useState, useRef } from "react";
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
  FaCheckCircle,
  FaTimesCircle,
  FaFileExcel,
  FaFilePdf,
  FaFilter,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";

import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

/* === fallback toko names (same used in DashboardToko) === */
const fallbackTokoNames = [
  "CILANGKAP",
  "KONTEN LIVE",
  "GAS ALAM",
  "CITEUREUP",
  "CIRACAS",
  "METLAND 1",
  "METLAND 2",
  "PITARA",
  "KOTA WISATA",
  "SAWANGAN",
];

export default function DataManagement() {
  // selected tokoId (1-based). default null = pilih toko dulu
  const [tokoId, setTokoId] = useState(1);
  const [tokoName, setTokoName] = useState(fallbackTokoNames[0] || "Toko 1");

  // data for the selected toko
  const [data, setData] = useState([]);
  const [form, setForm] = useState({});
  const [editId, setEditId] = useState(null);

  // filters & pagination
  const [filterStatus, setFilterStatus] = useState("semua");
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;

  const tableRef = useRef(null);

  // subscribe realtime to selected toko
  useEffect(() => {
    let unsub = null;

    // try to get toko display name via getTokoName if available
    if (typeof getTokoName === "function") {
      getTokoName(tokoId)
        .then((name) => {
          if (name) setTokoName(name);
          else setTokoName(fallbackTokoNames[tokoId - 1] || `Toko ${tokoId}`);
        })
        .catch(() => {
          setTokoName(fallbackTokoNames[tokoId - 1] || `Toko ${tokoId}`);
        });
    } else {
      setTokoName(fallbackTokoNames[tokoId - 1] || `Toko ${tokoId}`);
    }

    if (typeof listenTransaksiByToko === "function") {
      try {
        unsub = listenTransaksiByToko(tokoId, (items = []) => {
          const formatted = (items || []).map((r) => normalizeRecord(r));
          setData(formatted);
          setCurrentPage(1);
        });
      } catch (e) {
        console.warn("listenTransaksiByToko failed:", e);
      }
    } else {
      console.warn("listenTransaksiByToko not found in FirebaseService");
      // keep data empty if no realtime function
      setData([]);
    }

    return () => {
      try {
        unsub && unsub();
      } catch (e) {}
    };
  }, [tokoId]);

  // Normalize record shape — ensure all expected fields exist
  const normalizeRecord = (r = {}) => {
    return {
      id: r.id ?? r._id ?? r.key ?? (Date.now().toString() + Math.random().toString(36).slice(2)),
      TANGGAL_TRANSAKSI: r.TANGGAL_TRANSAKSI || r.TANGGAL || "",
      NO_INVOICE: r.NO_INVOICE || "",
      NAMA_USER: r.NAMA_USER || "",
      NO_HP_USER: r.NO_HP_USER || "",
      NAMA_SALES_TOKO: r.NAMA_SALES_TOKO || "",
      NAMA_SALES: r.NAMA_SALES || "",
      TITIPAN_REFERENSI: r.TITIPAN_REFERENSI || "",
      NAMA_TOKO: r.NAMA_TOKO || r.TOKO || tokoName,
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

  // ---------------- helper: generate invoice similar to DashboardToko ----------------
  const generateInvoice = () => {
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    let maxSeq = 0;
    (data || []).forEach((r) => {
      if (r.NO_INVOICE && r.NO_INVOICE.startsWith(prefix)) {
        const seq = parseInt(r.NO_INVOICE.replace(prefix, ""), 10);
        if (!Number.isNaN(seq) && seq > maxSeq) maxSeq = seq;
      }
    });
    const next = String(maxSeq + 1).padStart(5, "0");
    return prefix + next;
  };

  // ---------------- helper: detect nomor unik ----------------
  const detectNomor = (val) => {
    if (!val) return { NOMOR_UNIK: "", IMEI: "", NO_DINAMO: "", NO_RANGKA: "" };
    const s = String(val).trim();
    const onlyDigits = /^\d+$/.test(s);
    if (onlyDigits && s.length >= 14 && s.length <= 17) {
      return { NOMOR_UNIK: s, IMEI: s, NO_DINAMO: "", NO_RANGKA: "" };
    }
    if (/[A-Za-z]/.test(s) && /[0-9]/.test(s) && s.length >= 6) {
      return { NOMOR_UNIK: s, IMEI: "", NO_DINAMO: "", NO_RANGKA: s };
    }
    return { NOMOR_UNIK: s, IMEI: "", NO_DINAMO: s, NO_RANGKA: "" };
  };

  // ---------------- handle form change ----------------
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const val = type === "number" ? (value === "" ? "" : Number(value)) : value;
    setForm((f) => ({ ...f, [name]: val }));
  };

  // ---------------- save (create / update) per-toko ----------------
  const handleSave = async () => {
    const tanggal = form.TANGGAL_TRANSAKSI || form.TANGGAL;
    const brand = form.NAMA_BRAND || form.BRAND;
    const hargaUnit = Number(form.HARGA_UNIT || form.HARGA || 0);

    if (!tanggal || !brand || !hargaUnit) {
      alert("Isi minimal: Tanggal Transaksi, Nama Brand, Harga Unit");
      return;
    }

    // infer nomor unik fields
    const nomor = detectNomor(form.NOMOR_UNIK || form.IMEI || "");
    const invoice = form.NO_INVOICE || generateInvoice();
    const qty = Number(form.QTY || 0);
    const total = qty * hargaUnit;

    const payload = {
      ...form,
      TANGGAL_TRANSAKSI: tanggal,
      NO_INVOICE: invoice,
      NAMA_BRAND: brand,
      HARGA_UNIT: hargaUnit,
      HARGA: hargaUnit,
      QTY: qty,
      TOTAL: total,
      NOMOR_UNIK: nomor.NOMOR_UNIK,
      IMEI: nomor.IMEI,
      NO_DINAMO: nomor.NO_DINAMO,
      NO_RANGKA: nomor.NO_RANGKA,
      MDR: Number(form.MDR || 0),
      POTONGAN_MDR: Number(form.POTONGAN_MDR || 0),
      DP_USER_MERCHANT: Number(form.DP_USER_MERCHANT || 0),
      DP_USER_TOKO: Number(form.DP_USER_TOKO || 0),
      REQUEST_DP_TALANGAN: Number(form.REQUEST_DP_TALANGAN || 0),
      STATUS: form.STATUS || "Pending",
      NAMA_TOKO: form.NAMA_TOKO || tokoName,
    };

    // normalize
    const rec = normalizeRecord(payload);

    try {
      if (editId) {
        // update per-toko
        if (typeof updateTransaksi === "function") {
          await updateTransaksi(tokoId, editId, rec);
        } else {
          console.warn("updateTransaksi not found");
        }
        // local optimistic update
        setData((d) => d.map((x) => (x.id === editId ? rec : x)));
      } else {
        // create new: addTransaksi(tokoId, payload)
        if (typeof addTransaksi === "function") {
          const res = await addTransaksi(tokoId, rec);
          // some implementations return id; if so, set it
          if (res && (res.id || res.key)) rec.id = res.id || res.key;
        } else {
          console.warn("addTransaksi not found");
        }
        setData((d) => [...d, rec]);
      }

      // reset form state
      setForm({});
      setEditId(null);
    } catch (err) {
      console.error("save error:", err);
      alert("Gagal menyimpan data. Cek console untuk detail.");
    }
  };

  // ---------------- edit (populate form) ----------------
  const handleEdit = (row) => {
    setForm({ ...row });
    setEditId(row.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ---------------- delete ----------------
  const handleDelete = async (id) => {
    if (!window.confirm("Yakin hapus data ini?")) return;
    try {
      if (typeof deleteTransaksi === "function") {
        await deleteTransaksi(tokoId, id);
      } else {
        console.warn("deleteTransaksi not found");
      }
      setData((d) => d.filter((r) => r.id !== id));
    } catch (err) {
      console.error("delete error:", err);
      alert("Gagal menghapus data.");
    }
  };

  // ---------------- approve/reject (status update) ----------------
  const handleApproval = async (id, status) => {
    try {
      // update per-toko
      if (typeof updateTransaksi === "function") {
        await updateTransaksi(tokoId, id, { STATUS: status });
      } else {
        console.warn("updateTransaksi not found");
      }
      setData((d) => d.map((r) => (r.id === id ? { ...r, STATUS: status } : r)));
    } catch (err) {
      console.error("approval error:", err);
      alert("Gagal mengubah status.");
    }
  };

  // ---------------- filters / pagination derived ----------------
  const filteredData = useMemo(() => {
    return data.filter((r) => {
      let ok = true;
      if (filterStatus !== "semua") ok = ok && r.STATUS === filterStatus;
      if (filterStartDate) {
        const start = new Date(filterStartDate).setHours(0, 0, 0, 0);
        const rowDate = new Date(r.TANGGAL_TRANSAKSI || r.TANGGAL || null);
        ok = ok && rowDate >= start;
      }
      if (filterEndDate) {
        const end = new Date(filterEndDate).setHours(23, 59, 59, 999);
        const rowDate = new Date(r.TANGGAL_TRANSAKSI || r.TANGGAL || null);
        ok = ok && rowDate <= end;
      }
      return ok;
    });
  }, [data, filterStatus, filterStartDate, filterEndDate]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages]);

  const paginated = filteredData.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const nextPage = () => currentPage < totalPages && setCurrentPage((p) => p + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage((p) => p - 1);

  // ---------------- export Excel & PDF ----------------
  const exportExcel = (rows = filteredData) => {
    try {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Transaksi");
      XLSX.writeFile(wb, `Transaksi_Toko_${tokoName}.xlsx`);
    } catch (e) {
      console.error("export excel failed", e);
      alert("Gagal ekspor Excel");
    }
  };

  const exportPDF = async (rows = filteredData) => {
    try {
      const table = tableRef.current;
      if (!table) {
        alert("Tabel tidak ditemukan");
        return;
      }
      const canvas = await html2canvas(table, { scale: 1.5 });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "mm", "a4");
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(img, "PNG", 0, 0, w, h);
      pdf.save(`Transaksi_Toko_${tokoName}.pdf`);
    } catch (e) {
      console.error("export pdf failed", e);
      alert("Gagal ekspor PDF");
    }
  };

  // ---------------- UI ----------------
  return (
    <div className="p-4 bg-gray-100 rounded-xl shadow-md">
      <h2 className="text-xl font-bold mb-3">Data Management — Toko {tokoName}</h2>

      {/* select toko (per-toko mode) */}
      <div className="flex items-center gap-3 mb-4">
        <label className="font-semibold">Pilih Toko:</label>
        <select
          value={tokoId}
          onChange={(e) => {
            setTokoId(Number(e.target.value));
            setEditId(null);
            setForm({});
          }}
          className="p-2 border rounded"
        >
          {fallbackTokoNames.map((n, idx) => (
            <option key={n} value={idx + 1}>
              {idx + 1} - {n}
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center space-x-2">
          <button onClick={() => exportExcel()} className="px-3 py-1 border rounded hover:bg-gray-200 text-sm">
            <FaFileExcel className="inline mr-2" /> Excel
          </button>
          <button onClick={() => exportPDF()} className="px-3 py-1 border rounded hover:bg-gray-200 text-sm">
            <FaFilePdf className="inline mr-2" /> PDF
          </button>
        </div>
      </div>

      {/* form */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Tanggal Transaksi" name="TANGGAL_TRANSAKSI" type="date" form={form} onChange={handleChange} />
          <Field label="No Invoice" name="NO_INVOICE" form={form} onChange={handleChange} placeholder="INV-YYYY-00001" />
          <Field label="Nama User" name="NAMA_USER" form={form} onChange={handleChange} />
          <Field label="No HP User" name="NO_HP_USER" form={form} onChange={handleChange} />
          <Field label="Nama Sales Toko" name="NAMA_SALES_TOKO" form={form} onChange={handleChange} />
          <Field label="Nama Sales" name="NAMA_SALES" form={form} onChange={handleChange} />
          <Field label="Titipan / Referensi" name="TITIPAN_REFERENSI" form={form} onChange={handleChange} />
          <Field label="Nama Toko" name="NAMA_TOKO" form={form} onChange={handleChange} type="select" options={fallbackTokoNames} />
          <Field label="Nama Brand" name="NAMA_BRAND" form={form} onChange={handleChange} />
          <Field label="Nama Barang" name="NAMA_BARANG" form={form} onChange={handleChange} />
          <Field label="Qty" name="QTY" type="number" form={form} onChange={handleChange} />
          <Field label="IMEI / No Dinamo / No Rangka" name="NOMOR_UNIK" form={form} onChange={handleChange} />
          <Field label="Kategori Harga" name="KATEGORI_HARGA" form={form} onChange={handleChange} />
          <Field label="Harga Unit" name="HARGA_UNIT" type="number" form={form} onChange={handleChange} />
          <Field label="Payment Metode" name="PAYMENT_METODE" form={form} onChange={handleChange} />
          <Field label="System Payment" name="SYSTEM_PAYMENT" form={form} onChange={handleChange} />
          <Field label="MDR" name="MDR" type="number" form={form} onChange={handleChange} />
          <Field label="Potongan MDR" name="POTONGAN_MDR" type="number" form={form} onChange={handleChange} />
          <Field label="No Order / Kontrak" name="NO_ORDER_KONTRAK" form={form} onChange={handleChange} />
          <Field label="Tenor" name="TENOR" form={form} onChange={handleChange} />
          <Field label="DP User Merchant" name="DP_USER_MERCHANT" type="number" form={form} onChange={handleChange} />
          <Field label="DP ke Toko" name="DP_USER_TOKO" type="number" form={form} onChange={handleChange} />
          <Field label="Request DP Talangan" name="REQUEST_DP_TALANGAN" type="number" form={form} onChange={handleChange} />
          <div className="col-span-3">
            <label className="block text-sm mb-1">Keterangan</label>
            <textarea name="KETERANGAN" value={form.KETERANGAN ?? ""} onChange={handleChange} className="w-full p-2 border rounded" />
          </div>

          <div>
            <label className="block text-sm mb-1">Status</label>
            <select name="STATUS" value={form.STATUS ?? "Pending"} onChange={handleChange} className="w-full p-2 border rounded">
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        <button onClick={handleSave} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded flex items-center">
          <FaPlus className="mr-2" /> {editId ? "Update" : "Tambah"} Data
        </button>
      </div>

      {/* filters */}
      <div className="flex items-center mb-4 gap-3">
        <FaFilter />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="p-2 border rounded">
          <option value="semua">Semua Status</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>

        <label className="text-sm">Dari:</label>
        <input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="p-2 border rounded" />
        <label className="text-sm">Sampai:</label>
        <input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="p-2 border rounded" />
        <div className="ml-auto text-sm">Total: {filteredData.length} data</div>
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
              <th className="p-2 border">Sales Toko</th>
              <th className="p-2 border">Sales</th>
              <th className="p-2 border">Referensi</th>
              <th className="p-2 border">Toko</th>
              <th className="p-2 border">Brand</th>
              <th className="p-2 border">Barang</th>
              <th className="p-2 border">Qty</th>
              <th className="p-2 border">No IMEI</th>
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
                <td className="p-2 border">{r.NAMA_SALES_TOKO}</td>
                <td className="p-2 border">{r.NAMA_SALES}</td>
                <td className="p-2 border">{r.TITIPAN_REFERENSI}</td>
                <td className="p-2 border">{r.NAMA_TOKO}</td>
                <td className="p-2 border">{r.NAMA_BRAND}</td>
                <td className="p-2 border">{r.NAMA_BARANG}</td>
                <td className="p-2 border text-center">{r.QTY}</td>
                <td className="p-2 border">{r.NOMOR_UNIK}</td>
                <td className="p-2 border text-right">{Number(r.HARGA_UNIT || 0).toLocaleString()}</td>
                <td className="p-2 border text-right">{Number(r.TOTAL || 0).toLocaleString()}</td>
                <td className={`p-2 border font-semibold ${r.STATUS === "Approved" ? "text-green-600" : r.STATUS === "Rejected" ? "text-red-600" : "text-yellow-600"}`}>
                  {r.STATUS}
                </td>
                <td className="p-2 border text-center space-x-2">
                  <button onClick={() => handleEdit(r)} className="text-blue-600 hover:text-blue-800" title="Edit">
                    <FaEdit />
                  </button>
                  <button onClick={() => handleDelete(r.id)} className="text-red-600 hover:text-red-800" title="Hapus">
                    <FaTrash />
                  </button>
                  <button onClick={() => handleApproval(r.id, "Approved")} className="text-green-600 hover:text-green-800" title="Approve">
                    <FaCheckCircle />
                  </button>
                  <button onClick={() => handleApproval(r.id, "Rejected")} className="text-orange-600 hover:text-orange-800" title="Reject">
                    <FaTimesCircle />
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
          <button onClick={prevPage} disabled={currentPage === 1} className="px-2 py-1 border rounded mr-2 disabled:opacity-40">
            <FaChevronLeft />
          </button>
          <button onClick={nextPage} disabled={currentPage === totalPages} className="px-2 py-1 border rounded disabled:opacity-40">
            <FaChevronRight />
          </button>
        </div>
      </div>
    </div>
  );
}

/* Simple reusable Field component */
function Field({ label, name, form, onChange, type = "text", options = [] }) {
  return (
    <div>
      <label className="block text-sm mb-1">{label}</label>
      {type === "select" ? (
        <select name={name} value={form[name] ?? ""} onChange={onChange} className="w-full p-2 border rounded">
          <option value="">Pilih</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : type === "textarea" ? (
        <textarea name={name} value={form[name] ?? ""} onChange={onChange} className="w-full p-2 border rounded" />
      ) : (
        <input type={type} name={name} value={form[name] ?? ""} onChange={onChange} className="w-full p-2 border rounded" />
      )}
    </div>
  );
}
