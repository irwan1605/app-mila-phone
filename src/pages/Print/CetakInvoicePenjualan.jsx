// ==================================================
// CetakInvoicePenjualan.jsx
// Print Invoice Penjualan (THERMAL 60MM)
// ==================================================
import React, { useEffect, useRef } from "react";
import logoUrl from "../../assets/logoMMT.png";
import { useReactToPrint } from "react-to-print";

const rupiah = (n) =>
  Number(n || 0).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });

const safeNumber = (n) => Number(n || 0);

export default function CetakInvoicePenjualan({
  transaksi,
  onClose,
  mode = "print",
}) {
  const printRef = useRef(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: transaksi?.invoice || "Invoice",
  });

  useEffect(() => {
    console.log("PRINT DATA:", transaksi);
    console.log("REF:", printRef.current);
  }, [transaksi]);

  if (!transaksi) return null;

  const { invoice, toko, user = {}, items = [], payment = {} } = transaksi;

  const safePayment = {
    status: payment?.status || "LUNAS",
    paymentMethod: payment?.paymentMethod || "CASH",
    grandTotal: Number(payment?.grandTotal || 0),
    nominalMdr: Number(payment?.nominalMdr || 0),
    dpUser: Number(payment?.dpUser || 0),
    dpUserPT: Number(payment?.dpUserPT || 0),
    dpMerchant: Number(payment?.dpMerchant || 0),
    voucher: Number(payment?.voucher || 0),
    tenor: payment?.tenor || "",
    splitPayment: Array.isArray(payment?.splitPayment)
      ? payment.splitPayment
      : [],
    kembalian: Number(payment?.kembalian || 0),
  };

  const totalBarang = items.reduce(
    (s, it) =>
      s +
      Number(it.qty || 0) *
        Number(it.hargaUnit || it.hargaAktif || 0),
    0
  );

  const finalGrandTotal = Number(totalBarang || 0);

  const isKredit = payment?.status === "PIUTANG";

  const tanggalCetak = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="p-4">
      {/* BUTTON AREA */}
      <div className="flex justify-between mb-4 print:hidden">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-600 text-white rounded"
        >
          ❌ Close
        </button>

        {mode === "print" && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handlePrint();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            🖨️ CETAK INVOICE
          </button>
        )}
      </div>

      {/* AREA CETAK */}
      <div
        ref={printRef}
        className="thermal-paper bg-white mx-auto p-2 text-[10px]"
        style={{
          width: "60mm",
          minHeight: "auto",
        }}
      >
        {/* HEADER */}
        <div className="flex justify-between items-center mb-2">
          <img src={logoUrl} alt="logo" className="h-8" />
          <div className="text-right">
            <h2 className="font-bold text-sm">INVOICE PENJUALAN</h2>
            <p>No : {invoice}</p>
            <p>{tanggalCetak}</p>
          </div>
        </div>

        {/* INFO */}
        <div className="grid grid-cols-1 gap-1 mb-2">
          <p><b>Toko</b> : {toko}</p>
          <p><b>Sales</b> : {user?.namaSales}</p>
          <p><b>Pelanggan</b> : {user?.namaPelanggan}</p>
          <p><b>No HP</b> : {user?.noTlpPelanggan}</p>
        </div>

        {/* TABLE */}
        <table className="w-full border-collapse border text-[9px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-1">No</th>
              <th className="border p-1">Barang</th>
              <th className="border p-1">Qty</th>
              {/* <th className="border p-1">Total</th> */}
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const harga = Number(it.hargaUnit || it.hargaAktif || 0);
              const qty = Number(it.qty || 0);
              const total = harga * qty;

              return (
                <tr key={idx}>
                  <td className="border p-1 text-center">{idx + 1}</td>
                  <td className="border p-1">
                    {it.namaBarang}
                    {(it.imeiList || []).length > 0 && (
                      <div className="text-[8px]">
                        IMEI: {(it.imeiList || []).join(", ")}
                      </div>
                    )}
                  </td>
                  <td className="border p-1 text-center">{qty}</td>
                  {/* <td className="border p-1 text-right">{rupiah(total)}</td> */}
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="mt-2 text-right font-bold">
          NOMINAL PAYMENT : {rupiah(finalGrandTotal)}
        </div>

        {/* SPLIT PAYMENT */}
        {safePayment.splitPayment.length > 0 && (
          <div className="mt-2">
            <div className="font-semibold">Pembayaran</div>
            {safePayment.splitPayment.map((p, i) => (
              <div key={i} className="flex justify-between text-[9px]">
                <span>{p.metode}</span>
                <span>
                  Rp {safeNumber(p.nominal).toLocaleString("id-ID")}
                </span>
              </div>
            ))}
          </div>
        )}

        <hr className="my-2" />

        <p className="text-center text-[9px]">
          Terima kasih telah berbelanja
        </p>

        {/* ================= PERINGATAN ================= */}
        <div className="mt-2 border border-red-500 p-2 text-red-600 text-[8px] leading-tight">
          <div className="font-bold text-center mb-1">
            PERHATIAN !!!
          </div>

          <ul className="list-disc pl-3 space-y-0.5">
            <li>Mohon diperiksa kembali kelengkapan dan kelayakan unit</li>
            <li>Barang yang sudah dibeli tidak dapat ditukar / dikembalikan</li>
            <li>
              Garansi Toko:
              <br />- Garansi Tukar Unit 1 × 24 jam
              <br />- Garansi Home Service 1 Hari
              <br />- Lebih dari 1 Hari dikenakan Biaya Transport Teknisi / Driver
            </li>
            <li>
              Ketentuan & regulasi garansi pabrik mengikuti buku garansi
              yang tersedia di setiap unit sepeda atau motor
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
