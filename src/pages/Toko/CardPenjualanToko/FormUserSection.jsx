// ============================================================
// FormUserSection.jsx — FINAL FIX (MASTER TOKO REALTIME)
// Tahap 1 | Nama Toko AUTO (PIC) & Selectable (Superadmin)
// ============================================================

import React, { useEffect, useMemo } from "react";

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

  /* ================= NORMALISASI MASTER TOKO ================= */
  // masterToko dari Firebase berbentuk OBJECT → kita jadikan ARRAY
  const tokoList = useMemo(() => {
    if (Array.isArray(masterToko)) return masterToko;

    if (masterToko && typeof masterToko === "object") {
      return Object.entries(masterToko).map(([id, v]) => ({
        id,
        namaToko: v?.namaToko || "",
        alamat: v?.alamat || "",
      }));
    }

    return [];
  }, [masterToko]);

  const namaTokoList = useMemo(
    () => tokoList.map((t) => t.namaToko).filter(Boolean),
    [tokoList]
  );

  /* ================= AUTO SET TOKO (PIC TOKO) ================= */
  useEffect(() => {
    if (!isPicToko) return;
    if (!userLogin?.tokoId) return;
    if (!tokoList.length) return;

    const toko = tokoList.find(
      (t) => String(t.id) === String(userLogin.tokoId)
    );

    if (!toko) return;

    if (value.namaToko !== toko.namaToko) {
      onChange({
        ...value,
        namaToko: toko.namaToko,
      });
    }
  }, [isPicToko, userLogin, tokoList, value, onChange]);

  /* ================= HANDLER ================= */
  const setField = (key, val) => {
    onChange({ ...value, [key]: val });
  };
  

  /* ================= RENDER ================= */
  return (
    <div className="space-y-3">
      <h2 className="text-sm font-bold">DATA PELANGGAN — TAHAP 1</h2>

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
            setField("namaPelanggan", e.target.value.toUpperCase())
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
            setField("idPelanggan", e.target.value.toUpperCase())
          }
        />
      </div>

      {/* NO TELEPON */}
      <div>
        <label className="text-xs font-semibold">No Telepon *</label>
        <input
          className="w-full border rounded-lg px-2 py-1 text-sm"
          value={value.noTelepon}
          onChange={(e) => setField("noTelepon", e.target.value)}
        />
      </div>

      {/* ================= NAMA TOKO (FINAL FIX) ================= */}
      <div>
        <label className="text-xs font-semibold">
          Nama Toko {isPicToko && "(Auto)"}
        </label>

        <input
          list="list-toko"
          className={`w-full border rounded-lg px-2 py-1 text-sm ${
            isPicToko ? "bg-gray-100" : ""
          }`}
          value={value.namaToko}
          readOnly={isPicToko}
          onChange={(e) => {
            const val = e.target.value.toUpperCase();

            // VALIDASI: harus sesuai master toko
            if (
              val &&
              !namaTokoList.includes(val) &&
              isSuperAdmin
            ) {
              return;
            }

            setField("namaToko", val);
          }}
        />

        {/* DROPDOWN / AUTOCOMPLETE */}
        {isSuperAdmin && (
          <datalist id="list-toko">
            {namaTokoList.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        )}

        {!isPicToko && (
          <p className="text-[11px] text-gray-500">
            Ketik atau pilih nama toko sesuai Master Toko
          </p>
        )}
      </div>

      {/* SALES */}
      <div>
        <label className="text-xs font-semibold">Nama Sales *</label>
        <select
          className="w-full border rounded-lg px-2 py-1 text-sm"
          value={value.namaSales}
          onChange={(e) => setField("namaSales", e.target.value)}
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
          onChange={(e) => setField("salesTitipan", e.target.value)}
        >
          <option value="">-- PILIH SALES TITIPAN --</option>
          {users.map((u) => (
            <option key={u.id || u.username} value={u.name}>
              {u.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
