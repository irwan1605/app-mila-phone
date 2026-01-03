// ======================================================================
// INVENTORY REPORT — PRO MAX FINAL (FIX 100%)
// ======================================================================
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  listenAllTransaksi,
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
import { hitungSemuaStok } from "../../utils/stockUtils";

// =======================
// CONST
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

const rupiah = (n) =>
  Number(n || 0).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  });

const normalize = (v) =>
  String(v || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

// ======================================================================
// COMPONENT
// ======================================================================
export default function InventoryReport() {
  const navigate = useNavigate();
  const tableRef = useRef(null);

  const [transaksi, setTransaksi] = useState([]);
  const [masterBarangMap, setMasterBarangMap] = useState({});
  const [selectedToko, setSelectedToko] = useState(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // ======================
  // LISTENER
  // ======================
  useEffect(() => {
    const unsubTrx = listenAllTransaksi(setTransaksi);
    const unsubBarang = listenMasterBarang((rows) => {
      const map = {};
      rows?.forEach((b) => {
        const key = `${normalize(b.NAMA_BRAND)}|${normalize(b.NAMA_BARANG)}`;
        map[key] = {
          hargaSRP: Number(b.HARGA_SRP || 0),
          hargaGrosir: Number(b.HARGA_GROSIR || 0),
          hargaReseller: Number(b.HARGA_RESELLER || 0),
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

    return () => {
      unsubTrx && unsubTrx();
      unsubBarang && unsubBarang();
    };
  }, []);

  // ======================
  // MAP TRANSAKSI
  // ======================
  const transaksiToko = useMemo(() => {
    const map = {};
    transaksi.forEach((t) => t?.id && (map[t.id] = t));
    return map;
  }, [transaksi]);

  // ======================
  // STOK GLOBAL
  // ======================
  const stokMap = useMemo(
    () => hitungSemuaStok(transaksiToko),
    [transaksiToko]
  );

  // ======================
  // DETAIL TABLE
  // ======================
  const detailTable = useMemo(() => {
    if (!selectedToko) return [];

    return transaksi
      .filter(
        (t) =>
          t.STATUS === "Approved" &&
          t.PAYMENT_METODE === "PEMBELIAN" &&
          t.NAMA_TOKO === selectedToko &&
          `${t.NAMA_BRAND} ${t.NAMA_BARANG} ${t.IMEI}`
            .toLowerCase()
            .includes(search.toLowerCase())
      )
      .map((t) => {
        const key = `${normalize(t.NAMA_BRAND)}|${normalize(t.NAMA_BARANG)}`;
        const m = masterBarangMap[key] || {};
        const qty = t.IMEI ? 1 : Number(t.QTY || 0);

        return {
          id: t.id,
          tokoId: t.tokoId,
          tanggal: t.TANGGAL_TRANSAKSI,
          noDo: t.NO_INVOICE,
          supplier: t.NAMA_SUPPLIER,
          brand: normalize(t.NAMA_BRAND),
          barang: normalize(t.NAMA_BARANG),
          imei: t.IMEI || "-",
          qty,
          hargaSRP: m.hargaSRP || 0,
          totalSRP: qty * (m.hargaSRP || 0),
          hargaGrosir: m.hargaGrosir || 0,
          totalGrosir: qty * (m.hargaGrosir || 0),
          hargaReseller: m.hargaReseller || 0,
          totalReseller: qty * (m.hargaReseller || 0),
          band1: m.band1,
          hband1: m.hband1,
          totalBand1: qty * (m.hband1 || 0),
          band2: m.band2,
          hband2: m.hband2,
          totalBand2: qty * (m.hband2 || 0),
          band3: m.band3,
          hband3: m.hband3,
          totalBand3: qty * (m.hband3 || 0),
          transferIn: 0,
          transferOut: 0,
        };
      });
  }, [transaksi, selectedToko, search, masterBarangMap]);

  // ======================
  // PAGINATION
  // ======================
  const pageCount = Math.ceil(detailTable.length / pageSize);
  const data = detailTable.slice((page - 1) * pageSize, page * pageSize);

  // ==========================
  // CARD KECIL PER TOKO + PER KATEGORI (FIX)
  // ==========================
  const cardStockPerToko = useMemo(() => {
    return TOKO_LIST.map((toko) => {
      const kategori = {};

      transaksi.forEach((t) => {
        if (t.STATUS !== "Approved") return;
        if (t.NAMA_TOKO !== toko) return;

        const kat = t.KATEGORI_BRAND || "LAINNYA";
        const qty = t.IMEI ? 1 : Number(t.QTY || 0);

        // STOK MASUK
        if (["PEMBELIAN", "TRANSFER_MASUK"].includes(t.PAYMENT_METODE)) {
          kategori[kat] = (kategori[kat] || 0) + qty;
        }

        // STOK KELUAR
        if (["PENJUALAN", "TRANSFER_KELUAR"].includes(t.PAYMENT_METODE)) {
          kategori[kat] = (kategori[kat] || 0) - qty;
        }
      });

      return { toko, kategori };
    });
  }, [transaksi]);

  // ==========================
  // TOTAL STOCK SEMUA TOKO (DARI CARD KECIL)
  // ==========================
  const totalStockSemuaToko = useMemo(() => {
    return cardStockPerToko.reduce((grandTotal, toko) => {
      const totalPerToko = Object.values(toko.kategori || {}).reduce(
        (sum, qty) => sum + Number(qty || 0),
        0
      );

      return grandTotal + totalPerToko;
    }, 0);
  }, [cardStockPerToko]);

  // ======================
  // EXPORT
  // ======================
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
        <h1 className="text-3xl font-bold mb-6">INVENTORY REPORT — MILA PHONE</h1>

        {/* ================================================================== */}
        {/* CARD BESAR CILANGKAP PUSAT */}
        {/* ================================================================== */}
        {/* CARD BESAR PUSAT */}
        <div
          onClick={() =>
            navigate("/table/detail-stock-all-toko", {
              state: { mode: "ALL_TOKO" },
            })
          }
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
              onClick={() =>
                navigate("/table/detail-stock-toko", {
                  state: {
                    namaToko: t.toko,
                    title: `Detail Stok Toko : ${t.toko}`,
                  },
                })
              }
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
