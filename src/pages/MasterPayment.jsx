// src/pages/MasterPayment.jsx
// MASTER PAYMENT - FINAL TUNTAS TANPA ERROR

import React, { useEffect, useMemo, useState } from "react";
import { db } from "../FirebaseInit";
import { ref, onValue, push, set, update, remove } from "firebase/database";
import * as XLSX from "xlsx";

import { FaSearch, FaEdit, FaTrash, FaPlus, FaFileExcel } from "react-icons/fa";

// ===================== OPTIONS =====================
const PAYMENT_METODE_OPTIONS = ["CASH", "VOUCHER", "PIUTANG"];

const NAMA_LEASING_OPTIONS = [
  "COD",
  "QRIS BARCODE",
  "DEBIT MESIN EDC",
  "KARTU KREDIT",
  "MESIN EDC",
  "BLIBLI INSTORE",
  "AKULAKU BARCODE",
  "AKULAKU MARKETPLACE",
  "BLIBLI MARKETPLACE",
  "TOKOPEDIA MARKETPLACE",
  "LAZADA MARKETPLACE",
  "TIKTOK MARKETPLACE",
  "SHOPEE MARKETPLACE",
  "SHOPEE EDC",
  "SHOPEE BARCODE",
  "AEON ENGINE",
  "HOME CREDIT POLO",
  "HOME CREDIT MARKETPLACE",
  "KREDIVO BARCODE NON PROMO",
  "KREDIVO BARCODE VOUCHER PROMO",
  "KREDIVO MARKETPLACE",
  "ADIRA HIROTO",
  "SPEKTRA",
  "TUKAR TAMBAH",
  "AVANTO",
  "SAMSUNG FINANCE",
];

const initialForm = {
  paymentMetode: "",
  namaLeasing: "",
  mdr: "",
  tenor: "",
  mpProteck: "",
};

