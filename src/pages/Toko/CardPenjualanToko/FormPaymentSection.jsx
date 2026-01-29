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
  onSubmit, // ⬅ TAMBAHAN
}) {
  /* ================= MASTER DATA ================= */
  const [masterMdr, setMasterMdr] = useState([]);
  const [masterTenor, setMasterTenor] = useState([]);
  const [masterBank, setMasterBank] = useState([]);

  /* ================= SPLIT STATE ================= */
  const [paymentSplit, setPaymentSplit] = useState({
    enabled: false,
    detail: [
      { metode: "CASH", nominal: 0 },
      { metode: "DEBIT", bankId: "", bankNama: "", nominal: 0 },
    ],
  });

  const addSplitRow = () => {
    setPaymentSplit((p) => ({
      ...p,
      detail: [
        ...p.detail,
        { metode: "CASH", bankId: "", bankNama: "", nominal: 0 },
      ],
    }));
  };

  const removeSplitRow = (idx) => {
    setPaymentSplit((p) => ({
      ...p,
      detail: p.detail.filter((_, i) => i !== idx),
    }));
  };

  const [uangDibayar, setUangDibayar] = useState(0);

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
      // 🔥 KETERANGAN BARU
      keterangan: value.keterangan || "",
    }),
    [value]
  );

  /* ================= HITUNG MDR ================= */
  const nominalMdr = useMemo(() => {
    if (paymentSafe.paymentMethod !== "KREDIT") return 0;
    return Math.round((totalBarang * paymentSafe.persenMdr) / 100);
  }, [totalBarang, paymentSafe.paymentMethod, paymentSafe.persenMdr]);

  /* ================= GRAND TOTAL ================= */
  /* ================= GRAND TOTAL ================= */
  const grandTotal = useMemo(() => {
    // ✅ KREDIT + SPLIT PAYMENT
    if (paymentSafe.status === "PIUTANG" && paymentSplit.enabled) {
      return Number(totalBarang) + Number(nominalMdr);
    }

    // ✅ KREDIT NORMAL (tanpa split)
    if (paymentSafe.status === "PIUTANG") {
      return (
        Number(totalBarang) +
        Number(nominalMdr) -
        (Number(paymentSafe.dpUser) + Number(paymentSafe.voucher))
      );
    }

    // ✅ CASH (termasuk split cash)
    return Number(totalBarang);
  }, [
    totalBarang,
    nominalMdr,
    paymentSafe.status,
    paymentSplit.enabled,
    paymentSafe.dpUser,
    paymentSafe.voucher,
  ]);

  /* ================= CICILAN ================= */
  const cicilanPerBulan = useMemo(() => {
    if (paymentSafe.status !== "PIUTANG") return 0;
    if (!paymentSafe.tenor) return 0;

    // ambil angka dari "6 BULAN"
    const tenorAngka = parseInt(paymentSafe.tenor);

    if (!tenorAngka || tenorAngka <= 0) return 0;

    return Math.ceil(grandTotal / tenorAngka);
  }, [grandTotal, paymentSafe.status, paymentSafe.tenor]);

  /* ================= CASH ================= */
  const kembalian = useMemo(() => {
    if (paymentSafe.paymentMethod !== "CASH") return 0;
    return Math.max(Number(uangDibayar) - grandTotal, 0);
  }, [uangDibayar, grandTotal, paymentSafe.paymentMethod]);

  /* ================= TOTAL SPLIT ================= */
  const totalSplit = useMemo(() => {
    if (!paymentSplit.enabled) return 0;
    return paymentSplit.detail.reduce((s, x) => s + Number(x.nominal || 0), 0);
  }, [paymentSplit]);

  const kembalianSplit = useMemo(() => {
    if (!paymentSplit.enabled) return 0;
    return Math.max(totalSplit - grandTotal, 0);
  }, [totalSplit, grandTotal, paymentSplit.enabled]);

  const sisaBayar = useMemo(() => {
    if (!paymentSplit.enabled) return 0;

    // 👉 KREDIT + SPLIT
    if (paymentSafe.status === "PIUTANG") {
      return grandTotal - totalSplit - Number(paymentSafe.dpUser || 0);
    }

    return grandTotal - totalSplit;
  }, [
    grandTotal,
    totalSplit,
    paymentSplit.enabled,
    paymentSafe.status,
    paymentSafe.dpUser,
  ]);


  
  

    /* ================= VALIDASI SPLIT ================= */
    const isSplitValid = useMemo(() => {
      if (!paymentSplit.enabled) return true;
    
      // 👉 KREDIT: split + DP Talangan harus nutup grand total
      if (paymentSafe.status === "PIUTANG") {
        if (totalSplit + Number(paymentSafe.dpUser || 0) < grandTotal) {
          return false;
        }
      } else {
        // 👉 CASH: split saja harus nutup grand total
        if (totalSplit < grandTotal) {
          return false;
        }
      }
    
      return paymentSplit.detail.every((p) => {
        if (p.metode === "CASH") return true;
        if (p.metode === "TUKAR TAMBAH") return true; // bebas bank
        return !!p.bankId; // DEBIT / QRIS wajib bank
      });
    }, [paymentSplit, totalSplit, grandTotal, paymentSafe.status, paymentSafe.dpUser]);

    /* ================= SYNC KE PARENT ================= */
    useEffect(() => {
      onChange({
        ...paymentSafe,
        nominalMdr,
        grandTotal,
        cicilan: cicilanPerBulan,
    
        splitPayment: paymentSplit.enabled ? paymentSplit.detail : null,
        uangDibayar: paymentSplit.enabled ? 0 : uangDibayar,
        kembalian: paymentSplit.enabled ? kembalianSplit : kembalian,
    
        // 🔥 INI WAJIB
        sisaBayar,
        totalSplit,
      });
    }, [
      nominalMdr,
      grandTotal,
      cicilanPerBulan,
      paymentSplit,
      uangDibayar,
      kembalian,
      kembalianSplit,
      sisaBayar,
      totalSplit,
    ]);
    
    

  /* ================= RENDER ================= */
  return (
    <fieldset
      disabled={disabled} // 🔥 FIX: jangan pakai !isSplitValid
      className={disabled ? "opacity-50" : ""}
    >
      <div className="space-y-3 text-sm">
        {/* STATUS */}
        <div>
          <label className="font-semibold">System Pembayaran</label>
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
            <option value="LUNAS">CASH</option>
            <option value="PIUTANG">KREDIT</option>
          </select>
        </div>
        {/* SPLIT PAYMENT */}
        {paymentSafe.status === "LUNAS" && (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={paymentSplit.enabled}
              onChange={(e) => {
                const active = e.target.checked;

                setPaymentSplit({
                  ...paymentSplit,
                  enabled: active,
                });

                if (active) {
                  setUangDibayar(0);
                  onChange({
                    ...paymentSafe,
                    paymentMethod: "CASH",
                  });
                }
              }}
            />
            Split Payment
          </label>
        )}

        {/* SPLIT DETAIL */}
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
                <option>TUKAR TAMBAH</option>
                <option>DEBIT</option>
                <option>QRIS</option>
              </select>

              {/* BANK */}
              {p.metode !== "CASH" && p.metode !== "TUKAR TAMBAH" && (
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
                      bankId: bank?.id || "",
                      bankNama: bank?.namaBank || "",
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

              {p.metode === "TUKAR TAMBAH" && (
                <input
                  type="text"
                  placeholder="Nama barang tukar tambah"
                  className="w-full border rounded px-2 py-1"
                  value={p.bankNama || ""}
                  onChange={(e) => {
                    const next = [...paymentSplit.detail];
                    next[i] = {
                      ...next[i],
                      bankId: "TUKAR_TAMBAH",
                      bankNama: e.target.value,
                    };
                    setPaymentSplit({ ...paymentSplit, detail: next });
                  }}
                />
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

              {i > 0 && (
                <button
                  type="button"
                  onClick={() => removeSplitRow(i)}
                  className="text-red-600 text-sm"
                >
                  ✖
                </button>
              )}
            </div>
          ))}

        {paymentSplit.enabled && (
          <button
            type="button"
            onClick={addSplitRow}
            className="text-blue-600 text-sm"
          >
            ➕ Tambah Metode Pembayaran
          </button>
        )}

        {/* SISA */}
        {paymentSplit.enabled && sisaBayar !== 0 && (
          <div
            className={`text-right font-bold ${
              sisaBayar > 0 ? "text-red-600" : "text-green-600"
            }`}
          >
            {sisaBayar > 0
              ? `KURANG BAYAR: Rp ${sisaBayar.toLocaleString("id-ID")}`
              : `LEBIH BAYAR: Rp ${Math.abs(sisaBayar).toLocaleString(
                  "id-ID"
                )}`}
          </div>
        )}

        {paymentSplit.enabled && kembalianSplit > 0 && (
          <div className="text-right font-bold text-green-700">
            UANG KEMBALIAN: Rp {kembalianSplit.toLocaleString("id-ID")}
          </div>
        )}

        {/* CASH NORMAL */}
        {!paymentSplit.enabled && paymentSafe.paymentMethod === "CASH" && (
          <div>
            <label className="font-semibold">Payment User</label>
            <input
              type="number"
              className="w-full border rounded px-2 py-1"
              value={uangDibayar}
              onChange={(e) => setUangDibayar(Number(e.target.value || 0))}
            />
          </div>
        )}

        {kembalian > 0 && (
          <div className="text-right text-green-700 font-bold">
            UANG KEMBALIAN: Rp {kembalian.toLocaleString("id-ID")}
          </div>
        )}

        {/* KREDIT */}
        {paymentSafe.paymentMethod === "KREDIT" && (
          <>
            <div>
              <label className="font-semibold">Payment MDR (%)</label>
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
              <label className="font-semibold">Persen MDR (%)</label>
              <input
                readOnly
                className="w-full border rounded px-2 py-1 bg-gray-100"
                value={paymentSafe.persenMdr}
              />
            </div>

            <div>
              <label className="font-semibold">DP Talangan</label>
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

            {/* <div>
              <label className="font-semibold">Voucher</label>
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
            </div> */}

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
          </>
        )}

        {paymentSafe.status === "PIUTANG" && (
          <div className="text-xs bg-gray-50 p-2 rounded">
            <div>Harga Barang: Rp {totalBarang.toLocaleString("id-ID")}</div>
            <div>
              DP Talangan: Rp {paymentSafe.dpUser.toLocaleString("id-ID")}
            </div>
            <div>Voucher: Rp {paymentSafe.voucher.toLocaleString("id-ID")}</div>
          </div>
        )}

        {/* KETERANGAN */}
        <div>
          <label className="font-semibold">Keterangan</label>
          <textarea
            rows={2}
            className="w-full border rounded px-2 py-1"
            placeholder="Input keterangan manual..."
            value={paymentSafe.keterangan}
            onChange={(e) =>
              onChange({
                ...paymentSafe,
                keterangan: e.target.value,
              })
            }
          />
        </div>

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
