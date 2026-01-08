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
}) {
  const items = useMemo(() => (Array.isArray(value) ? value : []), [value]);
  const safeOnChange = typeof onChange === "function" ? onChange : () => {};

  const [masterBarang, setMasterBarang] = useState([]);
  const [masterKategori, setMasterKategori] = useState([]);
  const [allTransaksi, setAllTransaksi] = useState([]);

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
    return () => {
      items.forEach((it) => {
        it.imeiList?.forEach((im) => unlockImeiRealtime(im, tokoLogin));
      });
    };
    // eslint-disable-next-line
  }, []);

  /* ================= IMEI AVAILABLE ================= */
  const imeiAvailableList = useMemo(() => {
    if (!tokoLogin) return [];

    // semua IMEI dari transaksi pembelian Approved di toko tsb
    const imeiFromPembelian = allTransaksi
      .filter(
        (t) => t.NAMA_TOKO === tokoLogin && t.STATUS === "Approved" && t.IMEI
      )
      .map((t) => String(t.IMEI));

    // IMEI yang sedang dipakai di form (ANTI DUPLIKAT)
    const imeiDipakaiDiForm = new Set(items.flatMap((i) => i.imeiList || []));

    return imeiFromPembelian.filter(
      (imei) =>
        !imeiDipakaiDiForm.has(imei) && // ❌ tidak duplikat
        !stockRealtime?.soldImei?.[imei] // ❌ belum terjual
    );
  }, [allTransaksi, tokoLogin, stockRealtime, items]);

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

  /* ================= RENDER ================= */
  return (
    <div className={!allowManual ? "opacity-50 pointer-events-none" : ""}>
      {items.map((item, idx) => {
        const isImeiValid =
          !item.isImei ||
          (item.imeiList &&
            item.imeiList.length === 1 &&
            imeiAvailableList.includes(item.imeiList[0]) === false);
        // note: false karena IMEI valid sudah dikeluarkan dari available list

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

            {/* SKEMA HARGA */}
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
              placeholder="Pilih IMEI dari stok"
              value={item.imei || ""}
              onChange={(e) => {
                const imei = e.target.value.trim();

                // ❌ IMEI tidak ada di stok
                if (!imeiAvailableList.includes(imei)) {
                  alert("❌ IMEI tidak tersedia / sudah dipakai");
                  return;
                }

                // unlock IMEI lama (jika ganti)
                item.imeiList?.forEach((old) => {
                  if (old !== imei) unlockImeiRealtime(old, tokoLogin);
                });

                // lock IMEI baru
                lockImeiRealtime(imei, tokoLogin);

                updateItem(idx, {
                  imei,
                  imeiList: [imei],
                  qty: 1,
                });
              }}
            />

            <datalist id={`imei-${idx}`}>
              {imeiAvailableList.map((im) => (
                <option key={im} value={im} />
              ))}
            </datalist>

            {!item.isImei && (
              <input
                type="number"
                min={1}
                value={item.qty || 1}
                onChange={(e) =>
                  updateItem(idx, { qty: Number(e.target.value || 1) })
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

      <button
        className="btn btn-outline w-full"
        disabled={!allowManual}
        onClick={() =>
          safeOnChange([
            ...items,
            {
              id: Date.now(),
              kategoriBarang: "",
              namaBrand: "",
              namaBarang: "",
              imeiList: [],
              qty: 0,
              hargaAktif: 0,
              isImei: false,
            },
          ])
        }
      >
        ➕ Tambah Barang
      </button>
    </div>
  );
}
