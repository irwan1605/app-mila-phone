// ======================================================================
// INVENTORY REPORT — PRO MAX FINAL VERSION
// ======================================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  listenAllTransaksi,
  listenStockAll,
  listenMasterBarang,
  updateTransaksi,
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

// =======================
// RUPIAH
// =======================
const rupiah = (n) =>
  Number(n || 0).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  });

// =======================
// STOCK NORMALIZER
// =======================
const normalizeStock = (stokObj = {}) => {
  const result = {};
  Object.values(stokObj).forEach((item) => {
    if (!item) return;
    const brand = item.brand || item.namaBrand;
    const barang = item.barang || item.namaBarang;
    const sku = `${brand}_${barang}`.replace(/\s+/g, "_").toUpperCase();

    if (!result[sku]) {
      result[sku] = { sku, nama: barang, qty: 0 };
    }
    result[sku].qty += Number(item.qty || 0);
  });
  return result;
};

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
  const [masterBarang, setMasterBarang] = useState({});
  const [selectedToko, setSelectedToko] = useState(null);
  const [search, setSearch] = useState("");
  const [transferHistory, setTransferHistory] = useState([]);


  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 25;
  

  // ==========================
  // LISTENER REALTIME: STOK
  // ==========================
  useEffect(() => {
    const unsub = listenStockAll((snap) => setStockData(snap || {}));
    return () => unsub && unsub();
  }, []);

  // ==========================
  // LISTENER REALTIME: TRANSAKSI
  // ==========================
  useEffect(() => {
    const unsub = listenAllTransaksi((rows) => setTransaksi(rows || []));
    return () => unsub && unsub();
  }, []);

  // ==========================
  // LISTENER REALTIME: MASTER BARANG
  // ==========================
  useEffect(() => {
    const unsub = listenMasterBarang((rows) => {
      const map = {};
      rows.forEach((b) => {
        const key = `${b.NAMA_BRAND}_${b.NAMA_BARANG}`
          .replace(/\s+/g, "_")
          .toUpperCase();
        map[key] = b;
      });
      setMasterBarang(map);
    });
    return () => unsub && unsub();
  }, []);

  // ======================================================================
  // HITUNG TOTAL STOCK SEMUA TOKO
  // ======================================================================
  const totalAllStock = useMemo(() => {
    let total = 0;
    Object.values(stockData).forEach((tokoObj) => {
      Object.values(tokoObj).forEach((item) => {
        total += Number(item.qty || 0);
      });
    });
    return total;
  }, [stockData]);

  // ======================================================================
  // HITUNG STOCK PEMBELIAN CILANGKAP PUSAT
  // ======================================================================
  // Hitung stok pusat langsung dari Firebase stock path
  const stockPembelianPusat = useMemo(() => {
    const pusat = stockData["CILANGKAP PUSAT"] || {};
    return Object.values(pusat).reduce(
      (sum, item) => sum + Number(item.qty || 0),
      0
    );
  }, [stockData]);

  // ======================================================================
  // CARD STOK PER TOKO
  // ======================================================================
  const cardStock = useMemo(() => {
    return TOKO_LIST.map((toko, idx) => {
      // Untuk Cilankap Pusat → pakai stok pembelian pusat
      if (toko === "CILANGKAP PUSAT") {
        return {
          toko,
          total: stockPembelianPusat,
          color: "from-emerald-500 to-teal-500",
        };
      }

      const stokAsli = stockData[toko] || {};
      const stok = normalizeStock(stokAsli);
      const total = Object.values(stok).reduce(
        (sum, r) => sum + Number(r.qty || 0),
        0
      );

      return {
        toko,
        total,
        color: [
          "from-indigo-500 to-blue-500",
          "from-fuchsia-500 to-pink-500",
          "from-orange-500 to-amber-400",
          "from-cyan-500 to-teal-500",
          "from-rose-500 to-red-500",
          "from-purple-500 to-indigo-500",
          "from-lime-500 to-green-500",
          "from-emerald-500 to-teal-500",
          "from-blue-600 to-cyan-500",
          "from-yellow-500 to-orange-500",
        ][idx % 10],
      };
    });
  }, [stockData, stockPembelianPusat]);

  // ======================================================================
  // DETAIL TABEL (JOIN MASTER BARANG + HITUNG BANDLING)
  // ======================================================================
  const detailTable = useMemo(() => {
    if (!selectedToko) return [];

    const rows = transaksi.filter(
      (t) =>
        String(t.NAMA_TOKO || "").toUpperCase() ===
        String(selectedToko || "").toUpperCase()
    );

    let expanded = rows.map((t) => {
      const sku = `${t.NAMA_BRAND}_${t.NAMA_BARANG}`
        .replace(/\s+/g, "_")
        .toUpperCase();

      const master = masterBarang[sku] || {};
      const qty = t.IMEI ? 1 : Number(t.QTY || 0);

      return {
        id: t.id,
        tokoId: t.tokoId,
        tanggal: t.TANGGAL_TRANSAKSI,
        noDo: t.NO_INVOICE,
        supplier: t.NAMA_SUPPLIER,
        brand: t.NAMA_BRAND,
        barang: t.NAMA_BARANG,
        imei: t.IMEI,
        qty,

        hargaSRP: Number(t.HARGA_SRP || 0),
        totalSRP: qty * Number(t.HARGA_SRP || 0),

        hargaGrosir: Number(t.HARGA_GROSIR || 0),
        totalGrosir: qty * Number(t.HARGA_GROSIR || 0),

        hargaReseller: Number(t.HARGA_RESELLER || 0),
        totalReseller: qty * Number(t.HARGA_RESELLER || 0),

        // Bandling realtime dari MasterBarang
        band1: master.NAMA_BANDLING_1 || "-",
        hband1: Number(master.HARGA_BANDLING_1 || 0),
        totalBand1: qty * Number(master.HARGA_BANDLING_1 || 0),

        band2: master.NAMA_BANDLING_2 || "-",
        hband2: Number(master.HARGA_BANDLING_2 || 0),
        totalBand2: qty * Number(master.HARGA_BANDLING_2 || 0),

        band3: master.NAMA_BANDLING_3 || "-",
        hband3: Number(master.HARGA_BANDLING_3 || 0),
        totalBand3: qty * Number(master.HARGA_BANDLING_3 || 0),
      };
    });

    if (search.trim()) {
      const q = search.toLowerCase();
      expanded = expanded.filter(
        (r) =>
          r.brand.toLowerCase().includes(q) ||
          r.barang.toLowerCase().includes(q) ||
          String(r.imei).toLowerCase().includes(q)
      );
    }

    return expanded;
  }, [selectedToko, transaksi, masterBarang, search]);



  // ======================================================================
  // PAGINATION
  // ======================================================================
  const pageCount = useMemo(
    () => Math.ceil(detailTable.length / pageSize),
    [detailTable]
  );

  const data = useMemo(() => {
    return detailTable.slice((page - 1) * pageSize, page * pageSize);
  }, [page, detailTable]);

  // ======================================================================
  // EXPORT EXCEL
  // ======================================================================
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
        <div
          onClick={() => setSelectedToko("CILANGKAP PUSAT")}
          className="
            cursor-pointer rounded-3xl 
            bg-gradient-to-br from-emerald-500 to-teal-500 
            shadow-2xl shadow-emerald-400/40
            p-6 mb-6 text-white 
            hover:scale-105 hover:shadow-teal-400/50
            backdrop-blur-xl transition-all duration-300
          "
        >
          <div className="flex items-center gap-4">
            <FaStore className="text-5xl opacity-90" />
            <div>
              <h2 className="text-2xl font-bold">CILANGKAP PUSAT</h2>
              <p className="text-sm opacity-80">Realtime Firebase</p>
            </div>
          </div>

          <div className="mt-5 flex gap-10">
            <div>
              <p className="text-lg opacity-80">TOTAL STOCK SEMUA TOKO</p>
              <p className="text-4xl font-bold">{totalAllStock}</p>
            </div>

            <div>
              <p className="text-lg opacity-80">STOCK PEMBELIAN PUSAT</p>
              <p className="text-4xl font-bold">{stockPembelianPusat}</p>
            </div>
          </div>
        </div>

        {/* ================================================================== */}
        {/* CARD KECIL PER TOKO */}
        {/* ================================================================== */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
          {cardStock.map((c, idx) => (
            <div
              key={idx}
              onClick={() => {
                setPage(1);
                setSelectedToko(c.toko);
              }}
              className={`
                cursor-pointer rounded-2xl 
                bg-gradient-to-br ${c.color}
                hover:scale-105 hover:shadow-xl 
                hover:shadow-white/40 backdrop-blur-md 
                p-5 text-white shadow-lg transition-all duration-300
              `}
            >
              <div className="text-lg font-semibold">{c.toko}</div>
              <div className="text-3xl font-bold mt-3">{c.total}</div>
              <div className="text-xs opacity-80">Total Stock</div>
            </div>
          ))}
        </div>

        {/* ================================================================== */}
        {/* SEARCH */}
        {/* ================================================================== */}
        {selectedToko && (
          <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl mb-5 flex items-center">
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
          <div className="bg-blue-900 p-6 rounded-2xl shadow-2xl overflow-auto">
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
