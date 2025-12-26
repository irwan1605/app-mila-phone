// ======================================================================
// INVENTORY REPORT — PRO MAX FINAL VERSION
// ======================================================================
import React, { useEffect, useMemo, useState, useRef } from "react";

import {
  listenAllTransaksi,
  listenMasterBarang,
  updateTransaksi,
  listenTransferRequests,
  listenMasterToko,
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
// ===================================================
// 🔑 FINAL HELPER — REALTIME INVENTORY IMEI (NO HOOK)
// ===================================================
import { get, ref } from "firebase/database";
import { db } from "../../firebase/FirebaseInit";

export const getAvailableImeisFromInventoryReport = async (
  toko,
  namaBarang
) => {
  if (!toko || !namaBarang) return [];

  const snap = await get(ref(db, "inventory"));
  if (!snap.exists()) return [];

  const result = [];

  snap.forEach((child) => {
    const row = child.val();

    if (
      String(row.toko || row.NAMA_TOKO).toUpperCase() ===
        String(toko).toUpperCase() &&
      String(row.namaBarang || row.NAMA_BARANG) === String(namaBarang) &&
      String(row.status || row.STATUS) === "AVAILABLE" &&
      row.imei
    ) {
      result.push(String(row.imei));
    }
  });

  return result;
};

// =======================
// LIST TOKO
// =======================

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
  const [masterToko, setMasterToko] = useState([]);

  useEffect(() => {
    const unsub = listenMasterToko((rows) => {
      setMasterToko(rows || []);
    });
    return () => unsub && unsub();
  }, []);

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

  /* ================= LISTENER ================= */
  useEffect(() => {
    const u1 = listenAllTransaksi(setTransaksi);
    const u2 = listenTransferRequests(setTransferData);
    const u3 = listenMasterBarang((rows) => {
      const map = {};
      (rows || []).forEach((b) => {
        const key = `${b.NAMA_BRAND}|${b.NAMA_BARANG}`;
        map[key] = b;
      });
      setMasterBarangMap(map);
    });

    return () => {
      u1 && u1();
      u2 && u2();
      u3 && u3();
    };
  }, []);

  useEffect(() => {
    if (selectedToko === "CILANGKAP PUSAT") {
      // logic di sini
    }
  }, [selectedToko]);

  // ✅ HELPER (BUKAN HOOK)
  const resolveNamaToko = (trx) => {
    if (trx?.NAMA_TOKO) return trx.NAMA_TOKO;
    if (trx?.tokoId) {
      const t = masterToko.find((x) => String(x.id) === String(trx.tokoId));
      return t?.nama || "-";
    }
    return "-";
  };

  // ==========================
  // STOCK BY TOKO (SINGLE SOURCE OF TRUTH)
  // ==========================
  const stokByToko = useMemo(() => {
    const map = {};

    // init semua toko
    masterToko.forEach((t) => {
      map[t.nama] = { kategori: {}, items: [] };
    });

    // transaksi pembelian
    transaksi.forEach((t) => {
      if (t.STATUS !== "Approved" || t.PAYMENT_METODE !== "PEMBELIAN") return;

      const toko = resolveNamaToko(t);
      if (!map[toko]) return;

      const kat = t.KATEGORI_BRAND || "LAINNYA";
      const qty = t.IMEI ? 1 : Number(t.QTY || 0);

      map[toko].kategori[kat] = (map[toko].kategori[kat] || 0) + qty;
      map[toko].items.push(t);
    });

    return map;
  }, [transaksi, masterToko]);

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
  // const stockPembelianPusat = useMemo(() => {
  //   const pusat = stockData["CILANGKAP PUSAT"] || {};
  //   return Object.values(pusat).reduce((s, i) => s + Number(i.qty || 0), 0);
  // }, [stockData]);

  // ==========================
  // MASTER DATA PEMBELIAN (SINGLE SOURCE OF TRUTH)
  // ==========================
  const pembelianApproved = useMemo(() => {
    return transaksi.filter(
      (t) => t.STATUS === "Approved" && t.PAYMENT_METODE === "PEMBELIAN"
    );
  }, [transaksi]);

  // const transferMap = useMemo(() => {
  //   const map = {};

  //   transferData.forEach((t) => {
  //     if (t.status !== "Approved") return;

  //     const qty = Array.isArray(t.imeis) ? t.imeis.length : Number(t.qty || 0);
  //     const key = `${t.brand}|${t.barang}`;

  //     // OUT
  //     if (!map[t.dari]) map[t.dari] = {};
  //     map[t.dari][key] = (map[t.dari][key] || 0) - qty;

  //     // IN
  //     if (!map[t.ke]) map[t.ke] = {};
  //     map[t.ke][key] = (map[t.ke][key] || 0) + qty;
  //   });

  //   return map;
  // }, [transferData]);

  // ==========================
  // DETAIL TABLE
  // ==========================
  // ==========================
  // DETAIL TABLE = MASTER PEMBELIAN
  // ==========================
  // ==========================
  // DETAIL TABLE (NORMALIZED DARI MASTER PEMBELIAN)
  // ==========================

  const normalize = (v) =>
    String(v || "")
      .trim()
      .replace(/\s+/g, " ")
      .toUpperCase();

  const detailTable = useMemo(() => {
    if (!selectedToko) return [];

    return pembelianApproved
      .filter((t) => resolveNamaToko(t) === selectedToko)
      .map((t) => {
        const qty = t.IMEI ? 1 : Number(t.QTY || 0);

        const brand = normalize(t.NAMA_BRAND || t.namaBrand);
        const barang = normalize(t.NAMA_BARANG || t.namaBarang);
        const key = `${brand}|${barang}`;

        const master = masterBarangMap[key] || {};

        const hargaSRP = Number(master.hargaSRP) || Number(t.HARGA_SRP) || 0;
        const hargaGrosir =
          Number(master.hargaGrosir) || Number(t.HARGA_GROSIR) || 0;
        const hargaReseller =
          Number(master.hargaReseller) || Number(t.HARGA_RESELLER) || 0;

        return {
          id: t.id,
          tokoId: t.tokoId,

          tanggal: t.TANGGAL_TRANSAKSI || "-",
          noDo: t.NO_INVOICE || "-",
          supplier: t.NAMA_SUPPLIER || "-",

          // ✅ NAMA TOKO DARI MASTER TOKO
          namaToko: resolveNamaToko(t),

          brand,
          barang,
          imei: t.IMEI || "-",
          qty,

          hargaSRP,
          totalSRP: hargaSRP * qty,

          hargaGrosir,
          totalGrosir: hargaGrosir * qty,

          hargaReseller,
          totalReseller: hargaReseller * qty,

          band1: master.band1 || t.NAMA_BANDLING_1 || "-",
          hband1: Number(master.hband1 || t.HARGA_BANDLING_1 || 0),
          totalBand1: qty * Number(master.hband1 || t.HARGA_BANDLING_1 || 0),

          band2: master.band2 || t.NAMA_BANDLING_2 || "-",
          hband2: Number(master.hband2 || t.HARGA_BANDLING_2 || 0),
          totalBand2: qty * Number(master.hband2 || t.HARGA_BANDLING_2 || 0),

          band3: master.band3 || t.NAMA_BANDLING_3 || "-",
          hband3: Number(master.hband3 || t.HARGA_BANDLING_3 || 0),
          totalBand3: qty * Number(master.hband3 || t.HARGA_BANDLING_3 || 0),

          transferIn: 0,
          transferOut: 0,
        };
      });
  }, [selectedToko, pembelianApproved, masterBarangMap, masterToko]);

  // ======================================================================
  // PAGINATION
  // ======================================================================
  const pageCount = Math.ceil(detailTable.length / pageSize);
  const data = detailTable.slice((page - 1) * pageSize, page * pageSize);

  // ==========================
  // CARD KECIL PER TOKO + KATEGORI
  // ==========================
  const cardStockPerToko = useMemo(() => {
    return masterToko.map((toko) => {
      const kategori = {};

      pembelianApproved.forEach((t) => {
        if (resolveNamaToko(t) !== toko.nama) return;

        const k = t.KATEGORI_BRAND || "LAINNYA";
        const qty = t.IMEI ? 1 : Number(t.QTY || 0);
        kategori[k] = (kategori[k] || 0) + qty;
      });

      return { toko: toko.nama, kategori };
    });
  }, [pembelianApproved, masterToko]);

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
          onClick={() =>
            navigate("/table/detail-stock-all-toko", {
              state: {
                title: "Detail Stok: TOTAL STOCK SEMUA TOKO CILANGKAP PUSAT",
                source: "ALL_TOKO",
              },
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
                    source: "CARD_TOKO",
                  },
                })
              }
              className={`cursor-pointer rounded-2xl p-4 bg-gradient-to-br ${
                CARD_COLORS[i % CARD_COLORS.length]
              } hover:scale-105 transition-transform`}
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
      </div>
    </div>
  );
}
