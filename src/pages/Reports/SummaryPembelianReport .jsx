// src/pages/laporan/SummaryPembelianReport.jsx
import React, { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { listenAllTransaksi } from "../../services/FirebaseService";
import CetakInvoicePembelian from "../Print/CetakInvoicePembelian";

/* ================= UTIL ================= */
const formatDate = (d) => (d ? new Date(d).toLocaleDateString("id-ID") : "-");

const rupiah = (n) => Number(n || 0).toLocaleString("id-ID");

/* ======================================================
   SUMMARY PEMBELIAN REPORT (FINAL VERSION)
====================================================== */

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

  const [page, setPage] = useState(1);
  const [selectedInvoice, setSelectedInvoice] = useState(null);

  const limit = 10; // data per halaman

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    const unsub = listenAllTransaksi((data) => {
      const pembelian = (data || []).filter(
        (d) => String(d.PAYMENT_METODE || "").toUpperCase() === "PEMBELIAN"
      );

      setRows(pembelian);
    });

    return () => unsub && unsub();
  }, []);

  /* ================= FLATTEN ================= */
  const tableRows = useMemo(() => {
    return rows.map((trx, i) => ({
      no: i + 1,
      tanggal: trx.TANGGAL_TRANSAKSI,
      invoice: trx.NO_INVOICE,
      toko: trx.NAMA_TOKO,
      supplier: trx.NAMA_SUPPLIER,
      kategori: trx.KATEGORI_BRAND,
      brand: trx.NAMA_BRAND,
      barang: trx.NAMA_BARANG,
      imei: trx.IMEI || "-",
      qty: trx.QTY || 0,
      harga: trx.HARGA_SUPLAYER || 0,
      total: trx.TOTAL || 0,
      payment: trx.PAYMENT_METODE,
      status: trx.STATUS,
      raw: trx,
    }));
  }, [rows]);

  /* ================= FILTER ================= */
  const filtered = useMemo(() => {
    return tableRows.filter((r) => {
      return (
        (!filter.tanggal ||
          formatDate(r.tanggal) === formatDate(filter.tanggal)) &&
        (!filter.invoice ||
          String(r.invoice || "")
            .toLowerCase()
            .includes(filter.invoice.toLowerCase())) &&
        (!filter.toko ||
          String(r.toko || "")
            .toLowerCase()
            .includes(filter.toko.toLowerCase())) &&
        (!filter.barang ||
          String(r.barang || "")
            .toLowerCase()
            .includes(filter.barang.toLowerCase())) &&
        (!filter.imei || String(r.imei || "").includes(filter.imei)) &&
        (!filter.status ||
          String(r.status || "")
            .toLowerCase()
            .includes(filter.status.toLowerCase()))
      );
    });
  }, [tableRows, filter]);

  /* ================= PAGINATION ================= */
  const totalPage = Math.ceil(filtered.length / limit);
  const start = (page - 1) * limit;
  const current = filtered.slice(start, start + limit);

  /* ================= EXPORT EXCEL ================= */
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(wb, ws, "Summary Pembelian");

    const buf = XLSX.write(wb, {
      bookType: "xlsx",
      type: "array",
    });

    saveAs(new Blob([buf]), `Summary_Pembelian_${Date.now()}.xlsx`);
  };

  /* ================= RENDER ================= */
  return (
    <div className="p-5 bg-white rounded-xl shadow">
      <h2 className="text-xl font-bold mb-4">📊 Summary Pembelian</h2>

      {/* FILTER */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4">
        <input
          type="date"
          className="input"
          onChange={(e) =>
            setFilter({
              ...filter,
              tanggal: e.target.value,
            })
          }
        />

        <input
          className="input"
          placeholder="No Invoice"
          onChange={(e) =>
            setFilter({
              ...filter,
              invoice: e.target.value,
            })
          }
        />

        <input
          className="input"
          placeholder="Nama Toko"
          onChange={(e) =>
            setFilter({
              ...filter,
              toko: e.target.value,
            })
          }
        />

        <input
          className="input"
          placeholder="Nama Barang"
          onChange={(e) =>
            setFilter({
              ...filter,
              barang: e.target.value,
            })
          }
        />

        <input
          className="input"
          placeholder="IMEI"
          onChange={(e) =>
            setFilter({
              ...filter,
              imei: e.target.value,
            })
          }
        />

        <input
          className="input"
          placeholder="Status"
          onChange={(e) =>
            setFilter({
              ...filter,
              status: e.target.value,
            })
          }
        />
      </div>

      <button
        onClick={exportExcel}
        className="mb-3 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm"
      >
        Export Excel
      </button>

      {/* TABLE */}
     {/* TABLE */}
<div className="overflow-x-auto">
  <table className="min-w-[1600px] text-sm">
    <thead className="bg-gray-100">
      <tr>
        <th>No</th>
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
        <th>Payment</th>
        <th>Status</th>
        <th>Aksi</th>
      </tr>
    </thead>

    <tbody>
      {current.map((r, i) => (
        <tr
          key={i}
          className="border-t hover:bg-slate-50"
        >
          <td>{start + i + 1}</td>
          <td>{formatDate(r.tanggal)}</td>
          <td className="font-semibold">
            {r.invoice}
          </td>
          <td>{r.toko}</td>
          <td>{r.supplier}</td>
          <td>{r.kategori}</td>
          <td>{r.brand}</td>
          <td>{r.barang}</td>
          <td className="font-mono text-xs">
            {r.imei}
          </td>
          <td className="text-center">
            {r.qty}
          </td>
          <td className="text-right">
            Rp {rupiah(r.harga)}
          </td>
          <td className="text-right font-bold">
            Rp {rupiah(r.total)}
          </td>
          <td>{r.payment}</td>
          <td>
            <span
              className={`px-2 py-1 text-xs rounded-full
              ${
                r.status === "Approved"
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-200"
              }`}
            >
              {r.status}
            </span>
          </td>

          {/* 🔥 AKSI */}
          <td className="text-center">
            <button
              onClick={() =>
                setSelectedInvoice(r.invoice)
              }
              className="
                flex items-center gap-1
                px-3 py-1.5
                bg-indigo-600
                hover:bg-indigo-700
                text-white
                text-xs
                rounded-lg
                shadow
                transition
              "
            >
              🖨️ Cetak
            </button>
          </td>
        </tr>
      ))}

      {!current.length && (
        <tr>
          <td
            colSpan={15}
            className="text-center py-4 text-gray-400"
          >
            Tidak ada data pembelian
          </td>
        </tr>
      )}
    </tbody>
  </table>
</div>

        {/* PAGINATION */}
        <div className="flex justify-center gap-2 mt-4">
          {[...Array(totalPage)].map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i + 1)}
              className={`px-3 py-1 rounded ${
                page === i + 1 ? "bg-indigo-600 text-white" : "bg-gray-200"
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
        {/* MODAL CETAK */}
        {selectedInvoice && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white p-5 rounded-lg w-[800px]">
              <CetakInvoicePembelian
                invoice={selectedInvoice}
                onClose={() => setSelectedInvoice(null)}
              />
            </div>
          </div>
        )}
      </div>
  
  );
}
