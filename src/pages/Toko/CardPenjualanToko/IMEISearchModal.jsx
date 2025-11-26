// src/pages/Toko/CardPenjualanToko/IMEISearchModal.jsx

import React, { useEffect, useMemo, useState } from "react";
import { FaTimes, FaSearch, FaCheck } from "react-icons/fa";

/*
  Props:
  - onClose(): menutup modal
  - onSelect(selectedItems): kirim array item ke CardPenjualanToko.jsx
*/

/*
  Integrasi Firebase:
  Jika di FirebaseService.js tersedia:
   - listenStockAll(cb)
   - listenAllTransaksi(cb)
  maka modal akan tarik data realtime.
*/

import {
  listenStockAll,
  listenAllTransaksi,
} from "../../../services/FirebaseService";

export default function IMEISearchModal({ onClose, onSelect }) {
  const [search, setSearch] = useState("");
  const [stockData, setStockData] = useState([]);
  const [salesData, setSalesData] = useState([]);
  const [selectedMap, setSelectedMap] = useState({}); // key -> data

  // =============================
  // LISTENER MASTER STOK
  // =============================
  useEffect(() => {
    let unsubStock = null;
    let unsubSales = null;

    try {
      if (typeof listenStockAll === "function") {
        unsubStock = listenStockAll((list) => {
          setStockData(Array.isArray(list) ? list : []);
        });
      }
    } catch (e) {
      console.warn("listenStockAll tidak tersedia");
    }

    try {
      if (typeof listenAllTransaksi === "function") {
        unsubSales = listenAllTransaksi((list) => {
          setSalesData(Array.isArray(list) ? list : []);
        });
      }
    } catch (e) {
      console.warn("listenAllTransaksi tidak tersedia");
    }

    return () => {
      if (typeof unsubStock === "function") unsubStock();
      if (typeof unsubSales === "function") unsubSales();
    };
  }, []);

  // =============================
  // GABUNGKAN DATA
  // =============================
  const mergedData = useMemo(() => {
    const stockMapped = stockData.map((s) => ({
      source: "STOCK",
      kategoriBarang: s.KATEGORI || s.kategori || "",
      namaBrand: s.BRAND || s.NAMA_BRAND || "",
      namaBarang: s.NAMA_BARANG || s.barang || "",
      imei: s.IMEI || s.NO_IMEI || "",
      hargaUnit: Number(s.HARGA_JUAL || s.HARGA || s.HARGA_UNIT || 0),
    }));

    const salesMapped = salesData.map((s) => ({
      source: "SALES",
      kategoriBarang: s.KATEGORI_BARANG || "",
      namaBrand: s.NAMA_BRAND || "",
      namaBarang: s.NAMA_BARANG || "",
      imei: s.IMEI || "",
      hargaUnit: Number(s.HARGA_UNIT || s.HARGA || 0),
    }));

    return [...stockMapped, ...salesMapped];
  }, [stockData, salesData]);

  // =============================
  // FILTER HASIL
  // =============================
  const filtered = useMemo(() => {
    if (!search) return mergedData;

    const q = search.toLowerCase();
    return mergedData.filter(
      (d) =>
        String(d.imei).toLowerCase().includes(q) ||
        String(d.namaBarang).toLowerCase().includes(q) ||
        String(d.namaBrand).toLowerCase().includes(q)
    );
  }, [mergedData, search]);

  // =============================
  // TOGGLE PILIH ITEM
  // =============================
  const toggleSelect = (item) => {
    const key = `${item.imei}-${item.namaBarang}`;
    setSelectedMap((prev) => {
      const copy = { ...prev };
      if (copy[key]) delete copy[key];
      else copy[key] = item;
      return copy;
    });
  };

  // =============================
  // KIRIM HASIL KE PARENT
  // =============================
  const handleApply = () => {
    const selectedValues = Object.values(selectedMap).map((it) => ({
      kategoriBarang: it.kategoriBarang || "",
      namaBrand: it.namaBrand || "",
      namaBarang: it.namaBarang || "",
      imei: it.imei || "",
      hargaUnit: Number(it.hargaUnit || 0),
      qty: 1,
      discount: 0,
    }));

    if (selectedValues.length === 0) {
      alert("Pilih minimal 1 IMEI / Barang.");
      return;
    }

    onSelect(selectedValues);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-5xl bg-white/80 backdrop-blur-md rounded-2xl shadow-xl p-4">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">
            Cari IMEI / Barang Global
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-red-100 text-red-600"
          >
            <FaTimes />
          </button>
        </div>

        {/* SEARCH */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 relative">
            <FaSearch className="absolute left-3 top-3 text-slate-400 text-sm" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari IMEI / Nama Barang / Brand..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <button
            onClick={handleApply}
            className="px-3 py-2 rounded-lg bg-indigo-600 text-white flex items-center gap-1 text-sm"
          >
            <FaCheck /> Pilih
          </button>
        </div>

        {/* TABLE */}
        <div className="max-h-[420px] overflow-auto border border-slate-200 rounded-lg bg-white">
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-slate-100 sticky top-0">
              <tr>
                <th className="p-2 text-left">Pilih</th>
                <th className="p-2 text-left">Sumber</th>
                <th className="p-2 text-left">Kategori</th>
                <th className="p-2 text-left">Brand</th>
                <th className="p-2 text-left">Nama Barang</th>
                <th className="p-2 text-left">IMEI</th>
                <th className="p-2 text-right">Harga</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-slate-500">
                    Data tidak ditemukan.
                  </td>
                </tr>
              )}

              {filtered.map((item, idx) => {
                const key = `${item.imei}-${item.namaBarang}`;
                const checked = !!selectedMap[key];

                return (
                  <tr
                    key={idx}
                    className={`border-t ${
                      checked ? "bg-indigo-50" : "hover:bg-slate-50"
                    }`}
                  >
                    <td className="p-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelect(item)}
                      />
                    </td>
                    <td className="p-2 text-xs">{item.source}</td>
                    <td className="p-2">{item.kategoriBarang}</td>
                    <td className="p-2">{item.namaBrand}</td>
                    <td className="p-2">{item.namaBarang}</td>
                    <td className="p-2 font-mono">{item.imei}</td>
                    <td className="p-2 text-right">
                      Rp {Number(item.hargaUnit || 0).toLocaleString("id-ID")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* FOOTER INFO */}
        <div className="mt-2 text-[11px] text-slate-500">
          * Data diambil dari Master Stok dan Riwayat Penjualan. * Bisa memilih
          lebih dari 1 IMEI sekaligus.
        </div>
      </div>
    </div>
  );
}
