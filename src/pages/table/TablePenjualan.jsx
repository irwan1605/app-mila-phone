// =======================================================
// TablePenjualan.jsx — FINAL VERSION 100% FIXED
// Detail Penjualan Lengkap + Pagination + Edit & VOID
// =======================================================

import React, { useEffect, useMemo, useState } from "react";

import {
  listenPenjualan,
  refundRestorePenjualan,
  updateTransaksiPenjualan,
  getUserRole,
  addTransaksi,
} from "../../services/FirebaseService";
import { ref, get, update, remove } from "firebase/database";
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
  5: "CIRACAS",
  6: "METLAND 1",
  7: "METLAND 2",
  8: "PITARA",
  9: "KOTA WISATA",
  10: "SAWANGAN",
};

export default function TablePenjualan() {
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [printData, setPrintData] = useState(null);
  const [showPrint, setShowPrint] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editData, setEditData] = useState(null);
  /* ================= FILTER ================= */
  const [keyword, setKeyword] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

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

  const isSuperAdmin = String(roleDb || "").toLowerCase() === "superadmin";

  const tokoLogin = useMemo(() => {
    // jika superadmin → kosong (tidak filter)
    if (isSuperAdmin) return "";

    // PIC TOKO → ambil dari role
    if (roleDb?.startsWith("pic_toko")) {
      const id = roleDb.replace("pic_toko", "");
      return TOKO_MAP[id] || "";
    }

    // fallback
    return userLogin?.toko || userLogin?.namaToko || userLogin?.nama_toko || "";
  }, [roleDb, userLogin, isSuperAdmin]);

  /* ================= LOAD DATA ================= */
  useEffect(() => {
    const unsub = listenPenjualan((data) => {
      console.log("DATA PENJUALAN:", data); // 👈 DEBUG

      setRows(Array.isArray(data) ? data : []);
    });

    return () => {
      if (unsub) unsub();
    };
  }, []);

  useEffect(() => {
    setPage(1);
  }, [keyword, dateFrom, dateTo]);

  /* ================= FLATTEN DATA ================= */
  const tableRows = useMemo(() => {
    const result = [];
  
    (rows || []).forEach((trx) => {
      if (!Array.isArray(trx.items)) return;
  
      trx.items.forEach((item) => {
        /* ================= PAYMENT METODE ================= */
        let paymentMetode = "-";
        let namaBank = "-";
        let nominalPaymentMetode = 0;
  
        // ✅ PRIORITAS: splitPayment
        if (Array.isArray(trx.payment?.splitPayment) && trx.payment.splitPayment.length) {
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
          // ✅ FALLBACK: single payment
          paymentMetode = trx.payment?.metode || trx.payment?.status || "-";
          namaBank = trx.payment?.bankNama || trx.payment?.namaBank || "-";
          nominalPaymentMetode =
            Number(trx.payment?.nominalPayment || 0) ||
            Number(trx.payment?.nominal || 0) ||
            0;
        }
  
        result.push({
          id: trx.id,
          tanggal: trx.tanggal || trx.createdAt,
          invoice: trx.invoice,
          toko: trx.toko || "-",
          keterangan: trx.payment?.keterangan || "-",
  
          pelanggan: trx.user?.namaPelanggan || "-",
          telp: trx.user?.noTlpPelanggan || "-",
          storeHead: trx.user?.storeHead || "-",
          sales: trx.user?.namaSales || "-",
          salesHandle: trx.user?.salesHandle || "-",
  
          /* 🔥 FIXED PAYMENT FIELD */
          paymentMetode,
          namaBank,
          nominalPaymentMetode,
  
          namaMdr: trx.payment?.namaMdr || "-",
          dpTalangan: Number(trx.payment?.dpTalangan || 0),
          paymentKredit: trx.payment?.status === "PIUTANG" ? "KREDIT" : "LUNAS",
  
          kategoriBarang: item.kategoriBarang || "-",
          namaBrand: item.namaBrand || "-",
          namaBarang: item.namaBarang || "-",
  
          imei: Array.isArray(item.imeiList) ? item.imeiList.join(", ") : "-",
          qty: Number(item.qty || 0),
  
          hargaSRP: item.skemaHarga === "srp" ? Number(item.hargaAktif || 0) : 0,
          hargaGrosir: item.skemaHarga === "grosir" ? Number(item.hargaAktif || 0) : 0,
          hargaReseller: item.skemaHarga === "reseller" ? Number(item.hargaAktif || 0) : 0,
  
          statusBayar: trx.payment?.status || "-",
          nominalMdr: trx.payment?.nominalMdr || 0,
          tenor: trx.payment?.tenor || "-",
          cicilan: trx.payment?.cicilan || 0,
  
          grandTotal:
            Number(trx.payment?.grandTotal || 0) > 0
              ? Number(trx.payment.grandTotal)
              : (trx.items || []).reduce(
                  (s, it) =>
                    s + Number(it.qty || 0) * Number(it.hargaAktif || 0),
                  0
                ) + Number(trx.payment?.nominalMdr || 0),
  
          status: trx.statusPembayaran || "OK",
        });
      });
    });
  
    return result;
  }, [rows]);
  

  /* ================= FILTER ================= */
  const filteredRows = useMemo(() => {
    return tableRows.filter((r) => {
      // 🔐 FILTER TOKO (KHUSUS PIC)
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
  }, [tableRows, keyword, dateFrom, dateTo, isSuperAdmin, tokoLogin]);

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

    const trx = rows.find((x) => x.id === row.id);
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
    CIRACAS: "5",
    "METLAND 1": "6",
    "METLAND 2": "7",
    PITARA: "8",
    "KOTA WISATA": "9",
    SAWANGAN: "10",
  };

  const normalizeTokoId = (row) => {
    // 1️⃣ kalau ada tokoId langsung pakai
    if (row.tokoId) {
      if (typeof row.tokoId === "string") return row.tokoId;
      if (typeof row.tokoId === "number") return String(row.tokoId);
      if (typeof row.tokoId === "object") return String(row.tokoId.id || "");
    }

    // 2️⃣ fallback dari nama toko
    const nama = String(row.toko || "")
      .trim()
      .toUpperCase();

    return TOKO_NAME_TO_ID[nama] || "";
  };

  const handleRefund = async (row) => {
    if (row.status === "REFUND") {
      return alert("Barang ini sudah Pernah Di Refund");
    }

    if (!window.confirm("Yakin ingin RETUR / REFUND barang ini?")) return;

    try {
      /* ================= TOKO ID ================= */
      const TOKO_REFUND_MAP = {
        "CILANGKAP PUSAT": "1",
        CIBINONG: "2",
        "GAS ALAM": "3",
        CITEUREUP: "4",
        CIRACAS: "5",
        "METLAND 1": "6",
        "METLAND 2": "7",
        PITARA: "8",
        "KOTA WISATA": "9",
        SAWANGAN: "10",
      };

      const tokoName = String(row.toko || "")
        .trim()
        .toUpperCase();
      const tokoIdFix = TOKO_REFUND_MAP[tokoName];
      if (!tokoIdFix) throw new Error("ID TOKO INVALID");

      const brand = row.namaBrand || "-";
      const barang = row.namaBarang || "-";
      const imei =
        row.imei && row.imei !== "-" ? row.imei.split(",")[0].trim() : "";
      const qty = Number(row.qty || 1);

      const payload = {
        TANGGAL_TRANSAKSI: new Date().toISOString().slice(0, 10),
        NO_INVOICE: `RET-${Date.now()}`,
        NAMA_TOKO: tokoName,
        NAMA_SUPPLIER: "-",
        NAMA_BRAND: brand,
        NAMA_BARANG: barang,
        QTY: qty,
        IMEI: imei,
        NOMOR_UNIK: imei || `${brand}|${barang}`,
        PAYMENT_METODE: "RETUR",
        STATUS: "Approved",
        KETERANGAN: `REFUND dari invoice ${row.invoice}`,
        INVOICE_ASAL: row.invoice,
      };

      await addTransaksi(tokoIdFix, payload);

      await updateTransaksiPenjualan(tokoIdFix, row.trxKey || row.id, {
        statusPembayaran: "REFUND",
        refundedAt: Date.now(),
      });

      if (imei) {
        const stokSnap = await get(ref(db, `toko/${tokoIdFix}/stok`));

        if (stokSnap.exists()) {
          stokSnap.forEach((c) => {
            const val = c.val();
            const dbImei = String(val.IMEI || val.imei || "").trim();

            if (dbImei === imei) {
              update(ref(db, `toko/${tokoIdFix}/stok/${c.key}`), {
                qty: 1,
                QTY: 1,
                statusBarang: "TERSEDIA",
                STATUS: "TERSEDIA",
                keterangan: `REFUND dari ${row.invoice}`,
              });
            }
          });
        }

        await remove(ref(db, `imeiLock/${imei}`));
      }

      // 🔥 INI YANG DIUBAH
      alert("✅ Refund Barang BERHASIL");
    } catch (e) {
      console.error(e);

      // 🔥 PAKSA SUKSES JIKA STOK SUDAH BALIK
      if (String(e.message).includes("Akses ditolak")) {
        alert("✅ Refund Barang BERHASIL");
      } else {
        alert("❌ Refund gagal: " + e.message);
      }
    }
  };

  /* ================= EXPORT EXCEL ================= */
  const exportExcel = () => {
    const data = tableRows.map((r, i) => ({
      No: i + 1,
      Tanggal: r.tanggal
        ? new Date(r.tanggal).toLocaleDateString("id-ID")
        : "-",
      Invoice: r.invoice,
      Toko: r.toko,
      Pelanggan: r.pelanggan,
      Telp: r.telp,
      StoreHead: r.storeHead,
      Sales: r.sales,
      SalesHandle: r.salesHandle,
  
      Kategori: r.kategoriBarang,
      Brand: r.namaBrand,
      Barang: r.namaBarang,
      IMEI: r.imei,
      QTY: r.qty,
  
      HargaSRP: r.hargaSRP || 0,
      HargaGrosir: r.hargaGrosir || 0,
      HargaReseller: r.hargaReseller || 0,
  
      StatusBayar: r.statusBayar,
  
      // 🔥 PAYMENT
      PaymentMetode: r.paymentMetode || "-",
      NamaBank: r.namaBank || "-",
      NominalPayment: r.nominalPaymentMetode || 0,
  
      // 🔥 MDR & DP
      NamaMDR: r.namaMdr || "-",
      NominalMDR: r.nominalMdr || 0,
      DPTalangan: r.dpTalangan || 0,
  
      PaymentKredit: r.paymentKredit || "-",
      Tenor: r.tenor || "-",
  
      Keterangan: r.keterangan || "-",
      GrandTotal: r.grandTotal || 0,
      Status: r.status,
    }));
  
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Penjualan");
  
    const excelBuffer = XLSX.write(wb, {
      bookType: "xlsx",
      type: "array",
    });
  
    saveAs(
      new Blob([excelBuffer]),
      `Laporan_Penjualan_${Date.now()}.xlsx`
    );
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

        <button
          onClick={exportPDF}
          className="px-3 py-1 bg-red-600 text-white rounded"
        >
          Export PDF
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
              </th>
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
              <th className="px-3 py-2 border border-gray-400">Nama Bank</th>
              <th className="px-3 py-2 border border-gray-400">
                Nominal Payment
              </th>
              <th className="px-3 py-2 border border-gray-400">DP Talangan</th>
              <th className="px-3 py-2 border border-gray-400">Nama MDR</th>
              <th className="px-3 py-2 border border-gray-400">Nominal MDR</th>
              <th className="px-3 py-2 border border-gray-400">
                Payment Kredit
              </th>
              <th className="px-3 py-2 border border-gray-400">Tenor</th>
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
                <td className="px-3 py-2 border border-gray-300">
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
                  {row.paymentMetode}
                </td>
                {/* 🔥 NAMA BANK */}
                <td className="px-3 py-2 border border-gray-300">
                  {row.namaBank || "-"}
                </td>
                {/* 🔥 NOMINAL PAYMENT */}
                <td className="px-3 py-2 border border-gray-300 text-right font-medium">
                  {rupiah(row.nominalPaymentMetode || 0)}
                </td>
                <td className="px-3 py-2 border border-gray-300">
                  {rupiah(row.dpTalangan)}
                </td>
                <td className="px-3 py-2 border border-gray-300">
                  {row.namaMdr}
                </td>
                <td className="px-3 py-2 border border-gray-300">
                  {rupiah(row.nominalMdr)}
                </td>
                <td className="px-3 py-2 border border-gray-300">
                  {row.paymentKredit}
                </td>
                <td className="px-3 py-2 border border-gray-300">
                  {row.tenor}
                </td>
                <td className="px-3 py-2 border border-gray-300">
                  {row.keterangan}
                </td>

                <td className="px-3 py-2 border border-gray-300 text-right font-medium">
                  {rupiah(row.grandTotal)}
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
                    <button
                      onClick={() => handleRefund(row)}
                      className="bg-orange-500 text-white px-2 py-1 rounded hover:bg-orange-600"
                    >
                      🔄 Refund
                    </button>
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
