import React, { useEffect, useState } from "react";
import { listenMasterBarang } from "../../../services/FirebaseService";

// ================= KONSTANTA =================
const KATEGORI_IMEI = [
  "MOTOR LISTRIK",
  "SEPEDA LISTRIK",
  "HANDPHONE",
];

const SKEMA_HARGA = ["SRP", "GROSIR", "RESELLER"];

const isIMEIKategori = (kat) =>
  KATEGORI_IMEI.includes((kat || "").toUpperCase());

// ================= COMPONENT =================
export default function FormItemSection({
  value = [],
  onChange,
  disabled = false,
  onSearchIMEI,
  onSearchNamaBarang,
}) {
  const [masterBarang, setMasterBarang] = useState([]);
  const [kategoriList, setKategoriList] = useState([]);
  const [brandList, setBrandList] = useState([]);

  // ================= LOAD MASTER BARANG =================
  useEffect(() => {
    const unsub = listenMasterBarang((list) => {
      setMasterBarang(list || []);

      const kSet = new Set();
      const bSet = new Set();

      (list || []).forEach((x) => {
        if (x.kategoriBarang) kSet.add(x.kategoriBarang);
        if (x.namaBrand) bSet.add(x.namaBrand);
      });

      setKategoriList([...kSet]);
      setBrandList([...bSet]);
    });

    return () => unsub && unsub();
  }, []);

  // ================= HELPER =================
  const updateItem = (index, patch) => {
    const updated = [...value];
    updated[index] = { ...updated[index], ...patch };
    onChange(updated);
  };

  const tambahItem = () => {
    onChange([
      ...value,
      {
        id: Date.now(),
        sku: "",
        kategoriBarang: "",
        namaBrand: "",
        namaBarang: "",
        imeiList: [],
        qty: 0,
        skemaHarga: "",
        hargaUnit: 0,
        discount: 0,
        bundling: [],
      },
    ]);
  };

  const filterBarang = (kategori, brand) =>
    masterBarang.filter(
      (b) =>
        (!kategori || b.kategoriBarang === kategori) &&
        (!brand || b.namaBrand === brand)
    );

  // ================= RENDER =================
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">INPUT BARANG</h2>

      {value.map((item, index) => {
        const barangList = filterBarang(
          item.kategoriBarang,
          item.namaBrand
        );

        return (
          <div
            key={item.id}
            className="border rounded-xl p-4 bg-white space-y-3"
          >
            {/* KATEGORI */}
            <div>
              <label className="text-xs font-semibold">Kategori Barang</label>
              <select
                className="input"
                disabled={disabled}
                value={item.kategoriBarang}
                onChange={(e) =>
                  updateItem(index, {
                    kategoriBarang: e.target.value,
                    namaBrand: "",
                    namaBarang: "",
                    imeiList: [],
                    qty: 0,
                  })
                }
              >
                <option value="">-- Pilih Kategori --</option>
                {kategoriList.map((k) => (
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
                className="input"
                disabled={disabled || !item.kategoriBarang}
                value={item.namaBrand}
                onChange={(e) =>
                  updateItem(index, {
                    namaBrand: e.target.value,
                    namaBarang: "",
                  })
                }
              >
                <option value="">-- Pilih Brand --</option>
                {brandList.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* NAMA BARANG */}
            <div>
              <label className="text-xs font-semibold">Nama Barang</label>
              <select
                className="input"
                disabled={disabled || !item.namaBrand}
                value={item.namaBarang}
                onChange={(e) => {
                  const barang = masterBarang.find(
                    (x) => x.namaBarang === e.target.value
                  );
                  updateItem(index, {
                    namaBarang: barang?.namaBarang || "",
                    sku: barang?.sku || "",
                    hargaUnit: barang?.hargaSRP || 0,
                    skemaHarga: "SRP",
                    qty: isIMEIKategori(item.kategoriBarang) ? 0 : 1,
                  });
                }}
              >
                <option value="">-- Pilih Barang --</option>
                {barangList.map((b) => (
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
                  className="input"
                  rows={2}
                  placeholder="1 IMEI per baris"
                  value={(item.imeiList || []).join("\n")}
                  onChange={(e) => {
                    const list = e.target.value
                      .split("\n")
                      .map((x) => x.trim())
                      .filter(Boolean);
                    updateItem(index, {
                      imeiList: list,
                      qty: list.length,
                    });
                  }}
                />
                <button
                  type="button"
                  className="text-xs text-indigo-600 mt-1"
                  onClick={() => onSearchIMEI(index)}
                >
                  Cari dari stok
                </button>
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
                    updateItem(index, { qty: Number(e.target.value) })
                  }
                />
              </div>
            )}

            {/* SKEMA HARGA */}
            <div>
              <label className="text-xs font-semibold">Skema Harga</label>
              <select
                className="input"
                value={item.skemaHarga}
                onChange={(e) =>
                  updateItem(index, { skemaHarga: e.target.value })
                }
              >
                <option value="">-- Pilih --</option>
                {SKEMA_HARGA.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* HARGA */}
            <div>
              <label className="text-xs font-semibold">Harga Unit</label>
              <input
                type="number"
                className="input"
                value={item.hargaUnit}
                onChange={(e) =>
                  updateItem(index, {
                    hargaUnit: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>
        );
      })}

      <button
        type="button"
        disabled={disabled}
        onClick={tambahItem}
        className="w-full py-2 bg-green-600 text-white rounded-lg"
      >
        + Tambah Barang
      </button>
    </div>
  );
}
