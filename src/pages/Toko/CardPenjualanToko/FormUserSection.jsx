import React, { useEffect, useMemo } from "react";

export default function FormUserSection({
  value,
  onChange,
  users = [],
  masterToko = [],
  canSelectToko = false,
  tahap = 1,
}) {
  const handleChange = (key, val) => {
    onChange({ ...value, [key]: val });
  };

  // 🔁 NORMALISASI masterToko (OBJECT → ARRAY)
  const tokoList = useMemo(() => {
    if (Array.isArray(masterToko)) return masterToko;

    // FIREBASE OBJECT → ARRAY
    return Object.keys(masterToko || {}).map((id) => ({
      id,
      ...masterToko[id],
    }));
  }, [masterToko]);

  return (
    <div className="relative">
      <h2 className="font-bold text-slate-700 text-sm mb-3">
        DATA PELANGGAN (TAHAP 1)
      </h2>

      <div className="space-y-2">
        {/* TANGGAL */}
        <div>
          <label className="text-xs font-semibold">Tanggal</label>
          <input
            type="date"
            className="w-full border rounded-lg px-2 py-1 text-sm bg-gray-100"
            value={value.tanggalPembelian}
            readOnly
          />
        </div>

        {/* NO FAKTUR */}
        <div>
          <label className="text-xs font-semibold">No Faktur</label>
          <input
            className="w-full border rounded-lg px-2 py-1 text-sm bg-gray-100"
            value={value.noFaktur}
            readOnly
          />
        </div>

        {/* NAMA PELANGGAN */}
        <div>
          <label className="text-xs font-semibold">Nama Pelanggan *</label>
          <input
            className="w-full border rounded-lg px-2 py-1 text-sm"
            value={value.namaPelanggan}
            onChange={(e) =>
              handleChange("namaPelanggan", e.target.value)
            }
          />
        </div>

        {/* ID PELANGGAN */}
        <div>
          <label className="text-xs font-semibold">ID Pelanggan *</label>
          <input
            className="w-full border rounded-lg px-2 py-1 text-sm"
            value={value.idPelanggan}
            onChange={(e) =>
              handleChange("idPelanggan", e.target.value)
            }
          />
        </div>

        {/* NO TELEPON */}
        <div>
          <label className="text-xs font-semibold">No Telepon *</label>
          <input
            className="w-full border rounded-lg px-2 py-1 text-sm"
            value={value.noTelepon}
            onChange={(e) =>
              handleChange("noTelepon", e.target.value)
            }
          />
        </div>

      {/* =======================
    NAMA TOKO
======================= */}
<div>
  <label className="text-xs font-semibold">Nama Toko *</label>

  {/* SUPERADMIN → BISA PILIH */}
  {canSelectToko ? (
    <select
      className="w-full border rounded-lg px-2 py-1 text-sm bg-white"
      value={value.namaToko}
      onChange={(e) =>
        onChange({ ...value, namaToko: e.target.value })
      }
    >
      <option value="">-- PILIH TOKO --</option>
      {masterToko.map((t) => (
        <option key={t.id} value={t.namaToko}>
          {t.namaToko}
        </option>
      ))}
    </select>
  ) : (
    /* PIC TOKO → AUTO & LOCK */
    <input
      type="text"
      className="w-full border rounded-lg px-2 py-1 text-sm bg-gray-100"
      value={value.namaToko}
      readOnly
    />
  )}
</div>


        {/* SALES */}
        <div>
          <label className="text-xs font-semibold">Nama Sales *</label>
          <select
            className="w-full border rounded-lg px-2 py-1 text-sm"
            value={value.namaSales}
            onChange={(e) => handleChange("namaSales", e.target.value)}
          >
            <option value="">-- PILIH SALES --</option>
            {users.map((u) => (
              <option key={u.id || u.username} value={u.name}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        {/* SALES TITIPAN */}
        <div>
          <label className="text-xs font-semibold">Sales Titipan *</label>
          <select
            className="w-full border rounded-lg px-2 py-1 text-sm"
            value={value.salesTitipan}
            onChange={(e) =>
              handleChange("salesTitipan", e.target.value)
            }
          >
            <option value="">-- PILIH SALES --</option>
            {users.map((u) => (
              <option key={u.id || u.username} value={u.name}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
