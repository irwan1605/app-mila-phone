// src/pages/MasterPenjualan.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  listenAllTransaksi,
  updatePenjualan,
  deletePenjualan,
} from "../services/FirebaseService";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import {
  FaSearch,
  FaEdit,
  FaTrash,
  FaFileExcel,
  FaFilePdf,
  FaChevronLeft,
  FaChevronRight,
  FaUndo,
  FaBan,
} from "react-icons/fa";

// =========================
// KONSTAN
// =========================

// Mapping MDR per payment method (kalau mau dipakai lagi)
const MDR_MAP = {
  "CASH TUNAI": 0,
  COD: 0,
  "TRANSFER KE MMT": 0,
  "QRIS BARCODE": 0,
  "DEBIT MESIN EDC": 0,
  "KARTU KREDIT MESIN EDC": 0,
  "BLIBLI INSTORE": 5,
  "AKULAKU BARCODE": 0,
  "AKULAKU MARKETPLACE": 5,
  "BLIBLI MARKET PLACE": 5,
  "TOKOPEDIA MARKETPLACE": 5,
  "LAZADA MARKETPLACE": 5,
  "TIKTOK MAERKETPLACE": 6,
  "SHOPEE MARKETPLACE": 6,
  "SHOPEE EDC": 0,
  "SHOPEE BARCODE": 0,
  "AEON ENINE": 0,
  "HOME CREDIT POLO": 0,
  "HOME CREDIT MARKETPLACE": 5,
  "KREDIVO BARCODE NON PROMO": 0,
  "KREDIVO BARCODE VOUCER PROMO": 5,
  "KREDIVO MARKETPLACE": 5,
  "ADIRA HIROTO": 0,
  SPEKTRA: 0,
  "TUKAR TAMBAH": 0,
  AVANTO: 0,
  "SAMSUNG FINANCE": 0,
};

const TIPE_BAYAR_OPTIONS = ["CASH", "PIUTANG", "DEBIT CARD"];

const KATEGORI_HARGA_OPTIONS = ["SRP", "GROSIR", "RESELLER/CORPORATE"];

const MP_PROTEK_NOMINAL_OPTIONS = [
  150000,
  200000,
  300000,
  400000,
  500000,
  600000,
  900000,
];

const fmt = (v) =>
  Number(v || 0).toLocaleString("id-ID", {
    minimumFractionDigits: 0,
  });

// Status otomatis dari tipe bayar
const getStatusFromTipeBayar = (tipe) => {
  if (!tipe) return "";
  const t = String(tipe).toUpperCase();
  if (t === "CASH" || t === "DEBIT CARD") return "LUNAS";
  if (t === "PIUTANG") return "BELUM LUNAS";
  return "";
};

