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
    // Sembunyikan navbar aplikasi
    const navbar = document.querySelector("nav");
    const header = document.querySelector("header");

    if (navbar) navbar.style.display = "none";
    if (header) header.style.display = "none";

    return () => {
      // Kembalikan saat keluar halaman print
      if (navbar) navbar.style.display = "";
      if (header) header.style.display = "";
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      // 1️⃣ Coba dari surat_jalan
      const sjSnap = await get(ref(db, `surat_jalan/${id}`));
      if (sjSnap.exists()) {
        setData(sjSnap.val());
        return;
      }

      // 2️⃣ Fallback: ambil dari transfer_barang (PENDING / ANTISIPASI)
      const trSnap = await get(ref(db, `transfer_barang/${id}`));
      if (trSnap.exists()) {
        const t = trSnap.val();

        setData({
          noSuratJalan: t.noSuratJalan,
          tanggal: t.tanggal,
          tokoPengirim: t.tokoPengirim,
          tokoTujuan: t.ke,
          pengirim: t.pengirim,
          barang: t.barang,
          qty: t.qty,
          imeis: t.imeis || [],
        });
      }
    };

    load();
  }, [id]);

  return (
    <div className="print-only  p-6">
      <div ref={printRef} className="bg-white p-6 w-[210mm] mx-auto">
        <div className="text-center mb-4">
          <img src={Logo} alt="Logo" className="logo" />

          <div className="company">
            <h1>MILA PHONE</h1>
            <p>Distribusi & Retail Elektronik</p>
          </div>

          <div className="doc-title">
            <h2>SURAT JALAN</h2>
            <p>No: {data?.noSuratJalan}</p>
          </div>
        </div>

        <table className="w-full text-sm border mb-4">
          <tbody>
            <tr>
              <td>Tanggal</td>
              <td>{data?.tanggal}</td>
            </tr>
            <tr>
              <td>Dari</td>
              <td>{data?.tokoPengirim}</td>
            </tr>
            <tr>
              <td>Ke</td>
              <td>{data?.tokoTujuan}</td>
            </tr>
            <tr>
              <td>Pengirim</td>
              <td>{data?.pengirim}</td>
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
              <td className="border px-2">{data?.barang}</td>
              <td className="border px-2 text-center">{data?.qty}</td>
              <td className="border px-2 text-xs">
                {(data?.imeis || []).join(", ")}
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
              <td className="border px-2">{data?.pengirim}</td>
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
      @media print {
  /* SEMBUNYIKAN SEMUA KECUALI SURAT JALAN */
  body * {
    visibility: hidden;
  }

  /* TAMPILKAN HANYA AREA PRINT */
  .print-only,
  .print-only * {
    visibility: visible;
  }

  .print-only {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
  }

  /* HILANGKAN MARGIN BROWSER */
  body {
    margin: 0;
    padding: 0;
    background: #fff;
  }
}

      `}</style>
    </div>
  );
}
