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
  "CIRACAS",
  "METLAND 1",
  "METLAND 2",
  "PITARA",
  "KOTA WISATA",
  "SAWANGAN",
];

export default function SalesReport() {
  const [allData, setAllData] = useState([]);
  const [filterToko, setFilterToko] = useState("semua");
  const [filterSales, setFilterSales] = useState("semua");
  const [filterBrand, setFilterBrand] = useState("semua");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [filterStart, setFilterStart] = useState("");
  const [filterEnd, setFilterEnd] = useState("");
  const [search, setSearch] = useState("");

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

  /* ===================== REALTIME ===================== */
  useEffect(() => {
    const unsub = listenPenjualan((items = []) => {
      console.log("🔥 RAW ALL TRANSAKSI:", items);

      // ===============================
      // 1️⃣ HEADER PENJUALAN (INVOICE)
      // ===============================
      const headerMap = {};

      items.forEach((x) => {
        const invoice = x.invoice || x.NO_INVOICE;

        if (invoice && invoice.startsWith("INV-") && x.payment) {
          headerMap[invoice] = {
            invoice,

            // ===== HEADER =====
            tanggal: x.tanggal || x.createdAt,
            user: x.user || {},
            toko: x.toko || x.NAMA_TOKO || x.TOKO || "-",

            // ===== PAYMENT (WAJIB ADA) =====
            payment: x.payment || {},

            status: x.statusPembayaran || "LUNAS",
          };
        }
      });

      // ===============================
      // 2️⃣ DETAIL BARANG (AUTO FROM PENJUALAN)
      // ===============================
      const detailRows = items.filter(
        (x) =>
          x.KETERANGAN === "AUTO FROM PENJUALAN" && (x.invoice || x.NO_INVOICE)
      );

      // ===============================
      // 3️⃣ INVOICE YANG DIRETUR
      // ===============================
      const refundedInvoices = new Set(
        items
          .filter((x) =>
            String(x.KETERANGAN || "").startsWith("REFUND dari invoice")
          )
          .map((x) =>
            String(x.KETERANGAN).replace("REFUND dari invoice ", "").trim()
          )
      );

      // ===============================
      // 4️⃣ JOIN HEADER + DETAIL
      // ===============================
      const finalRows = detailRows
        .filter((d) => {
          const inv = d.invoice || d.NO_INVOICE;
          return !refundedInvoices.has(inv);
        })
        .map((d, idx) => {
          const inv = d.invoice || d.NO_INVOICE;
          const h = headerMap[inv] || {};
          const payment = h.payment || {};

          /* ================= PAYMENT METODE (SAMA TABLE PENJUALAN) ================= */
          let paymentMetode = "-";
          let namaBank = "-";
          let nominalPayment = 0;

          if (
            Array.isArray(payment.splitPayment) &&
            payment.splitPayment.length
          ) {
            paymentMetode = payment.splitPayment
              .map((p) => p.metode)
              .join(" + ");

            namaBank = payment.splitPayment
              .map((p) => p.bankNama || "-")
              .join(" + ");

            nominalPayment = payment.splitPayment.reduce(
              (s, p) => s + Number(p.nominal || 0),
              0
            );
          } else {
            paymentMetode = payment.metode || payment.status || "-";

            namaBank = payment.bankNama || payment.namaBank || "-";

            nominalPayment =
              Number(payment.nominalPayment || 0) ||
              Number(payment.nominal || 0);
          }

          /* ================= AMBIL ITEM ASLI (SAMA TABLE PENJUALAN) ================= */
          const item =
            (items.find((t) => t.invoice === inv)?.items || [])[0] || {};

          /* ================= KATEGORI (SAMA TABLE PENJUALAN) ================= */
          const kategoriBarang = item.kategoriBarang || "-";

          /* ================= HARGA (SAMA TABLE PENJUALAN) ================= */
          let hargaSRP = 0;
          let hargaGrosir = 0;
          let hargaReseller = 0;

          if (item.skemaHarga === "srp") {
            hargaSRP = Number(item.hargaAktif || 0);
          }

          if (item.skemaHarga === "grosir") {
            hargaGrosir = Number(item.hargaAktif || 0);
          }

          if (item.skemaHarga === "reseller") {
            hargaReseller = Number(item.hargaAktif || 0);
          }

          return {
            id: d.id || `${inv}-${idx}`,

            /* ===== HEADER ===== */
            TANGGAL_TRANSAKSI: h.tanggal || d.createdAt,
            NO_INVOICE: inv,

            NAMA_TOKO: h.toko || "-",
            NAMA_USER: h.user?.namaPelanggan || "-",
            NO_TLP: h.user?.noTlpPelanggan || "-", // ✅ FIX
            STORE_HEAD: h.user?.storeHead || "-",
            NAMA_SALES: h.user?.namaSales || "-",
            SALES_HANDLE: h.user?.salesHandle || "-",

            /* ===== BARANG ===== */
            KATEGORI: kategoriBarang,

            NAMA_BRAND: d.NAMA_BRAND || "-",
            NAMA_BARANG: d.NAMA_BARANG || "-",
            IMEI: d.IMEI || "NON-IMEI",
            QTY: Number(d.QTY || 1),

            HARGA_SRP: hargaSRP,
            HARGA_GROSIR: hargaGrosir,
            HARGA_RESELLER: hargaReseller,

            /* ===== PAYMENT ===== */
            STATUS_BAYAR: payment.status || "-",
            PAYMENT_METODE: paymentMetode,
            NAMA_BANK: namaBank,
            NOMINAL_PAYMENT: nominalPayment,
            DP_TALANGAN: Number(payment.dpTalangan || 0),

            NAMA_MDR: payment.namaMdr || "-",
            NOMINAL_MDR: Number(payment.nominalMdr || 0),

            PAYMENT_KREDIT: payment.status === "PIUTANG" ? "KREDIT" : "LUNAS",

            TENOR: payment.tenor || "-",

            /* ===== KETERANGAN (PRIORITAS PAYMENT) ===== */
            KETERANGAN: payment.keterangan || d.KETERANGAN || "-",

            STATUS: h.status || "OK",
            GRAND_TOTAL: Number(payment.grandTotal || 0),
          };
        });

      setAllData(finalRows);
      setCurrentPage(1);
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
      const exportData = filteredData.map((r, i) => ({
        No: i + 1,
  
        Tanggal: r.TANGGAL_TRANSAKSI
          ? new Date(r.TANGGAL_TRANSAKSI).toLocaleDateString("id-ID")
          : "-",
  
        NoInvoice: r.NO_INVOICE,
        NamaToko: r.NAMA_TOKO,
        NamaPelanggan: r.NAMA_USER,
        NoTlp: r.NO_TLP,
        StoreHead: r.STORE_HEAD,
        Sales: r.NAMA_SALES,
        SalesHandle: r.SALES_HANDLE,
  
        Kategori: r.KATEGORI,
        Brand: r.NAMA_BRAND,
        NamaBarang: r.NAMA_BARANG,
        IMEI: r.IMEI,
        Qty: r.QTY,
  
        HargaSRP: r.HARGA_SRP,
        HargaGrosir: r.HARGA_GROSIR,
        HargaReseller: r.HARGA_RESELLER,
  
        StatusBayar: r.STATUS_BAYAR,
        PaymentMetode: r.PAYMENT_METODE,
        Bank: r.NAMA_BANK,
        NominalPayment: r.NOMINAL_PAYMENT,
  
        DPTalangan: r.DP_TALANGAN,
        NamaMDR: r.NAMA_MDR,
        NominalMDR: r.NOMINAL_MDR,
  
        PaymentKredit: r.PAYMENT_KREDIT,
        Tenor: r.TENOR,
  
        Keterangan: r.KETERANGAN,
        Status: r.STATUS,
        GrandTotal: r.GRAND_TOTAL,
      }));
  
      const ws = XLSX.utils.json_to_sheet(exportData);
  
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
              <th className="p-2 border">Payment Metode</th>
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
                <td className="p-2 border">
                  {row.TANGGAL_TRANSAKSI
                    ? new Date(row.TANGGAL_TRANSAKSI).toLocaleDateString(
                        "id-ID"
                      )
                    : "-"}
                </td>

                <td className="p-2 border">{row.NO_INVOICE}</td>
                <td className="p-2 border">{row.NAMA_TOKO}</td>
                <td className="p-2 border">{row.NAMA_USER}</td>
                <td className="p-2 border">{row.NO_TLP}</td>
                <td className="p-2 border">{row.STORE_HEAD}</td>
                <td className="p-2 border">{row.NAMA_SALES}</td>
                <td className="p-2 border">{row.SALES_HANDLE}</td>
                <td className="p-2 border">{row.KATEGORI}</td>
                <td className="p-2 border">{row.NAMA_BRAND}</td>
                <td className="p-2 border">{row.NAMA_BARANG}</td>
                <td className="p-2 border">{row.IMEI}</td>
                <td className="p-2 border">{row.QTY}</td>
                <td className="p-2 border">
                  Rp {row.HARGA_SRP.toLocaleString("id-ID")}
                </td>
                <td className="p-2 border">
                  Rp {row.HARGA_GROSIR.toLocaleString("id-ID")}
                </td>
                <td className="p-2 border">
                  Rp {row.HARGA_RESELLER.toLocaleString("id-ID")}
                </td>
                <td className="p-2 border">{row.STATUS_BAYAR}</td>
                <td className="p-2 border">{row.PAYMENT_METODE}</td>
                <td className="p-2 border">{row.NAMA_BANK}</td>
                <td className="p-2 border">
                  Rp {row.NOMINAL_PAYMENT.toLocaleString("id-ID")}
                </td>
                <td className="p-2 border">
                  Rp {row.DP_TALANGAN.toLocaleString("id-ID")}
                </td>
                <td className="p-2 border">{row.NAMA_MDR}</td>
                <td className="p-2 border">
                  Rp {row.NOMINAL_MDR.toLocaleString("id-ID")}
                </td>
                <td className="p-2 border">{row.PAYMENT_KREDIT}</td>
                <td className="p-2 border">{row.TENOR}</td>
                <td className="p-2 border">{row.KETERANGAN}</td>
                <td className="p-2 border">{row.STATUS}</td>
                <td className="p-2 border">
                  Rp {row.GRAND_TOTAL.toLocaleString("id-ID")}
                </td>
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