// ===================== COMPONENT =====================
export default function MasterPayment() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const basePath = "dataManagement/masterPayment";

  // ===================== REALTIME LISTENER =====================
  useEffect(() => {
    const r = ref(db, basePath);
    const unsub = onValue(
      r,
      (snap) => {
        const raw = snap.val() || {};
        const arr = Object.entries(raw).map(([id, v]) => ({
          id,
          ...v,
        }));
        setRows(arr);
        setLoading(false);
      },
      () => setRows([])
    );

    return () => unsub && unsub();
  }, []);

  // ===================== FORM HANDLER =====================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditId(null);
  };

  // ===================== SAVE =====================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.paymentMetode || !form.namaLeasing) {
      alert("PAYMENT METODE dan NAMA LEASING wajib diisi!");
      return;
    }

    const payload = {
      paymentMetode: form.paymentMetode.toUpperCase(),
      namaLeasing: form.namaLeasing.toUpperCase(),
      mdr: form.mdr,
      tenor: form.tenor,
      mpProteck: form.mpProteck,
      updatedAt: new Date().toISOString(),
    };

    try {
      if (editId) {
        await update(ref(db, `${basePath}/${editId}`), payload);
      } else {
        const r = push(ref(db, basePath));
        await set(r, {
          ...payload,
          id: r.key,
          createdAt: new Date().toISOString(),
        });
      }

      resetForm();
    } catch (err) {
      console.error("GAGAL SIMPAN MASTER PAYMENT:", err);
    }
  };

  // ===================== EDIT =====================
  const handleEdit = (row) => {
    setForm({
      paymentMetode: row.paymentMetode || "",
      namaLeasing: row.namaLeasing || "",
      mdr: row.mdr || "",
      tenor: row.tenor || "",
      mpProteck: row.mpProteck || "",
    });
    setEditId(row.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ===================== DELETE =====================
  const handleDelete = async (row) => {
    if (!window.confirm("Yakin hapus MASTER PAYMENT ini?")) return;
    try {
      await remove(ref(db, `${basePath}/${row.id}`));
    } catch (err) {
      console.error("GAGAL HAPUS:", err);
    }
  };

  // ===================== FILTER =====================
  const filteredRows = useMemo(() => {
    if (!search) return rows;
    const s = search.toLowerCase();
    return rows.filter((r) =>
      [r.paymentMetode, r.namaLeasing, r.mdr, r.tenor, r.mpProteck]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(s))
    );
  }, [rows, search]);

  // ===================== EXPORT EXCEL =====================
  const exportExcel = () => {
    const data = filteredRows.map((r, i) => ({
      NO: i + 1,
      "PAYMENT METODE": r.paymentMetode,
      "NAMA LEASING": r.namaLeasing,
      "MDR %": r.mdr,
      TENOR: r.tenor,
      "MP PROTECK": r.mpProteck,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MASTER_PAYMENT");
    XLSX.writeFile(wb, "MASTER_PAYMENT.xlsx");
  };

  // ===================== UI =====================
  return (
    <div className="p-4 bg-gradient-to-br from-indigo-50 via-sky-50 to-purple-100 min-h-screen">
      <h1 className="text-3xl font-extrabold mb-4">MASTER PAYMENT</h1>

      {/* SEARCH + EXPORT */}
      <div className="flex gap-3 mb-4">
        <div className="flex items-center bg-white rounded px-3 py-2 border">
          <FaSearch className="mr-2" />
          <input
            placeholder="Cari data..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="outline-none"
          />
        </div>
        <button
          onClick={exportExcel}
          className="bg-emerald-600 text-white px-4 py-2 rounded flex items-center gap-2"
        >
          <FaFileExcel /> Export
        </button>
      </div>

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="bg-white p-4 rounded shadow mb-6 grid grid-cols-1 md:grid-cols-3 gap-3"
      >
        <input
          list="paymentMetodeList"
          name="paymentMetode"
          value={form.paymentMetode}
          onChange={handleChange}
          placeholder="PAYMENT METODE"
          className="border p-2 rounded"
        />
        <datalist id="paymentMetodeList">
          {PAYMENT_METODE_OPTIONS.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>

        <input
          list="namaLeasingList"
          name="namaLeasing"
          value={form.namaLeasing}
          onChange={handleChange}
          placeholder="NAMA LEASING"
          className="border p-2 rounded"
        />
        <datalist id="namaLeasingList">
          {NAMA_LEASING_OPTIONS.map((o) => (
            <option key={o} value={o} />
          ))}
        </datalist>

        <input
          name="mdr"
          value={form.mdr}
          onChange={handleChange}
          placeholder="MDR %"
          className="border p-2 rounded"
        />
        <input
          name="tenor"
          value={form.tenor}
          onChange={handleChange}
          placeholder="TENOR"
          className="border p-2 rounded"
        />
        <input
          name="mpProteck"
          value={form.mpProteck}
          onChange={handleChange}
          placeholder="MP PROTECK"
          className="border p-2 rounded"
        />

        <button
          type="submit"
          className="col-span-1 md:col-span-3 bg-indigo-600 text-white py-2 rounded flex items-center justify-center gap-2"
        >
          <FaPlus />
          {editId ? "UPDATE" : "TAMBAH"}
        </button>
      </form>

      {/* TABLE */}
      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-indigo-600 text-white">
            <tr>
              <th className="p-2">NO</th>
              <th className="p-2">PAYMENT METODE</th>
              <th className="p-2">NAMA LEASING</th>
              <th className="p-2">MDR %</th>
              <th className="p-2">TENOR</th>
              <th className="p-2">MP PROTECK</th>
              <th className="p-2">AKSI</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="p-4 text-center">
                  Loading...
                </td>
              </tr>
            ) : filteredRows.length === 0 ? (
              <tr>
                <td colSpan="7" className="p-4 text-center">
                  Data kosong
                </td>
              </tr>
            ) : (
              filteredRows.map((row, i) => (
                <tr key={row.id} className="border-t">
                  <td className="p-2 text-center">{i + 1}</td>
                  <td className="p-2">{row.paymentMetode}</td>
                  <td className="p-2">{row.namaLeasing}</td>
                  <td className="p-2 text-center">{row.mdr}</td>
                  <td className="p-2 text-center">{row.tenor}</td>
                  <td className="p-2 text-center">{row.mpProteck}</td>
                  <td className="p-2 text-center flex justify-center gap-2">
                    <button
                      onClick={() => handleEdit(row)}
                      className="text-blue-600"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDelete(row)}
                      className="text-red-600"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
