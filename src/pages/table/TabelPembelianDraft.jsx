import React, { useMemo } from "react";
import { FaSave, FaTrash, FaPrint, FaEdit } from "react-icons/fa";


export default function TabelPembelianDraft({
  draftItems,
  onDelete,
  onEdit,
  onSubmit,
  onPreview,
}) {
  const grandTotal = useMemo(
    () => draftItems.reduce((s, i) => s + i.total, 0),
    [draftItems]
  );

  if (draftItems.length === 0) {
    return (
      <div className="p-6 text-center text-slate-500">
        Belum ada pembelian untuk No DO ini.
      </div>
    );
  }


// ✅ TAMBAHKAN DI ATAS FILE
const fmt = (n) => {
    try {
      return Number(n || 0).toLocaleString("id-ID");
    } catch {
      return String(n || "");
    }
  };
  

  return (
    <div className="bg-white rounded-2xl shadow-xl p-4 space-y-4">
      <h2 className="text-lg font-bold text-slate-800">
        Daftar Pembelian (1 No DO)
      </h2>

      <table className="w-full text-xs border">
        <thead className="bg-slate-100">
          <tr>
            <th className="border p-2">Tanggal</th>
            <th className="border p-2">No DO</th>
            <th className="border p-2">Supplier</th>
            <th className="border p-2 text-center">Nama Brand</th>
            <th className="border p-2 text-center">Nama Barang</th>
            <th className="border p-2 text-right">Harga Supllier</th>
            <th className="border p-2 text-center">Qty</th>
            <th className="border p-2 text-right">Total</th>
            <th className="border p-2 text-center">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {draftItems.map((d) => (
            <tr key={d.id}>
              <td className="border p-2">{d.tanggal}</td>
              <td className="border p-2">{d.noDo}</td>
              <td className="border p-2">{d.supplier}</td>
              <td className="border p-2">{d.brand}</td>
              <td className="border p-2">{d.barang}</td>
              <td className="border p-2 text-right">
                Rp {fmt(d.hargaSup)}
              </td>
              <td className="border p-2 text-center">{d.qty}</td>
              <td className="border p-2 text-right font-semibold">
                Rp {fmt(d.total)}
              </td>
              <td className="border p-2 text-center space-x-1">
                <button onClick={() => onEdit(d)}>
                  <FaEdit />
                </button>
                <button onClick={() => onDelete(d.id)}>
                  <FaTrash />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-between items-center">
        <div className="font-bold text-indigo-700">
          Grand Total : Rp {fmt(grandTotal)}
        </div>

        <div className="flex gap-2">
          <button
            onClick={onPreview}
            className="px-3 py-2 bg-slate-700 text-white rounded-lg"
          >
            <FaPrint /> Preview Invoice
          </button>
          <button
            onClick={onSubmit}
            className="px-3 py-2 bg-indigo-600 text-white rounded-lg"
          >
            <FaSave /> SIMPAN
          </button>
        </div>
      </div>
    </div>
  );
}

