import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  listenAllTransaksi,
  listenMasterBarang,
  deleteTransaksi,
} from "../../services/FirebaseService";
import { ref, remove, get, onValue } from "firebase/database";
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

// ======================================
// 🔥 NORMALIZE TEXT
// ======================================
const normalizeText = (v) =>
  String(v || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");

const isApproved = (t) => String(t.STATUS || "").toUpperCase() === "APPROVED";

export default function DetailStockToko() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const tableRef = useRef(null);

  const namaToko = state?.namaToko || "";

  /* ======================
     STATE
  ====================== */
  const [transaksi, setTransaksi] = useState([]);
  const [masterBarang, setMasterBarang] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deletedIds, setDeletedIds] = useState(new Set());
  const [detailStock, setDetailStock] = useState({});

  const pageSize = 25;

  /* ======================
     REALTIME LISTENER
  ====================== */
  // useEffect(() => {
  //   const unsub1 = listenAllTransaksi((rows) => {
  //     const filtered = (rows || []).filter(
  //       (r) => !deletedIds.has(r.id)
  //     );
  //     setTransaksi(filtered);
  //   });
  //   const unsub2 = listenMasterBarang((rows) => setMasterBarang(rows || []));

  //   return () => {
  //     unsub1 && unsub1();
  //     unsub2 && unsub2();
  //   };
  // }, []);

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

    return () => {
      unsub1 && unsub1();
      unsub2 && unsub2();
    };
  }, [deletedIds]); // 🔥 WAJIB

  // ===============================
  // 🔥 STOCK ENGINE UNIVERSAL
  // ===============================
  const getStockEffectUniversal = (t) => {
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

      if (metode === "TRANSFER_MASUK") {
        map[imei].toko = toko;
        map[imei].keterangan = `Transfer masuk ke Toko ${toko}`;
      }

      if (metode === "PENJUALAN") {
        delete map[imei];
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
  
      const status = String(t.STATUS || "").toUpperCase();
  
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

        if (supplier && supplier !== "-" && supplier !== "undefined") {
          map[imei] = supplier;
        }

        const clean = normalizeImei(imei);

        if (supplier && supplier !== "-" && supplier !== "undefined") {
          map[clean] = supplier;
        }
      }

      // =========================
      // 🔥 NON IMEI
      // =========================
      const skuKey = `${normalizeText(t.NAMA_BRAND)}|${normalizeText(
        t.NAMA_BARANG
      )}`;

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
  /* ======================
   BUILD ROWS (FIX FINAL)
====================== */
  const rows = useMemo(() => {
    if (!namaToko) return [];

    const map = {};

    // ===============================
    // 🔥 STEP 1 — CLONE TRANSAKSI
    // ===============================
    const allEvents = transaksi.filter(
      (t) =>
        !deletedIds.has(t.id) &&
        ["APPROVED", "REFUND"].includes(String(t.STATUS || "").toUpperCase())
    );

    // ===============================
    // 🔥 REFUND DARI PENJUALAN
    // ===============================
    transaksi.forEach((t) => {
      if (
        t.statusPembayaran === "REFUND" &&
        Array.isArray(t.items) &&
        normalize(t.toko) === normalize(namaToko)
      ) {
        t.items.forEach((it) => {
          // skip IMEI
          if (it.imeiList?.length) return;

          allEvents.push({
            STATUS: "Approved",
            PAYMENT_METODE: "REFUND",
            NAMA_TOKO: t.toko,
            NAMA_BRAND: it.namaBrand,
            NAMA_BARANG: it.namaBarang,
            QTY: it.qty,
            IMEI: "",
            NO_INVOICE: t.invoice,
            TANGGAL_TRANSAKSI: t.tanggal,
            NAMA_SUPPLIER:
              supplierLookup?.[`${it.namaBrand}|${it.namaBarang}`] || "-",
          });
        });
      }
    });

    // =====================================
    // 🔥 TRACK REFUND IMEI TERBARU
    // =====================================
    const refundImeiSet = new Set();

    allEvents.forEach((t) => {
      if (String(t.PAYMENT_METODE || "").toUpperCase() === "REFUND" && t.IMEI) {
        refundImeiSet.add(String(t.IMEI).trim());
      }
    });

    // ===============================
    // 🔥 FALLBACK detail_stock
    // ===============================
    Object.values(detailStock).forEach((s) => {
      if (!s?.imei) return;
      // 🔥 JANGAN DUPLIKAT REFUND
      if (refundImeiSet.has(String(s.imei).trim())) {
        return;
      }
      if (normalize(s.toko) !== normalize(namaToko)) return;

      const status = String(s.STATUS || s.status || "").toUpperCase();

      if (!["AVAILABLE", "REFUND"].includes(status)) return;

      // ======================================
// 🔥 JANGAN TAMPILKAN YANG SUDAH TERJUAL
// ======================================
const soldImei = normalizeImei(s.imei);

if (imeiTerjual.has(soldImei)) {
  return;
}

      if (!map[s.imei]) {
        map[s.imei] = {
          tanggal: "-",
          noDo: "-",
          supplier:
            supplierLookup?.[s.imei] ||
            supplierLookup?.[normalizeImei(s.imei)] ||
            "-",
          namaToko: s.toko,
          brand: "-",
          barang: "-",
          imei: s.imei,
          qty: 1,
          hargaSRP: 0,
          hargaGrosir: 0,
          hargaReseller: 0,
          statusBarang: "TERSEDIA",
          keterangan: "DARI DETAIL STOCK",
        };
      }
    });

    // ===============================
    // 🔥 PROCESS ALL EVENTS
    // ===============================
    allEvents.forEach((t) => {
      if (
        !["APPROVED", "REFUND"].includes(String(t.STATUS || "").toUpperCase())
      ) {
        return;
      }

      if (normalize(t.NAMA_TOKO) !== normalize(namaToko)) {
        return;
      }

      const metode = String(t.PAYMENT_METODE || "").toUpperCase();

      const qtyBase = t.IMEI ? 1 : Number(t.QTY || 0);

      let effect = 0;

      // ===============================
      // 🔥 STOCK ENGINE FINAL
      // ===============================
      if (
        [
          "PEMBELIAN",
          "TRANSFER_MASUK",
          "REFUND",
          "RETUR",
          "VOID OPNAME",
        ].includes(metode)
      ) {
        effect = Math.abs(qtyBase);
      }

      if (
        ["PENJUALAN", "TRANSFER_KELUAR", "REJECT", "STOK OPNAME"].includes(
          metode
        )
      ) {
        effect = -Math.abs(qtyBase);
      }

      // ==================================================
      // 🔥 IMEI
      // ==================================================
      if (t.IMEI) {
        const key = String(t.IMEI).trim();

        const clean = normalizeImei(key);

        const displayImei = imeiMasterLookup?.[clean] || key;

        const supplierFix =
          supplierLookup?.[key] ||
          supplierLookup?.[clean] ||
          t.NAMA_SUPPLIER ||
          "-";

        if (!map[key]) {
          map[key] = {
            tanggal: t.TANGGAL_TRANSAKSI || "-",
            noDo: t.NO_INVOICE || "-",
            supplier:
              supplierFix ||
              supplierLookup?.[key] ||
              supplierLookup?.[clean] ||
              "-",
            namaToko: t.NAMA_TOKO || "-",
            brand: t.NAMA_BRAND || "-",
            barang: t.NAMA_BARANG || "-",
            imei: displayImei,
            qty: 0,

            hargaSRP:
              masterMap?.[`${t.NAMA_BRAND}|${t.NAMA_BARANG}`]?.hargaSRP || 0,

            hargaGrosir:
              masterMap?.[`${t.NAMA_BRAND}|${t.NAMA_BARANG}`]?.hargaGrosir || 0,

            hargaReseller:
              masterMap?.[`${t.NAMA_BRAND}|${t.NAMA_BARANG}`]?.hargaReseller ||
              0,

            statusBarang: "TERSEDIA",
          };
        }

        // ============================================
        // 🔥 FINAL IMEI STOCK ENGINE
        // ============================================

        // ✅ STOCK MASUK
        if (
          [
            "PEMBELIAN",
            "TRANSFER_MASUK",
            "REFUND",
            "RETUR",
            "VOID OPNAME",
          ].includes(metode)
        ) {
          map[key].qty = 1;

          // 🔥 FIX SUPPLIER
          map[key].supplier =
            supplierLookup?.[key] ||
            supplierLookup?.[clean] ||
            map[key].supplier ||
            t.NAMA_SUPPLIER ||
            "-";

          map[key].keterangan =
            metode === "TRANSFER_MASUK"
              ? "TRANSFER BARANG"
              : metode === "REFUND"
              ? "REFUND"
              : metode === "RETUR"
              ? "RETUR"
              : metode;

          return;
        }

        // ❌ STOCK KELUAR
        if (
          ["PENJUALAN", "TRANSFER_KELUAR", "REJECT", "STOK OPNAME"].includes(
            metode
          )
        ) {
          map[key].qty = 0;
        
          map[key].statusBarang = "TERJUAL";
        
          map[key].keterangan =
            metode === "TRANSFER_KELUAR"
              ? "TRANSFER BARANG"
              : metode;
        
          return;
        }
      }

      // ==================================================
      // 🔥 NON IMEI
      // ==================================================
      const skuKey = `${normalizeText(t.NAMA_BRAND)}|${normalizeText(
        t.NAMA_BARANG
      )}`;

      if (!map[skuKey]) {
        map[skuKey] = {
          tanggal: t.TANGGAL_TRANSAKSI || "-",
          noDo: t.NO_INVOICE || "-",
          supplier:
            supplierLookup?.[skuKey] ||
            t.NAMA_SUPPLIER ||
            t.namaSupplier ||
            t.SUPPLIER ||
            "-",

          namaToko: t.NAMA_TOKO || "-",
          brand: t.NAMA_BRAND || "-",
          barang: t.NAMA_BARANG || "-",
          imei: "",
          qty: 0,

          hargaSRP: masterMap?.[skuKey]?.hargaSRP || 0,

          hargaGrosir: masterMap?.[skuKey]?.hargaGrosir || 0,

          hargaReseller: masterMap?.[skuKey]?.hargaReseller || 0,

          statusBarang: "TERSEDIA",
        };
      }

      map[skuKey].qty += effect;

      // 🔥 FIX SUPPLIER NON IMEI
      map[skuKey].supplier =
        supplierLookup?.[skuKey] ||
        map[skuKey].supplier ||
        t.NAMA_SUPPLIER ||
        t.namaSupplier ||
        t.SUPPLIER ||
        "-";

      map[skuKey].lastTransaksi = metode;

      // 🔥 KETERANGAN
      if (metode === "TRANSFER_MASUK") {
        map[skuKey].keterangan = "TRANSFER BARANG";
      }

      if (metode === "TRANSFER_KELUAR") {
        map[skuKey].keterangan = "TRANSFER BARANG";
      }

      if (metode === "REFUND") {
        map[skuKey].keterangan = "REFUND";
      }

      if (metode === "RETUR") {
        map[skuKey].keterangan = "RETUR";
      }

      if (metode === "REJECT") {
        map[skuKey].keterangan = "REJECT";
      }
    });

    // ==================================================
    // 🔥 FINAL FILTER
    // ==================================================
    // ==================================================
    // 🔥 FINAL FILTER
    // ==================================================

    // =======================================
    // 🔥 PRIORITAS DATA TERBARU
    // =======================================
    const finalMap = {};

    Object.values(map).forEach((r) => {
      if (!r) return;

      // =========================================
      // 🔥 NORMALIZE IMEI
      // =========================================
      const cleanImei = normalizeImei(r.imei);

      // =========================================
      // 🔥 KEY FINAL
      // =========================================
      const key = cleanImei
        ? `IMEI_${cleanImei}`
        : `SKU_${normalizeText(r.brand)}|${normalizeText(r.barang)}`;

      // =========================================
      // 🔥 BELUM ADA
      // =========================================
      if (!finalMap[key]) {
        finalMap[key] = {
          ...r,
          _timestamp: new Date(r.tanggal || 0).getTime(),
        };

        return;
      }

      // =========================================
      // 🔥 DATA LAMA
      // =========================================
      const oldData = finalMap[key];

      const oldDate = Number(oldData._timestamp || 0);

      const newDate = new Date(r.tanggal || 0).getTime();

      // =========================================
      // 🔥 REFUND PRIORITAS TERTINGGI
      // =========================================
      const oldRefund = String(oldData.keterangan || "")
        .toUpperCase()
        .includes("REFUND");

      const newRefund = String(r.keterangan || "")
        .toUpperCase()
        .includes("REFUND");

      // =========================================
      // ✅ REFUND MENANG
      // =========================================
      if (!oldRefund && newRefund) {
        finalMap[key] = {
          ...r,
          _timestamp: newDate,
        };

        return;
      }

      // =========================================
      // ✅ DATA TERBARU MENANG
      // =========================================
      if (newDate >= oldDate) {
        finalMap[key] = {
          ...r,
          _timestamp: newDate,
        };
      }
    });

    // ======================================
    // 🔥 HAPUS DATA LIAR IMEI LAMA
    // ======================================
    Object.keys(finalMap).forEach((k) => {
      const row = finalMap[k];

      if (!row?.imei) return;

      const cleanImei = normalizeImei(row.imei);

      // ===================================
      // ❌ IMEI SUDAH TIDAK ADA
      // ===================================
      if (
        !activeImeiSet.has(cleanImei) &&
        String(row.keterangan || "").toUpperCase() === "REFUND"
      ) {
        delete finalMap[k];
      }
    });

    // =========================================
    // 🔥 CLEAN RESULT
    // =========================================
    return Object.values(finalMap)
      .map((r) => {
        if (!r || Number(r.qty || 0) <= 0) {
          return null;
        }

        return {
          ...r,

          statusBarang: Number(r.qty || 0) > 0 ? "TERSEDIA" : "TERJUAL",

          keterangan:
            r.keterangan ||
            (r.lastTransaksi === "TRANSFER_MASUK"
              ? "TRANSFER BARANG"
              : r.lastTransaksi === "REFUND"
              ? "REFUND"
              : r.lastTransaksi === "REJECT"
              ? "REJECT"
              : "-"),
        };
      })
      .filter(Boolean)
      .filter((r) => {

        // =====================================
        // 🔥 FILTER IMEI TERJUAL
        // =====================================
        if (r.imei) {
      
          const cleanImei =
            normalizeImei(r.imei);
      
          // =====================================
          // 🔥 HARD REMOVE BARANG TERJUAL
          // =====================================
          if (imeiTerjual.has(cleanImei)) {
      
            // cek apakah sudah refund
            const hasRefund = transaksi.some(
              (t) =>
                normalizeImei(t.IMEI) === cleanImei &&
                String(
                  t.PAYMENT_METODE || ""
                ).toUpperCase() === "REFUND" &&
                String(t.STATUS || "")
                  .toUpperCase() === "APPROVED"
            );
      
            // belum refund = hilangkan
            if (!hasRefund) {
              return false;
            }
          }
      
          // =====================================
          // 🔥 HANYA TAMPIL TOKO TRANSFER TERAKHIR
          // =====================================
          const latestTransfer = transaksi
            .filter((t) => {
      
              return (
                normalizeImei(t.IMEI) === cleanImei &&
                String(
                  t.PAYMENT_METODE || ""
                ).toUpperCase() ===
                  "TRANSFER_MASUK" &&
                String(t.STATUS || "")
                  .toUpperCase() === "APPROVED"
              );
            })
      
            // =====================================
            // 🔥 SORT TRANSFER TERBARU
            // =====================================
            .sort(
              (a, b) =>
                new Date(
                  b.TANGGAL_TRANSAKSI || 0
                ).getTime() -
                new Date(
                  a.TANGGAL_TRANSAKSI || 0
                ).getTime()
            )[0];
      
          // =====================================
          // 🔥 ADA TRANSFER TERBARU
          // =====================================
          if (latestTransfer) {
      
            // ❌ TOKO LAMA HILANG
            if (
              normalize(r.namaToko) !==
              normalize(
                latestTransfer.NAMA_TOKO
              )
            ) {
              return false;
            }
          }
      
          // =====================================
          // 🔥 QTY HARUS ADA
          // =====================================
          if (Number(r.qty || 0) <= 0) {
            return false;
          }
      
          return true;
        }
      
        // =====================================
        // 🔥 NON IMEI
        // =====================================
        return !transaksi.some(
          (t) =>
            deletedIds.has(t.id) &&
            t.NAMA_BARANG === r.barang &&
            t.NAMA_BRAND === r.brand
        );
      })
  }, [
    transaksi,
    masterMap,
    namaToko,
    supplierLookup,
    detailStock,
    deletedIds,
    imeiMasterLookup,
    imeiTerjual,
  ]);

  /* ======================
     SEARCH FILTER
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
          <h2 className="text-xl font-bold mb-4">
            Detail Stok Toko : {namaToko}
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
