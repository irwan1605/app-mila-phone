// =======================================================
// FormPaymentSection.jsx — FINAL (STABIL + ESLINT BERSIH)
// Tahap 3 | PAYMENT | CASH & KREDIT | MDR + GRAND TOTAL
// =======================================================

import React, { useEffect, useMemo, useState } from "react";
import { listenMasterPaymentMetode } from "../../../services/FirebaseService";

export default function FormPaymentSection({
  value,
  onChange,
  disabled = false,
  totalBarang = 0, // ⬅️ total dari Tahap 2
}) {
  const [masterPayment, setMasterPayment] = useState([]);

  /* ================= FIREBASE ================= */
  useEffect(() => {
    const unsub = listenMasterPaymentMetode((rows) => {
      setMasterPayment(Array.isArray(rows) ? rows : []);
    });
    return () => unsub && unsub();
  }, []);

  /* ================= SAFE VALUE ================= */
  const payment = useMemo(
    () => ({
      status: value?.status || "LUNAS",
      kategoriBayar: value?.kategoriBayar || "",
      paymentMethod: value?.paymentMethod || "CASH",
      mdr: Number(value?.mdr || 0),
      dpUser: Number(value?.dpUser || 0),
      dpTalangan: Number(value?.dpTalangan || 0),
      dpMerchant: Number(value?.dpMerchant || 0),
      voucher: Number(value?.voucher || 0),
      nominalMdr: Number(value?.nominalMdr || 0),
      grandTotal: Number(value?.grandTotal || totalBarang),
    }),
    [value, totalBarang]
  );

  /* ================= HITUNG MDR ================= */
  const nominalMdr = useMemo(() => {
    if (payment.status !== "PIUTANG") return 0;
    if (payment.paymentMethod !== "KREDIT") return 0;
    return Math.round((totalBarang * payment.mdr) / 100);
  }, [totalBarang, payment.status, payment.paymentMethod, payment.mdr]);

  /* ================= HITUNG GRAND TOTAL ================= */
  const finalGrandTotal = useMemo(() => {
    if (payment.status === "LUNAS" || payment.paymentMethod === "CASH") {
      return totalBarang;
    }

    return (
      totalBarang +
      nominalMdr +
      payment.dpTalangan -
      payment.dpUser -
      payment.dpMerchant -
      payment.voucher
    );
  }, [
    totalBarang,
    nominalMdr,
    payment.status,
    payment.paymentMethod,
    payment.dpTalangan,
    payment.dpUser,
    payment.dpMerchant,
    payment.voucher,
  ]);

  /* ================= SYNC KE PARENT ================= */
  useEffect(() => {
    onChange({
      ...payment,
      nominalMdr,
      grandTotal: finalGrandTotal,
    });
  }, [nominalMdr, finalGrandTotal]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ================= RENDER ================= */
  return (
    <fieldset disabled={disabled} className={disabled ? "opacity-50" : ""}>
      <div className="relative">
        <div className="absolute top-1 right-2 text-[11px] font-semibold">
          {disabled ? (
            <span className="text-red-500">🔒 Tahap 3 Terkunci</span>
          ) : (
            <span className="text-green-600">🟢 Tahap 3 Aktif</span>
          )}
        </div>

        <h2 className="text-sm font-bold mb-3">💳 PEMBAYARAN — TAHAP 3</h2>

        <div className="space-y-3 text-sm">
          {/* STATUS */}
          <div>
            <label className="font-semibold">Status Pembayaran</label>
            <select
              className="w-full border rounded-lg px-2 py-1"
              value={payment.status}
              onChange={(e) =>
                onChange({
                  ...payment,
                  status: e.target.value,
                  paymentMethod:
                    e.target.value === "LUNAS" ? "CASH" : payment.paymentMethod,
                })
              }
            >
              <option value="LUNAS">LUNAS</option>
              <option value="PIUTANG">PIUTANG</option>
            </select>
          </div>

          {/* KATEGORI BAYAR */}
          <div>
            <label className="font-semibold">Kategori Bayar</label>
            <select
              className="w-full border rounded-lg px-2 py-1"
              value={payment.kategoriBayar}
              onChange={(e) =>
                onChange({ ...payment, kategoriBayar: e.target.value })
              }
            >
              <option value="">-- Pilih --</option>
              {masterPayment.map((p) => (
                <option key={p.id} value={p.nama}>
                  {p.nama}
                </option>
              ))}
            </select>
          </div>

          {/* PAYMENT METHOD */}
          {payment.status === "PIUTANG" && (
            <div>
              <label className="font-semibold">Payment Metode</label>
              <select
                className="w-full border rounded-lg px-2 py-1"
                value={payment.paymentMethod}
                onChange={(e) =>
                  onChange({
                    ...payment,
                    paymentMethod: e.target.value,
                  })
                }
              >
                <option value="CASH">CASH</option>
                <option value="KREDIT">KREDIT</option>
              </select>
            </div>
          )}

          {/* DETAIL KREDIT */}
          {payment.status === "PIUTANG" &&
            payment.paymentMethod === "KREDIT" && (
              <>
                <div>
                  <label className="font-semibold">MDR (%)</label>
                  <input
                    type="number"
                    className="w-full border rounded-lg px-2 py-1"
                    value={payment.mdr}
                    onChange={(e) =>
                      onChange({
                        ...payment,
                        mdr: Number(e.target.value || 0),
                      })
                    }
                  />
                </div>

                <div>
                  <label className="font-semibold">Nominal MDR</label>
                  <input
                    readOnly
                    className="w-full border rounded-lg px-2 py-1 bg-gray-100"
                    value={nominalMdr.toLocaleString("id-ID")}
                  />
                </div>

                <div>
                  <label className="font-semibold">DP User</label>
                  <input
                    type="number"
                    className="w-full border rounded-lg px-2 py-1"
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
                    className="w-full border rounded-lg px-2 py-1"
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
                  <label className="font-semibold">DP Merchant</label>
                  <input
                    type="number"
                    className="w-full border rounded-lg px-2 py-1"
                    value={payment.dpMerchant}
                    onChange={(e) =>
                      onChange({
                        ...payment,
                        dpMerchant: Number(e.target.value || 0),
                      })
                    }
                  />
                </div>

                <div>
                  <label className="font-semibold">Voucher Diskon</label>
                  <input
                    type="number"
                    className="w-full border rounded-lg px-2 py-1"
                    value={payment.voucher}
                    onChange={(e) =>
                      onChange({
                        ...payment,
                        voucher: Number(e.target.value || 0),
                      })
                    }
                  />
                </div>
              </>
            )}

          {/* GRAND TOTAL */}
          <div>
            <label className="font-bold">GRAND TOTAL</label>
            <div className="text-right text-xl font-bold text-indigo-700">
              Rp {finalGrandTotal.toLocaleString("id-ID")}
            </div>
          </div>
        </div>
      </div>
    </fieldset>
  );
}
