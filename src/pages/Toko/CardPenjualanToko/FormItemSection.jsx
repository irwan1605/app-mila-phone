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

/* ================= KONSTANTA ================= */
const KATEGORI_IMEI = ["MOTOR LISTRIK", "SEPEDA LISTRIK", "HANDPHONE"];
const isImeiKategori = (kat) =>
  KATEGORI_IMEI.includes((kat || "").toUpperCase());

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
  const [stokTokoAktif, setStokTokoAktif] = useState([]);
  const [detailStokLookup, setDetailStokLookup] = useState({});

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

  const semuaImeiDipakai = useMemo(() => {
    return new Set(
      items.flatMap((i) => i.imeiList || []).map((x) => String(x).trim())
    );
  }, [items]);

  // ===============================
  // HELPER: Cari toko asal IMEI
  // ===============================
  // 🔥 PRIORITAS 1: CEK TRANSFER DULU

  /* ================= IMEI AVAILABLE ================= */
  const imeiAvailableList = useMemo(() => {
    if (!tokoLogin) return [];

    return allTransaksi
      .filter((t) => {
        if (!t.IMEI) return false;
        if (String(t.STATUS).toUpperCase() !== "APPROVED") return false;

        const metode = String(t.PAYMENT_METODE || "").toUpperCase();

        if (!["PEMBELIAN", "TRANSFER_MASUK"].includes(metode)) return false;

        if (
          String(t.NAMA_TOKO || "").toUpperCase() !==
          String(tokoLogin || "").toUpperCase()
        )
          return false;

        if (stockRealtime?.soldImei?.[t.IMEI]) return false;

        if (semuaImeiDipakai.has(String(t.IMEI).trim())) return false;

        return true;
      })
      .map((t) => String(t.IMEI).trim());
  }, [allTransaksi, tokoLogin, stockRealtime, semuaImeiDipakai]);

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

  const kategoriList = useMemo(
    () => masterKategori.map((k) => k.namaKategori),
    [masterKategori]
  );

  const brandList = (kategori) =>
    [
      ...new Set(
        masterBarang
          .filter((b) => b.kategoriBarang === kategori)
          .map((b) => b.namaBrand || b.brand)
      ),
    ].filter(Boolean);

  const barangList = (kategori, brand) =>
    masterBarang.filter((b) => {
      const cocokKategori =
        b.kategoriBarang === kategori && (b.namaBrand || b.brand) === brand;

      if (!cocokKategori) return false;

      // 🔥 NON IMEI harus punya stok di toko ini
      if (!isImeiKategori(kategori)) {
        return stokNonImeiToko[b.namaBarang] > 0;
      }

      return true;
    });

  /* ================= IMEI BY BARANG ================= */
  // const imeiByBarang = useMemo(() => {
  //   if (!tokoLogin) return [];

  //   return (
  //     allTransaksi
  //       .filter(
  //         (t) =>
  //           String(t.NAMA_TOKO || "").toUpperCase() ===
  //             String(tokoLogin || "").toUpperCase() &&
  //           String(t.STATUS || "").toUpperCase() === "APPROVED" &&
  //           String(t.PAYMENT_METODE || "").toUpperCase() === "PEMBELIAN" &&
  //           t.IMEI &&
  //           String(t.NAMA_BARANG || "").toUpperCase() ===
  //             String(items[0]?.namaBarang || "").toUpperCase()
  //       )
  //       .map((t) => String(t.IMEI).trim())
  //       // 🔥 HILANGKAN IMEI YANG SUDAH TERJUAL
  //       .filter((imei) => !stockRealtime?.soldImei?.[imei])
  //   );
  // }, [allTransaksi, tokoLogin, items, stockRealtime]);

  const handleTambahBarang = () => {
    const last = items[items.length - 1];

    if (!last?.namaBarang) {
      alert("⚠ Pilih barang dulu");
      return;
    }

    if (last.isImei) {
      if (!last.imeiList?.length) {
        alert("⚠ IMEI wajib diisi");
        return;
      }

      const imei = last.imeiList[0];

      if (!imeiAvailableList.includes(imei)) {
        alert("❌ IMEI tidak tersedia / milik toko lain");
        return;
      }
    }

    if (!last.isImei) {
      const key = `${last.namaBrand}|${last.namaBarang}`;
      const stok = nonImeiStockMap[key] || 0;

      if (!last.qty || last.qty > stok) {
        alert("❌ Qty melebihi stok toko ini");
        return;
      }
    }

    safeOnChange([
      ...items,
      {
        ...last,
        id: Date.now(),
      },
    ]);
  };

  const findBarangByImei = (imei) => {
    // cari dari transaksi pembelian
    const trx = allTransaksi.find(
      (t) =>
        String(t.IMEI || "").trim() === imei &&
        String(t.NAMA_TOKO || "").toUpperCase() ===
          String(tokoLogin || "").toUpperCase()
    );

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
    const row = stokToko.find(
      (s) => String(s.imei).trim() === String(imei).trim()
    );

    if (!row) return null;

    const barang = masterBarang.find(
      (b) =>
        String(b.namaBarang || "").toUpperCase() ===
        String(row.namaBarang || "").toUpperCase()
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

  /* ===============================
   🔥 NON IMEI STOCK FROM OPNAME ENGINE
   (SAMA PERSIS SEPERTI DETAIL STOCK TOKO)
================================= */
  const nonImeiStockMap = useMemo(() => {
    const map = {};

    allTransaksi.forEach((t) => {
      if (!t) return;
      if (String(t.STATUS).toUpperCase() !== "APPROVED") return;

      if (String(t.NAMA_TOKO).toUpperCase() !== String(tokoLogin).toUpperCase())
        return;

      if (t.IMEI) return; // ❌ hanya NON IMEI

      const key = `${t.NAMA_BRAND}|${t.NAMA_BARANG}`;
      const metode = String(t.PAYMENT_METODE || "")
        .toUpperCase()
        .replace(/\s+/g, "_");

      if (!metode.includes("PEMBELIAN") && !metode.includes("TRANSFER"))
        return false;

      const qty = Number(t.QTY || 0);

      if (!map[key]) map[key] = 0;

      if (["PEMBELIAN", "TRANSFER_MASUK", "REFUND"].includes(metode)) {
        map[key] += qty;
      }

      if (["PENJUALAN", "TRANSFER_KELUAR"].includes(metode)) {
        map[key] -= qty;
      }
    });

    // tampilkan hanya stok > 0
    return Object.fromEntries(Object.entries(map).filter(([_, v]) => v > 0));
  }, [allTransaksi, tokoLogin]);

  /* ================= NON IMEI STOCK FILTER ================= */
  const nonImeiStockList = useMemo(() => {
    return Object.keys(nonImeiStockMap);
  }, [nonImeiStockMap]);

  const getImeiByBarang = (namaBarang) => {
    if (!tokoLogin || !namaBarang) return [];

    return allTransaksi
      .filter((t) => {
        if (!t.IMEI) return false;
        if (String(t.STATUS).toUpperCase() !== "APPROVED") return false;

        if (
          String(t.NAMA_TOKO || "").toUpperCase() !==
          String(tokoLogin || "").toUpperCase()
        )
          return false;

        const metode = String(t.PAYMENT_METODE || "")
          .toUpperCase()
          .replace(/\s+/g, "_");

        if (!metode.includes("PEMBELIAN") && !metode.includes("TRANSFER"))
          return false;

        if (!["PEMBELIAN", "TRANSFER_MASUK"].includes(metode)) return false;

        if (
          String(t.NAMA_BARANG || "").toUpperCase() !==
          String(namaBarang || "").toUpperCase()
        )
          return false;

        if (stockRealtime?.soldImei?.[t.IMEI]) return false;

        if (semuaImeiDipakai.has(String(t.IMEI).trim())) return false;

        return true;
      })
      .map((t) => String(t.IMEI).trim());
  };

  const normalize = (str) =>
    String(str || "")
      .toUpperCase()
      .replace(/\s+/g, " ")
      .trim();
  
  const punyaImeiTersedia = (namaBarang) => {
    if (!namaBarang || !tokoLogin) return false;
  
    return allTransaksi.some((t) => {
      if (!t.IMEI) return false;
  
      if (String(t.STATUS).toUpperCase() !== "APPROVED")
        return false;
  
      const metode = String(t.PAYMENT_METODE || "")
        .toUpperCase()
        .replace(/\s+/g, "_");
  
      // 🔥 FLEXIBLE CHECK
      if (
        !metode.includes("PEMBELIAN") &&
        !metode.includes("TRANSFER")
      )
        return false;
  
      if (
        normalize(t.NAMA_TOKO) !== normalize(tokoLogin)
      )
        return false;
  
      if (
        normalize(t.NAMA_BARANG) !== normalize(namaBarang)
      )
        return false;
  
      if (stockRealtime?.soldImei?.[t.IMEI]) return false;
  
      if (semuaImeiDipakai.has(String(t.IMEI).trim()))
        return false;
  
      return true;
    });
  };

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
        const isImeiValid =
          !item.isImei ||
          (item.imeiList &&
            item.imeiList.length === 1 &&
            imeiAvailableList.includes(item.imeiList[0]) === false);

        const hargaAktif = isImeiValid ? Number(item.hargaAktif || 0) : 0;

        const barangByKategori = masterBarang.filter((b) => {
          if (
            String(b.kategoriBarang).toUpperCase() !==
            String(item.kategoriBarang).toUpperCase()
          )
            return false;
          console.log(
            "CHECK IMEI BARANG:",
            b.namaBarang,
            punyaImeiTersedia(b.namaBarang)
          );

          // 🔥 IMEI CATEGORY
          if (isImeiKategori(b.kategoriBarang)) {
            return punyaImeiTersedia(b.namaBarang);
          }

          // 🔥 NON IMEI CATEGORY (engine lama tetap)
          const key = `${b.namaBrand || b.brand}|${b.namaBarang}`;
          return nonImeiStockMap[key] > 0;
        });

        return (
          <div
            key={item.id}
            className="border rounded-xl p-4 mb-4 bg-white space-y-3"
          >
            {/* KATEGORI */}
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
            <input
              list={`barang-${idx}`}
              className="w-full border rounded-lg p-2"
              disabled={!item.namaBrand}
              placeholder="Pilih / ketik nama barang"
              value={item.namaBarang || ""}
              onChange={(e) => {
                const val = e.target.value;

                // 🔥 ambil dari master sesuai kategori (ACCESSORIES, dll)
                const b = barangByKategori.find((x) => x.namaBarang === val);

                if (!b) return;

                safeOnChange(
                  items.map((it, i) =>
                    i === idx
                      ? {
                          ...it,
                          namaBarang: b.namaBarang,
                          kategoriBarang: b.kategoriBarang,
                          isImei: isImeiKategori(b.kategoriBarang),
                          hargaMap: b.harga || {},
                          skemaHarga: "srp",
                          hargaAktif: Number(b.harga?.srp || 0),
                          qty: isImeiKategori(b.kategoriBarang) ? 0 : 1,
                        }
                      : it
                  )
                );
              }}
            />

            {/* 🔥 DATA LIST SESUAI KATEGORI (ACCESSORIES) */}
            <datalist id={`barang-${idx}`}>
  {barangByKategori
    .filter(
      (b) =>
        (b.namaBrand || b.brand) === item.namaBrand
    )
    .map((b) => (
      <option key={b.namaBarang} value={b.namaBarang} />
    ))}
</datalist>

            {/* SKEMA */}
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
                    const key = `${item.namaBrand}|${item.namaBarang}`;

                    const stok = nonImeiStockMap[key] || 0;

                    if (qtyInput > stok) {
                      alert(`❌ Qty melebihi stok tersedia (${stok})`);
                      return;
                    }

                    updateItem(idx, { qty: qtyInput });
                  }}
                />

                {!item.isImei && item.namaBarang && (
                  <div className="text-xs text-gray-500">
                    Stok tersedia:{" "}
                    {nonImeiStockMap[`${item.namaBrand}|${item.namaBarang}`] ||
                      0}
                  </div>
                )}
              </div>
            )}

            {/* IMEI — HANYA MUNCUL JIKA BARANG IMEI */}
            {item.isImei && (
              <>
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
                       2. CEK IMEI DARI TRANSFER
                       (TAMBAHAN - TIDAK MERUBAH LOGIC LAMA)
                    =============================== */
                    const imeiFromTransfer = stokToko.some(
                      (s) => String(s.imei).trim() === imei
                    );

                    /* ===============================
                       3. VALIDASI AVAILABLE
                       (LOGIC LAMA + TRANSFER)
                    =============================== */
                    if (
                      (!imeiAvailableList.includes(imei) &&
                        !imeiFromTransfer) ||
                      stockRealtime?.soldImei?.[imei]
                    ) {
                      alert("❌ IMEI sudah terjual / tidak tersedia");
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

                <datalist id={`imei-${idx}`}>
                  {getImeiByBarang(item.namaBarang)
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

            <div className="text-right font-bold text-green-700">
              TOTAL PENJUALAN: Rp{" "}
              {(item.qty * hargaAktif).toLocaleString("id-ID")}
            </div>
          </div>
        );
      })}

      <div className="flex gap-2">
        <button
          className="btn btn-outline flex-1"
          disabled={!allowManual || !tahap1Valid}
          onClick={handleTambahBarang}
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
