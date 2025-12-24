// ============================================================
// FormUserSection.jsx — FINAL STABLE (NO WARNING)
// Dropdown Toko FIX (Superadmin & PIC)
// ============================================================

import React, { useEffect, useMemo, useRef } from "react";

export default function FormUserSection({
  value,
  onChange,
  users = [],
  masterToko = [],
  userLogin = {},
  tahap = 1,
}) {
  /* ================= ROLE ================= */
  const isSuperAdmin =
    userLogin?.role === "superadmin" || userLogin?.role === "admin";

  const isPicToko =
    typeof userLogin?.role === "string" &&
    userLogin.role.startsWith("pic_toko");

  /* ================= MASTER TOKO (STRING) ================= */
  const tokoNames = useMemo(
    () => masterToko.map((t) => t?.namaToko).filter(Boolean),
    [masterToko]
  );

  /* ================= AUTO SET TOKO PIC (ONCE) ================= */
  const hasAutoSetRef = useRef(false);

  useEffect(() => {
    if (!isPicToko) return;
    if (hasAutoSetRef.current) return;
    if (!userLogin?.tokoId) return;

    const toko = masterToko.find(
      (t) => String(t.id) === String(userLogin.tokoId)
    );

    if (toko?.namaToko) {
      hasAutoSetRef.current = true;
      onChange({
        ...value,
        namaToko: toko.namaToko,
      });
    }
  }, [isPicToko, userLogin, masterToko, value, onChange]);

  /* ================= VALIDASI MANUAL INPUT ================= */
  const handleTokoChange = (val) => {
    const upper = val.toUpperCase();

    // boleh ketik, tapi harus cocok master
    if (upper === "" || tokoNames.includes(upper)) {
      onChange({ ...value, namaToko: upper });
    }
  };

  /* ================= RENDER ================= */
  return (
    <div>
      <h2 className="font-bold text-sm mb-3">🧾 DATA PELANGGAN (TAHAP 1)</h2>

      <div className="space-y-3">
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

        {/* NAMA TOKO — FINAL FIX */}
        <div>
          <label className="text-xs font-semibold">Nama Toko *</label>
          <input
            list="list-toko"
            className="w-full border rounded-lg px-2 py-1 text-sm"
            value={value.namaToko}
            disabled={isPicToko}
            placeholder={
              isPicToko ? "Otomatis sesuai akun" : "Pilih / ketik nama toko"
            }
            onChange={(e) => handleTokoChange(e.target.value)}
          />
          <datalist id="list-toko">
            {tokoNames.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>

          {value.namaToko && !tokoNames.includes(value.namaToko) && (
            <p className="text-xs text-red-500 mt-1">
              Nama toko tidak terdaftar di MASTER TOKO
            </p>
          )}
        </div>

        {/* NAMA PELANGGAN */}
        <div>
          <label className="text-xs font-semibold">Nama Pelanggan *</label>
          <input
            className="w-full border rounded-lg px-2 py-1 text-sm"
            value={value.namaPelanggan}
            onChange={(e) =>
              onChange({
                ...value,
                namaPelanggan: e.target.value.toUpperCase(),
              })
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
              onChange({
                ...value,
                idPelanggan: e.target.value.toUpperCase(),
              })
            }
          />
        </div>

        {/* NO TELP */}
        <div>
          <label className="text-xs font-semibold">No Telepon *</label>
          <input
            className="w-full border rounded-lg px-2 py-1 text-sm"
            value={value.noTelepon}
            onChange={(e) => onChange({ ...value, noTelepon: e.target.value })}
          />
        </div>

        {/* SALES */}
        <div>
          <label className="text-xs font-semibold">Nama Sales *</label>
          <select
            className="w-full border rounded-lg px-2 py-1 text-sm"
            value={value.namaSales}
            onChange={(e) => onChange({ ...value, namaSales: e.target.value })}
          >
            <option value="">-- PILIH SALES --</option>
            {users.map((u) => (
              <option key={u.id} value={u.name}>
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
              onChange({ ...value, salesTitipan: e.target.value })
            }
          >
            <option value="">-- PILIH --</option>
            {users.map((u) => (
              <option key={u.id} value={u.name}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
