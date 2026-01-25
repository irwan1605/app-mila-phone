// ===================================================
// FormUserSection.jsx — FINAL FIX 100%
// Master Toko + Master Sales REALTIME
// TERHUBUNG LANGSUNG KE TAHAP 2
// ===================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  listenMasterToko,
  listenMasterSales,
  listenKaryawan,
  listenMasterStoreHead,
} from "../../../services/FirebaseService";

export default function FormUserSection({ value = {}, onChange }) {
  /* ================= STATE ================= */

  const [masterToko, setMasterToko] = useState([]);
  const [masterSales, setMasterSales] = useState([]);
  const [masterKaryawan, setMasterKaryawan] = useState([]);
  const [masterStoreHead, setMasterStoreHead] = useState([]);

  /* ================= LISTENER REALTIME ================= */

  useEffect(() => {
    const unsubToko = listenMasterToko(setMasterToko);
    const unsubSales = listenMasterSales(setMasterSales);
    const unsubKar = listenKaryawan(setMasterKaryawan);
    const unsubStoreHead = listenMasterStoreHead(setMasterStoreHead); // ✅

    return () => {
      unsubToko && unsubToko();
      unsubSales && unsubSales();
      unsubKar && unsubKar();
      unsubStoreHead && unsubStoreHead(); // ✅
    };
  }, []);

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

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("userLogin") || "{}");

    if (user?.role === "pic_toko" && user?.tokoId) {
      const toko = masterToko.find((t) => t.id === user.tokoId);
      if (toko) {
        onChange({
          ...value,
          namaTokoId: toko.id,
          namaToko: toko.nama,
        });
      }
    }
  }, [masterToko]);

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
      namaTokoId: value?.namaTokoId || "",
      namaToko: value?.namaToko || "",
      namaSales: value?.namaSales || "",
      salesHandle: value?.salesHandle || "",
      storeHead: value?.storeHead || "",
    }),
    [value]
  );

  const update = (patch) => {
    onChange({ ...form, ...patch });
  };

  /* ================= FORMAT TELP ================= */

  const formatPhone = (val) => {
    const num = val.replace(/\D/g, "").slice(0, 13);

    if (num.length <= 4) return num;
    if (num.length <= 8) return num.replace(/(\d{4})(\d+)/, "$1-$2");

    return num.replace(/(\d{4})(\d{4})(\d+)/, "$1-$2-$3");
  };

  /* ================= FILTER DATA ================= */

  // SALES = hanya yg bertugas di toko + jabatan sales / leader
  // ================= FILTER SALES DARI MASTER SALES =================
  const salesByToko = useMemo(() => {
    if (!form.namaToko) return [];

    return masterSales.filter((s) => s?.namaToko === form.namaToko);
  }, [masterSales, form.namaToko]);

  // SALES HANDLE = semua karyawan
  const salesHandleList = useMemo(() => {
    return masterKaryawan;
  }, [masterKaryawan]);

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

      {/* NO TELP */}
      <div>
        <label className="text-xs font-semibold">No Tlp Pelanggan</label>
        <input
          type="tel"
          className="w-full border rounded-lg px-2 py-1 text-sm"
          placeholder="0857-8282-8928"
          value={form.noTlpPelanggan}
          onChange={(e) =>
            update({
              noTlpPelanggan: formatPhone(e.target.value),
            })
          }
        />
      </div>

      {/* TOKO */}
      <div>
        <label className="text-xs font-semibold">Nama Toko</label>
        <select
          className="w-full border rounded px-2 py-1"
          value={form.namaTokoId}
          onChange={(e) => {
            const tokoId = e.target.value;
            const toko = masterToko.find((t) => t.id === tokoId);

            update({
              namaTokoId: tokoId,
              namaToko: toko?.nama || "",
              namaSales: "",
              salesHandle: "",
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

      {/* ================= STORE HEAD ================= */}
      <div>
        <label className="text-xs font-semibold">Store Head</label>

        <input
          list="list-store-head"
          className="w-full border rounded px-2 py-1"
          placeholder="Pilih / ketik Store Head"
          value={form.storeHead}
          onChange={(e) => update({ storeHead: e.target.value })}
        />

        <datalist id="list-store-head">
          {masterStoreHead
            .filter((s) => s.namaToko === form.namaToko)
            .map((s) => (
              <option key={s.id} value={s.namaSH} />
            ))}
        </datalist>
      </div>

      {/* ================= NAMA SALES ================= */}
      {/* ================= NAMA SALES ================= */}
      <div>
        <label className="text-xs font-semibold">Nama Sales</label>

        <input
          list="list-sales"
          className="w-full border rounded px-2 py-1"
          disabled={!form.namaToko}
          placeholder="Pilih / ketik nama sales"
          value={form.namaSales}
          onChange={(e) => update({ namaSales: e.target.value })}
        />

        <datalist id="list-sales">
          {salesByToko.map((s) => (
            <option key={s.id} value={s.namaSales} />
          ))}
        </datalist>
      </div>

      {/* ================= SALES HANDLE ================= */}
      <div>
        <label className="text-xs font-semibold">Sales Handle</label>

        <input
          list="list-handle"
          className="w-full border rounded px-2 py-1"
          placeholder="Pilih / ketik nama handle"
          value={form.salesHandle}
          onChange={(e) => update({ salesHandle: e.target.value })}
        />

        <datalist id="list-handle">
          {salesHandleList.map((s) => (
            <option key={s.id} value={s.NAMA} />
          ))}
        </datalist>
      </div>

      <p className="text-[11px] text-gray-500">
        ✅ Lengkapi Tahap 1 → TAHAP 2 otomatis aktif
      </p>
    </div>
  );
}
