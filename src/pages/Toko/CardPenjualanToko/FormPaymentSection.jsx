// ============================================
// FormPaymentSection.jsx — FINAL CLEAN VERSION
// ============================================
import React from "react";

export default function FormPaymentSection({
  value,
  onChange,
  disabled,
  grandTotal = 0,
  tahap,
}) {
  const handleChange = (key, val) => {
    onChange({ ...value, [key]: val });
  };

  // Jika LUNAS → DP = Grand Total
  if (value.status === "LUNAS" && value.dpUser !== grandTotal) {
    handleChange("dpUser", grandTotal);
  }

  return (
    <fieldset disabled={disabled} className={disabled ? "opacity-50" : ""}>
      <div className="relative">
        <div className="absolute top-1 right-2 text-[11px]">
          {disabled ? (
            <span className="text-red-500">🔒 Tahap 3 Terkunci</span>
          ) : (
            <span className="text-green-600">🟢 Tahap 3 Aktif</span>
          )}
        </div>

        <h2 className="text-sm font-bold mb-2">PEMBAYARAN (TAHAP 3)</h2>

        <div className="space-y-3">
          {/* STATUS */}
          <div>
            <label className="text-xs font-semibold">Status Pembayaran *</label>
            <select
              disabled={disabled}
              className="w-full border rounded px-2 py-1 text-sm"
              value={value.status}
              onChange={(e) => handleChange("status", e.target.value)}
            >
              <option value="">-- PILIH STATUS --</option>
              <option value="LUNAS">LUNAS</option>
              <option value="PIUTANG">PIUTANG</option>
            </select>
          </div>

          {/* PAYMENT METHOD */}
          {value.status === "PIUTANG" && (
            <div>
              <label className="text-xs font-semibold">Payment Method *</label>
              <select
                disabled={disabled}
                className="w-full border rounded px-2 py-1 text-sm"
                value={value.paymentMethod || ""}
                onChange={(e) => handleChange("paymentMethod", e.target.value)}
              >
                <option value="">-- PILIH METODE --</option>
                <option value="TRANSFER">TRANSFER</option>
                <option value="QRIS">QRIS</option>
                <option value="DEBIT">DEBIT</option>
                <option value="KREDIT">KREDIT</option>
              </select>
            </div>
          )}

          {/* DP */}
          <div>
            <label className="text-xs font-semibold">DP User</label>
            <input
              type="number"
              disabled={disabled}
              className="w-full border rounded px-2 py-1"
              value={value.dpUser}
              onChange={(e) =>
                handleChange("dpUser", Number(e.target.value || 0))
              }
            />
          </div>

          {/* TENOR */}
          {value.status === "PIUTANG" && (
            <div>
              <label className="text-xs font-semibold">Tenor</label>
              <select
                disabled={disabled}
                className="w-full border rounded px-2 py-1"
                value={value.tenor || ""}
                onChange={(e) => handleChange("tenor", e.target.value)}
              >
                <option value="">-- PILIH TENOR --</option>
                <option value="1">1 bulan</option>
                <option value="2">2 bulan</option>
                <option value="3">3 bulan</option>
                <option value="6">6 bulan</option>
                <option value="9">9 bulan</option>
                <option value="12">12 bulan</option>
              </select>
            </div>
          )}

          {/* GRAND TOTAL */}
          <div>
            <label className="text-xs font-semibold">Grand Total</label>
            <input
              readOnly
              className="w-full border rounded px-2 py-1 bg-gray-100 text-sm"
              value={grandTotal.toLocaleString("id-ID")}
            />
          </div>
        </div>
      </div>
    </fieldset>
  );
}
