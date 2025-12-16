import React, { useEffect, useMemo, useState } from "react";
import {
  listenAllTransaksi,
  addTransaksi,
  updateTransaksi,
  deleteTransaksi,
  listenMasterKategoriBarang,
} from "../services/FirebaseService";

import {
  FaEdit,
  FaTrash,
  FaSave,
  FaSearch,
  FaPlus,
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
  const TODAY = new Date().toISOString().slice(0, 10);
  const [isLoading, setIsLoading] = useState(true);
  const [lastCount, setLastCount] = useState(0);
  const [kategoriList, setKategoriList] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [form, setForm] = useState({
    tanggal: TODAY,
    kategori: "",
    brand: "",
    barang: "",
    hargaSRP: "",
    hargaGrosir: "",
    hargaReseller: "",

    // ✅ TAMBAHAN UNTUK BANDLING
    isBandling: false,
    tipeBandling: "", // "1" | "2" | "3"
  });

  useEffect(() => {
    const unsub = listenMasterKategoriBarang((rows) => {
      setKategoriList(rows || []);
    });
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    if (lastCount === 0 && allTransaksi.length > 0) {
      setLastCount(allTransaksi.length);
      return;
    }

    if (allTransaksi.length > lastCount) {
      alert("✅ Data Master Barang bertambah (Realtime)");
    }

    if (allTransaksi.length < lastCount) {
      alert("🗑️ Data Master Barang berkurang (Realtime)");
    }

    setLastCount(allTransaksi.length);
  }, [allTransaksi, lastCount]);

  // =======================
  // ✅ REALTIME FIREBASE MASTER BARANG
  // =======================
  useEffect(() => {
    setIsLoading(true);

    const unsub = listenAllTransaksi((rows) => {
      setAllTransaksi(rows || []);
      setIsLoading(false);
    });

    return () => typeof unsub === "function" && unsub();
  }, []);

  useEffect(() => {
    if (
      form.kategori !== "SEPEDA LISTRIK" &&
      form.kategori !== "MOTOR LISTRIK"
    ) {
      setForm((prev) => ({
        ...prev,
        isBandling: false,
        tipeBandling: "",

        namaBandling1: "",
        hargaBandling1: "",
        namaBandling2: "",
        hargaBandling2: "",
        namaBandling3: "",
        hargaBandling3: "",
      }));
    }
  }, [form.kategori]);

  const counterKategori = useMemo(() => {
    const map = {};

    allTransaksi.forEach((t) => {
      const kat = t.KATEGORI_BRAND || "TANPA KATEGORI";
      const qty = Number(t.QTY || 0);
      const metode = (t.PAYMENT_METODE || "").toUpperCase();

      if (metode === "PEMBELIAN") {
        map[kat] = (map[kat] || 0) + qty;
      }

      if (metode === "PENJUALAN") {
        map[kat] = (map[kat] || 0) - qty;
      }
    });

    // ❗ Jangan sampai minus
    Object.keys(map).forEach((k) => {
      if (map[k] < 0) map[k] = 0;
    });

    return map;
  }, [allTransaksi]);

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

          // ✅ TAMBAHAN DATA BANDLING
          IS_BANDLING: t.IS_BANDLING || false,
          TIPE_BANDLING: t.TIPE_BANDLING || "",

          NAMA_BANDLING_1: t.NAMA_BANDLING_1 || "",
          HARGA_BANDLING_1: Number(t.HARGA_BANDLING_1 || 0),

          NAMA_BANDLING_2: t.NAMA_BANDLING_2 || "",
          HARGA_BANDLING_2: Number(t.HARGA_BANDLING_2 || 0),

          NAMA_BANDLING_3: t.NAMA_BANDLING_3 || "",
          HARGA_BANDLING_3: Number(t.HARGA_BANDLING_3 || 0),
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

  const namaBarangList = useMemo(() => {
    return masterBarang
      .filter((x) => x.barang)
      .map((x) => ({
        label: `${x.barang} (${x.brand})`,
        barang: x.barang,
        brand: x.brand,
        kategori: x.kategori,
      }));
  }, [masterBarang]);

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
  const [notif, setNotif] = useState({ show: false, message: "" });

  const showNotif = (message) => {
    setNotif({ show: true, message });
    setTimeout(() => setNotif({ show: false, message: "" }), 2000);
  };

  // ================== TAMBAH MASTER BARANG ==================
  const submitTambah = async () => {
    const sudahAda = allTransaksi.some(
      (t) =>
        t.NAMA_BRAND?.toLowerCase() === form.brand.toLowerCase() &&
        t.NAMA_BARANG?.toLowerCase() === form.barang.toLowerCase()
    );

    if (sudahAda) {
      return alert("❌ Barang dengan Brand & Nama ini sudah terdaftar!");
    }

    if (!form.brand || !form.barang || !form.kategori) {
      alert("Lengkapi semua field wajib!");
      return;
    }

    const payload = {
      TANGGAL_TRANSAKSI: form.tanggal,
      NAMA_BRAND: form.brand,
      KATEGORI_BRAND: form.kategori,
      NAMA_BARANG: form.barang,

      HARGA_SRP: form.isBandling ? 0 : Number(form.hargaSRP || 0),
      HARGA_UNIT: form.isBandling ? 0 : Number(form.hargaSRP || 0),
      HARGA_GROSIR: form.isBandling ? 0 : Number(form.hargaGrosir || 0),
      HARGA_RESELLER: form.isBandling ? 0 : Number(form.hargaReseller || 0),

      IS_BANDLING: form.isBandling,
      TIPE_BANDLING: form.tipeBandling,

      NAMA_BANDLING_1: form.namaBandling1 || "",
      HARGA_BANDLING_1: Number(form.hargaBandling1 || 0),

      NAMA_BANDLING_2: form.namaBandling2 || "",
      HARGA_BANDLING_2: Number(form.hargaBandling2 || 0),

      NAMA_BANDLING_3: form.namaBandling3 || "",
      HARGA_BANDLING_3: Number(form.hargaBandling3 || 0),

      QTY: 1,
      PAYMENT_METODE: "PEMBELIAN",
      STATUS: "Approved",
    };

    const totalAfter = masterBarang.length + 1;
    const lastPage = Math.ceil(totalAfter / itemsPerPage);
    setCurrentPage(lastPage);

    await addTransaksi(1, payload);

    showNotif("✅ Master Barang berhasil ditambahkan!");

    setShowTambah(false);
  };

  // ================== OPEN EDIT ==================
  const openEdit = (row) => {
    setEditData({
      ...row,

      // ✅ SIMPAN DATA ASLI (PENTING!)
      _originalBrand: row.brand,
      _originalBarang: row.barang,

      tanggal: row.tanggal || TODAY,
    });
    setShowEdit(true);
  };

  // ================== DELETE MASTER BARANG ==================
  const deleteItem = async (row) => {
    const confirmDelete = window.confirm(
      `Yakin hapus Master Barang:\n\n${row.brand} - ${row.barang} ?`
    );
    if (!confirmDelete) return;

    const rows = allTransaksi.filter(
      (t) => t.NAMA_BRAND === row.brand && t.NAMA_BARANG === row.barang
    );

    for (const r of rows) {
      await deleteTransaksi(r.tokoId || 1, r.id);
    }

    showNotif("🗑️ Master Barang berhasil dihapus!");
  };

  const submitEdit = async () => {
    if (!editData?._originalBrand || !editData?._originalBarang) {
      alert("Data referensi lama tidak ditemukan");
      return;
    }

    // ✅ CARI DATA BERDASARKAN NAMA LAMA
    const rows = allTransaksi.filter(
      (t) =>
        t.NAMA_BRAND === editData._originalBrand &&
        t.NAMA_BARANG === editData._originalBarang
    );

    if (!rows.length) {
      alert("Tidak ada data yang bisa diperbarui");
      return;
    }

    for (const r of rows) {
      await updateTransaksi(r.tokoId || 1, r.id, {
        TANGGAL_TRANSAKSI: editData.tanggal,

        // ✅ UPDATE KE NAMA BARU
        NAMA_BRAND: editData.brand,
        NAMA_BARANG: editData.barang,
        KATEGORI_BRAND: editData.kategori,

        HARGA_SRP: Number(editData.hargaSRP || 0),
        HARGA_UNIT: Number(editData.hargaSRP || 0),
        HARGA_GROSIR: Number(editData.hargaGrosir || 0),
        HARGA_RESELLER: Number(editData.hargaReseller || 0),

        NAMA_BANDLING_1: editData.NAMA_BANDLING_1 || "",
        HARGA_BANDLING_1: Number(editData.HARGA_BANDLING_1 || 0),

        NAMA_BANDLING_2: editData.NAMA_BANDLING_2 || "",
        HARGA_BANDLING_2: Number(editData.HARGA_BANDLING_2 || 0),

        NAMA_BANDLING_3: editData.NAMA_BANDLING_3 || "",
        HARGA_BANDLING_3: Number(editData.HARGA_BANDLING_3 || 0),
      });
    }

    showNotif("✅ Nama Brand & Nama Barang berhasil diperbarui (Realtime)");
    setShowEdit(false);
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

        {isLoading && (
          <div className="mb-3 text-sm text-indigo-600 font-semibold animate-pulse">
            🔄 Sinkronisasi data dengan MASTER DATA
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-3 text-xs font-semibold">
          {Object.entries(counterKategori).map(([kat, total]) => (
            <div
              key={kat}
              className="px-3 py-1 rounded-full bg-indigo-100 text-indigo-700"
            >
              {kat}: {total}
            </div>
          ))}
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
                <th className="p-2 border">Nama Bandling 1</th>
                <th className="p-2 border">Harga 1</th>
                <th className="p-2 border">Nama Bandling 2</th>
                <th className="p-2 border">Harga 2</th>
                <th className="p-2 border">Nama Bandling 3</th>
                <th className="p-2 border">Harga 3</th>

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
                  <td className="border p-2">{x.NAMA_BANDLING_1}</td>
                  <td className="border p-2 text-right">
                    Rp {fmt(x.HARGA_BANDLING_1)}
                  </td>

                  <td className="border p-2">{x.NAMA_BANDLING_2}</td>
                  <td className="border p-2 text-right">
                    Rp {fmt(x.HARGA_BANDLING_2)}
                  </td>

                  <td className="border p-2">{x.NAMA_BANDLING_3}</td>
                  <td className="border p-2 text-right">
                    Rp {fmt(x.HARGA_BANDLING_3)}
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

      {notif.show && (
        <div className="fixed top-5 right-5 bg-green-600 text-white px-4 py-2 rounded-xl shadow-lg z-[9999] animate-fade-in">
          {notif.message}
        </div>
      )}

      {/* ================= MODAL TAMBAH ================= */}
      {showTambah && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
          <div className="bg-white text-slate-800 w-full max-w-md rounded-xl p-5">
            <h3 className="font-bold mb-3">Tambah Master Barang</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold">TANGGAL</label>
                <input
                  type="date"
                  className="input"
                  value={form.tanggal}
                  min={TODAY}
                  max={TODAY}
                  readOnly
                />
              </div>
              <div>
                <label className="text-xs font-semibold">
                  {" "}
                  Kategori Barang
                </label>
                <select
                  className="input"
                  value={form.kategori}
                  onChange={(e) =>
                    setForm({ ...form, kategori: e.target.value })
                  }
                >
                  <option value="">Pilih Kategori</option>
                  {kategoriList.map((k) => (
                    <option key={k.id} value={k.namaKategori}>
                      {k.namaKategori}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold"> Nama Brand</label>
                <input
                  list="brand-list"
                  placeholder="Nama Brand"
                  className="input"
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Nama Barang</label>
                <input
                  list="nama-barang-list"
                  placeholder="Ketik atau pilih Nama Barang"
                  className="input"
                  value={form.barang}
                  onChange={(e) => {
                    const value = e.target.value;

                    // cek apakah cocok dengan master barang
                    const selected = namaBarangList.find(
                      (x) => x.barang.toLowerCase() === value.toLowerCase()
                    );

                    setForm({
                      ...form,
                      barang: value,
                      // 🔥 auto isi jika cocok, manual jika tidak
                      brand: selected?.brand || form.brand,
                      kategori: selected?.kategori || form.kategori,
                    });
                  }}
                />

                <datalist id="nama-barang-list">
                  {namaBarangList.map((x, i) => (
                    <option key={i} value={x.barang}>
                      {x.label}
                    </option>
                  ))}
                </datalist>
              </div>

              <div>
                <label className="text-xs font-semibold">Harga SRP</label>
                <input
                  placeholder="Harga SRP"
                  type="number"
                  className="input"
                  value={form.hargaSRP}
                  onChange={(e) =>
                    setForm({ ...form, hargaSRP: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-semibold"> Harga Grosir</label>
                <input
                  placeholder="Harga Grosir"
                  type="number"
                  className="input"
                  value={form.hargaGrosir}
                  onChange={(e) =>
                    setForm({ ...form, hargaGrosir: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-semibold">Harga Reseller</label>
                <input
                  placeholder="Harga Reseller"
                  type="number"
                  className="input"
                  value={form.hargaReseller}
                  onChange={(e) =>
                    setForm({ ...form, hargaReseller: e.target.value })
                  }
                />{" "}
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold">Barang Bandling </label>
            </div>
            {/* ✅ BANDLING KHUSUS SEPEDA & MOTOR */}
            {(form.kategori === "SEPEDA LISTRIK" ||
              form.kategori === "MOTOR LISTRIK") && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="text-xs font-semibold">
                    Bandling 1 (Nama)
                  </label>
                  <input
                    className="input"
                    value={form.namaBandling1}
                    onChange={(e) =>
                      setForm({ ...form, namaBandling1: e.target.value })
                    }
                  />

                  <input
                    type="number"
                    className="input mt-1"
                    placeholder="Harga Jual Bandling 1"
                    value={form.hargaBandling1}
                    onChange={(e) =>
                      setForm({ ...form, hargaBandling1: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold">
                    Bandling 2 (Nama)
                  </label>
                  <input
                    className="input"
                    value={form.namaBandling2}
                    onChange={(e) =>
                      setForm({ ...form, namaBandling2: e.target.value })
                    }
                  />
                  <input
                    type="number"
                    className="input mt-1"
                    placeholder="Harga Jual Bandling 2"
                    value={form.hargaBandling2}
                    onChange={(e) =>
                      setForm({ ...form, hargaBandling2: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold">
                    Bandling 3 (Nama)
                  </label>
                  <input
                    className="input"
                    value={form.namaBandling3}
                    onChange={(e) =>
                      setForm({ ...form, namaBandling3: e.target.value })
                    }
                  />
                  <input
                    type="number"
                    className="input mt-1"
                    placeholder="Harga Jual Bandling 3"
                    value={form.hargaBandling3}
                    onChange={(e) =>
                      setForm({ ...form, hargaBandling3: e.target.value })
                    }
                  />
                </div>
              </div>
            )}

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

      {/* ================= MODAL EDIT (LEBAR SAMPING, RESPONSIF) ================= */}
      {showEdit && editData && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-5xl bg-white text-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex flex-col md:flex-row">
              {/* LEFT: EDIT FORM */}
              <div className="w-full md:w-3/5 p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold">Edit Master Barang</h3>
                  <button
                    onClick={() => setShowEdit(false)}
                    className="text-slate-400 hover:text-slate-700"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-500">Tanggal</label>
                    <input
                      type="date"
                      className="input mt-1"
                      value={editData.tanggal}
                      onChange={(e) =>
                        setEditData({ ...editData, tanggal: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-500">Kategori</label>
                    <select
                      className="input mt-1"
                      disabled={editData.isLocked}
                      value={editData.kategori}
                      onChange={(e) =>
                        setEditData({ ...editData, kategori: e.target.value })
                      }
                    >
                      {KATEGORI_OPTIONS.map((x) => (
                        <option key={x} value={x}>
                          {x}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-slate-500">Nama Brand</label>
                    <input
                      className="input mt-1"
                      value={editData.brand}
                      onChange={(e) =>
                        setEditData({ ...editData, brand: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-500">
                      Nama Barang
                    </label>
                    <input
                      className="input mt-1"
                      value={editData.barang}
                      onChange={(e) =>
                        setEditData({ ...editData, barang: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-500">Harga SRP</label>
                    <input
                      type="number"
                      className="input mt-1"
                      value={editData.hargaSRP}
                      onChange={(e) =>
                        setEditData({ ...editData, hargaSRP: e.target.value })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-500">
                      Harga Grosir
                    </label>
                    <input
                      type="number"
                      className="input mt-1"
                      value={editData.hargaGrosir}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          hargaGrosir: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-500">
                      Harga Reseller
                    </label>
                    <input
                      type="number"
                      className="input mt-1"
                      value={editData.hargaReseller}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          hargaReseller: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                {/* Bandling edit — rapi di baris/kolom */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-slate-500">
                      Nama Bandling 1
                    </label>
                    <input
                      className="input mt-1"
                      value={editData.NAMA_BANDLING_1 || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          NAMA_BANDLING_1: e.target.value,
                        })
                      }
                    />
                    <label className="text-xs text-slate-500 mt-2">
                      Harga Bandling 1
                    </label>
                    <input
                      type="number"
                      className="input mt-1"
                      value={editData.HARGA_BANDLING_1 || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          HARGA_BANDLING_1: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-500">
                      Nama Bandling 2
                    </label>
                    <input
                      className="input mt-1"
                      value={editData.NAMA_BANDLING_2 || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          NAMA_BANDLING_2: e.target.value,
                        })
                      }
                    />
                    <label className="text-xs text-slate-500 mt-2">
                      Harga Bandling 2
                    </label>
                    <input
                      type="number"
                      className="input mt-1"
                      value={editData.HARGA_BANDLING_2 || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          HARGA_BANDLING_2: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-500">
                      Nama Bandling 3
                    </label>
                    <input
                      className="input mt-1"
                      value={editData.NAMA_BANDLING_3 || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          NAMA_BANDLING_3: e.target.value,
                        })
                      }
                    />
                    <label className="text-xs text-slate-500 mt-2">
                      Harga Bandling 3
                    </label>
                    <input
                      type="number"
                      className="input mt-1"
                      value={editData.HARGA_BANDLING_3 || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          HARGA_BANDLING_3: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() => setShowEdit(false)}
                    className="px-4 py-2 rounded-lg bg-gray-200 text-slate-700"
                  >
                    Batal
                  </button>
                  <button
                    onClick={submitEdit}
                    className="px-4 py-2 rounded-lg bg-indigo-600 text-white flex items-center"
                  >
                    <FaSave className="mr-2" /> Simpan
                  </button>
                </div>
              </div>

              {/* RIGHT: INFO SINGKAT / NOTE */}
              <div className="w-full md:w-2/5 p-6 bg-slate-50 border-l hidden md:block">
                <h4 className="text-sm font-semibold text-indigo-700 mb-3">
                  Catatan Edit
                </h4>
                <p className="text-sm text-slate-600">
                  Jika produk sudah memiliki pembelian tercatat, beberapa field
                  akan dikunci (tidak bisa diubah). Perubahan harga akan
                  diterapkan ke semua entri master barang yang relevan
                  (realtime).
                </p>

                <div className="mt-4 text-xs text-slate-400">
                  <div>
                    Tip: Gunakan preview untuk cek bandling sebelum menyimpan.
                  </div>
                </div>
              </div>
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
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0px);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
