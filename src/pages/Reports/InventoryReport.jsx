// src/pages/Reports/InventoryReport.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaWarehouse,
  FaFileExcel,
  FaExchangeAlt,
  FaEdit,
  FaCheckCircle,
  FaSearch,
} from "react-icons/fa";
import * as XLSX from "xlsx";
import {
  listenAllTransaksi,
  updateTransaksi,
} from "../../services/FirebaseService";
import StockCard from "./StockCard";

// ✅ 10 Toko utama
const TOKO_LIST = [
  "CILANGKAP PUSAT",
  "CIBINONG",
  "GAS ALAM",
  "CIRACAS",
  "METLAND 1",
  "METLAND 2",
  "PITARA",
  "KOTA WISATA",
  "SAWANGAN",
  "CITEUREUP",
];

// ✅ Mapping nama toko → id toko
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

const getTokoIdFromName = (name) => {
  if (!name) return null;
  const idx =
    fallbackTokoNames.findIndex(
      (t) => String(t).toUpperCase() === String(name).toUpperCase()
    ) + 1;
  return idx || null;
};

const fmtRupiah = (v) => {
  try {
    return Number(v || 0).toLocaleString("id-ID");
  } catch {
    return String(v || "");
  }
};

export default function InventoryReport() {
  const navigate = useNavigate();

  // ✅ AMAN: HANYA SATU KALI DIDEFINISIKAN
  const loggedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const myTokoId = loggedUser?.toko;
  const myTokoName = myTokoId ? TOKO_LIST[myTokoId - 1] : null;

  const isSuper =
    loggedUser?.role === "superadmin" || loggedUser?.role === "admin";

  const [allTransaksi, setAllTransaksi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedToko, setSelectedToko] = useState(null);
  const [search, setSearch] = useState("");

  // ======================= REALTIME MASTER DATA =======================
  useEffect(() => {
    const unsub = listenAllTransaksi((rows) => {
      setAllTransaksi(rows || []);
      setLoading(false);
    });

    return () => unsub && unsub();
  }, []);

  // ======================= KUNCI DATA UNTUK PIC TOKO =======================
  const transaksiFinal = useMemo(() => {
    if (isSuper) return allTransaksi;
    return (allTransaksi || []).filter(
      (tx) =>
        String(tx.NAMA_TOKO || tx.TOKO).toUpperCase() ===
        String(myTokoName).toUpperCase()
    );
  }, [allTransaksi, isSuper, myTokoName]);

  // ======================= TOTAL SEMUA TOKO =======================
  const totalSemuaToko = useMemo(
    () =>
      (transaksiFinal || []).reduce(
        (sum, tx) => sum + Number(tx.QTY || 0),
        0
      ),
    [transaksiFinal]
  );

  // ======================= REKAP STOCK PER TOKO (✅ TIDAK DUPLIKAT) =======================
  const stockPerToko = useMemo(() => {
    const targetToko = isSuper ? TOKO_LIST : [myTokoName];
    return targetToko.map((toko) => {
      const rows = (transaksiFinal || []).filter(
        (tx) =>
          String(tx.NAMA_TOKO || tx.TOKO || "").toUpperCase() ===
          String(toko).toUpperCase()
      );

      const totalQty = rows.reduce((s, r) => s + Number(r.QTY || 0), 0);
      return { toko, totalQty, rows };
    });
  }, [transaksiFinal, isSuper, myTokoName]);

  // ======================= DETAIL PER TOKO =======================
  const detailRows = useMemo(() => {
    if (!selectedToko) return [];

    return (transaksiFinal || []).filter((tx) => {
      const tokoName = String(tx.NAMA_TOKO || tx.TOKO).toUpperCase();
      if (tokoName !== String(selectedToko).toUpperCase()) return false;

      if (!search.trim()) return true;

      const q = search.toLowerCase();
      return (
        String(tx.NAMA_BARANG || "").toLowerCase().includes(q) ||
        String(tx.NAMA_BRAND || "").toLowerCase().includes(q) ||
        String(tx.IMEI || tx.NOMOR_UNIK || "").toLowerCase().includes(q)
      );
    });
  }, [transaksiFinal, selectedToko, search]);

  // ======================= EXPORT EXCEL PER TOKO =======================
  const exportExcelPerToko = () => {
    if (!selectedToko) return;

    const rows = detailRows.map((tx, idx) => ({
      No: idx + 1,
      Tanggal: tx.TANGGAL_TRANSAKSI || tx.TANGGAL || "",
      Toko: tx.NAMA_TOKO || tx.TOKO || "",
      Brand: tx.NAMA_BRAND || "",
      Nama_Barang: tx.NAMA_BARANG || "",
      IMEI: tx.IMEI || tx.NOMOR_UNIK || "",
      Qty: tx.QTY,
      Harga_Unit: tx.HARGA_UNIT || 0,
      Status: tx.STATUS || "",
      Keterangan: tx.KETERANGAN || "",
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      ws,
      `STOCK_${selectedToko.replace(/\s+/g, "_")}`
    );
    XLSX.writeFile(wb, `STOCK_${selectedToko}.xlsx`);
  };

  // ======================= APPROVE & EDIT =======================
  const handleApprove = async (tx) => {
    try {
      const tokoName = tx.NAMA_TOKO || tx.TOKO || "";
      const tokoId = getTokoIdFromName(tokoName);
      if (!tokoId) {
        alert("Toko tidak dikenali, tidak bisa APPROVE.");
        return;
      }

      await updateTransaksi(tokoId, tx.id, { STATUS: "Approved" });
      setAllTransaksi((prev) =>
        prev.map((row) =>
          row.id === tx.id ? { ...row, STATUS: "Approved" } : row
        )
      );
      alert("✅ Transaksi berhasil di-APPROVE.");
    } catch (err) {
      console.error(err);
      alert("❌ Gagal APPROVE transaksi.");
    }
  };

  const handleEdit = (tx) => {
    try {
      localStorage.setItem("edit_transaksi", JSON.stringify(tx));
      window.location.href = "/transaksi";
    } catch (err) {
      console.error(err);
      alert("❌ Gagal membuka halaman edit.");
    }
  };

  const handleTransferClick = (tx) => {
    navigate("/transfer-barang", {
      state: {
        fromInventory: true,
        tanggal: tx.TANGGAL_TRANSAKSI || tx.TANGGAL || "",
        dari: tx.NAMA_TOKO || tx.TOKO,
        brand: tx.NAMA_BRAND,
        barang: tx.NAMA_BARANG,
        kategori: tx.KATEGORI_BRAND || "",
        imei: tx.IMEI || tx.NOMOR_UNIK || "",
        qty: tx.QTY || 1,
      },
    });
  };

  // ======================= RENDER (✅ UI 100% DIPERTAHANKAN) =======================
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-800 via-blue-700 to-purple-700 p-4">
      <div className="max-w-7xl mx-auto bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-6">
        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-indigo-700 flex items-center gap-2">
              <FaWarehouse />
              INVENTORY REPORT — CILANGKAP PUSAT & ANTAR TOKO
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Sumber data: MASTER TRANSAKSI (Firebase, realtime).
            </p>
          </div>

          <div className="text-right text-sm">
            <p className="text-slate-500">Total stock semua toko</p>
            <p className="text-xl font-bold text-indigo-700">
              {totalSemuaToko.toLocaleString("id-ID")} Unit
            </p>
          </div>
        </div>

        {/* ======================= GRID MULTI CARD ======================= */}
        {!selectedToko && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            {stockPerToko.map((row) => (
              <StockCard
                key={row.toko}
                toko={row.toko}
                totalQty={row.totalQty}
                totalAll={
                  row.toko === "CILANGKAP PUSAT" ? totalSemuaToko : null
                }
                onClick={() => setSelectedToko(row.toko)}
              />
            ))}
          </div>
        )}

        {/* ======================= DETAIL PER TOKO ======================= */}
        {selectedToko && (
          <>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
              <button
                onClick={() => {
                  setSelectedToko(null);
                  setSearch("");
                }}
                className="bg-slate-600 hover:bg-slate-700 text-white px-4 py-2 rounded-xl text-sm"
              >
                ← Kembali ke 10 Multi Card
              </button>

              <div className="text-center md:text-left">
                <h2 className="text-xl font-bold text-indigo-700">
                  STOCK {selectedToko}
                </h2>
              </div>

              <div className="flex flex-wrap gap-2 justify-end">
                <button
                  onClick={exportExcelPerToko}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm"
                >
                  <FaFileExcel /> Export Excel
                </button>

                <button
                  onClick={() => navigate("/transfer-barang")}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 text-sm"
                >
                  <FaExchangeAlt /> Transfer Barang
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <FaSearch className="text-slate-500" />
              <input
                type="text"
                placeholder="Cari Nama Barang, Brand, atau IMEI"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="border border-slate-300 rounded-xl px-3 py-2 w-full text-sm"
              />
            </div>

            <div className="bg-white rounded-2xl shadow overflow-x-auto">
              <table className="w-full text-xs md:text-sm border-collapse">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border p-2">No</th>
                    <th className="border p-2">Tanggal</th>
                    <th className="border p-2">No Invoice</th>
                    <th className="border p-2">Brand</th>
                    <th className="border p-2">Nama Barang</th>
                    <th className="border p-2">IMEI / Nomor Unik</th>
                    <th className="border p-2">Qty</th>
                    <th className="border p-2">Harga Unit</th>
                    <th className="border p-2">Status</th>
                    <th className="border p-2">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {!loading &&
                    detailRows.map((tx, idx) => (
                      <tr
                        key={tx.id || idx}
                        className="hover:bg-slate-50 transition"
                      >
                        <td className="border p-2 text-center">{idx + 1}</td>
                        <td className="border p-2">
                          {tx.TANGGAL_TRANSAKSI || tx.TANGGAL || "-"}
                        </td>
                        <td className="border p-2">{tx.NO_INVOICE || "-"}</td>
                        <td className="border p-2">{tx.NAMA_BRAND || "-"}</td>
                        <td className="border p-2">{tx.NAMA_BARANG || "-"}</td>
                        <td className="border p-2 font-mono">
                          {tx.IMEI || tx.NOMOR_UNIK || "-"}
                        </td>
                        <td className="border p-2 text-center">{tx.QTY}</td>
                        <td className="border p-2 text-right">
                          Rp {fmtRupiah(tx.HARGA_UNIT)}
                        </td>
                        <td className="border p-2 text-center">
                          {tx.STATUS || "Pending"}
                        </td>
                        <td className="border p-2">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleApprove(tx)}
                              className="text-green-600 hover:text-green-800"
                              title="Approve"
                            >
                              <FaCheckCircle />
                            </button>
                            <button
                              onClick={() => handleEdit(tx)}
                              className="text-blue-600 hover:text-blue-800"
                              title="Edit"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => handleTransferClick(tx)}
                              className="text-amber-600 hover:text-amber-800"
                              title="Transfer Barang"
                            >
                              <FaExchangeAlt />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {!selectedToko && loading && (
          <div className="mt-4 text-center text-slate-400 text-sm">
            Memuat data master transaksi dari Firebase...
          </div>
        )}
      </div>
    </div>
  );
}
