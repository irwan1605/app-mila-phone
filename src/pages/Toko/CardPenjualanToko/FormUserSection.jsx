// src/pages/Toko/CardPenjualanToko/FormUserSection.jsx

import React, { useEffect } from "react";

/*
  Props:
  - value: object {
      tanggalPembelian,
      noFaktur,
      idPelanggan,
      noTelepon,
      namaToko,
      namaSales,
      salesTitipan
    }
  - onChange: function(nextValue)
  - users: array dari Master Karyawan / Users (untuk autocomplete Sales)
*/

export default function FormUserSection({ value, onChange, users = [] }) {
  // Update nama toko otomatis jika kosong
  useEffect(() => {
    if (!value.tanggalPembelian) {
      handleChange("tanggalPembelian", new Date().toISOString().slice(0, 10));
    }
    // eslint-disable-next-line
  }, []);

  const handleChange = (field, val) => {
    onChange({
      ...value,
      [field]: val,
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-3">
        <h2 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">
          Skema 1 — Data User
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Informasi pelanggan, toko, dan sales.
        </p>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">

        {/* Tanggal Pembelian */}
        <div>
          <label className="block mb-1 text-slate-600">
            Tanggal Pembelian
          </label>
          <input
            type="date"
            value={value.tanggalPembelian || ""}
            onChange={(e) =>
              handleChange("tanggalPembelian", e.target.value)
            }
            className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>

        {/* No Faktur / Invoice */}
        <div>
          <label className="block mb-1 text-slate-600">
            No Faktur / Invoice
          </label>
          <input
            type="text"
            value={value.noFaktur || ""}
            onChange={(e) => handleChange("noFaktur", e.target.value)}
            placeholder="Auto jika dikosongkan"
            className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>

        {/* ID Pelanggan */}
        <div>
          <label className="block mb-1 text-slate-600">
            ID Pelanggan
          </label>
          <input
            type="text"
            value={value.idPelanggan || ""}
            onChange={(e) =>
              handleChange("idPelanggan", e.target.value)
            }
            className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>

        {/* No Telepon */}
        <div>
          <label className="block mb-1 text-slate-600">
            No Telepon
          </label>
          <input
            type="text"
            value={value.noTelepon || ""}
            onChange={(e) =>
              handleChange("noTelepon", e.target.value)
            }
            className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>

        {/* Nama Toko (Auto, Readonly) */}
        <div>
          <label className="block mb-1 text-slate-600">
            Nama Toko
          </label>
          <input
            type="text"
            value={value.namaToko || ""}
            readOnly
            className="w-full border border-slate-200 rounded-lg p-2 bg-slate-100 text-slate-500 cursor-not-allowed"
          />
        </div>

        {/* Nama Sales (Autocomplete dari Master Karyawan / Users) */}
        <div>
          <label className="block mb-1 text-slate-600">
            Nama Sales
          </label>
          <input
            list="list-sales"
            value={value.namaSales || ""}
            onChange={(e) =>
              handleChange("namaSales", e.target.value)
            }
            placeholder="Pilih dari data karyawan"
            className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          <datalist id="list-sales">
            {users.map((u) => (
              <option
                key={u.id || u.uid || u.email}
                value={u.NAMA || u.name || u.nama || ""}
              />
            ))}
          </datalist>
        </div>

        {/* Sales Titipan */}
        <div className="sm:col-span-2">
          <label className="block mb-1 text-slate-600">
            Sales Titipan
          </label>
          <input
            type="text"
            value={value.salesTitipan || ""}
            onChange={(e) =>
              handleChange("salesTitipan", e.target.value)
            }
            placeholder="Jika ada sales titipan"
            className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>
      </div>

      {/* Hint */}
      <div className="mt-auto pt-3">
        <p className="text-[11px] text-slate-400">
          * Nama toko otomatis dari dashboard.  
          * Nama Sales bisa dipilih dari Master Karyawan.
        </p>
      </div>
    </div>
  );
}
