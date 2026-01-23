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

// 🔥 HARUS DI PALING ATAS FILE
function getBundlingByKategori(kategori) {
  const k = String(kategori || "").toUpperCase();

  if (k === "MOTOR LISTRIK") {
    return [
      { namaBarang: "Charger", qty: 1 },
      { namaBarang: "Toolkit", qty: 1 },
      { namaBarang: "Buku Manual", qty: 1 },
    ];
  }

  if (k === "SEPEDA LISTRIK") {
    return [
      { namaBarang: "Charger", qty: 1 },
      { namaBarang: "Kunci", qty: 2 },
    ];
  }

  return [];
}


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
        result.push({
          id: trx.id,
          tanggal: trx.tanggal || trx.createdAt,
          invoice: trx.invoice,
          toko: trx.toko || "-",

          pelanggan: trx.user?.namaPelanggan || "-",
          telp: trx.user?.noTlpPelanggan || "-",
          sales: trx.user?.namaSales || "-",

          kategoriBarang: item.kategoriBarang || "-",
          namaBrand: item.namaBrand || "-",
          namaBarang: item.namaBarang || "-",

          bundling: (() => {
            // 1️⃣ prioritas: data transaksi (kalau suatu hari sudah ada)
            let bundlingRaw =
              item.bundlingItems ||
              item.bundling ||
              trx.BUNDLING_ITEMS;
          
            // 2️⃣ fallback: generate dari kategori
            if (!Array.isArray(bundlingRaw) || bundlingRaw.length === 0) {
              bundlingRaw = getBundlingByKategori(item.kategoriBarang);
            }
          
            return Array.isArray(bundlingRaw) && bundlingRaw.length
              ? bundlingRaw
                  .map(
                    (b, i) =>
                      `${i + 1}. ${b.namaBarang} (${b.qty || 1})`
                  )
                  .join(" | ")
              : "-";
          })(),
          

          imei: Array.isArray(item.imeiList) ? item.imeiList.join(", ") : "-",

          qty: Number(item.qty || 0),

          // 🔥 HARGA SESUAI SKEMA PILIHAN
          hargaSRP:
            item.skemaHarga === "srp" ? Number(item.hargaAktif || 0) : 0,

          hargaGrosir:
            item.skemaHarga === "grosir" ? Number(item.hargaAktif || 0) : 0,

          hargaReseller:
            item.skemaHarga === "reseller" ? Number(item.hargaAktif || 0) : 0,

          statusBayar: trx.payment?.status || "-",
          namaMdr: trx.payment?.namaMdr || "-",
          nominalMdr: trx.payment?.nominalMdr || 0,
          tenor: trx.payment?.tenor || "-",
          cicilan: trx.payment?.cicilan || 0,
          grandTotal: trx.payment?.grandTotal || 0,

          status: trx.statusPembayaran || "OK",
        });
        console.log("🔥 BUNDLING RAW:", {
          itemBundlingItems: item.bundlingItems,
          itemBundling: item.bundling,
          trxBundling: trx.BUNDLING_ITEMS,
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
      ${r.kategoriBarang}
      ${r.namaBrand}
      ${r.namaBarang}
      ${r.imei}
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

  const handlePrint = (row) => {
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
    if (!window.confirm("Yakin ingin RETUR barang ini?")) return;

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

      /* ================= DATA BARANG (FINAL FIX) ================= */
      const brand = row.namaBrand || "-";
      const barang = row.namaBarang || "-";

      // kalau multiple IMEI → ambil satu2
      const imei = row.imei && row.imei !== "-" ? row.imei.split(",")[0] : "";

      const qty = Number(row.qty || 1);

      /* ================= PAYLOAD ================= */
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
      };

      console.log("🔥 PAYLOAD REFUND FINAL:", payload);

      await addTransaksi(tokoIdFix, payload);

      alert("✅ Refund berhasil, stok kembali");
    } catch (e) {
      console.error(e);
      alert("❌ Refund gagal: " + e.message);
    }
  };

  /* ================= EXPORT EXCEL ================= */
  const exportExcel = () => {
    const data = tableRows.map((r, i) => ({
      No: i + 1,
      Tanggal: new Date(r.tanggal).toLocaleDateString("id-ID"),
      Invoice: r.invoice,
      Toko: r.toko,
      Pelanggan: r.pelanggan,
      Telp: r.telp,
      Sales: r.sales,
      Kategori: r.kategoriBarang,
      Brand: r.namaBrand,
      Barang: r.namaBarang,
      Bundling: r.bundling,
      IMEI: r.imei,
      QTY: r.qty,
      StatusBayar: r.statusBayar,
      MDR: r.namaMdr,
      NominalMDR: r.nominalMdr,
      Tenor: r.tenor,
      Cicilan: r.cicilan,
      GrandTotal: r.grandTotal,
      Status: r.status,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
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
      <div className="overflow-x-auto">
        <table className="min-w-[2400px] text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th>No</th>
              <th>Tanggal</th>
              <th>No Invoice</th>
              <th>Nama Toko</th>
              <th>Nama Pelanggan</th>
              <th>No TLP</th>
              <th>Nama Sales</th>

              <th>Kategori</th>
              <th>Brand</th>
              <th>Nama Barang</th>
              <th>Barang Bundling</th>
              <th>No IMEI</th>
              <th>QTY</th>

              <th>Harga SRP</th>
              <th>Harga Grosir</th>
              <th>Harga Reseller</th>

              <th>Status Bayar</th>
              <th>Nama MDR</th>
              <th>Nominal MDR</th>
              <th>Tenor</th>
              <th>Nilai Cicilan</th>
              <th>Grand Total</th>

              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>

          <tbody>
            {pagedData.map((row, i) => (
              <tr
                key={`${row.invoice}-${i}`}
                className="border-t hover:bg-gray-50"
              >
                <td>{(page - 1) * pageSize + i + 1}</td>
                <td>
                  {row.tanggal
                    ? new Date(row.tanggal).toLocaleDateString("id-ID")
                    : "-"}
                </td>
                <td className="font-semibold">{row.invoice}</td>
                <td>{row.toko}</td>
                <td>{row.pelanggan}</td>
                <td>{row.telp}</td>
                <td>{row.sales}</td>

                <td>{row.kategoriBarang}</td>
                <td>{row.namaBrand}</td>
                <td>{row.namaBarang}</td>
                <td className="text-xs">{row.bundling}</td>
                <td className="max-w-[200px] break-all">{row.imei}</td>
                <td className="text-center">{row.qty}</td>
                <td className="text-right">{rupiah(row.hargaSRP)}</td>
                <td className="text-right">{rupiah(row.hargaGrosir)}</td>
                <td className="text-right">{rupiah(row.hargaReseller)}</td>
                <td className="text-center">{row.statusBayar}</td>
                <td>{row.namaMdr}</td>
                <td className="text-right">{rupiah(row.nominalMdr)}</td>
                <td className="text-center">{row.tenor}</td>
                <td className="text-right">{rupiah(row.cicilan)}</td>
                <td className="text-right font-bold">
                  {rupiah(row.grandTotal)}
                </td>

                <td className="text-center">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      row.status === "VOID"
                        ? "bg-red-100 text-red-700"
                        : "bg-green-100 text-green-700"
                    }`}
                  >
                    {row.status === "VOID" ? "Refund Berhasil" : row.status}
                  </span>
                </td>

                <td className="text-center">
                  <div className="flex gap-2 justify-center">
                    {/* PRINT - SEMUA ROLE */}
                    <button
                      onClick={() => handlePrint(row)}
                      className="px-2 py-1 bg-blue-600 text-white rounded text-xs"
                    >
                      🖨 Print
                    </button>

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
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl p-6">
            <h3 className="text-lg font-bold mb-4">✏️ Edit Transaksi</h3>

            <div className="space-y-3">
              <div>
                <label className="text-sm">Nama Pelanggan</label>
                <input
                  value={editData.user?.namaPelanggan || ""}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      user: {
                        ...editData.user,
                        namaPelanggan: e.target.value,
                      },
                    })
                  }
                  className="w-full border rounded px-3 py-1"
                />
              </div>

              <div>
                <label className="text-sm">No Telepon</label>
                <input
                  value={editData.user?.noTlpPelanggan || ""}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      user: {
                        ...editData.user,
                        noTlpPelanggan: e.target.value,
                      },
                    })
                  }
                  className="w-full border rounded px-3 py-1"
                />
              </div>

              <div>
                <label className="text-sm">Nama Sales</label>
                <input
                  value={editData.user?.namaSales || ""}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      user: {
                        ...editData.user,
                        namaSales: e.target.value,
                      },
                    })
                  }
                  className="w-full border rounded px-3 py-1"
                />
              </div>
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
