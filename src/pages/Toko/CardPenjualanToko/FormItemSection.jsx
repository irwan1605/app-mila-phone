// ===================================================
// FormItemSection.jsx — FINAL FIX 100% (STABIL)
// Tahap 2 | INPUT BARANG | IMEI MANUAL + DROPDOWN + NON IMEI + BUNDLING
// ===================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  listenMasterBarang,
  listenMasterKategoriBarang,
  lockImeiRealtime,
  unlockImeiRealtime,
} from "../../../services/FirebaseService";
import { ref, get } from "firebase/database";
import { db } from "../../../firebase/FirebaseInit";

/* ================= KONSTANTA ================= */
const KATEGORI_IMEI = ["MOTOR LISTRIK", "SEPEDA LISTRIK", "HANDPHONE"];
const isImeiKategori = (kat) =>
  KATEGORI_IMEI.includes((kat || "").toUpperCase());

const normalize = (s = "") => String(s).trim().toUpperCase();

export default function FormItemSection({
  value = [],
  onChange,
  tokoLogin,
  allowManual = false,
}) {
  const items = Array.isArray(value) ? value : [];
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

  /* ================= LOAD HISTORI TRANSAKSI ================= */
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

  /* ================= UNLOCK IMEI ON UNMOUNT ================= */
  useEffect(() => {
    return () => {
      items.forEach((it) => {
        if (it.isImei) {
          it.imeiList?.forEach((im) => unlockImeiRealtime(im));
        }
      });
    };
    // eslint-disable-next-line
  }, []);

  /* ================= HITUNG STOK IMEI MILIK TOKO ================= */
  const imeiValidList = useMemo(() => {
    if (!tokoLogin) return [];

    const stok = {};
    const toko = normalize(tokoLogin);

    allTransaksi.forEach((t) => {
      if (t.STATUS !== "Approved") return;
      if (!t.IMEI) return;
      if (normalize(t.NAMA_TOKO) !== toko) return;

      const imei = String(t.IMEI).trim();
      stok[imei] = stok[imei] || 0;

      if (["PEMBELIAN", "TRANSFER_MASUK"].includes(t.PAYMENT_METODE)) {
        stok[imei]++;
      }

      if (["PENJUALAN", "TRANSFER_KELUAR"].includes(t.PAYMENT_METODE)) {
        stok[imei]--;
      }
    });

    return Object.keys(stok).filter((i) => stok[i] > 0);
  }, [allTransaksi, tokoLogin]);

  /* ================= FILTER IMEI (ANTI DUPLIKAT) ================= */
  const imeiOptions = useMemo(() => {
    return imeiValidList.filter(
      (i) => !items.some((it) => it.imeiList?.includes(i))
    );
  }, [imeiValidList, items]);

  /* ================= UPDATE ITEM ================= */
  const updateItem = (idx, patch) => {
    const next = [...items];
    next[idx] = { ...next[idx], ...patch };
    safeOnChange(next);
  };

  /* ================= MEMO ================= */
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

  const totalPenjualan = useMemo(() => {
    return items.reduce(
      (sum, item) => sum + Number(item.qty || 0) * Number(item.hargaUnit || 0),
      0
    );
  }, [items]);

  /* ================= RENDER ================= */
  return (
    <div className={!allowManual ? "opacity-50 pointer-events-none" : ""}>
      {items.map((item, idx) => (
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
                isBundling: false,
                bundlingItems: [],
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

              const isBundlingBarang =
                ["MOTOR LISTRIK", "SEPEDA LISTRIK"].includes(
                  b.kategoriBarang
                ) && (b.IS_BUNDLING === true || b.isBundling === true);

              updateItem(idx, {
                namaBarang: b.namaBarang,
                kategoriBarang: b.kategoriBarang,
                sku: b.sku || "",
                isImei: isImeiKategori(b.kategoriBarang),

                hargaMap: {
                  srp: Number(b.harga?.srp || 0),
                  grosir: Number(b.harga?.grosir || 0),
                  reseller: Number(b.harga?.reseller || 0),
                },

                skemaHarga: "srp",
                hargaUnit: Number(b.harga?.srp || 0),
                qty: isImeiKategori(b.kategoriBarang) ? 0 : 1,

                isBundling: isBundlingBarang,
                bundlingItems: isBundlingBarang
                  ? b.BUNDLING_ITEMS || []
                  : [],
              });
            }}
          >
            <option value="">-- Pilih Barang --</option>
            {barangList(item.kategoriBarang, item.namaBrand).map((b) => (
              <option key={b.id}>{b.namaBarang}</option>
            ))}
          </select>

          {/* INFO BUNDLING */}
          {item.isBundling && item.bundlingItems?.length > 0 && (
            <div className="bg-yellow-50 border rounded p-2 text-xs">
              <b>📦 Bundling Otomatis:</b>
              <ul className="list-disc pl-4">
                {item.bundlingItems.map((x, i) => (
                  <li key={i}>{x.namaBarang}</li>
                ))}
              </ul>
            </div>
          )}

          {/* ===== IMEI MANUAL ===== */}
          {item.isImei && (
            <>
              <textarea
                rows={2}
                className="w-full border rounded-lg p-2 text-sm"
                placeholder="Ketik IMEI manual (1 IMEI per baris)"
                value={(item.imeiList || []).join("\n")}
                onChange={async (e) => {
                  const list = e.target.value
                    .split("\n")
                    .map((x) => x.trim())
                    .filter(Boolean);

                  for (const im of list) {
                    if (!imeiValidList.includes(im)) {
                      alert(`❌ IMEI ${im} bukan stok toko ${tokoLogin}`);
                      return;
                    }
                    await lockImeiRealtime(im, tokoLogin, "SYSTEM");
                  }

                  updateItem(idx, {
                    imeiList: list,
                    qty: list.length,
                  });
                }}
              />

              {/* ===== IMEI DROPDOWN ===== */}
              <select
                multiple
                className="w-full border rounded-lg p-2 text-sm"
                value={item.imeiList || []}
                onChange={async (e) => {
                  const selected = Array.from(
                    e.target.selectedOptions
                  ).map((o) => o.value);

                  for (const im of selected) {
                    await lockImeiRealtime(im, tokoLogin, "SYSTEM");
                  }

                  updateItem(idx, {
                    imeiList: selected,
                    qty: selected.length,
                  });
                }}
              >
                {imeiOptions.map((im) => (
                  <option key={im} value={im}>
                    {im}
                  </option>
                ))}
              </select>
            </>
          )}

          {/* QTY NON IMEI */}
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
            TOTAL PENJUALAN: Rp {totalPenjualan.toLocaleString("id-ID")}
          </div>
        </div>
      ))}

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
              hargaUnit: 0,
              isImei: false,
              isBundling: false,
              bundlingItems: [],
            },
          ])
        }
      >
        ➕ Tambah Barang
      </button>
    </div>
  );
}
