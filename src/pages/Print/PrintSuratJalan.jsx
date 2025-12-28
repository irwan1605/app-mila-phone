// src/pages/PrintSuratJalan.jsx
import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { ref, get } from "firebase/database";
import { db } from "../../firebase/FirebaseInit";
import Logo from "../../assets/logoMMT.png";

export default function PrintSuratJalan() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const printRef = useRef(null);

  useEffect(() => {
    get(ref(db, `surat_jalan/${id}`)).then((snap) => {
      if (snap.exists()) setData(snap.val());
    });
  }, [id]);

  if (!data) return null;

  return (
    <div className="p-6">
      <div ref={printRef} className="bg-white p-6 w-[210mm] mx-auto">
        <div className="text-center mb-4">
          <img src={Logo} alt="Logo" className="logo" />

          <div className="company">
            <h1>MILA PHONE</h1>
            <p>Distribusi & Retail Elektronik</p>
          </div>

          <div className="doc-title">
            <h2>SURAT JALAN</h2>
            <p>No: {data.noSuratJalan}</p>
          </div>
        </div>

        <table className="w-full text-sm border mb-4">
          <tbody>
            <tr>
              <td>Tanggal</td>
              <td>{data.tanggal}</td>
            </tr>
            <tr>
              <td>Dari</td>
              <td>{data.tokoPengirim}</td>
            </tr>
            <tr>
              <td>Ke</td>
              <td>{data.tokoTujuan}</td>
            </tr>
            <tr>
              <td>Pengirim</td>
              <td>{data.pengirim}</td>
            </tr>
          </tbody>
        </table>

        <table className="w-full text-sm border">
          <thead>
            <tr>
              <th className="border px-2">No</th>
              <th className="border px-2">Barang</th>
              <th className="border px-2">Qty</th>
              <th className="border px-2">IMEI</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border px-2 text-center">1</td>
              <td className="border px-2">{data.barang}</td>
              <td className="border px-2 text-center">{data.qty}</td>
              <td className="border px-2 text-xs">
                {(data.imeis || []).join(", ")}
              </td>
            </tr>
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
            <tr>
              <td className="border px-2">Pengirim</td>
              <td className="border px-2">{data.pengirim}</td>
            </tr>
          </div>

          <div>
            <p>Penerima</p>
            <div className="sign-box" />
            <p className="name">_________________</p>
          </div>

          <div className="flex justify-center mt-6 gap-4">
            <button onClick={() => window.print()} className="btn-indigo">
              🖨️ PRINT
            </button>
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
}
