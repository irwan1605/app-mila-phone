import React, { forwardRef } from "react";
import Logo from "../../assets/logoMMT.png";

/**
 * PrintSuratJalan.jsx
 * -------------------
 * Props:
 * - data : object transfer (1 surat jalan)
 *
 * Siap:
 * - Print langsung (window.print)
 * - Export PDF (html2canvas / jsPDF)
 */
const PrintSuratJalan = forwardRef(({ data }, ref) => {
  if (!data) return null;

  const {
    noSuratJalan,
    tanggal,
    tokoPengirim,
    ke,
    pengirim,
    items = [],
  } = data;

  return (
    <div ref={ref} className="print-wrapper">
      <div className="a4-page">
        {/* ================= HEADER ================= */}
        <div className="header">
          <img src={Logo} alt="Logo" className="logo" />

          <div className="company">
            <h1>MILA PHONE</h1>
            <p>Distribusi & Retail Elektronik</p>
          </div>

          <div className="doc-title">
            <h2>SURAT JALAN</h2>
            <p>No: {noSuratJalan}</p>
          </div>
        </div>

        {/* ================= INFO ================= */}
        <table className="info-table">
          <tbody>
            <tr>
              <td>Tanggal</td>
              <td>: {tanggal}</td>
              <td>Toko Pengirim</td>
              <td>: {tokoPengirim}</td>
            </tr>
            <tr>
              <td>Nama Pengirim</td>
              <td>: {pengirim || "-"}</td>
              <td>Toko Tujuan</td>
              <td>: {ke}</td>
            </tr>
          </tbody>
        </table>

        {/* ================= BARANG ================= */}
        <table className="item-table">
          <thead>
            <tr>
              <th style={{ width: "5%" }}>No</th>
              <th style={{ width: "35%" }}>Nama Barang</th>
              <th style={{ width: "10%" }}>Qty</th>
              <th style={{ width: "50%" }}>IMEI / Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan="4" style={{ textAlign: "center" }}>
                  Tidak ada data barang
                </td>
              </tr>
            )}

            {items.map((it, i) => (
              <tr key={i}>
                <td style={{ textAlign: "center" }}>{i + 1}</td>
                <td>{it.barang}</td>
                <td style={{ textAlign: "center" }}>{it.qty}</td>
                <td style={{ fontSize: "11px" }}>
                  {(it.imeis || []).length > 0
                    ? it.imeis.join(", ")
                    : "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ================= CATATAN ================= */}
        <div className="note">
          <p>
            Barang telah diterima dalam kondisi baik dan lengkap sesuai dengan
            surat jalan ini.
          </p>
        </div>

        {/* ================= TTD ================= */}
        <div className="signature">
          <div>
            <p>Pengirim</p>
            <div className="sign-box" />
            <p className="name">{pengirim || "_________________"}</p>
          </div>

          <div>
            <p>Penerima</p>
            <div className="sign-box" />
            <p className="name">_________________</p>
          </div>
        </div>
      </div>

      {/* ================= STYLE ================= */}
      <style>{`
        @page {
          size: A4;
          margin: 15mm;
        }

        .print-wrapper {
          background: #fff;
        }

        .a4-page {
          width: 210mm;
          min-height: 297mm;
          padding: 15mm;
          font-family: Arial, Helvetica, sans-serif;
          color: #000;
        }

        /* HEADER */
        .header {
          display: grid;
          grid-template-columns: 80px 1fr auto;
          align-items: center;
          gap: 12px;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
          margin-bottom: 14px;
        }

        .logo {
          height: 70px;
          object-fit: contain;
        }

        .company h1 {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
        }

        .company p {
          margin: 0;
          font-size: 12px;
        }

        .doc-title {
          text-align: right;
        }

        .doc-title h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 700;
        }

        .doc-title p {
          margin: 0;
          font-size: 12px;
        }

        /* INFO */
        .info-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12px;
          font-size: 12px;
        }

        .info-table td {
          padding: 4px 6px;
          vertical-align: top;
        }

        /* ITEMS */
        .item-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }

        .item-table th,
        .item-table td {
          border: 1px solid #000;
          padding: 6px;
          vertical-align: top;
        }

        .item-table th {
          background: #f2f2f2;
          text-align: center;
        }

        /* NOTE */
        .note {
          margin-top: 14px;
          font-size: 12px;
        }

        /* SIGNATURE */
        .signature {
          margin-top: 30px;
          display: flex;
          justify-content: space-between;
          text-align: center;
          font-size: 12px;
        }

        .sign-box {
          margin: 40px auto 8px;
          width: 160px;
          border-bottom: 1px solid #000;
        }

        .name {
          font-weight: bold;
        }

        /* PRINT ONLY */
        @media print {
          body {
            background: #fff;
          }
        }
      `}</style>
    </div>
  );
});

export default PrintSuratJalan;
