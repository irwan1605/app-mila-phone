import React from "react";
import "./invoice-template.css";

export default function InvoicePreview({ data, logoUrl, tokoName }) {
  if (!data) return null;

  const {
    tanggal,
    invoice,
    user,
    items = [],
    item, // fallback lama
    totals,
    status,
  } = data;

  const listItems = items.length ? items : item ? [item] : [];

  return (
    <div className="invoice-print-area">
      <div className="invoice-header">
        <img src={logoUrl} alt="Logo" style={{ height: 60 }} />
        <div>
          <h2>PT MILA MEDIA TELEKOMUNIKASI</h2>
          <p>{tokoName}</p>
        </div>
      </div>

      <hr />

      <p><b>Tanggal:</b> {tanggal}</p>
      <p><b>No Invoice:</b> {invoice}</p>
      <p><b>Status:</b> {status}</p>

      <hr />

      <p><b>ID Pelanggan:</b> {user?.idPelanggan}</p>
      <p><b>Nama Sales:</b> {user?.namaSales}</p>

      <table className="invoice-table">
        <thead>
          <tr>
            <th>No</th>
            <th>Nama Barang</th>
            <th>IMEI</th>
            <th>QTY</th>
            <th>Harga</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {listItems.map((it, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{it?.namaBarang}</td>
              <td>{it?.imei}</td>
              <td>{it?.qty}</td>
              <td>
                Rp {Number(it?.hargaUnit || 0).toLocaleString("id-ID")}
              </td>
              <td>
                Rp{" "}
                {Number(
                  Number(it?.qty || 1) * Number(it?.hargaUnit || 0)
                ).toLocaleString("id-ID")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="mt-4">
        TOTAL: Rp {Number(totals?.lineTotal || 0).toLocaleString("id-ID")}
      </h3>
    </div>
  );
}
