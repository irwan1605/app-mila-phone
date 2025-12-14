// ===============================
// FormItemSection.jsx (FINAL FIX)
// ===============================
import React, { useEffect, useMemo, useState } from "react";
import {
  listenMasterBarang,
  listenAllTransaksi,
  listenStockAll,
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

  /* ===== STOCK ALL (IMEI PER TOKO) ===== */
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

  /* ===== BRAND LIST ===== */
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

        // ===== EXISTING (JANGAN DIHAPUS) =====
        bundlingOptions: [],
        selectedBundlingIndex: null,
        qtyBundling: 0,
        totalHarga: 0,

        // ===== PREVIEW BUNDLING =====
        namaBundling1: "",
        hargaBundling1: 0,
        namaBundling2: "",
        hargaBundling2: 0,
        namaBundling3: "",
        hargaBundling3: 0,
      },
    ]);
  };

  const getBarangFiltered = (namaBrand, kategoriBarang) => {
    const map = new Map();

    masterBarang.forEach((b) => {
      if (b.namaBrand === namaBrand && b.kategoriBarang === kategoriBarang) {
        map.set(b.namaBarang, {
          id: b.id,
          namaBarang: b.namaBarang,
          sku: b.sku,
        });
      }
    });

    transaksiPembelian.forEach((t) => {
      if (t.NAMA_BRAND === namaBrand && t.KATEGORI_BRAND === kategoriBarang) {
        map.set(t.NAMA_BARANG, {
          id: `trx-${t.id}`,
          namaBarang: t.NAMA_BARANG,
          sku: `${t.NAMA_BRAND}_${t.NAMA_BARANG}`.replace(/\s+/g, "_"),
        });
      }
    });

    return Array.from(map.values());
  };

  /* ================= RENDER ================= */
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">INPUT BARANG</h2>

      {value.map((item, idx) => {
        const barangFiltered = getBarangFiltered(
          item.namaBrand,
          item.kategoriBarang
        );

        /* ===== IMEI SESUAI TOKO LOGIN ===== */
        const imeiByToko = (() => {
          if (!tokoLogin || !item.sku) return [];
          const tokoStock = stockAll[tokoLogin];
          if (!tokoStock || !tokoStock[item.sku]) return [];
          const im = tokoStock[item.sku].imei;
          if (Array.isArray(im)) return im;
          if (typeof im === "string") return [im];
          return [];
        })();

        const isBundlingAllowed = ["MOTOR LISTRIK", "SEPEDA LISTRIK"].includes(
          (item.kategoriBarang || "").toUpperCase()
        );

        return (
          <div key={item.id} className="border rounded-xl p-4 bg-white space-y-3">

            {/* KATEGORI */}
            <div>
              <label className="text-xs font-semibold">Kategori Barang</label>
              <input
                list={`kategori-${idx}`}
                className="input"
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
              />
              <datalist id={`kategori-${idx}`}>
                {KATEGORI_DEFAULT.map((k) => (
                  <option key={k} value={k} />
                ))}
              </datalist>
            </div>

            {/* BRAND */}
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

            {/* BARANG */}
            <div>
              <label className="text-xs font-semibold">Nama Barang</label>
              <select
                className="input"
                value={item.namaBarang}
                onChange={(e) => {
                  const barang = transaksiPembelian.find(
                    (t) =>
                      t.NAMA_BRAND === item.namaBrand &&
                      t.NAMA_BARANG === e.target.value
                  );

                  updateItem(idx, {
                    namaBarang: e.target.value,
                    sku: `${item.namaBrand}_${e.target.value}`.replace(/\s+/g, "_"),
                    hargaUnit: Number(barang?.HARGA_UNIT || 0),
                    skemaHarga: "SRP",

                    namaBundling1: barang?.NAMA_BANDLING_1 || "",
                    hargaBundling1: Number(barang?.HARGA_BANDLING_1 || 0),
                    namaBundling2: barang?.NAMA_BANDLING_2 || "",
                    hargaBundling2: Number(barang?.HARGA_BANDLING_2 || 0),
                    namaBundling3: barang?.NAMA_BANDLING_3 || "",
                    hargaBundling3: Number(barang?.HARGA_BANDLING_3 || 0),
                  });
                }}
              >
                <option value="">-- Pilih Barang --</option>
                {barangFiltered.map((b) => (
                  <option key={b.id} value={b.namaBarang}>
                    {b.namaBarang}
                  </option>
                ))}
              </select>
            </div>

            {/* IMEI */}
            {isIMEIKategori(item.kategoriBarang) && (
              <div>
                <label className="text-xs font-semibold">IMEI</label>
                <textarea
                  rows={2}
                  className="input"
                  value={(item.imeiList || []).join("\n")}
                  onChange={(e) => {
                    const list = e.target.value
                      .split("\n")
                      .map((x) => x.trim())
                      .filter(Boolean);

                    updateItem(idx, {
                      imeiList: list,
                      qty: list.length,
                      totalHarga: hitungTotal({ ...item, qty: list.length }),
                    });
                  }}
                  list={`imei-${idx}`}
                />
                <datalist id={`imei-${idx}`}>
                  {imeiByToko.map((im) => (
                    <option key={im} value={im} />
                  ))}
                </datalist>
              </div>
            )}

            {/* QTY MANUAL */}
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

            {/* HARGA UNIT */}
            <div>
              <label className="text-xs font-semibold">Harga Unit</label>
              <input
                type="number"
                className="input"
                value={item.hargaUnit}
                readOnly
              />
            </div>

            {/* PREVIEW BUNDLING */}
            {isBundlingAllowed && (
              <div className="grid grid-cols-3 gap-2">
                <input className="input bg-gray-100" readOnly value={item.namaBundling1} />
                <input className="input bg-gray-100" readOnly value={item.namaBundling2} />
                <input className="input bg-gray-100" readOnly value={item.namaBundling3} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
