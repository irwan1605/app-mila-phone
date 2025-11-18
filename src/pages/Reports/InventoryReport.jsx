// src/pages/Reports/InventoryReport.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FaFileExcel,
  FaFilePdf,
  FaFilter,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
  FaCheckCircle,
  FaEdit,
  FaTrash,
  FaUpload,
  FaDownload,
} from "react-icons/fa";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import {
  listenAllTransaksi,
  addTransaksi,
  updateTransaksi,
  deleteTransaksi,
} from "../../services/FirebaseService";

/* fallback toko names (same used across app) */
const fallbackTokoNames = [
  "CILANGKAP",
  "CIBINONG",
  "GAS ALAM",
  "CITEUREUP",
  "CIRACAS",
  "METLAND 1",
  "METLAND 2",
  "PITARA",
  "KOTA WISATA",
  "SAWANGAN",
  "PUSAT",
];

const PUSAT_NAME = "PUSAT"; // Pusat nama toko, sesuai permintaan

export default function InventoryReport() {
  const [allData, setAllData] = useState([]);
  const [search, setSearch] = useState("");
  const [filterToko, setFilterToko] = useState("semua");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 12;

  const [detailItem, setDetailItem] = useState(null);
  const tableRef = useRef(null);

  // realtime load
  useEffect(() => {
    if (typeof listenAllTransaksi === "function") {
      const unsub = listenAllTransaksi((items = []) => {
        const normalized = (items || []).map((r) => normalizeRecord(r));
        normalized.sort((a, b) => new Date(b.TANGGAL_TRANSAKSI || b.TANGGAL || 0) - new Date(a.TANGGAL_TRANSAKSI || a.TANGGAL || 0));
        setAllData(normalized);
        setCurrentPage(1);
      });
      return () => unsub && unsub();
    } else {
      console.warn("listenAllTransaksi not found in FirebaseService");
      setAllData([]);
    }
  }, []);

  // normalize record
  const normalizeRecord = (r = {}) => ({
    id: r.id ?? r._id ?? r.key ?? String(Date.now() + Math.random()),
    TANGGAL_TRANSAKSI: r.TANGGAL_TRANSAKSI || r.TANGGAL || "",
    NO_INVOICE: r.NO_INVOICE || "",
    NAMA_USER: r.NAMA_USER || "",
    NO_HP_USER: r.NO_HP_USER || "",
    NAMA_SALES_TOKO: r.NAMA_SALES_TOKO || "",
    NAMA_SALES: r.NAMA_SALES || "",
    TITIPAN_REFERENSI: r.TITIPAN_REFERENSI || "",
    NAMA_TOKO: (r.NAMA_TOKO || r.TOKO || "").toString(),
    NAMA_BRAND: r.NAMA_BRAND || r.BRAND || "",
    NAMA_BARANG: r.NAMA_BARANG || r.BARANG || "",
    QTY: Number(r.QTY || 0),
    NOMOR_UNIK: r.NOMOR_UNIK || r.IMEI || r.NO_DINAMO || r.NO_RANGKA || "",
    IMEI: r.IMEI || "",
    NO_DINAMO: r.NO_DINAMO || "",
    NO_RANGKA: r.NO_RANGKA || "",
    KATEGORI_HARGA: r.KATEGORI_HARGA || "",
    HARGA_UNIT: Number(r.HARGA_UNIT || r.HARGA || 0),
    PAYMENT_METODE: r.PAYMENT_METODE || "",
    SYSTEM_PAYMENT: r.SYSTEM_PAYMENT || "",
    MDR: Number(r.MDR || 0),
    POTONGAN_MDR: Number(r.POTONGAN_MDR || 0),
    NO_ORDER_KONTRAK: r.NO_ORDER_KONTRAK || "",
    TENOR: r.TENOR || "",
    DP_USER_MERCHANT: Number(r.DP_USER_MERCHANT || 0),
    DP_USER_TOKO: Number(r.DP_USER_TOKO || 0),
    REQUEST_DP_TALANGAN: Number(r.REQUEST_DP_TALANGAN || 0),
    KETERANGAN: r.KETERANGAN || "",
    STATUS: r.STATUS || "Pending",
    TOTAL: Number(r.TOTAL) || Number(r.QTY || 0) * Number(r.HARGA_UNIT || r.HARGA || 0) || 0,
    _raw: r,
  });

  // aggregate inventory by NOMOR_UNIK or brand+barang
  const inventory = useMemo(() => {
    const map = new Map();
    allData.forEach((r) => {
      const key = (r.NOMOR_UNIK && String(r.NOMOR_UNIK).trim()) || `${(r.NAMA_BRAND || "").trim()}|${(r.NAMA_BARANG || "").trim()}`;
      if (!map.has(key)) map.set(key, { key, brand: r.NAMA_BRAND, barang: r.NAMA_BARANG, items: [] });
      map.get(key).items.push(r);
    });

    const arr = [];
    for (const { key, brand, barang, items } of map.values()) {
      const perToko = {};
      let totalQty = 0;
      let lastPrice = 0;
      let status = "Pending";
      items.forEach((it) => {
        const toko = it.NAMA_TOKO || "Lainnya";
        if (!perToko[toko]) perToko[toko] = { qty: 0, entries: [] };
        perToko[toko].qty += Number(it.QTY || 0);
        perToko[toko].entries.push(it);
        totalQty += Number(it.QTY || 0);
        if (it.HARGA_UNIT) lastPrice = it.HARGA_UNIT;
        if (it.STATUS) status = it.STATUS;
      });

      // estimate transfers out from PUSAT: heuristic — if an entry at PUSAT includes 'transfer' keywords in KETERANGAN/TITIPAN_REFERENSI, count it
      let transferOutFromPusat = 0;
      const transferKeywords = ["transfer", "mutasi", "kirim", "antar", "pindah"];
      (perToko[PUSAT_NAME]?.entries || []).forEach((tx) => {
        const text = `${tx.KETERANGAN} ${tx.TITIPAN_REFERENSI}`.toLowerCase();
        if (transferKeywords.some((kw) => text.includes(kw))) {
          transferOutFromPusat += Number(tx.QTY || 0);
        }
      });

      arr.push({
        key,
        brand,
        barang,
        NOMOR_UNIK: items[0].NOMOR_UNIK || "",
        totalQty,
        perToko,
        lastPrice,
        status,
        entries: items,
        transferOutFromPusat,
      });
    }

    // sort by totalQty desc
    arr.sort((a, b) => b.totalQty - a.totalQty || (a.brand || "").localeCompare(b.brand || ""));
    return arr;
  }, [allData]);

  // toko options
  const tokoOptions = useMemo(() => {
    const names = [...new Set(allData.map((r) => r.NAMA_TOKO).filter(Boolean))];
    // ensure PUSAT present
    if (!names.includes(PUSAT_NAME)) names.unshift(PUSAT_NAME);
    return names.length ? names : fallbackTokoNames;
  }, [allData]);

  // filtered inventory by search, toko, status
  const filteredInventory = useMemo(() => {
    return inventory.filter((it) => {
      let ok = true;
      if (filterToko !== "semua") {
        ok = ok && (it.perToko[filterToko]?.qty > 0);
      }
      if (filterStatus !== "semua") {
        ok = ok && String(it.status || "").toLowerCase() === String(filterStatus || "").toLowerCase();
      }
      if (search.trim()) {
        const s = search.trim().toLowerCase();
        ok =
          ok &&
          ((it.NOMOR_UNIK || "").toLowerCase().includes(s) ||
            (it.brand || "").toLowerCase().includes(s) ||
            (it.barang || "").toLowerCase().includes(s));
      }
      return ok;
    });
  }, [inventory, search, filterToko, filterStatus]);

  // pagination
  const totalPages = Math.max(1, Math.ceil(filteredInventory.length / rowsPerPage));
  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages]);
  const paginated = filteredInventory.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  const prevPage = () => currentPage > 1 && setCurrentPage((p) => p - 1);
  const nextPage = () => currentPage < totalPages && setCurrentPage((p) => p + 1);

  // export aggregated Excel
  const exportAggregatedExcel = () => {
    const rows = filteredInventory.map((it) => {
      const perTokoSummary = Object.entries(it.perToko)
        .map(([t, v]) => `${t}: ${v.qty}`)
        .join(" | ");
      const pusatQty = it.perToko[PUSAT_NAME]?.qty || 0;
      const inferredPusatAvailable = Math.max(0, pusatQty - (it.transferOutFromPusat || 0));
      return {
        NOMOR_UNIK: it.NOMOR_UNIK,
        BRAND: it.brand,
        BARANG: it.barang,
        TOTAL_QTY: it.totalQty,
        PUSAT_QTY: pusatQty,
        PUSAT_ESTIMATED_AVAILABLE: inferredPusatAvailable,
        PER_TOKO: perTokoSummary,
        HARGA_UNIT: it.lastPrice,
        STATUS: it.status,
      };
    });
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "InventoryAggregated");
    XLSX.writeFile(wb, `Inventory_Aggregated_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // export raw transactions Excel
  const exportRawExcel = () => {
    const rows = allData.map((r) => ({
      id: r.id,
      TANGGAL_TRANSAKSI: r.TANGGAL_TRANSAKSI,
      NO_INVOICE: r.NO_INVOICE,
      NAMA_TOKO: r.NAMA_TOKO,
      NAMA_BRAND: r.NAMA_BRAND,
      NAMA_BARANG: r.NAMA_BARANG,
      QTY: r.QTY,
      NOMOR_UNIK: r.NOMOR_UNIK,
      HARGA_UNIT: r.HARGA_UNIT,
      STATUS: r.STATUS,
      KETERANGAN: r.KETERANGAN,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "InventoryRaw");
    XLSX.writeFile(wb, `Inventory_Raw_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // export PDF (current view)
  const exportPDF = async () => {
    try {
      const el = tableRef.current;
      if (!el) {
        alert("Tabel tidak ditemukan");
        return;
      }
      const canvas = await html2canvas(el, { scale: 1.5 });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "mm", "a4");
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(img, "PNG", 0, 0, w, h);
      pdf.save(`Inventory_${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (e) {
      console.error("Export PDF failed", e);
      alert("Gagal export PDF");
    }
  };

  // import Excel: update or add
  const importExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const data = new Uint8Array(ev.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws);
        for (const row of json) {
          const tokoName = row.NAMA_TOKO || row.TOKO || "";
          const tokoId = fallbackTokoNames.findIndex((t) => String(t).toUpperCase() === String(tokoName).toUpperCase()) + 1;
          const payload = {
            ...row,
            QTY: Number(row.QTY || row.QUANTITY || 0),
            HARGA_UNIT: Number(row.HARGA_UNIT || row.PRICE || 0),
            TANGGAL_TRANSAKSI: row.TANGGAL_TRANSAKSI || row.TANGGAL || "",
            NAMA_BRAND: row.NAMA_BRAND || row.BRAND || "",
            NAMA_BARANG: row.NAMA_BARANG || row.BARANG || "",
            NOMOR_UNIK: row.NOMOR_UNIK || row.IMEI || "",
            STATUS: row.STATUS || "Pending",
          };

          try {
            if (row.id && tokoId && typeof updateTransaksi === "function") {
              await updateTransaksi(tokoId, row.id, payload);
            } else if (tokoId && typeof addTransaksi === "function") {
              await addTransaksi(tokoId, payload);
            } else {
              console.warn("Firebase add/update not found or missing tokoId for row:", row);
            }
          } catch (err) {
            console.error("Import row failed:", row, err);
          }
        }
        alert("Import selesai. Periksa console untuk error (jika ada).");
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error("Import failed", err);
      alert("Gagal import file.");
    }
  };

  // transaction actions
  const handleApproveTransaction = async (tx, status = "Approved") => {
    try {
      const tokoName = tx.NAMA_TOKO || tx.TOKO || "";
      const tokoId = fallbackTokoNames.findIndex((t) => String(t).toUpperCase() === String(tokoName).toUpperCase()) + 1;
      if (!tokoId) {
        alert("Toko tidak dikenali, tidak dapat update.");
        return;
      }
      if (typeof updateTransaksi === "function") {
        await updateTransaksi(tokoId, tx.id, { STATUS: status });
      } else {
        console.warn("updateTransaksi not found");
      }
      setAllData((d) => d.map((x) => (x.id === tx.id ? { ...x, STATUS: status } : x)));
    } catch (err) {
      console.error("Approve failed", err);
      alert("Gagal approve transaksi.");
    }
  };

  const handleDeleteTransaction = async (tx) => {
    if (!window.confirm("Yakin ingin menghapus transaksi ini?")) return;
    try {
      const tokoName = tx.NAMA_TOKO || tx.TOKO || "";
      const tokoId = fallbackTokoNames.findIndex((t) => String(t).toUpperCase() === String(tokoName).toUpperCase()) + 1;
      if (!tokoId) {
        alert("Toko tidak dikenali, tidak dapat delete.");
        return;
      }
      if (typeof deleteTransaksi === "function") {
        await deleteTransaksi(tokoId, tx.id);
      } else {
        console.warn("deleteTransaksi not found");
      }
      setAllData((d) => d.filter((x) => x.id !== tx.id));
    } catch (err) {
      console.error("Delete failed", err);
      alert("Gagal menghapus transaksi.");
    }
  };

  const handleEditTransaction = (tx) => {
    try {
      localStorage.setItem("edit_transaksi", JSON.stringify(tx));
      window.location.href = "/transaksi";
    } catch (err) {
      console.error("Edit redirect error", err);
      alert("Gagal membuka halaman edit.");
    }
  };

  // helper
  const fmt = (v) => {
    try {
      return Number(v || 0).toLocaleString("id-ID");
    } catch {
      return String(v || "");
    }
  };

  return (
    <div className="p-4">
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-lg shadow mb-4">
        <h1 className="text-2xl font-bold">Inventory Report — Pusat & Antar Toko</h1>
        <p className="text-sm opacity-90">Realtime stock overview. PUSAT name: <span className="font-semibold">{PUSAT_NAME}</span></p>
      </div>

      {/* controls */}
      <div className="bg-white rounded shadow p-3 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <FaSearch className="text-gray-500" />
          <input
            placeholder="Cari nomor unik, brand, atau nama barang..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="p-2 border rounded w-72"
          />
        </div>

        <select value={filterToko} onChange={(e) => setFilterToko(e.target.value)} className="p-2 border rounded">
          <option value="semua">Semua Toko (filter by toko yang punya stok)</option>
          <option value="semua">Semua</option>
          {tokoOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="p-2 border rounded">
          <option value="semua">Semua Status</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={exportAggregatedExcel} className="px-3 py-1 bg-indigo-600 text-white rounded flex items-center">
            <FaDownload className="mr-2" /> Export Aggregated
          </button>

          <button onClick={exportRawExcel} className="px-3 py-1 bg-green-600 text-white rounded flex items-center">
            <FaFileExcel className="mr-2" /> Export Raw
          </button>

          <button onClick={exportPDF} className="px-3 py-1 bg-red-600 text-white rounded flex items-center">
            <FaFilePdf className="mr-2" /> Export PDF
          </button>

          <label className="px-3 py-1 bg-blue-600 text-white rounded cursor-pointer flex items-center">
            <FaUpload className="mr-2" /> Import Excel
            <input type="file" accept=".xlsx,.xls,.csv" onChange={importExcel} className="hidden" />
          </label>
        </div>
      </div>

      {/* aggregated table */}
      <div className="bg-white rounded shadow overflow-x-auto mb-3" ref={tableRef}>
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
            <tr>
              <th className="p-2 border">No</th>
              <th className="p-2 border">No EMEI</th>
              <th className="p-2 border">Brand</th>
              <th className="p-2 border">Barang</th>
              <th className="p-2 border">Total Qty</th>
              <th className="p-2 border">PUSAT Qty</th>
              <th className="p-2 border">PUSAT Est. Available</th>
              <th className="p-2 border">Per Toko (qty)</th>
              <th className="p-2 border">Harga Unit</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {paginated.map((it, idx) => {
              const pusatQty = it.perToko[PUSAT_NAME]?.qty || 0;
              const pusatEst = Math.max(0, pusatQty - (it.transferOutFromPusat || 0));
              return (
                <tr key={it.key} className="hover:bg-gray-50">
                  <td className="p-2 border text-center">{(currentPage - 1) * rowsPerPage + idx + 1}</td>
                  <td className="p-2 border font-mono">{it.NOMOR_UNIK || "-"}</td>
                  <td className="p-2 border">{it.brand}</td>
                  <td className="p-2 border">{it.barang}</td>
                  <td className="p-2 border text-center font-semibold">{it.totalQty}</td>
                  <td className="p-2 border text-center">{pusatQty}</td>
                  <td className="p-2 border text-center">{pusatEst}</td>
                  <td className="p-2 border">
                    {Object.entries(it.perToko).map(([t, v]) => (
                      <div key={t} className="text-sm">
                        <span className="font-medium">{t}</span>: <span>{v.qty}</span>
                      </div>
                    ))}
                  </td>
                  <td className="p-2 border text-right">Rp {fmt(it.lastPrice)}</td>
                  <td className={`p-2 border font-semibold ${it.status === "Approved" ? "text-green-600" : it.status === "Rejected" ? "text-red-600" : "text-yellow-600"}`}>
                    {it.status}
                  </td>
                  <td className="p-2 border text-center">
                    <button onClick={() => setDetailItem(it)} className="px-2 py-1 bg-purple-600 text-white rounded text-sm">Detail</button>
                  </td>
                </tr>
              );
            })}
            {paginated.length === 0 && (
              <tr>
                <td className="p-4 border text-center" colSpan={11}>Tidak ada data</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      <div className="flex justify-between items-center mt-3 text-sm mb-8">
        <div>Halaman {currentPage} dari {totalPages} ({filteredInventory.length} items)</div>
        <div>
          <button onClick={prevPage} disabled={currentPage === 1} className="px-2 py-1 border rounded mr-2 disabled:opacity-40">
            <FaChevronLeft />
          </button>
          <button onClick={nextPage} disabled={currentPage === totalPages} className="px-2 py-1 border rounded disabled:opacity-40">
            <FaChevronRight />
          </button>
        </div>
      </div>

      {/* detail modal */}
      {detailItem && (
        <div className="fixed inset-0 bg-black bg-opacity-40 z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-5xl rounded shadow-lg overflow-auto max-h-[90vh] p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xl font-bold">Detail Item — {detailItem.NOMOR_UNIK || detailItem.barang}</h3>
              <div className="flex items-center gap-2">
                <button onClick={() => {
                  const rows = detailItem.entries.map(tx => ({ ...tx }));
                  const ws = XLSX.utils.json_to_sheet(rows);
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, "Detail");
                  XLSX.writeFile(wb, `Detail_${detailItem.NOMOR_UNIK || detailItem.barang}.xlsx`);
                }} className="px-3 py-1 bg-green-600 text-white rounded flex items-center">
                  <FaFileExcel className="mr-2" /> Export
                </button>
                <button onClick={() => setDetailItem(null)} className="px-3 py-1 border rounded">Tutup</button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-indigo-50 p-3 rounded">
                <div className="text-sm text-gray-600">Total Qty</div>
                <div className="text-2xl font-bold">{detailItem.totalQty}</div>
              </div>
              <div className="bg-white p-3 rounded border">
                <div className="text-sm text-gray-600">Brand</div>
                <div className="font-medium">{detailItem.brand}</div>
              </div>
              <div className="bg-white p-3 rounded border">
                <div className="text-sm text-gray-600">Barang</div>
                <div className="font-medium">{detailItem.barang}</div>
              </div>
            </div>

            <div className="overflow-x-auto bg-white rounded shadow">
              <table className="w-full text-sm border-collapse">
                <thead className="bg-purple-600 text-white">
                  <tr>
                    <th className="p-2 border">Tanggal</th>
                    <th className="p-2 border">Invoice</th>
                    <th className="p-2 border">User</th>
                    <th className="p-2 border">No HP</th>
                    <th className="p-2 border">Sales Toko</th>
                    <th className="p-2 border">Sales</th>
                    <th className="p-2 border">Referensi</th>
                    <th className="p-2 border">Toko</th>
                    <th className="p-2 border">Brand</th>
                    <th className="p-2 border">Barang</th>
                    <th className="p-2 border">Qty</th>
                    <th className="p-2 border">No EMEI</th>
                    <th className="p-2 border">Harga Unit</th>
                    <th className="p-2 border">MDR</th>
                    <th className="p-2 border">Potongan MDR</th>
                    <th className="p-2 border">DP Merchant</th>
                    <th className="p-2 border">DP ke Toko</th>
                    <th className="p-2 border">Request DP Talangan</th>
                    <th className="p-2 border">Tenor</th>
                    <th className="p-2 border">No Order</th>
                    <th className="p-2 border">Payment</th>
                    <th className="p-2 border">System Payment</th>
                    <th className="p-2 border">Keterangan</th>
                    <th className="p-2 border">Status</th>
                    <th className="p-2 border">Total</th>
                    <th className="p-2 border">Aksi</th>
                  </tr>
                </thead>

                <tbody>
                  {detailItem.entries.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50">
                      <td className="p-2 border">{tx.TANGGAL_TRANSAKSI}</td>
                      <td className="p-2 border">{tx.NO_INVOICE}</td>
                      <td className="p-2 border">{tx.NAMA_USER}</td>
                      <td className="p-2 border">{tx.NO_HP_USER}</td>
                      <td className="p-2 border">{tx.NAMA_SALES_TOKO}</td>
                      <td className="p-2 border">{tx.NAMA_SALES}</td>
                      <td className="p-2 border">{tx.TITIPAN_REFERENSI}</td>
                      <td className="p-2 border">{tx.NAMA_TOKO}</td>
                      <td className="p-2 border">{tx.NAMA_BRAND}</td>
                      <td className="p-2 border">{tx.NAMA_BARANG}</td>
                      <td className="p-2 border text-center">{tx.QTY}</td>
                      <td className="p-2 border">{tx.NOMOR_UNIK}</td>
                      <td className="p-2 border text-right">Rp {fmt(tx.HARGA_UNIT)}</td>
                      <td className="p-2 border text-right">{fmt(tx.MDR)}</td>
                      <td className="p-2 border text-right">{fmt(tx.POTONGAN_MDR)}</td>
                      <td className="p-2 border text-right">{fmt(tx.DP_USER_MERCHANT)}</td>
                      <td className="p-2 border text-right">{fmt(tx.DP_USER_TOKO)}</td>
                      <td className="p-2 border text-right">{fmt(tx.REQUEST_DP_TALANGAN)}</td>
                      <td className="p-2 border">{tx.TENOR}</td>
                      <td className="p-2 border">{tx.NO_ORDER_KONTRAK}</td>
                      <td className="p-2 border">{tx.PAYMENT_METODE}</td>
                      <td className="p-2 border">{tx.SYSTEM_PAYMENT}</td>
                      <td className="p-2 border">{tx.KETERANGAN}</td>
                      <td className={`p-2 border font-semibold ${tx.STATUS === "Approved" ? "text-green-600" : tx.STATUS === "Rejected" ? "text-red-600" : "text-yellow-600"}`}>
                        {tx.STATUS}
                      </td>
                      <td className="p-2 border text-right">Rp {fmt(tx.TOTAL)}</td>

                      <td className="p-2 border text-center space-x-2">
                        <button onClick={() => handleApproveTransaction(tx, "Approved")} className="text-green-600 hover:text-green-800 mr-2" title="Approve">
                          <FaCheckCircle />
                        </button>
                        <button onClick={() => handleEditTransaction(tx)} className="text-blue-600 hover:text-blue-800 mr-2" title="Edit">
                          <FaEdit />
                        </button>
                        <button onClick={() => handleDeleteTransaction(tx)} className="text-red-600 hover:text-red-800" title="Delete">
                          <FaTrash />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
