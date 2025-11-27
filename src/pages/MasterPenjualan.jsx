// src/pages/MasterPenjualan.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  listenAllTransaksi,
  addTransaksi,
  updateTransaksi,
  deleteTransaksi,
} from "../services/FirebaseService";
import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";

// =========================
// KONSTANTA MDR PAYMENT METHOD
// =========================
const MDR_MAP = {
  "CASH TUNAI": 0,
  COD: 0,
  "TRANSFER KE MMT": 0,
  "QRIS BARCODE": 0,
  "DEBIT MESIN EDC": 0,
  "KARTU KREDIT MESIN EDC": 0,
  "BLIBLI INSTORE": 5,
  "AKULAKU BARCODE": 0,
  "AKULAKU MARKETPLACE": 5,
  "BLIBLI MARKET PLACE": 5,
  "TOKOPEDIA MARKETPLACE": 5,
  "LAZADA MARKETPLACE": 5,
  "TIKTOK MAERKETPLACE": 6,
  "SHOPEE MARKETPLACE": 6,
  "SHOPEE EDC": 0,
  "SHOPEE BARCODE": 0,
  "AEON ENINE": 0,
  "HOME CREDIT POLO": 0,
  "HOME CREDIT MARKETPLACE": 5,
  "KREDIVO BARCODE NON PROMO": 0,
  "KREDIVO BARCODE VOUCER PROMO": 5,
  "KREDIVO MARKETPLACE": 5,
  "ADIRA HIROTO": 0,
  SPEKTRA: 0,
  "TUKAR TAMBAH": 0,
  AVANTO: 0,
  "SAMSUNG FINANCE": 0,
};

const PAYMENT_METHOD_OPTIONS = Object.keys(MDR_MAP);

const TIPE_BAYAR_OPTIONS = ["CASH", "PIUTANG", "DEBIT CARD"];

const fmt = (v) =>
  Number(v || 0).toLocaleString("id-ID", {
    minimumFractionDigits: 0,
  });

