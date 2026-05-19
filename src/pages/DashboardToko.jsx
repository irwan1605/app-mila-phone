// src/pages/DashboardToko.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  FaStore,
  FaShoppingCart,
  FaBoxes,
  FaExchangeAlt,
  FaSun,
  FaMoon,
  FaSearch,
  FaFileExcel,
  FaCashRegister,
} from "react-icons/fa";

import { ref, onValue, get } from "firebase/database";
import { db } from "../firebase";
import DetailStockToko from "./table/DetailStockToko";

import {
  listenPenjualanHemat,
  listenTransaksiByTokoHemat,
  listenAllTransaksi,
  listenMasterBarang,
} from "../services/FirebaseService";

import * as XLSX from "xlsx";

const userLogin = JSON.parse(localStorage.getItem("userLogin") || "{}");

// ======================= KONSTAN =======================
const TOKO_LIST = [
  { id: "1", tokoName: "CILANGKAP PUSAT", code: "cilangkap-pusat" },
  { id: "2", tokoName: "CIBINONG", code: "cibinong" },
  { id: "3", tokoName: "GAS ALAM", code: "gas-alam" },
  { id: "4", tokoName: "CITEUREUP", code: "citeureup" },
  { id: "5", tokoName: "MARKETPLACE", code: "marketplace" },
  { id: "6", tokoName: "METLAND 1", code: "metland-1" },
  { id: "7", tokoName: "METLAND 2", code: "metland-2" },
  { id: "8", tokoName: "PITARA", code: "pitara" },
  { id: "9", tokoName: "KOTA WISATA", code: "kota-wisata" },
  { id: "10", tokoName: "SAWANGAN", code: "sawangan" },
];

const fmt = (n) => {
  try {
    return Number(n || 0).toLocaleString("id-ID");
  } catch {
    return String(n || "");
  }
};

// ✅ KEY UNTUK SIMPAN TEMA
const THEME_KEY = "DASHBOARD_TOKO_THEME";

/* ======================
   HELPER RUPIAH
====================== */
const rupiah = (n) =>
  Number(n || 0).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  });

