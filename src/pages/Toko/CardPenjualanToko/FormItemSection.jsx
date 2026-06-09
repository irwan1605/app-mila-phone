// ===================================================
// FormItemSection.jsx — FINAL FIX 100% (STABIL)
// Tahap 2 | INPUT BARANG | IMEI + NON IMEI + BUNDLING
// ===================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  listenMasterBarang,
  listenMasterKategoriBarang,
  unlockImeiRealtime,
  listenTransferBarangMasuk,
  lockImeiRealtime,
} from "../../../services/FirebaseService";
import { ref, get } from "firebase/database";
import { db } from "../../../firebase/FirebaseInit";
import { useCallback } from "react";
import { useLocation } from "react-router-dom";
import { buildFinalNonImeiStock } from "../../../features/FiturPenjualan/nonImeiStock/buildFinalNonImeiStock";
import { buildFinalImeiStock } from "../../../features/FiturPenjualan/ImeiStock/buildFinalImeiStock";

/* ================= KONSTANTA ================= */
const KATEGORI_IMEI = ["MOTOR LISTRIK", "SEPEDA LISTRIK", "HANDPHONE"];
const isImeiKategori = (kat) =>
  KATEGORI_IMEI.includes((kat || "").toUpperCase());

const normalize = (v) =>
  String(v || "")
    .toUpperCase()
    .trim();

