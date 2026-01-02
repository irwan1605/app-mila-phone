// ===================================================
// FormUserSection.jsx — FINAL FIX 100%
// Master Toko + Master Sales REALTIME
// TERHUBUNG LANGSUNG KE TAHAP 2
// ===================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  listenMasterToko,
  listenMasterSales,
} from "../../../services/FirebaseService";

export default function FormUserSection({ value = {}, onChange }) {
  /* ================= STATE ================= */

  const [masterToko, setMasterToko] = useState([]);
  const [masterSales, setMasterSales] = useState([]);

  /* ================= LISTENER REALTIME ================= */

  useEffect(() => {
    const unsubToko = listenMasterToko((rows) => {
      setMasterToko(Array.isArray(rows) ? rows : []);
    });

    const unsubSales = listenMasterSales((rows) => {
      setMasterSales(Array.isArray(rows) ? rows : []);
    });

    return () => {
      unsubToko && unsubToko();
      unsubSales && unsubSales();
    };
  }, []);
  // =================================================
  // SAFE FORM
  // =================================================
  const form = useMemo(
    () => ({
      tanggal: value?.tanggal || "",
      noFaktur: value?.noFaktur || "",
      namaPelanggan: value?.namaPelanggan || "",
      idPelanggan: value?.idPelanggan || "",
      noTlpPelanggan: value?.noTlpPelanggan || "",

      // 🔥 PENTING
      namaTokoId: value?.namaTokoId || "",
      namaToko: value?.namaToko || "",

      namaSales: value?.namaSales || "",
      salesTitipan: value?.salesTitipan || "",
    }),
    [value]
  );

  const update = (patch) => {
    onChange({ ...form, ...patch });
  };


 // =================================================
  // FILTER SALES (OPSIONAL – TIDAK MEMBLOKIR)
  // =================================================
  const salesList = useMemo(() => {
    if (!form.namaToko) return [];
    return masterSales.filter(
      (s) => s?.toko === form.namaToko || !s?.toko
    );
  }, [masterSales, form.namaToko]);

  const phone = value?.noTlpPelanggan ?? "";

  const salesTitipanList = useMemo(() => {
    if (!form.namaToko) return [];
    return masterSales.filter(
      (s) => s?.toko === form.namaToko && s?.jenis === "SALES_TITIPAN"
    );
  }, [masterSales, form.namaToko]);

  /* ================= RENDER ================= */

  return (
    <div className="space-y-3">
      <h2 className="font-bold mb-2">👤 DATA PENJUALAN — TAHAP 1</h2>

      {/* TANGGAL */}
      <div>
        <label className="text-xs font-semibold">Tanggal</label>
        <input
          type="date"
          className="w-full border rounded-lg px-2 py-1 text-sm text-black"
          value={form.tanggal}
          disabled
        />
      </div>

      {/* NO FAKTUR */}
      <div>
        <label className="text-xs font-semibold">No Faktur</label>
        <input
          className="w-full border rounded-lg px-2 py-1 text-sm bg-gray-100 text-black"
          value={form.noFaktur}
          disabled
        />
      </div>

      {/* NAMA PELANGGAN */}
      <div>
        <label className="text-xs font-semibold">Nama Pelanggan</label>
        <input
          className="w-full border rounded px-2 py-1 text-black"
          value={form.namaPelanggan}
          onChange={(e) => update({ namaPelanggan: e.target.value })}
        />
      </div>

      {/* ID PELANGGAN */}
      <div>
        <label className="text-xs font-semibold">ID Pelanggan</label>
        <input
          className="w-full border rounded px-2 py-1 text-black"
          value={form.idPelanggan}
          onChange={(e) => update({ idPelanggan: e.target.value })}
        />
      </div>

      <div>
        <label className="text-xs font-semibold">No Tlp Pelanggan</label>
        <input
          type="tel"
          className="w-full border rounded-lg px-2 py-1 text-sm"
          placeholder="08xxxxxxxxxx"
          value={phone}
          onChange={(e) =>
            onChange({
              ...value,
              noTlpPelanggan: e.target.value,
            })
          }
        />
      </div>

     {/* ================= TOKO (FIX UTAMA) ================= */}
     <div>
        <label className="text-xs font-semibold">Nama Toko</label>
        <select
          className="w-full border rounded px-2 py-1"
          value={form.namaTokoId}
          onChange={(e) => {
            const tokoId = e.target.value;
            const toko = masterToko.find((t) => t.id === tokoId);

            update({
              namaTokoId: tokoId,         // 🔥 DIPAKAI FIREBASE
              namaToko: toko?.nama || "", // 🔥 UNTUK DISPLAY
              namaSales: "",
              salesTitipan: "",
            });
          }}
        >
          <option value="">-- Pilih Toko --</option>
          {masterToko.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nama}
            </option>
          ))}
        </select>
      </div>

      {/* NAMA SALES */}
      <div>
        <label className="text-xs font-semibold">Nama Sales</label>
        <select
          className="w-full border rounded px-2 py-1 text-black"
          disabled={!form.namaToko}
          value={form.namaSales}
          onChange={(e) => update({ namaSales: e.target.value })}
        >
          <option value="">-- Pilih Sales --</option>
          {masterSales.map((s) => (
            <option key={s.id} value={s.namaSales}>
              {s.namaSales}
            </option>
          ))}
        </select>
      </div>

      {/* SALES TITIPAN */}
      <div>
        <label className="text-xs font-semibold">Sales Titipan</label>
        <select
          className="w-full border rounded px-2 py-1 text-black"
          disabled={!form.namaToko}
          value={form.salesTitipan}
          onChange={(e) => update({ salesTitipan: e.target.value })}
        >
          <option value="">-- Pilih Sales Titipan --</option>
          {masterSales.map((s) => (
            <option key={s.id} value={s.namaSales}>
              {s.namaSales}
            </option>
          ))}
        </select>
      </div>

      <p className="text-[11px] text-gray-500">
        ✅ Lengkapi Tahap 1 → TAHAP 2 otomatis aktif
      </p>
    </div>
  );
}
