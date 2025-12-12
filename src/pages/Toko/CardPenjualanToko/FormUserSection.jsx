// =======================
// FormUserSection.jsx — FINAL PATCH TAHAP 1
// =======================
import React from "react";


export default function FormUserSection({
  value,
  onChange,
  users = [],
  tahap,
  tahap1Complete,
  isDateValid,
}) {
  const disabled = tahap < 1; // always false tetapi aman untuk future control

  const handleChange = (key, val) => {
    const next = { ...value, [key]: val };
    onChange(next);
  };

  return (
    <div className="relative">
      {/* 🔥 INDIKATOR TAHAP 1 */}
      <div className="absolute top-1 right-2 text-[11px] font-semibold">
        {tahap1Complete ? (
          <span className="text-green-600">🟢 Tahap 1 Selesai</span>
        ) : (
          <span className="text-red-500">🔴 Tahap 1 Belum Lengkap</span>
        )}
      </div>

      <h2 className="font-bold text-slate-700 text-sm mb-2">
        DATA PELANGGAN (TAHAP 1)
      </h2>

      <div className="space-y-2">

        {/* =======================
            TANGGAL (LOCK TIDAK BOLEH MUNDUR)
        ======================== */}
        <div>
          <label className="text-xs font-semibold">Tanggal</label>
          <input
            type="date"
            className="w-full border rounded-lg px-2 py-1 text-sm bg-white"
            value={value.tanggalPembelian}
            onChange={(e) => {
              if (!isDateValid(e.target.value)) {
                alert("❌ Tanggal tidak boleh mundur.");
                return;
              }
              handleChange("tanggalPembelian", e.target.value);
            }}
            disabled={disabled}
          />
        </div>

        {/* =======================
            NO FAKTUR — AUTO, TIDAK BISA DI EDIT
        ======================== */}
        <div>
          <label className="text-xs font-semibold">No Faktur (Auto)</label>
          <input
            type="text"
            className="w-full border rounded-lg px-2 py-1 text-sm bg-gray-100"
            value={value.noFaktur}
            readOnly
          />
        </div>

        {/* =======================
            NAMA PELANGGAN — WAJIB
        ======================== */}
        <div>
          <label className="text-xs font-semibold">Nama Pelanggan *</label>
          <input
            type="text"
            className="w-full border rounded-lg px-2 py-1 text-sm bg-white"
            value={value.namaPelanggan}
            onChange={(e) =>
              handleChange("namaPelanggan", e.target.value.toUpperCase())
            }
          />
        </div>

        {/* =======================
            ID PELANGGAN — WAJIB
        ======================== */}
        <div>
          <label className="text-xs font-semibold">ID Pelanggan *</label>
          <input
            type="text"
            className="w-full border rounded-lg px-2 py-1 text-sm bg-white"
            value={value.idPelanggan}
            onChange={(e) =>
              handleChange("idPelanggan", e.target.value.toUpperCase())
            }
          />
        </div>

        {/* =======================
            NO TELEPON — WAJIB
        ======================== */}
        <div>
          <label className="text-xs font-semibold">No Telepon *</label>
          <input
            type="text"
            className="w-full border rounded-lg px-2 py-1 text-sm bg-white"
            value={value.noTelepon}
            onChange={(e) =>
              handleChange("noTelepon", e.target.value.toUpperCase())
            }
          />
        </div>

        {/* =======================
            SALES — WAJIB
        ======================== */}
        <div>
          <label className="text-xs font-semibold">Nama Sales *</label>
          <select
            className="w-full border rounded-lg px-2 py-1 text-sm bg-white"
            value={value.namaSales}
            onChange={(e) => handleChange("namaSales", e.target.value)}
          >
            <option value="">-- PILIH SALES --</option>
            {users.map((u) => (
              <option key={u.username} value={u.name}>
              {u.name}
            </option>
            ))}
          </select>
        </div>

        {/* =======================
            SALES TITIPAN — WAJIB
        ======================== */}
        <div>
          <label className="text-xs font-semibold">Sales Titipan *</label>
          <input
            type="text"
            className="w-full border rounded-lg px-2 py-1 text-sm bg-white"
            value={value.salesTitipan}
            onChange={(e) =>
              handleChange("salesTitipan", e.target.value.toUpperCase())
            }
          />
        </div>
      </div>
    </div>
  );
}
