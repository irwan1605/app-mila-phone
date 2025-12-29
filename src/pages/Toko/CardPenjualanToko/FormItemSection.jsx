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
    
;
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

  /* ================= HANDLE QUICK IMEI ================= */
  const handleCariImei = async () => {
    if (!imeiQuick || !tokoLogin) return;

    setLoadingImei(true);
    try {
      const data = await getImeiDetailByToko(tokoLogin, imeiQuick.trim());

      if (!data) {
        alert("❌ Nomor IMEI ini tidak ada di Toko Anda");
        return;
      }

      safeOnChange([
        {
          id: Date.now(),
          kategoriBarang: data.kategoriBarang,
          namaBrand: data.namaBrand,
          namaBarang: data.namaBarang,
          sku: data.sku,
          imeiList: [data.imei],
          qty: 1,
          hargaUnit: data.harga?.srp || 0,
          skemaHarga: "SRP",
          isImei: true,
        },
      ]);

      setImeiQuick("");
      setImeiSuggest([]);
    } finally {
      setLoadingImei(false);
    }
  };

  

  const hitungSubtotal = (item) =>
    Number(item.hargaUnit || 0) * Number(item.qty || 0) +
    Number(item.hargaBundling || 0) * Number(item.qtyBundling || 0);

  /* ================= RENDER ================= */
  return (
    <div className={!allowManual ? "opacity-50 pointer-events-none" : ""}>
      {/* ================= QUICK IMEI ================= */}
      <div className="border rounded-xl p-3 mb-4 bg-indigo-50">
        <label className="text-xs font-bold text-indigo-700">
          🔎 Penjualan Cepat (Scan / Ketik IMEI)
        </label>

        <div className="flex gap-2 mt-2">
        <input
          className="w-full border rounded-lg px-3 py-2 mt-2 text-sm"
          placeholder="Scan / ketik IMEI lalu Enter"
          value={imeiQuick}
          onChange={(e) => setImeiQuick(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCariImei()}
        />

        {/* AUTOCOMPLETE IMEI */}
        {imeiSuggest.length > 0 && (
          <div className="border mt-1 rounded bg-white max-h-40 overflow-auto">
            {imeiSuggest.map((im) => (
              <div
                key={im}
                onClick={() => {
                  setImeiQuick(im);
                  setImeiSuggest([]);
                }}
                className="px-3 py-1 hover:bg-indigo-100 cursor-pointer text-sm"
              >
                {im}
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={handleCariImei}
          disabled={loadingImei}
          className="mt-2 w-full bg-indigo-600 text-white py-2 rounded-lg"
        >
          {loadingImei ? "⏳" : "CARI IMEI"}
        </button>
        </div>
      </div>

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
                onChange={(e) => {
                  const list = e.target.value
                    .split("\n")
                    .map((x) => x.trim())
                    .filter(Boolean);
                  updateItem(idx, { imeiList: list, qty: list.length });
                }}
                onFocus={async () => {
                  if (!item.sku || !tokoLogin) return;
                  const imeis = await getAvailableImeisFromInventory(
                    tokoLogin,
                    item.sku
                  );
                  updateItem(idx, { imeiAvailable: imeis || [] });
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
          {!item.isImei && (
            <input
              type="number"
              min={1}
              className="w-full border rounded-lg p-2"
              value={item.qty || 1}
              onChange={(e) =>
                updateItem(idx, { qty: Number(e.target.value || 1) })
              }
            />
          )}

          {/* SUBTOTAL */}
          <div className="text-right font-bold text-indigo-700">
            Total: Rp {hitungSubtotal(item).toLocaleString("id-ID")}
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