export default function DashboardToko(props) {
  const params = useParams();
  const tokoId = props.tokoId || params.tokoId || params.id;
  const navigate = useNavigate();
  // ======================= ROLE USER =======================
  const roleUser = localStorage.getItem("ROLE_USER");
  const isPicToko = roleUser === "PIC_TOKO";

  const toko = TOKO_LIST.find((t) => t.id === String(tokoId));
  const TOKO_AKTIF = toko?.tokoName || "";

  const MAP_TOKO = {
    1: "-OhxxxxCILANGKAP",
    2: "-OhxxxxCIBINONG",
    3: "-OhxxxxGASALAM",
    4: "-OhxxxxCITEUREUP",
    5: "-OhxxxxMARKETPLACE",
    6: "-OhxxxxMETLAND1",
    7: "-OhWcqjXukQ2kZ8SGwUV", // METLAND 2
    8: "-OhxxxxPITARA",
    9: "-OhxxxxKOTAWISATA",
    10: "-OhxxxxSAWANGAN",
  };

  const firebaseTokoId = MAP_TOKO[userLogin.toko] || MAP_TOKO[tokoId];

  // ✅ SIMPAN TOKO LOGIN & ROLE (UNTUK TRANSFER BARANG)
  useEffect(() => {
    if (toko?.tokoName) {
      localStorage.setItem("TOKO_LOGIN", toko.tokoName);
      localStorage.setItem(
        "ROLE_USER",
        localStorage.getItem("ROLE_USER") || "USER"
      );
    }
  }, [toko]);

  // ======================= STATE GLOBAL =======================
  // ✅ DEFAULT LIGHT MODE (false) + akan dioverride oleh localStorage
  const [isDark, setIsDark] = useState(false);

  // ✅ LIST GLOBAL (HEMAT) UNTUK CHART PENJUALAN & STOK PER TOKO
  const [allTransaksi, setAllTransaksi] = useState([]);

  // ✅ LIST KHUSUS TOKO INI (HEMAT) UNTUK IMEI, VOID, RETURN
  const [transaksiToko, setTransaksiToko] = useState([]);
  const [stockToko, setStockToko] = useState([]);
  const [detailStock, setDetailStock] = useState({});
  const [loadingStock, setLoadingStock] = useState(true);
  const [searchStock, setSearchStock] = useState("");
  const [dashboardSearch, setDashboardSearch] = useState("");
  const { state } = useLocation();
  const tableRef = useRef(null);
  const namaToko = TOKO_AKTIF;

  /* ======================
     STATE
  ====================== */
  const [transaksi, setTransaksi] = useState([]);
  const [masterBarang, setMasterBarang] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  /* ======================
     REALTIME LISTENER
  ====================== */
  useEffect(() => {
    const unsub1 = listenAllTransaksi((rows) => setTransaksi(rows || []));
    const unsub2 = listenMasterBarang((rows) => setMasterBarang(rows || []));

    return () => {
      unsub1 && unsub1();
      unsub2 && unsub2();
    };
  }, []);

  // ===============================
  // 🔥 DETAIL STOCK REALTIME
  // ===============================
  useEffect(() => {
    const refStock = ref(db, "detail_stock");

    const unsub = onValue(refStock, (snap) => {
      setDetailStock(snap.val() || {});
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!firebaseTokoId) return;

    const dbRef = ref(db, `toko/${firebaseTokoId}/transaksi`);

    const unsub = onValue(dbRef, (snap) => {
      if (!snap.exists()) {
        setStockToko([]);
        setLoadingStock(false);
        return;
      }

      const raw = snap.val();
      const rows = Object.values(raw);

      // 🔥 FILTER STOK REAL
      const stokAktif = rows.filter((x) => {
        const status = String(x.STATUS || "").toUpperCase();

        const metode = String(x.PAYMENT_METODE || "").toUpperCase();

        return (
          ["PEMBELIAN", "TRANSFER_MASUK", "REFUND"].includes(metode) &&
          status === "APPROVED"
        );
      });

      setStockToko(stokAktif);
      setLoadingStock(false);
    });

    return () => unsub();
  }, [firebaseTokoId]);

  // ======================= LAPORAN VOID & RETURN =======================
  const [laporanVoid, setLaporanVoid] = useState([]);
  const [laporanReturn, setLaporanReturn] = useState([]);

  // Penjualan cepat via IMEI
  const [searchImei, setSearchImei] = useState("");
  const [quickItems, setQuickItems] = useState([]);

  // ======================= CHART VOID & RETURN PER TOKO =======================
  // eslint-disable-next-line no-unused-vars
  const dataChartVoidReturn = useMemo(() => {
    const map = {};
    TOKO_LIST.forEach((t) => {
      map[t.tokoName] = { VOID: 0, RETURN: 0 };
    });

    (allTransaksi || []).forEach((x) => {
      const tokoName = x.NAMA_TOKO;
      const total = Number(x.TOTAL || x.HARGA_UNIT || 0);

      if (!map[tokoName]) return;

      if ((x.STATUS || "").toUpperCase() === "VOID") {
        map[tokoName].VOID += total;
      }

      if ((x.STATUS || "").toUpperCase() === "RETURN") {
        map[tokoName].RETURN += total;
      }
    });

    return Object.entries(map).map(([tokoName, val]) => ({
      tokoName,
      VOID: val.VOID,
      RETURN: val.RETURN,
    }));
  }, [allTransaksi]);

  // ======================= DRAFT STORAGE (ANTI HILANG SAAT REFRESH) =======================
  const DRAFT_KEY = `DASHBOARD_DRAFT_TOKO_${tokoId}`;

  // Load draft saat pertama render

  // ======================= THEME PERSIST (TIDAK BERUBAH SAAT REFRESH) =======================
  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === "dark") setIsDark(true);
    if (savedTheme === "light") setIsDark(false);
  }, []);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  }, [isDark]);

  // ======================= LISTENER FIREBASE (HEMAT KUOTA) =======================
  useEffect(() => {
    // ✅ Listener GLOBAL hemat: untuk chart & laporan antar toko
    const unsubGlobal =
      typeof listenPenjualanHemat === "function"
        ? listenPenjualanHemat(
            (list) => {
              setAllTransaksi(Array.isArray(list) ? list : []);
            },
            {
              // bisa kamu sesuaikan:
              limit: 500, // ambil 500 transaksi terakhir secara global
            }
          )
        : null;

    // ✅ Listener KHUSUS TOKO: untuk VOID, RETURN & IMEI stok toko ini
    const unsubToko =
      typeof listenTransaksiByTokoHemat === "function" && tokoId
        ? listenTransaksiByTokoHemat(
            tokoId,
            {
              limit: 500, // ambil 500 transaksi terakhir toko ini
            },
            (list) => {
              setTransaksiToko(Array.isArray(list) ? list : []);
            }
          )
        : null;

    return () => {
      unsubGlobal && unsubGlobal();
      unsubToko && unsubToko();
    };
  }, [tokoId]);

  const normalize = (v) =>
    String(v || "")
      .trim()
      .toUpperCase();

  const normalizeImei = (imei) =>
    String(imei || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");

  const normalizeText = (v) =>
    String(v || "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, " ");

  const isApproved = (t) => String(t.STATUS || "").toUpperCase() === "APPROVED";

  // ===============================
  // 🔥 SUPPLIER LOOKUP UNIVERSAL
  // ===============================
  const supplierLookup = useMemo(() => {
    const map = {};

    // ======================================
    // 🔥 SORT TRANSAKSI TERLAMA → TERBARU
    // ======================================
    const sorted = [...transaksi].sort(
      (a, b) =>
        new Date(a.TANGGAL_TRANSAKSI || 0).getTime() -
        new Date(b.TANGGAL_TRANSAKSI || 0).getTime()
    );

    sorted.forEach((t) => {
      if (String(t.STATUS || "").toUpperCase() !== "APPROVED") {
        return;
      }

      if (!t.NAMA_BARANG || !t.NAMA_BRAND) {
        return;
      }

      const metode = String(t.PAYMENT_METODE || "").toUpperCase();

      // ======================================
      // 🔥 HANYA DARI PEMBELIAN ASLI
      // ======================================
      if (metode !== "PEMBELIAN") {
        return;
      }

      const supplier = t.NAMA_SUPPLIER || "-";

      // ======================================
      // 🔥 IMEI
      // ======================================
      if (t.IMEI) {
        const imeiKey = normalizeImei(t.IMEI);

        // SIMPAN SUPPLIER AWAL
        if (!map[imeiKey]) {
          map[imeiKey] = supplier;
        }
      }

      // ======================================
      // 🔥 NON IMEI
      // ======================================
      if (!t.IMEI) {
        const skuKey =
          `${normalize(t.NAMA_TOKO)}|` +
          `${normalizeText(t.NAMA_BRAND)}|` +
          `${normalizeText(t.NAMA_BARANG)}`;

        // SIMPAN SUPPLIER AWAL
        if (!map[skuKey]) {
          map[skuKey] = supplier;
        }
      }
    });

    return map;
  }, [transaksi]);

  // ======================= SUMMARY DASHBOARD TOKO =======================

  const todayStr = new Date().toISOString().slice(0, 10);

  // 🔥 FILTER HANYA PENJUALAN TOKO INI
  const penjualanToko = useMemo(() => {
    return (transaksiToko || []).filter(
      (x) => String(x.PAYMENT_METODE || "").toUpperCase() === "PENJUALAN"
    );
  }, [transaksiToko]);

  // 1️⃣ INFORMASI OMSET PEMBELIAN STOK
  const totalOmsetPembelian = useMemo(() => {
    return (transaksiToko || [])
      .filter(
        (x) =>
          String(x.PAYMENT_METODE || "").toUpperCase() === "PEMBELIAN" &&
          String(x.STATUS || "").toUpperCase() === "APPROVED"
      )
      .reduce((s, x) => s + Number(x.TOTAL || x.HARGA_UNIT || 0), 0);
  }, [transaksiToko]);

  // 2️⃣ TOTAL TRANSAKSI BERHASIL (INVOICE UNIK)
  const totalTransaksiBerhasil = useMemo(() => {
    const map = {};
    penjualanToko.forEach((trx) => {
      if (String(trx.STATUS).toUpperCase() !== "APPROVED") return;
      const inv = String(trx.NO_INVOICE || "").trim();
      if (inv) map[inv] = true;
    });
    return Object.keys(map).length;
  }, [penjualanToko]);

  // 3️⃣ TRANSAKSI PENDING
  const totalPending = useMemo(() => {
    return penjualanToko.filter(
      (x) => String(x.STATUS).toUpperCase() === "PENDING"
    ).length;
  }, [penjualanToko]);

  // 4️⃣ PENJUALAN HARI INI
  const totalPenjualanHariIni = useMemo(() => {
    return penjualanToko
      .filter((x) => {
        if (!x.TANGGAL_TRANSAKSI) return false;
        return x.TANGGAL_TRANSAKSI.slice(0, 10) === todayStr;
      })
      .filter((x) => String(x.STATUS).toUpperCase() === "APPROVED")
      .reduce((s, x) => s + Number(x.TOTAL || 0), 0);
  }, [penjualanToko, todayStr]);

  // 5️⃣ TOTAL UNIT TERJUAL
  const totalUnitTerjual = useMemo(() => {
    return penjualanToko.length;
  }, [penjualanToko]);

  // 6️⃣ INFORMASI PIUTANG
  const totalPiutang = useMemo(() => {
    return penjualanToko.filter(
      (x) =>
        String(x.SYSTEM_PAYMENT || "").toUpperCase() === "PIUTANG" &&
        String(x.STATUS || "").toUpperCase() === "APPROVED"
    ).length;
  }, [penjualanToko]);

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
  // 🔥 ACTIVE IMEI FINAL
  // ======================================
  const activeImeiSet = useMemo(() => {
    const set = new Set();

    transaksi.forEach((t) => {
      if (!t?.IMEI) return;

      const metode = String(t.PAYMENT_METODE || "").toUpperCase();

      const status = String(t.STATUS || "").toUpperCase();

      // ✅ hanya pembelian approved
      if (metode === "PEMBELIAN" && status === "APPROVED") {
        set.add(normalizeImei(t.IMEI));
      }
    });

    return set;
  }, [transaksi]);

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

      // =========================
      // PENJUALAN = HILANGKAN
      // =========================
      if (metode === "PENJUALAN") {
        soldSet.add(imei);
      }

      // =========================
      // REFUND = BALIKKAN
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
  const refundAvailableSet = useMemo(() => {
    const set = new Set();

    const sorted = [...transaksi].sort(
      (a, b) =>
        new Date(a.CREATED_AT || a.TANGGAL_TRANSAKSI || 0).getTime() -
        new Date(b.CREATED_AT || b.TANGGAL_TRANSAKSI || 0).getTime()
    );

    sorted.forEach((t) => {
      if (!t?.IMEI) return;

      const imei = normalizeImei(t.IMEI);

      const metode = String(t.PAYMENT_METODE || "").toUpperCase();

      const status = String(t.STATUS || "").toUpperCase();

      if (!["APPROVED", "REFUND"].includes(status)) {
        return;
      }

      // ======================================
      // 🔥 REFUND MASUK STOCK
      // ======================================
      if (metode === "REFUND") {
        set.add(imei);
      }

      // ======================================
      // 🔥 SUDAH TERJUAL LAGI
      // ======================================
      if (metode === "PENJUALAN") {
        set.delete(imei);
      }

      // ======================================
      // 🔥 TRANSFER / OPNAME
      // ======================================
      if (["TRANSFER_KELUAR", "REJECT", "STOK OPNAME"].includes(metode)) {
        set.delete(imei);
      }
    });

    return set;
  }, [transaksi]);

  // ======================================
  // 🔥 REFUND SUDAH TERJUAL
  // ======================================
  const refundSoldSet = useMemo(() => {
    const set = new Set();

    const refundMap = new Set();

    transaksi.forEach((t) => {
      const metode = String(t.PAYMENT_METODE || "").toUpperCase();

      const status = String(t.STATUS || "").toUpperCase();

      if (!["APPROVED", "REFUND"].includes(status)) {
        return;
      }

      if (metode === "REFUND" && t.IMEI) {
        refundMap.add(normalizeImei(t.IMEI));
      }
    });

    transaksi.forEach((t) => {
      const metode = String(t.PAYMENT_METODE || "").toUpperCase();

      const status = String(t.STATUS || "").toUpperCase();

      if (!["APPROVED", "REFUND"].includes(status)) {
        return;
      }

      if (metode === "PENJUALAN" && t.IMEI) {
        const clean = normalizeImei(t.IMEI);

        if (refundMap.has(clean)) {
          set.add(clean);
        }
      }
    });

    return set;
  }, [transaksi]);

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

      const status = String(t.STATUS || "").toUpperCase();

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
  // 🔥 IMEI TRANSFER ACTIVE TRACKER
  // ======================================
  const imeiTransferTracker = useMemo(() => {
    const map = {};

    const sorted = [...transaksi].sort(
      (a, b) =>
        new Date(a.CREATED_AT || 0).getTime() -
        new Date(b.CREATED_AT || 0).getTime()
    );

    sorted.forEach((t) => {
      if (!t?.IMEI) return;

      const imei = normalizeImei(t.IMEI);

      const metode = String(t.PAYMENT_METODE || "").toUpperCase();

      const status = String(t.STATUS || "").toUpperCase();

      if (!["APPROVED", "REFUND"].includes(status)) {
        return;
      }

      // ======================================
      // 🔥 STOCK MASUK
      // ======================================
      if (
        ["PEMBELIAN", "TRANSFER_MASUK", "TRANSFER_REJECT", "REFUND"].includes(
          metode
        )
      ) {
        map[imei] = {
          toko: t.NAMA_TOKO || "-",
          status: "ACTIVE",
          metode,
          tanggal: t.TANGGAL_TRANSAKSI || "-",
        };
      }

      // ======================================
      // 🔥 STOCK KELUAR
      // ======================================
      if (
        ["PENJUALAN", "TRANSFER_KELUAR", "REJECT", "STOK OPNAME"].includes(
          metode
        )
      ) {
        map[imei] = {
          toko: t.NAMA_TOKO || "-",
          status: "MOVED",
          metode,
          tanggal: t.TANGGAL_TRANSAKSI || "-",
        };
      }
    });

    return map;
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
      if (imei && normalizeImei(imei) !== "NON-IMEI") {
        map[`IMEI_${normalizeImei(imei)}`] = {
          tanggal: t.TANGGAL_TRANSAKSI || "-",

          noDo: t.NO_INVOICE || "-",

          supplier:
            supplierLookup?.[imei] ||
            supplierLookup?.[normalizeImei(t.IMEI)] ||
            t.NAMA_SUPPLIER ||
            "-",

          namaToko: t.NAMA_TOKO || "-",

          brand: t.NAMA_BRAND || "-",

          barang: t.NAMA_BARANG || "-",

          imei,

          qty: 1,

          statusBarang: "TERSEDIA",

          keterangan: metode,
        };
      }

      // ======================================
      // 🔥 NON IMEI
      // ======================================
      if (!imei) {
        const skuKey = `SKU_${normalizeText(t.NAMA_BRAND)}|${normalizeText(
          t.NAMA_BARANG
        )}`;
        if (!map[skuKey]) {
          map[skuKey] = {
            tanggal: t.TANGGAL_TRANSAKSI || "-",

            noDo: t.NO_SURAT_JALAN || t.NO_INVOICE || "-",

            supplier:
              supplierLookup?.[
                `${normalize(t.NAMA_TOKO)}|${normalizeText(
                  t.NAMA_BRAND
                )}|${normalizeText(t.NAMA_BARANG)}`
              ] ||
              t.NAMA_SUPPLIER ||
              "-",

            namaToko: t.NAMA_TOKO || "-",

            brand: t.NAMA_BRAND || "-",

            barang: t.NAMA_BARANG || "-",

            imei: "",

            // ======================================
            // 🔥 FIX TRANSFER NON IMEI
            // ======================================
            qty: [
              "PEMBELIAN",
              "TRANSFER_MASUK",
              "REFUND",
              "TRANSFER_REJECT",
            ].includes(metode)
              ? Math.abs(Number(t.QTY || 0))
              : 0,

            hargaSRP: masterMap?.[skuKey]?.hargaSRP || 0,

            hargaGrosir: masterMap?.[skuKey]?.hargaGrosir || 0,

            hargaReseller: masterMap?.[skuKey]?.hargaReseller || 0,

            statusBarang:
              metode === "TRANSFER_MASUK" ? "TRANSFER MASUK" : "TERSEDIA",

            // ======================================
            // 🔥 KETERANGAN FINAL
            // ======================================
            keterangan:
              metode === "TRANSFER_MASUK" ? "TRANSFER BARANG" : metode,
          };
        } else {
          map[skuKey].qty += Number(t.QTY || 0);
        }
      }
    });

    return map;
  }, [transaksi]);

  // ======================================
  // 🔥 STOCK OPNAME SYNC FINAL
  // ======================================
  // ======================================
  // 🔥 STOCK OPNAME SYNC FINAL
  // ======================================
  const stockOpnameSyncRows = useMemo(() => {
    const map = {};

    Object.values(masterPembelianActiveMap || {}).forEach((item) => {
      if (!item) return;

      // FILTER TOKO
      if (normalize(item.namaToko) !== normalize(TOKO_AKTIF)) {
        return;
      }

      // =========================
      // 🔥 IMEI
      // =========================
      if (item.imei && normalizeImei(item.imei) !== "NON-IMEI") {
        const cleanImei = normalizeImei(item.imei);

        // skip terjual
        if (imeiTerjual.has(cleanImei) && !refundAvailableSet.has(cleanImei)) {
          return;
        }

        map[`IMEI_${cleanImei}`] = {
          ...item,
          qty: 1,
          statusBarang: "TERSEDIA",
          keterangan: item.keterangan || "SYNC STOCK OPNAME",
        };

        return;
      }

      // =========================
      // 🔥 NON IMEI
      // =========================
      const skuKey = `SKU_${normalizeText(item.brand)}|${normalizeText(
        item.barang
      )}`;

      if (!map[skuKey]) {
        // ======================================
        // 🔥 CEK REFUND NON IMEI
        // ======================================
        const hasRefundNonImei = transaksi.some(
          (t) =>
            normalize(t.NAMA_TOKO) === normalize(item.namaToko) &&
            normalizeText(t.NAMA_BRAND) === normalizeText(item.brand) &&
            normalizeText(t.NAMA_BARANG) === normalizeText(item.barang) &&
            (!String(t.IMEI || t.NO_IMEI || t.NOMOR_UNIK || "").trim() ||
              normalizeImei(t.IMEI || t.NO_IMEI || t.NOMOR_UNIK) ===
                "NON-IMEI") &&
            String(t.PAYMENT_METODE || "").toUpperCase() === "REFUND" &&
            String(t.STATUS || "").toUpperCase() === "APPROVED"
        );

        map[skuKey] = {
          ...item,

          qty: Number(item.qty || 0),

          statusBarang: "TERSEDIA",

          // ======================================
          // 🔥 REFUND PRIORITAS
          // ======================================
          keterangan: hasRefundNonImei
            ? "REFUND"
            : item.keterangan || "SYNC STOCK OPNAME",
        };
      } else {
        map[skuKey].qty += Number(item.qty || 0);
      }
    });

    return Object.values(map);
  }, [masterPembelianActiveMap, TOKO_AKTIF, imeiTerjual, refundAvailableSet]);

  const imeiFinalMap = useMemo(() => {
    const map = {};

    // ======================================
    // 🔥 SORT TRANSAKSI
    // ======================================
    const sorted = [...transaksi].sort(
      (a, b) =>
        new Date(a.TANGGAL_TRANSAKSI || 0).getTime() -
        new Date(b.TANGGAL_TRANSAKSI || 0).getTime()
    );

    sorted.forEach((t) => {
      if (String(t.STATUS || "").toUpperCase() !== "APPROVED" || !t.IMEI) {
        return;
      }

      const imei = normalizeImei(t.IMEI);

      const metode = String(t.PAYMENT_METODE || "").toUpperCase();

      // ======================================
      // 🔥 STOCK MASUK
      // ======================================
      if (
        ["PEMBELIAN", "TRANSFER_MASUK", "TRANSFER_REJECT", "REFUND"].includes(
          metode
        )
      ) {
        map[imei] = {
          imei: t.IMEI,
          toko: t.NAMA_TOKO,
          tanggal: t.TANGGAL_TRANSAKSI || "-",
          noDo: t.NO_INVOICE || "-",
          supplier:
            supplierLookup?.[imei] ||
            supplierLookup?.[normalizeImei(t.IMEI)] ||
            t.NAMA_SUPPLIER ||
            "-",
          brand: t.NAMA_BRAND || "-",
          barang: t.NAMA_BARANG || "-",
          qty: 1,
          statusBarang: "TERSEDIA",
          keterangan:
            metode === "TRANSFER_KELUAR" || metode === "TRANSFER_MASUK"
              ? "TRANSFER BARANG"
              : metode,
        };
      }

      // ======================================
      // 🔥 STOCK KELUAR
      // ======================================
      // ======================================
      // 🔥 PENJUALAN FINAL
      // ======================================
      if (metode === "PENJUALAN") {
        map[imei] = {
          imei: t.IMEI,
          toko: t.NAMA_TOKO,
          tanggal: t.TANGGAL_TRANSAKSI || "-",
          noDo: t.NO_INVOICE || "-",
          supplier:
            supplierLookup?.[imei] ||
            supplierLookup?.[normalizeImei(t.IMEI)] ||
            t.NAMA_SUPPLIER ||
            "-",
          brand: t.NAMA_BRAND || "-",
          barang: t.NAMA_BARANG || "-",
          qty: 0,
          statusBarang: "TERJUAL",
          keterangan: metode,
        };

        return;
      }

      // ======================================
      // 🔥 TRANSFER / REJECT
      // ======================================
      if (["TRANSFER_KELUAR", "REJECT", "STOK OPNAME"].includes(metode)) {
        // ======================================
        // 🔥 JANGAN HAPUS OWNER
        // ======================================
        map[imei] = {
          ...map[imei],

          imei: t.IMEI,

          tanggal: t.TANGGAL_TRANSAKSI || "-",

          noDo: t.NO_INVOICE || "-",

          supplier:
            supplierLookup?.[imei] ||
            supplierLookup?.[normalizeImei(t.IMEI)] ||
            t.NAMA_SUPPLIER ||
            "-",

          brand: t.NAMA_BRAND || "-",

          barang: t.NAMA_BARANG || "-",

          qty: 0,

          statusBarang: "PINDAH TOKO",

          keterangan: metode,
        };
      }
    });

    return map;
  }, [transaksi]);

  // ======================================
  // 🔥 FINAL OWNER TRACKER
  // ======================================
  const finalOwnerTracker = useMemo(() => {
    const map = {};

    const sorted = [...transaksi].sort(
      (a, b) =>
        new Date(a.CREATED_AT || 0).getTime() -
        new Date(b.CREATED_AT || 0).getTime()
    );

    sorted.forEach((t) => {
      if (!t?.IMEI) return;

      const imei = normalizeImei(t.IMEI);

      const metode = String(t.PAYMENT_METODE || "").toUpperCase();

      const status = String(t.STATUS || "").toUpperCase();

      if (status !== "APPROVED") return;

      // ======================================
      // 🔥 STOCK MASUK
      // ======================================
      if (
        ["PEMBELIAN", "TRANSFER_MASUK", "REFUND", "TRANSFER_REJECT"].includes(
          metode
        )
      ) {
        map[imei] = {
          toko: t.NAMA_TOKO,
          active: true,
          metode,
        };
      }

      // ======================================
      // 🔥 STOCK KELUAR
      // ======================================
      if (
        ["PENJUALAN", "TRANSFER_KELUAR", "REJECT", "STOK OPNAME"].includes(
          metode
        )
      ) {
        map[imei] = {
          toko: t.NAMA_TOKO,
          active: false,
          metode,
        };
      }
    });

    return map;
  }, [transaksi]);

  /* ======================
   BUILD ROWS UNIVERSAL (SYNC DETAIL STOCK)
====================== */
  /* ======================
   BUILD ROWS FINAL UNIVERSAL
====================== */
  const rows = useMemo(() => {
    if (!namaToko) return [];

    const map = {};

    // ===============================
    // 🔥 STEP 1 — CLONE TRANSAKSI
    // ===============================
    const allEvents = transaksi.filter((t) =>
      ["APPROVED", "REFUND"].includes(String(t.STATUS || "").toUpperCase())
    );

    // =====================================
    // 🔥 TRACK REFUND IMEI TERBARU
    // =====================================
    const refundImeiSet = new Set();

    allEvents.forEach((t) => {
      if (String(t.PAYMENT_METODE || "").toUpperCase() === "REFUND" && t.IMEI) {
        refundImeiSet.add(String(t.IMEI).trim());
      }
      // ======================================
      // 🔥 FINAL OWNER VALIDATION
      // ======================================
      if (t.IMEI) {
        const owner = finalOwnerTracker?.[normalizeImei(t.IMEI)];

        // bukan owner aktif
        if (!owner?.active || normalize(owner?.toko) !== normalize(namaToko)) {
          return;
        }
      } else {
        // NON IMEI tetap pakai toko transaksi
        // ======================================
        // 🔥 FINAL FILTER TOKO
        // ======================================
        if (t.IMEI) {
          const owner = finalOwnerTracker?.[normalizeImei(t.IMEI)];

          if (
            !owner?.active ||
            normalize(owner?.toko) !== normalize(namaToko)
          ) {
            return;
          }
        } else {
          // ======================================
          // 🔥 NON IMEI TRANSFER
          // ======================================
          if (normalize(t.NAMA_TOKO) !== normalize(namaToko)) {
            return;
          }
        }
      }
    });

    // ===============================
    // 🔥 FALLBACK DETAIL STOCK FINAL
    // ===============================
    Object.values(detailStock || {}).forEach((s) => {
      if (!s?.imei) return;

      const cleanImei = normalizeImei(s.imei);

      // ======================================
      // 🔥 FILTER TOKO
      // ======================================
      if (normalize(s.toko) !== normalize(namaToko)) {
        return;
      }

      // ======================================
      // 🔥 STATUS
      // ======================================
      const status = String(s.STATUS || s.status || "").toUpperCase();

      // ======================================
      // 🔥 HANYA STOCK AKTIF
      // ======================================
      if (!["AVAILABLE", "REFUND", "READY"].includes(status)) {
        return;
      }

      // ======================================
      // 🔥 BARANG TERJUAL
      // ======================================
      if (imeiTerjual.has(cleanImei) && !refundAvailableSet.has(cleanImei)) {
        return;
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
        if (normalize(latestTransfer.NAMA_TOKO) !== normalize(namaToko)) {
          return;
        }
      }

      // ======================================
      // 🔥 DUPLIKAT
      // ======================================
      if (map[cleanImei] && Number(map[cleanImei].qty || 0) > 0) {
        return;
      }

      // ======================================
      // 🔥 INSERT FINAL
      // ======================================
      map[s.imei] = {
        tanggal: s.updatedAt || s.tanggal || "-",

        noDo: "-",

        supplier:
          supplierLookup?.[s.imei] || supplierLookup?.[cleanImei] || "-",

        namaToko: s.toko || namaToko,

        brand: s.brand || "-",

        barang: s.namaBarang || "-",

        imei: s.imei,

        qty: 1,

        hargaSRP: 0,

        hargaGrosir: 0,

        hargaReseller: 0,

        statusBarang: "TERSEDIA",

        keterangan:
          String(s.LAST_ACTION || "").toUpperCase() === "REFUND"
            ? "REFUND"
            : "DARI DETAIL STOCK",
      };
    });

    allEvents.sort(
      (a, b) =>
        new Date(a.CREATED_AT || 0).getTime() -
        new Date(b.CREATED_AT || 0).getTime()
    );

    // ===============================
    // 🔥 PROCESS ALL EVENTS
    // ===============================
    allEvents.forEach((t) => {
      if (
        !["APPROVED", "REFUND"].includes(String(t.STATUS || "").toUpperCase())
      ) {
        return;
      }

      const metode = String(t.PAYMENT_METODE || "").toUpperCase();

      const qtyBase = t.IMEI ? 1 : Number(t.QTY || 0);

      let effect = 0;

      // ======================================
      // 🔥 STOCK MASUK
      // ======================================
      if (
        [
          "PEMBELIAN",
          "TRANSFER_MASUK",
          "REFUND",
          "TRANSFER_REJECT",
          "RETUR",
          "VOID OPNAME",
        ].includes(metode)
      ) {
        effect = Math.abs(qtyBase);
      }

      // ======================================
      // 🔥 STOCK KELUAR
      // ======================================
      if (
        ["PENJUALAN", "TRANSFER_KELUAR", "REJECT", "STOK OPNAME"].includes(
          metode
        )
      ) {
        effect = -Math.abs(qtyBase);
      }

      // ======================================
      // 🔥 IMEI FINAL ENGINE
      // ======================================
      if (t.IMEI && normalizeImei(t.IMEI) !== "NON-IMEI") {
        const key = String(t.IMEI).trim();

        const clean = normalizeImei(key);

        // ======================================
        // 🔥 DEFAULT ROW
        // ======================================
        if (!map[key]) {
          map[key] = {
            tanggal: t.TANGGAL_TRANSAKSI || "-",

            noDo: t.NO_INVOICE || "-",

            supplier:
              supplierLookup?.[key] ||
              supplierLookup?.[clean] ||
              t.NAMA_SUPPLIER ||
              "-",

            namaToko: t.NAMA_TOKO || "-",

            brand: t.NAMA_BRAND || "-",

            barang: t.NAMA_BARANG || "-",

            imei: key,

            qty: 0,

            hargaSRP:
              masterMap?.[`${t.NAMA_BRAND}|${t.NAMA_BARANG}`]?.hargaSRP || 0,

            hargaGrosir:
              masterMap?.[`${t.NAMA_BRAND}|${t.NAMA_BARANG}`]?.hargaGrosir || 0,

            hargaReseller:
              masterMap?.[`${t.NAMA_BRAND}|${t.NAMA_BARANG}`]?.hargaReseller ||
              0,

            statusBarang: "TERSEDIA",

            keterangan: metode,
          };
        }

        // ======================================
        // 🔥 STOCK MASUK
        // ======================================
        if (
          [
            "PEMBELIAN",
            "TRANSFER_MASUK",
            "REFUND",
            "RETUR",
            "VOID OPNAME",
            "TRANSFER_REJECT",
          ].includes(metode)
        ) {
          map[key].qty = 1;

          map[key].statusBarang =
            metode === "TRANSFER_MASUK" ? "TRANSFER MASUK" : "TERSEDIA";

          map[key].keterangan =
            metode === "TRANSFER_MASUK" ? "TRANSFER_MASUK" : metode;

          return;
        }

        // ======================================
        // 🔥 TRANSFER KELUAR
        // ======================================
        if (metode === "TRANSFER_KELUAR") {
          // ======================================
          // 🔥 JANGAN HILANGKAN DATA
          // ======================================
          map[key].qty = 1;

          map[key].statusBarang = "TRANSFER";

          map[key].keterangan = "TRANSFER_KELUAR";

          return;
        }

        // ======================================
        // 🔥 PENJUALAN
        // ======================================
        if (metode === "PENJUALAN") {
          map[key].qty = 0;

          map[key].statusBarang = "TERJUAL";

          map[key].keterangan = "PENJUALAN";

          return;
        }

        // ======================================
        // 🔥 REJECT / OPNAME
        // ======================================
        if (["REJECT", "STOK OPNAME"].includes(metode)) {
          map[key].qty = 0;

          map[key].statusBarang = metode;

          map[key].keterangan = metode;

          return;
        }

        return;
      }

      // ======================================
      // 🔥 NON IMEI
      // ======================================
      const skuKey = `${normalizeText(t.NAMA_BRAND)}|${normalizeText(
        t.NAMA_BARANG
      )}`;

      if (!map[skuKey]) {
        map[skuKey] = {
          tanggal: t.TANGGAL_TRANSAKSI || "-",

          noDo: t.NO_INVOICE || "-",

          supplier:
            supplierLookup?.[
              `${normalizeText(t.NAMA_BRAND)}|${normalizeText(t.NAMA_BARANG)}`
            ] ||
            t.NAMA_SUPPLIER ||
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

      // ======================================
      // 🔥 NON IMEI FINAL ENGINE
      // ======================================

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
        const qtyMasuk = metode === "REFUND" ? 1 : Math.abs(Number(t.QTY || 0));

        map[skuKey].qty = Number(map[skuKey].qty || 0) + qtyMasuk;

        // ======================================
        // 🔥 KETERANGAN FINAL
        // ======================================
        map[skuKey].keterangan =
          metode === "TRANSFER_KELUAR" || metode === "TRANSFER_MASUK"
            ? "TRANSFER BARANG"
            : metode;
      }

      // STOCK KELUAR
      if (
        ["PENJUALAN", "TRANSFER_KELUAR", "REJECT", "STOK OPNAME"].includes(
          metode
        )
      ) {
        map[skuKey].qty = Math.max(
          0,
          Number(map[skuKey].qty || 0) - Math.abs(Number(t.QTY || 0))
        );

        // ======================================
        // 🔥 KETERANGAN FINAL
        // ======================================
        map[skuKey].keterangan =
          metode === "TRANSFER_KELUAR" || metode === "TRANSFER_MASUK"
            ? "TRANSFER BARANG"
            : metode;
      }

      // ======================================
      // 🔥 FIX NEGATIF
      // ======================================
      if (Number(map[skuKey].qty || 0) < 0) {
        map[skuKey].qty = 0;
      }

      // ======================================
      // 🔥 KETERANGAN PRIORITAS
      // ======================================

      // REFUND
      if (metode === "REFUND") {
        map[skuKey].keterangan = "REFUND";
      }

      // TRANSFER MASUK
      if (metode === "TRANSFER_MASUK") {
        map[skuKey].keterangan = "TRANSFER_MASUK";
      }

      // TRANSFER REJECT
      if (metode === "TRANSFER_REJECT") {
        map[skuKey].keterangan = "TRANSFER_REJECT";
      }
    });

    // ======================================
    // 🔥 FINAL FILTER
    // ======================================
    return Object.values(map).filter((r) => {
      // ======================================
      // 🔥 TETAP TAMPILKAN DATA TRANSFER
      // ======================================
      if (
        Number(r.qty || 0) <= 0 &&
        !["TRANSFER_KELUAR", "TRANSFER_MASUK"].includes(
          String(r.keterangan || "").toUpperCase()
        )
      ) {
        return false;
      }

      // ======================================
      // 🔥 REFUND SUDAH DIJUAL LAGI
      // ======================================
      if (r.imei) {
        const cleanImei = normalizeImei(r.imei);

        // ======================================
        // 🔥 SUDAH TERJUAL & BUKAN REFUND ACTIVE
        // ======================================
        if (imeiTerjual.has(cleanImei) && !refundAvailableSet.has(cleanImei)) {
          return false;
        }

        // ======================================
        // 🔥 REFUND SUDAH TERJUAL LAGI
        // ======================================
        const refundState = refundFinalTracker?.[cleanImei];

        if (refundState && refundState.active === false) {
          return false;
        }
      }

      // ======================================
      // 🔥 IMEI FILTER
      // ======================================
      if (r.imei) {
        const cleanImei = normalizeImei(r.imei);
        const latest = imeiFinalMap[normalizeImei(r.imei)];

        if (!latest) {
          return false;
        }

        // ======================================
        // 🔥 VALIDASI TOKO TERAKHIR
        // ======================================
        const latestTracker = imeiTransferTracker[normalizeImei(r.imei)];

        if (!latestTracker) {
          return true;
        }

        // ======================================
        // 🔥 HANYA TOKO PEMILIK TERAKHIR
        // ======================================
        if (normalize(latestTracker.toko) !== normalize(namaToko)) {
          return false;
        }

        if (normalize(latest.toko) !== normalize(namaToko)) {
          return false;
        }
        // ======================================
        // 🔥 BARANG TERJUAL HILANG
        // ======================================
        if (imeiTerjual.has(cleanImei) && !refundAvailableSet.has(cleanImei)) {
          return false;
        }

        // ======================================
        // 🔥 VALIDASI STOCK MASUK FINAL
        // ======================================
        const hasStockMasuk = transaksi.some(
          (t) =>
            normalizeImei(t.IMEI) === cleanImei &&
            [
              "PEMBELIAN",
              "TRANSFER_MASUK",
              "TRANSFER_REJECT",
              "REFUND",
            ].includes(String(t.PAYMENT_METODE || "").toUpperCase()) &&
            String(t.STATUS || "").toUpperCase() === "APPROVED"
        );

        if (!hasStockMasuk) {
          return false;
        }
      }

      // ======================================
      // 🔥 TAMPILKAN TRANSFER WALAU QTY 0
      // ======================================
      if (
        Number(r.qty || 0) <= 0 &&
        !["TRANSFER BARANG", "TRANSFER_KELUAR", "TRANSFER_MASUK"].includes(
          String(r.keterangan || "").toUpperCase()
        )
      ) {
        return false;
      }

      // ======================================
      // 🔥 IMEI FILTER
      // ======================================
      if (r.imei) {
        const latest = imeiFinalMap[normalizeImei(r.imei)];

        if (!latest) {
          return false;
        }

        if (normalize(latest.toko) !== normalize(namaToko)) {
          return false;
        }
        const cleanImei = normalizeImei(r.imei);

        if (imeiTerjual.has(cleanImei) && !refundAvailableSet.has(cleanImei)) {
          return false;
        }

        const hasStockMasuk = transaksi.some(
          (t) =>
            normalizeImei(t.IMEI) === cleanImei &&
            [
              "PEMBELIAN",
              "TRANSFER_MASUK",
              "TRANSFER_REJECT",
              "REFUND",
            ].includes(String(t.PAYMENT_METODE || "").toUpperCase()) &&
            String(t.STATUS || "").toUpperCase() === "APPROVED"
        );

        if (!hasStockMasuk) {
          return false;
        }
      }

      return true;
    });
  }, [
    transaksi,
    masterMap,
    namaToko,
    supplierLookup,
    detailStock,
    imeiTerjual,
    refundAvailableSet,
    imeiTransferTracker,
    refundSoldSet,
    refundAvailableSet,
    refundFinalTracker,
  ]);

  // ======================================
  // 🔥 FINAL MERGED ROWS
  // SYNC DETAIL STOCK
  // ======================================
  const mergedRows = useMemo(() => {
    return (
      (rows || [])
        .filter((r) => {
          // ======================================
          // 🔥 FILTER STOCK AKTIF
          // ======================================
          if (Number(r.qty || 0) <= 0) {
            return false;
          }

          // ======================================
          // 🔥 FILTER TOKO
          // ======================================
          if (normalize(r.namaToko) !== normalize(TOKO_AKTIF)) {
            return false;
          }

          return true;
        })

        // ======================================
        // 🔥 SORT FINAL
        // ======================================
        .sort((a, b) => {
          const brandA = String(a.brand || "").toUpperCase();

          const brandB = String(b.brand || "").toUpperCase();

          return brandA.localeCompare(brandB);
        })
    );
  }, [rows, TOKO_AKTIF]);

  // ======================================
  // 🔥 SORT FINAL
  // ======================================
  mergedRows.sort((a, b) => {
    return new Date(b.tanggal || 0) - new Date(a.tanggal || 0);
  });

  /* ======================
   SEARCH FILTER
====================== */
  /* ======================
   SEARCH FILTER UNIVERSAL
====================== */
  const filtered = useMemo(() => {
    const keyword = String(dashboardSearch || search || "")
      .trim()
      .toLowerCase();

    // ======================================
    // 🔥 TANPA SEARCH
    // ======================================
    if (!keyword) {
      return mergedRows;
    }

    return mergedRows.filter((r) => {
      // ======================================
      // 🔥 FORMAT TANGGAL
      // ======================================
      const tanggal = String(r.tanggal || "")
        .replace("T", " ")
        .toLowerCase();

      // ======================================
      // 🔥 FIELD UNIVERSAL
      // ======================================
      const imei = String(r.imei || "").toLowerCase();

      const barang = String(r.barang || "").toLowerCase();

      const toko = String(r.namaToko || r.toko || "").toLowerCase();

      const brand = String(r.brand || "").toLowerCase();

      const noDo = String(r.noDo || "").toLowerCase();

      const supplier = String(r.supplier || "").toLowerCase();

      const status = String(r.statusBarang || "").toLowerCase();

      const keterangan = String(r.keterangan || "").toLowerCase();

      // ======================================
      // 🔥 UNIVERSAL SEARCH
      // ======================================
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
  }, [mergedRows, dashboardSearch, search]);

  // ======================================
  // 🔥 TOTAL STOCK FINAL DASHBOARD
  // ======================================
  const totalStockDashboard = useMemo(() => {
    return mergedRows.reduce((sum, item) => {
      return sum + Number(item.qty || 0);
    }, 0);
  }, [mergedRows]);

  // ======================= DETAIL STOK TOKO =======================

  const detailStockToko = useMemo(() => {
    const map = {};

    (stockToko || []).forEach((x) => {
      const key =
        (x.NAMA_BRAND || "") +
        "|" +
        (x.NAMA_BARANG || "") +
        "|" +
        (x.KATEGORI_BRAND || "");

      if (!map[key]) {
        map[key] = {
          brand: x.NAMA_BRAND,
          barang: x.NAMA_BARANG,
          kategori: x.KATEGORI_BRAND,
          qty: 0,
        };
      }

      // IMEI = 1 unit
      map[key].qty += 1;
    });

    return Object.values(map).sort((a, b) =>
      String(a.brand).localeCompare(String(b.brand))
    );
  }, [stockToko]);

  // ======================= HANDLER =======================

  /* ================= HANDLER ================= */

  const handleToggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const handleOpen = (type) => {
    if (!toko) return;

    const tokoSlug =
      toko.code || (toko.tokoName || "").toLowerCase().replace(/\s+/g, "-");

    if (type === "penjualan") {
      navigate(`/toko/${tokoSlug}/penjualan`);
    } else if (type === "stock") {
      navigate("/stok-opname", {
        state: { lockedToko: toko.tokoName },
      });
    } else if (type === "transfer") {
      navigate("/transfer-barang");
    }
  };

  console.log("🔥 FIREBASE TOKO ID:", firebaseTokoId);

  /* ============================
      🔥 PENJUALAN CEPAT IMEI
  ============================ */
  const handleSearchImei = () => {
    const input = String(searchImei).trim();
    if (!input) return alert("Masukan IMEI");
    if (loadingStock) return alert("⏳ Loading data...");

    const imeiFound = stockToko.find(
      (x) => String(x.IMEI || "").trim() === input
    );

    if (!imeiFound) {
      alert(`❌ IMEI ${input} tidak ditemukan`);
      return;
    }

    navigate(`/toko/${toko.code}/penjualan`, {
      state: {
        fastSale: true,
        imeiData: {
          toko: TOKO_AKTIF,
          kategoriBarang: imeiFound.KATEGORI_BRAND,
          namaBrand: imeiFound.NAMA_BRAND,
          namaBarang: imeiFound.NAMA_BARANG,
          imei: imeiFound.IMEI,

          hargaMap: {
            srp: Number(imeiFound.HARGA_SRP || imeiFound.HARGA_UNIT || 0),
            grosir: Number(imeiFound.HARGA_GROSIR || 0),
            reseller: Number(imeiFound.HARGA_RESELLER || 0),
          },
        },
      },
    });
  };

  // ======================= FILTER STOCK TABLE =======================
  const filteredStockToko = useMemo(() => {
    const keyword = String(searchStock || "").toLowerCase();

    if (!keyword) return stockToko;

    return stockToko.filter((x) => {
      return (
        String(x.NO_DO || "")
          .toLowerCase()
          .includes(keyword) ||
        String(x.NAMA_BRAND || "")
          .toLowerCase()
          .includes(keyword) ||
        String(x.NAMA_BARANG || "")
          .toLowerCase()
          .includes(keyword) ||
        String(x.IMEI || "")
          .toLowerCase()
          .includes(keyword)
      );
    });
  }, [stockToko, searchStock]);

  /* ======================
     PAGINATION
  ====================== */
  const pageCount = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  /* ======================
     EXPORT EXCEL
  ====================== */
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(mergedRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DetailStock");
    XLSX.writeFile(wb, "Detail_Stock_Semua_Toko.xlsx");
  };

  // ======================= HANDLE TIDAK ADA TOKO =======================
  if (!toko) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white shadow rounded-xl px-6 py-4 text-center">
          <p className="font-semibold text-red-600">Toko tidak ditemukan</p>
          <p className="text-xs text-slate-500 mt-1">
            Pastikan link Sidebar untuk Dashboard Toko menggunakan id 1–10.
          </p>
        </div>
      </div>
    );
  }

  // ======================= UI =======================
  const rootBgClass = isDark
    ? "bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-slate-100"
    : "bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900";

  const cardBgClass = isDark
    ? "bg-slate-900/70 border border-slate-700/80 text-slate-100"
    : "bg-white border border-slate-200 text-slate-900";

  // ======================================
  // 🔥 FILTER TABLE REAL
  // ======================================
  const filteredRows = (rows || []).filter((item) => {
    // ======================================
    // 🔥 QTY VALID
    // ======================================
    if (Number(item.qty || 0) <= 0) {
      return false;
    }

    // ======================================
    // 🔥 SEARCH FILTER
    // ======================================
    const keyword = String(dashboardSearch || searchStock || "")
      .trim()
      .toUpperCase();

    // ======================================
    // 🔥 TANPA SEARCH
    // ======================================
    if (!keyword) {
      return true;
    }

    return (
      String(item.brand || "")
        .toUpperCase()
        .includes(keyword) ||
      String(item.barang || "")
        .toUpperCase()
        .includes(keyword) ||
      String(item.imei || "")
        .toUpperCase()
        .includes(keyword) ||
      String(item.namaToko || "")
        .toUpperCase()
        .includes(keyword)
    );
  });

  // ======================================
  // 🔥 EXPORT DETAIL STOCK FINAL REAL
  // ======================================
  const exportDashboardStock = () => {
    try {
      // ======================================
      // 🔥 PAKAI DATA TABLE ASLI
      // BUKAN DATA ENGINE
      // ======================================
      const tableSource = Array.isArray(filteredRows)
        ? filteredRows
        : Array.isArray(rows)
        ? rows
        : [];

      // ======================================
      // 🔥 FINAL REAL TABLE
      // ======================================
      const finalRows = tableSource
        .filter((item) => {
          return Number(item.qty || 0) > 0;
        })

        // ======================================
        // 🔥 STRICT DUPLICATE REMOVE
        // ======================================
        .reduce((acc, item) => {
          const key = item.imei
            ? `IMEI_${String(item.imei).trim()}`
            : `NONIMEI_${String(item.namaToko).trim()}_${String(
                item.brand
              ).trim()}_${String(item.barang).trim()}`;

          // ======================================
          // 🔥 SKIP DUPLICATE
          // ======================================
          if (acc.some((x) => x.__key === key)) {
            return acc;
          }

          acc.push({
            ...item,
            __key: key,
          });

          return acc;
        }, [])

        // ======================================
        // 🔥 CLEAN INTERNAL KEY
        // ======================================
        .map(({ __key, ...rest }) => rest)

        // ======================================
        // 🔥 SORT FINAL
        // ======================================
        .sort((a, b) => {
          return String(a.brand || "").localeCompare(String(b.brand || ""));
        });

      // ======================================
      // 🔥 EXPORT ROWS
      // ======================================
      const exportRows = finalRows.map((item, index) => ({
        NO: index + 1,

        TANGGAL: item.tanggal || "-",

        NO_DO: item.noDo || "-",

        SUPPLIER: item.supplier || "-",

        TOKO: item.namaToko || "-",

        BRAND: item.brand || "-",

        BARANG: item.barang || "-",

        IMEI: item.imei || "-",

        QTY: Number(item.qty || 0),

        STATUS: item.statusBarang || "-",

        KETERANGAN: item.keterangan || "-",

        HARGA_SRP: Number(item.hargaSRP || 0),

        HARGA_GROSIR: Number(item.hargaGrosir || 0),

        HARGA_RESELLER: Number(item.hargaReseller || 0),
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportRows);

      worksheet["!cols"] = [
        { wch: 8 },
        { wch: 15 },
        { wch: 22 },
        { wch: 25 },
        { wch: 20 },
        { wch: 20 },
        { wch: 35 },
        { wch: 25 },
        { wch: 10 },
        { wch: 20 },
        { wch: 25 },
        { wch: 18 },
        { wch: 18 },
        { wch: 18 },
      ];

      const workbook = XLSX.utils.book_new();

      XLSX.utils.book_append_sheet(workbook, worksheet, "DETAIL_STOCK");

      XLSX.writeFile(
        workbook,
        `DETAIL_STOCK_${TOKO_AKTIF}_${
          new Date().toISOString().split("T")[0]
        }.xlsx`
      );

      alert("✅ Export Excel berhasil");
    } catch (err) {
      console.error(err);

      alert("❌ Gagal export excel");
    }
  };
  return (
    <div className={`min-h-screen ${rootBgClass} p-4 sm:p-6`}>
      <div className="max-w-6xl mx-auto space-y-5">
        {/* ================= HEADER ================= */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/40 text-xs text-indigo-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Realtime Store Dashboard</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3 tracking-tight">
              <span className="inline-flex items-center justify-center h-11 w-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 shadow-lg shadow-indigo-500/30">
                <FaStore className="text-indigo-300 text-xl" />
              </span>
              <span>
                Dashboard Toko
                <span className="block text-sm font-semibold text-slate-300">
                  {toko.tokoName}
                </span>
              </span>
            </h1>
          </div>

          {/* ================= FAST SALE IMEI ================= */}
          {/* <div className="bg-white p-4 rounded-xl shadow mb-6 flex gap-2">
            <FaSearch className="text-gray-400" /> 
            <input
              type="text"
              value={searchImei}
              onChange={(e) => setSearchImei(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-2 text-sm outline-none"
              placeholder="Cari IMEI..."
            />
            <button
              onClick={handleSearchImei}
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded"
            >
              Proses Penjualan
            </button>
          </div> */}

          <div className="flex items-center gap-3 justify-end">
            <button
              onClick={handleToggleTheme}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-slate-900/60 border border-slate-700/70 shadow-lg shadow-black/40 text-xs hover:scale-105 transition"
            >
              {isDark ? (
                <>
                  <FaSun className="text-yellow-300" />
                  <span>Mode Terang</span>
                </>
              ) : (
                <>
                  <FaMoon className="text-indigo-500" />
                  <span>Mode Gelap</span>
                </>
              )}
            </button>

            <div
              className={`px-3 py-2 rounded-xl ${
                isDark
                  ? "bg-slate-900/60 border-slate-700/80"
                  : "bg-white border-slate-200"
              } border text-xs sm:text-sm flex flex-col items-end shadow-lg`}
            >
              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                Nama Toko ID
              </span>
              <span className="font-semibold">{toko.tokoName}</span>
            </div>
          </div>
        </div>

        {/* ================= 3 MENU CARD ================= */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mt-2 sm:mt-4">
          {/* PENJUALAN */}
          <button
            onClick={() => handleOpen("penjualan")}
            className="group relative overflow-hidden flex flex-col items-start justify-between bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white rounded-2xl p-5 shadow-xl shadow-indigo-900/40 border border-white/10 hover:border-indigo-300/60 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01] transition-all duration-300 text-left"
          >
            <span className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-3xl group-hover:bg-white/20 transition-all" />
            <div className="flex items-center justify-between w-full relative">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] opacity-80">
                  Menu
                </p>
                <p className="font-semibold text-lg mt-1">Penjualan</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center shadow-md shadow-black/30">
                <FaShoppingCart className="text-white text-2xl" />
              </div>
            </div>
            <p className="text-xs sm:text-sm mt-3 opacity-90">
              Input transaksi penjualan lengkap dengan invoice dan approval.
            </p>
          </button>

          {/* STOCK OPNAME */}
          {!isPicToko && (
            <button
              onClick={() => handleOpen("stock")}
              className="group relative overflow-hidden flex flex-col items-start justify-between bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 text-white rounded-2xl p-5 shadow-xl shadow-emerald-900/40 border border-white/10 hover:border-emerald-300/60 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01] transition-all duration-300 text-left"
            >
              <span className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-3xl group-hover:bg-white/20 transition-all" />
              <div className="flex items-center justify-between w-full relative">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.2em] opacity-80">
                    Menu
                  </p>
                  <p className="font-semibold text-lg mt-1">Stock Opname</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center shadow-md shadow-black/30">
                  <FaBoxes className="text-white text-2xl" />
                </div>
              </div>
              <p className="text-xs sm:text-sm mt-3 opacity-90">
                Cek dan sesuaikan stok fisik dengan sistem secara berkala.
              </p>
            </button>
          )}

          {/* TRANSFER GUDANG */}
          <button
            onClick={() => handleOpen("transfer")}
            className="group relative overflow-hidden flex flex-col items-start justify-between bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white rounded-2xl p-5 shadow-xl shadow-amber-900/40 border border-white/10 hover:border-amber-300/70 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01] transition-all duration-300 text-left"
          >
            <span className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-3xl group-hover:bg-white/25 transition-all" />
            <div className="flex items-center justify-between w-full relative">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] opacity-80">
                  Menu
                </p>
                <p className="font-semibold text-lg mt-1">Transfer Gudang</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center shadow-md shadow-black/30">
                <FaExchangeAlt className="text-white text-2xl" />
              </div>
            </div>
            <p className="text-xs sm:text-sm mt-3 opacity-90">
              Pindahkan stok antar toko atau ke gudang pusat dengan kontrol.
            </p>
          </button>
        </div>
      </div>

      {/* ===================== DETAIL STOCK UNIVERSAL ===================== */}
      <div
        className={`
          ${cardBgClass}
          rounded-3xl
          shadow-2xl
          mt-10
          overflow-hidden
          border
          ${
            isDark
              ? "border-slate-700 bg-slate-900/80"
              : "border-slate-200 bg-white"
          }
        `}
      >
        {/* HEADER */}
        <div
          className={`
            flex flex-col md:flex-row
            md:items-center
            md:justify-between
            gap-4
            px-6
            py-5
            border-b
            ${
              isDark
                ? "border-slate-700 bg-slate-800/70"
                : "border-slate-200 bg-slate-50"
            }
          `}
        >
          <div>
            <h2
              className={`
                text-2xl font-bold tracking-tight
                ${isDark ? "text-white" : "text-slate-800"}
              `}
            >
              DETAIL STOCK TOKO
            </h2>

            <p
              className={`
                text-sm mt-1
                ${isDark ? "text-slate-400" : "text-slate-500"}
              `}
            >
              Monitoring realtime stock universal semua transaksi
            </p>
          </div>

          <div
            className={`
              px-4 py-2 rounded-2xl font-semibold text-sm
              ${
                isDark
                  ? "bg-indigo-500/20 text-indigo-200 border border-indigo-400/30"
                  : "bg-indigo-100 text-indigo-700 border border-indigo-200"
              }
            `}
          >
            {TOKO_AKTIF}
          </div>
        </div>

        {/* ======================================
🔥 HEADER CONTROL
====================================== */}
        <div className="p-5 border-b border-slate-700">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* SEARCH */}
            <div className="relative flex-1">
              <FaSearch
                className="
          absolute
          left-5
          top-1/2
          -translate-y-1/2
          text-slate-400
        "
              />

              <input
                type="text"
                value={dashboardSearch}
                onChange={(e) => setDashboardSearch(e.target.value)}
                placeholder="Cari IMEI / Barang / Toko / Brand / NO DO / Tanggal"
                className="
          w-full
          pl-14
          pr-5
          py-4
          rounded-2xl
          outline-none
          border
          bg-slate-800
          border-slate-700
          text-white
          placeholder-slate-400
          shadow-lg
        "
              />
            </div>

            {/* ACTION BUTTON */}
            <div className="flex items-center gap-3">
              {/* PENJUALAN */}
              <button
                onClick={() => navigate("/penjualan")}
                className="
          flex
          items-center
          gap-2
          px-6
          py-4
          rounded-2xl
          font-bold
          text-white
          shadow-xl
          bg-gradient-to-r
          from-red-500
          to-emerald-500
          hover:scale-105
          transition-all
        "
              >
                <FaCashRegister />
                PENJUALAN
              </button>

              {/* EXPORT */}
              <button
                onClick={exportDashboardStock}
                className="
          flex
          items-center
          gap-2
          px-6
          py-4
          rounded-2xl
          font-bold
          text-white
          shadow-xl
          bg-emerald-500
          hover:bg-emerald-600
          hover:scale-105
          transition-all
        "
              >
                <FaFileExcel />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-0">
          <DetailStockToko
            mode="dashboard"
            searchTerm={dashboardSearch}
            namaToko={isPicToko ? TOKO_AKTIF : state?.namaToko || TOKO_AKTIF}
          />
        </div>
      </div>
    </div>
  );
}
