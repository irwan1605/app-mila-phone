import React from "react";
import Logo from "../../assets/logoMMT.png";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export default function PrintSuratJalan({ data }) {
  if (!data) return null;

  return (
    <div className="p-6 text-sm" style={{ width: "210mm" }}>
      <table className="w-full border border-black">
        <tbody>
          <tr>
            <td colSpan="2" className="text-center p-4 border">
              <img src={Logo} alt="Logo" className="h-16 mx-auto" />
              <h2 className="font-bold text-xl mt-2">SURAT JALAN</h2>
            </td>
          </tr>

          <tr><td className="border p-2">Nomor Surat Jalan</td><td className="border p-2">{data.noSuratJalan}</td></tr>
          <tr><td className="border p-2">Nama Pengirim</td><td className="border p-2">{data.pengirim}</td></tr>
          <tr><td className="border p-2">Dari</td><td className="border p-2">{data.tokoPengirim}</td></tr>
          <tr><td className="border p-2">Ke</td><td className="border p-2">{data.ke}</td></tr>

          <tr>
            <td colSpan="2" className="border p-2">
              <table className="w-full border">
                <thead>
                  <tr>
                    <th className="border p-1">Nama Barang</th>
                    <th className="border p-1">Qty</th>
                    <th className="border p-1">IMEI</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((it, i) => (
                    <tr key={i}>
                      <td className="border p-1">{it.barang}</td>
                      <td className="border p-1 text-center">{it.qty}</td>
                      <td className="border p-1">
                        {(it.imeis || []).join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </td>
          </tr>

          <tr>
            <td className="border p-6 text-center">Pengirim</td>
            <td className="border p-6 text-center">Penerima</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
