// ======================================================================
// INVENTORY REPORT — PRO MAX FINAL VERSION
// ======================================================================
import React, { useEffect, useMemo, useState, useRef } from "react";

import {
  listenAllTransaksi,
  listenStockAll,
  listenMasterBarang,
  updateTransaksi,
  listenTransferRequests,
} from "../../services/FirebaseService";
import {
  FaSearch,
  FaCheckCircle,
  FaEdit,
  FaExchangeAlt,
  FaStore,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

// =======================
// LIST TOKO
// =======================
const TOKO_LIST = [
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

const CARD_COLORS = [
  "from-emerald-500 to-teal-500",
  "from-fuchsia-500 to-pink-500",
  "from-orange-500 to-amber-400",
  "from-cyan-500 to-teal-500",
  "from-rose-500 to-red-500",
  "from-purple-500 to-indigo-500",
  "from-lime-500 to-green-500",
  "from-blue-600 to-cyan-500",
  "from-yellow-500 to-orange-500",
];

// =======================
// RUPIAH
// =======================
const rupiah = (n) =>
  Number(n || 0).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  });

// ======================================================================
// COMPONENT UTAMA
// ======================================================================
export default function InventoryReport() {
  const navigate = useNavigate();

  // ==========================
  // STATE
  // ==========================
  const [stockData, setStockData] = useState({});
  const [transaksi, setTransaksi] = useState([]);
  const [selectedToko, setSelectedToko] = useState(null);
  const [search, setSearch] = useState("");
  const tableRef = useRef(null);
  const [transferData, setTransferData] = useState([]);
  const [masterBarangMap, setMasterBarangMap] = useState({});

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 25;

  useEffect(() => {
    const unsub = listenTransferRequests((list) => {
      setTransferData(list || []);
    });
    return () => unsub && unsub();
  }, []);
  useEffect(() => {
    const unsub = listenMasterBarang((rows) => {
      const map = {};

      (rows || []).forEach((b) => {
        const brand = String(b.namaBrand || b.NAMA_BRAND || "")
          .trim()
          .replace(/\s+/g, " ")
          .toUpperCase();

        const barang = String(b.namaBarang || b.NAMA_BARANG || "")
          .trim()
          .replace(/\s+/g, " ")
          .toUpperCase();

        if (!brand || !barang) return;

        const key = `${brand}|${barang}`;

        map[key] = {
          // ===== HARGA =====
          hargaSRP: Number(b.hargaSRP ?? b.HARGA_SRP ?? 0),
          hargaGrosir: Number(b.hargaGrosir ?? b.HARGA_GROSIR ?? 0),
          hargaReseller: Number(b.hargaReseller ?? b.HARGA_RESELLER ?? 0),

          // ===== BUNDLING =====
          band1: b.NAMA_BANDLING_1 || "",
          hband1: Number(b.HARGA_BANDLING_1 || 0),

          band2: b.NAMA_BANDLING_2 || "",
          hband2: Number(b.HARGA_BANDLING_2 || 0),

          band3: b.NAMA_BANDLING_3 || "",
          hband3: Number(b.HARGA_BANDLING_3 || 0),
        };
      });

      setMasterBarangMap(map);
    });

    return () => unsub && unsub();
  }, []);

  // ==========================
  // AUTO SCROLL SAAT CARD DI KLIK
  // ==========================
  useEffect(() => {
    if (selectedToko && tableRef.current) {
      tableRef.current.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }, [selectedToko]);

  // ==========================
  // LISTENER REALTIME: STOK
  // ==========================
  useEffect(() => {
    const unsub = listenStockAll((snap) => setStockData(snap || {}));
    return () => unsub && unsub();
  }, []);

  // ==========================
  // REALTIME LISTENER
  // ==========================
  useEffect(() => {
    const u1 = listenStockAll((s) => setStockData(s || {}));
    const u2 = listenAllTransaksi((t) => setTransaksi(t || []));

    return () => {
      u1 && u1();
      u2 && u2();
    };
  }, []);

  // ==========================
  // STOCK BY TOKO (SINGLE SOURCE OF TRUTH)
  // ==========================
  const stokByToko = useMemo(() => {
    const map = {};

    TOKO_LIST.forEach((toko) => {
      map[toko] = { kategori: {}, items: [] };
    });

    // PUSAT → dari stockData
    Object.values(stockData["CILANGKAP PUSAT"] || {}).forEach((s) => {
      const kat = s.kategoriBrand || "LAINNYA";
      map["CILANGKAP PUSAT"].kategori[kat] =
        (map["CILANGKAP PUSAT"].kategori[kat] || 0) + Number(s.qty || 0);

      map["CILANGKAP PUSAT"].items.push(s);
    });

    // TOKO → dari transaksi pembelian
    transaksi.forEach((t) => {
      if (t.STATUS !== "Approved" || t.PAYMENT_METODE !== "PEMBELIAN") return;

      const toko = t.NAMA_TOKO;
      if (!map[toko]) return;

      const kat = t.KATEGORI_BRAND || "LAINNYA";
      const qty = t.IMEI ? 1 : Number(t.QTY || 0);

      map[toko].kategori[kat] = (map[toko].kategori[kat] || 0) + qty;

      map[toko].items.push(t);
    });

    return map;
  }, [transaksi, stockData]);

  // ==========================
  // TOTAL SEMUA TOKO
  // ==========================
  const totalStockSemuaToko = useMemo(() => {
    return Object.values(stokByToko).reduce((sum, t) => {
      return sum + Object.values(t.kategori).reduce((s, v) => s + v, 0);
    }, 0);
  }, [stokByToko]);

  // ==========================
  // STOCK PUSAT (FIX)
  // ==========================
  const stockPembelianPusat = useMemo(() => {
    const pusat = stockData["CILANGKAP PUSAT"] || {};
    return Object.values(pusat).reduce((s, i) => s + Number(i.qty || 0), 0);
  }, [stockData]);

  // ==========================
  // MASTER DATA PEMBELIAN (SINGLE SOURCE OF TRUTH)
  // ==========================
  const pembelianApproved = useMemo(() => {
    return transaksi.filter(
      (t) => t.STATUS === "Approved" && t.PAYMENT_METODE === "PEMBELIAN"
    );
  }, [transaksi]);

  const transferMap = useMemo(() => {
    const map = {};

    transferData.forEach((t) => {
      if (t.status !== "Approved") return;

      const qty = Array.isArray(t.imeis) ? t.imeis.length : Number(t.qty || 0);
      const key = `${t.brand}|${t.barang}`;

      // OUT
      if (!map[t.dari]) map[t.dari] = {};
      map[t.dari][key] = (map[t.dari][key] || 0) - qty;

      // IN
      if (!map[t.ke]) map[t.ke] = {};
      map[t.ke][key] = (map[t.ke][key] || 0) + qty;
    });

    return map;
  }, [transferData]);

  // ==========================
  // DETAIL TABLE
  // ==========================
  // ==========================
  // DETAIL TABLE = MASTER PEMBELIAN
  // ==========================
  // ==========================
  // DETAIL TABLE (NORMALIZED DARI MASTER PEMBELIAN)
  // ==========================

  const detailTable = useMemo(() => {
    if (!selectedToko) return [];

    return pembelianApproved
      .filter((t) => t.NAMA_TOKO === selectedToko)
      .map((t) => {
        const qty = t.IMEI ? 1 : Number(t.QTY || 0);

        const brand = String(t.NAMA_BRAND || t.namaBrand || "-")
          .trim()
          .replace(/\s+/g, " ")
          .toUpperCase();

        const barang = String(t.NAMA_BARANG || t.namaBarang || "-")
          .trim()
          .replace(/\s+/g, " ")
          .toUpperCase();

        const key = `${brand}|${barang}`;
        const master = masterBarangMap[key] || {};

        // ===== HARGA (MASTER → TRANSAKSI → 0) =====
        const hargaSRP = master.hargaSRP || Number(t.HARGA_SRP) || 0;

        const hargaGrosir = master.hargaGrosir || Number(t.HARGA_GROSIR) || 0;

        const hargaReseller =
          master.hargaReseller || Number(t.HARGA_RESELLER) || 0;

        // ===== BUNDLING (MASTER → TRANSAKSI) =====
        const band1 = master.band1 || t.NAMA_BANDLING_1 || "-";
        const hband1 = master.hband1 || Number(t.HARGA_BANDLING_1 || 0);

        const band2 = master.band2 || t.NAMA_BANDLING_2 || "-";
        const hband2 = master.hband2 || Number(t.HARGA_BANDLING_2 || 0);

        const band3 = master.band3 || t.NAMA_BANDLING_3 || "-";
        const hband3 = master.hband3 || Number(t.HARGA_BANDLING_3 || 0);

        return {
          id: t.id,
          tokoId: t.tokoId,

          tanggal: t.TANGGAL_TRANSAKSI || "-",
          noDo: t.NO_INVOICE || "-",
          supplier: t.NAMA_SUPPLIER || "-",

          brand,
          barang,
          imei: t.IMEI || "-",
          qty,

          // ===== HARGA =====
          hargaSRP,
          totalSRP: hargaSRP * qty,

          hargaGrosir,
          totalGrosir: hargaGrosir * qty,

          hargaReseller,
          totalReseller: hargaReseller * qty,

          // ===== BUNDLING =====
          band1,
          hband1,
          totalBand1: hband1 * qty,

          band2,
          hband2,
          totalBand2: hband2 * qty,

          band3,
          hband3,
          totalBand3: hband3 * qty,

          transferIn: 0,
          transferOut: 0,
        };
      });
  }, [selectedToko, pembelianApproved, masterBarangMap]);

  // ======================================================================
  // PAGINATION
  // ======================================================================
  const pageCount = Math.ceil(detailTable.length / pageSize);
  const data = detailTable.slice((page - 1) * pageSize, page * pageSize);

  // ==========================
  // CARD KECIL PER TOKO + KATEGORI
  // ==========================
  const cardStockPerToko = useMemo(() => {
    return TOKO_LIST.map((toko) => {
      const kategori = {};

      pembelianApproved.forEach((t) => {
        if (t.NAMA_TOKO !== toko) return;

        const k = t.KATEGORI_BRAND || "LAINNYA";
        const qty = t.IMEI ? 1 : Number(t.QTY || 0);
        kategori[k] = (kategori[k] || 0) + qty;
      });

      return { toko, kategori };
    });
  }, [pembelianApproved]);

  // ==========================
  // EXPORT
  // ==========================
  const exportToExcel = () => {
    const sheet = XLSX.utils.json_to_sheet(detailTable);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Inventory");
    XLSX.writeFile(book, "Inventory_Report.xlsx");
  };

  // ======================================================================
  // RENDER
  // ======================================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">INVENTORY REPORT — PRO MAX</h1>

        {/* ================================================================== */}
        {/* CARD BESAR CILANGKAP PUSAT */}
        {/* ================================================================== */}
        {/* CARD BESAR PUSAT */}
        <div
          onClick={() => {
            setSelectedToko("CILANGKAP PUSAT");
            setPage(1);
          }}
          className="cursor-pointer rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-500 p-6 mb-6 shadow-2xl"
        >
          <div className="flex gap-4 items-center">
            <FaStore className="text-5xl" />
            <div>
              <h2 className="text-2xl font-bold">CILANGKAP PUSAT</h2>
              <p className="text-sm opacity-80">
                TOTAL STOCK SEMUA TOKO: {totalStockSemuaToko}
              </p>
            </div>
          </div>

          <p className="mt-4 text-4xl font-bold">
            {totalStockSemuaToko.toLocaleString("id-ID")}
          </p>
        </div>
        {/* ================================================================== */}
        {/* CARD KECIL PER TOKO + PER KATEGORI */}
        {/* ================================================================== */}
        {/* CARD KECIL */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {cardStockPerToko.map((t, i) => (
            <div
              key={t.toko}
              onClick={() => {
                setSelectedToko(t.toko);
                setPage(1);
              }}
              className={`cursor-pointer rounded-2xl p-4 bg-gradient-to-br ${
                CARD_COLORS[i % CARD_COLORS.length]
              }`}
            >
              <div className="font-bold mb-2">{t.toko}</div>
              {Object.entries(t.kategori).map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span>{k}</span>
                  <span className="font-bold">{v}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* ================================================================== */}
        {/* SEARCH */}
        {/* ================================================================== */}
        {selectedToko && (
          <div
            ref={tableRef}
            className="bg-white/10 backdrop-blur-md p-4 rounded-xl mb-5 flex items-center"
          >
            <FaSearch className="text-white text-lg" />
            <input
              placeholder="Cari brand / barang / IMEI..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ml-3 flex-1 bg-transparent text-white outline-none placeholder-white/50"
            />
          </div>
        )}

        {/* ================================================================== */}
        {/* TABEL DETAIL */}
        {/* ================================================================== */}
        {selectedToko && (
          <div
            ref={tableRef}
            className="bg-blue-900 p-6 rounded-2xl shadow-2xl overflow-auto"
          >
            {/* EXPORT BUTTON */}
            <div className="flex justify-between mb-4">
              <h2 className="text-xl font-bold">Detail Stok: {selectedToko}</h2>

              <button
                onClick={exportToExcel}
                className="
                  px-4 py-2 rounded-lg 
                  bg-gradient-to-r from-green-400 to-emerald-500
                  hover:scale-105 hover:shadow-xl shadow-green-400/50
                  transition-all duration-200 text-white font-semibold
                "
              >
                📤 Export Excel
              </button>
            </div>

            {/* ================================================================== */}
            {/* TABLE */}
            {/* ================================================================== */}
            <table className="w-full text-sm min-w-[2000px]">
              <thead>
                <tr className="border-b border-blue-700 bg-blue-800">
                  <th className="p-2">Tanggal</th>
                  <th className="p-2">NO DO</th>
                  <th className="p-2">Supplier</th>
                  <th className="p-2">Brand</th>
                  <th className="p-2">Barang</th>
                  <th className="p-2">IMEI</th>
                  <th className="p-2 text-right">Qty</th>
                  <th className="p-2 text-right">SRP</th>
                  <th className="p-2 text-right">Total SRP</th>
                  <th className="p-2 text-right">Grosir</th>
                  <th className="p-2 text-right">Total Grosir</th>
                  <th className="p-2 text-right">Reseller</th>
                  <th className="p-2 text-right">Total Reseller</th>

                  <th className="p-2">Bandling 1</th>
                  <th className="p-2 text-right">Harga</th>
                  <th className="p-2 text-right">Total</th>

                  <th className="p-2">Bandling 2</th>
                  <th className="p-2 text-right">Harga</th>
                  <th className="p-2 text-right">Total</th>

                  <th className="p-2">Bandling 3</th>
                  <th className="p-2 text-right">Harga</th>
                  <th className="p-2 text-right">Total</th>
                  <th className="p-2">Transfer Masuk</th>
                  <th className="p-2">Transfer Keluar</th>

                  <th className="p-2">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {data.map((row, i) => (
                  <tr
                    key={i}
                    className="border-b border-blue-700 hover:bg-blue-800 transition"
                  >
                    <td className="p-2">{row.tanggal}</td>
                    <td className="p-2">{row.noDo}</td>
                    <td className="p-2">{row.supplier}</td>
                    <td className="p-2">{row.brand}</td>
                    <td className="p-2">{row.barang}</td>
                    <td className="p-2">{row.imei}</td>
                    <td className="p-2 text-right">{row.qty}</td>
                    <td className="p-2 text-right">{rupiah(row.hargaSRP)}</td>
                    <td className="p-2 text-right">{rupiah(row.totalSRP)}</td>
                    <td className="p-2 text-right">
                      {rupiah(row.hargaGrosir)}
                    </td>
                    <td className="p-2 text-right">
                      {rupiah(row.totalGrosir)}
                    </td>
                    <td className="p-2 text-right">
                      {rupiah(row.hargaReseller)}
                    </td>
                    <td className="p-2 text-right">
                      {rupiah(row.totalReseller)}
                    </td>

                    <td className="p-2">{row.band1}</td>
                    <td className="p-2 text-right">{rupiah(row.hband1)}</td>
                    <td className="p-2 text-right">{rupiah(row.totalBand1)}</td>

                    <td className="p-2">{row.band2}</td>
                    <td className="p-2 text-right">{rupiah(row.hband2)}</td>
                    <td className="p-2 text-right">{rupiah(row.totalBand2)}</td>

                    <td className="p-2">{row.band3}</td>
                    <td className="p-2 text-right">{rupiah(row.hband3)}</td>
                    <td className="p-2 text-right">{rupiah(row.totalBand3)}</td>
                    <td className="p-2 text-center">{row.transferIn}</td>
                    <td className="p-2 text-center">{row.transferOut}</td>

                    {/* ACTION BUTTON PREMIUM */}
                    <td className="p-2 text-center">
                      {/* APPROVE */}
                      <button
                        onClick={() =>
                          updateTransaksi(row.tokoId, row.id, {
                            STATUS: "Approved",
                          })
                        }
                        className="
                          px-3 py-1 rounded-lg 
                          bg-gradient-to-r from-green-500 to-emerald-600
                          hover:scale-105 shadow-md hover:shadow-green-400/50
                          flex items-center gap-1 mx-auto text-white
                          transition-all duration-200
                        "
                      >
                        <FaCheckCircle />
                        Approve
                      </button>

                      {/* EDIT */}
                      <button
                        onClick={() => alert("Edit fitur modal akan ditambah.")}
                        className="
                          mt-2 px-3 py-1 rounded-lg 
                          bg-gradient-to-r from-blue-500 to-indigo-600
                          hover:scale-105 shadow-md hover:shadow-blue-400/50
                          flex items-center gap-1 mx-auto text-white
                          transition-all duration-200
                        "
                      >
                        <FaEdit />
                        Edit
                      </button>

                      {/* TRANSFER */}
                      <button
                        onClick={() =>
                          navigate("/transfer-barang", {
                            state: {
                              brand: row.brand,
                              barang: row.barang,
                              qty: row.qty,
                              imei: row.imei,
                            },
                          })
                        }
                        className="
                          mt-2 px-3 py-1 rounded-lg 
                          bg-gradient-to-r from-yellow-400 to-orange-500
                          hover:scale-105 shadow-md hover:shadow-yellow-400/50
                          flex items-center gap-1 mx-auto text-white
                          transition-all duration-200
                        "
                      >
                        <FaExchangeAlt />
                        Transfer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ================================================================== */}
            {/* PAGINATION */}
            {/* ================================================================== */}
            <div className="flex justify-between mt-4 text-white">
              <button
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
                className="px-3 py-1 bg-blue-700 rounded disabled:opacity-40"
              >
                Prev
              </button>

              <span>
                Page {page} / {pageCount}
              </span>

              <button
                disabled={page === pageCount}
                onClick={() => setPage(page + 1)}
                className="px-3 py-1 bg-blue-700 rounded disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
