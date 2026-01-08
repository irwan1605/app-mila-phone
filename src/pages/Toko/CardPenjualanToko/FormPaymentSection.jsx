// =======================================================
// FormPaymentSection.jsx — FINAL FIX 100% (STABIL)
// Tahap 3 | PAYMENT | CASH | KREDIT | SPLIT PAYMENT
// =======================================================

import React, { useEffect, useMemo, useState } from "react";
import {
  listenMasterMDR,
  listenMasterTenor,
  listenMasterBank,
} from "../../../services/FirebaseService";

export default function FormPaymentSection({
  value = {},
  onChange,
  disabled = false,
  totalBarang = 0,
}) {
  /* ================= MASTER DATA ================= */
  const [masterMdr, setMasterMdr] = useState([]);
  const [masterTenor, setMasterTenor] = useState([]);
  const [masterBank, setMasterBank] = useState([]);

  /* ================= SPLIT PAYMENT ================= */
  const [paymentSplit, setPaymentSplit] = useState({
    enabled: false,
    detail: [
      { metode: "CASH", nominal: 0 },
      { metode: "DEBIT", bankId: "", bankNama: "", nominal: 0 },
    ],
  });

  /* ================= LOAD MASTER ================= */
  useEffect(() => {
    const u1 = listenMasterMDR(setMasterMdr);
    const u2 = listenMasterTenor(setMasterTenor);
    const u3 = listenMasterBank(setMasterBank);
    return () => {
      u1 && u1();
      u2 && u2();
      u3 && u3();
    };
  }, []);

  const getBankByMetode = (metode) =>
    masterBank.filter((b) => b.status === "AKTIF" && b.jenis === metode);

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
    }),
    [value]
  );

  /* ================= HITUNG MDR ================= */
  const nominalMdr = useMemo(() => {
    if (paymentSafe.paymentMethod !== "KREDIT") return 0;
    return Math.round((totalBarang * paymentSafe.persenMdr) / 100);
  }, [totalBarang, paymentSafe.paymentMethod, paymentSafe.persenMdr]);

  /* ================= GRAND TOTAL (SATU-SATUNYA) ================= */
  const grandTotal = useMemo(() => {
    // PIUTANG / KREDIT
    if (paymentSafe.status === "PIUTANG") {
      return (
        Number(totalBarang) +
        Number(nominalMdr) -
        (Number(paymentSafe.dpUser) + Number(paymentSafe.voucher))
      );
    }

    // LUNAS (CASH / SPLIT)
    return Number(totalBarang);
  }, [
    totalBarang,
    nominalMdr,
    paymentSafe.status,
    paymentSafe.dpUser,
    paymentSafe.voucher,
  ]);

  /* ================= CICILAN ================= */
  const cicilanPerBulan = useMemo(() => {
    if (paymentSafe.status !== "PIUTANG") return 0;
    if (!paymentSafe.tenor) return 0;
    return Math.ceil(grandTotal / Number(paymentSafe.tenor));
  }, [grandTotal, paymentSafe.status, paymentSafe.tenor]);

  /* ================= VALIDASI SPLIT ================= */
  const isSplitValid = useMemo(() => {
    if (!paymentSplit.enabled) return true;

    const totalSplit = paymentSplit.detail.reduce(
      (s, x) => s + Number(x.nominal || 0),
      0
    );

    if (totalSplit !== grandTotal) return false;

    return paymentSplit.detail.every((p) => p.metode === "CASH" || p.bankId);
  }, [paymentSplit, grandTotal]);

  /* ================= SYNC KE PARENT ================= */
  useEffect(() => {
    onChange({
      ...paymentSafe,
      nominalMdr,
      grandTotal,
      cicilan: cicilanPerBulan,
      splitPayment: paymentSplit.enabled ? paymentSplit.detail : null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nominalMdr, grandTotal, cicilanPerBulan, paymentSplit]);

  /* ================= RENDER (UI TIDAK DIUBAH) ================= */
  return (
    <fieldset disabled={disabled} className={disabled ? "opacity-50" : ""}>
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
                paymentMethod: e.target.value === "LUNAS" ? "CASH" : "KREDIT",
              })
            }
          >
            <option value="LUNAS">LUNAS</option>
            <option value="PIUTANG">PIUTANG</option>
          </select>
        </div>

        {/* SPLIT PAYMENT */}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={paymentSplit.enabled}
            onChange={(e) =>
              setPaymentSplit({
                ...paymentSplit,
                enabled: e.target.checked,
              })
            }
          />
          Split Payment
        </label>

        {paymentSplit.enabled &&
          paymentSplit.detail.map((p, i) => (
            <div key={i} className="grid grid-cols-4 gap-2">
              <select
                value={p.metode}
                className="w-full border rounded px-2 py-1"
                onChange={(e) => {
                  const next = [...paymentSplit.detail];
                  next[i] = {
                    metode: e.target.value,
                    nominal: p.nominal,
                    bankId: "",
                    bankNama: "",
                  };
                  setPaymentSplit({ ...paymentSplit, detail: next });
                }}
              >
                <option>CASH</option>
                <option>DEBIT</option>
                <option>QRIS</option>
              </select>

              {p.metode !== "CASH" && (
                <select
                  value={p.bankId}
                  className="w-full border rounded px-2 py-1"
                  onChange={(e) => {
                    const bank = masterBank.find(
                      (b) => b.id === e.target.value
                    );
                    const next = [...paymentSplit.detail];
                    next[i] = {
                      ...next[i],
                      bankId: bank?.id,
                      bankNama: bank?.namaBank,
                    };
                    setPaymentSplit({ ...paymentSplit, detail: next });
                  }}
                >
                  <option value="">-- Bank --</option>
                  {getBankByMetode(p.metode).map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.namaBank}
                    </option>
                  ))}
                </select>
              )}

              <input
                type="number"
                 className="w-full border rounded px-2 py-1"
                value={p.nominal}
                onChange={(e) => {
                  const next = [...paymentSplit.detail];
                  next[i].nominal = Number(e.target.value || 0);
                  setPaymentSplit({ ...paymentSplit, detail: next });
                }}
              />
            </div>
          ))}

        {/* KREDIT DETAIL */}
        {paymentSafe.paymentMethod === "KREDIT" && (
          <>
            <div>
              <label className="font-semibold">Nama MDR</label>
              <select
                className="w-full border rounded px-2 py-1"
                value={paymentSafe.namaMdr}
                onChange={(e) => {
                  const m = masterMdr.find((x) => x.nama === e.target.value);
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
                <b>Cicilan / Bulan:</b> Rp{" "}
                {cicilanPerBulan.toLocaleString("id-ID")}
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
