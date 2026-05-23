import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  listenAllTransaksi,
  listenMasterBarang,
  listenMasterToko,
  deleteTransaksi,
} from "../../services/FirebaseService";
import { ref, remove, get, onValue } from "firebase/database";
import { db } from "../../firebase";
import * as XLSX from "xlsx";
import {
  FaSearch,
  FaExchangeAlt,
  FaFileExcel,
  FaCashRegister,
} from "react-icons/fa";
import { buildFinalStockRows } from "../../transfer";
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
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

const normalizeText = (v) =>
  String(v || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");

// ======================================
// 🔥 FINAL STATUS VALIDATOR
// ======================================
const isApproved = (t) => {
  const status = String(t.STATUS || t.status || "")
    .trim()
    .toUpperCase();

  return ["APPROVED", "APPROVE", "REFUND"].includes(status);
};

export default function DetailStockToko(props) {
  const { state } = useLocation();
  const navigate = useNavigate();
  const tableRef = useRef(null);

  const namaToko = props?.namaToko || state?.namaToko || "";

  /* ======================
     STATE
  ====================== */
  const [transaksi, setTransaksi] = useState([]);
  const [masterBarang, setMasterBarang] = useState([]);
  const [search, setSearch] = useState(props?.searchTerm || "");
  const [masterToko, setMasterToko] = useState([]);

  // ======================================
  // 🔥 SYNC SEARCH DASHBOARD
  // ======================================
  useEffect(() => {
    if (props?.searchTerm !== undefined) {
      setSearch(props.searchTerm);
    }
  }, [props?.searchTerm]);

  const [page, setPage] = useState(1);
  const [deletedIds, setDeletedIds] = useState(new Set());
  const [detailStock, setDetailStock] = useState({});

  const pageSize = 25;

  // ======================================
  // 🔥 LISTENER DETAIL STOCK
  // ======================================
  useEffect(() => {
    const refStock = ref(db, "detail_stock");

    const unsub = onValue(refStock, (snap) => {
      setDetailStock(snap.val() || {});
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub1 = listenAllTransaksi((rows) => {
      const filtered = (rows || []).filter((r) => !deletedIds.has(r.id));
      setTransaksi(filtered);
    });

    const unsub2 = listenMasterBarang((rows) => setMasterBarang(rows || []));

    const unsub3 = listenMasterToko((rows) => setMasterToko(rows || []));

    return () => {
      unsub1 && unsub1();
      unsub2 && unsub2();
      unsub3 && unsub3();
    };
  }, [deletedIds]); // 🔥 WAJIB

  // ===============================
  // 🔥 STOCK ENGINE UNIVERSAL
  // ===============================
  const getStockEffectUniversal = (t) => {
    const metode = String(t.PAYMENT_METODE || "").toUpperCase();
    const qtyBase = t.IMEI ? 1 : Number(t.QTY || 0);

    if (
      ["PEMBELIAN", "TRANSFER_MASUK", "TRANSFER_REJECT", "REFUND"].includes(
        metode
      )
    ) {
      return qtyBase;
    }

    if (["PENJUALAN", "TRANSFER_KELUAR"].includes(metode)) {
      return -qtyBase;
    }

    return 0;
  };

  // ===============================
  // 🔥 UNIVERSAL STOCK ENGINE
  // ===============================
  const getStockEffect = (t) => {
    const metode = String(t.PAYMENT_METODE || "").toUpperCase();
    const qtyBase = t.IMEI ? 1 : Number(t.QTY || 0);

    if (["PEMBELIAN", "TRANSFER_MASUK", "REFUND"].includes(metode)) {
      return qtyBase;
    }

    if (["PENJUALAN", "TRANSFER_KELUAR"].includes(metode)) {
      return -qtyBase;
    }

    return 0;
  };

  const normalize = (v) =>
    String(v || "")
      .trim()
      .toUpperCase();

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

  const imeiFinalMap = useMemo(() => {
    const map = {};

    transaksi.forEach((t) => {
      if (!isApproved(t) || !t.IMEI) return;

      const imei = String(t.IMEI).trim();
      const toko = String(t.NAMA_TOKO || "").trim();
      const metode = String(t.PAYMENT_METODE || "").toUpperCase();

      if (!map[imei]) {
        map[imei] = {
          imei,
          toko: null,
          tanggal: t.TANGGAL_TRANSAKSI || "-",
          noDo: t.NO_INVOICE || "-",
          supplier: t.NAMA_SUPPLIER || "-",
          brand: t.NAMA_BRAND || "-",
          barang: t.NAMA_BARANG || "-",
          keterangan: "",
        };
      }

      if (metode === "PEMBELIAN") {
        map[imei].toko = toko;
      }

      // ======================================
      // 🔥 TRANSFER MASUK FINAL
      // ======================================
      if (metode === "TRANSFER_MASUK") {
        const finalOwner = String(t.ke || t.tokoTujuan || t.NAMA_TOKO || "-")
          .trim()
          .toUpperCase();

        // ======================================
        // 🔥 OWNER FINAL
        // ======================================
        map[imei].toko = finalOwner;

        // ======================================
        // 🔥 KETERANGAN FINAL
        // ======================================
        map[imei].keterangan = "TRANSFER BARANG";

        // ======================================
        // 🔥 RESET REFUND
        // ======================================
        map[imei].lastAction = "TRANSFER";

        map[imei].isRefundTransfer = false;
      }

      // ======================================
      // 🔥 PENJUALAN = KELUARKAN STOCK
      // ======================================
      if (metode === "PENJUALAN") {
        delete map[imei];
      }

      // ======================================
      // 🔥 REFUND = KEMBALIKAN KE TOKO TERAKHIR
      // ======================================
      if (metode === "REFUND") {
        map[imei] = {
          imei,
          toko,
          tanggal: t.TANGGAL_TRANSAKSI || "-",
          noDo: t.NO_INVOICE || "-",
          supplier: t.NAMA_SUPPLIER || "-",
          brand: t.NAMA_BRAND || "-",
          barang: t.NAMA_BARANG || "-",
          keterangan: "REFUND",
        };
      }
    });

    return map;
  }, [transaksi]);

  const imeiTerjual = useMemo(() => {
    const soldSet = new Set();

    transaksi.forEach((t) => {
      if (!t?.IMEI) return;

      const imei = normalizeImei(t.IMEI);

      const metode = String(t.PAYMENT_METODE || "").toUpperCase();

      const status = String(t.STATUS || t.status || "")
        .trim()
        .toUpperCase();

      if (!["APPROVED", "REFUND"].includes(status)) return;

      // =========================
      // PENJUALAN = HILANGKAN
      // =========================
      if (metode === "PENJUALAN") {
        soldSet.add(imei);
      }

      // =========================
      // REFUND = KEMBALIKAN
      // =========================
      if (metode === "REFUND") {
        soldSet.delete(imei);
      }
    });

    return soldSet;
  }, [transaksi]);

  // ======================================
  // 🔥 IMEI REFUND ACTIVE
  // ======================================
  // ======================================
  // 🔥 REFUND ACTIVE
  // ======================================
  const refundAvailableSet = useMemo(() => {
    const set = new Set();

    transaksi.forEach((t) => {
      const metode = String(t.PAYMENT_METODE || "").toUpperCase();

      const status = String(t.STATUS || t.status || "")
        .trim()
        .toUpperCase();

      if (
        metode === "REFUND" &&
        ["APPROVED", "REFUND"].includes(status) &&
        t.IMEI
      ) {
        set.add(normalizeImei(t.IMEI));
      }
    });

    // fallback detail_stock
    Object.values(detailStock || {}).forEach((s) => {
      if (String(s.LAST_ACTION || "").toUpperCase() === "REFUND" && s.imei) {
        set.add(normalizeImei(s.imei));
      }
    });

    return set;
  }, [transaksi, detailStock]);

  // ======================================
  // 🔥 FINAL REFUND ACTIVE TRACKER
  // ======================================
  const refundFinalTracker = useMemo(() => {
    const map = {};

    // ======================================
    // 🔥 SORT TERLAMA -> TERBARU
    // ======================================
    const sorted = [...transaksi].sort(
      (a, b) =>
        new Date(a.CREATED_AT || a.TANGGAL_TRANSAKSI || 0).getTime() -
        new Date(b.CREATED_AT || b.TANGGAL_TRANSAKSI || 0).getTime()
    );

    sorted.forEach((t) => {
      if (!t?.IMEI) return;

      const imei = normalizeImei(t.IMEI);

      const metode = String(t.PAYMENT_METODE || "").toUpperCase();

      const status = String(t.STATUS || t.status || "")
        .trim()
        .toUpperCase();

      if (!["APPROVED", "REFUND"].includes(status)) {
        return;
      }

      // ======================================
      // 🔥 REFUND MASUK STOCK
      // ======================================
      if (metode === "REFUND") {
        map[imei] = {
          active: true,
          metode: "REFUND",
        };
      }

      // ======================================
      // 🔥 SUDAH TERJUAL LAGI
      // ======================================
      if (metode === "PENJUALAN") {
        if (map[imei]?.active) {
          map[imei] = {
            active: false,
            metode: "PENJUALAN",
          };
        }
      }
    });

    return map;
  }, [transaksi]);

  // ======================================
  // 🔥 FINAL OWNER TRACKER
  // ======================================
  // ======================================
  // 🔥 FINAL OWNER TRACKER
  // ======================================
  const finalOwnerTracker = useMemo(() => {
    const map = {};

    // ======================================
    // 🔥 SORT HISTORI TRANSAKSI
    // ======================================
    const sorted = [...transaksi].sort(
      (a, b) =>
        new Date(a.CREATED_AT || 0).getTime() -
        new Date(b.CREATED_AT || 0).getTime()
    );

    sorted.forEach((t) => {
      if (!t?.IMEI) return;

      const imei = normalizeImei(t.IMEI);

      const metode = String(t.PAYMENT_METODE || "").toUpperCase();

      const status = String(t.STATUS || t.status || "")
        .trim()
        .toUpperCase();

      // ======================================
      // 🔥 FINAL STATUS FILTER
      // ======================================
      if (!["APPROVED", "APPROVE", "REFUND"].includes(status)) {
        return;
      }

      // ======================================
      // 🔥 STOCK MASUK / PINDAH OWNER
      // ======================================
      if (
        [
          "PEMBELIAN",
          "TRANSFER_MASUK",
          "REFUND",
          "TRANSFER_REJECT",
          "VOID OPNAME",
        ].includes(metode)
      ) {
        map[imei] = {
          toko: t.NAMA_TOKO || "-",
          active: true,
          metode,
        };

        return;
      }

      // ======================================
      // 🔥 TRANSFER KELUAR
      // ======================================
      // JANGAN MATIKAN STOCK
      // karena owner akan pindah
      // saat TRANSFER_MASUK berikutnya
      // ======================================
      if (metode === "TRANSFER_KELUAR") {
        map[imei] = {
          toko: t.TOKO_TUJUAN || t.ke || t.tokoTujuan || t.NAMA_TOKO || "-",

          active: true,

          metode,
        };

        return;
      }

      // ======================================
      // 🔥 STOCK BENAR-BENAR KELUAR
      // ======================================
      if (["PENJUALAN", "REJECT", "STOK OPNAME"].includes(metode)) {
        map[imei] = {
          toko: t.NAMA_TOKO || "-",
          active: false,
          metode,
        };
      }
    });

    return map;
  }, [transaksi]);

  // const imeiTransferKeluar = useMemo(() => {
  //   const set = new Set();

  //   transaksi.forEach((t) => {
  //     if (
  //       t.STATUS === "Approved" &&
  //       String(t.PAYMENT_METODE).toUpperCase() === "TRANSFER_KELUAR" &&
  //       t.IMEI
  //     ) {
  //       set.add(String(t.IMEI));
  //     }
  //   });

  //   return set;
  // }, [transaksi]);

  // ===============================
  // 🔥 SUPPLIER LOOKUP FROM PEMBELIAN
  // ===============================
  // ===============================
  // 🔥 SUPPLIER LOOKUP UNIVERSAL
  // ===============================
  const supplierLookup = useMemo(() => {
    const map = {};

    transaksi.forEach((t) => {
      if (!t) return;

      const supplier = t.NAMA_SUPPLIER || t.namaSupplier || t.SUPPLIER || "-";

      // =========================
      // 🔥 IMEI
      // =========================
      if (t.IMEI) {
        const imei = String(t.IMEI).trim();

        const clean = normalizeImei(imei);

        // ======================================
        // 🔥 HANYA AMBIL DARI PEMBELIAN / REFUND
        // ======================================
        const metode = String(t.PAYMENT_METODE || "").toUpperCase();

        const validSupplierMethod = [
          "PEMBELIAN",
          "REFUND",
          "TRANSFER_MASUK",
        ].includes(metode);

        // ======================================
        // 🔥 SIMPAN SUPPLIER PERTAMA
        // ======================================
        if (
          validSupplierMethod &&
          supplier &&
          supplier !== "-" &&
          supplier !== "undefined"
        ) {
          // IMEI ASLI
          if (!map[imei]) {
            map[imei] = supplier;
          }

          // IMEI CLEAN
          if (!map[clean]) {
            map[clean] = supplier;
          }
        }
      }

      // =========================
      // 🔥 NON IMEI
      // =========================
      const skuKey =
        `${normalize(t.NAMA_TOKO)}|` +
        `${normalizeText(t.NAMA_BRAND)}|` +
        `${normalizeText(t.NAMA_BARANG)}`;
      // ======================================
      // 🔥 ALWAYS UPDATE SUPPLIER
      // ======================================
      if (supplier && supplier !== "-" && supplier !== "undefined") {
        map[skuKey] = supplier;
      }
    });

    return map;
  }, [transaksi]);

  const handleDelete = async (row) => {
    try {
      if (!window.confirm(`Hapus TOTAL data ${row.barang}?`)) return;

      const snap = await get(ref(db, "toko"));
      const data = snap.val() || {};

      let totalDelete = 0;

      for (const tokoId in data) {
        const transaksi = data[tokoId]?.transaksi || {};

        for (const id in transaksi) {
          const t = transaksi[id];

          if (
            String(t.NAMA_BARANG || "")
              .toLowerCase()
              .trim() === String(row.barang).toLowerCase().trim() &&
            String(t.NAMA_BRAND || "")
              .toLowerCase()
              .trim() === String(row.brand).toLowerCase().trim()
          ) {
            const path = `toko/${tokoId}/transaksi/${id}`;
            console.log("🔥 FORCE DELETE:", path);

            await remove(ref(db, path));
            totalDelete++;
          }
        }
      }

      // 🔥 DELETE STOCK
      const cleanBarang = String(row.barang)
        .replace(new RegExp(`^${row.brand}\\s*`, "i"), "")
        .trim();

      const sku = `${row.brand}_${cleanBarang}`
        .toUpperCase()
        .replace(/\s+/g, "_");

      const stockPath = `stock/${namaToko}/${sku}`;
      console.log("🔥 DELETE STOCK:", stockPath);

      await remove(ref(db, stockPath));

      alert(`✅ ${totalDelete} DATA TERHAPUS TOTAL (FORCE MODE)`);
    } catch (err) {
      console.error(err);
      alert("❌ Gagal delete");
    }
  };

  const imeiMasterLookup = useMemo(() => {
    const map = {};

    transaksi.forEach((t) => {
      if (!isApproved(t)) return;
      if (t.PAYMENT_METODE !== "PEMBELIAN") return;
      if (!t.IMEI) return;

      const raw = String(t.IMEI).trim();
      const clean = normalizeImei(raw);

      map[clean] = raw; // simpan IMEI asli
    });

    return map;
  }, [transaksi]);

  // ======================================
  // 🔥 IMEI AKTIF FINAL
  // ======================================
  const activeImeiSet = useMemo(() => {
    const set = new Set();

    transaksi.forEach((t) => {
      if (!isApproved(t) || !t.IMEI) {
        return;
      }

      // ✅ HANYA PEMBELIAN TERBARU
      if (String(t.PAYMENT_METODE || "").toUpperCase() === "PEMBELIAN") {
        set.add(normalizeImei(t.IMEI));
      }
    });

    return set;
  }, [transaksi]);

  // ======================================
  // 🔥 MASTER PEMBELIAN ACTIVE
  // ======================================
  const masterPembelianActiveMap = useMemo(() => {
    const map = {};

    transaksi.forEach((t) => {
      const metode = String(t.PAYMENT_METODE || "").toUpperCase();

      // ======================================
      // 🔥 STOCK MASUK FINAL
      // ======================================
      if (
        ![
          "PEMBELIAN",
          "TRANSFER_MASUK",
          "REFUND",
          "TRANSFER_REJECT",
          "VOID OPNAME",
        ].includes(metode)
      ) {
        return;
      }

      if (String(t.STATUS || "").toUpperCase() !== "APPROVED") {
        return;
      }

      const imei = String(t.IMEI || "").trim();

      // ======================================
      // 🔥 IMEI
      // ======================================
      if (imei) {
        map[`IMEI_${normalizeImei(imei)}`] = {
          tanggal: t.TANGGAL_TRANSAKSI || "-",

          noDo: t.NO_INVOICE || "-",

          supplier: t.NAMA_SUPPLIER || "-",

          namaToko: t.NAMA_TOKO || "-",

          brand: t.NAMA_BRAND || "-",

          barang: t.NAMA_BARANG || "-",

          imei,

          qty: 1,

          statusBarang: "TERSEDIA",

          keterangan: "PEMBELIAN",
        };
      }

      // ======================================
      // 🔥 NON IMEI
      // ======================================
      if (!imei) {
        const skuKey = `SKU_${normalizeText(t.NAMA_BRAND)}|${normalizeText(
          t.NAMA_BARANG
        )}`;

        // ======================================
        // 🔥 SKIP JIKA STOCK SUDAH HABIS
        // ======================================
        const currentQty = Number(map?.[skuKey]?.qty || 0);

        if (
          ["PENJUALAN", "TRANSFER_KELUAR", "STOK OPNAME"].includes(metode) &&
          currentQty <= 0
        ) {
          return;
        }

        if (!map[skuKey]) {
          map[skuKey] = {
            tanggal: t.TANGGAL_TRANSAKSI || "-",

            noDo: t.NO_INVOICE || "-",

            supplier: supplierLookup?.[skuKey] || t.NAMA_SUPPLIER || "-",

            namaToko: t.NAMA_TOKO || "-",

            brand: t.NAMA_BRAND || "-",

            barang: t.NAMA_BARANG || "-",

            imei: "",

            // 🔥 FIX PEMBELIAN NON IMEI
            qty: metode === "PEMBELIAN" ? Math.abs(Number(t.QTY || 0)) : 0,

            hargaSRP: masterMap?.[skuKey]?.hargaSRP || 0,

            hargaGrosir: masterMap?.[skuKey]?.hargaGrosir || 0,

            hargaReseller: masterMap?.[skuKey]?.hargaReseller || 0,

            statusBarang: "TERSEDIA",

            // 🔥 KETERANGAN AWAL
            keterangan:
              metode === "TRANSFER_KELUAR" || metode === "TRANSFER_MASUK"
                ? "TRANSFER BARANG"
                : metode,
          };
        }
      }
    });

    return map;
  }, [transaksi]);

  /* ======================
   BUILD ROWS (FIX FINAL)
====================== */
  const rows = useMemo(() => {
    return buildFinalStockRows({
      transaksi,
      detailStock,
      namaToko,
      masterMap,
      supplierLookup,
      masterBarang,
      masterToko,
    });
  }, [transaksi, detailStock, namaToko, masterMap, supplierLookup]);

  // ======================================
  // 🔥 MERGED ROWS FINAL
  // ======================================
  const mergedRows = useMemo(() => {
    const finalMap = {};

    rows.forEach((r) => {
      // ======================================
      // 🔥 IMEI ASLI ONLY
      // ======================================
      if (
        r.imei &&
        !["NON IMEI", "NON-IMEI", "NONIMEI", "-"].includes(
          String(r.imei).trim().toUpperCase()
        )
      ) {
        const imeiKey = normalizeImei(r.imei);

        finalMap[`IMEI_${imeiKey}`] = {
          ...r,

          qty: 1,

          statusBarang: Number(r.qty || 0) > 0 ? "TERSEDIA" : "HABIS",
        };

        return;
      }

      // ======================================
      // 🔥 NON IMEI
      // ======================================
      const skuKey =
        `${normalize(r.namaToko)}|` +
        `${normalizeText(r.brand)}|` +
        `${normalizeText(r.barang)}`;

      // ======================================
      // 🔥 FINAL STOCK SUDAH DIBUAT ENGINE
      // ======================================
      // JANGAN HITUNG ULANG QTY DI UI
      // ======================================
      if (!finalMap[skuKey]) {
        finalMap[skuKey] = {
          ...r,

          tanggal: r.tanggal || "-",

          noDo: r.noDo || "-",

          supplier: r.supplier || supplierLookup?.[skuKey] || "-",

          namaToko: r.namaToko || namaToko,

          brand: r.brand || "-",

          barang: r.barang || "-",

          imei:
            !r.imei || ["-", "--"].includes(String(r.imei).trim())
              ? "NON IMEI"
              : r.imei,

          // ======================================
          // 🔥 QTY FINAL DARI ENGINE
          // ======================================
          qty: Number(r.qty || 0),

          hargaSRP:
            masterMap?.[`${r.brand}|${r.barang}`]?.hargaSRP || r.hargaSRP || 0,

          hargaGrosir:
            masterMap?.[`${r.brand}|${r.barang}`]?.hargaGrosir ||
            r.hargaGrosir ||
            0,

          hargaReseller:
            masterMap?.[`${r.brand}|${r.barang}`]?.hargaReseller ||
            r.hargaReseller ||
            0,

          statusBarang: Number(r.qty || 0) > 0 ? "TERSEDIA" : "HABIS",

          // ======================================
          // 🔥 REFUND PRIORITAS
          // ======================================
          keterangan: String(r.keterangan || "")
            .toUpperCase()
            .includes("REFUND")
            ? "REFUND"
            : r.keterangan || "PEMBELIAN",
        };
      } else {
        // ======================================
        // 🔥 SKIP DUPLICATE NON IMEI
        // ======================================
        // buildFinalStockRows()
        // SUDAH menghasilkan FINAL STOCK
        // jadi UI tidak boleh merge qty lagi
        // ======================================

        return;
      }
    });

    return Object.values(finalMap).filter((r) => {
      // ======================================
      // 🔥 HAPUS BARANG LIAR
      // ======================================
      if (
        String(r.keterangan || "")
          .toUpperCase()
          .includes("SYNC STOCK OPNAME")
      ) {
        return false;
      }
      // ======================================
      // 🔥 QTY HABIS
      // ======================================
      if (Number(r.qty || 0) <= 0) {
        return false;
      }

      // ======================================
      // 🔥 FILTER TOKO
      // ======================================
      if (normalize(r.namaToko || r.toko) !== normalize(namaToko)) {
        return false;
      }

      // ======================================
      // 🔥 IMEI TERJUAL
      // ======================================
      if (r.imei) {
        const cleanImei = normalizeImei(r.imei);

        const ket = String(r.keterangan || "").toUpperCase();

        // ======================================
        // 🔥 TRANSFER BARANG SELALU AKTIF
        // ======================================
        if (ket.includes("TRANSFER BARANG")) {
          return true;
        }

        // ======================================
        // 🔥 REFUND SUDAH TERJUAL LAGI
        // ======================================
        if (ket.includes("REFUND")) {
          const refundState = refundFinalTracker?.[cleanImei];

          // ======================================
          // 🔥 REFUND SUDAH TERJUAL LAGI
          // ======================================
          if (refundState && refundState.active === false) {
            return false;
          }

          return true;
        }

        // ======================================
        // 🔥 STOCK TERJUAL NORMAL
        // ======================================
        if (imeiTerjual.has(cleanImei) && !refundAvailableSet.has(cleanImei)) {
          return false;
        }
      }

      return true;
    });
  }, [
    rows,
    namaToko,
    transaksi,
    imeiTerjual,
    refundAvailableSet,
    refundFinalTracker,
  ]);

  /* ======================
   SEARCH FILTER UNIVERSAL
====================== */
  const filtered = useMemo(() => {
    const keyword = String(search || "")
      .trim()
      .toLowerCase();

    if (!keyword) return mergedRows;

    return mergedRows.filter((r) => {
      const imei = String(r.imei || "").toLowerCase();

      const barang = String(r.barang || "").toLowerCase();

      const toko = String(r.namaToko || r.toko || "").toLowerCase();

      const brand = String(r.brand || "").toLowerCase();

      const noDo = String(r.noDo || "").toLowerCase();

      const tanggal = String(r.tanggal || "")
        .replace("T", " ")
        .toLowerCase();

      const supplier = String(r.supplier || "").toLowerCase();

      const status = String(r.statusBarang || "").toLowerCase();

      const keterangan = String(r.keterangan || "").toLowerCase();

      return (
        imei.includes(keyword) ||
        barang.includes(keyword) ||
        toko.includes(keyword) ||
        brand.includes(keyword) ||
        noDo.includes(keyword) ||
        tanggal.includes(keyword) ||
        supplier.includes(keyword) ||
        status.includes(keyword) ||
        keterangan.includes(keyword)
      );
    });
  }, [mergedRows, search]);

  // ======================================
  // 🔥 TOTAL STOK FINAL
  // ======================================
  const totalStokFinal = useMemo(() => {
    return mergedRows.reduce((sum, item) => {
      return sum + Number(item.qty || 0);
    }, 0);
  }, [rows]);

  /* ======================
     PAGINATION
  ====================== */
  const pageCount = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  /* ======================
     EXPORT EXCEL
  ====================== */
  const exportExcel = () => {
    // ===============================
    // 🔥 DATA EXPORT SESUAI TABLE
    // ===============================
    const exportRows = filtered.map((r, i) => ({
      NO: i + 1,

      TANGGAL: r.tanggal || "-",

      "NO DO": r.noDo || "-",

      SUPPLIER: r.supplier || "-",

      TOKO: r.namaToko || "-",

      BRAND: r.brand || "-",

      BARANG: r.barang || "-",

      IMEI: r.imei || "NON IMEI",

      QTY: Number(r.qty || 0),

      "HARGA SRP": Number(r.hargaSRP || 0),

      "HARGA GROSIR": Number(r.hargaGrosir || 0),

      "HARGA RESELLER": Number(r.hargaReseller || 0),

      STATUS: r.statusBarang || "-",

      KETERANGAN: r.keterangan || "-",
    }));

    // ===============================
    // 🔥 GENERATE SHEET
    // ===============================
    const ws = XLSX.utils.json_to_sheet(exportRows);

    // 🔥 AUTO WIDTH
    ws["!cols"] = [
      { wch: 8 }, // NO
      { wch: 18 }, // TANGGAL
      { wch: 25 }, // NO DO
      { wch: 35 }, // SUPPLIER
      { wch: 25 }, // TOKO
      { wch: 20 }, // BRAND
      { wch: 40 }, // BARANG
      { wch: 28 }, // IMEI
      { wch: 10 }, // QTY
      { wch: 18 }, // SRP
      { wch: 18 }, // GROSIR
      { wch: 18 }, // RESELLER
      { wch: 15 }, // STATUS
      { wch: 30 }, // KETERANGAN
    ];

    // ===============================
    // 🔥 WORKBOOK
    // ===============================
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "DETAIL_STOCK_TOKO");

    // ===============================
    // 🔥 EXPORT FILE
    // ===============================
    XLSX.writeFile(
      wb,
      `DETAIL_STOCK_${namaToko}_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  /* ======================
     RENDER
  ====================== */
  return (
    <div className="p-4 min-h-screen bg-slate-900 text-white">
      {!namaToko ? (
        <div className="text-red-400 font-semibold">
          ❌ Nama toko tidak ditemukan
        </div>
      ) : (
        <>
          {props?.mode !== "dashboard" && (
            <h2 className="text-xl font-bold mb-4">
              Detail Stok Toko : {namaToko}
            </h2>
          )}

          {props?.mode !== "dashboard" && (
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
                onClick={() =>
                  navigate("/toko/:tokoId/penjualan", {
                    state: {
                      namaToko: namaToko,
                      source: "DETAIL_STOCK_TOKO",
                    },
                  })
                }
                className="
    flex items-center gap-2
    px-5 py-2 rounded-xl
    bg-gradient-to-r from-red-500 to-emerald-600
    hover:from-emerald-600 hover:to-blue-500
    text-white font-semibold
    shadow-lg hover:shadow-green-400/50
    transition-all duration-200
  "
              >
                🛒 PENJUALAN
              </button>
              <button
                onClick={exportExcel}
                className="ml-4 bg-green-600 px-4 py-2 rounded   bg-gradient-to-r from-green-500 to-emerald-600
    hover:from-emerald-600 hover:to-blue-500
    text-white font-semibold
    shadow-lg hover:shadow-blue-400/50
    transition-all duration-200"
              >
                Export
              </button>
            </div>
          )}

          <div className="bg-white text-slate-800 rounded-2xl shadow-xl overflow-x-auto scrollbar-dark">
            <table className="w-full min-w-[2200px] text-sm">
              <thead className="bg-blue-100 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left whitespace-nowrap">No</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">
                    Tanggal
                  </th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">
                    NO DO
                  </th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">
                    Supplier
                  </th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">
                    Toko
                  </th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">
                    Brand
                  </th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">
                    Barang
                  </th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">
                    IMEI
                  </th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Qty</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">
                    Harga SRP
                  </th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">
                    Harga Grosir
                  </th>

                  <th className="px-3 py-2 text-left whitespace-nowrap">
                    Harga Reseller
                  </th>
                  <th className="px-3 py-2">STATUS</th>

                  <th className="px-3 py-2 text-left whitespace-nowrap">
                    Keterangan
                  </th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody>
                {paginated.map((r, i) => (
                  <tr key={i} className="border-b border-blue-700">
                    <td className="px-3 py-2 text-center font-mono">
                      {(page - 1) * pageSize + i + 1}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {r.tanggal}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{r.noDo}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {r.supplier}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {r.namaToko}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {r.brand}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {r.barang}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{r.imei}</td>
                    <td className="px-3 py-2 text-right font-mono">{r.qty}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {rupiah(r.hargaSRP)}
                    </td>

                    <td className="px-3 py-2 text-right font-mono">
                      {rupiah(r.hargaGrosir)}
                    </td>

                    <td className="px-3 py-2 text-right font-mono">
                      {rupiah(r.hargaReseller)}
                    </td>
                    <td className="px-3 py-2 text-center font-semibold">
                      {r.statusBarang}
                    </td>

                    <td className="px-3 py-2 text-right font-mono text-xs text-gray-600">
                      {r.keterangan || "-"}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex gap-2 justify-center">
                        {/* ✅ DELETE */}
                        {/* <button
                          onClick={() => handleDelete(r)}
                          title="Hapus Permanen"
                          className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                        >
                          🗑️
                        </button> */}

                        {/* ✅ TRANSFER */}
                        <button
                          onClick={() =>
                            navigate("/transfer-barang", {
                              state: {
                                tokoPengirim: namaToko,
                              },
                            })
                          }
                          title="Transfer Barang"
                          className="
        flex items-center gap-1
        px-2 py-1 rounded
        bg-yellow-500 hover:bg-yellow-600
        text-white text-xs
      "
                        >
                          <FaExchangeAlt />
                          Transfer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="flex justify-between p-4 text-sm">
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
        </>
      )}
    </div>
  );
}
