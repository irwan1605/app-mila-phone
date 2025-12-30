// =======================================================
// FormPaymentSection.jsx — FINAL FIX 100% (NO DUPLICATE)
// Tahap 3 | PAYMENT | CASH & KREDIT | MDR + TENOR
// =======================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  listenMasterMDR,
  listenMasterTenor,
} from "../../../services/FirebaseService";

export default function FormPaymentSection({
  value = {},
  onChange,
  disabled = false,
  totalBarang = 0, // TOTAL dari Tahap 2
}) {
  /* ================= MASTER DATA ================= */
  const [masterMdr, setMasterMdr] = useState([]);
  const [masterTenor, setMasterTenor] = useState([]);

  useEffect(() => {
    const u1 = listenMasterMDR((rows) =>
      setMasterMdr(Array.isArray(rows) ? rows : [])
    );
    const u2 = listenMasterTenor((rows) =>
      setMasterTenor(Array.isArray(rows) ? rows : [])
    );

    return () => {
      u1 && u1();
      u2 && u2();
    };
  }, []);

  /* ================= SAFE PAYMENT ================= */
  const paymentSafe = useMemo(
    () => ({
      status: value.status || "LUNAS", // LUNAS | PIUTANG
      paymentMethod: value.paymentMethod || "CASH", // CASH | KREDIT
      namaMdr: value.namaMdr || "",
      persenMdr: Number(value.persenMdr || 0),
      dpUser: Number(value.dpUser || 0),
      dpTalangan: Number(value.dpTalangan || 0),
      voucher: Number(value.voucher || 0),
      tenor: value.tenor || "",
      grandTotal: Number(value.grandTotal || totalBarang),
      cicilan: Number(value.cicilan || 0),
    }),
    [value, totalBarang]
  );

  /* ================= HITUNG MDR ================= */
  const nominalMdr = useMemo(() => {
    if (paymentSafe.paymentMethod !== "KREDIT") return 0;
    return Math.round((totalBarang * paymentSafe.persenMdr) / 100);
  }, [totalBarang, paymentSafe.paymentMethod, paymentSafe.persenMdr]);

  /* ================= GRAND TOTAL ================= */
  const grandTotal = useMemo(() => {
    if (paymentSafe.paymentMethod === "CASH") return totalBarang;

    return (
      totalBarang +
      nominalMdr -
      paymentSafe.dpUser -
      paymentSafe.dpTalangan -
      paymentSafe.voucher
    );
  }, [
    totalBarang,
    nominalMdr,
    paymentSafe.paymentMethod,
    paymentSafe.dpUser,
    paymentSafe.dpTalangan,
    paymentSafe.voucher,
  ]);

  /* ================= CICILAN ================= */
  const cicilanPerBulan = useMemo(() => {
    if (!paymentSafe.tenor) return 0;
    const bulan = parseInt(paymentSafe.tenor, 10);
    if (!bulan) return 0;
    return Math.round(grandTotal / bulan);
  }, [paymentSafe.tenor, grandTotal]);

  /* ================= SYNC KE PARENT ================= */
  useEffect(() => {
    onChange({
      ...paymentSafe,
      nominalMdr,
      grandTotal,
      cicilan: cicilanPerBulan,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nominalMdr, grandTotal, cicilanPerBulan]);

  /* ================= RENDER ================= */
  return (
    <fieldset disabled={disabled} className={disabled ? "opacity-50" : ""}>
      <h2 className="font-bold mb-3">💳 PEMBAYARAN — TAHAP 3</h2>

      <div className="space-y-3 text-sm">
        {/* STATUS */}
        <div>
          <label className="font-semibold">Status Pembayaran</label>
          <select
            className="w-full border rounded px-2 py-1"
            value={paymentSafe.status}
            onChange={(e) =>
              onChange({
                ...paymentSafe,
                status: e.target.value,
                paymentMethod:
                  e.target.value === "LUNAS" ? "CASH" : "KREDIT",
              })
            }
          >
            <option value="LUNAS">LUNAS</option>
            <option value="PIUTANG">PIUTANG</option>
          </select>
        </div>

        {/* PAYMENT METHOD */}
        {paymentSafe.status === "PIUTANG" && (
          <div>
            <label className="font-semibold">Payment Method</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={paymentSafe.paymentMethod}
              onChange={(e) =>
                onChange({
                  ...paymentSafe,
                  paymentMethod: e.target.value,
                })
              }
            >
              <option value="KREDIT">KREDIT</option>
              <option value="CASH">CASH</option>
            </select>
          </div>
        )}

        {/* KREDIT DETAIL */}
        {paymentSafe.paymentMethod === "KREDIT" && (
          <>
            {/* MDR */}
            <div>
              <label className="font-semibold">Nama MDR</label>
              <select
                className="w-full border rounded px-2 py-1"
                value={paymentSafe.namaMdr}
                onChange={(e) => {
                  const m = masterMdr.find(
                    (x) => x.nama === e.target.value
                  );
                  onChange({
                    ...paymentSafe,
                    namaMdr: m?.nama || "",
                    persenMdr: Number(m?.persen || 0),
                  });
                }}
              >
                <option value="">-- Pilih MDR --</option>
                {masterMdr.map((m) => (
                  <option key={m.id} value={m.nama}>
                    {m.nama}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-semibold">Persentase MDR</label>
              <input
                readOnly
                className="w-full border rounded px-2 py-1 bg-gray-100"
                value={`${paymentSafe.persenMdr}%`}
              />
            </div>

            <div>
              <label className="font-semibold">Nominal MDR</label>
              <input
                readOnly
                className="w-full border rounded px-2 py-1 bg-gray-100"
                value={nominalMdr.toLocaleString("id-ID")}
              />
            </div>

            {/* DP & VOUCHER */}
            <div>
              <label className="font-semibold">DP User</label>
              <input
                type="number"
                className="w-full border rounded px-2 py-1"
                value={paymentSafe.dpUser}
                onChange={(e) =>
                  onChange({
                    ...paymentSafe,
                    dpUser: Number(e.target.value || 0),
                  })
                }
              />
            </div>

            <div>
              <label className="font-semibold">DP Talangan</label>
              <input
                type="number"
                className="w-full border rounded px-2 py-1"
                value={paymentSafe.dpTalangan}
                onChange={(e) =>
                  onChange({
                    ...paymentSafe,
                    dpTalangan: Number(e.target.value || 0),
                  })
                }
              />
            </div>

            <div>
              <label className="font-semibold">Voucher Diskon</label>
              <input
                type="number"
                className="w-full border rounded px-2 py-1"
                value={paymentSafe.voucher}
                onChange={(e) =>
                  onChange({
                    ...paymentSafe,
                    voucher: Number(e.target.value || 0),
                  })
                }
              />
            </div>

            {/* TENOR */}
            <div>
              <label className="font-semibold">Tenor</label>
              <select
                className="w-full border rounded px-2 py-1"
                value={paymentSafe.tenor}
                onChange={(e) =>
                  onChange({
                    ...paymentSafe,
                    tenor: e.target.value,
                  })
                }
              >
                <option value="">-- Pilih Tenor --</option>
                {masterTenor.map((t) => (
                  <option key={t.id} value={t.tenor}>
                    {t.tenor}
                  </option>
                ))}
              </select>
            </div>

            {paymentSafe.tenor && (
              <div className="text-sm">
                <b>Cicilan / Bulan:</b>{" "}
                Rp {cicilanPerBulan.toLocaleString("id-ID")}
              </div>
            )}
          </>
        )}

        {/* GRAND TOTAL */}
        <div className="mt-4 text-right">
          <div className="font-semibold">GRAND TOTAL</div>
          <div className="text-xl font-bold text-indigo-700">
            Rp {grandTotal.toLocaleString("id-ID")}
          </div>
        </div>
      </div>
    </fieldset>
  );
}
