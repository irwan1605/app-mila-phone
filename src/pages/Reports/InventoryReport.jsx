// ========================== FULL FILE FIXED INVENTORYREPORT.JSX ==========================
// 🔥 Perbaikan lengkap: stok realtime muncul, no error toUpperCase, normalisasi data stok,
//   warning dihilangkan, UI tidak berubah.

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
  listenStockAll,
} from "../../services/FirebaseService";
import StockCard from "./StockCard";

// ===================== Helper: Aman untuk semua format nama toko =====================
const getStockByName = (stock, name) => {
  if (!stock || !name || typeof name !== "string") return {};

  const upper = name?.toUpperCase?.() || name;
  const lower = name?.toLowerCase?.() || name;

  return stock[name] || stock[upper] || stock[lower] || {};
};

// ===================== Helper: Normalisasi struktur stok Firebase =====================
// Firebase Anda menyimpan: stock/toko/<autoId>/{ brand, barang, qty }
// UI butuh struktur: SKU → qty
const normalizeStock = (stokObj = {}) => {
  const result = {};

  Object.values(stokObj).forEach((item) => {
    if (!item) return;

    const brand = item.brand || item.namaBrand || "";
    const barang = item.barang || item.namaBarang || "";
    const sku = `${brand}_${barang}`.replace(/\s+/g, "_").toUpperCase();

    if (!result[sku]) {
      result[sku] = {
        sku,
        nama: barang,
        qty: 0,
      };
    }

    result[sku].qty += Number(item.qty || 0);
  });

  return result;
};

// ===================== Daftar Toko =====================
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

export default function InventoryReport() {
  const navigate = useNavigate();

  // LOGIN USER
  const loggedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const myTokoId = loggedUser?.toko;
  const myTokoName = myTokoId ? TOKO_LIST[myTokoId - 1] : null;
  const isSuper =
    loggedUser?.role === "superadmin" || loggedUser?.role === "admin";

  const [stockRealtime, setStockRealtime] = useState({});
  const [allTransaksi, setAllTransaksi] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedToko, setSelectedToko] = useState(null);
  const [search, setSearch] = useState("");

  // ===================== Listener: STOCK realtime =====================
  useEffect(() => {
    const unsub = listenStockAll((s) => setStockRealtime(s || {}));
    return () => unsub && unsub();
  }, []);

  // ===================== Listener: Transaksi realtime =====================
  useEffect(() => {
    const unsub = listenAllTransaksi((rows) => {
      setAllTransaksi(rows || []);
      setLoading(false);
    });
    return () => unsub && unsub();
  }, []);

  // ===================== Filter transaksi sesuai toko =====================
  const transaksiFinal = useMemo(() => {
    if (isSuper) return allTransaksi;
    return (allTransaksi || []).filter(
      (tx) =>
        String(tx.NAMA_TOKO || tx.TOKO).toUpperCase() ===
        String(myTokoName).toUpperCase()
    );
  }, [allTransaksi, isSuper, myTokoName]);

  // ===================== TOTAL STOCK SEMUA TOKO =====================
  const totalSemuaToko = useMemo(() => {
    let total = 0;
    Object.values(stockRealtime || {}).forEach((tokoData) => {
      Object.values(tokoData || {}).forEach((item) => {
        total += Number(item.qty || 0);
      });
    });
    return total;
  }, [stockRealtime]);

  // ===================== Rekap Stock per Toko =====================
  const stockPerToko = useMemo(() => {
    const data = [];
    const targetToko = isSuper ? TOKO_LIST : [myTokoName];

    targetToko.forEach((toko) => {
      const rawStock = getStockByName(stockRealtime, toko);
      const stokToko = normalizeStock(rawStock);

      const totalQty = Object.values(stokToko).reduce(
        (sum, item) => sum + Number(item.qty || 0),
        0
      );

      data.push({ toko, totalQty, rows: stokToko });
    });

    return data;
  }, [stockRealtime, isSuper, myTokoName]);

  // ===================== Detail Stock per Toko =====================
  const detailRows = useMemo(() => {
    if (!selectedToko) return [];

    const rawStock = getStockByName(stockRealtime, selectedToko);
    const stokToko = normalizeStock(rawStock);

    const rows = Object.entries(stokToko).map(([sku, item]) => ({
      sku,
      nama: item.nama,
      qty: item.qty,
    }));

    if (!search.trim()) return rows;
    const q = search.toLowerCase();

    return rows.filter(
      (r) =>
        String(r.nama || "").toLowerCase().includes(q) ||
        String(r.sku || "").toLowerCase().includes(q)
    );
  }, [selectedToko, search, stockRealtime]);

  // =========================== RENDER ===========================
  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <h2 className="text-2xl md:text-3xl font-bold text-slate-800">
          INVENTORY REPORT
        </h2>

        {/* ================= CARDS ================= */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {stockPerToko.map((row) => (
            <StockCard
              key={row.toko}
              toko={row.toko}
              totalQty={row.totalQty}
              onClick={() => setSelectedToko(row.toko)}
            />
          ))}
        </div>

        {/* ================= DETAIL TABLE ================= */}
        {selectedToko && (
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center mb-3">
              <FaSearch className="text-gray-500" />
              <input
                className="ml-2 flex-1 outline-none bg-transparent"
                placeholder="Cari barang..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-200 text-left">
                  <th className="p-2">SKU</th>
                  <th className="p-2">Nama Barang</th>
                  <th className="p-2">Qty</th>
                </tr>
              </thead>
              <tbody>
                {detailRows.map((r) => (
                  <tr key={r.sku} className="border-b">
                    <td className="p-2">{r.sku}</td>
                    <td className="p-2">{r.nama}</td>
                    <td className="p-2 font-bold">{r.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
