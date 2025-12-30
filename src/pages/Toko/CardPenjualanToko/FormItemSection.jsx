// ===================================================
// FormItemSection.jsx — FINAL FIX 100%
// Tahap 2 | INPUT BARANG | Manual + IMEI + Bundling
// ===================================================
import React, { useEffect, useMemo, useState } from "react";
import {
  listenMasterBarang,
  listenMasterKategoriBarang,
  getAvailableImeisFromInventory,
  getImeiDetailByToko,
  getImeiListByToko,
} from "../../../services/FirebaseService";

/* ================= KONSTANTA ================= */
const KATEGORI_IMEI = ["MOTOR LISTRIK", "SEPEDA LISTRIK", "HANDPHONE"];
const isImeiKategori = (kat) =>
  KATEGORI_IMEI.includes((kat || "").toUpperCase());

/* ================= COMPONENT ================= */
export default function FormItemSection({
  value = [],
  onChange,
  tokoLogin,
  allowManual = false,
  allowQuickImei = true,
}) {
  /* ================= SAFE STATE ================= */
  const items = Array.isArray(value) ? value : [];
  const safeOnChange = typeof onChange === "function" ? onChange : () => {};

  const removeItem = (idx) => {
    safeOnChange(items.filter((_, i) => i !== idx));
  };

  /* ================= MASTER DATA ================= */

  const [masterBarang, setMasterBarang] = useState([]);
  const [masterKategori, setMasterKategori] = useState([]);

  /* ===== IMEI QUICK ===== */
  const [imeiQuick, setImeiQuick] = useState("");
  const [imeiSuggest, setImeiSuggest] = useState([]);
  const [loadingImei, setLoadingImei] = useState(false);
  /* ================= FIREBASE LISTENER ================= */
  useEffect(() => {
    const u1 = listenMasterBarang(setMasterBarang);
    const u3 = listenMasterKategoriBarang(setMasterKategori);
    return () => {
      u1 && u1();
      u3 && u3();
    };
  }, []);

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

  const brandList = (kategori) => [
    ...new Set(
      masterBarang
        .filter((b) => b.kategoriBarang === kategori)
        .map((b) => b.namaBrand || b.brand)
    ),
  ];

  const barangList = (kategori, brand) =>
    masterBarang.filter(
      (b) => b.kategoriBarang === kategori && (b.namaBrand || b.brand) === brand
    );

  /* ================= IMEI AUTOCOMPLETE ================= */
  useEffect(() => {
    if (!imeiQuick || !tokoLogin) {
      setImeiSuggest([]);
      return;
    }

    let active = true;
    getImeiListByToko(tokoLogin, imeiQuick).then((res) => {
      if (active) setImeiSuggest(res || []);
    });

    return () => (active = false);
  }, [imeiQuick, tokoLogin]);

  const subtotalAll = useMemo(() => {
    return items.reduce(
      (sum, it) => sum + Number(it.hargaUnit || 0) * Number(it.qty || 0),
      0
    );
  }, [items]);

  /* ================= RENDER ================= */
  return (
    <div className={!allowManual ? "opacity-50 pointer-events-none" : ""}>
      {/* ================= ITEM LIST ================= */}
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
                sku: b.sku,
                isImei: isImeiKategori(b.kategoriBarang),
                isBundling: b.IS_BUNDLING || false,
                bundlingItems: b.BUNDLING_ITEMS || [],
                hargaMap: {
                  srp: b.harga?.srp || 0,
                  grosir: b.harga?.grosir || 0,
                  reseller: b.harga?.reseller || 0,
                },
                skemaHarga: "srp",
                hargaUnit: b.harga?.srp || 0,
                qty: isImeiKategori(b.kategoriBarang) ? 0 : 1,
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
            <div className="bg-yellow-50 border rounded p-2 text-sm">
              <strong>📦 Isi Bundling:</strong>
              <ul className="list-disc pl-4 mt-1">
                {item.bundlingItems.map((b, i) => (
                  <li key={i}>{b.namaBarang}</li>
                ))}
              </ul>
            </div>
          )}

          {/* ================= KATEGORI HARGA ================= */}
          <div>
            <label className="text-xs font-semibold">Kategori Harga</label>
            <select
              className="w-full border rounded-lg p-2 text-sm"
              value={item.skemaHarga || "srp"}
              onChange={(e) => {
                const skema = e.target.value;
                updateItem(idx, {
                  skemaHarga: skema,
                  hargaUnit: item.hargaMap?.[skema] || 0,
                });
              }}
            >
              <option value="srp">
                SRP — Rp {item.hargaMap?.srp?.toLocaleString("id-ID")}
              </option>
              <option value="grosir">
                Grosir — Rp {item.hargaMap?.grosir?.toLocaleString("id-ID")}
              </option>
              <option value="reseller">
                Reseller — Rp {item.hargaMap?.reseller?.toLocaleString("id-ID")}
              </option>
            </select>
          </div>

          {/* IMEI MANUAL + SUGGEST */}
          {item.isImei && (
            <>
              <textarea
                rows={3}
                className="w-full border rounded-lg p-2"
                placeholder="1 IMEI per baris"
                value={(item.imeiList || []).join("\n")}
                onChange={async (e) => {
                  const imeiList = e.target.value
                    .split("\n")
                    .map((x) => x.trim())
                    .filter(Boolean);

                  // 🔐 VALIDASI IMEI HARUS MILIK TOKO
                  for (const im of imeiList) {
                    const data = await getImeiDetailByToko(tokoLogin, im);

                    if (!data) {
                      alert(`❌ IMEI ${im} bukan milik toko Anda`);
                      return;
                    }
                  }

                  updateItem(idx, {
                    imeiList,
                    qty: imeiList.length,
                  });
                }}
                onFocus={async () => {
                  const imeis = await getImeiListByToko(tokoLogin, "");
                  updateItem(idx, { imeiAvailable: imeis });
                }}
                list={`imei-${idx}`}
              />

              <datalist id={`imei-${idx}`}>
                {(item.imeiAvailable || []).map((im) => (
                  <option key={im} value={im} />
                ))}
              </datalist>
            </>
          )}

          {/* QTY MANUAL */}
          {item.isImei ? (
            <input
              readOnly
              value={item.imeiList.length}
              className="w-full border rounded-lg px-2 py-1 bg-gray-100 text-sm"
            />
          ) : (
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

          {/* SUBTOTAL */}
          <div className="text-right font-bold text-lg text-green-700">
            TOTAL PENJUALAN: Rp {subtotalAll.toLocaleString("id-ID")}
          </div>

          {items.length > 1 && (
            <button
              className="text-red-600 text-sm"
              onClick={() => removeItem(idx)}
            >
              ❌ Hapus Barang
            </button>
          )}
        </div>
      ))}

      {/* TAMBAH BARANG */}
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
