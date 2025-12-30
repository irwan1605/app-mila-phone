// =======================================================
// FormPaymentSection.jsx — FINAL FIX 100%
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
  totalBarang = 0, // ⬅️ TOTAL dari Tahap 2
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

  /* ================= SAFE VALUE ================= */
  const payment = useMemo(
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
    if (payment.paymentMethod !== "KREDIT") return 0;
    return Math.round((totalBarang * payment.persenMdr) / 100);
  }, [totalBarang, payment.paymentMethod, payment.persenMdr]);

  /* ================= GRAND TOTAL ================= */
  const grandTotal = useMemo(() => {
    if (payment.paymentMethod === "CASH") return totalBarang;

    return (
      totalBarang +
      nominalMdr -
      payment.dpUser -
      payment.dpTalangan -
      payment.voucher
    );
  }, [
    totalBarang,
    nominalMdr,
    payment.paymentMethod,
    payment.dpUser,
    payment.dpTalangan,
    payment.voucher,
  ]);

  /* ================= CICILAN ================= */
  const cicilanPerBulan = useMemo(() => {
    if (!payment.tenor) return 0;
    const bulan = parseInt(payment.tenor, 10);
    if (!bulan) return 0;
    return Math.round(grandTotal / bulan);
  }, [payment.tenor, grandTotal]);

  /* ================= SYNC KE PARENT ================= */
  useEffect(() => {
    onChange({
      ...payment,
      nominalMdr,
      grandTotal,
      cicilan: cicilanPerBulan,
    });
  }, [nominalMdr, grandTotal, cicilanPerBulan]); // eslint-disable-line

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
            value={payment.status}
            onChange={(e) =>
              onChange({
                ...payment,
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
        {payment.status === "PIUTANG" && (
          <div>
            <label className="font-semibold">Payment Method</label>
            <select
              className="w-full border rounded px-2 py-1"
              value={payment.paymentMethod}
              onChange={(e) =>
                onChange({ ...payment, paymentMethod: e.target.value })
              }
            >
              <option value="KREDIT">KREDIT</option>
              <option value="CASH">CASH</option>
            </select>
          </div>
        )}

        {/* MDR */}
        {payment.paymentMethod === "KREDIT" && (
          <>
            <div>
              <label className="font-semibold">Nama MDR</label>
              <select
                className="w-full border rounded px-2 py-1"
                value={payment.namaMdr}
                onChange={(e) => {
                  const m = masterMdr.find(
                    (x) => x.nama === e.target.value
                  );
                  onChange({
                    ...payment,
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
                value={`${payment.persenMdr}%`}
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

            <div>
              <label className="font-semibold">DP User</label>
              <input
                type="number"
                className="w-full border rounded px-2 py-1"
                value={payment.dpUser}
                onChange={(e) =>
                  onChange({
                    ...payment,
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
                value={payment.dpTalangan}
                onChange={(e) =>
                  onChange({
                    ...payment,
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
                value={payment.voucher}
                onChange={(e) =>
                  onChange({
                    ...payment,
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
                value={payment.tenor}
                onChange={(e) =>
                  onChange({ ...payment, tenor: e.target.value })
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

            {payment.tenor && (
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