export default function MasterPenjualan() {
  // =========================
  // STATE
  // =========================
  const [listPenjualan, setListPenjualan] = useState([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    // HEADER
    TANGGAL: "",
    NO_FAKTUR: "",
    NAMA_TOKO: "CILANGKAP PUSAT",
    ID_PELANGGAN: "",
    NAMA_PELANGGAN: "",
    NO_TLP: "",
    NAMA_SH: "",
    NAMA_SALES: "",
    STAFF: "",
    // BARANG
    KATEGORI_BARANG: "",
    NAMA_BRAND: "",
    NAMA_BARANG: "",
    IMEI: "",
    WARNA: "",
    QTY: "",
    HARGA_JUAL: "",
    TOTAL_ITEM: 0,
    // PEMBAYARAN
    TIPE_BAYAR: "",
    PAYMENT_METHOD: "",
    MDR: 0,
    STATUS: "LUNAS",
    KETERANGAN: "",
    // KOLOM TAMBAHAN BEBAS
    EXTRA_LABEL_1: "",
    EXTRA_VALUE_1: "",
    EXTRA_LABEL_2: "",
    EXTRA_VALUE_2: "",
  });

  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  // =========================
  // LISTENER FIREBASE REALTIME
  // =========================
  useEffect(() => {
    const unsub = listenAllTransaksi((itemsRaw = []) => {
      const items = Array.isArray(itemsRaw) ? itemsRaw : [];
      const normalized = items.map((r) => ({
        ...r,
        QTY: Number(r.QTY || 0),
        HARGA_JUAL: Number(r.HARGA_JUAL || 0),
        TOTAL_ITEM:
          Number(r.TOTAL_ITEM) ||
          Number(r.QTY || 0) * Number(r.HARGA_JUAL || 0),
      }));
      setListPenjualan(normalized);
    });

    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  // =========================
  // HITUNG MDR OTOMATIS
  // =========================
  useEffect(() => {
    const persen = MDR_MAP[form.PAYMENT_METHOD] ?? 0;
    setForm((prev) => ({ ...prev, MDR: persen }));
  }, [form.PAYMENT_METHOD]);

  // =========================
  // HITUNG TOTAL ITEM
  // =========================
  useEffect(() => {
    const total =
      Number(form.QTY || 0) * Number(form.HARGA_JUAL || 0);
    setForm((prev) => ({ ...prev, TOTAL_ITEM: total }));
  }, [form.QTY, form.HARGA_JUAL]);

  // =========================
  // GRAND TOTAL (SEMUA PENJUALAN YANG TERLIHAT)
  // =========================
  const filteredData = useMemo(() => {
    if (!search.trim()) return listPenjualan;
    const s = search.toLowerCase();
    return listPenjualan.filter((row) => {
      return (
        (row.NO_FAKTUR || "").toLowerCase().includes(s) ||
        (row.NAMA_PELANGGAN || "").toLowerCase().includes(s) ||
        (row.NAMA_BARANG || "").toLowerCase().includes(s) ||
        (row.IMEI || "").toLowerCase().includes(s) ||
        (row.NAMA_TOKO || "").toLowerCase().includes(s)
      );
    });
  }, [listPenjualan, search]);

  const grandTotal = useMemo(
    () =>
      filteredData.reduce(
        (sum, row) => sum + Number(row.TOTAL_ITEM || row.TOTAL || 0),
        0
      ),
    [filteredData]
  );

  // PAGINATION
  const totalPages = Math.max(
    1,
    Math.ceil(filteredData.length / rowsPerPage)
  );
  const currentPageRows = filteredData.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  // =========================
  // HANDLER
  // =========================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const resetForm = () => {
    setForm({
      TANGGAL: "",
      NO_FAKTUR: "",
      NAMA_TOKO: "CILANGKAP PUSAT",
      ID_PELANGGAN: "",
      NAMA_PELANGGAN: "",
      NO_TLP: "",
      NAMA_SH: "",
      NAMA_SALES: "",
      STAFF: "",
      KATEGORI_BARANG: "",
      NAMA_BRAND: "",
      NAMA_BARANG: "",
      IMEI: "",
      WARNA: "",
      QTY: "",
      HARGA_JUAL: "",
      TOTAL_ITEM: 0,
      TIPE_BAYAR: "",
      PAYMENT_METHOD: "",
      MDR: 0,
      STATUS: "LUNAS",
      KETERANGAN: "",
      EXTRA_LABEL_1: "",
      EXTRA_VALUE_1: "",
      EXTRA_LABEL_2: "",
      EXTRA_VALUE_2: "",
    });
    setIsEditing(false);
    setEditId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.TANGGAL || !form.NO_FAKTUR || !form.NAMA_BARANG) {
      alert("Tanggal, No Faktur, dan Nama Barang wajib diisi");
      return;
    }

    const payload = {
      ...form,
      QTY: Number(form.QTY || 0),
      HARGA_JUAL: Number(form.HARGA_JUAL || 0),
      TOTAL_ITEM:
        Number(form.QTY || 0) * Number(form.HARGA_JUAL || 0),
      TOTAL: Number(form.TOTAL_ITEM || 0),
    };

    try {
      setLoading(true);
      if (isEditing && editId) {
        await updateTransaksi(editId, payload);
        alert("Data penjualan berhasil diupdate");
      } else {
        await addTransaksi(payload);
        alert("Data penjualan berhasil disimpan");
      }
      resetForm();
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan data penjualan");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (row) => {
    setForm({
      TANGGAL: row.TANGGAL || row.TANGGAL_TRANSAKSI || "",
      NO_FAKTUR: row.NO_FAKTUR || row.NO_INVOICE || "",
      NAMA_TOKO: row.NAMA_TOKO || "CILANGKAP PUSAT",
      ID_PELANGGAN: row.ID_PELANGGAN || "",
      NAMA_PELANGGAN: row.NAMA_PELANGGAN || "",
      NO_TLP: row.NO_TLP || "",
      NAMA_SH: row.NAMA_SH || "",
      NAMA_SALES: row.NAMA_SALES || "",
      STAFF: row.STAFF || "",
      KATEGORI_BARANG: row.KATEGORI_BARANG || "",
      NAMA_BRAND: row.NAMA_BRAND || "",
      NAMA_BARANG: row.NAMA_BARANG || "",
      IMEI: row.IMEI || "",
      WARNA: row.WARNA || "",
      QTY: row.QTY || "",
      HARGA_JUAL: row.HARGA_JUAL || "",
      TOTAL_ITEM: row.TOTAL_ITEM || row.TOTAL || 0,
      TIPE_BAYAR: row.TIPE_BAYAR || "",
      PAYMENT_METHOD: row.PAYMENT_METHOD || "",
      MDR: row.MDR || MDR_MAP[row.PAYMENT_METHOD] || 0,
      STATUS: row.STATUS || "LUNAS",
      KETERANGAN: row.KETERANGAN || "",
      EXTRA_LABEL_1: row.EXTRA_LABEL_1 || "",
      EXTRA_VALUE_1: row.EXTRA_VALUE_1 || "",
      EXTRA_LABEL_2: row.EXTRA_LABEL_2 || "",
      EXTRA_VALUE_2: row.EXTRA_VALUE_2 || "",
    });
    setIsEditing(true);
    setEditId(row.id);
  };

  const handleDelete = async (row) => {
    if (!window.confirm("Yakin hapus penjualan ini?")) return;
    try {
      setLoading(true);
      await deleteTransaksi(row.id);
      alert("Data penjualan berhasil dihapus");
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus data penjualan");
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // RENDER
  // =========================
  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* HEADER */}
        <div className="bg-white rounded-2xl shadow p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Master Penjualan
            </h1>
            <p className="text-xs text-slate-500">
              Terhubung realtime ke Firebase. MDR otomatis berdasarkan
              Payment Method.
            </p>
          </div>
          <div className="text-xs text-slate-500">
            Grand Total Penjualan:{" "}
            <span className="font-bold text-indigo-600">
              Rp {fmt(grandTotal)}
            </span>
          </div>
        </div>

        {/* FORM */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow p-4 space-y-4"
        >
          {/* BARIS 1 – HEADER */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-slate-600">Tanggal</label>
              <input
                type="date"
                name="TANGGAL"
                value={form.TANGGAL}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">
                No Faktur / Invoice
              </label>
              <input
                name="NO_FAKTUR"
                value={form.NO_FAKTUR}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">Nama Toko</label>
              <input
                name="NAMA_TOKO"
                value={form.NAMA_TOKO}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-slate-100"
                readOnly
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">
                ID Pelanggan
              </label>
              <input
                name="ID_PELANGGAN"
                value={form.ID_PELANGGAN}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* BARIS 2 – PELANGGAN & SALES */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-slate-600">
                Nama Pelanggan
              </label>
              <input
                name="NAMA_PELANGGAN"
                value={form.NAMA_PELANGGAN}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">No Telepon</label>
              <input
                name="NO_TLP"
                value={form.NO_TLP}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">Nama SH</label>
              <input
                name="NAMA_SH"
                value={form.NAMA_SH}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">
                Nama SALES
              </label>
              <input
                name="NAMA_SALES"
                value={form.NAMA_SALES}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* BARIS 3 – STAFF & BARANG */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-slate-600">STAFF</label>
              <input
                name="STAFF"
                value={form.STAFF}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">
                Kategori Barang
              </label>
              <input
                name="KATEGORI_BARANG"
                value={form.KATEGORI_BARANG}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">Nama Brand</label>
              <input
                name="NAMA_BRAND"
                value={form.NAMA_BRAND}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">Nama Barang</label>
              <input
                name="NAMA_BARANG"
                value={form.NAMA_BARANG}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>

          {/* BARIS 4 – IMEI, WARNA, QTY, HARGA */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-slate-600">IMEI</label>
              <input
                name="IMEI"
                value={form.IMEI}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">Warna</label>
              <input
                name="WARNA"
                value={form.WARNA}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">QTY</label>
              <input
                type="number"
                name="QTY"
                value={form.QTY}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm text-right"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">
                Harga Penjualan
              </label>
              <input
                type="number"
                name="HARGA_JUAL"
                value={form.HARGA_JUAL}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm text-right"
              />
            </div>
          </div>

          {/* BARIS 5 – PEMBAYARAN */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-slate-600">Tipe Bayar</label>
              <select
                name="TIPE_BAYAR"
                value={form.TIPE_BAYAR}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">- Pilih -</option>
                {TIPE_BAYAR_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-600">
                Payment Methode
              </label>
              <select
                name="PAYMENT_METHOD"
                value={form.PAYMENT_METHOD}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="">- Pilih -</option>
                {PAYMENT_METHOD_OPTIONS.map((pm) => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-600">MDR (%)</label>
              <input
                readOnly
                value={form.MDR}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-slate-100"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">Status</label>
              <select
                name="STATUS"
                value={form.STATUS}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="LUNAS">LUNAS</option>
                <option value="PIUTANG">PIUTANG</option>
              </select>
            </div>
          </div>

          {/* BARIS 6 – KETERANGAN & KOLOM TAMBAHAN */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-600">
                Keterangan
              </label>
              <input
                name="KETERANGAN"
                value={form.KETERANGAN}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">
                Kolom Tambahan 1 (Nama)
              </label>
              <input
                name="EXTRA_LABEL_1"
                value={form.EXTRA_LABEL_1}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <input
                placeholder="Isi nilai"
                name="EXTRA_VALUE_1"
                value={form.EXTRA_VALUE_1}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">
                Kolom Tambahan 2 (Nama)
              </label>
              <input
                name="EXTRA_LABEL_2"
                value={form.EXTRA_LABEL_2}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
              <input
                placeholder="Isi nilai"
                name="EXTRA_VALUE_2"
                value={form.EXTRA_VALUE_2}
                onChange={handleChange}
                className="w-full border rounded-lg px-3 py-2 text-sm mt-1"
              />
            </div>
          </div>

          {/* BARIS 7 – TOTAL ITEM + BUTTON */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
            <div className="text-sm text-slate-600">
              TOTAL ITEM:{" "}
              <span className="font-bold text-indigo-600">
                Rp {fmt(form.TOTAL_ITEM)}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg"
              >
                <FaPlus />
                {isEditing ? "UPDATE PENJUALAN" : "SIMPAN PENJUALAN"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="text-sm px-4 py-2 rounded-lg border"
              >
                Reset
              </button>
            </div>
          </div>
        </form>

        {/* TABEL PENJUALAN */}
        <div className="bg-white rounded-2xl shadow p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="font-semibold text-slate-800">
              Data Penjualan
            </h2>
            <div className="flex items-center gap-2">
              <FaSearch className="text-slate-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="border rounded-lg px-3 py-2 text-sm"
                placeholder="Cari faktur / pelanggan / barang / IMEI..."
              />
            </div>
          </div>

          {/* INFO GRAND TOTAL & NAV PAGE */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs text-slate-600">
            <span>
              Total data:{" "}
              <b>{filteredData.length}</b> | Grand Total:{" "}
              <b>Rp {fmt(grandTotal)}</b>
            </span>
            <span>
              Halaman {page} dari {totalPages}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm border">
              <thead className="bg-indigo-600 text-white">
                <tr>
                  <th className="p-2 border">No</th>
                  <th className="p-2 border">Tanggal</th>
                  <th className="p-2 border">No Faktur</th>
                  <th className="p-2 border">Toko</th>
                  <th className="p-2 border">Pelanggan</th>
                  <th className="p-2 border">Barang</th>
                  <th className="p-2 border">IMEI</th>
                  <th className="p-2 border">Qty</th>
                  <th className="p-2 border">Harga</th>
                  <th className="p-2 border">Total</th>
                  <th className="p-2 border">Status</th>
                  <th className="p-2 border">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {currentPageRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={12}
                      className="text-center p-4 text-slate-500"
                    >
                      Tidak ada data penjualan.
                    </td>
                  </tr>
                ) : (
                  currentPageRows.map((row, idx) => (
                    <tr key={row.id || idx} className="hover:bg-slate-50">
                      <td className="border p-2 text-center">
                        {(page - 1) * rowsPerPage + idx + 1}
                      </td>
                      <td className="border p-2">
                        {row.TANGGAL || row.TANGGAL_TRANSAKSI}
                      </td>
                      <td className="border p-2">
                        {row.NO_FAKTUR || row.NO_INVOICE}
                      </td>
                      <td className="border p-2">
                        {row.NAMA_TOKO || "CILANGKAP PUSAT"}
                      </td>
                      <td className="border p-2">
                        {row.NAMA_PELANGGAN}
                      </td>
                      <td className="border p-2">{row.NAMA_BARANG}</td>
                      <td className="border p-2 font-mono">{row.IMEI}</td>
                      <td className="border p-2 text-center">{row.QTY}</td>
                      <td className="border p-2 text-right">
                        Rp {fmt(row.HARGA_JUAL)}
                      </td>
                      <td className="border p-2 text-right">
                        Rp {fmt(row.TOTAL_ITEM || row.TOTAL)}
                      </td>
                      <td className="border p-2">{row.STATUS}</td>
                      <td className="border p-2 text-center">
                        <div className="flex gap-2 justify-center">
                          <button
                            type="button"
                            onClick={() => handleEdit(row)}
                            className="text-blue-600"
                          >
                            <FaEdit />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(row)}
                            className="text-red-600"
                          >
                            <FaTrash />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINATION */}
          <div className="flex justify-end items-center gap-2 mt-3 text-xs">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-2 py-1 border rounded disabled:opacity-40 flex items-center gap-1"
            >
              <FaChevronLeft /> Prev
            </button>
            <span>
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() =>
                setPage((p) => Math.min(totalPages, p + 1))
              }
              className="px-2 py-1 border rounded disabled:opacity-40 flex items-center gap-1"
            >
              Next <FaChevronRight />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
