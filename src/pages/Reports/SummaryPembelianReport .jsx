// src/pages/laporan/SummaryPembelianReport.jsx
import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { listenMasterPembelian } from "../../services/FirebaseService";

/* ================= UTIL ================= */
const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("id-ID") : "-";

export default function SummaryPembelianReport() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState({
    tanggal: "",
    invoice: "",
    toko: "",
    barang: "",
    imei: "",
    status: "",
  });

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    const unsub = listenMasterPembelian((data) => {
      setRows(Array.isArray(data) ? data : []);
    });
    return () => unsub && unsub();
  }, []);

  /* ================= FLATTEN DATA (TAHAP 1–3) ================= */
  const tableRows = useMemo(() => {
    const result = [];

    rows.forEach((trx) => {
      const items = Array.isArray(trx.items) ? trx.items : [];

      items.forEach((item) => {
        result.push({
          tanggal: trx.tanggal || trx.createdAt,
          invoice: trx.noInvoice || trx.invoice || "-",
          toko: trx.namaToko || trx.toko || "-",

          supplier: trx.supplier || "-",
          kategori: item.kategoriBarang || "-",
          brand: item.namaBrand || "-",
          barang: item.namaBarang || "-",
          imei: item.imeiList?.join(", ") || "-",
          qty: item.qty || 0,

          harga: item.hargaAktif || 0,
          total: (item.qty || 0) * (item.hargaAktif || 0),

          payment: trx.payment?.metode || "-",
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
        (!filter.invoice ||
          r.invoice.toLowerCase().includes(filter.invoice.toLowerCase())) &&
        (!filter.toko ||
          r.toko.toLowerCase().includes(filter.toko.toLowerCase())) &&
        (!filter.barang ||
          r.barang.toLowerCase().includes(filter.barang.toLowerCase())) &&
        (!filter.imei || r.imei.includes(filter.imei)) &&
        (!filter.status ||
          r.status.toLowerCase().includes(filter.status.toLowerCase()))
      );
    });
  }, [tableRows, filter]);

  /* ================= EXPORT EXCEL ================= */
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Summary Pembelian");

    const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([buf]), `Summary_Pembelian_${Date.now()}.xlsx`);
  };

  /* ================= RENDER ================= */
  return (
    <div className="p-5 bg-white rounded-xl shadow">
      <h2 className="text-xl font-bold mb-4">📊 Summary Pembelian</h2>

      {/* FILTER */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4">
        <input type="date" onChange={(e) => setFilter({ ...filter, tanggal: e.target.value })} />
        <input placeholder="No Invoice" onChange={(e) => setFilter({ ...filter, invoice: e.target.value })} />
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

      {/* TABLE */}
      <div className="overflow-x-auto">
        <table className="min-w-[1600px] text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th>Tanggal</th>
              <th>Invoice</th>
              <th>Toko</th>
              <th>Supplier</th>
              <th>Kategori</th>
              <th>Brand</th>
              <th>Barang</th>
              <th>IMEI</th>
              <th>QTY</th>
              <th>Harga</th>
              <th>Total</th>
              <th>Pembayaran</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i} className="border-t">
                <td>{formatDate(r.tanggal)}</td>
                <td>{r.invoice}</td>
                <td>{r.toko}</td>
                <td>{r.supplier}</td>
                <td>{r.kategori}</td>
                <td>{r.brand}</td>
                <td>{r.barang}</td>
                <td>{r.imei}</td>
                <td>{r.qty}</td>
                <td>{r.harga.toLocaleString("id-ID")}</td>
                <td className="font-bold">{r.total.toLocaleString("id-ID")}</td>
                <td>{r.payment}</td>
                <td>{r.status}</td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={13} className="text-center py-4 text-gray-400">
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
