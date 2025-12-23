// ===================================================
// FormItemSection.jsx — FINAL FIX
// Tahap 2 | IMEI + Skema Harga + Bundling FREE
// ===================================================
import React, { useEffect, useMemo, useState } from "react";
import {
  listenMasterBarang,
  listenStockAll,
  listenMasterBarangBundling,
} from "../../../services/FirebaseService";

/* ================= KONSTANTA ================= */

const KATEGORI_LIST = [
  "MOTOR LISTRIK",
  "SEPEDA LISTRIK",
  "HANDPHONE",
  "ACCESSORIES",
];

const KATEGORI_IMEI = ["MOTOR LISTRIK", "SEPEDA LISTRIK", "HANDPHONE"];

const isImeiKategori = (kat) =>
  KATEGORI_IMEI.includes((kat || "").toUpperCase());

/* ================= COMPONENT ================= */

export default function FormItemSection({
  value = [],
  onChange,
  tokoLogin,
  disabled = false,
}) {
  const [masterBarang, setMasterBarang] = useState([]);
  const [masterBundling, setMasterBundling] = useState([]);
  const [stockAll, setStockAll] = useState({});

  /* ================= LISTENER ================= */

  useEffect(() => {
    const unsub = listenMasterBarang((rows) =>
      setMasterBarang(Array.isArray(rows) ? rows : [])
    );
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    const unsub = listenMasterBarangBundling((rows) =>
      setMasterBundling(Array.isArray(rows) ? rows : [])
    );
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    const unsub = listenStockAll((data) => setStockAll(data || {}));
    return () => unsub && unsub();
  }, []);

  /* ================= HELPER ================= */

  const updateItem = (idx, patch) => {
    const updated = [...value];
    updated[idx] = { ...updated[idx], ...patch };
    onChange(updated);
  };

  const brandList = useMemo(() => {
    const set = new Set();
    masterBarang.forEach((b) => b.namaBrand && set.add(b.namaBrand));
    return Array.from(set);
  }, [masterBarang]);

  const barangByBrandKategori = (brand, kategori) =>
    masterBarang.filter(
      (b) => b.namaBrand === brand && b.kategoriBarang === kategori
    );

  const imeiBySku = (sku) => {
    if (!tokoLogin || !sku) return [];
    const stok = stockAll?.[tokoLogin]?.[sku];
    if (!stok) return [];
    return Array.isArray(stok.imei) ? stok.imei : [];
  };

  const bundlingFreeByKategori = (kategori) =>
    ["MOTOR LISTRIK", "SEPEDA LISTRIK"].includes((kategori || "").toUpperCase())
      ? masterBundling.filter((b) => b.kategoriBarang === kategori)
      : [];

  const hitungTotal = (item) => {
    const hargaItem = Number(item.hargaUnit || 0) * Number(item.qty || 0);
    const hargaBundling =
      Number(item.hargaBundling || 0) * Number(item.qtyBundling || 0);
    return hargaItem + hargaBundling;
  };

  /* ================= RENDER ================= */

  return (
    <fieldset disabled={disabled} className={disabled ? "opacity-50" : ""}>
      <div className="relative">
        <div className="absolute top-1 right-2 text-[11px] font-semibold">
          {disabled ? (
            <span className="text-red-500">🔒 Tahap 2 Terkunci</span>
          ) : (
            <span className="text-green-600">🟢 Tahap 2 Aktif</span>
          )}
        </div>

        <h2 className="text-sm font-bold mb-3">📦 INPUT BARANG (TAHAP 2)</h2>

        {value.map((item, idx) => {
          const barangList = barangByBrandKategori(
            item.namaBrand,
            item.kategoriBarang
          );

          const imeiList = isImeiKategori(item.kategoriBarang)
            ? imeiBySku(item.sku)
            : [];

          const bundlingList = bundlingFreeByKategori(item.kategoriBarang);

          return (
            <div
              key={item.id}
              className="border rounded-xl p-4 mb-4 bg-white space-y-3"
            >
              {/* KATEGORI */}
              <div>
                <label className="text-xs font-semibold">Kategori Barang</label>
                <select
                  className="w-full border rounded-lg px-2 py-1 text-sm"
                  value={item.kategoriBarang}
                  onChange={(e) =>
                    updateItem(idx, {
                      kategoriBarang: e.target.value,
                      namaBrand: "",
                      namaBarang: "",
                      imeiList: [],
                      qty: 0,
                    })
                  }
                >
                  <option value="">-- Pilih --</option>
                  {KATEGORI_LIST.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>

              {/* BRAND */}
              <div>
                <label className="text-xs font-semibold">Nama Brand</label>
                <select
                  className="w-full border rounded-lg px-2 py-1 text-sm"
                  value={item.namaBrand}
                  onChange={(e) =>
                    updateItem(idx, {
                      namaBrand: e.target.value,
                      namaBarang: "",
                    })
                  }
                >
                  <option value="">-- Pilih --</option>
                  {brandList.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* BARANG */}
              <div>
                <label className="text-xs font-semibold">Nama Barang</label>
                <select
                  className="w-full border rounded-lg px-2 py-1 text-sm"
                  value={item.namaBarang}
                  onChange={(e) => {
                    const barang = barangList.find(
                      (b) => b.namaBarang === e.target.value
                    );
                    updateItem(idx, {
                      namaBarang: e.target.value,
                      sku: barang?.sku || "",
                      hargaUnit: Number(barang?.hargaSRP || 0),
                      skemaHarga: "SRP",
                    });
                  }}
                >
                  <option value="">-- Pilih --</option>
                  {barangList.map((b) => (
                    <option key={b.sku} value={b.namaBarang}>
                      {b.namaBarang}
                    </option>
                  ))}
                </select>
              </div>

              {/* IMEI */}
              {isImeiKategori(item.kategoriBarang) && (
                <div>
                  <label className="text-xs font-semibold">IMEI</label>
                  <textarea
                    rows={3}
                    className="w-full border rounded-lg px-2 py-1 text-sm"
                    value={(item.imeiList || []).join("\n")}
                    onChange={(e) => {
                      const list = e.target.value
                        .split("\n")
                        .map((x) => x.trim())
                        .filter(Boolean);

                      updateItem(idx, {
                        imeiList: list,
                        qty: list.length,
                      });
                    }}
                    list={`imei-${idx}`}
                  />
                  <datalist id={`imei-${idx}`}>
                    {imeiList.map((im) => (
                      <option key={im} value={im} />
                    ))}
                  </datalist>
                </div>
              )}

              {/* QTY MANUAL */}
              {!isImeiKategori(item.kategoriBarang) && (
                <div>
                  <label className="text-xs font-semibold">QTY</label>
                  <input
                    type="number"
                    className="w-full border rounded-lg px-2 py-1 text-sm"
                    value={item.qty}
                    onChange={(e) =>
                      updateItem(idx, {
                        qty: Number(e.target.value || 0),
                      })
                    }
                  />
                </div>
              )}

              {/* BUNDLING FREE */}
              {bundlingList.length > 0 && (
                <div>
                  <label className="text-xs font-semibold">
                    Bundling (FREE)
                  </label>
                  <select
                    className="w-full border rounded-lg px-2 py-1 text-sm"
                    value={item.namaBundling || ""}
                    onChange={(e) =>
                      updateItem(idx, {
                        namaBundling: e.target.value,
                        hargaBundling: 0, // FREE
                      })
                    }
                  >
                    <option value="">-- Pilih --</option>
                    {bundlingList.map((b) => (
                      <option key={b.id || b.namaBarang} value={b.namaBarang}>
                        {b.namaBarang}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* TOTAL */}
              <div className="text-right font-semibold text-indigo-700">
                Total: Rp {hitungTotal(item).toLocaleString("id-ID")}
              </div>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
