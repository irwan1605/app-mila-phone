import React, { useEffect, useMemo, useState } from "react";
import {
  listenMasterKategoriBarang,
  listenMasterBarang,
  listenMasterBarangBundling,
  addMasterBarang, // ✅ TAMBAHKAN INI
  updateMasterBarang,
  deleteMasterBarangMasing,
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

// const BRAND_OPTIONS = [
//   "OFERO",
//   "UWNFLY",
//   "E NINE",
//   "ZXTEX",
//   "UNITED",
//   "RAKATA",
//   "OPPO",
//   "SAMSUNG",
//   "REALME",
//   "VIVO",
//   "IPHONE",
//   "ZTE NUBIA",
//   "XIOMI",
//   "INFINIX",
//   "OLIKE",
//   "ROBOT",
//   "BATERAI",
//   "CHARGER",
// ];

const fmt = (n) => Number(n || 0).toLocaleString("id-ID");

export default function MasterBarang() {
  const [search, setSearch] = useState("");
  const [showTambah, setShowTambah] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editData, setEditData] = useState(null);
  const TODAY = new Date().toISOString().slice(0, 10);
  const [isLoading, setIsLoading] = useState(true);

  const [kategoriList, setKategoriList] = useState([]);

  const [masterBarang, setMasterBarang] = useState([]);
  const [masterBundling, setMasterBundling] = useState([]);

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

    // === BUNDLING ===
    isBundling: false,
    bundlingItems: [], // [{ namaBarang, harga }]
  });

  useEffect(() => {
    // RESET dulu
    setForm((f) => ({
      ...f,
      isBundling: false,
      bundlingItems: [],
    }));

    // MOTOR & SEPEDA → bundling harga 0
    if (
      form.kategori === "MOTOR LISTRIK" ||
      form.kategori === "SEPEDA LISTRIK"
    ) {
      const bundlingList = masterBundling
        .filter((b) => b.kategoriBarang === form.kategori)
        .map((b) => ({
          namaBarang: b.namaBarang,
          harga: 0,
        }));

      setForm((f) => ({
        ...f,
        isBundling: true,
        bundlingItems: bundlingList,
      }));
    }

    // ACCESSORIES → harga dari master bundling
    if (form.kategori === "ACCESSORIES") {
      const bundlingList = masterBundling
        .filter((b) => b.kategoriBarang === "ACCESSORIES")
        .map((b) => ({
          namaBarang: b.namaBarang,
          harga: Number(b.hargaBundling || 0),
        }));

      if (bundlingList.length > 0) {
        setForm((f) => ({
          ...f,
          isBundling: true,
          bundlingItems: bundlingList,
        }));
      }
    }
  }, [form.kategori, masterBundling]);

  useEffect(() => {
    const unsub = listenMasterBarang(setMasterBarang);
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    const unsub = listenMasterBarangBundling(setMasterBundling);
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    const unsub = listenMasterKategoriBarang((rows) => {
      setKategoriList(rows || []);
    });
    return () => unsub && unsub();
  }, []);

  // useEffect(() => {
  //   if (
  //     form.kategori !== "SEPEDA LISTRIK" &&
  //     form.kategori !== "MOTOR LISTRIK"
  //   ) {
  //     setForm((prev) => ({
  //       ...prev,
  //       isBandling: false,
  //       tipeBandling: "",

  //       namaBandling1: "",
  //       hargaBandling1: "",
  //       namaBandling2: "",
  //       hargaBandling2: "",
  //       namaBandling3: "",
  //       hargaBandling3: "",
  //     }));
  //   }
  // }, [form.kategori]);

  // ================== REKAP MASTER BARANG ==================
  // ================== REKAP MASTER BARANG ==================
  const rekapMasterBarang = useMemo(() => {
    return masterBarang
      // ✅ hanya data dari Tambah Master Barang
      .filter((b) => b.CREATED_AT)
      .map((b) => {
        const srp =
          b.harga?.srp ??
          b.hargaSRP ??
          b.HARGA_SRP ??
          0;
  
        const grosir =
          b.harga?.grosir ??
          b.hargaGrosir ??
          b.HARGA_GROSIR ??
          0;
  
        const reseller =
          b.harga?.reseller ??
          b.hargaReseller ??
          b.HARGA_RESELLER ??
          0;
  
        return {
          id: b.id,
          key: b.id,
  
          // ✅ tanggal realtime
          tanggal: b.tanggal,
  
          brand: b.brand,
          kategori: b.kategoriBarang,
          barang: b.namaBarang,
  
          // ✅ harga realtime (FIX)
          hargaSRP: Number(srp),
          hargaGrosir: Number(grosir),
          hargaReseller: Number(reseller),
  
          IS_BUNDLING: Boolean(b.IS_BUNDLING),
          BUNDLING_ITEMS: Array.isArray(b.BUNDLING_ITEMS)
            ? b.BUNDLING_ITEMS
            : [],
        };
      });
  }, [masterBarang]);
  
  

  const filtered = useMemo(() => {
    if (!search) return rekapMasterBarang;

    const q = search.toLowerCase();
    return rekapMasterBarang.filter(
      (x) =>
        x.brand.toLowerCase().includes(q) ||
        x.barang.toLowerCase().includes(q) ||
        x.kategori.toLowerCase().includes(q)
    );
  }, [search, rekapMasterBarang]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filtered.slice(start, start + itemsPerPage);
  }, [filtered, currentPage]);

  // const namaBarangList = useMemo(() => {
  //   return masterBarang
  //     .filter((x) => x.barang)
  //     .map((x) => ({
  //       label: `${x.barang} (${x.brand})`,
  //       barang: x.barang,
  //       brand: x.brand,
  //       kategori: x.kategori,
  //     }));
  // }, [masterBarang]);

  const namaBarangByBrand = useMemo(() => {
    if (!form.brand || !form.kategori) return [];

    return masterBarang.filter(
      (x) =>
        x.kategoriBarang === form.kategori &&
        x.brand === form.brand &&
        x.namaBarang?.toUpperCase().startsWith(form.brand.toUpperCase())
    );
  }, [masterBarang, form.brand, form.kategori]);

  const brandList = useMemo(() => {
    if (!form.kategori) return [];

    const set = new Set();
    masterBarang.forEach((x) => {
      if (x.kategoriBarang === form.kategori && x.brand) {
        set.add(x.brand);
      }
    });

    return Array.from(set);
  }, [masterBarang, form.kategori]);

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
    if (!form.brand || !form.barang || !form.kategori) {
      alert("Lengkapi semua field wajib!");
      return;
    }

    const payload = {
      tanggal: form.tanggal, // YYYY-MM-DD (LOCK TODAY)
      brand: form.brand,
      namaBarang: form.barang,
      kategoriBarang: form.kategori,
    
      harga: {
        srp: Number(form.hargaSRP || 0),
        grosir: Number(form.hargaGrosir || 0),
        reseller: Number(form.hargaReseller || 0),
      },
    
      IS_BUNDLING: Boolean(form.isBundling),
      BUNDLING_ITEMS: form.isBundling ? form.bundlingItems : [],
    
      CREATED_AT: Date.now(),
    };
    

    try {
      // ⬇️ SIMPAN KE MASTER BARANG
      await addMasterBarang(payload);

      // pindah ke halaman terakhir
      const totalAfter = masterBarang.length + 1;
      const lastPage = Math.ceil(totalAfter / itemsPerPage);
      setCurrentPage(lastPage);

      showNotif("✅ Master Barang berhasil ditambahkan!");
      setShowTambah(false);
    } catch (err) {
      console.error(err);
      alert("Gagal menambahkan Master Barang");
    }
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
      `Yakin hapus Master Barang:\n\n${row.brand} - ${row.barang}?`
    );
    if (!confirmDelete) return;

    try {
      // 🔥 HAPUS SEKALI SAJA (MASTER BARANG)
      await deleteMasterBarangMasing(row.id);

      showNotif("🗑️ Master Barang berhasil dihapus!");
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus Master Barang");
    }
  };

  const submitEdit = async () => {
    if (!editData?.id) {
      alert("ID Master Barang tidak ditemukan");
      return;
    }

    const payload = {
      brand: editData.brand,
      namaBarang: editData.barang,
      kategoriBarang: editData.kategori,

      harga: {
        srp: Number(editData.hargaSRP || 0),
        grosir: Number(editData.hargaGrosir || 0),
        reseller: Number(editData.hargaReseller || 0),
      },

      // ===== BUNDLING (LEVEL ATAS) =====
      IS_BUNDLING: Boolean(editData.IS_BUNDLING),

      BUNDLING_ITEMS: Array.isArray(editData.BUNDLING_ITEMS)
        ? editData.BUNDLING_ITEMS
        : [],

      NAMA_BANDLING_1: editData.NAMA_BANDLING_1 || "",
      HARGA_BANDLING_1: Number(editData.HARGA_BANDLING_1 || 0),

      NAMA_BANDLING_2: editData.NAMA_BANDLING_2 || "",
      HARGA_BANDLING_2: Number(editData.HARGA_BANDLING_2 || 0),

      NAMA_BANDLING_3: editData.NAMA_BANDLING_3 || "",
      HARGA_BANDLING_3: Number(editData.HARGA_BANDLING_3 || 0),
    };

    try {
      // 🔥 UPDATE SEKALI SAJA
      await updateMasterBarang(editData.id, payload);

      showNotif("✅ Master Barang berhasil diperbarui (Realtime)");
      setShowEdit(false);
    } catch (err) {
      console.error(err);
      alert("Gagal memperbarui Master Barang");
    }
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
                <th className="p-2 border">Barang Bundling</th>

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
                  <td className="border p-2">
                    {x.BUNDLING_ITEMS.length === 0 ? (
                      <span className="text-slate-400 italic">—</span>
                    ) : (
                      <div className="space-y-1">
                        {x.BUNDLING_ITEMS.map((b, i) => (
                          <div
                            key={i}
                            className="flex justify-between gap-2 text-xs bg-slate-100 px-2 py-1 rounded"
                          >
                            <span>{b.namaBarang}</span>
                            <span className="font-semibold">
                              Rp {fmt(b.harga)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
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
                <label className="text-xs font-semibold">Nama Brand</label>
                <input
                  list="brand-master-list"
                  className="input"
                  placeholder={
                    form.kategori ? "Pilih Nama Brand" : "Pilih Kategori dulu"
                  }
                  disabled={!form.kategori}
                  value={form.brand}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      brand: e.target.value,
                      barang: "",
                      hargaSRP: "",
                      hargaGrosir: "",
                      hargaReseller: "",
                    })
                  }
                />

                <datalist id="brand-master-list">
                  {brandList.map((b, i) => (
                    <option key={i} value={b} />
                  ))}
                </datalist>
              </div>
              <div>
                <label className="text-xs font-semibold">Nama Barang</label>
                <input
                  list="nama-barang-brand-list"
                  className="input"
                  placeholder={
                    form.brand ? "Pilih Nama Barang" : "Pilih Brand dulu"
                  }
                  disabled={!form.brand}
                  value={form.barang}
                  onChange={(e) => {
                    const val = e.target.value;
                    const found = namaBarangByBrand.find(
                      (x) => x.namaBarang === val
                    );

                    setForm({
                      ...form,
                      barang: val,

                      // 🔥 AUTO ISI HARGA
                      hargaSRP: found?.harga?.srp || "",
                      hargaGrosir: found?.harga?.grosir || "",
                      hargaReseller: found?.harga?.reseller || "",
                    });
                  }}
                />

                <datalist id="nama-barang-brand-list">
                  {namaBarangByBrand.map((x) => (
                    <option key={x.id} value={x.namaBarang} />
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
            {form.isBundling && (
              <div className="mt-4">
                <label className="text-xs font-semibold">
                  Barang Bundling (otomatis dari Master Bundling)
                </label>

                <div className="mt-2 space-y-2">
                  {form.bundlingItems.map((b, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center bg-slate-100 px-3 py-2 rounded"
                    >
                      <span className="text-sm">{b.namaBarang}</span>
                      <span className="text-sm font-semibold">
                        Rp {Number(b.harga).toLocaleString("id-ID")}
                      </span>
                    </div>
                  ))}
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
                {/* <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                </div> */}

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
