import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  listenAllTransaksi,
  listenMasterBarang,
  listenTransaksiByTokoHemat,
} from "../../services/FirebaseService";

import { ref, onValue } from "firebase/database";
import { db } from "../../firebase";
import * as XLSX from "xlsx";
import { FaSearch, FaExchangeAlt } from "react-icons/fa";

/* ======================
   HELPER RUPIAH
====================== */
const rupiah = (n) =>
  Number(n || 0).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  });

  const normalizeImei = (v) =>
    String(v || "")
      .toLowerCase()
      .replace(/[^0-9]/g, "");
  
  const normalizeText = (v) =>
    String(v || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, " ");

// ======================================
// 🔥 NORMALIZE UNIVERSAL
// ======================================
const normalize = (v) =>
  String(v || "")
    .trim()
    .toUpperCase();

export default function DetailStockAllToko() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const tableRef = useRef(null);

  const [transaksi, setTransaksi] = useState([]);
  const [masterBarang, setMasterBarang] = useState([]);
  const [detailStock, setDetailStock] = useState({});

  // ======================================
  // 🔥 DETAIL STOCK REALTIME
  // ======================================
  useEffect(() => {
    const stockRef = ref(db, "detail_stock");

    const unsub = onValue(stockRef, (snap) => {
      setDetailStock(snap.val() || {});
    });

    return () => unsub();
  }, []);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  /* ======================
     LISTEN REALTIME
  ====================== */
  const tokoId = state?.tokoId;
  // ======================================
  // 🔥 ALL TRANSAKSI FINAL
  // ======================================
  useEffect(() => {
    const unsub = listenAllTransaksi((rows) => {
      setTransaksi(rows || []);
    });

    return () => unsub && unsub();
  }, []);

  /* ======================
     MAP MASTER BARANG
  ====================== */
  const masterMap = useMemo(() => {
    const map = {};
    masterBarang.forEach((b) => {
      if (!b.brand || !b.namaBarang) return;
      const key = `${b.brand}|${b.namaBarang}`;
      map[key] = {
        hargaSRP: Number(b.harga?.srp ?? b.hargaSRP ?? 0),
        hargaGrosir: Number(b.harga?.grosir ?? b.hargaGrosir ?? 0),
        hargaReseller: Number(b.harga?.reseller ?? b.hargaReseller ?? 0),
      };
    });
    return map;
  }, [masterBarang]);

  // ======================================
  // 🔥 MASTER BARANG REALTIME
  // ======================================
  useEffect(() => {
    const unsub = listenMasterBarang((rows) => {
      setMasterBarang(rows || []);
    });

    return () => unsub && unsub();
  }, []);

  // ======================================
  // 🔥 IMEI TERJUAL FINAL
  // ======================================
  const imeiTerjual = useMemo(() => {
    const soldSet = new Set();

    transaksi.forEach((t) => {
      if (!t?.IMEI) return;

      const imei = normalizeImei(t.IMEI);

      const metode = String(t.PAYMENT_METODE || "").toUpperCase();

      const status = String(t.STATUS || "").toUpperCase();

      if (!["APPROVED", "REFUND"].includes(status)) {
        return;
      }

      if (metode === "PENJUALAN") {
        soldSet.add(imei);
      }

      if (metode === "REFUND") {
        soldSet.delete(imei);
      }
    });

    return soldSet;
  }, [transaksi]);

  // ======================================
  // 🔥 REFUND ACTIVE FINAL
  // ======================================
  const refundAvailableSet = useMemo(() => {
    const set = new Set();

    transaksi.forEach((t) => {
      const metode = String(t.PAYMENT_METODE || "").toUpperCase();

      const status = String(t.STATUS || "").toUpperCase();

      if (
        metode === "REFUND" &&
        ["APPROVED", "REFUND"].includes(status) &&
        t.IMEI
      ) {
        set.add(normalizeImei(t.IMEI));
      }
    });

    Object.values(detailStock || {}).forEach((s) => {
      if (String(s.LAST_ACTION || "").toUpperCase() === "REFUND" && s.imei) {
        set.add(normalizeImei(s.imei));
      }
    });

    return set;
  }, [transaksi, detailStock]);

  // ======================================
  // 🔥 BUILD ROWS FINAL UNIVERSAL
  // ======================================
  const rows = useMemo(() => {
    const map = {};

    transaksi.forEach((t) => {
      if (!t) return;

      const status = String(t.STATUS || "").toUpperCase();

      if (!["APPROVED", "REFUND"].includes(status)) {
        return;
      }

      const metode = String(t.PAYMENT_METODE || "").toUpperCase();

      const toko = t.NAMA_TOKO || "-";

      // ======================================
      // 🔥 HANYA TOKO AKTIF
      // ======================================
      if (state?.title && normalize(toko) !== normalize(state.title)) {
        return;
      }

      // ======================================
      // 🔥 IMEI
      // ======================================
      if (t.IMEI) {
        const cleanImei = normalizeImei(t.IMEI);

        const key = `${toko}|${cleanImei}`;

        if (!map[key]) {
          map[key] = {
            key,

            tanggal: t.TANGGAL_TRANSAKSI || "-",

            noDo: t.NO_INVOICE || "-",

            supplier: t.NAMA_SUPPLIER || "-",

            namaToko: toko,

            brand: t.NAMA_BRAND || "-",

            barang: t.NAMA_BARANG || "-",

            imei: t.IMEI,

            qty: 0,

            statusBarang: "TERSEDIA",

            lastTransaksi: metode,
          };
        }

        // STOCK MASUK
        if (
          [
            "PEMBELIAN",
            "TRANSFER_MASUK",
            "TRANSFER_REJECT",
            "REFUND",
            "RETUR",
            "VOID OPNAME",
          ].includes(metode)
        ) {
          map[key].qty = 1;
        }

        // STOCK KELUAR
        if (["PENJUALAN", "TRANSFER_KELUAR", "STOK OPNAME"].includes(metode)) {
          map[key].qty = 0;
        }

        return;
      }

      // ======================================
      // 🔥 NON IMEI
      // ======================================
      const skuKey =
        `${normalizeText(toko)}|` +
        `${normalizeText(t.NAMA_BRAND)}|` +
        `${normalizeText(t.NAMA_BARANG)}`;

      if (!map[skuKey]) {
        const master = masterMap[`${t.NAMA_BRAND}|${t.NAMA_BARANG}`] || {};

        map[skuKey] = {
          key: skuKey,

          tanggal: t.TANGGAL_TRANSAKSI || "-",

          noDo: t.NO_INVOICE || "-",

          supplier: t.NAMA_SUPPLIER || "-",

          namaToko: toko,

          brand: t.NAMA_BRAND || "-",

          barang: t.NAMA_BARANG || "-",

          imei: "",

          qty: 0,

          hargaSRP: master.hargaSRP || 0,
          hargaGrosir: master.hargaGrosir || 0,
          hargaReseller: master.hargaReseller || 0,

          statusBarang: "TERSEDIA",

          lastTransaksi: metode,
        };
      }

      const qty = Number(t.QTY || 0);

      if (
        [
          "PEMBELIAN",
          "TRANSFER_MASUK",
          "REFUND",
          "RETUR",
          "VOID OPNAME",
        ].includes(metode)
      ) {
        map[skuKey].qty = Number(map[skuKey].qty || 0) + Math.abs(qty);
      }

      if (["PENJUALAN", "TRANSFER_KELUAR", "STOK OPNAME"].includes(metode)) {
        map[skuKey].qty = Number(map[skuKey].qty || 0) - Math.abs(qty);
      }
    });

    // ======================================
    // 🔥 FALLBACK detail_stock FINAL
    // ======================================
    Object.values(detailStock || {}).forEach((s) => {
      if (!s?.imei) return;

      const cleanImei = normalizeImei(s.imei);

      if (imeiTerjual.has(cleanImei) && !refundAvailableSet.has(cleanImei)) {
        return;
      }

      const key = `${s.toko}|${cleanImei}`;

      if (map[key]) {
        return;
      }

      const status = String(s.STATUS || s.status || "").toUpperCase();

      if (!["AVAILABLE", "REFUND"].includes(status)) {
        return;
      }

      map[key] = {
        key,

        tanggal: s.updatedAt || s.tanggal || "-",

        noDo: "-",

        supplier: "-",

        namaToko: s.toko || "-",

        brand: s.brand || "-",

        barang: s.namaBarang || "-",

        imei: s.imei,

        qty: 1,

        statusBarang: "TERSEDIA",

        lastTransaksi: String(s.LAST_ACTION || "DETAIL_STOCK").toUpperCase(),
      };
    });

    // ======================================
    // 🔥 FINAL FILTER
    // ======================================
    const finalRows = Object.values(map).filter((r) => {
      if (!r.imei) {
        return Number(r.qty || 0) > 0;
      }

      // ======================================
      // 🔥 HAPUS DATA LIAR
      // ======================================
      if (!String(r.brand || "").trim() || !String(r.barang || "").trim()) {
        return false;
      }

      if (Number(r.qty || 0) <= 0) {
        return false;
      }

      const cleanImei = normalizeImei(r.imei);

      if (imeiTerjual.has(cleanImei) && !refundAvailableSet.has(cleanImei)) {
        return false;
      }

      // ======================================
      // 🔥 TRANSFER TERAKHIR
      // ======================================
      const latestTransfer = transaksi
        .filter(
          (t) =>
            normalizeImei(t.IMEI) === cleanImei &&
            String(t.PAYMENT_METODE || "").toUpperCase() === "TRANSFER_MASUK" &&
            String(t.STATUS || "").toUpperCase() === "APPROVED"
        )

        .sort(
          (a, b) =>
            new Date(b.TANGGAL_TRANSAKSI || 0).getTime() -
            new Date(a.TANGGAL_TRANSAKSI || 0).getTime()
        )[0];

      // ======================================
      // 🔥 HANYA TOKO TERBARU
      // ======================================
      if (latestTransfer) {
        const latestTransferDate = new Date(
          latestTransfer.TANGGAL_TRANSAKSI || 0
        ).getTime();

        const currentDate = new Date(r.tanggal || 0).getTime();

        if (
          currentDate < latestTransferDate &&
          normalize(r.namaToko) !== normalize(latestTransfer.NAMA_TOKO)
        ) {
          return false;
        }
      }

      return Number(r.qty || 0) > 0;
    });

    // ======================================
    // 🔥 REMOVE DUPLIKAT FINAL SAFE
    // ======================================
    const uniqueMap = new Map();

    finalRows.forEach((r) => {
      const uniqueKey = r.imei
        ? normalizeImei(r.imei)
        : `${normalizeText(r.brand)}|${normalizeText(r.barang)}|${normalize(
            r.namaToko
          )}`;

      // ======================================
      // 🔥 DATA PERTAMA
      // ======================================
      if (!uniqueMap.has(uniqueKey)) {
        uniqueMap.set(uniqueKey, r);
        return;
      }

      const oldRow = uniqueMap.get(uniqueKey);

      const oldDate = new Date(oldRow?.tanggal || 0).getTime();

      const newDate = new Date(r?.tanggal || 0).getTime();

      // ======================================
      // 🔥 REFUND PRIORITAS
      // ======================================
      if (String(r.lastTransaksi || "").toUpperCase() === "REFUND") {
        uniqueMap.set(uniqueKey, r);
        return;
      }

      // ======================================
      // 🔥 TRANSFER TERBARU MENANG
      // ======================================
      if (newDate >= oldDate) {
        uniqueMap.set(uniqueKey, r);
      }
    });

    return Array.from(uniqueMap.values());
  }, [transaksi, masterMap, detailStock, imeiTerjual, refundAvailableSet]);

  /* ======================
     SEARCH
  ====================== */
  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.brand.toLowerCase().includes(q) ||
        r.barang.toLowerCase().includes(q) ||
        r.imei.toLowerCase().includes(q) ||
        r.noDo.toLowerCase().includes(q)
    );
  }, [rows, search]);

  /* ======================
     PAGINATION
  ====================== */
  const pageCount = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  /* ======================
     EXPORT EXCEL
  ====================== */
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DetailStock");
    XLSX.writeFile(wb, "Detail_Stock_Semua_Toko.xlsx");
  };

  /* ======================
     RENDER
  ====================== */
  return (
    <div className="p-4 min-h-screen bg-slate-900 text-white">
      <h2 className="text-xl font-bold mb-4">
        {state?.title || "Detail Stok Semua Toko"}
      </h2>

      <div
        ref={tableRef}
        className="bg-white/10 p-4 rounded-xl mb-4 flex items-center"
      >
        <FaSearch />
        <input
          className="ml-3 flex-1 bg-transparent outline-none"
          placeholder="Cari NO DO / Brand / Barang / IMEI"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <button
          onClick={exportExcel}
          className="ml-4 bg-green-600 px-4 py-2 rounded"
        >
          Export
        </button>
      </div>

      <div
        className="
  bg-white 
  text-slate-800
  rounded-2xl 
  shadow-xl 
  overflow-x-auto
  scrollbar-dark
"
      >
        <table className="w-full text-sm min-w-[2000px]">
          <thead className="bg-blue-100 sticky top-0 z-10 text-xs uppercase tracking-wider">
            <tr
              className="
    border-b border-blue-700
    odd:bg-blue-300/40 even:bg-blue-900/20
    hover:bg-blue-300/60
    transition-colors duration-150
  "
            >
              <th className="px-3 py-2 text-left whitespace-nowrap">No</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Tanggal</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">NO DO</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">
                Supplier
              </th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Toko</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Brand</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Barang</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">IMEI</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Qty</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">
                Harga SRP
              </th>
              <th className="px-3 py-2 text-left whitespace-nowrap">
                Total SRP
              </th>
              <th className="px-3 py-2 text-left whitespace-nowrap">
                Harga Grosir
              </th>
              <th className="px-3 py-2 text-left whitespace-nowrap">
                Total Grosir
              </th>
              <th className="px-3 py-2 text-left whitespace-nowrap">
                Harga Reseller
              </th>
              <th className="px-3 py-2 text-left whitespace-nowrap">
                Total Reseller
              </th>
              <th className="px-3 py-2">STATUS</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {paginated.map((r, i) => (
              <tr key={i} className="border-b border-blue-700">
                <td className="px-3 py-2 text-center font-mono">
                  {(page - 1) * pageSize + i + 1}
                </td>
                <td className="px-3 py-2 text-right font-mono">{r.tanggal}</td>
                <td className="px-3 py-2 text-right font-mono">{r.noDo}</td>
                <td className="px-3 py-2 text-right font-mono">{r.supplier}</td>
                <td className="px-3 py-2 text-right font-mono">{r.namaToko}</td>
                <td className="px-3 py-2 text-right font-mono">{r.brand}</td>
                <td className="px-3 py-2 text-right font-mono" td>
                  {r.barang}
                </td>
                <td className="px-3 py-2 text-right font-mono">{r.imei}</td>
                <td className="px-3 py-2 text-right font-mono">{r.qty}</td>
                <td className="px-3 py-2 text-right font-mono">
                  {rupiah(r.hargaSRP)}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {rupiah(r.totalSRP)}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {rupiah(r.hargaGrosir)}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {rupiah(r.totalGrosir)}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {rupiah(r.hargaReseller)}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {rupiah(r.totalReseller)}
                </td>

                <td className="px-3 py-2 text-center font-bold">
                  {r.statusBarang}
                </td>

                <td className="px-3 py-2 text-right font-mono">
                  <button
                    onClick={() =>
                      navigate("/transfer-barang", {
                        state: r,
                      })
                    }
                    title="Transfer Barang"
                    className="
    group flex items-center gap-2
    px-3 py-1.5 rounded-lg
    bg-gradient-to-r from-yellow-400 to-orange-500
    hover:from-orange-500 hover:to-yellow-500
    shadow-md hover:shadow-yellow-400/50
    text-white text-xs font-semibold
    transition-all duration-200
    mx-auto
  "
                  >
                    <FaExchangeAlt className="text-sm group-hover:rotate-180 transition-transform duration-300" />
                    <span className="hidden md:inline">Transfer</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between mt-4">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>
            Prev
          </button>
          <span>
            Page {page} / {pageCount}
          </span>
          <button
            disabled={page === pageCount}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
