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

export default function CetakInvoicePenjualan({ transaksi }) {
  const printRef = useRef(null);

  /**
   * ✅ HOOK HARUS DI ATAS (TIDAK BOLEH DI DALAM IF)
   */
  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: transaksi?.invoice
      ? `Invoice-${transaksi.invoice}`
      : "Invoice",
    pageStyle: `
      @page { size: A4; margin: 12mm; }
      @media print {
        body { -webkit-print-color-adjust: exact; }
      }
    `,
  });

  /**
   * ✅ OPTIONAL: AUTO PRINT SAAT HALAMAN DIBUKA
   * (boleh dihapus kalau tidak mau auto print)
   */
  useEffect(() => {
    if (!transaksi) return;
    const t = setTimeout(() => {
      handlePrint();
    }, 600);
    return () => clearTimeout(t);
  }, [transaksi, handlePrint]);

  /**
   * ⛔ RETURN BOLEH SETELAH SEMUA HOOK
   */
  if (!transaksi) {
    return (
      <div className="p-10 text-center text-gray-500">
        Data invoice tidak ditemukan
      </div>
    );
  }

  const {
    invoice,
    toko,
    user = {},
    items = [],
    payment = {},
    totalBarang,
  } = transaksi;

  return (
    <div className="bg-gray-100 min-h-screen p-4">
      {/* TOMBOL CETAK (TIDAK IKUT KE PDF) */}
      <div className="mb-4 text-right print:hidden">
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          🖨️ Cetak PDF
        </button>
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
            <p>Tanggal : {user?.tanggal}</p>
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
            {items.map((it, idx) => (
              <tr key={idx}>
                <td className="border p-2 text-center">{idx + 1}</td>
                <td className="border p-2">{it.namaBarang}</td>
                <td className="border p-2">
                  {(it.imeiList || []).join(", ")}
                </td>
                <td className="border p-2 text-center">{it.qty}</td>
                <td className="border p-2 text-right">
                  {rupiah(it.hargaUnit)}
                </td>
                <td className="border p-2 text-right">
                  {rupiah(it.hargaUnit * it.qty)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* TOTAL */}
        <div className="mt-4 text-right">
          <p>
            Total Penjualan : <b>{rupiah(totalBarang)}</b>
          </p>
          <p>
            Status Bayar : <b>{payment?.status}</b>
          </p>
          <p>
            Metode Bayar : <b>{payment?.metode}</b>
          </p>

          {payment?.metode === "KREDIT" && (
            <>
              <p>Tenor : {payment.tenor} Bulan</p>
              <p>Bayar / Bulan : {rupiah(payment.bayarPerBulan)}</p>
            </>
          )}

          <p className="text-lg font-bold mt-2">
            GRAND TOTAL : {rupiah(payment?.grandTotal)}
          </p>
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
