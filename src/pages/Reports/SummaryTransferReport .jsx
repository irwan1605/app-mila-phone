// src/pages/laporan/SummaryTransferReport.jsx
import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { listenTransferRequests } from "../../services/FirebaseService";

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("id-ID") : "-";

export default function SummaryTransferReport() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState({
    tanggal: "",
    noDO: "",
    toko: "",
    barang: "",
    imei: "",
    status: "",
  });

  useEffect(() => {
    const unsub = listenTransferRequests((data) => {
      setRows(Array.isArray(data) ? data : []);
    });
    return () => unsub && unsub();
  }, []);

  /* ================= FLATTEN ================= */
  const tableRows = useMemo(() => {
    const result = [];

    rows.forEach((trx) => {
      const items = Array.isArray(trx.items) ? trx.items : [];

      items.forEach((item) => {
        result.push({
          tanggal: trx.tanggal || trx.createdAt,
          noDO: trx.noSuratJalan || trx.noDO || "-",
          tokoAsal: trx.fromToko || "-",
          tokoTujuan: trx.toToko || "-",

          kategori: item.kategoriBarang || "-",
          brand: item.namaBrand || "-",
          barang: item.namaBarang || "-",
          imei: item.imeiList?.join(", ") || "-",
          qty: item.qty || 0,

          status: trx.status || trx.STATUS || "-",
        });
      });
    });

    return result;
  }, [rows]);

  /* ================= FILTER ================= */
  const filtered = useMemo(() => {
    return tableRows.filter((r) => {
      return (
        (!filter.tanggal ||
          formatDate(r.tanggal) === formatDate(filter.tanggal)) &&
        (!filter.noDO ||
          r.noDO.toLowerCase().includes(filter.noDO.toLowerCase())) &&
        (!filter.toko ||
          r.tokoAsal.toLowerCase().includes(filter.toko.toLowerCase()) ||
          r.tokoTujuan.toLowerCase().includes(filter.toko.toLowerCase())) &&
        (!filter.barang ||
          r.barang.toLowerCase().includes(filter.barang.toLowerCase())) &&
        (!filter.imei || r.imei.includes(filter.imei)) &&
        (!filter.status ||
          r.status.toLowerCase().includes(filter.status.toLowerCase()))
      );
    });
  }, [tableRows, filter]);

  /* ================= EXPORT ================= */
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Summary Transfer");

    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf]), `Summary_Transfer_${Date.now()}.xlsx`);
  };

  return (
    <div className="p-5 bg-white rounded-xl shadow">
      <h2 className="text-xl font-bold mb-4">📦 Summary Transfer Barang</h2>

      {/* FILTER */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4">
        <input type="date" onChange={(e) => setFilter({ ...filter, tanggal: e.target.value })} />
        <input placeholder="No DO" onChange={(e) => setFilter({ ...filter, noDO: e.target.value })} />
        <input placeholder="Nama Toko" onChange={(e) => setFilter({ ...filter, toko: e.target.value })} />
        <input placeholder="Nama Barang" onChange={(e) => setFilter({ ...filter, barang: e.target.value })} />
        <input placeholder="IMEI" onChange={(e) => setFilter({ ...filter, imei: e.target.value })} />
        <input placeholder="Status" onChange={(e) => setFilter({ ...filter, status: e.target.value })} />
      </div>

      <button
        onClick={exportExcel}
        className="mb-3 px-3 py-1 bg-green-600 text-white rounded"
      >
        Export Excel
      </button>

      <div className="overflow-x-auto">
        <table className="min-w-[1500px] text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th>Tanggal</th>
              <th>No DO</th>
              <th>Toko Asal</th>
              <th>Toko Tujuan</th>
              <th>Kategori</th>
              <th>Brand</th>
              <th>Barang</th>
              <th>IMEI</th>
              <th>QTY</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i} className="border-t">
                <td>{formatDate(r.tanggal)}</td>
                <td>{r.noDO}</td>
                <td>{r.tokoAsal}</td>
                <td>{r.tokoTujuan}</td>
                <td>{r.kategori}</td>
                <td>{r.brand}</td>
                <td>{r.barang}</td>
                <td>{r.imei}</td>
                <td>{r.qty}</td>
                <td>{r.status}</td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={10} className="text-center py-4 text-gray-400">
                  Tidak ada data
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
