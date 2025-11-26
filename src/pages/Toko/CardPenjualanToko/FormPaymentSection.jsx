// src/pages/Toko/CardPenjualanToko/FormPaymentSection.jsx

import React, { useEffect } from "react";

/*
  Props:
  - value: {
      kategoriBayar,
      paymentMethod,
      mdr,
      dpUser,
      tenor,
      status
    }
  - onChange: function(nextValue)
*/

const KATEGORI_BAYAR = ["CASH", "KREDIT", "DEBIT CARD"];

const PAYMENT_METHOD = [
  "BLIBLI INSTORE",
  "AKULAKU MARKETPLACE",
  "TOKOPEDIA MARKETPLACE",
  "LAZADA MARKETPLACE",
  "TIKTOK MARKETPLACE",
  "SHOPEE MARKETPLACE",
  "HOME CREDIT MARKETPLACE",
  "KREDIVO BARCODE VOUCER PROMO",
  "KREDIVO MARKETPLACE",
];

const MDR_OPTIONS = ["5%", "6%"];

export default function FormPaymentSection({ value, onChange }) {
  // Auto set status saat kategori bayar berubah
  useEffect(() => {
    if (value.kategoriBayar === "CASH" || value.kategoriBayar === "DEBIT CARD") {
      onChange({
        ...value,
        status: "LUNAS",
        dpUser: "",
        tenor: "",
      });
    } else if (value.kategoriBayar === "KREDIT") {
      onChange({
        ...value,
        status: "PIUTANG",
      });
    }
    // eslint-disable-next-line
  }, [value.kategoriBayar]);

  const handleChange = (field, val) => {
    onChange({
      ...value,
      [field]: val,
    });
  };

  const showKreditField = value.kategoriBayar === "KREDIT";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="mb-3">
        <h2 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">
          Skema 2 — Payment
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Pengaturan kategori bayar, metode, serta status pembayaran.
        </p>
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">

        {/* Kategori Bayar */}
        <div>
          <label className="block mb-1 text-slate-600">
            Kategori Bayar
          </label>
          <select
            value={value.kategoriBayar || ""}
            onChange={(e) =>
              handleChange("kategoriBayar", e.target.value)
            }
            className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          >
            <option value="">Pilih Kategori</option>
            {KATEGORI_BAYAR.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </div>

        {/* Status (Auto) */}
        <div>
          <label className="block mb-1 text-slate-600">
            Status
          </label>
          <input
            type="text"
            value={value.status || ""}
            readOnly
            className="w-full border border-slate-200 rounded-lg p-2 bg-slate-100 text-slate-500 cursor-not-allowed"
          />
        </div>

        {/* Payment Method */}
        <div>
          <label className="block mb-1 text-slate-600">
            Payment Method
          </label>
          <select
            value={value.paymentMethod || ""}
            onChange={(e) =>
              handleChange("paymentMethod", e.target.value)
            }
            className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          >
            <option value="">Pilih Method</option>
            {PAYMENT_METHOD.map((pm) => (
              <option key={pm} value={pm}>
                {pm}
              </option>
            ))}
          </select>
        </div>

        {/* MDR */}
        <div>
          <label className="block mb-1 text-slate-600">
            MDR
          </label>
          <select
            value={value.mdr || ""}
            onChange={(e) =>
              handleChange("mdr", e.target.value)
            }
            className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          >
            <option value="">Pilih MDR</option>
            {MDR_OPTIONS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>

        {/* DP USER (muncul hanya jika KREDIT) */}
        {showKreditField && (
          <div>
            <label className="block mb-1 text-slate-600">
              DP User
            </label>
            <input
              type="number"
              value={value.dpUser || ""}
              onChange={(e) =>
                handleChange("dpUser", e.target.value)
              }
              className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>
        )}

        {/* TENOR (muncul hanya jika KREDIT) */}
        {showKreditField && (
          <div>
            <label className="block mb-1 text-slate-600">
              Tenor
            </label>
            <input
              type="text"
              value={value.tenor || ""}
              onChange={(e) =>
                handleChange("tenor", e.target.value)
              }
              placeholder="Contoh: 6x, 12x"
              className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-indigo-400"
            />
          </div>
        )}
      </div>

      {/* Hint */}
      <div className="mt-auto pt-3">
        <p className="text-[11px] text-slate-400">
          * STATUS otomatis: <b>LUNAS</b> untuk CASH & DEBIT, <b>PIUTANG</b> untuk KREDIT.  
          * DP & Tenor hanya muncul jika memilih KREDIT.
        </p>
      </div>
    </div>
  );
}