export default function MasterPenjualan() {
  // =========================
  // STATE
  // =========================
  const [listPenjualan, setListPenjualan] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  const [showModalEdit, setShowModalEdit] = useState(false);
  const [editForm, setEditForm] = useState(null);

  const [voidReason, setVoidReason] = useState("");
  const [returnReason, setReturnReason] = useState("");

  const [selectedVoidRow, setSelectedVoidRow] = useState(null);
  const [selectedReturnRow, setSelectedReturnRow] = useState(null);

  const tableRef = React.useRef(null);

  // =========================
  // LISTENER FIREBASE REALTIME
  // =========================
  useEffect(() => {
    setLoading(true);
    const unsub = listenAllTransaksi((itemsRaw = []) => {
      const items = Array.isArray(itemsRaw) ? itemsRaw : [];

      // HANYA PENJUALAN → eksklusif (PEMBELIAN tidak boleh masuk)
      const onlySales = items
        .filter(
          (r) =>
            (r.PAYMENT_METODE || "").toUpperCase() === "PENJUALAN" ||
            // fallback: kalau field PAYMENT_METODE kosong, tapi ada PAYMENT_METHOD,
            // tetap dianggap penjualan, KECUALI kalau PAYMENT_METODE === "PEMBELIAN"
            ((r.PAYMENT_METODE || "").trim() === "" &&
              (r.HARGA_UNIT || r.HARGA_JUAL) &&
              (r.QTY || 0) > 0)
        )
        .map((r) => ({
          ...r,
          QTY: Number(r.QTY || 0),
          HARGA_JUAL: Number(r.HARGA_JUAL || r.HARGA_UNIT || 0),
          TOTAL_ITEM:
            Number(r.TOTAL_ITEM) ||
            Number(r.TOTAL) ||
            Number(r.QTY || 0) *
              Number(r.HARGA_JUAL || r.HARGA_UNIT || 0),
        }));

      setListPenjualan(onlySales);
      setLoading(false);
    });

    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  // =========================
  // FILTER + SEARCH
  // =========================
  const filteredList = useMemo(() => {
    const q = (search || "").toLowerCase();

    return (listPenjualan || []).filter((row) => {
      const tanggal = String(row.TANGGAL_TRANSAKSI || "").toLowerCase();
      const faktur = String(row.NO_INVOICE || "").toLowerCase();
      const toko = String(row.NAMA_TOKO || "").toLowerCase();
      const brand = String(row.NAMA_BRAND || "").toLowerCase();
      const barang = String(row.NAMA_BARANG || "").toLowerCase();
      const imei = String(row.IMEI || "").toLowerCase();
      const pembayaran = String(row.PAYMENT_METHOD || "").toLowerCase();
      const kategoriBayar = String(row.KATEGORI_BAYAR || "").toLowerCase();
      const kategoriHarga = String(row.KATEGORI_HARGA || "").toLowerCase();
      const mpProtec = String(row.MP_PROTEK || "").toLowerCase();
      const status = String(row.STATUS || "").toLowerCase();

      if (!q) return true;

      return (
        tanggal.includes(q) ||
        faktur.includes(q) ||
        toko.includes(q) ||
        brand.includes(q) ||
        barang.includes(q) ||
        imei.includes(q) ||
        pembayaran.includes(q) ||
        kategoriBayar.includes(q) ||
        kategoriHarga.includes(q) ||
        mpProtec.includes(q) ||
        status.includes(q)
      );
    });
  }, [listPenjualan, search]);

  // =========================
  // PAGINATION
  // =========================
  const totalPages = Math.ceil(filteredList.length / rowsPerPage) || 1;

  const paginatedList = useMemo(() => {
    const start = (page - 1) * rowsPerPage;
    return filteredList.slice(start, start + rowsPerPage);
  }, [filteredList, page]);

  useEffect(() => {
    // kalau filter berubah dan page di luar range, reset ke 1
    if (page > totalPages) {
      setPage(1);
    }
  }, [totalPages, page]);

  // =========================
  // EDIT
  // =========================
  const handleOpenEdit = (row) => {
    if (!row) return;

    setEditForm({
      id: row.id,
      tanggal: (row.TANGGAL_TRANSAKSI || "").slice(0, 10),
      noFaktur: row.NO_INVOICE || "",
      namaToko: row.NAMA_TOKO || "",
      kategoriBarang: row.KATEGORI_BARANG || row.KATEGORI_BRAND || "",
      namaBrand: row.NAMA_BRAND || "",
      namaBarang: row.NAMA_BARANG || "",
      imei: row.IMEI || "",
      warna: row.WARNA || "",
      qty: row.QTY || 1,
      hargaPenjualan: row.HARGA_JUAL || row.HARGA_UNIT || row.TOTAL || "",
      idPelanggan: row.ID_PELANGGAN || "",
      namaSH: row.NAMA_SH || "",
      namaSales: row.NAMA_SALES || "",
      staff: row.STAFF || "",
      tipeBayar: row.TIPE_BAYAR || row.KATEGORI_BAYAR || "",
      paymentMethod: row.PAYMENT_METHOD || row.PAYMENT_METODE || "",
      kategoriHarga: row.KATEGORI_HARGA || "",
      mpProtek: row.MP_PROTEK || "",
      tenor: row.TENOR || "",
      status: row.STATUS || "",
      keterangan: row.KETERANGAN || "",
      voidStatus: row.VOID_STATUS || "",
      voidReason: row.VOID_REASON || "",
      returnReason: row.RETURN_REASON || "",
    });

    setShowModalEdit(true);
  };

  const handleChangeEdit = (field, value) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleChangeTipeBayarEdit = (value) => {
    const statusAuto = getStatusFromTipeBayar(value);
    setEditForm((prev) => ({
      ...prev,
      tipeBayar: value,
      status: statusAuto || prev.status,
    }));
  };

  const handleSubmitEdit = async () => {
    try {
      if (!editForm || !editForm.id) {
        alert("Data penjualan tidak valid.");
        return;
      }

      const harga = Number(editForm.hargaPenjualan || 0);
      const qty = Number(editForm.qty || 0);

      if (!editForm.tanggal) {
        alert("Tanggal wajib diisi.");
        return;
      }

      if (!editForm.namaToko) {
        alert("Nama Toko wajib diisi.");
        return;
      }

      if (!editForm.namaBrand) {
        alert("Nama Brand wajib diisi.");
        return;
      }

      if (!editForm.namaBarang) {
        alert("Nama Barang wajib diisi.");
        return;
      }

      if (!qty || qty <= 0) {
        alert("QTY harus lebih dari 0.");
        return;
      }

      if (!harga || harga <= 0) {
        alert("Harga Penjualan harus lebih dari 0.");
        return;
      }

      const finalStatus =
        editForm.status || getStatusFromTipeBayar(editForm.tipeBayar);

      const mdr =
        MDR_MAP[editForm.paymentMethod] !== undefined
          ? MDR_MAP[editForm.paymentMethod]
          : Number(editForm.mdr || 0);

      const payload = {
        TANGGAL_TRANSAKSI: editForm.tanggal,
        NO_INVOICE: editForm.noFaktur || "",
        NAMA_TOKO: editForm.namaToko,
        KATEGORI_BARANG: editForm.kategoriBarang || "",
        NAMA_BRAND: editForm.namaBrand,
        NAMA_BARANG: editForm.namaBarang,
        IMEI: editForm.imei || "",
        WARNA: editForm.warna || "",
        QTY: qty,
        HARGA_JUAL: harga,
        HARGA_UNIT: harga,
        TOTAL: harga * qty,
        ID_PELANGGAN: editForm.idPelanggan || "",
        NAMA_SH: editForm.namaSH || "",
        NAMA_SALES: editForm.namaSales || "",
        STAFF: editForm.staff || "",
        TIPE_BAYAR: editForm.tipeBayar || "",
        KATEGORI_BAYAR: editForm.tipeBayar || "",
        PAYMENT_METHOD: editForm.paymentMethod || "",
        MDR: mdr,
        KATEGORI_HARGA: editForm.kategoriHarga || "",
        MP_PROTEK: editForm.mpProtek || "",
        TENOR: editForm.tenor || "",
        PAYMENT_METODE: "PENJUALAN",
        STATUS: finalStatus || "",
        KETERANGAN: editForm.keterangan || "",
        VOID_STATUS: editForm.voidStatus || "",
        VOID_REASON: editForm.voidReason || "",
        RETURN_REASON: editForm.returnReason || "",
      };

      await updatePenjualan(editForm.id, payload);
      alert("Data penjualan berhasil diupdate.");
      setShowModalEdit(false);
    } catch (err) {
      console.error("handleSubmitEdit error:", err);
      alert("Gagal mengupdate data penjualan.");
    }
  };

  // ===================== DELETE =====================
  const handleDelete = async (row) => {
    if (!window.confirm(`Hapus data penjualan ini?\n${row.NAMA_BARANG}`)) return;
    try {
      if (row.id) {
        await deletePenjualan(row.id);
      }
      alert("Data penjualan berhasil dihapus.");
    } catch (err) {
      console.error("handleDelete error:", err);
      alert("Gagal menghapus data penjualan.");
    }
  };

  // ===================== VOID =====================
  const openVoidDialog = (row) => {
    setSelectedVoidRow(row);
    setVoidReason("");
  };

  const handleSubmitVoid = async () => {
    if (!selectedVoidRow) return;
    if (!voidReason.trim()) {
      alert("Alasan VOID wajib diisi.");
      return;
    }
    try {
      const payload = {
        ...selectedVoidRow,
        STATUS: "VOID_PENDING",
        VOID_STATUS: "PENDING_SUPERVISOR",
        VOID_REASON: voidReason,
      };
      await updatePenjualan(selectedVoidRow.id, payload);
      alert("Permohonan VOID dikirim (menunggu approval supervisor).");
      setSelectedVoidRow(null);
      setVoidReason("");
    } catch (err) {
      console.error("handleSubmitVoid error:", err);
      alert("Gagal mengirim permohonan VOID.");
    }
  };

  // ===================== RETURN =====================
  const openReturnDialog = (row) => {
    setSelectedReturnRow(row);
    setReturnReason("");
  };

  const handleSubmitReturn = async () => {
    if (!selectedReturnRow) return;
    if (!returnReason.trim()) {
      alert("Alasan RETURN wajib diisi.");
      return;
    }
    try {
      const payload = {
        ...selectedReturnRow,
        STATUS: "RETURN",
        RETURN_REASON: returnReason,
      };
      await updatePenjualan(selectedReturnRow.id, payload);
      alert("Transaksi ditandai sebagai RETURN.");
      setSelectedReturnRow(null);
      setReturnReason("");
    } catch (err) {
      console.error("handleSubmitReturn error:", err);
      alert("Gagal menyimpan RETURN.");
    }
  };

  // ===================== EXPORT EXCEL =====================
  const handleExportExcel = () => {
    const sheetData = filteredList.map((x) => ({
      Tanggal: (x.TANGGAL_TRANSAKSI || "").slice(0, 10),
      No_Faktur: x.NO_INVOICE,
      Nama_Toko: x.NAMA_TOKO,
      Kategori_Barang: x.KATEGORI_BARANG || x.KATEGORI_BRAND || "",
      Nama_Brand: x.NAMA_BRAND,
      Nama_Barang: x.NAMA_BARANG,
      IMEI: x.IMEI,
      Warna: x.WARNA,
      QTY: x.QTY,
      Harga_Penjualan: x.HARGA_JUAL || x.HARGA_UNIT || x.TOTAL || 0,
      Total_Penjualan:
        (x.HARGA_JUAL || x.HARGA_UNIT || x.TOTAL || 0) * (x.QTY || 1),
      Tipe_Bayar: x.TIPE_BAYAR || x.KATEGORI_BAYAR || "",
      Payment_Method: x.PAYMENT_METHOD || "",
      MDR: x.MDR || 0,
      Kategori_Harga: x.KATEGORI_HARGA || "",
      MP_PROTEK: x.MP_PROTEK || "",
      Tenor: x.TENOR || "",
      STATUS: x.STATUS || "",
      VOID_STATUS: x.VOID_STATUS || "",
      VOID_REASON: x.VOID_REASON || "",
      RETURN_REASON: x.RETURN_REASON || "",
    }));

    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MasterPenjualan");

    XLSX.writeFile(
      wb,
      `MasterPenjualan_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  // ===================== EXPORT PDF (TABEL) =====================
  const handleExportPDF = async () => {
    const el = tableRef.current;
    if (!el) {
      alert("Tabel tidak ditemukan.");
      return;
    }

    const canvas = await html2canvas(el, { scale: 1.2 });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("l", "mm", "a4");
    const w = pdf.internal.pageSize.getWidth();
    const h = (canvas.height * w) / canvas.width;

    pdf.addImage(img, "PNG", 0, 0, w, h);
    pdf.save(`MasterPenjualan_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // ===================== RENDER =====================
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">MASTER PENJUALAN</h2>

      {/* TOOLBAR */}
      <div className="flex flex-wrap items-center gap-3 mb-2">
        <div className="flex items-center border px-3 py-2 rounded w-full sm:w-80">
          <FaSearch />
          <input
            className="ml-2 flex-1 outline-none text-sm"
            placeholder="Cari Tanggal / Toko / Barang / IMEI / Status..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <button
          onClick={handleExportExcel}
          className="flex items-center bg-green-600 text-white px-3 py-2 rounded text-sm"
        >
          <FaFileExcel className="mr-2" /> Excel
        </button>

        <button
          onClick={handleExportPDF}
          className="flex items-center bg-red-600 text-white px-3 py-2 rounded text-sm"
        >
          <FaFilePdf className="mr-2" /> PDF
        </button>

        {loading && (
          <span className="text-xs text-gray-500">Memuat data penjualan...</span>
        )}
      </div>

      {/* TABEL */}
      <div
        ref={tableRef}
        className="bg-white rounded shadow overflow-x-auto max-w-full"
      >
        <table className="w-full text-xs sm:text-sm border-collapse">
          <thead className="bg-gray-200">
            <tr>
              <th className="border p-2">No</th>
              <th className="border p-2">Tanggal</th>
              <th className="border p-2">Toko</th>
              <th className="border p-2">No Faktur</th>
              <th className="border p-2">Brand</th>
              <th className="border p-2">Barang</th>
              <th className="border p-2">IMEI / No Mesin</th>
              <th className="border p-2">Qty</th>
              <th className="border p-2">Harga Jual</th>
              <th className="border p-2">Total</th>
              <th className="border p-2">Tipe Bayar</th>
              <th className="border p-2">Payment Method</th>
              <th className="border p-2">Kategori Harga</th>
              <th className="border p-2">MP Protek</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">Void / Return</th>
              <th className="border p-2 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paginatedList.length === 0 ? (
              <tr>
                <td
                  colSpan={17}
                  className="text-center text-gray-500 p-3 text-sm"
                >
                  Tidak ada data penjualan.
                </td>
              </tr>
            ) : (
              paginatedList.map((row, idx) => {
                const index = (page - 1) * rowsPerPage + idx + 1;
                const harga = Number(
                  row.HARGA_JUAL || row.HARGA_UNIT || row.TOTAL || 0
                );
                const qty = Number(row.QTY || 1);
                const total = harga * qty;

                return (
                  <tr key={row.id || `${row.NO_INVOICE}-${idx}`} className="hover:bg-gray-50">
                    <td className="border p-2 text-center">{index}</td>
                    <td className="border p-2">
                      {(row.TANGGAL_TRANSAKSI || "").slice(0, 10)}
                    </td>
                    <td className="border p-2 whitespace-nowrap">
                      {row.NAMA_TOKO || "-"}
                    </td>
                    <td className="border p-2">{row.NO_INVOICE || "-"}</td>
                    <td className="border p-2">{row.NAMA_BRAND || "-"}</td>
                    <td className="border p-2">{row.NAMA_BARANG || "-"}</td>
                    <td className="border p-2 whitespace-nowrap">
                      {row.IMEI || "-"}
                    </td>
                    <td className="border p-2 text-center">{qty}</td>
                    <td className="border p-2 text-right">
                      Rp {fmt(harga)}
                    </td>
                    <td className="border p-2 text-right">
                      Rp {fmt(total)}
                    </td>
                    <td className="border p-2">
                      {row.TIPE_BAYAR || row.KATEGORI_BAYAR || "-"}
                    </td>
                    <td className="border p-2">
                      {row.PAYMENT_METHOD || "-"}
                    </td>
                    <td className="border p-2">
                      {row.KATEGORI_HARGA || "-"}
                    </td>
                    <td className="border p-2">
                      {row.MP_PROTEK ? `Rp ${fmt(row.MP_PROTEK)}` : "-"}
                    </td>
                    <td className="border p-2">
                      {row.STATUS || "-"}
                      {row.VOID_STATUS
                        ? ` (${row.VOID_STATUS})`
                        : ""}
                    </td>
                    <td className="border p-2 text-xs">
                      {row.STATUS &&
                      String(row.STATUS).toUpperCase().startsWith("VOID") ? (
                        <span className="text-red-600 font-semibold">
                          VOID
                        </span>
                      ) : row.STATUS === "RETURN" ? (
                        <span className="text-orange-600 font-semibold">
                          RETURN
                        </span>
                      ) : (
                        <div className="flex flex-col gap-1">
                          <button
                            className="flex items-center gap-1 text-red-600 hover:underline"
                            onClick={() => openVoidDialog(row)}
                          >
                            <FaBan /> Void
                          </button>
                          <button
                            className="flex items-center gap-1 text-yellow-600 hover:underline"
                            onClick={() => openReturnDialog(row)}
                          >
                            <FaUndo /> Return
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="border p-2 text-center">
                      <div className="flex flex-wrap gap-2 justify-center">
                        <button
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit"
                          onClick={() => handleOpenEdit(row)}
                        >
                          <FaEdit />
                        </button>
                        <button
                          className="text-red-600 hover:text-red-800"
                          title="Hapus"
                          onClick={() => handleDelete(row)}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="flex justify-between items-center mt-3 text-xs sm:text-sm">
        <div>
          Halaman {page} dari {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className={`flex items-center gap-1 px-2 py-1 rounded border ${
              page <= 1
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-white hover:bg-gray-100"
            }`}
          >
            <FaChevronLeft /> Prev
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className={`flex items-center gap-1 px-2 py-1 rounded border ${
              page >= totalPages
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-white hover:bg-gray-100"
            }`}
          >
            Next <FaChevronRight />
          </button>
        </div>
      </div>

      {/* MODAL EDIT PENJUALAN */}
      {showModalEdit && editForm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-start py-10 z-50 overflow-auto">
          <div className="bg-white w-full max-w-3xl rounded shadow p-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-lg">Edit Penjualan</h3>
              <button
                onClick={() => setShowModalEdit(false)}
                className="text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-1 text-xs sm:text-sm">
              {/* HEADER */}
              <div>
                <label className="text-[11px]">Tanggal</label>
                <input
                  type="date"
                  className="border p-2 rounded w-full"
                  value={editForm.tanggal}
                  onChange={(e) =>
                    handleChangeEdit("tanggal", e.target.value)
                  }
                />
              </div>
              <div>
                <label className="text-[11px]">No Faktur</label>
                <input
                  className="border p-2 rounded w-full"
                  value={editForm.noFaktur}
                  onChange={(e) =>
                    handleChangeEdit("noFaktur", e.target.value)
                  }
                />
              </div>
              <div>
                <label className="text-[11px]">Nama Toko</label>
                <input
                  className="border p-2 rounded w-full"
                  value={editForm.namaToko}
                  onChange={(e) =>
                    handleChangeEdit("namaToko", e.target.value)
                  }
                />
              </div>
              <div>
                <label className="text-[11px]">ID Pelanggan</label>
                <input
                  className="border p-2 rounded w-full"
                  value={editForm.idPelanggan}
                  onChange={(e) =>
                    handleChangeEdit("idPelanggan", e.target.value)
                  }
                />
              </div>
              <div>
                <label className="text-[11px]">Nama SH</label>
                <input
                  className="border p-2 rounded w-full"
                  value={editForm.namaSH}
                  onChange={(e) =>
                    handleChangeEdit("namaSH", e.target.value)
                  }
                />
              </div>
              <div>
                <label className="text-[11px]">Nama Sales</label>
                <input
                  className="border p-2 rounded w-full"
                  value={editForm.namaSales}
                  onChange={(e) =>
                    handleChangeEdit("namaSales", e.target.value)
                  }
                />
              </div>
              <div>
                <label className="text-[11px]">Staff</label>
                <input
                  className="border p-2 rounded w-full"
                  value={editForm.staff}
                  onChange={(e) =>
                    handleChangeEdit("staff", e.target.value)
                  }
                />
              </div>

              {/* BARANG */}
              <div>
                <label className="text-[11px]">Kategori Barang</label>
                <input
                  className="border p-2 rounded w-full"
                  value={editForm.kategoriBarang}
                  onChange={(e) =>
                    handleChangeEdit("kategoriBarang", e.target.value)
                  }
                />
              </div>
              <div>
                <label className="text-[11px]">Nama Brand</label>
                <input
                  className="border p-2 rounded w-full"
                  value={editForm.namaBrand}
                  onChange={(e) =>
                    handleChangeEdit("namaBrand", e.target.value)
                  }
                />
              </div>
              <div>
                <label className="text-[11px]">Nama Barang</label>
                <input
                  className="border p-2 rounded w-full"
                  value={editForm.namaBarang}
                  onChange={(e) =>
                    handleChangeEdit("namaBarang", e.target.value)
                  }
                />
              </div>
              <div>
                <label className="text-[11px]">IMEI / No Mesin</label>
                <input
                  className="border p-2 rounded w-full font-mono"
                  value={editForm.imei}
                  onChange={(e) =>
                    handleChangeEdit("imei", e.target.value)
                  }
                />
              </div>
              <div>
                <label className="text-[11px]">Warna</label>
                <input
                  className="border p-2 rounded w-full"
                  value={editForm.warna}
                  onChange={(e) =>
                    handleChangeEdit("warna", e.target.value)
                  }
                />
              </div>
              <div>
                <label className="text-[11px]">QTY</label>
                <input
                  type="number"
                  className="border p-2 rounded w-full"
                  value={editForm.qty}
                  onChange={(e) =>
                    handleChangeEdit("qty", e.target.value)
                  }
                />
              </div>
              <div>
                <label className="text-[11px]">Harga Penjualan</label>
                <input
                  type="number"
                  className="border p-2 rounded w-full"
                  value={editForm.hargaPenjualan}
                  onChange={(e) =>
                    handleChangeEdit("hargaPenjualan", e.target.value)
                  }
                />
              </div>

              {/* PEMBAYARAN */}
              <div>
                <label className="text-[11px]">Tipe Bayar</label>
                <select
                  className="border p-2 rounded w-full"
                  value={editForm.tipeBayar}
                  onChange={(e) =>
                    handleChangeTipeBayarEdit(e.target.value)
                  }
                >
                  <option value="">- Pilih -</option>
                  {TIPE_BAYAR_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px]">Payment Method</label>
                <select
                  className="border p-2 rounded w-full"
                  value={editForm.paymentMethod}
                  onChange={(e) =>
                    handleChangeEdit("paymentMethod", e.target.value)
                  }
                >
                  <option value="">- Pilih -</option>
                  {Object.keys(MDR_MAP).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px]">Kategori Harga (MP Protek Level)</label>
                <select
                  className="border p-2 rounded w-full"
                  value={editForm.kategoriHarga}
                  onChange={(e) =>
                    handleChangeEdit("kategoriHarga", e.target.value)
                  }
                >
                  <option value="">- Pilih -</option>
                  {KATEGORI_HARGA_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px]">MP Protek (Nominal)</label>
                <select
                  className="border p-2 rounded w-full"
                  value={editForm.mpProtek}
                  onChange={(e) =>
                    handleChangeEdit("mpProtek", e.target.value)
                  }
                >
                  <option value="">- Pilih -</option>
                  {MP_PROTEK_NOMINAL_OPTIONS.map((v) => (
                    <option key={v} value={v}>
                      Rp {fmt(v)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[11px]">Tenor</label>
                <input
                  className="border p-2 rounded w-full"
                  value={editForm.tenor}
                  onChange={(e) =>
                    handleChangeEdit("tenor", e.target.value)
                  }
                />
              </div>

              <div>
                <label className="text-[11px]">Status</label>
                <input
                  className="border p-2 rounded w-full"
                  value={editForm.status}
                  onChange={(e) =>
                    handleChangeEdit("status", e.target.value)
                  }
                />
              </div>

              <div className="col-span-2">
                <label className="text-[11px]">Keterangan</label>
                <textarea
                  rows={3}
                  className="border p-2 rounded w-full"
                  value={editForm.keterangan}
                  onChange={(e) =>
                    handleChangeEdit("keterangan", e.target.value)
                  }
                />
              </div>

              {/* INFO VOID & RETURN */}
              <div className="col-span-2 grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px]">Void Status</label>
                  <input
                    className="border p-2 rounded w-full"
                    value={editForm.voidStatus}
                    onChange={(e) =>
                      handleChangeEdit("voidStatus", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="text-[11px]">Void Reason</label>
                  <input
                    className="border p-2 rounded w-full"
                    value={editForm.voidReason}
                    onChange={(e) =>
                      handleChangeEdit("voidReason", e.target.value)
                    }
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[11px]">Return Reason</label>
                  <input
                    className="border p-2 rounded w-full"
                    value={editForm.returnReason}
                    onChange={(e) =>
                      handleChangeEdit("returnReason", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowModalEdit(false)}
                className="px-3 py-2 bg-gray-500 text-white rounded text-sm"
              >
                Batal
              </button>
              <button
                onClick={handleSubmitEdit}
                className="px-3 py-2 bg-blue-600 text-white rounded text-sm"
              >
                Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG VOID */}
      {selectedVoidRow && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white rounded shadow p-4 w-full max-w-md">
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
              <FaBan className="text-red-600" /> Permohonan VOID
            </h3>
            <p className="text-xs mb-2">
              Barang: <b>{selectedVoidRow.NAMA_BARANG}</b> | IMEI:{" "}
              <b>{selectedVoidRow.IMEI || "-"}</b>
            </p>
            <label cla
            ssName="text-[11px]">Alasan Void</label>
            <textarea
              rows={3}
              className="border p-2 rounded w-full text-sm"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => {
                  setSelectedVoidRow(null);
                  setVoidReason("");
                }}
                className="px-3 py-1 bg-gray-400 text-white rounded text-xs"
              >
                Batal
              </button>
              <button
                onClick={handleSubmitVoid}
                className="px-3 py-1 bg-red-600 text-white rounded text-xs"
              >
                Kirim Permohonan VOID
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG RETURN */}
      {selectedReturnRow && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white rounded shadow p-4 w-full max-w-md">
            <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
              <FaUndo className="text-yellow-600" /> RETURN Barang
            </h3>
            <p className="text-xs mb-2">
              Barang: <b>{selectedReturnRow.NAMA_BARANG}</b> | IMEI:{" "}
              <b>{selectedReturnRow.IMEI || "-"}</b>
            </p>
            <label className="text-[11px]">Alasan Return</label>
            <textarea
              rows={3}
              className="border p-2 rounded w-full text-sm"
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
            />
            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => {
                  setSelectedReturnRow(null);
                  setReturnReason("");
                }}
                className="px-3 py-1 bg-gray-400 text-white rounded text-xs"
              >
                Batal
              </button>
              <button
                onClick={handleSubmitReturn}
                className="px-3 py-1 bg-yellow-600 text-white rounded text-xs"
              >
                Simpan Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
