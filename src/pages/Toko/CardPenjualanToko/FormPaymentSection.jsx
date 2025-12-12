// ========================================
// FormPaymentSection.jsx — FINAL TAHAP 3
// ========================================
import React, { useEffect } from "react";

export default function FormPaymentSection({
  value,
  onChange,
  tahap,
  tahap2Complete,
  grandTotal,
}) {
  const disabled = tahap < 3; // 🔒 Kunci pembayaran sebelum Tahap 2 complete

  const handleChange = (key, val) => {
    const next = { ...value, [key]: val };
    onChange(next);
  };

  // Adjust status & auto behavior
  useEffect(() => {
    if (value.status === "LUNAS") {
      handleChange("paymentMethod", "");
      handleChange("dpUser", grandTotal || 0);
    }
  }, [value.status, grandTotal]);

  return (
    <div className="relative">
      {/* 🔥 Indikator Tahap 3 */}
      <div className="absolute top-1 right-2 text-[11px] font-semibold">
        {tahap >= 3 ? (
          <span className="text-green-600">🟢 Tahap 3 Aktif</span>
        ) : (
          <span className="text-red-500">🔒 Tahap 3 Terkunci</span>
        )}
      </div>

      <h2 className="font-bold text-slate-700 text-sm mb-2">
        PEMBAYARAN (TAHAP 3)
      </h2>

      <div className="space-y-3">

        {/* ==========================
            STATUS PEMBAYARAN
        ========================== */}
        <div>
          <label className="text-xs font-semibold">Status Pembayaran *</label>
          <select
            className="w-full border rounded-lg px-2 py-1 text-sm"
            disabled={disabled}
            value={value.status}
            onChange={(e) => handleChange("status", e.target.value)}
          >
            <option value="">-- PILIH STATUS --</option>
            <option value="LUNAS">LUNAS</option>
            <option value="PIUTANG">PIUTANG</option>
          </select>
        </div>

        {/* ==========================
            PAYMENT METHOD — MUNCUL HANYA JIKA PIUTANG
        ========================== */}
        {value.status === "PIUTANG" && (
          <div>
            <label className="text-xs font-semibold">Payment Method *</label>
            <select
              className="w-full border rounded-lg px-2 py-1 text-sm bg-white"
              disabled={disabled}
              value={value.paymentMethod}
              onChange={(e) => handleChange("paymentMethod", e.target.value)}
            >
              <option value="">-- PILIH METODE --</option>
              <option value="CASH">CASH</option>
              <option value="TRANSFER">TRANSFER</option>
              <option value="QRIS">QRIS</option>
            </select>
          </div>
        )}

        {/* ==========================
            DP USER
        ========================== */}
        <div>
          <label className="text-xs font-semibold">
            DP (Uang Muka) — Jika LUNAS otomatis = Grand Total
          </label>
          <input
            type="number"
            disabled={disabled}
            className="w-full border rounded-lg px-2 py-1 text-sm"
            value={value.dpUser}
            onChange={(e) =>
              handleChange("dpUser", Number(e.target.value || 0))
            }
          />
        </div>

        {/* ==========================
            TENOR (JIKA PIUTANG)
        ========================== */}
        {value.status === "PIUTANG" && (
          <div>
            <label className="text-xs font-semibold">Tenor (bulan)</label>
            <select
              className="w-full border rounded-lg px-2 py-1 text-sm"
              disabled={disabled}
              value={value.tenor || ""}
              onChange={(e) => handleChange("tenor", e.target.value)}
            >
              <option value="">-- PILIH TENOR --</option>
              <option value="1">1 Bulan</option>
              <option value="2">2 Bulan</option>
              <option value="3">3 Bulan</option>
              <option value="6">6 Bulan</option>
              <option value="9">9 Bulan</option>
              <option value="12">12 Bulan</option>
            </select>
          </div>
        )}

        {/* ==========================
            GRAND TOTAL (READONLY)
        ========================== */}
        <div>
          <label className="text-xs font-semibold">Grand Total</label>
          <input
            type="text"
            readOnly
            className="w-full border rounded-lg px-2 py-1 text-sm bg-gray-100"
            value={Number(grandTotal || 0).toLocaleString("id-ID")}
          />
        </div>
      </div>
    </div>
  );
}