export default function FormItemSection({
  value = [],
  onChange,
  tokoLogin,
  allowManual = false,
  stockRealtime = {},
  tahap1Valid = false, // ✅ VALIDATOR TAHAP 1
}) {
  const items = useMemo(() => (Array.isArray(value) ? value : []), [value]);
  const safeOnChange = useCallback(
    (v) => typeof onChange === "function" && onChange(v),
    [onChange]
  );

  const [masterBarang, setMasterBarang] = useState([]);
  const [masterKategori, setMasterKategori] = useState([]);
  const [allTransaksi, setAllTransaksi] = useState([]);
  const [imeiKeyword, setImeiKeyword] = useState("");
  const [stokToko, setStokToko] = useState([]);
  const [editIndex, setEditIndex] = useState(null);
  const [showTable, setShowTable] = useState(false);

  const finalImeiStock = useMemo(() => {
    return buildFinalImeiStock({
      transaksi: allTransaksi,
    });
  }, [allTransaksi]);

  /* ================= HELPER CEK TOKO DARI TRANSFER ================= */
  const findTokoByTransfer = (imei) => {
    const tf = stokToko.find(
      (s) => String(s.imei).trim() === String(imei).trim()
    );

    return tf?.toko || null;
  };

  /* ================= HELPER CEK TOKO DARI PEMBELIAN ================= */
  const findTokoByImei = (imei, transaksiList = []) => {
    if (!imei) return null;

    const trx = transaksiList.find(
      (t) =>
        String(t.IMEI || "").trim() === String(imei).trim() &&
        String(t.STATUS || "").toUpperCase() === "APPROVED" &&
        (String(t.PAYMENT_METODE || "").toUpperCase() === "PEMBELIAN" ||
          String(t.tipe || "").toUpperCase() === "PEMBELIAN" ||
          String(t.jenis || "").toUpperCase() === "PEMBELIAN")
    );

    return trx?.NAMA_TOKO || null;
  };

  const location = useLocation();

  const userLogin = JSON.parse(localStorage.getItem("userLogin") || "{}");

  const TOKO_AKTIF =
    userLogin.toko === "7"
      ? "METLAND 2"
      : userLogin.toko === "6"
      ? "METLAND 1"
      : userLogin.toko === "1"
      ? "CILANGKAP PUSAT"
      : "";

  useEffect(() => {
    if (!location?.state?.fastSale) return;

    const d = location.state.imeiData;
    if (!d) return;

    // Safety check toko
    if (
      String(d.toko || "").toUpperCase() !==
      String(TOKO_AKTIF || "").toUpperCase()
    ) {
      alert("❌ Stok bukan milik toko ini");
      return;
    }

    safeOnChange([
      {
        id: Date.now(),
        kategoriBarang: d.kategoriBarang,
        namaBrand: d.namaBrand,
        namaBarang: d.namaBarang,
        imei: d.imei,
        imeiList: [d.imei],
        qty: 1,
        hargaMap: d.hargaMap,
        skemaHarga: "srp",
        hargaAktif: d.hargaMap?.srp || 0,
        isImei: true,
      },
    ]);
  }, [location, safeOnChange]);

  useEffect(() => {
    if (!location?.state?.fastSale) return;

    const d = location.state.imeiData;
    if (!d) return;

    // VALIDASI TOKO
    if (d.toko && d.toko !== TOKO_AKTIF) {
      alert("❌ Stok bukan milik toko ini");
      return;
    }

    safeOnChange([
      {
        id: Date.now(),
        kategoriBarang: d.kategoriBarang,
        namaBrand: d.namaBrand,
        namaBarang: d.namaBarang,
        imei: d.imei,
        imeiList: [d.imei],
        qty: 1,
        hargaMap: d.hargaMap,
        skemaHarga: "srp",
        hargaAktif: d.hargaMap?.srp || 0,
        isImei: true,
      },
    ]);
  }, [location, safeOnChange]);

  useEffect(() => {
    if (!location?.state?.fastSale) return;

    const d = location.state.imeiData;
    if (!d) return;

    if (d.toko && d.toko !== TOKO_AKTIF) {
      alert("❌ Stok bukan milik toko ini");
      return;
    }

    safeOnChange([
      {
        id: Date.now(),
        kategoriBarang: d.kategoriBarang,
        namaBrand: d.namaBrand,
        namaBarang: d.namaBarang,
        imei: d.imei,
        imeiList: [d.imei],
        qty: 1,
        hargaMap: d.hargaMap,
        skemaHarga: "srp",
        hargaAktif: d.hargaMap?.srp || 0,
        isImei: true,
      },
    ]);
  }, [location, safeOnChange]);

  /* ================= LOAD MASTER ================= */
  useEffect(() => {
    const u1 = listenMasterBarang(setMasterBarang);
    const u2 = listenMasterKategoriBarang(setMasterKategori);
    return () => {
      u1 && u1();
      u2 && u2();
    };
  }, []);

  /* ================= LOAD DETAIL STOK TOKO ================= */
  /* ================= LOAD IMEI HASIL TRANSFER ================= */
  useEffect(() => {
    if (!tokoLogin) return;

    const unsub = listenTransferBarangMasuk(tokoLogin, (rows) => {
      setStokToko(Array.isArray(rows) ? rows : []);
    });

    return () => unsub && unsub();
  }, [tokoLogin]);

  useEffect(() => {
    const handleLeave = () => {
      items.forEach((it) => {
        it.imeiList?.forEach((im) => {
          unlockImeiRealtime(im, userLogin.uid || userLogin.username);
        });
      });
    };

    window.addEventListener("beforeunload", handleLeave);

    return () => {
      handleLeave();
      window.removeEventListener("beforeunload", handleLeave);
    };
  }, [items, tokoLogin]);

  useEffect(() => {
    const timer = setTimeout(() => {
      items.forEach((it) => {
        it.imeiList?.forEach((im) => {
          unlockImeiRealtime(im, userLogin.uid || userLogin.username);
        });
      });
    }, 5 * 60 * 1000); // 5 menit

    return () => clearTimeout(timer);
  }, [items, tokoLogin]);

  /* ================= LOAD TRANSAKSI ================= */
  useEffect(() => {
    const load = async () => {
      const snap = await get(ref(db, "toko"));
      const rows = [];
      snap.forEach((t) =>
        t.child("transaksi").forEach((x) => rows.push(x.val()))
      );
      setAllTransaksi(rows);
    };
    load();
  }, []);

  /* ================= UNLOCK IMEI ================= */
  useEffect(() => {
    if (!tokoLogin) return;

    const load = async () => {
      const snap = await get(ref(db, "toko"));
      const rows = [];

      snap.forEach((tokoSnap) => {
        const tokoData = tokoSnap.val();
        const transaksi = tokoData.transaksi || {};

        Object.values(transaksi).forEach((trx) => {
          rows.push({
            ...trx,
            tokoId: tokoSnap.key,
          });
        });
      });

      setAllTransaksi(rows);
    };

    load();
  }, [tokoLogin]);

  useEffect(() => {
    if (!tahap1Valid) return;

    // FAST SALE
    if (items.length === 1 && items[0].imeiList?.length === 1) {
      return;
    }

    // AUTO CREATE FORM
    if (allowManual && items.length === 0) {
      safeOnChange([
        {
          id: Date.now(),
          kategoriBarang: "",
          namaBrand: "",
          namaBarang: "",
          imei: "",
          imeiList: [],
          qty: 0,
          hargaAktif: 0,
          isImei: false,
        },
      ]);
    }
  }, [tahap1Valid, allowManual, items, safeOnChange]);

  // list master barang (hasil listener)

  // ambil dari firebase
  useEffect(() => {
    const unsub = listenMasterBarang((rows) => {
      setMasterBarang(Array.isArray(rows) ? rows : []);
    });
    return () => unsub && unsub();
  }, []);

  /* ================= HELPERS ================= */
  const getStockByToko = (namaBarang) => {
    if (!namaBarang) return 0;
    return stockRealtime?.barang?.[namaBarang] || 0;
  };

  const updateItem = (index, updated) => {
    const newItems = items.map((item, i) =>
      i === index
        ? {
            ...item,
            ...updated,
          }
        : item
    );

    safeOnChange(newItems);
  };

  const handleShowTable = () => {
    setShowTable(true);

    const last = items[items.length - 1];

    if (!last) {
      safeOnChange([
        {
          id: Date.now(),
          kategoriBarang: "",
          namaBrand: "",
          namaBarang: "",
          imei: "",
          imeiList: [],
          qty: 0,
          hargaAktif: 0,
          isImei: false,
        },
      ]);
      return;
    }

    // ================= VALIDASI =================
    if (!last.namaBarang) {
      alert("⚠ Pilih barang dulu");
      return;
    }

    if (last.isImei && (!last.imeiList || last.imeiList.length === 0)) {
      alert("⚠ IMEI wajib diisi");
      return;
    }

    if (!last.isImei && (!last.qty || last.qty < 1)) {
      alert("⚠ Qty tidak valid");
      return;
    }

    // ================= TAMBAH ITEM BARU =================
    const newItem = {
      id: Date.now(),
      kategoriBarang: "",
      namaBrand: "",
      namaBarang: "",
      imei: "",
      imeiList: [],
      qty: 0,
      hargaAktif: 0,
      isImei: false,
    };

    safeOnChange([...items, newItem]);
    setEditIndex(items.length); // langsung edit baris baru
  };

  const handleEdit = (index) => {
    setEditIndex(index);
  };

  const handleDelete = (index) => {
    const item = items[index];

    // unlock IMEI jika ada
    item?.imeiList?.forEach((im) =>
      unlockImeiRealtime(im, userLogin.uid || userLogin.username)
    );

    const newItems = items.filter((_, i) => i !== index);
    safeOnChange(newItems);

    if (newItems.length === 0) {
      setShowTable(false);
    }
  };

  const kategoriList = useMemo(
    () => masterKategori.map((k) => k.namaKategori),
    [masterKategori]
  );

  const brandList = (kategori) => {
    const map = new Set();

    // =====================================
    // 🔥 1. AMBIL DARI MASTER BARANG
    // =====================================
    masterBarang.forEach((b) => {
      const kategoriMaster = b.kategoriBarang || b.KATEGORI_BARANG || "";

      const brandMaster = b.namaBrand || b.brand || b.BRAND || "";

      // =====================================
      // 🔥 FILTER SESUAI KATEGORI
      // =====================================
      if (
        String(kategoriMaster).toUpperCase().trim() ===
        String(kategori || "")
          .toUpperCase()
          .trim()
      ) {
        if (brandMaster) {
          map.add(String(brandMaster).trim());
        }
      }
    });

    // =====================================
    // 🔥 2. TAMBAHAN DARI STOCK FINAL TOKO
    // =====================================
    Object.entries(stockFinalToko || {}).forEach(([key, qty]) => {
      if (!qty || qty <= 0) return;

      const [brand, namaBarang] = String(key || "").split("|");

      const barangMaster = masterBarang.find(
        (b) =>
          String(b.namaBarang || b.barang || "")
            .toUpperCase()
            .trim() ===
          String(namaBarang || "")
            .toUpperCase()
            .trim()
      );

      // =====================================
      // 🔥 FALLBACK MANUAL
      // AGAR BARANG:
      // REFUND / TRANSFER / REJECT
      // TETAP TERBACA
      // =====================================
      // =====================================
      // 🔥 AMBIL MASTER HARGA
      // =====================================
      const masterHarga = masterBarang.find(
        (m) => normalize(m.namaBarang) === normalize(namaBarang)
      );

      // =====================================
      // 🔥 FALLBACK BARANG
      // =====================================
      const fallbackBarang = {
        kategoriBarang: kategori || "ACCESSORIES",

        namaBrand: masterHarga?.namaBrand || brand,

        namaBarang: masterHarga?.namaBarang || namaBarang,

        harga: masterHarga?.harga || {
          srp: 0,
          grosir: 0,
          reseller: 0,
        },
      };

      const barangFix = barangMaster || fallbackBarang;

      // =====================================
      // 🔥 SAFE READ
      // =====================================
      const kategoriBarang = barangFix?.kategoriBarang || "";

      if (
        String(kategoriBarang).toUpperCase().trim() ===
        String(kategori || "")
          .toUpperCase()
          .trim()
      ) {
        if (brand) {
          map.add(String(brand).trim());
        }
      }
    });

    // =====================================
    // 🔥 3. TAMBAHAN DARI TRANSFER BARANG
    // =====================================
    stokToko.forEach((s) => {
      const kategoriTf = s.kategoriBarang || s.KATEGORI_BARANG || "";

      const brandTf = s.namaBrand || s.brand || s.BRAND || "";

      if (
        String(kategoriTf).toUpperCase().trim() ===
        String(kategori || "")
          .toUpperCase()
          .trim()
      ) {
        if (brandTf) {
          map.add(String(brandTf).trim());
        }
      }
    });

    // =====================================
    // 🔥 FINAL SORT
    // =====================================
    return [...map].filter(Boolean).sort((a, b) => a.localeCompare(b));
  };

  const barangList = (kategori, brand) => {
    const finalMap = {};

    // =====================================
    // 🔥 AMBIL DARI STOCK FINAL TOKO
    // =====================================
    Object.entries(stockDetailFinal || {}).forEach(([key, qty]) => {
      // =====================================
      // 🔥 STOCK HABIS
      // =====================================
      if (Number(qty || 0) <= 0) {
        return;
      }

      const [brandStock, namaBarangStock] = String(key).split("|");

      // =====================================
      // 🔥 FILTER BRAND
      // =====================================
      if (normalize(brandStock) !== normalize(brand)) {
        return;
      }

      // =====================================
      // 🔥 CARI MASTER
      // =====================================
      const barangMaster = masterBarang.find((b) => {
        const namaMaster = String(b.namaBarang || b.barang || "")
          .trim()
          .toUpperCase();

        const namaStock = String(namaBarangStock || "")
          .trim()
          .toUpperCase();

        return namaMaster === namaStock;
      });

      // =====================================
      // 🔥 FALLBACK MANUAL
      // =====================================
      const fallbackBarang = {
        kategoriBarang: kategori || "ACCESSORIES",

        namaBrand: brandStock || brand || "",

        namaBarang: namaBarangStock || "",

        harga: {
          srp: 0,
          grosir: 0,
          reseller: 0,
        },
      };

      // =====================================
      // 🔥 FINAL BARANG
      // =====================================
      const barangFix = barangMaster || fallbackBarang;

      // =====================================
      // 🔥 FILTER KATEGORI
      // =====================================
      if (
        normalize(barangFix?.kategoriBarang || kategori) !== normalize(kategori)
      ) {
        return;
      }

      // =====================================
      // 🔥 FINAL KEY
      // =====================================
      const finalKey = `${normalize(brandStock)}|${normalize(namaBarangStock)}`;

      // =====================================
      // 🔥 NO DUPLICATE
      // =====================================
      if (finalMap[finalKey]) {
        return;
      }

      finalMap[finalKey] = {
        ...barangMaster,

        namaBrand: brandStock,

        namaBarang: namaBarangStock,

        stok: Number(qty || 0),
      };
    });

    return Object.values(finalMap).sort((a, b) =>
      String(a.namaBarang).localeCompare(String(b.namaBarang))
    );
  };



  /* ================= IMEI BY BARANG ================= */
  /* ================= IMEI BY BARANG ================= */
  const imeiByBarang = useMemo(() => {
    if (!tokoLogin) return [];

    // =====================================
    // 🔥 IMEI DARI TRANSAKSI TOKO
    // =====================================
    const imeiPembelian = allTransaksi
      .filter(
        (t) =>
          String(t.NAMA_TOKO || "").toUpperCase() ===
            String(tokoLogin || "").toUpperCase() &&
          String(t.STATUS || "").toUpperCase() === "APPROVED" &&
          ["PEMBELIAN", "TRANSFER_MASUK", "REFUND", "INPUT_STOK"].includes(
            String(t.PAYMENT_METODE || "").toUpperCase()
          ) &&
          t.IMEI &&
          String(t.NAMA_BARANG || "").toUpperCase() ===
            String(items[0]?.namaBarang || "").toUpperCase()
      )
      .map((t) => String(t.IMEI).trim())

      // 🔥 HILANGKAN IMEI SUDAH TERJUAL
      .filter((imei) => {
        const finalImei =
          finalImeiStock?.[imei];
      
        return finalImei?.available === true;
      });

    // =====================================
    // 🔥 IMEI HASIL TRANSFER BARANG
    // =====================================
    const imeiTransfer = stokToko
    .map((s) => String(s.imei || "").trim())
    .filter(Boolean)
    .filter((imei) => {
      const final = finalImeiStock?.[imei];
  
      return final?.available === true;
    });

    // =====================================
    // 🔥 GABUNGKAN + HILANGKAN DUPLIKAT
    // =====================================
    return [...new Set([...imeiPembelian, ...imeiTransfer])];
  }, [allTransaksi, tokoLogin, items, stockRealtime, stokToko]);

  const handleTambahBarang = () => {
    // validasi minimal
    const last = items[items.length - 1];

    if (!last) {
      alert("⚠ Isi barang terlebih dahulu");
      return;
    }

    if (!last.namaBarang) {
      alert("⚠ Pilih barang dulu");
      return;
    }

    if (last.isImei && (!last.imeiList || last.imeiList.length === 0)) {
      alert("⚠ IMEI wajib diisi");
      return;
    }

    if (!last.isImei && (!last.qty || last.qty < 1)) {
      alert("⚠ Qty tidak valid");
      return;
    }

    // CLONE agar aman (atomic)
    const newItem = {
      ...last,
      id: Date.now(),
    };

    // push ke penjualan
    safeOnChange([...items, newItem]);
  };

  const findBarangByImei = (imei) => {
    // cari dari transaksi pembelian
    const trx = allTransaksi.find(
      (t) =>
        String(t.IMEI || "").trim() === imei &&
        String(t.NAMA_TOKO || "").toUpperCase() ===
          String(tokoLogin || "").toUpperCase()
    );

    // =====================================
    // 🔥 FALLBACK TRANSFER BARANG
    // =====================================
    if (!trx) {
      return findBarangByTransfer(imei);
    }

    if (!trx) return null;

    // mapping ke master barang
    const barang = masterBarang.find(
      (b) =>
        String(b.namaBarang || "").toUpperCase() ===
        String(trx.NAMA_BARANG || "").toUpperCase()
    );

    if (!barang) return null;

    return {
      kategoriBarang: barang.kategoriBarang,
      namaBrand: barang.namaBrand || barang.brand,
      namaBarang: barang.namaBarang,
      hargaMap: barang.harga || {},
    };
  };

  /* ================= IMEI DARI TRANSFER BARANG ================= */
  const findBarangByTransfer = (imei) => {
    // =====================================
    // 🔥 CARI DATA TRANSFER
    // =====================================
    const row = stokToko.find(
      (s) => String(s.imei || "").trim() === String(imei || "").trim()
    );

    // =====================================
    // 🔥 JIKA TIDAK ADA
    // =====================================
    if (!row) return null;

    // =====================================
    // 🔥 SUPPORT MULTI FIELD
    // =====================================
    const namaBarang = row.namaBarang || row.barang || row.NAMA_BARANG || "";

    const namaBrand = row.namaBrand || row.brand || row.NAMA_BRAND || "";

    // =====================================
    // 🔥 AMBIL HARGA DARI TRANSFER
    // =====================================
    const hargaSRP =
      Number(
        row.hargaSRP ||
          row.hargaJual ||
          row.harga ||
          row.srp ||
          row.HARGA_SRP ||
          0
      ) || 0;

    const hargaGrosir =
      Number(row.hargaGrosir || row.grosir || row.HARGA_GROSIR || hargaSRP) ||
      hargaSRP;

    const hargaReseller =
      Number(
        row.hargaReseller || row.reseller || row.HARGA_RESELLER || hargaSRP
      ) || hargaSRP;

    // =====================================
    // 🔥 CARI MASTER BARANG
    // =====================================
    const barang = masterBarang.find(
      (b) =>
        String(b.namaBarang || "")
          .toUpperCase()
          .trim() ===
        String(namaBarang || "")
          .toUpperCase()
          .trim()
    );

    // =====================================
    // 🔥 FALLBACK MANUAL
    // =====================================
    if (!barang) {
      return {
        kategoriBarang: "HANDPHONE",

        namaBrand: namaBrand,

        namaBarang: namaBarang,

        hargaMap: {
          srp: hargaSRP,
          grosir: hargaGrosir,
          reseller: hargaReseller,
        },

        fromTransfer: true,
      };
    }

    // =====================================
    // 🔥 SUCCESS
    // =====================================
    return {
      kategoriBarang: barang.kategoriBarang || "HANDPHONE",

      namaBrand: barang.namaBrand || barang.brand || namaBrand,

      namaBarang: barang.namaBarang || namaBarang,

      // =====================================
      // 🔥 PRIORITAS HARGA
      // 1. MASTER BARANG
      // 2. DATA TRANSFER
      // =====================================
      hargaMap:
        barang.harga && Object.keys(barang.harga || {}).length > 0
          ? {
              srp:
                Number(barang.harga?.srp || barang.harga?.SRP || hargaSRP) ||
                hargaSRP,

              grosir:
                Number(
                  barang.harga?.grosir || barang.harga?.GROSIR || hargaGrosir
                ) || hargaGrosir,

              reseller:
                Number(
                  barang.harga?.reseller ||
                    barang.harga?.RESELLER ||
                    hargaReseller
                ) || hargaReseller,
            }
          : {
              srp: hargaSRP,
              grosir: hargaGrosir,
              reseller: hargaReseller,
            },

      fromTransfer: true,
    };
  };

  /* ================= IMEI DARI DETAIL STOK TOKO ================= */
  const findBarangByDetailStok = (imei) => {
    if (!imei) return null;

    const stok = stokToko.find(
      (s) =>
        String(s.imei || "").trim() === String(imei).trim() &&
        String(s.status || "").toUpperCase() === "AVAILABLE"
    );

    if (!stok) return null;

    const barang = masterBarang.find(
      (b) =>
        String(b.namaBarang || "").toUpperCase() ===
        String(stok.namaBarang || "").toUpperCase()
    );

    if (!barang) return null;

    return {
      kategoriBarang: barang.kategoriBarang,
      namaBrand: barang.namaBrand || barang.brand,
      namaBarang: barang.namaBarang,
      hargaMap: barang.harga || {},
      fromTransfer: true,
    };
  };

  /* ==============================
   🔥 STOK NON IMEI MILIK TOKO
============================== */
  const stokNonImeiToko = useMemo(() => {
    if (!tokoLogin) return {};

    const map = {};

    Object.entries(stockRealtime?.barang || {}).forEach(([namaBarang, qty]) => {
      if (!qty || qty <= 0) return;

      // cari di master barang
      const barang = masterBarang.find(
        (b) =>
          String(b.namaBarang || "").toUpperCase() ===
          String(namaBarang || "").toUpperCase()
      );

      if (!barang) return;

      map[namaBarang] = qty;
    });

    return map;
  }, [stockRealtime, tokoLogin, masterBarang]);

  /* =====================================================
   🔥 GLOBAL STOCK MAP (100% STOCK OPNAME SYNC)
   IMEI + NON IMEI
===================================================== */
  const globalStockMap = useMemo(() => {
    if (!tokoLogin) return {};

    const map = {};

    allTransaksi.forEach((t) => {
      if (!t) return;
      if (String(t.STATUS).toUpperCase() !== "APPROVED") return;
      if (
        String(t.NAMA_TOKO || "").toUpperCase() !==
        String(tokoLogin || "").toUpperCase()
      )
        return;

      const metode = String(t.PAYMENT_METODE || "").toUpperCase();
      const isImei = !!t.IMEI;

      // ================= IMEI =================
      if (isImei) {
        const imei = String(t.IMEI).trim();

        if (!map[imei]) {
          map[imei] = { type: "IMEI", available: false };
        }

        if (["PEMBELIAN", "TRANSFER_MASUK", "REFUND"].includes(metode)) {
          map[imei].available = true;
        }

        const trxRefund = allTransaksi.find(
          (x) =>
            String(x.IMEI || "").trim() === String(imei).trim() &&
            (x.READY_RESALE === true ||
              String(x.statusRefund || x.PAYMENT_METODE || "").toUpperCase() ===
                "READY_RESALE")
        );

        if (["PENJUALAN", "TRANSFER_KELUAR"].includes(metode) && !trxRefund) {
          map[imei].available = false;
        }
      }

      // ================= NON IMEI =================
      if (!isImei) {
        const key =
          `${normalize(t.NAMA_BRAND || t.namaBrand)}|` +
          `${normalize(t.NAMA_BARANG || t.namaBarang)}`;

        if (!map[key]) {
          map[key] = { type: "NON_IMEI", qty: 0 };
        }

        const qty = Number(t.QTY || 0);

        if (["PEMBELIAN", "TRANSFER_MASUK", "REFUND"].includes(metode)) {
          map[key].qty += qty;
        }

        if (["PENJUALAN", "TRANSFER_KELUAR"].includes(metode)) {
          map[key].qty -= qty;
        }
      }
    });

    return map;
  }, [allTransaksi, tokoLogin]);

  /* =========================================
🔥 FINAL STOCK (DETAIL + OPNAME SYNC)
========================================= */
  const stockFinalToko = useMemo(() => {
    if (!tokoLogin) return {};

    const map = {};

    // =========================
    // 🔥 1. BASE DARI TRANSAKSI (SUDAH ADA)
    // =========================
    Object.entries(globalStockMap).forEach(([key, val]) => {
      if (val.type === "NON_IMEI") {
        map[key] = (map[key] || 0) + val.qty;
      }

      if (val.type === "IMEI" && val.available) {
        const trx = allTransaksi.find(
          (t) =>
            String(t.IMEI || "").trim() === key &&
            String(t.NAMA_TOKO || "").toUpperCase() ===
              String(tokoLogin).toUpperCase()
        );

        if (!trx) return;

        const k = `${trx.NAMA_BRAND}|${trx.NAMA_BARANG}`;
        map[k] = (map[k] || 0) + 1;
      }
    });

    // =========================
    // 🔥 2. TAMBAHAN DARI TRANSFER
    // =========================
    stokToko.forEach((s) => {
      // =====================================
      // 🔥 SKIP BARANG SUDAH TERJUAL
      // =====================================
      const imei = String(s.imei || "").trim();

      const trxRefund = allTransaksi.find(
        (t) =>
          String(t.IMEI || "").trim() === String(imei).trim() &&
          ["REFUND", "READY_RESALE"].includes(
            String(t.PAYMENT_METODE || t.statusRefund || "").toUpperCase()
          ) &&
          String(t.STATUS || "").toUpperCase() === "APPROVED"
      );

      if (stockRealtime?.soldImei?.[imei] && !trxRefund) {
        return;
      }

      // =====================================
      // 🔥 HANYA AVAILABLE
      // =====================================
      if (String(s.status || "AVAILABLE").toUpperCase() !== "AVAILABLE") {
        return;
      }

      const k = `${s.namaBrand}|${s.namaBarang}`;

      map[k] = (map[k] || 0) + 1;
    });

    // =========================
    // 🔥 3. TAMBAHAN DARI STOCK OPNAME
    // =========================
    allTransaksi.forEach((t) => {
      if (
        String(t.PAYMENT_METODE).toUpperCase() === "STOK OPNAME" &&
        String(t.STATUS).toUpperCase() === "APPROVED" &&
        String(t.NAMA_TOKO).toUpperCase() === String(tokoLogin).toUpperCase()
      ) {
        const key = t.IMEI
          ? `${t.NAMA_BRAND}|${t.NAMA_BARANG}`
          : `${t.NAMA_BRAND}|${t.NAMA_BARANG}`;

        map[key] = Number(t.QTY || 0);
      }
    });

    return map;
  }, [globalStockMap, stokToko, allTransaksi, tokoLogin]);

  const nonImeiStockMap = useMemo(() => {
    const map = {};

    Object.entries(globalStockMap).forEach(([key, val]) => {
      if (val.type === "NON_IMEI" && val.qty > 0) {
        map[key] = val.qty;
      }
    });

    return map;
  }, [globalStockMap]);

  /* ================= NON IMEI STOCK FILTER ================= */
  const nonImeiStockList = useMemo(() => {
    return Object.keys(nonImeiStockMap);
  }, [nonImeiStockMap]);

  const grandTotal = useMemo(() => {
    return items.reduce((total, item) => {
      const harga = Number(item.hargaAktif || 0);
      const qty = Number(item.qty || 0);
      return total + harga * qty;
    }, 0);
  }, [items]);

 

  // =====================================
  // 🔥 FINAL NON IMEI STOCK
  // REFUND + REJECT + TRANSFER SYNC
  // =====================================
  const finalNonImeiStock = useMemo(() => {
    return buildFinalNonImeiStock({
      transaksi: allTransaksi,

      toko: tokoLogin,
    });
  }, [allTransaksi, tokoLogin]);

  const stockGabunganToko = useMemo(() => {
    if (!tokoLogin) return {};

    const map = {};
    const imeiTracker = new Set();

    // =========================
    // 🔥 1. DATA DARI TRANSAKSI
    // =========================
    allTransaksi.forEach((t) => {
      if (!t) return;

      const status = String(t.STATUS || "").toUpperCase();
      if (!["APPROVED", "REFUND"].includes(status)) return;

      const metode = String(t.PAYMENT_METODE || "").toUpperCase();

      const toko = t.NAMA_TOKO || t.toko || t.tokoPengirim || t.ke;

      if (
        String(toko || "")
          .toUpperCase()
          .trim() !==
        String(tokoLogin || "")
          .toUpperCase()
          .trim()
      ) {
        return;
      }

      const key = `${normalize(t.NAMA_BRAND)}|${normalize(t.NAMA_BARANG)}`;

      // ================= IMEI =================
      if (t.IMEI) {
        const imei = String(t.IMEI).trim();

        if (!map[key]) {
          map[key] = 0;
        }

        // =====================================
        // 🔥 STOCK MASUK IMEI
        // =====================================
        if (
          ["PEMBELIAN", "TRANSFER_MASUK", "REFUND", "VOID OPNAME"].includes(
            metode
          )
        ) {
          if (!imeiTracker.has(imei)) {
            map[key] += 1;
            imeiTracker.add(imei);
          }
        }

        // =====================================
        // 🔥 STOCK KELUAR IMEI
        // =====================================
        if (["PENJUALAN", "TRANSFER_KELUAR", "STOK OPNAME"].includes(metode)) {
          if (imeiTracker.has(imei)) {
            map[key] -= 1;
            imeiTracker.delete(imei);
          }
        }

        return;
      }

      // ================= NON IMEI =================
      const qty = Number(t.QTY || 0);

      if (!map[key]) map[key] = 0;

      // =====================================
      // 🔥 STOCK MASUK
      // =====================================
      if (
        ["PEMBELIAN", "TRANSFER_MASUK", "REFUND", "VOID OPNAME"].includes(
          metode
        )
      ) {
        map[key] += qty;
      }

      // =====================================
      // 🔥 STOCK KELUAR
      // =====================================
      if (["PENJUALAN", "TRANSFER_KELUAR", "STOK OPNAME"].includes(metode)) {
        map[key] -= qty;
      }

      // REFUND DETAIL
      if (t.statusPembayaran === "REFUND" && Array.isArray(t.items)) {
        t.items.forEach((it) => {
          if (it.imeiList?.length) return;

          const k = `${normalize(it.namaBrand)}|${normalize(it.namaBarang)}`;

          if (!map[k]) map[k] = 0;

          map[k] += Number(it.qty || 0);
        });
      }
    });

    // =========================
    // 🔥 2. DATA DARI TRANSFER (FIX DI SINI)
    // =========================
    stokToko.forEach((tf) => {
      if (!tf) return;

      if (
        String(tf.ke || "")
          .toUpperCase()
          .trim() !==
        String(tokoLogin || "")
          .toUpperCase()
          .trim()
      ) {
        return;
      }

      // =====================================
      // 🔥 SKIP IMEI SUDAH TERJUAL
      // =====================================
      if (tf.imei && stockRealtime?.soldImei?.[String(tf.imei).trim()]) {
        return;
      }

      const key =
        `${normalize(tf.namaBrand || tf.brand || tf.NAMA_BRAND)}|` +
        `${normalize(tf.namaBarang || tf.barang || tf.NAMA_BARANG)}`;

      if (!map[key]) map[key] = 0;

      map[key] += Number(tf.qty || tf.QTY || 1);
    });

    return Object.fromEntries(
      Object.entries(map).filter(([, qty]) => Number(qty || 0) > 0)
    );
  }, [allTransaksi, tokoLogin, stokToko]);

  /* =========================================
🔥 UNIVERSAL FINAL STOCK
IMEI + NON IMEI
PEMBELIAN + TRANSFER + REFUND + REJECT
========================================= */
  /* =========================================
🔥 UNIVERSAL FINAL STOCK
SINGLE SOURCE OF TRUTH
IMEI + NON IMEI
========================================= */
  const universalStockMap = useMemo(() => {
    if (!tokoLogin) return {};

    const map = {};
    const imeiActive = new Set();

    // =====================================
    // 🔥 LOOP SEMUA TRANSAKSI
    // =====================================
    allTransaksi.forEach((t) => {
      if (!t) return;

      const status = normalize(t.STATUS);

      if (!["APPROVED", "REFUND"].includes(status)) {
        return;
      }

      // =====================================
      // 🔥 TOKO
      // =====================================
      const toko = t.NAMA_TOKO || t.toko || t.ke || t.tokoPengirim;

      if (normalize(toko) !== normalize(tokoLogin)) {
        return;
      }

      // =====================================
      // 🔥 METODE
      // =====================================
      const metode = normalize(t.PAYMENT_METODE);

      const brand = t.NAMA_BRAND || t.namaBrand || "";

      const barang = t.NAMA_BARANG || t.namaBarang || "";

      const key = `${normalize(brand)}|${normalize(barang)}`;

      // =====================================
      // 🔥 INIT
      // =====================================
      if (!map[key]) {
        map[key] = 0;
      }

      // =====================================
      // 🔥 IMEI
      // =====================================
      if (t.IMEI) {
        const imei = normalize(t.IMEI);

        // STOCK MASUK
        if (
          [
            "PEMBELIAN",
            "TRANSFER_MASUK",
            "REFUND",
            "REJECT",
            "RETUR",
            "VOID OPNAME",
            "READY_RESALE",
          ].includes(metode)
        ) {
          if (!imeiActive.has(imei)) {
            map[key] += 1;
            imeiActive.add(imei);
          }
        }

        // STOCK KELUAR
        if (["PENJUALAN", "TRANSFER_KELUAR", "STOK OPNAME"].includes(metode)) {
          if (imeiActive.has(imei)) {
            map[key] -= 1;
            imeiActive.delete(imei);
          }
        }

        return;
      }

      // =====================================
      // 🔥 NON IMEI
      // =====================================
      const qty = Number(t.QTY || t.qty || 0);

      // STOCK MASUK
      if (
        [
          "PEMBELIAN",
          "TRANSFER_MASUK",
          "REFUND",
          "REJECT",
          "RETUR",
          "VOID OPNAME",
        ].includes(metode)
      ) {
        map[key] += qty;
      }

      // STOCK KELUAR
      if (["PENJUALAN", "TRANSFER_KELUAR", "STOK OPNAME"].includes(metode)) {
        map[key] -= qty;
      }
    });

    // =====================================
    // 🔥 TRANSFER BARANG MANUAL
    // =====================================
    stokToko.forEach((s) => {
      if (!s) return;

      const key = `${normalize(s.namaBrand || s.brand)}|${normalize(
        s.namaBarang || s.barang
      )}`;

      if (!map[key]) {
        map[key] = 0;
      }

      // =====================================
      // 🔥 IMEI
      // =====================================
      if (s.imei) {
        const imei = normalize(s.imei);

        // SKIP SOLD
        if (stockRealtime?.soldImei?.[imei]) {
          return;
        }

        map[key] += 1;
      }

      // =====================================
      // 🔥 NON IMEI
      // =====================================
      else {
        map[key] += Number(s.qty || s.QTY || 0);
      }
    });

    // =====================================
    // 🔥 NO NEGATIVE
    // =====================================
    Object.keys(map).forEach((k) => {
      if (map[k] < 0) {
        map[k] = 0;
      }
    });

    return map;
  }, [allTransaksi, tokoLogin, stokToko, stockRealtime]);
  // 🔥 taruh DI SINI (di dalam component, sebelum return)

  const getFinalStockBarang = ({ barang, brand, kategoriBarang }) => {
    const key = `${normalize(brand)}|${normalize(barang)}`;

    // =====================
    // IMEI
    // =====================
    if (isImeiKategori(kategoriBarang)) {
      return Math.min(Number(universalStockMap[key] || 0), 1);
    }

    // =====================
    // NON IMEI
    // =====================
    return Number(finalNonImeiStock?.[key] || universalStockMap?.[key] || 0);
  };

  useEffect(() => {
    console.log("🔥 FINAL STOCK:", stockGabunganToko);
  }, [stockGabunganToko]);

  const barangByKategoriMap = useMemo(() => {
    const map = {};

    items.forEach((item, idx) => {
      // =====================================
      // 🔥 TEMP MAP ANTI DUPLIKAT
      // =====================================
      const tempMap = {};

      // =====================================
      // 🔥 GABUNGKAN:
      // 1. NON IMEI
      // 2. IMEI
      // =====================================
      const finalStockGabungan = universalStockMap || {};

      Object.entries(finalStockGabungan).forEach(([key, qty]) => {
        // =====================================
        // 🔥 STOCK HABIS
        // =====================================
        if (Number(qty || 0) <= 0) {
          return;
        }

        // =====================================
        // 🔥 SPLIT KEY
        // =====================================
        const [brand, namaBarang] = String(key).split("|");

        // =====================================
        // 🔥 VALIDASI
        // =====================================
        if (!brand || !namaBarang) {
          return;
        }

        // =====================================
        // 🔥 CARI MASTER
        // =====================================
        const barangMaster = masterBarang.find((b) => {
          const namaMaster = String(b.namaBarang || b.barang || "")
            .trim()
            .toUpperCase();

          const namaStock = String(namaBarang || "")
            .trim()
            .toUpperCase();

          return namaMaster === namaStock;
        });

        // =====================================
        // 🔥 FALLBACK MANUAL
        // AGAR BARANG HASIL:
        // REFUND / TRANSFER / REJECT
        // TETAP MUNCUL
        // =====================================
        const fallbackBarang = {
          kategoriBarang: item.kategoriBarang || "ACCESSORIES",

          namaBrand: brand,

          namaBarang: namaBarang,

          harga: {
            srp: 0,
            grosir: 0,
            reseller: 0,
          },
        };

        const barangFix = barangMaster || fallbackBarang;

        // =====================================
        // 🔥 FILTER KATEGORI
        // =====================================
        if (
          item.kategoriBarang &&
          normalize(barangFix?.kategoriBarang) !==
            normalize(item.kategoriBarang)
        ) {
          return;
        }

        // =====================================
        // 🔥 FILTER BRAND
        // =====================================
        if (item.namaBrand && normalize(brand) !== normalize(item.namaBrand)) {
          return;
        }

        // =====================================
        // 🔥 DUPLICATE KEY
        // =====================================
        const duplicateKey = `${normalize(brand)}|${normalize(namaBarang)}`;

        // =====================================
        // 🔥 SKIP DUPLIKAT
        // =====================================
        if (tempMap[duplicateKey]) {
          return;
        }

        // =====================================
        // 🔥 INSERT FINAL
        // =====================================
        tempMap[duplicateKey] = {
          kategoriBarang:
            barangFix?.kategoriBarang || item.kategoriBarang || "UNKNOWN",

          namaBrand: barangFix?.namaBrand || brand,

          namaBarang: barangFix?.namaBarang || namaBarang,

          harga: barangFix?.harga || {
            srp: 0,
            grosir: 0,
            reseller: 0,
          },

          stok: Number(
            universalStockMap?.[
              `${normalize(brand)}|${normalize(namaBarang)}`
            ] ||
              qty ||
              0
          ),
        };
      });

      // =====================================
      // 🔥 FINAL RESULT
      // =====================================
      map[idx] = Object.values(tempMap);
    });

    return map;
  }, [
    finalNonImeiStock,
    masterBarang,
    items,
    universalStockMap,
    stockGabunganToko,
    stokToko,
    allTransaksi,
  ]);

  // 🔥 DEBUG DI SINI
  useEffect(() => {
    console.log("🔥 MASTER:", masterBarang);
    console.log("🔥 STOCK:", stockGabunganToko);

    const found = Object.keys(stockGabunganToko).find((k) =>
      k.includes("BATERAI SLA 12A")
    );

    console.log("🔥 CEK SLA 12A:", found);
  }, [stockGabunganToko, masterBarang]);

  /* =========================================
🔥 MASTER BARANG DARI STOCK FINAL
========================================= */
  const masterBarangFromStock = useMemo(() => {
    const list = [];

    Object.entries(stockGabunganToko).forEach(([key, qty]) => {
      if (!qty || qty <= 0) return;

      const [brand, namaBarang] = key.split("|");

      const barang = masterBarang.find(
        (b) =>
          String(b.namaBarang).toUpperCase() ===
          String(namaBarang).toUpperCase()
      );

      if (!barang) return;

      list.push({
        ...barang,
        namaBrand: brand,
        namaBarang,
        stok: qty,
      });
    });

    return list;
  }, [stockGabunganToko, masterBarang]);

  // =====================================
  // 🔥 FINAL STOCK SESUAI DetailStockToko.jsx
  // =====================================
  const stockDetailFinal = useMemo(() => {
    const map = {};

    // =====================================
    // 🔥 LOOP TRANSAKSI
    // =====================================
    allTransaksi.forEach((t) => {
      if (!t) return;

      const status = String(t.STATUS || "").toUpperCase();

      if (!["APPROVED", "REFUND"].includes(status)) {
        return;
      }

      const toko = t.NAMA_TOKO || t.toko || "";

      // =====================================
      // 🔥 FILTER TOKO
      // =====================================
      if (normalize(toko) !== normalize(tokoLogin)) {
        return;
      }

      const metode = String(t.PAYMENT_METODE || "").toUpperCase();

      const brand = t.NAMA_BRAND || t.namaBrand || "";

      const barang = t.NAMA_BARANG || t.namaBarang || "";

      const key = `${normalize(brand)}|${normalize(barang)}`;

      // =====================================
      // 🔥 INIT
      // =====================================
      if (!map[key]) {
        map[key] = 0;
      }

      // =====================================
      // 🔥 IMEI
      // =====================================
      if (t.IMEI) {
        // STOCK MASUK
        if (
          [
            "PEMBELIAN",
            "TRANSFER_MASUK",
            "REFUND",
            "RETUR",
            "VOID OPNAME",
          ].includes(metode)
        ) {
          map[key] += 1;
        }

        // STOCK KELUAR
        if (
          ["PENJUALAN", "TRANSFER_KELUAR", "REJECT", "STOK OPNAME"].includes(
            metode
          )
        ) {
          map[key] -= 1;
        }
      }

      // =====================================
      // 🔥 NON IMEI
      // =====================================
      else {
        const qty = Number(t.QTY || 0);

        // STOCK MASUK
        if (
          [
            "PEMBELIAN",
            "TRANSFER_MASUK",
            "REFUND",
            "RETUR",
            "VOID OPNAME",
          ].includes(metode)
        ) {
          map[key] += qty;
        }

        // STOCK KELUAR
        if (
          ["PENJUALAN", "TRANSFER_KELUAR", "REJECT", "STOK OPNAME"].includes(
            metode
          )
        ) {
          map[key] -= qty;
        }
      }
    });

    // =====================================
    // 🔥 HAPUS NEGATIF
    // =====================================
    Object.keys(map).forEach((k) => {
      if (map[k] < 0) {
        map[k] = 0;
      }
    });

    return map;
  }, [allTransaksi, tokoLogin]);

  // ===============================
  // HELPER: Cari toko asal IMEI
  // ===============================
  // 🔥 PRIORITAS 1: CEK TRANSFER DULU

  /* ================= IMEI AVAILABLE ================= */
  const imeiAvailableList = useMemo(() => {
    return Object.entries(globalStockMap)
      .filter(([key, val]) => val.type === "IMEI" && val.available)
      .map(([key]) => key)
      .filter((imei) => !stockRealtime?.soldImei?.[imei]);
  }, [globalStockMap, stockRealtime]);

  // =====================================
// 🔥 FINAL IMEI AVAILABLE
// SOURCE OF TRUTH BARU
// =====================================
const imeiAvailableFinalList = useMemo(() => {
  return Object.values(finalImeiStock)
    .filter((x) => x?.available === true)
    .map((x) => x.imei)
    .filter(Boolean);
}, [finalImeiStock]);

  const findBarangUniversal = (imei) => {
    const imeiFix = String(imei || "").trim();

    // =====================================
    // 🔥 PRIORITAS 1 → TRANSFER BARANG
    // =====================================
    const tf = stokToko.find(
      (s) =>
        String(s.imei || "").trim() === imeiFix &&
        String(s.status || "AVAILABLE").toUpperCase() === "AVAILABLE"
    );

    if (tf) {
      // =====================================
      // 🔥 SUPPORT MULTI FIELD TRANSFER
      // =====================================
      const tfNamaBarang = tf.namaBarang || tf.barang || tf.NAMA_BARANG || "";

      const tfNamaBrand = tf.namaBrand || tf.brand || tf.NAMA_BRAND || "";

      // =====================================
      // 🔥 CARI MASTER BARANG
      // =====================================
      const barangTf = masterBarang.find(
        (b) =>
          String(b.namaBarang || "")
            .toUpperCase()
            .trim() ===
          String(tfNamaBarang || "")
            .toUpperCase()
            .trim()
      );

      // =====================================
      // 🔥 JIKA MASTER DITEMUKAN
      // =====================================
      if (barangTf) {
        return {
          kategoriBarang: barangTf.kategoriBarang || "HANDPHONE",

          namaBrand: barangTf.namaBrand || barangTf.brand || tfNamaBrand,

          namaBarang: barangTf.namaBarang || tfNamaBarang,

          hargaMap: barangTf.harga || {
            srp: 0,
            grosir: 0,
            reseller: 0,
          },

          fromTransfer: true,
        };
      }

      // =====================================
      // 🔥 FALLBACK MANUAL
      // =====================================
      return {
        kategoriBarang: "HANDPHONE",

        namaBrand: tfNamaBrand,

        namaBarang: tfNamaBarang,

        hargaMap: {
          srp: 0,
          grosir: 0,
          reseller: 0,
        },

        fromTransfer: true,
      };
    }

    // =====================================
    // 🔥 PRIORITAS 2 → TRANSAKSI TOKO
    // =====================================
    const trx = allTransaksi.find(
      (t) =>
        String(t.IMEI || "").trim() === imeiFix &&
        String(t.STATUS || "").toUpperCase() === "APPROVED"
    );

    // =====================================
    // 🔥 JIKA TIDAK ADA
    // =====================================
    if (!trx) return null;

    // =====================================
    // 🔥 CARI MASTER BARANG
    // =====================================
    const barang = masterBarang.find(
      (b) =>
        String(b.namaBarang || "")
          .toUpperCase()
          .trim() ===
        String(trx.NAMA_BARANG || "")
          .toUpperCase()
          .trim()
    );

    // =====================================
    // 🔥 FALLBACK JIKA MASTER TIDAK ADA
    // =====================================
    if (!barang) {
      return {
        kategoriBarang: "HANDPHONE",

        namaBrand: trx.NAMA_BRAND || trx.namaBrand || "",

        namaBarang: trx.NAMA_BARANG || trx.namaBarang || "",

        hargaMap: {
          srp: 0,
          grosir: 0,
          reseller: 0,
        },
      };
    }

    // =====================================
    // 🔥 SUCCESS
    // =====================================
    return {
      kategoriBarang: barang.kategoriBarang,

      namaBrand: barang.namaBrand || barang.brand,

      namaBarang: barang.namaBarang,

      hargaMap: barang.harga || {
        srp: 0,
        grosir: 0,
        reseller: 0,
      },
    };
  };

  useEffect(() => {
    if (!tahap1Valid) return;

    if (items.length === 0) {
      safeOnChange([
        {
          id: Date.now(),
          kategoriBarang: "",
          namaBrand: "",
          namaBarang: "",
          imei: "",
          imeiList: [],
          qty: 0,
          hargaAktif: 0,
          isImei: false,
        },
      ]);
    }
  }, [tahap1Valid]);

  /* ================= RENDER ================= */
  return (
    <div
      className={
        !tahap1Valid
          ? "opacity-50 pointer-events-none"
          : !allowManual
          ? "opacity-50 pointer-events-none"
          : ""
      }
    >
      {!tahap1Valid && (
        <div className="text-red-600 text-xs mb-3 font-semibold">
          ⚠ Lengkapi seluruh Form TAHAP 1 terlebih dahulu
        </div>
      )}

      {items.map((item, idx) => {
        const barangByKategori = barangByKategoriMap[idx] || [];
        const barangReady = (barangByKategori || [])
          .filter((b) => {
            const key = `${normalize(b.namaBrand)}|${normalize(b.namaBarang)}`;

            return (
              Number(
                universalStockMap[key] ||
                  stockGabunganToko[key] ||
                  finalNonImeiStock[key] ||
                  0
              ) > 0
            );
          })
          .filter((b) => {
            // =====================================
            // 🔥 JIKA BRAND KOSONG
            // MAKA TAMPILKAN SEMUA
            // =====================================
            if (!item.namaBrand) {
              return true;
            }

            return normalize(b.namaBrand) === normalize(item.namaBrand);
          })
          .filter(
            (b, i, arr) =>
              arr.findIndex(
                (x) =>
                  normalize(x.namaBrand) === normalize(b.namaBrand) &&
                  normalize(x.namaBarang) === normalize(b.namaBarang)
              ) === i
          );
        // 🔥 jika sedang edit → tampilkan item yang diedit
        if (editIndex !== null) {
          if (editIndex !== idx) return null;
        }
        // ===============================
        // VALIDASI FINAL UNTUK TOTAL
        // ===============================
        const isImeiComplete =
          item.isImei &&
          item.imeiList &&
          item.imeiList.length === 1 &&
          item.namaBarang &&
          Number(item.qty || 0) === 1;

        const isNonImeiComplete =
          !item.isImei &&
          item.namaBarang &&
          item.qty > 0 &&
          item.hargaAktif > 0;

        const isItemComplete = isImeiComplete || isNonImeiComplete;

        const hargaAktif = isItemComplete ? Number(item.hargaAktif || 0) : 0;

        const totalItem = isItemComplete
          ? Number(item.qty || 0) * hargaAktif
          : 0;

        return (
          <div
            key={item.id}
            className="border rounded-xl p-4 mb-4 bg-white space-y-3"
          >
            {/* KATEGORI */}
            <label className="text-xs font-semibold">KATEGORI BARANG</label>
            <select
              className="w-full border rounded-lg p-2"
              value={item.kategoriBarang}
              onChange={(e) =>
                updateItem(idx, {
                  kategoriBarang: e.target.value,
                  namaBrand: "",
                  namaBarang: "",
                  imeiList: [],
                  qty: 0,
                  isImei: isImeiKategori(e.target.value),
                })
              }
            >
              <option value="">-- Pilih Kategori --</option>
              {kategoriList.map((k) => (
                <option key={k}>{k}</option>
              ))}
            </select>

            {/* BRAND */}
            <label className="text-xs font-semibold">NAMA BRAND</label>
            <select
              className="w-full border rounded-lg p-2"
              disabled={!item.kategoriBarang}
              value={item.namaBrand || ""}
              onChange={(e) =>
                updateItem(idx, {
                  namaBrand: e.target.value,
                  namaBarang: "",
                  imeiList: [],
                  qty: 0,
                })
              }
            >
              <option value="">-- Pilih Brand --</option>
              {brandList(item.kategoriBarang).map((b) => (
                <option key={b}>{b}</option>
              ))}
            </select>

            {/* BARANG */}
            <div className="space-y-1">
              <label className="text-xs font-semibold">NAMA BARANG</label>
              <input
                list={`barang-${idx}`}
                className="w-full border rounded-lg p-2"
                disabled={!item.namaBrand}
                placeholder="Pilih / ketik nama barang"
                value={item.namaBarang || ""}
                onChange={(e) => {
                  const val = e.target.value;

                  const barangValid = barangReady.find(
                    (b) =>
                      String(b.namaBarang).toUpperCase() ===
                      String(val).toUpperCase()
                  );

                  if (!barangValid) {
                    updateItem(idx, {
                      namaBarang: val,
                    });
                    return;
                  }

                  const key = `${normalize(barangValid.namaBrand)}|${normalize(
                    barangValid.namaBarang
                  )}`;

                  const imeiBarang = imeiByBarang.filter((im) => {
                    const barang = findBarangUniversal(im);

                    return (
                      barang &&
                      normalize(barang.namaBarang) ===
                        normalize(barangValid.namaBarang)
                    );
                  });

                  const stokTersedia = getFinalStockBarang({
                    barang: barangValid.namaBarang,
                    brand: barangValid.namaBrand,
                    kategoriBarang: barangValid.kategoriBarang,
                  });

                  const isImeiBarang = isImeiKategori(
                    barangValid.kategoriBarang
                  );

                  updateItem(idx, {
                    namaBarang: barangValid.namaBarang,
                    kategoriBarang: barangValid.kategoriBarang,
                    isImei: isImeiBarang,

                    // 🔥 RESET IMEI
                    imei: "",
                    imeiList: [],

                    hargaMap: barangValid.harga || {},
                    skemaHarga: "srp",
                    hargaAktif: Number(barangValid.harga?.srp || 0),

                    qty: isImeiBarang ? 1 : stokTersedia > 0 ? 1 : 0,
                  });
                }}
                onBlur={() => {
                  const barangValid = barangReady.find(
                    (b) =>
                      String(b.namaBarang).toUpperCase() ===
                      String(item.namaBarang).toUpperCase()
                  );

                  if (!barangValid) {
                    // ❗ jangan langsung error
                    return;
                  }

                  const key = `${normalize(barangValid.namaBrand)}|${normalize(
                    barangValid.namaBarang
                  )}`;

                  const stokTersedia = isImeiKategori(
                    barangValid.kategoriBarang
                  )
                    ? Number(universalStockMap[key] || 0)
                    : Number(
                        finalNonImeiStock[key] || universalStockMap[key] || 0
                      );

                  if (
                    !isImeiKategori(barangValid.kategoriBarang) &&
                    stokTersedia <= 0
                  ) {
                    alert("❌ Stok barang kosong");
                    updateItem(idx, {
                      namaBarang: "",
                      qty: 0,
                    });
                  }
                }}
              />

              {/* 🔥 TAMPILKAN INFO STOK REALTIME */}
              {item.namaBarang && (
                <div className="text-xs font-semibold">
                  {item.isImei ? (
                    <span className="text-blue-600">
                      📱 Stok IMEI Toko: Stok tersedia:{" "}
                      {Math.min(
                        1,
                        Number(
                          universalStockMap[
                            `${normalize(item.namaBrand)}|${normalize(
                              item.namaBarang
                            )}`
                          ] || 0
                        )
                      )}
                    </span>
                  ) : (
                    <span className="text-green-600">
                      📦 Stok Barang Toko:{" "}
                      {Number(
                        finalNonImeiStock?.[
                          `${normalize(item.namaBrand)}|${normalize(
                            item.namaBarang
                          )}`
                        ] ||
                          universalStockMap?.[
                            `${normalize(item.namaBrand)}|${normalize(
                              item.namaBarang
                            )}`
                          ] ||
                          0
                      )}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* 🔥 DATA LIST SESUAI KATEGORI (ACCESSORIES) */}
            <datalist id={`barang-${idx}`}>
              {[
                ...new Map(
                  barangReady
                    .filter((b) => {
                      const key =
                        `${normalize(b.namaBrand || b.brand)}|` +
                        `${normalize(b.namaBarang)}`;

                      return Number(universalStockMap[key] || 0) > 0;
                    })
                    .map((b) => [
                      `${normalize(b.namaBrand)}|${normalize(b.namaBarang)}`,
                      b,
                    ])
                ).values(),
              ].map((b) => {
                const key =
                  `${normalize(b.namaBrand || b.brand)}|` +
                  `${normalize(b.namaBarang)}`;

                // =====================================
                // 🔥 FINAL STOCK UNIVERSAL
                // =====================================
                const [brand, barang] = key.split("|");

                const barangMaster = masterBarang.find(
                  (b) => normalize(b.namaBarang) === normalize(barang)
                );

                console.log(
                  "STOK DROPDOWN",
                  barang,
                  finalNonImeiStock?.[key],
                  universalStockMap?.[key]
                );

                const stokFinal = getFinalStockBarang({
                  barang,
                  brand,
                  kategoriBarang: barangMaster?.kategoriBarang,
                });

                return (
                  <option
                    key={key}
                    value={b.namaBarang}
                    label={`${b.namaBarang} | STOCK : ${stokFinal}`}
                  />
                );
              })}
            </datalist>

            {/* SKEMA */}
            <label className="text-xs font-semibold">KATEGORI HARGA</label>
            <select
              className="w-full border rounded p-2"
              value={item.skemaHarga}
              onChange={(e) => {
                const skema = e.target.value;
                updateItem(idx, {
                  skemaHarga: skema,
                  hargaAktif:
                    skema === "reseller"
                      ? item.hargaAktif
                      : item.hargaMap?.[skema] || 0,
                });
              }}
            >
              <option value="srp">Harga SRP</option>
              <option value="grosir">Harga Grosir</option>
              <option value="reseller">Harga Reseller</option>
            </select>

            {item.skemaHarga === "reseller" && (
              <input
                type="number"
                className="w-full border rounded p-2"
                placeholder="Input harga reseller"
                value={item.hargaAktif}
                onChange={(e) =>
                  updateItem(idx, {
                    hargaAktif: Number(e.target.value || 0),
                  })
                }
              />
            )}

            {/* QTY — KHUSUS NON IMEI */}

            {!item.isImei && (
              <div>
                <label className="text-xs font-semibold">QTY</label>
                <input
                  type="number"
                  min={1}
                  className="w-full border rounded-lg p-2"
                  value={item.qty || 1}
                  onChange={(e) => {
                    const qtyInput = Number(e.target.value || 1);

                    const key =
                      `${normalize(item.namaBrand)}|` +
                      `${normalize(item.namaBarang)}`;

                    // =====================================
                    // 🔥 FINAL STOCK TOKO
                    // SINGLE SOURCE OF TRUTH
                    // =====================================
                    const stokTersedia = isImeiKategori(item.kategoriBarang)
                      ? Number(universalStockMap?.[key] || 0)
                      : Number(
                          finalNonImeiStock?.[key] ||
                            universalStockMap?.[key] ||
                            0
                        );

                    // =====================================
                    // 🔥 MINIMAL QTY
                    // =====================================
                    if (qtyInput <= 0) {
                      updateItem(idx, {
                        qty: 1,
                      });

                      return;
                    }

                    // =====================================
                    // 🔥 BLOCK MELEBIHI STOK
                    // =====================================
                    if (qtyInput > stokTersedia) {
                      alert(
                        `❌ Qty melebihi stok toko\n\nStok tersedia: ${stokTersedia}`
                      );

                      updateItem(idx, {
                        qty: stokTersedia,
                      });

                      return;
                    }

                    // =====================================
                    // 🔥 SUCCESS
                    // =====================================
                    updateItem(idx, {
                      qty: qtyInput,
                    });
                  }}
                />

                {!item.isImei && item.namaBarang && (
                  <div className="text-xs text-gray-500">
                    Stok tersedia:{" "}
                    {finalNonImeiStock[
                      `${normalize(item.namaBrand)}|${normalize(
                        item.namaBarang
                      )}`
                    ] || 0}
                  </div>
                )}
              </div>
            )}

            {/* IMEI — HANYA MUNCUL JIKA BARANG IMEI */}
            {item.isImei && (
              <>
                <label className="text-xs font-semibold">NO IMEI</label>
                <input
                  list={`imei-${idx}`}
                  className="border rounded px-2 py-1 w-full"
                  placeholder="Cari / ketik IMEI"
                  value={item.imei || ""}
                  onChange={async (e) => {
                    const val = e.target.value;

                    if (!val && item.imeiList?.length) {
                      for (const im of item.imeiList) {
                        await unlockImeiRealtime(
                          im,
                          userLogin.uid || userLogin.username
                        );
                      }
                    }

                    setImeiKeyword(val);
                    updateItem(idx, {
                      imei: val,
                      imeiList: [],
                      qty: 0,
                    });
                  }}
                  onBlur={async () => {
                    const imei = (item.imei || "").trim();
                    const finalImei =
                    finalImeiStock?.[imei];
                  
                  if (!finalImei) {
                    alert(
                      `❌ IMEI ${imei} tidak ditemukan`
                    );
                  
                    updateItem(idx,{
                      imei:"",
                      imeiList:[],
                      qty:0,
                    });
                  
                    return;
                  }
                  
                  if (
                    finalImei.available !== true
                  ) {
                    alert(
                      `❌ IMEI ${imei} SUDAH TERJUAL`
                    );
                  
                    updateItem(idx,{
                      imei:"",
                      imeiList:[],
                      qty:0,
                    });
                  
                    return;
                  }

                  console.log(
                    "IMEI DEBUG",
                    "352246838561390",
                    finalImeiStock["352246838561390"]
                  );
                    if (!imei) return;

                    /* ===============================
                       1. CEK IMEI DOUBLE DI FORM
                    =============================== */
                    const imeiDipakai = value
                      .filter((_, i) => i !== idx)
                      .flatMap((it) => it.imeiList || [])
                      .map((x) => String(x).trim());

                    if (imeiDipakai.includes(imei)) {
                      alert("❌ IMEI sudah dipakai di item lain!");
                      updateItem(idx, {
                        imei: "",
                        imeiList: [],
                        qty: 0,
                      });
                      return;
                    }

                    /* ===============================
   🔥 VALIDASI FINAL STOCK SOURCE
   SUPPORT:
   1. PEMBELIAN
   2. TRANSFER BARANG
=============================== */

                    // =====================================
                    // 🔥 CEK GLOBAL STOCK LAMA
                    // =====================================
                    const existsInGlobal =
                      globalStockMap[imei] && globalStockMap[imei].available;

                    // =====================================
                    // 🔥 CEK STOK TRANSFER BARANG
                    // =====================================
                    const existsInTransfer = stokToko.some(
                      (s) =>
                        String(s.imei || "").trim() === imei &&
                        String(s.status || "AVAILABLE").toUpperCase() ===
                          "AVAILABLE"
                    );

                    // =====================================
                    // 🔥 FINAL VALIDASI
                    // =====================================
                    const soldLocked = stockRealtime?.soldImei?.[imei];

                    const detailStock = stockRealtime?.detailStock?.[imei];

                    const refundReady =
                      detailStock?.READY_RESALE === true ||
                      detailStock?.statusRefund === "READY_RESALE" ||
                      detailStock?.IS_REFUND === true;

                    if (
                      (!existsInGlobal && !existsInTransfer && !refundReady) ||
                      (soldLocked && !refundReady)
                    ) {
                      alert("❌ IMEI tidak tersedia di toko ini");

                      updateItem(idx, {
                        imei: "",
                        imeiList: [],
                        qty: 0,
                      });

                      return;
                    }

                

                    /* ===============================
                       4. VALIDASI TOKO OWNER
                       PRIORITAS:
                       1. TRANSFER
                       2. PEMBELIAN (LOGIC LAMA)
                    =============================== */

                    // 🔥 CEK TRANSFER DULU
                    const tokoTransfer = findTokoByTransfer(imei);

                    if (tokoTransfer) {
                      if (
                        String(tokoTransfer).toUpperCase() !==
                        String(tokoLogin).toUpperCase()
                      ) {
                        alert(`❌ IMEI milik toko ${tokoTransfer}`);
                        updateItem(idx, {
                          imei: "",
                          imeiList: [],
                          qty: 0,
                        });
                        return;
                      }
                    } else {
                      // 🔥 FALLBACK KE LOGIC LAMA
                      const tokoImei = findTokoByImei(imei, allTransaksi);

                      if (
                        tokoImei &&
                        String(tokoImei).toUpperCase() !==
                          String(tokoLogin).toUpperCase()
                      ) {
                        alert(`❌ IMEI milik toko ${tokoImei}`);
                        updateItem(idx, {
                          imei: "",
                          imeiList: [],
                          qty: 0,
                        });
                        return;
                      }
                    }

                    console.log("🔥 STOK TOKO:", stokToko);
                    console.log("🔥 IMEI:", imei);

                    /* ===============================
                       5. AUTO DETECT BARANG
                       PRIORITAS:
                       1. PEMBELIAN (LOGIC LAMA)
                       2. TRANSFER
                    =============================== */
                    let autoBarang = findBarangByImei(imei);

                    // fallback transfer
                    if (!autoBarang) {
                      autoBarang = findBarangByTransfer(imei);
                    }

                    // 🔥 SUPER FIX
                    if (!autoBarang) {
                      autoBarang = findBarangUniversal(imei);
                    }

                    if (!autoBarang) {
                      alert("❌ Data barang IMEI tidak ditemukan");
                      return;
                    }

                    /* ===============================
                       6. UPDATE ITEM
                    =============================== */
                    updateItem(idx, {
                      imei,
                      imeiList: [imei],
                      qty: 1,
                      kategoriBarang: autoBarang.kategoriBarang,
                      namaBrand: autoBarang.namaBrand,
                      namaBarang: autoBarang.namaBarang,
                      hargaMap: autoBarang.hargaMap,
                      skemaHarga: "srp",
                      hargaAktif: Number(autoBarang.hargaMap?.srp || 0),
                      isImei: true,
                    });
                  }}
                />

                {item.imei && (
                  <div className="text-xs mt-1 space-y-1">
                    <div className="text-blue-600">
                      🔍 Status IMEI:{" "}
                      {globalStockMap[item.imei]?.available
                        ? "READY"
                        : "TIDAK TERSEDIA"}
                    </div>

                    {globalStockMap[item.imei] && (
                      <div className="text-gray-500">
                        Source:{" "}
                        {globalStockMap[item.imei]?.type === "IMEI"
                          ? "STOK GLOBAL"
                          : "UNKNOWN"}
                      </div>
                    )}
                  </div>
                )}

                <datalist id={`imei-${idx}`}>
                  {imeiByBarang
                    .filter((im) =>
                      im.toLowerCase().includes(imeiKeyword.toLowerCase())
                    )
                    .map((im) => (
                      <option key={im} value={im} />
                    ))}
                </datalist>
              </>
            )}

            {!item.isImei && (
              <div className="text-xs text-gray-500">
                ℹ️ Harga Accessories Bundling
              </div>
            )}

            {editIndex === idx && (
              <button
                className="btn btn-success w-full mt-4"
                onClick={() => {
                  setEditIndex(null); // tutup form
                  setShowTable(true); // pastikan table tetap tampil
                }}
              >
                ✅ Simpan Perubahan
              </button>
            )}

            <div className="text-right font-bold text-green-700">
              {isItemComplete ? (
                <>TOTAL PENJUALAN: Rp {totalItem.toLocaleString("id-ID")}</>
              ) : (
                <span className="text-gray-400 text-xs">
                  Lengkapi IMEI & harga terlebih dahulu
                </span>
              )}
            </div>
          </div>
        );
      })}

      {showTable && items.length > 0 && (
        <div className="mt-6 border rounded-xl">
          <div className="overflow-x-auto">
            <table className="min-w-[900px] w-full text-sm border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 p-2 text-center">No</th>
                  <th className="border border-gray-300 p-2 text-left">
                    Kategori
                  </th>
                  <th className="border border-gray-300 p-2 text-left">
                    Brand
                  </th>
                  <th className="border border-gray-300 p-2 text-left">
                    Barang
                  </th>
                  <th className="border border-gray-300 p-2 text-center">
                    Qty
                  </th>
                  <th className="border border-gray-300 p-2 text-right">
                    Harga
                  </th>
                  <th className="border border-gray-300 p-2 text-right">
                    Total
                  </th>
                  <th className="border border-gray-300 p-2 text-center">
                    AKSI
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => {
                  const total =
                    Number(it.qty || 0) * Number(it.hargaAktif || 0);

                  return (
                    <tr key={it.id}>
                      <td className="border border-gray-300 p-2 text-center font-semibold">
                        {i + 1}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {it.kategoriBarang}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {it.namaBrand}
                      </td>
                      <td className="border border-gray-300 p-2">
                        {it.namaBarang}
                        {it.isImei && (
                          <div className="text-xs text-gray-500">
                            IMEI: {it.imeiList?.[0]}
                          </div>
                        )}
                      </td>
                      <td className="border border-gray-300 p-2 text-center">
                        {it.qty}
                      </td>
                      <td className="border border-gray-300 p-2 text-right">
                        Rp {Number(it.hargaAktif || 0).toLocaleString("id-ID")}
                      </td>
                      <td className="border border-gray-300 p-2 text-right font-semibold text-green-700">
                        Rp {total.toLocaleString("id-ID")}
                      </td>
                      <td className="border border-gray-300 p-2 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            className="btn btn-xs btn-warning"
                            onClick={() => handleEdit(i)}
                          >
                            EDIT
                          </button>
                          <button
                            className="btn btn-xs btn-error"
                            onClick={() => handleDelete(i)}
                          >
                            DELETE
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {/* 🔥 GRAND TOTAL */}
          <div className="flex justify-end p-4 bg-gray-50 border-t">
            <div className="text-right">
              <div className="text-sm text-gray-600">GRAND TOTAL</div>
              <div className="text-2xl font-bold text-green-700">
                Rp {grandTotal.toLocaleString("id-ID")}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          className="btn btn-outline flex-1"
          disabled={!allowManual || !tahap1Valid}
          onClick={handleShowTable}
        >
          ➕ Tambah Barang
        </button>

        <button
          className="btn btn-outline btn-error flex-1"
          disabled={!allowManual || !tahap1Valid || items.length === 0}
          onClick={() => {
            const last = items[items.length - 1];
            last?.imeiList?.forEach((im) =>
              unlockImeiRealtime(im, userLogin.uid || userLogin.username)
            );
            safeOnChange(items.slice(0, -1));
          }}
        >
          ❌ Cancel
        </button>
      </div>
    </div>
  );
}
