import React, { useEffect, useMemo, useState } from "react";
import {
  listenMasterBarang,
  listenAllTransaksi,
  listenStockAll ,
} from "../../../services/FirebaseService";

/* ================= KONSTANTA ================= */
const KATEGORI_DEFAULT = [
  "SEPEDA LISTRIK",
  "MOTOR LISTRIK",
  "HANDPHONE",
  "ACCESSORIES",
];

const KATEGORI_IMEI = ["SEPEDA LISTRIK", "MOTOR LISTRIK", "HANDPHONE"];
const SKEMA_HARGA = ["SRP", "GROSIR", "RESELLER"];

const isIMEIKategori = (kat) =>
  KATEGORI_IMEI.includes((kat || "").toUpperCase());

/* ================= COMPONENT ================= */
export default function FormItemSection({
  value = [],
  onChange,
  disabled = false,
  tokoLogin,
}) {
  const [masterBarang, setMasterBarang] = useState([]);
  const [transaksiPembelian, setTransaksiPembelian] = useState([]);
  const [stockAll, setStockAll] = useState({});

  useEffect(() => {
    const unsub = listenStockAll((data) => {
      setStockAll(data || {});
    });
    return () => unsub && unsub();
  }, []);
  

  /* ===== MASTER BARANG ===== */
  useEffect(() => {
    const unsub = listenMasterBarang((list) => {
      setMasterBarang(Array.isArray(list) ? list : []);
    });
    return () => unsub && unsub();
  }, []);

  /* ===== TRANSAKSI PEMBELIAN ===== */
  useEffect(() => {
    const unsub = listenAllTransaksi((rows) => {
      const pembelian = (rows || []).filter(
        (t) => (t.PAYMENT_METODE || "").toUpperCase() === "PEMBELIAN"
      );
      setTransaksiPembelian(pembelian);
    });
    return () => unsub && unsub();
  }, []);

  /* ===== BRAND LIST (MASTER + PEMBELIAN) ===== */
  const brandList = useMemo(() => {
    const set = new Set();
    masterBarang.forEach((b) => b.namaBrand && set.add(b.namaBrand));
    transaksiPembelian.forEach((t) => t.NAMA_BRAND && set.add(t.NAMA_BRAND));
    return Array.from(set);
  }, [masterBarang, transaksiPembelian]);

  /* ===== HELPER ===== */
  const updateItem = (idx, patch) => {
    const updated = [...value];
    updated[idx] = { ...updated[idx], ...patch };
    onChange(updated);
  };

  const hitungTotal = (item) =>
    Number(item.hargaUnit || 0) * Number(item.qty || 0) +
    Number(item.hargaBundling || 0) * Number(item.qtyBundling || 0);

  const imeiMaster = useMemo(
    () => masterBarang.map((b) => b.imei).filter(Boolean),
    [masterBarang]
  );

  const tambahItem = () => {
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
        skemaHarga: "SRP",
        hargaUnit: 0,

        // ====== SUDAH ADA (JANGAN DIHAPUS) ======
        bundlingOptions: [],
        selectedBundlingIndex: null,
        qtyBundling: 0,
        totalHarga: 0,

        // ====== TAMBAHAN BARU (PREVIEW MASTER) ======
        namaBundling1: "",
        hargaBundling1: 0,
        namaBundling2: "",
        hargaBundling2: 0,
        namaBundling3: "",
        hargaBundling3: 0,
      },
    ]);
  };

  

  const getBarangFiltered = (
    masterBarang,
    transaksiPembelian,
    namaBrand,
    kategoriBarang
  ) => {
    const set = new Map();

    // 🔹 DARI MASTER BARANG
    masterBarang.forEach((b) => {
      if (b.namaBrand === namaBrand && b.kategoriBarang === kategoriBarang) {
        set.set(b.namaBarang, {
          id: b.id,
          namaBarang: b.namaBarang,
          sku: b.sku,
          source: "MASTER",
        });
      }
    });

    // 🔹 DARI TRANSAKSI PEMBELIAN (MasterPembelian)
    transaksiPembelian.forEach((t) => {
      if (t.NAMA_BRAND === namaBrand && t.KATEGORI_BRAND === kategoriBarang) {
        set.set(t.NAMA_BARANG, {
          id: `trx-${t.id}`,
          namaBarang: t.NAMA_BARANG,
          sku: `${t.NAMA_BRAND}_${t.NAMA_BARANG}`,
          source: "PEMBELIAN",
        });
      }
    });

    return Array.from(set.values());
  };

  

  /* ================= RENDER ================= */
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">INPUT BARANG</h2>

      {value.map((item, idx) => {
        const barangFiltered = getBarangFiltered(
          masterBarang,
          transaksiPembelian,
          item.namaBrand,
          item.kategoriBarang
        );

        const isBundlingAllowed = ["MOTOR LISTRIK", "SEPEDA LISTRIK"].includes(
          (item.kategoriBarang || "").toUpperCase()
        );

        return (
          <div
            key={item.id}
            className="border rounded-xl p-4 bg-white space-y-3"
          >
            {/* 1. KATEGORI */}
            <div>
              <label className="text-xs font-semibold">Kategori Barang</label>
              <input
                list={`kategori-${idx}`}
                className="input"
                value={item.kategoriBarang}
                disabled={disabled}
                onChange={(e) =>
                  updateItem(idx, {
                    kategoriBarang: e.target.value,
                    namaBrand: "",
                    namaBarang: "",
                    imeiList: [],
                    qty: 0,
                    produkBundling: "",
                    qtyBundling: 0,
                    hargaBundling: 0,
                  })
                }
              />
              <datalist id={`kategori-${idx}`}>
                {KATEGORI_DEFAULT.map((k) => (
                  <option key={k} value={k} />
                ))}
              </datalist>
            </div>

            {/* 2. BRAND */}
            <div>
              <label className="text-xs font-semibold">Nama Brand</label>
              <input
                list={`brand-${idx}`}
                className="input"
                value={item.namaBrand}
                onChange={(e) =>
                  updateItem(idx, {
                    namaBrand: e.target.value,
                    namaBarang: "",
                  })
                }
              />
              <datalist id={`brand-${idx}`}>
                {brandList.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>

            {/* 3. NAMA BARANG */}
            <div>
              <label className="text-xs font-semibold">Nama Barang</label>
              <select
                className="input"
                value={item.namaBarang}
                onChange={(e) => {
                  // ✅ KODE KAMU HARUS DI SINI

                  const barang = masterBarang.find(
                    (x) =>
                      x.barang === e.target.value ||
                      x.namaBarang === e.target.value
                  );

                  // ===== TETAP ADA (punya kamu) =====
                  const bundlingOptions = [];

                  // ===== TAMBAHAN BARU =====
                  const namaBundling1 = barang?.NAMA_BANDLING_1 || "";
                  const hargaBundling1 = Number(barang?.HARGA_BANDLING_1 || 0);

                  const namaBundling2 = barang?.NAMA_BANDLING_2 || "";
                  const hargaBundling2 = Number(barang?.HARGA_BANDLING_2 || 0);

                  const namaBundling3 = barang?.NAMA_BANDLING_3 || "";
                  const hargaBundling3 = Number(barang?.HARGA_BANDLING_3 || 0);

                  // ===== EXISTING LOGIC (TIDAK DIHAPUS) =====
                  if (namaBundling1)
                    bundlingOptions.push({
                      nama: namaBundling1,
                      harga: hargaBundling1,
                    });
                  if (namaBundling2)
                    bundlingOptions.push({
                      nama: namaBundling2,
                      harga: hargaBundling2,
                    });
                  if (namaBundling3)
                    bundlingOptions.push({
                      nama: namaBundling3,
                      harga: hargaBundling3,
                    });

                  // ===== UPDATE ITEM =====
                  updateItem(idx, {
                    namaBarang: barang?.barang || barang?.namaBarang || "",
                    sku: barang?.sku || "",
                    hargaUnit: barang?.hargaSRP || 0,
                    skemaHarga: "SRP",

                    bundlingOptions,
                    selectedBundlingIndex: null,
                    qtyBundling: 0,

                    // 🔥 PREVIEW MASTER BUNDLING
                    namaBundling1,
                    hargaBundling1,
                    namaBundling2,
                    hargaBundling2,
                    namaBundling3,
                    hargaBundling3,
                  });
                }}
              >
              
                {barangFiltered.map((b) => (
                  <option key={b.id} value={b.namaBarang}>
                    {b.namaBarang}
                  </option>
                ))}
              </select>
            </div>

            {/* 4. IMEI */}
            {isIMEIKategori(item.kategoriBarang) && (
              <div>
                <label className="text-xs font-semibold">
                  IMEI (1 baris 1 IMEI)
                </label>
                <textarea
                  rows={2}
                  className="input"
                  list={`imei-${idx}`}
                  value={(item.imeiList || []).join("\n")}
                  onChange={(e) => {
                    const list = e.target.value
                      .split("\n")
                      .map((x) => x.trim())
                      .filter(Boolean);

                    updateItem(idx, {
                      imeiList: list,
                      qty: list.length,
                      totalHarga: hitungTotal({
                        ...item,
                        qty: list.length,
                      }),
                    });
                  }}
                />
                <datalist id={`imei-${idx}`}>
                  {imeiMaster.map((im) => (
                    <option key={im} value={im} />
                  ))}
                </datalist>
              </div>
            )}

            {/* 5. QTY */}
            {!isIMEIKategori(item.kategoriBarang) && (
              <div>
                <label className="text-xs font-semibold">QTY Unit</label>
                <input
                  type="number"
                  className="input"
                  value={item.qty}
                  onChange={(e) =>
                    updateItem(idx, {
                      qty: Number(e.target.value),
                      totalHarga: hitungTotal({
                        ...item,
                        qty: Number(e.target.value),
                      }),
                    })
                  }
                />
              </div>
            )}

            {/* 6. SKEMA HARGA */}
            {isIMEIKategori(item.kategoriBarang) && (
              <div>
                <label className="text-xs font-semibold">Skema Harga</label>
                <select
                  className="input"
                  value={item.skemaHarga}
                  onChange={(e) =>
                    updateItem(idx, { skemaHarga: e.target.value })
                  }
                >
                  {SKEMA_HARGA.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 7. HARGA UNIT */}
            <div>
              <label className="text-xs font-semibold">Harga Unit</label>
              <input
                type="number"
                className="input"
                value={item.hargaUnit}
                onChange={(e) =>
                  updateItem(idx, {
                    hargaUnit: Number(e.target.value),
                    totalHarga: hitungTotal({
                      ...item,
                      hargaUnit: Number(e.target.value),
                    }),
                  })
                }
              />
            </div>

            {/* ===== PREVIEW MASTER BUNDLING (READ ONLY) ===== */}
            {isBundlingAllowed && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <div>
                  <label className="text-xs font-semibold">
                    Nama Bundling 1
                  </label>
                  <input
                    className="input bg-gray-100"
                    value={item.namaBundling1}
                    readOnly
                  />
                  <input
                    className="input mt-1 bg-gray-100"
                    value={item.hargaBundling1}
                    readOnly
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold">
                    Nama Bundling 2
                  </label>
                  <input
                    className="input bg-gray-100"
                    value={item.namaBundling2}
                    readOnly
                  />
                  <input
                    className="input mt-1 bg-gray-100"
                    value={item.hargaBundling2}
                    readOnly
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold">
                    Nama Bundling 3
                  </label>
                  <input
                    className="input bg-gray-100"
                    value={item.namaBundling3}
                    readOnly
                  />
                  <input
                    className="input mt-1 bg-gray-100"
                    value={item.hargaBundling3}
                    readOnly
                  />
                </div>
              </div>
            )}

            {/* TOTAL */}
            <div className="text-right font-bold text-indigo-700">
              Total: Rp {hitungTotal(item).toLocaleString("id-ID")}
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={tambahItem}
        disabled={disabled}
        className="w-full py-2 bg-green-600 text-white rounded-lg"
      >
        + Tambah Barang
      </button>
    </div>
  );
}
