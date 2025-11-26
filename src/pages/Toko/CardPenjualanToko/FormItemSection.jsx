// src/pages/Toko/CardPenjualanToko/FormItemSection.jsx

import React, { useEffect, useMemo, useState } from "react";
import { FaPlus, FaTrash } from "react-icons/fa";

/*
  Props:
  - value: array of items dari parent (optional, bisa dikosongkan)
  - onChange: function(nextItems)
  - onAddRow: function(item) -> untuk masuk ke tabel transaksi
*/

const KATEGORI_OPTIONS = [
  "MOTOR LISTRIK",
  "SEPEDA LISTRIK",
  "HANDPHONE",
  "ACCESSORIES",
];

export default function FormItemSection({ value = [], onChange, onAddRow }) {
  const [localItem, setLocalItem] = useState({
    kategoriBarang: "",
    namaBrand: "",
    namaBarang: "",
    qty: 1,
    imei: "",
    hargaUnit: 0,
    discount: 0,
  });

  // =============================
  // AUTO HITUNG QTY DARI IMEI
  // =============================
  useEffect(() => {
    const lines = localItem.imei
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length > 0) {
      setLocalItem((prev) => ({
        ...prev,
        qty: lines.length,
      }));
    }
  }, [localItem.imei]);

  // =============================
  // HITUNG TOTAL OTOMATIS
  // =============================
  const total = useMemo(() => {
    const qty = Number(localItem.qty || 0);
    const harga = Number(localItem.hargaUnit || 0);
    const disc = Number(localItem.discount || 0);

    const subtotal = qty * harga;
    const potongan = (disc / 100) * subtotal;
    return subtotal - potongan;
  }, [localItem.qty, localItem.hargaUnit, localItem.discount]);

  const handleChange = (field, val) => {
    setLocalItem((prev) => ({
      ...prev,
      [field]:
        field === "qty" || field === "hargaUnit" || field === "discount"
          ? Number(val)
          : val,
    }));
  };

  // =============================
  // TAMBAH KE TABEL TRANSAKSI
  // =============================
  const handleAdd = () => {
    if (!localItem.namaBarang || !localItem.hargaUnit) {
      alert("Nama barang dan Harga Unit wajib diisi!");
      return;
    }

    onAddRow({
      ...localItem,
    });

    // Reset form item
    setLocalItem({
      kategoriBarang: "",
      namaBrand: "",
      namaBarang: "",
      qty: 1,
      imei: "",
      hargaUnit: 0,
      discount: 0,
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">
            Skema 3 — Kategori Barang
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Input barang, IMEI, jumlah, harga & diskon.
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="px-3 py-2 text-xs rounded-lg bg-indigo-600 text-white flex items-center gap-1 hover:bg-indigo-700"
        >
          <FaPlus /> Tambah
        </button>
      </div>

      {/* FORM BARANG */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">

        {/* Kategori Barang */}
        <div>
          <label className="block mb-1 text-slate-600">
            Kategori Barang
          </label>
          <input
            list="kategori-barang-list"
            value={localItem.kategoriBarang}
            onChange={(e) =>
              handleChange("kategoriBarang", e.target.value)
            }
            placeholder="Pilih / ketik manual"
            className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          <datalist id="kategori-barang-list">
            {KATEGORI_OPTIONS.map((k) => (
              <option key={k} value={k} />
            ))}
          </datalist>
        </div>

        {/* Nama Brand */}
        <div>
          <label className="block mb-1 text-slate-600">
            Nama Brand
          </label>
          <input
            type="text"
            value={localItem.namaBrand}
            onChange={(e) =>
              handleChange("namaBrand", e.target.value)
            }
            placeholder="Bisa otomatis / manual"
            className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>

        {/* Nama Barang */}
        <div className="sm:col-span-2">
          <label className="block mb-1 text-slate-600">
            Nama Barang
          </label>
          <input
            type="text"
            value={localItem.namaBarang}
            onChange={(e) =>
              handleChange("namaBarang", e.target.value)
            }
            placeholder="Contoh: iPhone 12 128GB"
            className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>

        {/* QTY */}
        <div>
          <label className="block mb-1 text-slate-600">
            QTY
          </label>
          <input
            type="number"
            min={1}
            value={localItem.qty}
            onChange={(e) =>
              handleChange("qty", e.target.value)
            }
            className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>

        {/* Harga Unit */}
        <div>
          <label className="block mb-1 text-slate-600">
            Harga Unit
          </label>
          <input
            type="number"
            value={localItem.hargaUnit}
            onChange={(e) =>
              handleChange("hargaUnit", e.target.value)
            }
            className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>

        {/* Diskon */}
        <div>
          <label className="block mb-1 text-slate-600">
            Diskon (%)
          </label>
          <input
            type="number"
            value={localItem.discount}
            onChange={(e) =>
              handleChange("discount", e.target.value)
            }
            className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>

        {/* Harga Total */}
        <div>
          <label className="block mb-1 text-slate-600">
            Harga Total
          </label>
          <input
            type="text"
            readOnly
            value={`Rp ${Number(total).toLocaleString("id-ID")}`}
            className="w-full border border-slate-200 rounded-lg p-2 bg-slate-100 text-slate-600"
          />
        </div>

        {/* IMEI */}
        <div className="sm:col-span-2">
          <label className="block mb-1 text-slate-600">
            No IMEI / No Mesin (Bisa Banyak)
          </label>
          <textarea
            rows={4}
            value={localItem.imei}
            onChange={(e) =>
              handleChange("imei", e.target.value)
            }
            placeholder="1 IMEI per baris"
            className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          <p className="text-[10px] text-slate-400 mt-1">
            * Jumlah baris IMEI otomatis menentukan QTY.
          </p>
        </div>
      </div>
    </div>
  );
}
