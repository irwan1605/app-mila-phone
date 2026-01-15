// src/pages/laporan/CetakInvoicePembelian.jsx
import React, { useEffect, useRef, useState } from "react";
import { listenAllTransaksi } from "../../services/FirebaseService";
import logo from "../../assets/logoMMT.png";

export default function CetakInvoicePembelian({ invoice, onClose }) {
  const ref = useRef();
  const [items, setItems] = useState([]);

  useEffect(() => {
    const unsub = listenAllTransaksi((data) => {
      const rows = (data || []).filter(
        (d) =>
          d.NO_INVOICE === invoice &&
          d.PAYMENT_METODE === "PEMBELIAN"
      );
      setItems(rows);
    });

    return () => unsub && unsub();
  }, [invoice]);

  const grandTotal = items.reduce(
    (s, i) => s + Number(i.TOTAL || 0),
    0
  );

  const handlePrint = () => {
    const content = ref.current.innerHTML;

    const win = window.open("", "", "width=900");
    win.document.write(`
      <html>
        <head>
          <title>Invoice Pembelian</title>
          <style>
            body { 
              font-family: Arial; 
              padding:20px 
            }

            table { 
              width:100%; 
              border-collapse: collapse 
            }

            th, td { 
              border:1px solid #999; 
              padding:8px; 
              font-size:12px 
            }

            th { 
              background:#f5f5f5 
            }
          </style>
        </head>
        <body onload="window.print()">
          ${content}
        </body>
      </html>
    `);

    win.document.close();
  };

  if (!items.length) return null;

  return (
    <div>
      {/* ================= INVOICE CONTENT ================= */}
      <div
        ref={ref}
        className="p-8 text-sm bg-white"
        style={{ width: "210mm" }}
      >
        {/* HEADER */}
        <div className="flex justify-between mb-6">
          {/* LOGO */}
          <img
            src={logo}
            alt="logo"
            style={{ height: "45px" }}
          />

          {/* INFO */}
          <div className="text-right text-sm">
            <div>
              <b>Invoice:</b> {invoice}
            </div>
            <div>
              <b>Tanggal:</b>{" "}
              {items[0].TANGGAL_TRANSAKSI}
            </div>
            <div>
              <b>Supplier:</b>{" "}
              {items[0].NAMA_SUPPLIER}
            </div>
          </div>
        </div>

        {/* TABLE */}
        <table className="w-full text-xs">
          <thead>
            <tr>
              <th width="30">No</th>
              <th>Barang</th>
              <th>IMEI</th>
              <th width="90">Harga</th>
              <th width="50">Qty</th>
              <th width="110">Total</th>
            </tr>
          </thead>

          <tbody>
            {items.map((d, i) => (
              <tr key={i}>
                <td align="center">{i + 1}</td>
                <td>{d.NAMA_BARANG}</td>
                <td style={{ fontSize: "11px" }}>
                  {d.IMEI || "-"}
                </td>
                <td>
                  Rp{" "}
                  {Number(
                    d.HARGA_SUPLAYER
                  ).toLocaleString("id-ID")}
                </td>
                <td align="center">{d.QTY}</td>
                <td>
                  Rp{" "}
                  {Number(
                    d.TOTAL
                  ).toLocaleString("id-ID")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* GRAND TOTAL */}
        <div className="text-right mt-4 font-bold">
          GRAND TOTAL : Rp{" "}
          {grandTotal.toLocaleString("id-ID")}
        </div>

        {/* SIGNATURE */}
        <div className="flex justify-between mt-24 text-sm">
          {/* ADMIN */}
          <div>
            <div>Admin</div>
            <div className="mt-12">
              ( __________________ )
            </div>
          </div>

          {/* SUPPLIER */}
          <div className="text-right">
            <div>Supplier</div>
            <div className="mt-12">
              ( __________________ )
            </div>
          </div>
        </div>
      </div>

      {/* BUTTON */}
      <div className="text-center mt-4 flex justify-center gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-500 text-white rounded"
        >
          Tutup
        </button>

        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-indigo-600 text-white rounded"
        >
          Print Invoice
        </button>
      </div>
    </div>
  );
}
