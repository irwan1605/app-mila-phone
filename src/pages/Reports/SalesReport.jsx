// src/pages/Reports/SalesReport.jsx
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
} from "react-icons/fa";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import {
  listenAllTransaksi,
  listenPenjualan,
  updateTransaksi,
  deleteTransaksi,
} from "../../services/FirebaseService";
import { useLocation } from "react-router-dom";

/* fallback toko names */
const fallbackTokoNames = [
  "CILANGKAP PUSAT",
  "CIBINONG",
  "GAS ALAM",
  "CITEUREUP",
  "MARKETPLACE",
  "METLAND 1",
  "METLAND 2",
  "PITARA",
  "KOTA WISATA",
  "SAWANGAN",
];

const safe = (v) => Number(v || 0);

const rupiah = (v) => `Rp ${safe(v).toLocaleString("id-ID")}`;

export default function SalesReport() {
  const [allData, setAllData] = useState([]);
  const [filterToko, setFilterToko] = useState("semua");
  const [filterSales, setFilterSales] = useState("semua");
  const [filterBrand, setFilterBrand] = useState("semua");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 12;

  const tableRef = useRef(null);
  const location = useLocation();

  /* ===================== LOGIN LOCK ===================== */
  const loggedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const myTokoName = loggedUser?.toko
    ? fallbackTokoNames[Number(loggedUser.toko) - 1]
    : null;

  const isSuper =
    loggedUser?.role === "superadmin" || loggedUser?.role === "admin";

  useEffect(() => {
    const unsub = listenAllTransaksi((data = []) => {
      // =========================
      // 1. Ambil semua data refund
      // =========================
      const refundList = data.filter(
        (t) =>
          t.PAYMENT_METODE === "RETUR" ||
          t.PAYMENT_METODE === "REFUND" ||
          t.STATUS === "REFUND"
      );

      // =========================
      // 2. Ambil invoice yang direfund
      // =========================
      const refundInvoiceSet = new Set(
        refundList.map((r) => r.INVOICE_ASAL || r.NO_INVOICE)
      );

      // =========================
      // 3. Ambil penjualan normal (yang belum direfund)
      // =========================
      const penjualanBersih = data.filter((t) => {
        const isRefund =
          t.PAYMENT_METODE === "RETUR" || t.PAYMENT_METODE === "REFUND";

        const kenaRefund = refundInvoiceSet.has(t.NO_INVOICE);

        return !isRefund && !kenaRefund;
      });

      // =========================
      // 4. tetap pakai state lama
      // =========================
      setRows(penjualanBersih);
    });

    return () => unsub && unsub();
  }, []);

  /* ===================== REALTIME ===================== */
  // ================= HELPER =================
  const safe = (v) => Number(v || 0);
  const rupiah = (v) => `Rp ${safe(v).toLocaleString("id-ID")}`;

  // ================= REALTIME =================
  useEffect(() => {
    const unsub = listenPenjualan((data = []) => {
      const mapInvoice = {};

      (data || []).forEach((trx) => {
        if (!Array.isArray(trx.items)) return;

        const payment = trx.payment || {};

        // ================= PAYMENT =================
        let paymentMetode = "-";
        let namaBank = "-";
        let nominalPayment = 0;

        if (
          Array.isArray(payment.splitPayment) &&
          payment.splitPayment.length
        ) {
          paymentMetode = payment.splitPayment
            .map((p) => (p.metode || "").toUpperCase())
            .join(" + ");

          namaBank = payment.splitPayment
            .map((p) => p.bankNama || "-")
            .join(" + ");

          nominalPayment = payment.splitPayment.reduce(
            (s, p) => s + Number(p.nominal || 0),
            0
          );
        } else {
          paymentMetode = String(payment.metode || "-").toUpperCase();
          namaBank = payment.bankNama || "-";
          nominalPayment =
            Number(payment.nominalPayment || 0) || Number(payment.nominal || 0);
        }

        // ================= ITEM =================
        const allBarang = trx.items.map((i) => i.namaBarang).join(", ");
        const allIMEI = trx.items.flatMap((i) => i.imeiList || []).join(", ");

        const totalQty = trx.items.reduce((s, i) => s + Number(i.qty || 0), 0);

        const totalSRP = trx.items.reduce(
          (s, i) =>
            i.skemaHarga === "srp" ? s + Number(i.hargaAktif || 0) : s,
          0
        );

        const totalGrosir = trx.items.reduce(
          (s, i) =>
            i.skemaHarga === "grosir" ? s + Number(i.hargaAktif || 0) : s,
          0
        );

        const totalReseller = trx.items.reduce(
          (s, i) =>
            i.skemaHarga === "reseller" ? s + Number(i.hargaAktif || 0) : s,
          0
        );

        const grandTotalFix = safe(payment.grandTotal);

        const kurangBayar =
          nominalPayment < grandTotalFix ? grandTotalFix - nominalPayment : 0;

        const sisaKembalian =
          nominalPayment > grandTotalFix ? nominalPayment - grandTotalFix : 0;

        // ================= PUSH =================
        if (!mapInvoice[trx.invoice]) {
          mapInvoice[trx.invoice] = {
            // 🔥 CORE
            TANGGAL_TRANSAKSI: trx.tanggal || trx.createdAt,
            NO_INVOICE: trx.invoice,
            NAMA_TOKO: trx.toko || "-",

            // 🔥 USER
            NAMA_USER: trx.user?.namaPelanggan || "-",
            ID_USER: trx.user?.idPelanggan || "-",
            NO_TLP: trx.user?.noTlpPelanggan || "-",

            STORE_HEAD: trx.user?.storeHead || "-",
            NAMA_SALES: trx.user?.namaSales || "-",
            SALES_HANDLE: trx.user?.salesHandle || "-",

            // 🔥 BARANG
            KATEGORI:
              trx.items.length === 1
                ? trx.items[0]?.kategoriBarang || "-"
                : trx.items.map((i) => i.kategoriBarang).join(", "),

            NAMA_BRAND:
              trx.items.length === 1
                ? trx.items[0]?.namaBrand || "-"
                : [...new Set(trx.items.map((i) => i.namaBrand))].join(", "),

            NAMA_BARANG: allBarang,
            IMEI: allIMEI || "NON-IMEI",
            QTY: totalQty,

            DETAIL_ITEMS: trx.items || [],

            // 🔥 HARGA
            HARGA_SRP: totalSRP,
            HARGA_GROSIR: totalGrosir,
            HARGA_RESELLER: totalReseller,

            // 🔥 PAYMENT
            STATUS_BAYAR: payment.status || "-",
            PAYMENT_METODE: paymentMetode,
            NAMA_BANK: namaBank,
            NOMINAL_PAYMENT: nominalPayment,

            dashboardKredit: Number(trx.payment?.dashboardPayment || 0),

            DP_TALANGAN: safe(payment.dpTalangan),
            NAMA_MDR: payment.namaMdr || "-",
            NOMINAL_MDR: safe(payment.nominalMdr),

            PAYMENT_KREDIT: payment.status === "PIUTANG" ? "KREDIT" : "LUNAS",

            TENOR: payment.tenor || "-",
            KETERANGAN: payment.keterangan || "-",

            // 🔥 TOTAL
            KURANG_BAYAR: kurangBayar,
            SISA_KEMBALIAN: sisaKembalian,
            GRAND_TOTAL: grandTotalFix,

            STATUS: trx.statusPembayaran || "OK",
          };
        }
      });

      setAllData(Object.values(mapInvoice));
    });

    return () => unsub && unsub();
  }, []);

  const normalizeRow = (r) => {
    const item = r.items?.[0] || {};

    return {
      id: r.id || r.key,
      Tanggal: r.tanggal || r.createdAt,
      Invoice: r.invoice || r.NO_INVOICE,
      User: r.user?.namaPelanggan || "-",
      idPelanggan: r.user?.idPelanggan || "-",
      Sales: r.user?.namaSales || "-",
      Toko: r.toko || r.NAMA_TOKO || "-",
      Brand: item.namaBrand || r.NAMA_BRAND || "-",
      Barang: item.namaBarang || r.NAMA_BARANG || "-",
      IMEI: item.imeiList?.join(", ") || r.IMEI || "NON-IMEI",
      Qty: Number(item.qty || r.QTY || 1),
      Total: Number(r.payment?.grandTotal || r.TOTAL || 0),
      Status: r.statusPembayaran || r.STATUS || "OK",
    };
  };

  const normalizeRecord = (r) => {
    return {
      id: r.id || r.key,

      // ===== INVOICE =====
      NO_INVOICE: r.invoice || r.NO_INVOICE || "-",

      // ===== TANGGAL =====
      TANGGAL_TRANSAKSI: r.createdAt || r.CREATED_AT || null,

      // ===== TOKO =====
      NAMA_TOKO: r.toko || r.TOKO || "-", // real data kamu pakai TOKO

      // ===== BARANG =====
      NAMA_BRAND: r.NAMA_BRAND || r.BRAND || "-",
      NAMA_BARANG: r.NAMA_BARANG || r.BARANG || "-",

      // ===== IMEI =====
      IMEI: r.IMEI || "NON-IMEI",

      // ===== QTY =====
      QTY: r.QTY ? Number(r.QTY) : r.IMEI ? 1 : 0,

      // ===== TOTAL =====
      TOTAL: Number(r.TOTAL || r.HARGA_JUAL || r.HARGA_SUPLAYER || 0),

      // ===== USER =====
      NAMA_USER: r.NAMA_USER || "-",
      NAMA_SALES: r.NAMA_SALES || "-",

      STATUS: "OK",
    };
  };

  /* ===================== OPTIONS ===================== */
  const tokoOptions = useMemo(() => {
    if (!isSuper) return myTokoName ? [myTokoName] : [];
    const names = [
      ...new Set(allData.map((r) => r.NAMA_TOKO || r.TOKO).filter(Boolean)),
    ];
    return names.length ? names : fallbackTokoNames;
  }, [allData, isSuper, myTokoName]);

  const salesOptions = useMemo(
    () => [...new Set(allData.map((r) => r.NAMA_SALES).filter(Boolean))],
    [allData]
  );

  const brandOptions = useMemo(
    () => [...new Set(allData.map((r) => r.NAMA_BRAND).filter(Boolean))],
    [allData]
  );

  /* ===================== FILTER LOCK PIC TOKO ===================== */
  const filteredData = useMemo(() => {
    return allData.filter((r) => {
      let ok = true;

      // ✅ KUNCI OTOMATIS SESUAI LOGIN PIC TOKO
      if (!isSuper && myTokoName) {
        ok = ok && r.NAMA_TOKO === myTokoName;
      }

      if (filterToko !== "semua")
        ok = ok && (r.NAMA_TOKO || r.TOKO) === filterToko;

      if (filterSales !== "semua") ok = ok && r.NAMA_SALES === filterSales;
      if (filterBrand !== "semua") ok = ok && r.NAMA_BRAND === filterBrand;
      if (filterStatus !== "semua") ok = ok && r.STATUS === filterStatus;

      if (filterStart) {
        const start = new Date(filterStart).setHours(0, 0, 0, 0);
        const d = new Date(r.TANGGAL_TRANSAKSI || 0);
        ok = ok && d >= start;
      }

      if (filterEnd) {
        const end = new Date(filterEnd).setHours(23, 59, 59, 999);
        const d = new Date(r.TANGGAL_TRANSAKSI || 0);
        ok = ok && d <= end;
      }

      if (search.trim()) {
        const s = search.trim().toLowerCase();
        ok =
          ok &&
          (String(r.NO_INVOICE || "")
            .toLowerCase()
            .includes(s) ||
            String(r.NAMA_USER || "")
              .toLowerCase()
              .includes(s) ||
            String(r.NOMOR_UNIK || "")
              .toLowerCase()
              .includes(s) ||
            String(r.NAMA_BARANG || "")
              .toLowerCase()
              .includes(s));
      }

      return ok;
    });
  }, [
    allData,
    filterToko,
    filterSales,
    filterBrand,
    filterStatus,
    filterStart,
    filterEnd,
    search,
    isSuper,
    myTokoName,
  ]);

  const totalOmzet = useMemo(
    () => filteredData.reduce((sum, r) => sum + Number(r.GRAND_TOTAL || 0), 0),
    [filteredData]
  );

  const totalQty = useMemo(
    () => filteredData.reduce((sum, r) => sum + Number(r.QTY || 0), 0),
    [filteredData]
  );

  const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredData.slice(start, start + rowsPerPage);
  }, [filteredData, currentPage]);

  const handleExportExcel = () => {
    try {
      const exportData = [];
  
      filteredData.forEach((r) => {
        if (r.DETAIL_ITEMS?.length) {
          r.DETAIL_ITEMS.forEach((item) => {
            exportData.push({
              No: exportData.length + 1,
  
              // ===== HEADER SESUAI TABLE =====
              Tanggal: r.TANGGAL_TRANSAKSI
                ? new Date(r.TANGGAL_TRANSAKSI).toLocaleDateString("id-ID")
                : "-",
  
              NoInvoice: r.NO_INVOICE,
              NamaToko: r.NAMA_TOKO,
  
              NamaPelanggan: r.NAMA_USER,
              IDPelanggan: r.ID_USER,
              NoTlp: r.NO_TLP,
  
              StoreHead: r.STORE_HEAD,
              Sales: r.NAMA_SALES,
              SalesHandle: r.SALES_HANDLE,
  
              Kategori: item.kategoriBarang || r.KATEGORI,
              Brand: item.namaBrand || r.NAMA_BRAND,
  
              // 🔥 PER ITEM
              NamaBarang: item.namaBarang,
              IMEI: item.imeiList?.join(", ") || "NON-IMEI",
              Qty: item.qty,
  
              // 🔥 HARGA PER ITEM
              HargaSRP:
                item.skemaHarga === "srp"
                  ? Number(item.hargaAktif || 0)
                  : 0,
  
              HargaGrosir:
                item.skemaHarga === "grosir"
                  ? Number(item.hargaAktif || 0)
                  : 0,
  
              HargaReseller:
                item.skemaHarga === "reseller"
                  ? Number(item.hargaAktif || 0)
                  : 0,
  
              // ===== PAYMENT =====
              StatusBayar: r.STATUS_BAYAR,
              PaymentMetode: r.PAYMENT_METODE,
  
              PaymentKredit: r.PAYMENT_KREDIT,
              DashboardKredit: Number(r.dashboardKredit || 0),
  
              Bank: r.NAMA_BANK,
              NominalPayment: Number(r.NOMINAL_PAYMENT || 0),
  
              DPTalangan: Number(r.DP_TALANGAN || 0),
  
              NamaMDR: r.NAMA_MDR,
              NominalMDR: Number(r.NOMINAL_MDR || 0),
  
              PaymentKreditStatus: r.PAYMENT_KREDIT,
  
              Tenor: r.TENOR,
              Keterangan: r.KETERANGAN,
  
              Status: r.STATUS,
  
              GrandTotal: Number(r.GRAND_TOTAL || 0),
            });
          });
        } else {
          // fallback
          exportData.push({
            No: exportData.length + 1,
            NamaBarang: r.NAMA_BARANG,
            Qty: r.QTY,
          });
        }
      });
  
      const ws = XLSX.utils.json_to_sheet(exportData);
  
      // 🔥 AUTO WIDTH BIAR RAPI
      ws["!cols"] = Object.keys(exportData[0]).map(() => ({ wch: 20 }));
  
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "SalesReport");
  
      XLSX.writeFile(
        wb,
        `SalesReport_${myTokoName || "ALL"}_${Date.now()}.xlsx`
      );
    } catch (err) {
      console.error(err);
      alert("Gagal export Excel");
    }
  };

  const handleExportPDF = async () => {
    try {
      const el = tableRef.current;
      const canvas = await html2canvas(el, { scale: 1.5 });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "mm", "a4");
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(img, "PNG", 0, 0, w, h);
      pdf.save(`SalesReport_${myTokoName || "ALL"}.pdf`);
    } catch {
      alert("Gagal export PDF");
    }
  };

  /* ===================== UI (TIDAK DIUBAH) ===================== */

  return (
    <div className="p-4 bg-gray-100 rounded-xl shadow-md">
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white p-4 rounded-lg shadow mb-4">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">
          Laporan Penjualan — {myTokoName || "Cilangkap Pusat"} (Realtime)
        </h2>
      </div>

      {/* FILTER */}
      <div className="bg-white p-3 rounded shadow mb-4 flex flex-wrap gap-3 items-center">
        <FaFilter className="text-gray-600" />

        <select
          value={filterToko}
          onChange={(e) => setFilterToko(e.target.value)}
          disabled={!isSuper}
          className="p-2 border rounded"
        >
          <option value="semua">Semua Toko</option>
          {tokoOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          value={filterSales}
          onChange={(e) => setFilterSales(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="semua">Semua Sales</option>
          {salesOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <select
          value={filterBrand}
          onChange={(e) => setFilterBrand(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="semua">Semua Brand</option>
          {brandOptions.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="semua">Semua Status</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>

        <label className="text-sm">Dari:</label>
        <input
          type="date"
          value={filterStart}
          onChange={(e) => setFilterStart(e.target.value)}
          className="p-2 border rounded"
        />

        <label className="text-sm">Sampai:</label>
        <input
          type="date"
          value={filterEnd}
          onChange={(e) => setFilterEnd(e.target.value)}
          className="p-2 border rounded"
        />

        <div className="ml-auto flex items-center space-x-2">
          <div className="flex items-center border rounded p-1">
            <FaSearch className="mx-2 text-gray-500" />
            <input
              placeholder="Cari invoice, user, barang..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="p-1 outline-none"
            />
          </div>

          <button
            onClick={handleExportExcel}
            className="px-3 py-1 bg-green-600 text-white rounded flex items-center"
          >
            <FaFileExcel className="mr-2" /> Excel
          </button>

          <button
            onClick={handleExportPDF}
            className="px-3 py-1 bg-red-600 text-white rounded flex items-center"
          >
            <FaFilePdf className="mr-2" /> PDF
          </button>
        </div>
      </div>

      {/* SUMMARY */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-white p-3 rounded shadow text-center">
          <div className="text-sm text-gray-600">Total Transaksi</div>
          <div className="text-2xl font-bold">{filteredData.length}</div>
        </div>

        <div className="bg-white p-3 rounded shadow text-center">
          <div className="text-sm text-gray-600">Total Qty</div>
          <div className="text-2xl font-bold">
            {totalQty.toLocaleString("id-ID")}
          </div>
        </div>

        <div className="bg-white p-3 rounded shadow text-center">
          <div className="text-sm text-gray-600">Total Omzet</div>
          <div className="text-2xl font-bold text-green-600">
            Rp {totalOmzet.toLocaleString("id-ID")}
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded shadow overflow-x-auto">
        <table ref={tableRef} className="w-full text-sm border-collapse">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="p-2 border">No</th>
              <th className="p-2 border">Tanggal</th>
              <th className="p-2 border">No Invoice</th>
              <th className="p-2 border">Nama Toko</th>
              <th className="p-2 border">Nama Pelanggan</th>
              <th className="p-2 border">ID Pelanggan</th>
              <th className="p-2 border">No TLP</th>
              <th className="p-2 border">Store Head</th>
              <th className="p-2 border">Sales</th>
              <th className="p-2 border">Sales Handle</th>
              <th className="p-2 border">Kategori</th>
              <th className="p-2 border">Brand</th>
              <th className="p-2 border">Nama Barang</th>
              <th className="p-2 border">No IMEI</th>
              <th className="p-2 border">Qty</th>
              <th className="p-2 border">Harga SRP</th>
              <th className="p-2 border">Harga Grosir</th>
              <th className="p-2 border">Harga Reseller</th>
              <th className="p-2 border">Status Bayar</th>
              <th className="p-2 border">Payment Metode User</th>
              <th className="p-2 border"> Payment Kredit</th>
              <th className="p-2 border"> Dashboard Kredit</th>
              <th className="p-2 border">Bank</th>
              <th className="p-2 border">Nominal Payment</th>
              <th className="p-2 border">DP Talangan</th>
              <th className="p-2 border">Nama MDR</th>
              <th className="p-2 border">Nominal MDR</th>
              <th className="p-2 border">Payment Kredit</th>
              <th className="p-2 border">Tenor</th>
              <th className="p-2 border">Keterangan</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Grand Total</th>
            </tr>
          </thead>

          <tbody>
            {paginated.map((row, index) => (
              <tr key={row.id}>
                <td className="p-2 border text-center">
                  {(currentPage - 1) * rowsPerPage + index + 1}
                </td>

                {/* TANGGAL */}
                <td className="p-2 border">
                  {row.TANGGAL_TRANSAKSI
                    ? new Date(row.TANGGAL_TRANSAKSI).toLocaleDateString(
                        "id-ID"
                      )
                    : "-"}
                </td>

                {/* INVOICE */}
                <td className="p-2 border">{row.NO_INVOICE}</td>

                {/* TOKO */}
                <td className="p-2 border">{row.NAMA_TOKO}</td>

                {/* USER */}
                <td className="p-2 border">{row.NAMA_USER}</td>
                <td className="p-2 border">{row.ID_USER}</td>
                <td className="p-2 border">{row.NO_TLP}</td>

                {/* SALES */}
                <td className="p-2 border">{row.STORE_HEAD}</td>
                <td className="p-2 border">{row.NAMA_SALES}</td>
                <td className="p-2 border">{row.SALES_HANDLE}</td>

                {/* BARANG */}
                <td className="p-2 border">{row.KATEGORI}</td>
                <td className="p-2 border">{row.NAMA_BRAND}</td>

                {/* 🔥 NAMA BARANG PER ITEM */}
                <td className="p-2 border">
                  {row.DETAIL_ITEMS?.length
                    ? row.DETAIL_ITEMS.map((item, i) => (
                        <div key={i}>
                          • {item.namaBarang} ({item.qty})
                        </div>
                      ))
                    : row.NAMA_BARANG}
                </td>

                {/* IMEI */}
                <td className="p-2 border">
                  {row.DETAIL_ITEMS?.length
                    ? row.DETAIL_ITEMS.map((item, i) => (
                        <div key={i}>
                          {item.imeiList?.join(", ") || "NON-IMEI"}
                        </div>
                      ))
                    : row.IMEI}
                </td>

                {/* QTY */}
                <td className="p-2 border">{row.QTY}</td>

                {/* 🔥 HARGA PER ITEM */}
                <td className="p-2 border">
                  {row.DETAIL_ITEMS?.length
                    ? row.DETAIL_ITEMS.map((item, i) => (
                        <div key={i}>
                          {rupiah(
                            item.skemaHarga === "srp" ? item.hargaAktif : 0
                          )}
                        </div>
                      ))
                    : rupiah(row.HARGA_SRP)}
                </td>

                <td className="p-2 border">
                  {row.DETAIL_ITEMS?.length
                    ? row.DETAIL_ITEMS.map((item, i) => (
                        <div key={i}>
                          {rupiah(
                            item.skemaHarga === "grosir" ? item.hargaAktif : 0
                          )}
                        </div>
                      ))
                    : rupiah(row.HARGA_GROSIR)}
                </td>

                <td className="p-2 border">
                  {row.DETAIL_ITEMS?.length
                    ? row.DETAIL_ITEMS.map((item, i) => (
                        <div key={i}>
                          {rupiah(
                            item.skemaHarga === "reseller" ? item.hargaAktif : 0
                          )}
                        </div>
                      ))
                    : rupiah(row.HARGA_RESELLER)}
                </td>

                {/* PAYMENT */}
                <td className="p-2 border">{row.STATUS_BAYAR}</td>
                <td className="p-2 border">{row.PAYMENT_METODE}</td>

                {/* 🔥 KREDIT */}
                <td className="p-2 border">{row.PAYMENT_KREDIT}</td>
                <td className="p-2 border">{rupiah(row.dashboardKredit)}</td>

                {/* BANK */}
                <td className="p-2 border">{row.NAMA_BANK}</td>

                {/* NOMINAL */}
                <td className="p-2 border">{rupiah(row.NOMINAL_PAYMENT)}</td>
                <td className="p-2 border">{rupiah(row.DP_TALANGAN)}</td>

                {/* MDR */}
                <td className="p-2 border">{row.NAMA_MDR}</td>
                <td className="p-2 border">{rupiah(row.NOMINAL_MDR)}</td>

                {/* KREDIT ULANG */}
                <td className="p-2 border">{row.PAYMENT_KREDIT}</td>

                {/* TENOR */}
                <td className="p-2 border">{row.TENOR}</td>

                {/* KETERANGAN */}
                <td className="p-2 border">{row.KETERANGAN}</td>

                {/* STATUS */}
                <td className="p-2 border">{row.STATUS}</td>

                {/* GRAND TOTAL */}
                <td className="p-2 border">{rupiah(row.GRAND_TOTAL)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-center items-center gap-2 mt-4">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage === 1}
            className="px-3 py-1 border rounded"
          >
            <FaChevronLeft />
          </button>

          <span className="text-sm">
            Page {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="px-3 py-1 border rounded"
          >
            <FaChevronRight />
          </button>
        </div>
      </div>

      {/* PAGINATION */}
      <div className="flex justify-between items-center mt-3 text-sm">
        <span>
          Halaman {currentPage} dari {totalPages} ({filteredData.length} data)
        </span>

        <div>
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-2 py-1 border rounded mr-2 disabled:opacity-40"
          >
            <FaChevronLeft />
          </button>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-2 py-1 border rounded disabled:opacity-40"
          >
            <FaChevronRight />
          </button>
        </div>
      </div>
    </div>
  );
}
