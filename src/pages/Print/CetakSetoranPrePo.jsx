// ==================================================
// CetakSetoranPrePo.jsx
// Print INVOICE SETORAN Pre ORDER (THERMAL 60MM)
// TERINTEGRASI FinanceReport
// ==================================================

import React, { useEffect, useRef } from "react";
import logoUrl from "../../assets/logoMMT.png";
import { useReactToPrint } from "react-to-print";
import { useLocation, useNavigate } from "react-router-dom";

const rupiah = (n) =>
  Number(n || 0).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });

export default function CetakSetoranPrePo() {
  const location = useLocation();
  const navigate = useNavigate();
  const printRef = useRef(null);

  const transaksi = location.state?.data;

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: transaksi?.NO_PRE_ORDER || "Invoice",
  });

  useEffect(() => {
    if (!transaksi) {
      navigate(-1);
    }
  }, [transaksi, navigate]);

  if (!transaksi) return null;

  const tanggalCetak = new Date().toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const total =
    Number(transaksi.QTY || 0) *
    Number(transaksi.HARGA || 0);

  return (
    <div className="p-4">

      {/* BUTTON AREA */}
      <div className="flex justify-center gap-4 mb-4 p-2 print:hidden">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-600 text-white rounded"
        >
          ❌ Close
        </button>

        <button
          type="button"
          onClick={handlePrint}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          🖨️ CETAK SETORAN Pre ORDER
        </button>
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
            <h2 className="font-bold text-sm">
              INVOICE SETORAN Pre ORDER
            </h2>
            <p>No : {transaksi.NO_PRE_ORDER}</p>
            <p>{tanggalCetak}</p>
          </div>
        </div>

        {/* INFO */}
        <div className="grid grid-cols-1 gap-1 mb-2">
          <p><b>Toko</b> : {transaksi.NAMA_TOKO}</p>
          <p><b>Store Head</b> : {transaksi.STORE_HEAD}</p>
          <p><b>Sales</b> : {transaksi.NAMA_SALES}</p>
          <p><b>Handle</b> : {transaksi.SALES_HANDLE}</p>
          <p><b>Pelanggan</b> : {transaksi.NAMA_PELANGGAN}</p>
          <p><b>No HP</b> : {transaksi.NO_TLP}</p>
        </div>

        {/* TABLE */}
        <table className="w-full border-collapse border text-[9px]">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-1">No</th>
              <th className="border p-1">Barang</th>
              <th className="border p-1">Qty</th>
              <th className="border p-1">Harga</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border p-1 text-center">1</td>
              <td className="border p-1">
                {transaksi.NAMA_BARANG}
                <div className="text-[8px]">
                  {transaksi.KATEGORI_BARANG} - {transaksi.NAMA_BRAND}
                </div>
              </td>
              <td className="border p-1 text-center">
                {transaksi.QTY}
              </td>
              <td className="border p-1 text-right">
                {rupiah(transaksi.HARGA)}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="mt-2 text-right font-bold">
          TOTAL : {rupiah(total)}
        </div>

        <div className="text-right text-[9px]">
          DP USER : {rupiah(transaksi.DP_PAYMENT)}
        </div>

        <div className="text-right text-[9px]">
          Metode : {transaksi.KATEGORI_PEMBAYARAN}
        </div>

        <div className="text-right text-[9px]">
          Status : {transaksi.STATUS}
        </div>

        <hr className="my-2" />

        <p className="text-center text-[9px]">
          Terima kasih telah melakukan transaksi
        </p>

        {/* PERINGATAN */}
        <div className="mt-2 border border-red-500 p-2 text-red-600 text-[8px] leading-tight">
          <div className="font-bold text-center mb-1">
            PERHATIAN !!!
          </div>

          <ul className="list-disc pl-3 space-y-0.5">
            <li>Mohon diperiksa kembali data setoran</li>
            <li>Setoran Pre Order tidak dapat dibatalkan sepihak</li>
            <li>Harap simpan invoice sebagai bukti transaksi</li>
          </ul>
        </div>
      </div>
    </div>
  );
}