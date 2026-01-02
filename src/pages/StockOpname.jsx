// src/pages/StockOpname.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  listenAllTransaksi,
  addTransaksi,
  updateTransaksi,
  deleteTransaksi,
  addStock,
  reduceStock,
  listenMasterBarangHarga,
} from "../services/FirebaseService";
import StockBarang from "../data/StockBarang";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useLocation } from "react-router-dom";
import { deriveStockFromTransaksi } from "../utils/stockDerived";

import {
  FaEdit,
  FaTrash,
  FaFileExcel,
  FaFilePdf,
  FaSearch,
  FaSave,
  FaTimes,
} from "react-icons/fa";

/* ======================================================
   KONSTANTA
====================================================== */
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

const rowsPerPageDefault = 12;
const FORM_STORAGE_KEY = "stockOpnameFormDraft";

/* ======================================================
   COMPONENT
====================================================== */
export default function StockOpname() {
  /* ================== STATE ================== */
  const [allTransaksi, setAllTransaksi] = useState([]);
  const [form, setForm] = useState({});
  const [editId, setEditId] = useState(null);
  const [opnameMap, setOpnameMap] = useState({});

  const [filterToko, setFilterToko] = useState("semua");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageDefault);

  const [masterHargaMap, setMasterHargaMap] = useState({});
  const tableRef = useRef(null);

  /* ================== USER ================== */
  const loggedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isSuperAdmin =
    loggedUser?.role === "superadmin" || loggedUser?.level === "superadmin";

  const location = useLocation();
  const lockedTokoFromNav = location?.state?.lockedToko || null;

  const tokoLogin =
    lockedTokoFromNav ||
    loggedUser?.toko ||
    localStorage.getItem("TOKO_LOGIN") ||
    null;

  const myTokoId = loggedUser?.toko;

  /* ======================================================
     LOAD MASTER HARGA
  ====================================================== */
  useEffect(() => {
    if (typeof listenMasterBarangHarga !== "function") return;
    const unsub = listenMasterBarangHarga((rows = []) => {
      const map = {};
      rows.forEach((r) => {
        const key =
          (r.NOMOR_UNIK && String(r.NOMOR_UNIK).trim()) ||
          `${r.NAMA_BRAND}|${r.NAMA_BARANG}`;
        map[key] = {
          hargaSRP: Number(r.HARGA_SRP || r.HARGA_UNIT || r.HARGA || 0),
        };
      });
      setMasterHargaMap(map);
    });
    return () => unsub && unsub();
  }, []);

  /* ======================================================
     LOAD TRANSAKSI (SINGLE SOURCE)
  ====================================================== */
  useEffect(() => {
    if (typeof listenAllTransaksi === "function") {
      const unsub = listenAllTransaksi((items = []) => {
        const norm = items.map(normalizeRecord);
        setAllTransaksi(norm.length ? norm : buildTransaksiFromStockBarang());
        setCurrentPage(1);
      });
      return () => unsub && unsub();
    } else {
      setAllTransaksi(buildTransaksiFromStockBarang());
    }
  }, []);

  useEffect(() => {
    if (!isSuperAdmin && tokoLogin) {
      setFilterToko(tokoLogin); // 🔒 PIC toko dikunci ke tokonya
    }
  }, [isSuperAdmin, tokoLogin]);

  /* ======================================================
     STOCK MAP (SUMBER KEBENARAN)
  ====================================================== */
  const stockMap = useMemo(
    () => deriveStockFromTransaksi(allTransaksi),
    [allTransaksi]
  );

  /* ======================================================
     TOKO OPTIONS
  ====================================================== */
  const tokoOptions = useMemo(() => {
    // 🧑‍💼 PIC TOKO → hanya 1 toko
    if (!isSuperAdmin && tokoLogin) {
      return [tokoLogin];
    }

    // 👑 SUPERADMIN → semua toko
    return Array.from(
      new Set([
        ...allTransaksi.map((r) => r.NAMA_TOKO).filter(Boolean),
        ...fallbackTokoNames,
      ])
    );
  }, [isSuperAdmin, tokoLogin, allTransaksi]);

  /* ======================================================
     AGGREGATED STOCK (UNTUK OPNAME CEPAT)
  ====================================================== */
  const aggregated = useMemo(() => {
    let rows = [];

    // ===============================
    // 1. MODE SEMUA TOKO
    // ===============================
    if (filterToko === "semua" && isSuperAdmin) {
      Object.values(stockMap).forEach((perToko) => {
        rows.push(...Object.values(perToko));
      });
    }
    // ===============================
    // 2. MODE TOKO TERTENTU
    // ===============================
    else {
      const tokoAktif = filterToko || tokoLogin;
      if (tokoAktif && stockMap[tokoAktif]) {
        rows = Object.values(stockMap[tokoAktif]);
      }
    }

    // ===============================
    // 3. SEARCH MULTI FIELD
    // ===============================
    if (search.trim()) {
      const q = search.toLowerCase();

      rows = rows.filter((r) =>
        [
          r.key, // IMEI / SKU
          r.toko, // Nama Toko
          r.barang, // Nama Barang
          r.brand, // Nama Brand
          r.kategori, // Kategori (jika ada)
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      );
    }

    return rows;
  }, [stockMap, filterToko, tokoLogin, isSuperAdmin, search]);

  /* ======================================================
     HELPER
  ====================================================== */
  function normalizeRecord(r = {}) {
    return {
      id: r.id || r.key || Date.now().toString(),
      TANGGAL_TRANSAKSI: r.TANGGAL_TRANSAKSI || "",
      NO_INVOICE: r.NO_INVOICE || "",
      NAMA_TOKO: r.NAMA_TOKO || "CILANGKAP PUSAT",
      NAMA_BRAND: r.NAMA_BRAND || "",
      NAMA_BARANG: r.NAMA_BARANG || "",
      QTY: Number(r.QTY || 0),
      NOMOR_UNIK: r.NOMOR_UNIK || "",
      HARGA_SUPLAYER: Number(r.HARGA_SUPLAYER || 0),
      hargaSRP: Number(r.hargaSRP || r.HARGA || 0),
      PAYMENT_METODE: r.PAYMENT_METODE || "",
      STATUS: r.STATUS || "Pending",
      KETERANGAN: r.KETERANGAN || "",
    };
  }

  function buildTransaksiFromStockBarang() {
    if (!Array.isArray(StockBarang)) return [];
    return StockBarang.map((s, i) =>
      normalizeRecord({
        id: `SB-${i}`,
        TANGGAL_TRANSAKSI: new Date().toISOString().slice(0, 10),
        NO_INVOICE: `SB-${i}`,
        NAMA_TOKO: "CILANGKAP PUSAT",
        NAMA_BRAND: s.brand || "",
        NAMA_BARANG: s.nama || "",
        QTY: s.qty || 1,
        NOMOR_UNIK: s.imei || `SKU-${i}`,
        hargaSRP: s.harga || 0,
        STATUS: "Approved",
      })
    );
  }

  const fmt = (v) => Number(v || 0).toLocaleString("id-ID");

  const exportStockOpnameExcel = () => {
    const rows = aggregated.map((r, idx) => ({
      NO: idx + 1,
      TOKO: r.toko,
      SKU_IMEI: r.key,
      BRAND: r.brand,
      BARANG: r.barang,
      KATEGORI: r.kategori || "",
      STOK_SISTEM: r.qty,
      STOK_FISIK: opnameMap[r.key] ?? "",
      SELISIH:
        opnameMap[r.key] === undefined || opnameMap[r.key] === ""
          ? ""
          : Number(opnameMap[r.key]) - Number(r.qty),
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stok_Opname");

    XLSX.writeFile(
      wb,
      `Stock_Opname_${filterToko || "SEMUA_TOKO"}_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`
    );
  };

  /* ======================================================
     SIMPAN OPNAME PER SKU
  ====================================================== */
  const saveOpnameFor = async (record) => {
    const key = record.key;
    const fisik = Number(opnameMap[key] ?? "");
    const sistemQty = Number(record.qty || 0);

    if (Number.isNaN(fisik)) {
      alert("Stok fisik tidak valid");
      return;
    }

    const selisih = fisik - sistemQty;
    if (selisih === 0) {
      alert("Tidak ada selisih");
      return;
    }

    const srp = masterHargaMap[key]?.hargaSRP || 0;

    const payload = {
      TANGGAL_TRANSAKSI: new Date().toISOString().slice(0, 10),
      NO_INVOICE: `OPN-${Date.now()}`,
      NAMA_TOKO: "CILANGKAP PUSAT",
      NAMA_BRAND: record.brand,
      NAMA_BARANG: record.barang,
      QTY: Math.abs(selisih),
      NOMOR_UNIK: key,
      hargaSRP: srp,
      TOTAL: Math.abs(selisih) * srp,
      PAYMENT_METODE: "STOK OPNAME",
      STATUS: "Approved",
    };

    const tokoId =
      fallbackTokoNames.findIndex((n) => n === "CILANGKAP PUSAT") + 1;

    await addTransaksi(tokoId, payload);
    setAllTransaksi((d) => [...d, normalizeRecord(payload)]);
    setOpnameMap((m) => ({ ...m, [key]: "" }));
    alert("Opname berhasil disimpan");
  };

  /* ======================================================
     RENDER
  ====================================================== */
  return (
    <div className="p-4 bg-white rounded-xl shadow">
      <h2 className="text-xl font-bold mb-4 text-blue-700">
        Stok Opname & Inventory Management
      </h2>

      {/* CONTROL BAR */}
      <div className="bg-white rounded-xl shadow-md p-3 mb-4 transition hover:shadow-lg">
        <div className="flex flex-wrap md:flex-nowrap items-center gap-3">
          {/* SEARCH */}
          <div className="flex items-center gap-2 flex-1 min-w-[260px]">
            <FaSearch className="text-gray-500" />
            <input
              placeholder="Cari IMEI / Barang / Brand / Toko / Kategori..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* FILTER TOKO */}
          <div className="min-w-[180px]">
            <select
              value={filterToko}
              onChange={(e) => setFilterToko(e.target.value)}
              disabled={!isSuperAdmin}
              className={`p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                !isSuperAdmin ? "bg-gray-100 cursor-not-allowed" : ""
              }`}
            >
              {isSuperAdmin && <option value="semua">SEMUA TOKO</option>}
              {tokoOptions.map((toko) => (
                <option key={toko} value={toko}>
                  {toko}
                </option>
              ))}
            </select>
          </div>

          {/* EXPORT EXCEL */}
          <div className="flex-shrink-0">
            <button
              onClick={exportStockOpnameExcel}
              className="px-4 py-2 bg-indigo-600 text-white rounded flex items-center gap-2 text-sm hover:bg-indigo-700 transition whitespace-nowrap"
            >
              <FaFileExcel /> Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* OPNAME CEPAT */}
      <div className="overflow-x-auto p-2" ref={tableRef}>
        <table className="w-full text-sm border">
          <thead className="bg-gray-200">
            <tr>
              <th className="p-2 border">No</th>
              <th className="p-2 border">Toko</th>
              <th className="p-2 border">SKU</th>
              <th className="p-2 border">Brand</th>
              <th className="p-2 border">Barang</th>
              <th className="p-2 border">Stok Sistem</th>
              <th className="p-2 border">Stok Fisik</th>
              <th className="p-2 border">Selisih</th>
              <th className="p-2 border">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {aggregated.map((r, i) => {
              const fisik = Number(opnameMap[r.key] ?? "");
              const selisih = Number.isNaN(fisik) ? "" : fisik - r.qty;

              return (
                <tr key={r.key}>
                  <td className="p-2 border text-center">{i + 1}</td>
                  <td className="p-2 border">{r.toko}</td>
                  <td className="p-2 border font-mono">{r.key}</td>
                  <td className="p-2 border">{r.brand}</td>
                  <td className="p-2 border">{r.barang}</td>
                  <td className="p-2 border text-center">{r.qty}</td>
                  <td className="p-2 border">
                    <input
                      className="border p-1 w-20"
                      value={opnameMap[r.key] ?? ""}
                      onChange={(e) =>
                        setOpnameMap((m) => ({
                          ...m,
                          [r.key]: e.target.value,
                        }))
                      }
                    />
                  </td>
                  <td
                    className={`p-2 border text-center ${
                      selisih < 0
                        ? "text-red-600"
                        : selisih > 0
                        ? "text-green-600"
                        : ""
                    }`}
                  >
                    {selisih === "" ? "-" : selisih}
                  </td>
                  <td className="p-2 border text-center">
                    {isSuperAdmin && (
                      <button
                        onClick={() => saveOpnameFor(r)}
                        className="bg-green-600 text-white px-2 py-1 rounded"
                      >
                        <FaSave />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
