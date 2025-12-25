import React, { useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import logo from "../../assets/logoMMT.png";

export default function CetakInvoicePembelian({ draftItems, onClose }) {
  const ref = useRef();

  const grandTotal = draftItems.reduce((s, i) => s + i.total, 0);

  const handlePrint = async () => {
    const canvas = await html2canvas(ref.current);
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");

    const w = pdf.internal.pageSize.getWidth();
    const h = (canvas.height * w) / canvas.width;

    pdf.addImage(img, "PNG", 0, 0, w, h);
    pdf.save(`Invoice_${draftItems[0].noDo}.pdf`);
  };

  return (
    <div>
      <div ref={ref} className="p-6 bg-white text-sm">
        <div className="flex justify-between mb-4">
          <img src={logo} className="h-12" />
          <div className="text-right">
            <div>No DO: {draftItems[0].noDo}</div>
            <div>Tanggal: {draftItems[0].tanggal}</div>
            <div>Supplier: {draftItems[0].supplier}</div>
          </div>
        </div>

        <table className="w-full border text-xs">
          <thead>
            <tr>
              <th className="border p-2">Barang</th>
              <th className="border p-2">Harga</th>
              <th className="border p-2">Qty</th>
              <th className="border p-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {draftItems.map((d) => (
              <tr key={d.id}>
                <td className="border p-2">{d.barang}</td>
                <td className="border p-2">Rp {d.hargaSup}</td>
                <td className="border p-2">{d.qty}</td>
                <td className="border p-2">Rp {d.total}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="text-right mt-3 font-bold">
          GRAND TOTAL: Rp {grandTotal}
        </div>

        <div className="flex justify-between mt-12">
          <div>
            <div>Admin</div>
            <div className="mt-12">( __________ )</div>
          </div>
          <div>
            <div>Supplier</div>
            <div className="mt-12">( __________ )</div>
          </div>
        </div>
      </div>

      <div className="text-center mt-4 flex justify-center gap-3">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-400 hover:bg-gray-500 text-white rounded-lg"
        >
          Tutup
        </button>

        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
        >
          Cetak Invoice
        </button>
      </div>
    </div>
  );
}
