import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ref, get } from "firebase/database";
import { db } from "../../firebase/FirebaseInit";

export default function PrintSuratJalan() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const load = async () => {
      try {
        const snap = await get(ref(db, `surat_jalan/${id}`));
        if (snap.exists()) {
          setData(snap.val());
        } else {
          alert("❌ Surat Jalan tidak ditemukan");
        }
      } catch (e) {
        console.error(e);
        alert("❌ Gagal memuat Surat Jalan");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  if (loading) {
    return <div className="p-6 text-center">Loading Surat Jalan...</div>;
  }

  if (!data) {
    return (
      <div className="p-6 text-center text-red-600 font-bold">
        ❌ Surat Jalan Tidak Ditemukan
      </div>
    );
  }

  const handlePrint = () => {
    const printArea = document.querySelector(".print-area");
    if (!printArea) {
      alert("Area Surat Jalan tidak ditemukan");
      return;
    }

    // simpan tampilan awal
    const originalContents = document.body.innerHTML;

    // ganti body dengan surat jalan saja
    document.body.innerHTML = printArea.innerHTML;

    // cetak
    window.print();

    // kembalikan tampilan semula
    document.body.innerHTML = originalContents;

    // reload react supaya event & state normal
    window.location.reload();
  };

  return (
    <div className="bg-gray-100 min-h-screen py-6">
      {/* ================= BUTTON ACTION ================= */}
      <div className="max-w-[900px] mx-auto mb-4 flex justify-end gap-3 no-print">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded-lg bg-gray-500 text-white font-bold hover:bg-gray-600"
        >
          ⬅ CANCEL
        </button>

        <button
          onClick={handlePrint}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 no-print"
        >
          🖨 CETAK
        </button>
      </div>

      {/* ================= DOCUMENT ================= */}
      {/* ================= DOCUMENT ================= */}
      <div className="print-area w-[800px] mx-auto bg-white text-black p-6 shadow print:shadow-none">
        {/* HEADER */}
        <div className="flex justify-between items-center border-b pb-3 mb-4">
          <div className="flex items-center gap-3">
            <img src="/logoMMT.png" alt="MMT" className="h-14 object-contain" />
            <div>
              <h1 className="text-xl font-extrabold">
                PT. MILA MEDIA TELEKOMUNIKASI
              </h1>
              <p className="text-xs text-gray-600">
                Monitoring & Report Management
              </p>
            </div>
          </div>

          <div className="text-sm text-right">
            <p>
              <b>SURAT JALAN</b>
            </p>
            <p>No: {data.noSuratJalan}</p>
            <p>Tanggal: {new Date(data.tanggal).toLocaleDateString("id-ID")}</p>
          </div>
        </div>

        {/* INFO TOKO */}
        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
          <div className="border rounded p-3">
            <p className="font-bold mb-1">Toko Pengirim</p>
            <p>{data.tokoPengirim}</p>
            <p className="mt-1 text-xs">
              Pengirim: <b>{data.pengirim || "-"}</b>
            </p>
          </div>

          <div className="border rounded p-3">
            <p className="font-bold mb-1">Toko Tujuan</p>
            <p>{data.tokoTujuan}</p>
          </div>
        </div>

        {/* TABLE BARANG */}
        <table className="w-full border-collapse text-sm mb-6">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-2 py-2 w-10">No</th>
              <th className="border px-2 py-2 text-left">Nama Barang</th>
              <th className="border px-2 py-2 text-left">IMEI</th>
              <th className="border px-2 py-2 w-16 text-center">Qty</th>
            </tr>
          </thead>
          <tbody>
            {(data.imeis || []).map((im, i) => (
              <tr key={i}>
                <td className="border px-2 py-2 text-center">{i + 1}</td>
                <td className="border px-2 py-2">{data.barang}</td>
                <td className="border px-2 py-2 text-xs">{im}</td>
                <td className="border px-2 py-2 text-center">1</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* CATATAN */}
        <p className="text-xs text-gray-600 mb-10">
          Barang di atas telah diserahkan dalam kondisi baik dan sesuai.
        </p>

        {/* TTD */}
        <div className="grid grid-cols-3 gap-6 text-center text-sm mt-14">
          <div>
            <p className="mb-14 font-semibold">Menyerahkan</p>
            <div className="border-t pt-1">( ......................... )</div>
          </div>

          <div>
            <p className="mb-14 font-semibold">Pengirim</p>
            <div className="border-t pt-1">
              ( {data.pengirim || "........................."} )
            </div>
          </div>

          <div>
            <p className="mb-14 font-semibold">Penerima</p>
            <div className="border-t pt-1">( ......................... )</div>
          </div>
        </div>
      </div>
    </div>
  );
}
