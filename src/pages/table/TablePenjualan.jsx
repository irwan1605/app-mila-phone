// =======================================================
// TablePenjualan.jsx — FINAL VERSION 100% FIXED
// Detail Penjualan Lengkap + Pagination + Edit & VOID
// =======================================================

import React, { useEffect, useMemo, useState, useRef } from "react";

import {
  listenPenjualan,
  refundRestorePenjualan,
  updateTransaksiPenjualan,
  getUserRole,
  addTransaksi,
  generateIdPelanggan,
  tambahStokSetelahRefund,
} from "../../services/FirebaseService";
import { ref, get, update, remove, push } from "firebase/database";
import { db } from "../../services/FirebaseInit";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import "jspdf-autotable";
import CetakInvoicePenjualan from "../Print/CetakInvoicePenjualan";

/* ================= UTIL ================= */
const rupiah = (n) =>
  Number(n || 0).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });

const TOKO_MAP = {
  1: "CILANGKAP PUSAT",
  2: "CIBINONG",
  3: "GAS ALAM",
  4: "CITEUREUP",
  5: "MARKETPLACE",
  6: "METLAND 1",
  7: "METLAND 2",
  8: "PITARA",
  9: "KOTA WISATA",
  10: "SAWANGAN",
};

export default function TablePenjualan({ data = [] }) {
  const rows = data;
  const [refundLoading, setRefundLoading] = useState(null);
  const [page, setPage] = useState(1);
  const [printData, setPrintData] = useState(null);
  const [showPrint, setShowPrint] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editData, setEditData] = useState(null);
  /* ================= FILTER ================= */
  const [keyword, setKeyword] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showRefund, setShowRefund] = useState(false);
  const [localHiddenRefund, setLocalHiddenRefund] = useState({});
  const [deletedRows, setDeletedRows] = useState({});

  const pageSize = 10;

  /* ================= USER LOGIN ================= */
  const userLogin = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("userLogin")) || {};
    } catch {
      return {};
    }
  }, []);

  const [roleDb, setRoleDb] = useState(null);

  // DEBUG
  console.log("LOGIN:", userLogin);
  console.log(
    "LOGIN KEY:",
    userLogin?.username || userLogin?.name || userLogin?.nik
  );
  console.log("ROLE DB:", roleDb);

  useEffect(() => {
    const loginKey = userLogin?.username || userLogin?.name || userLogin?.nik;

    if (!loginKey) return;

    getUserRole(loginKey).then(setRoleDb);
  }, [userLogin]);

  const roleFinal = roleDb || userLogin?.role || "";

  const isSuperAdmin = String(roleFinal).toLowerCase() === "superadmin";

  const tokoLogin = useMemo(() => {
    const roleFinal = roleDb || userLogin?.role || "";

    // SUPERADMIN lihat semua
    if (String(roleFinal).toLowerCase() === "superadmin") {
      return "";
    }

    // PIC TOKO
    if (String(roleFinal).startsWith("pic_toko")) {
      const id = roleFinal.replace("pic_toko", "");
      return TOKO_MAP[id] || "";
    }

    // fallback dari login
    return userLogin?.toko || userLogin?.namaToko || "";
  }, [roleDb, userLogin]);

  /* ================= LOAD DATA ================= */
  // useEffect(() => {
  //   const unsub = listenPenjualan((data) => {
  //     console.log("DATA PENJUALAN:", data); // 👈 DEBUG

  //     setRows(Array.isArray(data) ? data : []);
  //   });

  //   return () => {
  //     if (unsub) unsub();
  //   };
  // }, []);

  useEffect(() => {
    setPage(1);
  }, [keyword, dateFrom, dateTo]);

  const refundLock = useRef({});

  /* ================= FLATTEN DATA ================= */
  const tableRows = useMemo(() => {
    const map = {};

    (rows || []).forEach((trx) => {
      if (trx.statusPembayaran === "REFUND") return;
      if (!Array.isArray(trx.items)) return;

      /* ================= PAYMENT ================= */
      let paymentMetode = "-";
      let namaBank = "-";
      let nominalPaymentMetode = 0;

      if (
        Array.isArray(trx.payment?.splitPayment) &&
        trx.payment.splitPayment.length
      ) {
        paymentMetode = trx.payment.splitPayment
          .map((p) => p.metode)
          .join(" + ");

        namaBank = trx.payment.splitPayment
          .map((p) => p.bankNama || "-")
          .join(" + ");

        nominalPaymentMetode = trx.payment.splitPayment.reduce(
          (s, p) => s + Number(p.nominal || 0),
          0
        );
      } else {
        paymentMetode = trx.payment?.metode || trx.payment?.status || "-";
        namaBank = trx.payment?.bankNama || trx.payment?.namaBank || "-";
        nominalPaymentMetode =
          Number(trx.payment?.nominalPayment || 0) ||
          Number(trx.payment?.nominal || 0) ||
          0;
      }

      /* ================= GRAND TOTAL ================= */
      const grandTotalFix =
        Number(trx.payment?.grandTotal || 0) > 0
          ? Number(trx.payment.grandTotal)
          : (trx.items || []).reduce(
              (s, it) => s + Number(it.qty || 0) * Number(it.hargaAktif || 0),
              0
            ) + Number(trx.payment?.nominalMdr || 0);

      /* ================= AGREGASI ITEM ================= */
      const allBarang = trx.items.map((i) => i.namaBarang).join(", ");
      const allIMEI = trx.items.flatMap((i) => i.imeiList || []).join(", ");
      const totalQty = trx.items.reduce((s, i) => s + Number(i.qty || 0), 0);

      const totalBayarFix = Number(nominalPaymentMetode || 0);

      const kurangBayar =
        totalBayarFix < grandTotalFix ? grandTotalFix - totalBayarFix : 0;

      const sisaKembalian =
        totalBayarFix > grandTotalFix ? totalBayarFix - grandTotalFix : 0;

      /* ================= PUSH HANYA 1X PER INVOICE ================= */
      if (!map[trx.invoice]) {
        map[trx.invoice] = {
          id: trx.id,
          trxKey: trx.trxKey,
          tokoId: trx.tokoId,

          tanggal: trx.tanggal || trx.createdAt,
          invoice: trx.invoice,
          toko: trx.toko || "-",

          pelanggan: trx.user?.namaPelanggan || "-",
          idPelanggan: trx.user?.idPelanggan || "-",
          telp: trx.user?.noTlpPelanggan || "-",

          storeHead: trx.user?.storeHead || "-",
          sales: trx.user?.namaSales || "-",
          salesHandle: trx.user?.salesHandle || "-",

          paymentMetode,
          namaBank,
          nominalPaymentMetode,

          namaMdr: trx.payment?.namaMdr || "-",
          dpTalangan: Number(trx.payment?.dpTalangan || 0),
          paymentKredit: trx.payment?.status === "PIUTANG" ? "KREDIT" : "LUNAS",

          /* 🔥 AGREGASI */
          kategoriBarang:
            trx.items?.length === 1
              ? trx.items[0]?.kategoriBarang || "-"
              : trx.items?.map((i) => i.kategoriBarang).join(", "),
          namaBrand:
            trx.items?.length === 1
              ? trx.items[0]?.namaBrand || "-"
              : [...new Set(trx.items.map((i) => i.namaBrand))].join(", "),
          namaBarang: allBarang,
          imei: allIMEI,
          qty: totalQty,

          hargaSRP: 0,
          hargaGrosir: 0,
          hargaReseller: 0,

          statusBayar: trx.payment?.status || "-",
          nominalMdr: trx.payment?.nominalMdr || 0,
          dashboardKredit: Number(trx.payment?.dashboardPayment || 0),

          paymentKreditNominal:
            trx.payment?.paymentMethod === "KREDIT"
              ? Number(trx.payment?.dashboardPayment || 0) -
                Number(trx.payment?.nominalMdr || 0) -
                Number(trx.payment?.dpTalangan || 0)
              : 0,

          paymentMetodeUser: Array.isArray(trx.payment?.splitPayment)
            ? trx.payment.splitPayment.map((p) => p.metode).join(" + ")
            : trx.payment?.paymentMethod || trx.payment?.metode || "-",
          tenor: trx.payment?.tenor || "-",
          cicilan: trx.payment?.cicilan || 0,

          KURANG_BAYAR: kurangBayar,
          SISA_KEMBALIAN: sisaKembalian,

          grandTotal: grandTotalFix,
          grandTotalDisplay: grandTotalFix,

          status: trx.statusPembayaran || "OK",
        };
      }
    });

    return Object.values(map);
  }, [rows]);

  /* ================= FILTER ================= */
  const filteredRows = useMemo(() => {
    return tableRows.filter((r) => {
      const status = String(r.status || "")
        .trim()
        .toUpperCase();

      // 🔥 HILANGKAN LANGSUNG SAAT KLIK REFUND
      // 🔥 HIDE INSTANT
      if (deletedRows[r.invoice]) {
        return false;
      }

      // 🔥 fallback lama
      if (localHiddenRefund[r.id]) {
        return false;
      }

      // ✅ REFUND HILANG OTOMATIS
      if (!showRefund && status === "REFUND") {
        return false;
      }

      // ✅ FILTER TOKO
      if (!isSuperAdmin && tokoLogin) {
        const dbToko = String(r.toko || "")
          .replace(/\s+/g, "")
          .toUpperCase();

        const loginToko = String(tokoLogin || "")
          .replace(/\s+/g, "")
          .toUpperCase();

        if (dbToko !== loginToko) {
          return false;
        }
      }

      const text = `
        ${r.invoice}
        ${r.toko}
        ${r.pelanggan}
        ${r.idpelanggan}
        ${r.sales}
        ${r.salesHandle}
        ${r.kategoriBarang}
        ${r.namaBrand}
        ${r.namaBarang}
        ${r.imei}
        ${r.namaBank}
        ${r.nominalPaymentMetode}
      `.toLowerCase();

      const matchText = text.includes(keyword.toLowerCase());

      let matchDate = true;

      if (dateFrom) {
        matchDate = new Date(r.tanggal) >= new Date(dateFrom);
      }

      if (matchDate && dateTo) {
        matchDate = new Date(r.tanggal) <= new Date(dateTo);
      }

      return matchText && matchDate;
    });
  }, [
    tableRows,
    keyword,
    dateFrom,
    dateTo,
    isSuperAdmin,
    tokoLogin,
    showRefund,
  ]);

  /* ================= PAGINATION ================= */
  const pageCount = Math.ceil(filteredRows.length / pageSize);

  const pagedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page]);

  /* ================= TOTAL PENJUALAN FILTERED ================= */
  const totalPenjualanFiltered = useMemo(() => {
    const mapInvoice = {};

    filteredRows.forEach((r) => {
      if (!mapInvoice[r.invoice]) {
        mapInvoice[r.invoice] = Number(r.grandTotal || 0);
      }
    });

    return Object.values(mapInvoice).reduce((s, v) => s + v, 0);
  }, [filteredRows]);

  const handlePrint = (row) => {
    if (row.status === "REFUND") {
      return alert("Barang ini sudah Pernah Di Refund");
    }

    const trx = rows.find(
      (x) => String(x.invoice || "").trim() === String(row.invoice || "").trim()
    );
    if (!trx) return alert("Data transaksi tidak ditemukan");

    setPrintData(trx);
    setShowPrint(true);
  };

  const handleEdit = (row) => {
    if (!isSuperAdmin) return;

    const trx = rows.find((x) => x.id === row.id);
    if (!trx) return alert("Data transaksi tidak ditemukan");

    setEditData(trx);
    setShowEdit(true);
  };

  const exportPDF = () => {
    const doc = new jsPDF("l", "mm", "a4");

    doc.text("LAPORAN PENJUALAN", 14, 10);

    doc.autoTable({
      startY: 15,
      head: [
        [
          "No",
          "Tanggal",
          "Invoice",
          "Toko",
          "Barang",
          "IMEI",
          "QTY",
          "Grand Total",
          "Status",
        ],
      ],
      body: tableRows.map((r, i) => [
        i + 1,
        new Date(r.tanggal).toLocaleDateString("id-ID"),
        r.invoice,
        r.toko,
        r.namaBarang,
        r.imei,
        r.qty,
        rupiah(r.grandTotal),
        r.status,
      ]),
      styles: { fontSize: 8 },
    });

    doc.save(`Laporan_Penjualan_${Date.now()}.pdf`);
  };

  const handleSaveEdit = async () => {
    try {
      await updateTransaksiPenjualan(editData.id, editData, userLogin);

      alert("✅ Transaksi berhasil diupdate");
      setShowEdit(false);
    } catch (e) {
      alert(e.message || "❌ Gagal update");
    }
  };

  const TOKO_NAME_TO_ID = {
    "CILANGKAP PUSAT": "1",
    CIBINONG: "2",
    "GAS ALAM": "3",
    CITEUREUP: "4",
    MARKETPLACE: "5",
    "METLAND 1": "6",
    "METLAND 2": "7",
    PITARA: "8",
    "KOTA WISATA": "9",
    SAWANGAN: "10",
  };

  const handleRefund = async (row) => {
    // ===============================
    // 🔥 1. HARD LOCK (SYNC - TANPA DELAY)
    // ===============================
    if (refundLock.current[row.id]) return;
    refundLock.current[row.id] = true;

    try {
      // ===============================
      // 🔥 2. VALIDASI CEPAT
      // ===============================
      if (!isSuperAdmin) {
        alert("❌ Refund hanya untuk Superadmin");
        return;
      }

      const trx = rows.find(
        (x) =>
          String(x.invoice || "").trim() === String(row.invoice || "").trim()
      );

      if (trx?.refundProcessed) {
        alert("❌ Sudah pernah di refund");
        return;
      }

      // ===============================
      // 🔥 3. LANGSUNG LOCK UI (TANPA NUNGGU)
      // ===============================
      setRefundLoading(row.id);

      // ===============================
      // 🔥 4. CONFIRM (SETELAH LOCK)
      // ===============================
      const ok = window.confirm("Yakin ingin REFUND?");
      if (!ok) return;

      // ===============================
      // 🔥 5. PROSES
      // ===============================
      await updateTransaksiPenjualan(
        row.trxKey,
        {
          statusPembayaran: "REFUND",
          refundProcessed: true,
        },
        userLogin
      );

      // 🔥 CATAT TRANSAKSI (SUMBER STOK)
      await addTransaksi(row.tokoId, {
        TANGGAL_TRANSAKSI: new Date().toISOString().slice(0, 10),
        NO_INVOICE: `REF-${Date.now()}`,
        NAMA_TOKO: row.toko,
        NAMA_BARANG: row.namaBarang,
        IMEI: row.imei,
        QTY: 1,
        PAYMENT_METODE: "REFUND",
        STATUS: "Approved",
        CREATED_AT: Date.now(),

        // 🔥 WAJIB (ANTI DOUBLE)
        SOURCE: "REFUND_BUTTON",
      });

      // ===============================
      // 🔥 6. HIDE UI (OPSIONAL)
      // ===============================
      setDeletedRows((prev) => ({
        ...prev,
        [row.invoice]: true,
      }));

      alert("✅ Refund berhasil (1 klik)");
    } catch (e) {
      console.error(e);
      alert("❌ Refund gagal: " + e.message);
    } finally {
      // ===============================
      // 🔥 7. UNLOCK (WAJIB)
      // ===============================
      setRefundLoading(null);
      delete refundLock.current[row.id];
    }
  };
  /* ================= EXPORT EXCEL ================= */
  const exportExcel = () => {
    const data = [];

    tableRows.forEach((r, i) => {
      data.push({
        No: i + 1,
    
        // ===== INVOICE =====
        Tanggal: r.tanggal
          ? new Date(r.tanggal).toLocaleDateString("id-ID")
          : "-",
        Invoice: r.invoice,
        Toko: r.toko,
    
        // ===== USER =====
        Pelanggan: r.pelanggan,
        IDPelanggan: r.idPelanggan,
        Telp: r.telp,
        StoreHead: r.storeHead,
    
        // ===== SALES =====
        Sales: r.sales,
        SalesHandle: r.salesHandle,
    
        // ===== BARANG (TAHAP 2) =====
        Kategori: r.kategoriBarang,
        Brand: r.namaBrand,
        NamaBarang: r.namaBarang,
        IMEI: r.imei,
        QTY: r.qty,
    
        // ===== HARGA =====
        HargaSRP: r.hargaSRP || 0,
        HargaGrosir: r.hargaGrosir || 0,
        HargaReseller: r.hargaReseller || 0,
    
        // ===== PAYMENT (TAHAP 3) =====
        StatusBayar: r.statusBayar,
    
        PaymentMetode: r.paymentMetodeUser || r.paymentMetode,
        NamaBank: r.namaBank,
    
        DashboardKredit: r.dashboardKredit || 0,
        PaymentKredit: r.paymentKreditNominal || 0,
    
        NominalPayment: r.nominalPaymentMetode || 0,
    
        // ===== MDR =====
        NamaMDR: r.namaMdr,
        NominalMDR: r.nominalMdr,
        DPTalangan: r.dpTalangan,
    
        // ===== KREDIT =====
        Tenor: r.tenor,
        Cicilan: r.cicilan || 0,
    
        // ===== SELISIH =====
        KurangBayar: r.KURANG_BAYAR || 0,
        SisaKembalian: r.SISA_KEMBALIAN || 0,
    
        // ===== TOTAL =====
        GrandTotal: r.grandTotal,
    
        Status: r.status,
      });
    });

    const ws = XLSX.utils.json_to_sheet(data);

    // auto width kolom
    ws["!cols"] = Object.keys(data[0]).map(() => ({ wch: 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Penjualan");

    const excelBuffer = XLSX.write(wb, {
      bookType: "xlsx",
      type: "array",
    });

    saveAs(new Blob([excelBuffer]), `Laporan_Penjualan_${Date.now()}.xlsx`);
  };

  /* ================= RENDER ================= */
  return (
    <div className="bg-white rounded-2xl shadow-lg p-5">
      {showPrint && printData && (
        <div className="fixed inset-0 bg-black/40 z-40 flex justify-center items-center pointer-events-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-auto">
            <CetakInvoicePenjualan
              transaksi={printData}
              onClose={() => setShowPrint(false)}
            />
          </div>
        </div>
      )}
      <h2 className="text-lg font-bold mb-4">📊 TABEL PENJUALAN</h2>

      <div className="flex gap-2 p-4">
        <button
          onClick={exportExcel}
          className="px-3 py-1 bg-green-600 text-white rounded"
        >
          Export Excel
        </button>
      </div>

      <div className="grid grid-cols-4 gap-3 mb-4">
        <input
          placeholder="🔍 Cari Invoice, Toko, Pelanggan, Sales, Barang, IMEI..."
          className="border rounded px-3 py-1 col-span-2"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />

        <input
          type="date"
          className="border rounded px-3 py-1"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />

        <input
          type="date"
          className="border rounded px-3 py-1"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={showRefund}
          onChange={(e) => setShowRefund(e.target.checked)}
        />
        Tampilkan transaksi refund
      </label>

      {/* SCROLL HORIZONTAL */}
      <div className="relative overflow-x-auto rounded-xl border border-gray-300 shadow-md">
        <table className="min-w-[2600px] w-full text-sm text-gray-700 border-collapse">
          <thead className="sticky top-0 z-20 bg-gradient-to-r from-slate-100 to-slate-200 text-xs uppercase text-gray-700">
            <tr>
              <th className="px-3 py-2 border border-gray-400 text-center">
                No
              </th>
              <th className="px-3 py-2 border border-gray-400">Tanggal</th>
              <th className="px-3 py-2 border border-gray-400">No Invoice</th>
              <th className="px-3 py-2 border border-gray-400">Nama Toko</th>
              <th className="px-3 py-2 border border-gray-400">
                Nama Pelanggan
              </th>{" "}
              <th className="px-3 py-2 border border-gray-400">ID Pelanggan</th>
              <th className="px-3 py-2 border border-gray-400">No TLP</th>
              <th className="px-3 py-2 border border-gray-400">
                Nama Store Head
              </th>
              <th className="px-3 py-2 border border-gray-400">Nama Sales</th>
              <th className="px-3 py-2 border border-gray-400">Sales Handle</th>
              <th className="px-3 py-2 border border-gray-400">Kategori</th>
              <th className="px-3 py-2 border border-gray-400">Brand</th>
              <th className="px-3 py-2 border border-gray-400">Nama Barang</th>
              <th className="px-3 py-2 border border-gray-400">No IMEI</th>
              <th className="px-3 py-2 border border-gray-400">QTY</th>
              <th className="px-3 py-2 border border-gray-400">Harga SRP</th>
              <th className="px-3 py-2 border border-gray-400">Harga Grosir</th>
              <th className="px-3 py-2 border border-gray-400">
                Harga Reseller
              </th>
              <th className="px-3 py-2 border border-gray-400">Status Bayar</th>
              <th className="px-3 py-2 border border-gray-400">
                Payment Metode
              </th>
              <th className="px-3 py-2 border border-gray-400">
                Payment Kredit
              </th>
              <th className="px-3 py-2 border border-gray-400">
                Dashboard Kredit
              </th>
              <th className="px-3 py-2 border border-gray-400">Tenor</th>
              <th className="px-3 py-2 border border-gray-400">Nama Bank</th>
              <th className="px-3 py-2 border border-gray-400">Nama MDR</th>
              <th className="px-3 py-2 border border-gray-400">Nominal MDR</th>
              <th className="px-3 py-2 border border-gray-400">
                Nominal Payment
              </th>
              <th className="px-3 py-2 border border-gray-400">Kurang Bayar</th>
              <th className="px-3 py-2 border border-gray-400">
                Sisa Kembalian
              </th>
              <th className="px-3 py-2 border border-gray-400">DP Talangan</th>
              <th className="px-3 py-2 border border-gray-400">Keterangan</th>
              <th className="px-3 py-2 border border-gray-400">Grand Total</th>
              <th className="px-3 py-2 border border-gray-400">Status</th>
              <th className="px-3 py-2 border border-gray-400">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {pagedData.map((row, i) => (
              <tr
                key={`${row.invoice}-${i}`}
                className={`${
                  i % 2 === 0 ? "bg-white" : "bg-gray-50"
                } hover:bg-blue-50 transition`}
              >
                <td className="px-3 py-2 border border-gray-300 text-center">
                  {(page - 1) * pageSize + i + 1}
                </td>
                <td className="px-3 py-2 border border-gray-300">
                  {row.tanggal
                    ? new Date(row.tanggal).toLocaleDateString("id-ID")
                    : "-"}
                </td>
                <td className="px-3 py-2 border border-gray-300 font-semibold">
                  {row.invoice}
                </td>
                <td className="px-3 py-2 border border-gray-300">{row.toko}</td>
                <td className="px-3 py-2 border border-gray-300">
                  {row.pelanggan}
                </td>
                <td className="px-3 py-2 border border-gray-300">
                  {row.idPelanggan}
                </td>
                <td className="px-3 py-2 border border-gray-300">{row.telp}</td>
                <td className="px-3 py-2 border border-gray-300">
                  {row.storeHead}{" "}
                </td>
                <td className="px-3 py-2 border border-gray-300">
                  {row.sales}
                </td>
                {/* 🔥 SALES HANDEL */}
                <td className="px-3 py-2 border border-gray-300">
                  {row.salesHandle || "-"}
                </td>
                <td
                  className={`px-3 py-2 border text-right font-medium ${
                    row.kategoriBarang === "ACCESSORIES" ? "text-blue-600" : ""
                  }`}
                >
                  {row.kategoriBarang}
                </td>
                <td className="px-3 py-2 border border-gray-300">
                  {row.namaBrand}
                </td>
                <td className="px-3 py-2 border border-gray-300">
                  {row.namaBarang}
                </td>
                <td className="px-3 py-2 border border-gray-300">{row.imei}</td>
                <td className="px-3 py-2 border border-gray-300">{row.qty}</td>
                <td className="px-3 py-2 border border-gray-300">
                  {rupiah(row.hargaSRP)}
                </td>
                <td className="px-3 py-2 border border-gray-300">
                  {rupiah(row.hargaGrosir)}
                </td>
                <td className="px-3 py-2 border border-gray-300">
                  {rupiah(row.hargaReseller)}
                </td>
                <td className="px-3 py-2 border border-gray-300">
                  {row.statusBayar}
                </td>
                <td className="px-3 py-2 border border-gray-300">
                  {row.paymentMetodeUser}
                </td>
                <td className="px-3 py-2 border border-gray-300">
                  Rp{" "}
                  {Number(row.paymentKreditNominal || 0).toLocaleString(
                    "id-ID"
                  )}
                </td>
                <td className="px-3 py-2 border border-gray-300">
                  Rp {Number(row.dashboardKredit || 0).toLocaleString("id-ID")}
                </td>
                <td className="px-3 py-2 border border-gray-300">
                  {row.tenor}
                </td>
                {/* 🔥 NAMA BANK */}
                <td className="px-3 py-2 border border-gray-300">
                  {row.namaBank || "-"}
                </td>
                <td className="px-3 py-2 border border-gray-300">
                  {row.namaMdr}
                </td>
                <td className="px-3 py-2 border border-gray-300">
                  {rupiah(row.nominalMdr)}
                </td>
                {/* 🔥 NOMINAL PAYMENT */}
                <td className="px-3 py-2 border border-gray-300 text-right font-medium">
                  {rupiah(row.nominalPaymentMetode || 0)}
                </td>
                <td className="px-3 py-2 border border-gray-300 text-right">
                  {rupiah(row.KURANG_BAYAR || 0)}
                </td>

                <td className="px-3 py-2 border border-gray-300 text-right">
                  {rupiah(row.SISA_KEMBALIAN || 0)}
                </td>

                <td className="px-3 py-2 border border-gray-300">
                  {rupiah(row.dpTalangan)}
                </td>

                <td className="px-3 py-2 border border-gray-300">
                  {row.keterangan}
                </td>

                <td className="px-3 py-2 border border-gray-300 text-right font-medium">
                  {rupiah(row.grandTotalDisplay ?? row.grandTotal)}
                </td>

                <td className="px-3 py-2 border border-gray-300">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      row.status === "VOID"
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {row.status === "REFUND" ? "Refund Berhasil" : row.status}
                  </span>
                </td>

                <td className="px-3 py-2 border border-gray-300">
                  <div className="flex gap-2 justify-center">
                    {/* PRINT - SEMUA ROLE */}
                    {row.status !== "REFUND" && (
                      <button
                        onClick={() => handlePrint(row)}
                        className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                      >
                        🖨 Print
                      </button>
                    )}

                    {/* EDIT */}
                    <button
                      onClick={() => handleEdit(row)}
                      className={`px-2 py-1 rounded text-xs ${
                        isSuperAdmin
                          ? "bg-yellow-500 text-white"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                      disabled={!isSuperAdmin}
                    >
                      ✏️ Edit
                    </button>

                    {/* REFUND */}

                    {isSuperAdmin && (
                      <button
                        onClick={() => handleRefund(row)}
                        disabled={refundLoading === row.id}
                        className={`px-2 py-1 rounded text-xs text-white ${
                          refundLoading === row.id
                            ? "bg-gray-400 cursor-not-allowed"
                            : "bg-orange-500 hover:bg-orange-600"
                        }`}
                      >
                        {refundLoading === row.id ? "Processing..." : "Refund"}
                      </button>
                    )}
                    {/* {isSuperAdmin && row.status !== "REFUND" && (
                      <button
                        onClick={() => handleRefund(row)}
                        className="btn-refund bg-orange-500 text-white px-2 py-1 rounded hover:bg-orange-600"
                      >
                        🔄 Refund
                      </button>
                    )} */}
                  </div>
                </td>
              </tr>
            ))}

            {!tableRows.length && (
              <tr>
                <td colSpan={21} className="text-center py-6 text-gray-500">
                  Belum ada data penjualan
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* TOTAL PENJUALAN */}
      <div className="flex justify-end mt-4">
        <div className="bg-green-50 border border-green-200 rounded-xl px-6 py-3 shadow-sm">
          <p className="text-sm text-gray-600">TOTAL PENJUALAN</p>
          <p className="text-xl font-bold text-green-700">
            {rupiah(totalPenjualanFiltered)}
          </p>
        </div>
      </div>

      {/* PAGINATION */}
      <div className="flex justify-between items-center mt-4">
        <button
          disabled={page === 1}
          onClick={() => setPage(page - 1)}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
        >
          Prev
        </button>

        <span>
          Page {page} / {pageCount || 1}
        </span>

        <button
          disabled={page === pageCount}
          onClick={() => setPage(page + 1)}
          className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
      {showEdit && editData && (
        <div className="fixed inset-0 bg-black/40 z-50 flex justify-center items-center">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl p-6 overflow-auto max-h-[90vh]">
            <h3 className="text-lg font-bold mb-4">✏️ Edit Transaksi</h3>

            <div className="grid grid-cols-3 gap-4">
              {/* HEADER */}
              <input
                type="date"
                value={editData.tanggal || ""}
                onChange={(e) =>
                  setEditData({ ...editData, tanggal: e.target.value })
                }
                className="border p-2"
                placeholder="Tanggal"
              />
              <input
                value={editData.invoice || ""}
                onChange={(e) =>
                  setEditData({ ...editData, invoice: e.target.value })
                }
                className="border p-2"
                placeholder="No Invoice"
              />
              <input
                value={editData.toko || ""}
                onChange={(e) =>
                  setEditData({ ...editData, toko: e.target.value })
                }
                className="border p-2"
                placeholder="Nama Toko"
              />

              {/* USER */}
              <input
                value={editData.user?.namaPelanggan || ""}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    user: { ...editData.user, namaPelanggan: e.target.value },
                  })
                }
                className="border p-2"
                placeholder="Nama Pelanggan"
              />
              <input
                value={editData.user?.noTlpPelanggan || ""}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    user: { ...editData.user, noTlpPelanggan: e.target.value },
                  })
                }
                className="border p-2"
                placeholder="No TLP"
              />
              <input
                value={editData.user?.storeHead || ""}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    user: { ...editData.user, storeHead: e.target.value },
                  })
                }
                className="border p-2"
                placeholder="Nama Store Head"
              />
              <input
                value={editData.user?.namaSales || ""}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    user: { ...editData.user, namaSales: e.target.value },
                  })
                }
                className="border p-2"
                placeholder="Nama Sales"
              />

              <salesHandle
                value={editData.user?.namaSales || ""}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    user: { ...editData.user, salesHandle: e.target.value },
                  })
                }
                className="border p-2"
                placeholder="Nama Sales"
              />

              {/* ITEM */}
              <input
                value={editData.items?.[0]?.kategoriBarang || ""}
                onChange={(e) => {
                  const items = [...editData.items];
                  items[0].kategoriBarang = e.target.value;
                  setEditData({ ...editData, items });
                }}
                className="border p-2"
                placeholder="Kategori"
              />
              <input
                value={editData.items?.[0]?.namaBrand || ""}
                onChange={(e) => {
                  const items = [...editData.items];
                  items[0].namaBrand = e.target.value;
                  setEditData({ ...editData, items });
                }}
                className="border p-2"
                placeholder="Brand"
              />
              <input
                value={editData.items?.[0]?.namaBarang || ""}
                onChange={(e) => {
                  const items = [...editData.items];
                  items[0].namaBarang = e.target.value;
                  setEditData({ ...editData, items });
                }}
                className="border p-2"
                placeholder="Nama Barang"
              />
              <input
                value={editData.items?.[0]?.imeiList?.join(",") || ""}
                onChange={(e) => {
                  const items = [...editData.items];
                  items[0].imeiList = e.target.value.split(",");
                  setEditData({ ...editData, items });
                }}
                className="border p-2"
                placeholder="IMEI"
              />
              <input
                type="number"
                value={editData.items?.[0]?.qty || 0}
                onChange={(e) => {
                  const items = [...editData.items];
                  items[0].qty = Number(e.target.value);
                  setEditData({ ...editData, items });
                }}
                className="border p-2"
                placeholder="QTY"
              />

              {/* HARGA */}
              <input
                type="number"
                value={editData.items?.[0]?.hargaSRP || 0}
                onChange={(e) => {
                  const items = [...editData.items];
                  items[0].hargaSRP = Number(e.target.value);
                  setEditData({ ...editData, items });
                }}
                className="border p-2"
                placeholder="Harga SRP"
              />

              <input
                type="number"
                value={editData.items?.[0]?.hargaGrosir || 0}
                onChange={(e) => {
                  const items = [...editData.items];
                  items[0].hargaGrosir = Number(e.target.value);
                  setEditData({ ...editData, items });
                }}
                className="border p-2"
                placeholder="Harga Grosir"
              />

              <input
                type="number"
                value={editData.items?.[0]?.hargaReseller || 0}
                onChange={(e) => {
                  const items = [...editData.items];
                  items[0].hargaReseller = Number(e.target.value);
                  setEditData({ ...editData, items });
                }}
                className="border p-2"
                placeholder="Harga Reseller"
              />

              {/* PAYMENT */}
              <input
                value={editData.payment?.status || ""}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    payment: { ...editData.payment, status: e.target.value },
                  })
                }
                className="border p-2"
                placeholder="Status Bayar"
              />
              <input
                value={editData.payment?.namaMdr || ""}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    payment: { ...editData.payment, namaMdr: e.target.value },
                  })
                }
                className="border p-2"
                placeholder="Nama MDR"
              />
              <input
                type="number"
                value={editData.payment?.nominalMdr || 0}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    payment: {
                      ...editData.payment,
                      nominalMdr: Number(e.target.value),
                    },
                  })
                }
                className="border p-2"
                placeholder="Nominal MDR"
              />
              <input
                value={editData.payment?.tenor || ""}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    payment: { ...editData.payment, tenor: e.target.value },
                  })
                }
                className="border p-2"
                placeholder="Tenor"
              />
              <input
                type="number"
                value={editData.payment?.cicilan || 0}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    payment: {
                      ...editData.payment,
                      cicilan: Number(e.target.value),
                    },
                  })
                }
                className="border p-2"
                placeholder="Nilai Cicilan"
              />
              <input
                type="number"
                value={editData.payment?.grandTotal || 0}
                onChange={(e) =>
                  setEditData({
                    ...editData,
                    payment: {
                      ...editData.payment,
                      grandTotal: Number(e.target.value),
                    },
                  })
                }
                className="border p-2"
                placeholder="Grand Total"
              />

              <input
                value={editData.statusPembayaran || ""}
                onChange={(e) =>
                  setEditData({ ...editData, statusPembayaran: e.target.value })
                }
                className="border p-2"
                placeholder="Status"
              />
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowEdit(false)}
                className="px-3 py-1 bg-gray-500 text-white rounded"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-3 py-1 bg-blue-600 text-white rounded"
              >
                💾 Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
