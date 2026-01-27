// ==================================================
// CetakInvoicePenjualan.jsx
// Print Invoice Penjualan
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

export default function CetakInvoicePenjualan({
  transaksi,
  onClose,
  mode = "print", // 🔥 default = print
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

  // HITUNG TOTAL BARANG DARI ITEMS
  const totalBarang = items.reduce(
    (s, it) =>
      s + Number(it.qty || 0) * Number(it.hargaUnit || it.hargaAktif || 0),
    0
  );

  const isKredit = payment?.status === "PIUTANG";

  const tenorAngka = parseInt(payment?.tenor || 0);

  const cicilan =
    tenorAngka > 0
      ? Math.ceil(Number(payment.grandTotal || 0) / tenorAngka)
      : 0;

  // TOTAL KREDIT = total barang + MDR
  const totalKredit =
    Number(totalBarang || 0) + Number(payment?.nominalMdr || 0);

  // TANGGAL CETAK (HARI INI)
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

        {/* 🔥 HANYA TAMPIL JIKA MODE PRINT */}
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
        className="p-6 text-sm bg-white mx-auto"
        style={{ width: "210mm", minHeight: "297mm" }}
      >
        {/* HEADER */}
        <div className="flex justify-between items-center mb-4">
          <img src={logoUrl} alt="logo" className="h-12" />
          <div className="text-right">
            <h2 className="font-bold text-lg">INVOICE PENJUALAN</h2>
            <p>No Invoice : {invoice}</p>
            <p>Tanggal : {tanggalCetak}</p>
          </div>
        </div>

        {/* INFO TOKO & PELANGGAN */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p>
              <b>Nama Toko</b> : {toko}
            </p>
            <p>
              <b>Nama Sales</b> : {user?.namaSales}
            </p>
          </div>
          <div>
            <p>
              <b>Nama Pelanggan</b> : {user?.namaPelanggan}
            </p>
            <p>
              <b>No Telepon</b> : {user?.noTlpPelanggan}
            </p>
          </div>
        </div>

        {/* TABLE BARANG */}
        <table className="w-full border-collapse border text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">No</th>
              <th className="border p-2">Nama Barang</th>
              <th className="border p-2">IMEI</th>
              <th className="border p-2">Qty</th>
              <th className="border p-2">Harga</th>
              <th className="border p-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const harga = Number(it.hargaUnit || it.hargaAktif || 0);
              const qty = Number(it.qty || 0);
              const total = harga * qty; // 🔥 RUMUS TOTAL BARANG

              return (
                <tr key={idx}>
                  <td className="border p-2 text-center">{idx + 1}</td>
                  <td className="border p-2">{it.namaBarang}</td>
                  <td className="border p-2">
                    {(it.imeiList || []).join(", ")}
                  </td>
                  <td className="border p-2 text-center">{qty}</td>
                  <td className="border p-2 text-right">{rupiah(harga)}</td>
                  <td className="border p-2 text-right">{rupiah(total)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="mt-2 text-right font-bold">
          TOTAL BARANG : {rupiah(totalBarang)}
        </div>

        {isKredit && (
          <div className="mt-3 text-right text-sm">
            <p>
              Total Nominal Barang : <b>{rupiah(totalBarang)}</b>
            </p>

            <hr className="my-1" />

            {/* <p className="text-base font-bold text-indigo-700">
              TOTAL KREDIT : {rupiah(totalKredit)}
            </p> */}
          </div>
        )}

        {/* TOTAL */}
        <div className="mt-4 text-right">
          <p>
            Total Penjualan :{" "}
            <b>{isKredit ? rupiah(totalKredit) : rupiah(totalBarang)}</b>
          </p>
          <p>
            Status Bayar : <b>{payment?.status}</b>
          </p>
          <p>
            Metode Bayar : <b>{payment?.paymentMethod}</b>
          </p>

          {isKredit && (
            <div className="mt-2 text-xs space-y-1">
              <p>Harga Barang : {rupiah(totalBarang)}</p>

              <p>DP User : {rupiah(payment.dpUser)}</p>
              <p>Voucher : {rupiah(payment.voucher)}</p>

              <hr />

              {/* <p>
                <b>Sisa Hutang :</b> {rupiah(payment.grandTotal)}
              </p> */}
              <p>Tenor : {payment.tenor}</p>
            </div>
          )}

          <p className="text-lg font-bold mt-2">
            GRAND TOTAL : {rupiah(payment?.grandTotal)}
          </p>
        </div>

        <hr className="my-3" />

        <div className="text-sm space-y-1">
          <div className="flex justify-between">
            <span>Grand Total</span>
            <span>Rp {payment.grandTotal.toLocaleString("id-ID")}</span>
          </div>

          {/* SPLIT PAYMENT */}
          {payment.splitPayment && (
            <>
              <div className="font-semibold mt-2">Detail Pembayaran</div>
              {payment.splitPayment.map((p, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span>
                    {p.metode}
                    {p.bankNama ? ` - ${p.bankNama}` : ""}
                    {p.metode === "TUKAR TAMBAH" ? " (TUKAR TAMBAH)" : ""}
                  </span>
                  <span>
                    Rp {Number(p.nominal || 0).toLocaleString("id-ID")}
                  </span>
                </div>
              ))}
            </>
          )}

          {payment.splitPayment?.some((p) => p.metode === "TUKAR TAMBAH") && (
            <div className="mt-2 text-red-600 font-semibold">
              ⚠️ TRANSAKSI DENGAN TUKAR TAMBAH
            </div>
          )}

          {/* KEMBALIAN */}
          {payment.kembalian > 0 && (
            <div className="flex justify-between font-bold text-green-700 mt-2">
              <span>Uang Kembalian</span>
              <span>
                Rp {Number(payment.kembalian).toLocaleString("id-ID")}
              </span>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="flex justify-between mt-10">
          <div className="text-center">
            <p>Pelanggan</p>
            <br />
            <br />
            <p>{user?.namaPelanggan}</p>
          </div>
          <div className="text-center">
            <p>Hormat Kami</p>
            <br />
            <br />
            <p>{user?.namaSales}</p>
          </div>
        </div>

        <p className="text-center mt-6 text-xs">
          Terima kasih telah berbelanja di tempat kami
        </p>
      </div>
    </div>
  );
}
