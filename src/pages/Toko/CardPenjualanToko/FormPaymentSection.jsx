// =======================================================
// FormPaymentSection.jsx — FINAL
// Tahap 3 | CASH & KREDIT | MDR + GRAND TOTAL
// =======================================================
import React, { useEffect, useMemo, useState } from "react";
import { listenMasterPaymentMetode } from "../../../services/FirebaseService";

export default function FormPaymentSection({
  value,
  onChange,
  disabled = false,
  totalBarang = 0,
}) {
  const [masterPayment, setMasterPayment] = useState([]);

  useEffect(() => {
    const unsub = listenMasterPaymentMetode((rows) => {
      setMasterPayment(Array.isArray(rows) ? rows : []);
    });
    return () => unsub && unsub();
  }, []);

  const payment = value ?? {};

  const status = payment.status ?? "LUNAS";
  const paymentMethod = payment.paymentMethod ?? "CASH";
  const mdrPersen = Number(payment.mdr ?? 0);
  const dpUser = Number(payment.dpUser ?? 0);
  const dpTalangan = Number(payment.dpTalangan ?? 0);
  const dpMerchant = Number(payment.dpMerchant ?? 0);
  const voucher = Number(payment.voucher ?? 0);

  const nominalMdr = useMemo(() => {
    return Math.round((totalBarang * mdrPersen) / 100);
  }, [totalBarang, mdrPersen]);

  const grandTotal = useMemo(() => {
    if (status === "LUNAS" || paymentMethod === "CASH") {
      return totalBarang;
    }
    return (
      totalBarang + nominalMdr + dpTalangan - dpUser - dpMerchant - voucher
    );
  }, [
    status,
    paymentMethod,
    totalBarang,
    nominalMdr,
    dpTalangan,
    dpUser,
    dpMerchant,
    voucher,
  ]);

  useEffect(() => {
    onChange({
      ...payment,
      nominalMdr,
      grandTotal,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nominalMdr, grandTotal]);

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

        <h2 className="text-sm font-bold mb-3">💳 PEMBAYARAN (TAHAP 3)</h2>

        <div className="space-y-3 text-sm">
          {/* STATUS */}
          <div>
            <label className="font-semibold">Status Pembayaran</label>
            <select
              className="w-full border rounded-lg px-2 py-1"
              value={status}
              onChange={(e) =>
                onChange({
                  ...payment,
                  status: e.target.value,
                  paymentMethod:
                    e.target.value === "LUNAS" ? "CASH" : paymentMethod,
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
              value={payment.kategoriBayar ?? ""}
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
          {status === "PIUTANG" && (
            <div>
              <label className="font-semibold">Payment Metode</label>
              <select
                className="w-full border rounded-lg px-2 py-1"
                value={paymentMethod}
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

          {/* KREDIT DETAIL */}
          {status === "PIUTANG" && paymentMethod === "KREDIT" && (
            <>
              <div>
                <label className="font-semibold">MDR (%)</label>
                <input
                  type="number"
                  className="w-full border rounded-lg px-2 py-1"
                  value={mdrPersen}
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
                  value={dpUser}
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
                  value={dpTalangan}
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
                  value={dpMerchant}
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
                  value={voucher}
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
            <input
              readOnly
              className="w-full border rounded-lg px-2 py-2 bg-indigo-50 font-bold text-indigo-700"
              value={grandTotal.toLocaleString("id-ID")}
            />
          </div>
        </div>
      </div>
    </fieldset>
  );
}
