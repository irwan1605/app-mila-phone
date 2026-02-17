import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ref, get, onValue } from "firebase/database";
import { db } from "../../firebase/FirebaseInit";

export default function PrintSuratJalan() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [itemsGabungan, setItemsGabungan] = useState([]);
  const [brandMap, setBrandMap] = useState({});

  useEffect(() => {
    if (!data?.noSuratJalan) return;

    const unsub = onValue(ref(db, "surat_jalan"), (snap) => {
      const arr = [];

      snap.forEach((c) => {
        const v = c.val();
        if (!v) return;

        if (
          String(v.noSuratJalan).trim() ===
          String(data.noSuratJalan).trim()
        ) {
          arr.push({
            barang: v.barang,
            brand: v.brand || brandMap[v.barang] || "-",
            qty: v.qty,
            imeis: v.imeis || [],
          });
        }
      });

      setItemsGabungan(arr);
    });

    return () => unsub();
  }, [data?.noSuratJalan]);

  useEffect(() => {
    return onValue(ref(db, "toko"), (snap) => {
      const map = {};

      snap.forEach((tokoSnap) => {
        const trxSnap = tokoSnap.child("transaksi");
        if (!trxSnap.exists()) return;

        trxSnap.forEach((trx) => {
          const v = trx.val();
          const barang = String(v.NAMA_BARANG || "").trim();
          const brand = String(v.NAMA_BRAND || "").trim();

          if (barang && brand && !map[barang]) {
            map[barang] = brand;
          }
        });
      });

      setBrandMap(map);
    });
  }, []);

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
        alert("❌ Gagal memuat Surat Jalan");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [id]);

  if (loading)
    return <div className="p-6 text-center">Loading Surat Jalan...</div>;

  if (!data)
    return (
      <div className="p-6 text-center text-red-600 font-bold">
        ❌ Surat Jalan Tidak Ditemukan
      </div>
    );

  const handlePrint = () => {
    const printArea = document.querySelector(".print-area");
    const originalContents = document.body.innerHTML;

    document.body.innerHTML = printArea.innerHTML;
    window.print();
    document.body.innerHTML = originalContents;
    window.location.reload();
  };

  return (
    <div className="bg-gray-100 min-h-screen py-6">
      {/* BUTTON */}
      <div className="max-w-[900px] mx-auto mb-4 flex justify-end gap-3 no-print">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 rounded-lg bg-gray-500 text-white font-bold"
        >
          ⬅ CANCEL
        </button>

        <button
          onClick={handlePrint}
          className="px-4 py-2 rounded-lg bg-indigo-600 text-white font-bold"
        >
          🖨 CETAK
        </button>
      </div>

      {/* DOCUMENT */}
      <div
        className="print-area thermal-paper bg-white text-black p-2"
        style={{ width: "60mm", margin: "0 auto" }}
      >
        {/* HEADER */}
        <div className="text-center border-b pb-2 mb-2">
          <img src="/logoMMT.png" alt="MMT" className="h-10 mx-auto mb-1" />
          <h1 className="text-[11px] font-bold">
            PT. MILA MEDIA TELEKOMUNIKASI
          </h1>
          <p className="text-[9px]">SURAT JALAN</p>
          <p className="text-[9px]">No: {data.noSuratJalan}</p>
          <p className="text-[9px]">
            {new Date(data.tanggal).toLocaleDateString("id-ID")}
          </p>
        </div>

        {/* INFO */}
        <div className="text-[9px] mb-2 space-y-1">
        <p><b> Nama Pengirim:</b> {data.pengirim || "-"}</p>
          <p><b>Toko Pengirim:</b> {data.tokoPengirim}</p>
         
          <p><b>Toko Tujuan:</b> {data.tokoTujuan}</p>
        </div>

        {/* TABLE */}
        <table className="w-full border-collapse text-[8px] mb-3">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-1 py-1">No</th>
              <th className="border px-1 py-1">Brand</th>
              <th className="border px-1 py-1">Barang</th>
              <th className="border px-1 py-1">IMEI</th>
              <th className="border px-1 py-1">Qty</th>
            </tr>
          </thead>

          <tbody>
            {(itemsGabungan.length
              ? itemsGabungan
              : data.items || []
            ).map((item, i) => (
              <tr key={i}>
                <td className="border px-1 py-1 text-center">{i + 1}</td>
                <td className="border px-1 py-1">{item.brand}</td>
                <td className="border px-1 py-1">{item.barang}</td>
                <td className="border px-1 py-1">
                  {item.imeis?.length ? item.imeis.join(", ") : "-"}
                </td>
                <td className="border px-1 py-1 text-center">
                  {item.qty || 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="text-[8px] mt-2">
          Barang di atas telah diserahkan dalam kondisi baik dan sesuai.
        </p>

        {/* TTD */}
        <div className="grid grid-cols-3 gap-2 text-center text-[8px] mt-6">
          <div>
            <p className="mb-10">Menyerahkan</p>
            <div className="border-t">( ............ )</div>
          </div>

          <div>
            <p className="mb-10">Pengirim</p>
            <div className="border-t">
              ( {data.pengirim || "........"} )
            </div>
          </div>

          <div>
            <p className="mb-10">Penerima</p>
            <div className="border-t">( ............ )</div>
          </div>
        </div>
      </div>
    </div>
  );
}
