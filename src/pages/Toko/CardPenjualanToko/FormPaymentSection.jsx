// ============================================
// FormPaymentSection.jsx — FINAL CLEAN VERSION
// ============================================
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  listenMasterPaymentMetode,
} from "../../../services/FirebaseService";

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

  const [items, setItems] = useState([]);
  const [payment, setPayment] = useState({
    kategoriBayar: "",
    status: "LUNAS",
    paymentMetode: "CASH",
    mdrPersen: 0,
    nominalMdr: 0,
    dpUser: 0,
    dpTalangan: 0,
    dpMerchant: 0,
    voucher: 0,
    grandTotal: 0,
  });
  

  const totalBarang = items.reduce(
    (sum, i) => sum + Number(i.totalHarga || 0),
    0
  );

  useEffect(() => {
    const nominalMdr =
      (totalBarang * Number(payment.mdrPersen || 0)) / 100;
  
    setPayment((prev) => ({
      ...prev,
      nominalMdr,
    }));
  }, [payment.mdrPersen, totalBarang]);

 // FormPaymentSection.jsx
useEffect(() => {
  let total = grandTotal;

  if (value.paymentMetode === "KREDIT") {
    total =
      grandTotal +
      value.nominalMdr +
      value.dpTalangan -
      value.dpUser -
      value.dpMerchant -
      value.voucher;
  }

  onChange({ ...value, grandTotal: total });
}, [
  grandTotal,
  value.paymentMetode,
  value.nominalMdr,
  value.dpTalangan,
  value.dpUser,
  value.dpMerchant,
  value.voucher,
]);


  const [masterPayment, setMasterPayment] = useState([]);

  useEffect(() => {
    const unsub = listenMasterPaymentMetode((rows) => {
      setMasterPayment(rows || []);
    });
    return () => unsub && unsub();
  }, []);


  

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
            <label>Status Pembayaran</label>
            <select
              value={payment.status}
              onChange={(e) => {
                const status = e.target.value;
                setPayment({
                  ...payment,
                  status,
                  paymentMetode:
                    status === "LUNAS" ? "CASH" : payment.paymentMetode,
                });
              }}
            >
              <option value="LUNAS">LUNAS</option>
              <option value="PIUTANG">PIUTANG</option>
            </select>
          </div>

          <div>
            <label>Kategori Bayar</label>
            <select
              value={payment.kategoriBayar}
              onChange={(e) =>
                setPayment({ ...payment, kategoriBayar: e.target.value })
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
              <label>Payment Metode</label>
              <select
                value={payment.paymentMetode}
                onChange={(e) =>
                  setPayment({ ...payment, paymentMetode: e.target.value })
                }
              >
                <option value="CASH">CASH</option>
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

          {payment.paymentMetode === "KREDIT" && (
            <>
              <input
                placeholder="MDR (%)"
                type="number"
                value={payment.mdrPersen}
                onChange={(e) =>
                  setPayment({ ...payment, mdrPersen: Number(e.target.value) })
                }
              />

              <input
                placeholder="DP User (Cash)"
                type="number"
                value={payment.dpUser}
                onChange={(e) =>
                  setPayment({ ...payment, dpUser: Number(e.target.value) })
                }
              />

              <input
                placeholder="DP Talangan"
                type="number"
                value={payment.dpTalangan}
                onChange={(e) =>
                  setPayment({ ...payment, dpTalangan: Number(e.target.value) })
                }
              />

              <input
                placeholder="DP Merchant"
                type="number"
                value={payment.dpMerchant}
                onChange={(e) =>
                  setPayment({ ...payment, dpMerchant: Number(e.target.value) })
                }
              />

              <input
                placeholder="Voucher Diskon"
                type="number"
                value={payment.voucher}
                onChange={(e) =>
                  setPayment({ ...payment, voucher: Number(e.target.value) })
                }
              />
            </>
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
