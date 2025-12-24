// ===================================================
// FormItemSection.jsx — FINAL FIX
// Tahap 2 | IMEI + Skema Harga + Bundling FREE
// ===================================================
import React, { useEffect, useMemo, useState } from "react";
import {
  listenMasterBarang,
  listenMasterBarangBundling,
} from "../../../services/FirebaseService";
import { getAvailableImeisFromInventoryReport } from "../../Reports/InventoryReport";

/* ================= KONSTANTA ================= */

const KATEGORI_LIST = [
  "MOTOR LISTRIK",
  "SEPEDA LISTRIK",
  "HANDPHONE",
  "ACCESSORIES",
];

const SKEMA_HARGA = ["SRP", "GROSIR", "RESELLER"];

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

  const [imeiSearch, setImeiSearch] = useState("");
  const [loadingImei, setLoadingImei] = useState(false);

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
  

  /* ================= HELPER ================= */

  const updateItem = (idx, patch) => {
    const updated = [...value];
    updated[idx] = { ...updated[idx], ...patch };
    onChange(updated);
  };

  const barangByBrandKategori = (brand, kategori) => {
    if (!brand || !kategori) return [];

    return masterBarang.filter(
      (b) =>
        b.namaBrand?.toUpperCase() === brand.toUpperCase() &&
        b.kategoriBarang?.toUpperCase() === kategori.toUpperCase()
    );
  };

  const brandList = useMemo(() => {
    const set = new Set();
    masterBarang.forEach((b) => {
      if (b?.namaBrand) {
        set.add(b.namaBrand.toUpperCase());
      }
    });
    return Array.from(set);
  }, [masterBarang]);


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
      {/* 🔎 PENJUALAN CEPAT VIA IMEI */}
      <div className="border rounded-xl p-3 mb-4 bg-indigo-50">
        <label className="text-xs font-bold text-indigo-700">
          🔎 Penjualan Cepat (Cari / Scan IMEI)
        </label>

        <div className="flex gap-2 mt-1">
          <input
            className="flex-1 border rounded-lg px-3 py-2 text-sm"
            placeholder="Masukkan / Scan IMEI..."
            value={imeiSearch}
            onChange={(e) => setImeiSearch(e.target.value)}
          />

          <button
            type="button"
            disabled={!imeiSearch || loadingImei}
            onClick={async () => {
              try {
                setLoadingImei(true);

                const imei = imeiSearch.trim();
                if (!imei) return;

                // 🔥 ambil data inventory
                const data = await getAvailableImeisFromInventoryReport(
                  tokoLogin,
                  imei
                );

                if (!data || !data.barang) {
                  alert("❌ IMEI tidak ditemukan / sudah terjual");
                  return;
                }

                onChange([
                  {
                    id: Date.now(),
                    kategoriBarang: data.kategoriBarang,
                    namaBrand: data.namaBrand,
                    namaBarang: data.namaBarang,
                    sku: data.sku,
                    imeiList: [imei],
                    qty: 1,
                    skemaHarga: "SRP",
                    hargaUnit: Number(data.hargaSRP || 0),
                    namaBundling: "",
                    hargaBundling: 0,
                    qtyBundling: 0,
                    isImei: true,
                  },
                ]);

                setImeiSearch("");
              } finally {
                setLoadingImei(false);
              }
            }}
            className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-semibold"
          >
            {loadingImei ? "..." : "Cari"}
          </button>
        </div>

        <p className="text-[11px] text-gray-600 mt-1">
          Cukup scan IMEI → TAHAP 2 otomatis terisi
        </p>
      </div>

      <div className="relative">
        <div className="absolute top-1 right-2 text-[11px] font-semibold">
          {disabled ? (
            <span className="text-red-500">🔒 Tahap 2 Terkunci</span>
          ) : (
            <span className="text-green-600">🟢 Tahap 2 Aktif</span>
          )}
        </div>

        <h2 className="text-sm font-bold mb-3">📦 INPUT BARANG (TAHAP 2)</h2>
        {/* ================= LIST ITEM ================= */}
        {value.map((item, idx) => {

          const barangList = barangByBrandKategori(
            item.namaBrand,
            item.kategoriBarang
          );

          const bundlingList = bundlingFreeByKategori(item.kategoriBarang);

          return (
            <div
              key={item.id}
              className="border rounded-xl p-4 mb-4 bg-white space-y-3"
            >
              {/* ================= KATEGORI ================= */}
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
                    sku: "",
                    imeiList: [],
                    qty: 0,
                    isImei: false,
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

             {/* ================= BRAND ================= */}
             <div>
              <label className="text-xs font-semibold">Nama Brand</label>
              <select
                className="w-full border rounded-lg px-2 py-1 text-sm"
                value={item.namaBrand}
                disabled={!item.kategoriBarang}
                onChange={(e) =>
                  updateItem(idx, {
                    namaBrand: e.target.value,
                    namaBarang: "",
                    sku: "",
                    imeiList: [],
                    qty: 0,
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

             {/* ================= NAMA BARANG ================= */}
             <div>
              <label className="text-xs font-semibold">Nama Barang</label>
              <select
                className="w-full border rounded-lg px-2 py-1 text-sm"
                value={item.namaBarang}
                disabled={!item.namaBrand || !item.kategoriBarang}
                onChange={(e) => {
                  const barang = barangList.find(
                    (b) => b.namaBarang === e.target.value
                  );
                  if (!barang) return;

                  updateItem(idx, {
                    namaBarang: barang.namaBarang,
                    sku: barang.sku,
                    hargaUnit:
                      item.skemaHarga === "GROSIR"
                        ? Number(barang.hargaGrosir || 0)
                        : item.skemaHarga === "RESELLER"
                        ? Number(barang.hargaReseller || 0)
                        : Number(barang.hargaSRP || 0),
                    imeiList: [],
                    qty: 0,
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

             {/* ================= SKEMA HARGA ================= */}
             <div>
              <label className="text-xs font-semibold">Skema Harga</label>
              <select
                className="w-full border rounded-lg px-2 py-1 text-sm"
                value={item.skemaHarga}
                onChange={(e) => {
                  const barang = barangList.find(
                    (b) => b.sku === item.sku
                  );

                  updateItem(idx, {
                    skemaHarga: e.target.value,
                    hargaUnit:
                      e.target.value === "GROSIR"
                        ? Number(barang?.hargaGrosir || 0)
                        : e.target.value === "RESELLER"
                        ? Number(barang?.hargaReseller || 0)
                        : Number(barang?.hargaSRP || 0),
                  });
                }}
              >
                {SKEMA_HARGA.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

              {/* IMEI */}
              {isImeiKategori(item.kategoriBarang) && (
                <div>
                  <label className="text-xs font-semibold">
                    IMEI (Available)
                  </label>
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
                    onFocus={async () => {
                      if (!item.namaBarang) return;

                      const imeis = await getAvailableImeisFromInventoryReport(
                        tokoLogin,
                        item.namaBarang
                      );

                      updateItem(idx, {
                        imeiAvailable: imeis,
                      });
                    }}
                    list={`imei-${idx}`}
                  />

                  <datalist id={`imei-${idx}`}>
                    {(item.imeiAvailable || []).map((im) => (
                      <option key={im} value={im} />
                    ))}
                  </datalist>

                  <p className="text-[11px] text-gray-500">
                    IMEI tersedia: {(item.imeiAvailable || []).length}
                  </p>
                </div>
              )}

              {/* BUNDLING FREE */}
              {bundlingList.length > 0 && (
                <div>
                  <label className="text-xs font-semibold">
                    Produk Bundling
                  </label>
                  <select
                    value={item.namaBundling || ""}
                    onChange={(e) => {
                      const b = masterBundling.find(
                        (x) => x.namaBarang === e.target.value
                      );

                      updateItem(idx, {
                        namaBundling: e.target.value,
                        skuBundling: b?.sku || "",
                        hargaBundling: b?.hargaSRP || 0,
                      });
                    }}
                  >
                    <option value="">-- Tidak Ada --</option>
                    {masterBundling.map((b) => (
                      <option key={b.sku} value={b.namaBarang}>
                        {b.namaBarang}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold">QTY Bundling</label>
                <input
                  type="number"
                  value={item.qtyBundling || 0}
                  onChange={(e) =>
                    updateItem(idx, {
                      qtyBundling: Number(e.target.value || 0),
                    })
                  }
                />
              </div>

              {/* TOTAL */}
              <div className="text-right font-semibold text-indigo-700">
                Total: Rp {hitungTotal(item).toLocaleString("id-ID")}
              </div>
            </div>
          );
        })}
        <button
          type="button"
          onClick={() =>
            onChange([
              ...value,
              {
                id: Date.now(),
                kategoriBarang: "",
                namaBrand: "",
                namaBarang: "",
                sku: "",
                imeiList: [],
                qty: 0,
                hargaUnit: 0,
                skemaHarga: "SRP",
                namaBundling: "",
                hargaBundling: 0,
                qtyBundling: 0,
                isImei: false,
              },
            ])
          }
          className="w-full mt-2 border border-dashed rounded-lg py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50"
        >
          ➕ Tambah Barang
        </button>
      </div>
    </fieldset>
  );
}
