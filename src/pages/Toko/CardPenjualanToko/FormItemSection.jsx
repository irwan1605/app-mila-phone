// ===================================================
// FormItemSection.jsx — FINAL FIX 100% (STABIL)
// Tahap 2 | INPUT BARANG | IMEI + NON IMEI + BUNDLING
// ===================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  listenMasterBarang,
  listenMasterKategoriBarang,
  unlockImeiRealtime,
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
  const location = useLocation();

  const TOKO_AKTIF = "CILANGKAP PUSAT";

  useEffect(() => {
    if (!location?.state?.fastSale) return;
  
    const d = location.state.imeiData;
    if (!d) return;
  
    // Safety check toko
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
        bundling: d.bundling || [],
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
  
  
  

  /* ================= IMEI AVAILABLE ================= */
  const imeiAvailableList = useMemo(() => {
    if (!tokoLogin) return [];

    const imeiFromPembelian = allTransaksi
      .filter(
        (t) =>
          String(t.NAMA_TOKO || "").toUpperCase() ===
            String(tokoLogin || "").toUpperCase() &&
          String(t.STATUS || "").toUpperCase() === "APPROVED" &&
          (t.PAYMENT_METODE === "PEMBELIAN" ||
            t.tipe === "PEMBELIAN" ||
            t.jenis === "PEMBELIAN") &&
          t.IMEI
      )
      .map((t) => String(t.IMEI).trim());

    const imeiDipakai = new Set(items.flatMap((i) => i.imeiList || []));

    return imeiFromPembelian.filter(
      (imei) => !imeiDipakai.has(imei) && !stockRealtime?.soldImei?.[imei]
    );
  }, [allTransaksi, tokoLogin, items, stockRealtime]);

  /* ================= HELPERS ================= */
  const updateItem = (idx, patch) => {
    const next = [...items];
    next[idx] = { ...next[idx], ...patch };
    safeOnChange(next);
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
    masterBarang.filter(
      (b) => b.kategoriBarang === kategori && (b.namaBrand || b.brand) === brand
    );
    
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
            <select
              className="w-full border rounded-lg p-2"
              disabled={!item.namaBrand}
              value={item.namaBarang || ""}
              onChange={(e) => {
                const b = barangList(item.kategoriBarang, item.namaBrand).find(
                  (x) => x.namaBarang === e.target.value
                );
                if (!b) return;

                updateItem(idx, {
                  namaBarang: b.namaBarang,
                  kategoriBarang: b.kategoriBarang,
                  isImei: isImeiKategori(b.kategoriBarang),
                  hargaMap: b.harga || {},
                  skemaHarga: "srp",
                  hargaAktif: Number(b.harga?.srp || 0),
                  qty: isImeiKategori(b.kategoriBarang) ? 0 : 1,
                });
              }}
            >
              <option value="">-- Pilih Barang --</option>
              {barangList(item.kategoriBarang, item.namaBrand).map((b) => (
                <option key={b.id}>{b.namaBarang}</option>
              ))}
            </select>

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

            {/* IMEI */}
            <input
              list={`imei-${idx}`}
              className="border rounded px-2 py-1 w-full"
              placeholder="Cari / ketik IMEI"
              value={item.imei || ""}
              onChange={(e) => {
                setImeiKeyword(e.target.value);
                updateItem(idx, {
                  imei: e.target.value,
                  imeiList: [],
                  qty: 0,
                });
              }}
              onBlur={() => {
                const imei = (item.imei || "").trim();
                if (!imei) return;
                if (imei.length < 14) return;

                if (!imeiAvailableList.includes(imei)) {
                  alert("❌ IMEI tidak tersedia / sudah dipakai");
                  updateItem(idx, {
                    imei: "",
                    imeiList: [],
                    qty: 0,
                  });
                  return;
                }

                item.imeiList?.forEach((old) => {
                  if (old !== imei) unlockImeiRealtime(old, tokoLogin);
                });

                lockImeiRealtime(imei, tokoLogin);

                updateItem(idx, {
                  imei,
                  imeiList: [imei],
                  qty: 1,
                });
              }}
            />

            <datalist id={`imei-${idx}`}>
              {imeiAvailableList
                .filter((im) =>
                  im.toLowerCase().includes(imeiKeyword.toLowerCase())
                )
                .map((im) => (
                  <option key={im} value={im} />
                ))}
            </datalist>

            {!item.isImei && (
              <input
                type="number"
                min={1}
                value={item.qty || 1}
                onChange={(e) =>
                  updateItem(idx, {
                    qty: Number(e.target.value || 1),
                  })
                }
                className="w-full border rounded-lg px-2 py-1 text-sm"
              />
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
            last?.imeiList?.forEach((im) => unlockImeiRealtime(im, tokoLogin));
            safeOnChange(items.slice(0, -1));
          }}
        >
          ❌ Cancel
        </button>
      </div>
    </div>
  );
}
