import React, { useEffect, useState } from "react";
import { onValue, ref, off } from "firebase/database";
import {
  addMasterBarang,
  updateMasterBarang,
  deleteMasterBarangMasing,
} from "../../services/FirebaseService";
import { db } from "../../firebase/FirebaseInit";
import { exportToExcel } from "../../utils/exportToExcel";
import ImportMasterMotorExcel from "../../features/masterBarang/importMotor/ImportMasterMotorExcel";

export default function MasterBarangKategoriCard({ kategori }) {
  // ===============================
  // STATE FORM
  // ===============================
  const [barang, setBarang] = useState({
    brand: "",
    namaBarang: "",
    harga: {
      srp: "",
      grosir: "",
      reseller: "",
    },
  });

  const [listBarang, setListBarang] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState(null);
  // ===============================
  // PAGINATION TABLE
  // ===============================
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const [search, setSearch] = useState("");

  // ===============================
  // REALTIME LISTENER
  // ===============================
  useEffect(() => {
    const barangRef = ref(db, "dataManagement/masterBarang");

    onValue(barangRef, (snap) => {
      const data = snap.val() || {};
      const filtered = Object.entries(data)
        .map(([id, v]) => ({ id, ...v }))
        .filter((b) => b.kategoriBarang === kategori.trim().toUpperCase());

      setListBarang(filtered);
    });

    return () => off(barangRef);
  }, [kategori]);

  // ===============================
  // EXPORT EXCEL (SESUAI TABLE)
  // ===============================
  const handleExport = () => {
    // ======================================
    // EXPORT SESUAI FILTER TABLE
    // ======================================
    const exportRows = filteredBarang.map((b, i) => ({
      NO: i + 1,

      KATEGORI: b.kategoriBarang || "",

      BRAND: b.brand || "",

      NAMA_BARANG: b.namaBarang || "",

      HARGA_SRP: Number(b.harga?.srp || b.hargaSRP || 0),

      HARGA_GROSIR: Number(b.harga?.grosir || b.hargaGrosir || 0),

      HARGA_RESELLER: Number(b.harga?.reseller || b.hargaReseller || 0),
    }));

    // ======================================
    // VALIDASI
    // ======================================
    if (!exportRows.length) {
      alert(`❌ DATA ${kategori} KOSONG`);
      return;
    }

    // ======================================
    // FILE NAME
    // ======================================
    const safeKategori = String(kategori || "")
      .trim()
      .replace(/\s+/g, "_")
      .toUpperCase();

    // ======================================
    // EXPORT
    // ======================================
    exportToExcel({
      data: exportRows,

      fileName: `MASTER_BARANG_${safeKategori}`,

      sheetName: safeKategori,
    });

    alert(`✅ EXPORT EXCEL ${kategori} BERHASIL`);
  };

  // ===============================
  // RESET FORM
  // ===============================
  const resetForm = () => {
    setBarang({
      brand: "",
      namaBarang: "",
      harga: { srp: "", grosir: "", reseller: "" },
    });
    setEditId(null);
  };

  // ===============================
  // SUBMIT
  // ===============================
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (
      !barang.brand ||
      !barang.namaBarang ||
      !barang.harga.srp ||
      !barang.harga.grosir ||
      !barang.harga.reseller
    ) {
      alert("Lengkapi semua field!");
      return;
    }

    setLoading(true);

    const payload = {
      kategoriBarang: kategori.trim().toUpperCase(),
      brand: barang.brand.trim(),
      namaBarang: barang.namaBarang.trim(),
      harga: {
        srp: Number(barang.harga.srp),
        grosir: Number(barang.harga.grosir),
        reseller: Number(barang.harga.reseller),
      },
    };

    try {
      if (editId) {
        await updateMasterBarang(editId, payload);
      } else {
        await addMasterBarang(payload);
      }
      resetForm();
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan data");
    } finally {
      setLoading(false);
    }
  };

  // ===============================
  // EDIT & DELETE
  // ===============================
  const handleEdit = (item) => {
    setEditId(item.id);
    setBarang({
      brand: item.brand,
      namaBarang: item.namaBarang,
      harga: {
        srp: item.harga?.srp || "",
        grosir: item.harga?.grosir || "",
        reseller: item.harga?.reseller || "",
      },
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Yakin hapus data ini?")) return;
    await deleteMasterBarangMasing(id);
  };
  // ===============================
  // HITUNG DATA PAGINATION
  // ===============================
  const indexOfLastRow = currentPage * rowsPerPage;
  const indexOfFirstRow = indexOfLastRow - rowsPerPage;

  const filteredBarang = listBarang.filter((b) => {
    const q = search.toLowerCase();

    if (!q) return true;

    return (
      String(b.brand || "")
        .toLowerCase()
        .includes(q) ||
      String(b.namaBarang || "")
        .toLowerCase()
        .includes(q) ||
      String(b.harga?.srp || "")
        .toString()
        .toLowerCase()
        .includes(q) ||
      String(b.harga?.grosir || "")
        .toString()
        .toLowerCase()
        .includes(q) ||
      String(b.harga?.reseller || "")
        .toString()
        .toLowerCase()
        .includes(q)
    );
  });

  const currentRows = filteredBarang.slice(indexOfFirstRow, indexOfLastRow);

  const totalPages = Math.ceil(filteredBarang.length / rowsPerPage);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            MASTER BARANG — {kategori}
          </h2>
          <p className="text-sm text-slate-500">
            Simpan, Edit, Delete langsung realtime ke Firebase
          </p>
        </div>

        <ImportMasterMotorExcel listBarang={listBarang} kategori={kategori} />

        <button
          onClick={handleExport}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700
                   text-white text-sm font-semibold shadow"
        >
          Export Excel
        </button>
      </div>

      {/* FORM */}
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border"
      >
        <input
          className="border p-2 rounded"
          placeholder="Nama Brand"
          value={barang.brand}
          onChange={(e) => setBarang({ ...barang, brand: e.target.value })}
        />

        <input
          className="border p-2 rounded"
          placeholder="Nama Barang"
          value={barang.namaBarang}
          onChange={(e) => setBarang({ ...barang, namaBarang: e.target.value })}
        />

        <input
          type="number"
          className="border p-2 rounded"
          placeholder="Harga SRP"
          value={barang.harga.srp}
          onChange={(e) =>
            setBarang({
              ...barang,
              harga: { ...barang.harga, srp: e.target.value },
            })
          }
        />

        <input
          type="number"
          className="border p-2 rounded"
          placeholder="Harga Grosir"
          value={barang.harga.grosir}
          onChange={(e) =>
            setBarang({
              ...barang,
              harga: { ...barang.harga, grosir: e.target.value },
            })
          }
        />

        <input
          type="number"
          className="border p-2 rounded"
          placeholder="Harga Reseller"
          value={barang.harga.reseller}
          onChange={(e) =>
            setBarang({
              ...barang,
              harga: { ...barang.harga, reseller: e.target.value },
            })
          }
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 text-white rounded py-2 hover:bg-indigo-700"
        >
          {editId ? "Update" : "Simpan"}
        </button>

        {editId && (
          <button
            type="button"
            onClick={resetForm}
            className="bg-gray-400 text-white rounded py-2"
          >
            Batal
          </button>
        )}
      </form>

      <div className="flex flex-wrap gap-2 mt-2 text-lg font-bold text-slate-800 ">
        <h2 className="">FILTER PENCARIAN DATA</h2>

        <input
          type="text"
          placeholder="Cari semua kolom: brand, barang, harga..."
          className="border px-3 py-2 rounded-lg text-sm w-full md:w-82"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* TABLE MODERN */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        {/* INFO HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 px-4 py-4 bg-gradient-to-r from-indigo-50 to-slate-50 border-b">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              Data Master Barang
            </h2>

            <p className="text-sm text-slate-500">
              Total Data :{" "}
              <span className="font-bold text-indigo-600">
                {filteredBarang.length}
              </span>
            </p>
          </div>

          <div className="text-xs text-slate-400">
            Realtime Firebase Database
          </div>
        </div>

        {/* TABLE */}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100 sticky top-0 z-10">
              <tr>
                <th className="px-4 py-3 text-left font-bold text-slate-700 whitespace-nowrap">
                  Brand
                </th>

                <th className="px-4 py-3 text-left font-bold text-slate-700 whitespace-nowrap">
                  Nama Barang
                </th>

                <th className="px-4 py-3 text-center font-bold text-slate-700 whitespace-nowrap">
                  SRP
                </th>

                <th className="px-4 py-3 text-center font-bold text-slate-700 whitespace-nowrap">
                  Grosir
                </th>

                <th className="px-4 py-3 text-center font-bold text-slate-700 whitespace-nowrap">
                  Reseller
                </th>

                <th className="px-4 py-3 text-center font-bold text-slate-700 whitespace-nowrap">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody>
              {currentRows.map((b, index) => (
                <tr
                  key={b.id}
                  className={`
              border-b transition-all duration-200 hover:bg-indigo-50
              ${index % 2 === 0 ? "bg-white" : "bg-slate-50/40"}
            `}
                >
                  {/* BRAND */}
                  <td className="px-4 py-3">
                    <div
                      className="
                  max-w-[120px]
                  md:max-w-[180px]
                  truncate
                  font-semibold
                  text-slate-800
                "
                      title={b.brand}
                    >
                      {b.brand}
                    </div>
                  </td>

                  {/* NAMA BARANG */}
                  <td className="px-4 py-3">
                    <div
                      className="
                  max-w-[180px]
                  md:max-w-[280px]
                  truncate
                  text-slate-700
                  font-medium
                "
                      title={b.namaBarang}
                    >
                      {b.namaBarang}
                    </div>
                  </td>

                  {/* HARGA */}
                  <td className="px-4 py-3 text-center">
                    <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs">
                      Rp {Number(b.harga?.srp || 0).toLocaleString("id-ID")}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
                      Rp {Number(b.harga?.grosir || 0).toLocaleString("id-ID")}
                    </span>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 font-bold text-xs">
                      Rp{" "}
                      {Number(b.harga?.reseller || 0).toLocaleString("id-ID")}
                    </span>
                  </td>

                  {/* AKSI */}
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleEdit(b)}
                        className="
                    px-3 py-1.5
                    rounded-lg
                    bg-amber-500
                    hover:bg-amber-600
                    text-white
                    text-xs
                    font-bold
                    shadow-sm
                    transition-all
                  "
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => handleDelete(b.id)}
                        className="
                    px-3 py-1.5
                    rounded-lg
                    bg-red-500
                    hover:bg-red-600
                    text-white
                    text-xs
                    font-bold
                    shadow-sm
                    transition-all
                  "
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}

              {/* EMPTY */}
              {filteredBarang.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <div className="text-5xl">📦</div>

                      <p className="font-semibold">Belum ada data barang</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="flex flex-wrap justify-center items-center gap-2 p-4 bg-slate-50 border-t">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            className="
        px-4 py-2 rounded-xl
        bg-white border
        hover:bg-slate-100
        text-xs font-bold
        shadow-sm
      "
          >
            ◀ Prev
          </button>

          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`
          w-9 h-9 rounded-xl text-xs font-bold
          transition-all shadow-sm
          ${
            currentPage === i + 1
              ? "bg-indigo-600 text-white scale-105"
              : "bg-white border hover:bg-slate-100"
          }
        `}
            >
              {i + 1}
            </button>
          ))}

          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            className="
        px-4 py-2 rounded-xl
        bg-white border
        hover:bg-slate-100
        text-xs font-bold
        shadow-sm
      "
          >
            Next ▶
          </button>
        </div>
      </div>
    </div>
  );
}
