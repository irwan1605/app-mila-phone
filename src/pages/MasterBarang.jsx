import React, { useEffect, useMemo, useState } from "react";
import {
  listenAllTransaksi,
  addTransaksi,
  updateTransaksi,
  deleteTransaksi,
} from "../services/FirebaseService";

import {
  FaEdit,
  FaTrash,
  FaSave,
  FaSearch,
  FaPlus,
  FaTimes,
  FaFileExcel,
} from "react-icons/fa";

import * as XLSX from "xlsx";

const KATEGORI_OPTIONS = [
  "SEPEDA LISTRIK",
  "MOTOR LISTRIK",
  "HANDPHONE",
  "ACCESORIES",
];

const BRAND_OPTIONS = [
  "OFERO",
  "UWNFLY",
  "E NINE",
  "ZXTEX",
  "UNITED",
  "RAKATA",
  "OPPO",
  "SAMSUNG",
  "REALME",
  "VIVO",
  "IPHONE",
  "ZTE NUBIA",
  "XIOMI",
  "INFINIX",
  "OLIKE",
  "ROBOT",
  "BATERAI",
  "CHARGER",
];

const fmt = (n) => Number(n || 0).toLocaleString("id-ID");

export default function MasterBarang() {
  const [allTransaksi, setAllTransaksi] = useState([]);
  const [search, setSearch] = useState("");
  const [showTambah, setShowTambah] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editData, setEditData] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [form, setForm] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    kategori: "",
    brand: "",
    barang: "",
    hargaSRP: "",
    hargaGrosir: "",
    hargaReseller: "",
  });

  // ✅ REALTIME FIREBASE
  useEffect(() => {
    const unsub = listenAllTransaksi((rows) => {
      setAllTransaksi(rows || []);
    });
    return () => unsub && unsub();
  }, []);

  // ================== REKAP MASTER BARANG ==================
  const masterBarang = useMemo(() => {
    const map = {};
    allTransaksi.forEach((t) => {
      const key = `${t.NAMA_BRAND}|${t.NAMA_BARANG}`;
      if (!map[key]) {
        map[key] = {
          key,
          tanggal: t.TANGGAL_TRANSAKSI,
          brand: t.NAMA_BRAND,
          kategori: t.KATEGORI_BRAND,
          barang: t.NAMA_BARANG,
          hargaSRP: Number(t.HARGA_SRP || t.HARGA_UNIT || 0),
          hargaGrosir: Number(t.HARGA_GROSIR || 0),
          hargaReseller: Number(t.HARGA_RESELLER || 0),
        };
      }
    });
    return Object.values(map);
  }, [allTransaksi]);

  const filtered = useMemo(() => {
    if (!search) return masterBarang;
    const q = search.toLowerCase();
    return masterBarang.filter(
      (x) =>
        x.brand.toLowerCase().includes(q) ||
        x.barang.toLowerCase().includes(q) ||
        x.kategori.toLowerCase().includes(q)
    );
  }, [search, masterBarang]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  // ================== EXPORT EXCEL ==================
  const exportExcel = () => {
    const rows = filtered.map((x, i) => ({
      No: i + 1,
      Tanggal: x.tanggal,
      Kategori: x.kategori,
      Brand: x.brand,
      Barang: x.barang,
      Harga_SRP: x.hargaSRP,
      Harga_Grosir: x.hargaGrosir,
      Harga_Reseller: x.hargaReseller,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MasterBarang");

    XLSX.writeFile(
      wb,
      `MasterBarang_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  // ================== TAMBAH MASTER BARANG ==================
  const submitTambah = async () => {
    if (!form.brand || !form.barang || !form.kategori) {
      alert("Lengkapi semua field wajib!");
      return;
    }

    const payload = {
      TANGGAL_TRANSAKSI: form.tanggal,
      NAMA_BRAND: form.brand,
      KATEGORI_BRAND: form.kategori,
      NAMA_BARANG: form.barang,
      HARGA_SRP: Number(form.hargaSRP || 0),
      HARGA_UNIT: Number(form.hargaSRP || 0),
      HARGA_GROSIR: Number(form.hargaGrosir || 0),
      HARGA_RESELLER: Number(form.hargaReseller || 0),
      QTY: 1,
      PAYMENT_METODE: "PEMBELIAN",
      STATUS: "Approved",
    };

    await addTransaksi(1, payload);

    alert("✅ Master Barang berhasil ditambahkan!");
    setShowTambah(false);
  };

  // ================== EDIT ==================
  const openEdit = (row) => {
    const sudahPembelian = allTransaksi.some(
      (t) =>
        t.NAMA_BRAND === row.brand &&
        t.NAMA_BARANG === row.barang &&
        t.PAYMENT_METODE === "PEMBELIAN"
    );

    setEditData({
      ...row,
      isLocked: sudahPembelian,
    });
    setShowEdit(true);
  };

  const submitEdit = async () => {
    const rows = allTransaksi.filter(
      (t) =>
        t.NAMA_BRAND === editData.brand && t.NAMA_BARANG === editData.barang
    );

    for (const r of rows) {
      await updateTransaksi(r.tokoId || 1, r.id, {
        TANGGAL_TRANSAKSI: editData.tanggal, // ✅ TANGGAL SEKARANG IKUT TERUPDATE
        HARGA_SRP: Number(editData.hargaSRP || 0),
        HARGA_UNIT: Number(editData.hargaSRP || 0),
        HARGA_GROSIR: Number(editData.hargaGrosir || 0),
        HARGA_RESELLER: Number(editData.hargaReseller || 0),
        KATEGORI_BRAND: editData.kategori,
        ...(editData.isLocked ? {} : { NAMA_BARANG: editData.barang }),
      });
    }

    alert("✅ Data berhasil diperbarui!");
    setShowEdit(false);
  };

  const deleteItem = async (row) => {
    if (!window.confirm("Hapus data ini?")) return;

    const rows = allTransaksi.filter(
      (t) => t.NAMA_BRAND === row.brand && t.NAMA_BARANG === row.barang
    );

    for (const r of rows) {
      await deleteTransaksi(r.tokoId || 1, r.id);
    }

    alert("✅ Data berhasil dihapus!");
  };

  // ================== UI ==================
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-600 via-blue-700 to-purple-700 p-6 text-white">
      <div className="max-w-7xl mx-auto bg-white/95 text-slate-800 rounded-2xl shadow-2xl p-6">
        <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
          <h2 className="text-2xl font-bold">MASTER BARANG</h2>

          <div className="flex gap-2">
            <div className="flex items-center bg-slate-100 px-3 py-2 rounded-full">
              <FaSearch className="text-gray-500" />
              <input
                className="ml-2 bg-transparent outline-none text-sm"
                placeholder="Cari brand / barang / kategori"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <button
              onClick={exportExcel}
              className="bg-emerald-600 text-white px-4 py-2 rounded-xl flex items-center"
            >
              <FaFileExcel className="mr-2" /> Excel
            </button>

            <button
              onClick={() => setShowTambah(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl flex items-center"
            >
              <FaPlus className="mr-2" /> Tambah
            </button>
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2 border">No</th>
                <th className="p-2 border">Tanggal</th>
                <th className="p-2 border">Kategori Brand</th>
                <th className="p-2 border">Nama Brand</th>
                <th className="p-2 border">Nama Barang</th>
                <th className="p-2 border text-right">Harga SRP</th>
                <th className="p-2 border text-right">Harga Grosir</th>
                <th className="p-2 border text-right">Harga Reseller</th>
                <th className="p-2 border">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginatedData.map((x, i) => (
                <tr key={x.key} className="hover:bg-slate-50">
                  <td className="border p-2 text-center">
                    {(currentPage - 1) * itemsPerPage + i + 1}
                  </td>
                  <td className="border p-2">{x.tanggal}</td>
                  <td className="border p-2">{x.kategori}</td>
                  <td className="border p-2">{x.brand}</td>
                  <td className="border p-2">{x.barang}</td>
                  <td className="border p-2 text-right">
                    Rp {fmt(x.hargaSRP)}
                  </td>
                  <td className="border p-2 text-right">
                    Rp {fmt(x.hargaGrosir)}
                  </td>
                  <td className="border p-2 text-right">
                    Rp {fmt(x.hargaReseller)}
                  </td>
                  <td className="border p-2 text-center space-x-2">
                    <button
                      onClick={() => openEdit(x)}
                      className="text-blue-600"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => deleteItem(x)}
                      className="text-rose-600"
                    >
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ✅ PAGINATION */}
        <div className="flex justify-between items-center mt-3 text-xs text-slate-600">
          <div>
            Halaman {currentPage} dari {totalPages}
          </div>
          <div className="flex gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 border rounded"
            >
              Prev
            </button>

            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i + 1)}
                className={`px-3 py-1 border rounded ${
                  currentPage === i + 1
                    ? "bg-indigo-600 text-white"
                    : "bg-white"
                }`}
              >
                {i + 1}
              </button>
            ))}

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 border rounded"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* ================= MODAL TAMBAH ================= */}
      {showTambah && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white text-slate-800 w-full max-w-md rounded-xl p-5">
            <h3 className="font-bold mb-3">Tambah Master Barang</h3>

            <div className="space-y-2">
              <input
                type="date"
                className="input"
                value={form.tanggal}
                onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
              />

              <select
                className="input"
                value={form.kategori}
                onChange={(e) => setForm({ ...form, kategori: e.target.value })}
              >
                <option value="">Pilih Kategori</option>
                {KATEGORI_OPTIONS.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>

              <input
                list="brand-list"
                placeholder="Nama Brand"
                className="input"
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
              />

              <input
                placeholder="Nama Barang"
                className="input"
                value={form.barang}
                onChange={(e) => setForm({ ...form, barang: e.target.value })}
              />

              <input
                placeholder="Harga SRP"
                type="number"
                className="input"
                value={form.hargaSRP}
                onChange={(e) => setForm({ ...form, hargaSRP: e.target.value })}
              />
              <input
                placeholder="Harga Grosir"
                type="number"
                className="input"
                value={form.hargaGrosir}
                onChange={(e) =>
                  setForm({ ...form, hargaGrosir: e.target.value })
                }
              />
              <input
                placeholder="Harga Reseller"
                type="number"
                className="input"
                value={form.hargaReseller}
                onChange={(e) =>
                  setForm({ ...form, hargaReseller: e.target.value })
                }
              />
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowTambah(false)}
                className="bg-gray-400 text-white px-3 py-1 rounded"
              >
                Batal
              </button>
              <button
                onClick={submitTambah}
                className="bg-indigo-600 text-white px-3 py-1 rounded flex items-center"
              >
                <FaSave className="mr-1" /> Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL EDIT ================= */}
      {showEdit && editData && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white text-slate-800 w-full max-w-md rounded-xl p-5">
            <h3 className="font-bold mb-3">Edit Master Barang</h3>

            <div className="space-y-2">
              {/* ✅ TANGGAL SEKARANG ADA */}
              <input
                type="date"
                className="input"
                value={editData.tanggal}
                onChange={(e) =>
                  setEditData({ ...editData, tanggal: e.target.value })
                }
              />

              <input
                disabled
                className="input bg-gray-100"
                value={editData.brand}
              />

              <input
                disabled={editData.isLocked}
                className={`input ${editData.isLocked ? "bg-gray-100" : ""}`}
                value={editData.barang}
                onChange={(e) =>
                  setEditData({ ...editData, barang: e.target.value })
                }
              />

              <select
                className="input"
                value={editData.kategori}
                onChange={(e) =>
                  setEditData({ ...editData, kategori: e.target.value })
                }
              >
                {KATEGORI_OPTIONS.map((x) => (
                  <option key={x}>{x}</option>
                ))}
              </select>

              <input
                type="number"
                className="input"
                value={editData.hargaSRP}
                onChange={(e) =>
                  setEditData({ ...editData, hargaSRP: e.target.value })
                }
              />
              <input
                type="number"
                className="input"
                value={editData.hargaGrosir}
                onChange={(e) =>
                  setEditData({ ...editData, hargaGrosir: e.target.value })
                }
              />
              <input
                type="number"
                className="input"
                value={editData.hargaReseller}
                onChange={(e) =>
                  setEditData({ ...editData, hargaReseller: e.target.value })
                }
              />
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowEdit(false)}
                className="bg-gray-400 text-white px-3 py-1 rounded"
              >
                Batal
              </button>
              <button
                onClick={submitEdit}
                className="bg-indigo-600 text-white px-3 py-1 rounded flex items-center"
              >
                <FaSave className="mr-1" /> Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .input {
          width: 100%;
          border: 1px solid #ccc;
          padding: 8px;
          border-radius: 8px;
          font-size: 14px;
        }
      `}</style>
    </div>
  );
}
