import React, { useEffect, useMemo, useState } from "react";
import { listenAllTransaksi } from "../services/FirebaseService";
import * as XLSX from "xlsx";
import { FaFileExcel, FaSearch } from "react-icons/fa";

export default function RefundReport() {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");
  const [filterToko, setFilterToko] = useState("ALL");

  /* ================= LISTENER ================= */
  useEffect(() => {
    const unsub = listenAllTransaksi((data = []) => {
      const refundRows = data
        .filter(
          (t) =>
            t &&
            t.STATUS === "Approved" &&
            t.PAYMENT_METODE === "RETUR"
        )
        .map((r) => {
            const brand =
              r.NAMA_BRAND && r.NAMA_BRAND !== "-"
                ? r.NAMA_BRAND
                : r.NOMOR_UNIK?.split("|")[0] || "-";
          
            const barang =
              r.NAMA_BARANG && r.NAMA_BARANG !== "-"
                ? r.NAMA_BARANG
                : r.NOMOR_UNIK?.split("|")[1] || "-";
          
            const imei =
              r.IMEI &&
              !r.IMEI.includes("undefined")
                ? r.IMEI
                : "";
          
            return {
              ...r,
              NAMA_BRAND: brand,
              NAMA_BARANG: barang,
              IMEI: imei,
            };
          });

      setRows(refundRows);
    });

    return () => unsub && unsub();
  }, []);

  /* ================= FILTER ================= */
  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (
        search &&
        !(
          r.NAMA_BARANG?.toLowerCase().includes(search.toLowerCase()) ||
          r.NAMA_BRAND?.toLowerCase().includes(search.toLowerCase()) ||
          r.NAMA_TOKO?.toLowerCase().includes(search.toLowerCase()) ||
          r.IMEI?.toLowerCase().includes(search.toLowerCase())
        )
      )
        return false;

      if (filterToko !== "ALL" && r.NAMA_TOKO !== filterToko)
        return false;

      return true;
    });
  }, [rows, search, filterToko]);

  /* ================= EXPORT ================= */
  const exportExcel = () => {
    const excelRows = filtered.map((r, i) => ({
      NO: i + 1,
      TANGGAL: r.TANGGAL_TRANSAKSI,
      TOKO: r.NAMA_TOKO,
      BRAND: r.NAMA_BRAND,
      BARANG: r.NAMA_BARANG,
      IMEI: r.IMEI || "NON IMEI",
      QTY: r.QTY,
      INVOICE: r.NO_INVOICE,
      KETERANGAN: r.KETERANGAN,
    }));

    const ws = XLSX.utils.json_to_sheet(excelRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan_Retur");

    XLSX.writeFile(
      wb,
      `Laporan_Retur_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`
    );
  };

  const tokoList = useMemo(() => {
    return [
      "ALL",
      ...new Set(rows.map((r) => r.NAMA_TOKO).filter(Boolean)),
    ];
  }, [rows]);

  return (
    <div className="p-6 bg-white rounded-xl shadow">
      <h1 className="text-2xl font-bold mb-4 text-orange-600">
        🔄 LAPORAN RETUR / REFUND
      </h1>

      {/* CONTROL */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2 flex-1">
          <FaSearch />
          <input
            className="border p-2 rounded w-full"
            placeholder="Cari barang / IMEI / toko..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          value={filterToko}
          onChange={(e) => setFilterToko(e.target.value)}
          className="border p-2 rounded"
        >
          {tokoList.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>

        <button
          onClick={exportExcel}
          className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-green-700"
        >
          <FaFileExcel /> Export Excel
        </button>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="w-full border text-sm">
          <thead className="bg-gray-200">
            <tr>
              <th className="border p-2">No</th>
              <th className="border p-2">Tanggal</th>
              <th className="border p-2">Toko</th>
              <th className="border p-2">Brand</th>
              <th className="border p-2">Barang</th>
              <th className="border p-2">No IMEI</th>
              <th className="border p-2">Qty</th>
              <th className="border p-2">Invoice</th>
              <th className="border p-2">Keterangan</th>
            </tr>
          </thead>

          <tbody>
            {filtered.map((r, i) => (
              <tr key={r.id || i} className="hover:bg-gray-50">
                <td className="border p-2 text-center">{i + 1}</td>
                <td className="border p-2">{r.TANGGAL_TRANSAKSI}</td>
                <td className="border p-2">{r.NAMA_TOKO}</td>
                <td className="border p-2 font-semibold text-indigo-600">
                  {r.NAMA_BRAND}
                </td>
                <td className="border p-2 font-medium">
                  {r.NAMA_BARANG}
                </td>
                <td className="border p-2 font-mono text-xs">
                  {r.IMEI || "NON-IMEI"}
                </td>
                <td className="border p-2 text-center">{r.QTY}</td>
                <td className="border p-2">{r.NO_INVOICE}</td>
                <td className="border p-2 text-xs">
                  {r.KETERANGAN}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
