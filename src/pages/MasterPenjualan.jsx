// src/pages/MasterPenjualan.jsx
// Master Penjualan PRO – multi QTY, IMEI, Total Penjualan, Status otomatis, Preview & Cetak Invoice

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  listenPenjualan,
  addPenjualan,
  updatePenjualan,
  deletePenjualan,
} from "../services/FirebaseService";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import {
  FaEdit,
  FaTrash,
  FaSave,
  FaSearch,
  FaFileExcel,
  FaFilePdf,
  FaPlus,
  FaTimes,
  FaEye,
  FaPrint,
} from "react-icons/fa";

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

const KATEGORI_OPTIONS = [
  "SEPEDA LISTRIK",
  "MOTOR LISTRIK",
  "HANDPHONE",
  "ACCESORIES",
];

const CATEGORY_BRAND_OPTIONS = {
  "SEPEDA LISTRIK": ["Uwinfly", "Selis", "Viar", "Volta", "NIU"],
  "MOTOR LISTRIK": ["Viar", "Volta", "NIU"],
  HANDPHONE: ["SAMSUNG", "OPPO", "IPHONE", "REALME", "XIAOMI", "INFINIX", "VIVO"],
  ACCESORIES: ["Universal", "FDR", "Swallow", "Lainnya"],
};

const TIPE_BAYAR_OPTIONS = ["CASH", "PIUTANG", "DEBIT CARD"];

const PAYMENT_METHOD_OPTIONS = [
  "AKULAKU",
  "KREDIVO",
  "BRITAMA",
  "BCA",
  "BLI BLI",
  "ONLINE SHOPE",
  "HOME CREDIT INDONESIA (HCI)",
  "SPEKTRA",
];

const fmt = (n) => {
  try {
    return Number(n || 0).toLocaleString("id-ID");
  } catch {
    return String(n || "");
  }
};

// Mapping status otomatis dari tipe bayar
const getStatusFromTipeBayar = (tipe) => {
  const t = (tipe || "").toUpperCase();
  if (t === "CASH" || t === "DEBIT CARD") return "LUNAS";
  if (t === "PIUTANG") return "PIUTANG";
  return "";
};

export default function MasterPenjualan() {
  const [penjualanList, setPenjualanList] = useState([]);
  const [search, setSearch] = useState("");
  const [filterTanggal, setFilterTanggal] = useState("");
  const [filterKategori, setFilterKategori] = useState("");
  const [filterToko, setFilterToko] = useState("");

  const [showModalTambah, setShowModalTambah] = useState(false);
  const [showModalEdit, setShowModalEdit] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const [tambahForm, setTambahForm] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    noFaktur: "",
    namaToko: "PUSAT",
    kategoriBarang: "",
    namaBrand: "",
    namaBarang: "",
    imei: "",
    warna: "",
    qty: 1,
    hargaPenjualan: "",
    idPelanggan: "",
    namaSH: "",
    namaSales: "",
    staff: "",
    tipeBayar: "",
    paymentMethod: "",
    status: "",
    keterangan: "",
  });

  const [editForm, setEditForm] = useState(null);

  const tableRef = useRef(null);

  // ===================== LISTENER =====================
  useEffect(() => {
    const unsub = listenPenjualan((list) => {
      setPenjualanList(Array.isArray(list) ? list : []);
    });
    return () => unsub && unsub();
  }, []);

  // ===================== FILTER & SEARCH =====================
  const filteredList = useMemo(() => {
    let list = [...penjualanList];

    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((x) => {
        return (
          (x.NAMA_TOKO || "").toLowerCase().includes(q) ||
          (x.NAMA_BRAND || "").toLowerCase().includes(q) ||
          (x.NAMA_BARANG || "").toLowerCase().includes(q) ||
          (x.NO_INVOICE || "").toLowerCase().includes(q) ||
          (x.IMEI || "").toLowerCase().includes(q) ||
          (x.WARNA || "").toLowerCase().includes(q) ||
          (x.ID_PELANGGAN || "").toLowerCase().includes(q) ||
          (x.NAMA_SH || "").toLowerCase().includes(q) ||
          (x.NAMA_SALES || "").toLowerCase().includes(q) ||
          (x.STAFF || "").toLowerCase().includes(q) ||
          (x.STATUS || "").toLowerCase().includes(q) ||
          (x.KETERANGAN || "").toLowerCase().includes(q)
        );
      });
    }

    if (filterTanggal) {
      list = list.filter(
        (x) =>
          (x.TANGGAL_TRANSAKSI || "").slice(0, 10) === filterTanggal.slice(0, 10)
      );
    }

    if (filterKategori) {
      list = list.filter(
        (x) => (x.KATEGORI_BARANG || x.KATEGORI_BRAND || "") === filterKategori
      );
    }

    if (filterToko) {
      list = list.filter(
        (x) => (x.NAMA_TOKO || "").toUpperCase() === filterToko.toUpperCase()
      );
    }

    // sort terbaru di atas
    list.sort((a, b) => {
      const ta = new Date(a.TANGGAL_TRANSAKSI || 0).getTime();
      const tb = new Date(b.TANGGAL_TRANSAKSI || 0).getTime();
      return tb - ta;
    });

    return list;
  }, [penjualanList, search, filterTanggal, filterKategori, filterToko]);

  // ===================== TOTAL PENJUALAN (FORM) =====================
  const totalTambah = useMemo(() => {
    const qty = Number(tambahForm.qty || 0);
    const harga = Number(tambahForm.hargaPenjualan || 0);
    if (!qty || !harga) return 0;
    return qty * harga;
  }, [tambahForm.qty, tambahForm.hargaPenjualan]);

  const totalEdit = useMemo(() => {
    if (!editForm) return 0;
    const qty = Number(editForm.qty || 0);
    const harga = Number(editForm.hargaPenjualan || 0);
    if (!qty || !harga) return 0;
    return qty * harga;
  }, [editForm?.qty, editForm?.hargaPenjualan]);

  // ===================== ADD PENJUALAN =====================
  const openTambahModal = () => {
    setTambahForm({
      tanggal: new Date().toISOString().slice(0, 10),
      noFaktur: "",
      namaToko: "PUSAT",
      kategoriBarang: "",
      namaBrand: "",
      namaBarang: "",
      imei: "",
      warna: "",
      qty: 1,
      hargaPenjualan: "",
      idPelanggan: "",
      namaSH: "",
      namaSales: "",
      staff: "",
      tipeBayar: "",
      paymentMethod: "",
      status: "",
      keterangan: "",
    });
    setShowModalTambah(true);
  };

  // handle change tipe bayar → update status otomatis
  const handleChangeTipeBayarTambah = (value) => {
    const statusAuto = getStatusFromTipeBayar(value);
    setTambahForm((p) => ({
      ...p,
      tipeBayar: value,
      status: statusAuto,
    }));
  };

  const handleSubmitTambah = async () => {
    try {
      const qty = Number(tambahForm.qty || 0);
      const harga = Number(tambahForm.hargaPenjualan || 0);

      if (!tambahForm.tanggal) {
        alert("Tanggal wajib diisi.");
        return;
      }

      if (!tambahForm.namaToko) {
        alert("Nama Toko wajib diisi.");
        return;
      }

      if (!tambahForm.kategoriBarang) {
        alert("Kategori Barang wajib dipilih.");
        return;
      }

      if (!tambahForm.namaBrand) {
        alert("Nama Brand wajib dipilih.");
        return;
      }

      if (!tambahForm.namaBarang) {
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

      // Status otomatis fallback jika belum terisi
      const finalStatus =
        tambahForm.status || getStatusFromTipeBayar(tambahForm.tipeBayar);

      // ====== IMEI MULTI-SUPPORT (tanpa ubah UI) ======
      // Bisa isi banyak IMEI dipisah enter / koma / titik koma.
      // Jika hanya 1 IMEI & QTY > 1 => IMEI yang sama dipakai semua.
      let imeiList = String(tambahForm.imei || "")
        .split(/[\n,;]+/)
        .map((x) => x.trim())
        .filter((x) => x !== "");

      if (imeiList.length === 0) {
        // Tidak isi IMEI => semua transaksi tanpa IMEI
        imeiList = Array(qty).fill("");
      } else if (imeiList.length === 1 && qty > 1) {
        // Satu IMEI tapi Qty banyak => salin IMEI yang sama
        imeiList = Array(qty).fill(imeiList[0]);
      } else if (imeiList.length !== qty) {
        alert(
          `Jumlah IMEI (${imeiList.length}) harus sama dengan QTY (${qty}).\n` +
            `Masukkan IMEI dipisah ENTER / koma / titik koma.`
        );
        return;
      }

      // Cek IMEI duplikat (hanya kalau diisi)
      const nonEmptyImei = imeiList.filter((v) => v !== "");
      const dupCheck = new Set(nonEmptyImei);
      if (nonEmptyImei.length > 0 && dupCheck.size !== nonEmptyImei.length) {
        alert("Nomor IMEI tidak boleh sama (duplikat).");
        return;
      }

      const invoiceNumber = tambahForm.noFaktur || `FJ-${Date.now()}`;

      // Buat 1 baris per unit qty
      for (let i = 0; i < qty; i++) {
        const payload = {
          TANGGAL_TRANSAKSI: tambahForm.tanggal,
          NO_INVOICE: invoiceNumber,
          NAMA_TOKO: tambahForm.namaToko,
          KATEGORI_BARANG: tambahForm.kategoriBarang,
          NAMA_BRAND: tambahForm.namaBrand,
          NAMA_BARANG: tambahForm.namaBarang,
          IMEI: imeiList[i] || "",
          WARNA: tambahForm.warna || "",
          QTY: 1,
          HARGA_JUAL: harga,
          TOTAL: harga, // per unit
          ID_PELANGGAN: tambahForm.idPelanggan || "",
          NAMA_SH: tambahForm.namaSH || "",
          NAMA_SALES: tambahForm.namaSales || "",
          STAFF: tambahForm.staff || "",
          TIPE_BAYAR: tambahForm.tipeBayar || "",
          PAYMENT_METHOD: tambahForm.paymentMethod || "",
          STATUS: finalStatus || "",
          KETERANGAN: tambahForm.keterangan || "",
        };

        await addPenjualan(payload);
      }

      alert("Data penjualan berhasil ditambahkan.");
      setShowModalTambah(false);
    } catch (err) {
      console.error("handleSubmitTambah error:", err);
      alert("Gagal menambah data penjualan.");
    }
  };

  // ===================== EDIT PENJUALAN =====================
  const openEditModal = (row) => {
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
      hargaPenjualan: row.HARGA_JUAL || row.TOTAL || "",
      idPelanggan: row.ID_PELANGGAN || "",
      namaSH: row.NAMA_SH || "",
      namaSales: row.NAMA_SALES || "",
      staff: row.STAFF || "",
      tipeBayar: row.TIPE_BAYAR || "",
      paymentMethod: row.PAYMENT_METHOD || row.PAYMENT_METODE || "",
      status: row.STATUS || "",
      keterangan: row.KETERANGAN || "",
    });
    setShowModalEdit(true);
  };

  const handleChangeTipeBayarEdit = (value) => {
    const statusAuto = getStatusFromTipeBayar(value);
    setEditForm((p) => ({
      ...p,
      tipeBayar: value,
      status: statusAuto,
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

      if (!editForm.kategoriBarang) {
        alert("Kategori Barang wajib dipilih.");
        return;
      }

      if (!editForm.namaBrand) {
        alert("Nama Brand wajib dipilih.");
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

      const payload = {
        TANGGAL_TRANSAKSI: editForm.tanggal,
        NO_INVOICE: editForm.noFaktur || "",
        NAMA_TOKO: editForm.namaToko,
        KATEGORI_BARANG: editForm.kategoriBarang,
        NAMA_BRAND: editForm.namaBrand,
        NAMA_BARANG: editForm.namaBarang,
        IMEI: editForm.imei || "",
        WARNA: editForm.warna || "",
        QTY: qty,
        HARGA_JUAL: harga,
        TOTAL: harga * qty,
        ID_PELANGGAN: editForm.idPelanggan || "",
        NAMA_SH: editForm.namaSH || "",
        NAMA_SALES: editForm.namaSales || "",
        STAFF: editForm.staff || "",
        TIPE_BAYAR: editForm.tipeBayar || "",
        PAYMENT_METHOD: editForm.paymentMethod || "",
        STATUS: finalStatus || "",
        KETERANGAN: editForm.keterangan || "",
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

  // ===================== EXPORT =====================
  const handleExportExcel = () => {
    const sheetData = filteredList.map((x) => ({
      Tanggal: (x.TANGGAL_TRANSAKSI || "").slice(0, 10),
      No_Faktur: x.NO_INVOICE,
      Nama_Toko: x.NAMA_TOKO,
      Kategori_Barang: x.KATEGORI_BARANG || x.KATEGORI_BRAND,
      Nama_Brand: x.NAMA_BRAND,
      Nama_Barang: x.NAMA_BARANG,
      IMEI: x.IMEI,
      Warna: x.WARNA,
      QTY: x.QTY,
      Harga_Penjualan: x.HARGA_JUAL || x.TOTAL,
      Total_Penjualan: (x.HARGA_JUAL || x.TOTAL || 0) * (x.QTY || 1),
      ID_Pelanggan: x.ID_PELANGGAN,
      Nama_SH: x.NAMA_SH,
      Nama_SALES: x.NAMA_SALES,
      STAFF: x.STAFF,
      Tipe_Bayar: x.TIPE_BAYAR,
      Payment_Method: x.PAYMENT_METHOD || x.PAYMENT_METODE,
      Status: x.STATUS,
      Keterangan: x.KETERANGAN,
    }));

    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MASTER_PENJUALAN");
    XLSX.writeFile(
      wb,
      `MASTER_PENJUALAN_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const handleExportPDF = async () => {
    try {
      const el = tableRef.current;
      if (!el) {
        alert("Tabel tidak ditemukan.");
        return;
      }

      const canvas = await html2canvas(el, { scale: 1.2 });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("l", "mm", "a4");
      const width = pdf.internal.pageSize.getWidth();
      const height = (canvas.height * width) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, width, height);
      pdf.save(
        `MASTER_PENJUALAN_${new Date().toISOString().slice(0, 10)}.pdf`
      );
    } catch (err) {
      console.error("handleExportPDF error:", err);
      alert("Gagal export PDF.");
    }
  };

  // ===================== PREVIEW & CETAK INVOICE (FORM TAMBAH) =====================
  const handlePreviewInvoice = () => {
    if (!tambahForm.namaBarang) {
      alert("Isi data penjualan dulu sebelum preview.");
      return;
    }
    setShowPreview(true);
  };

  const handlePrintInvoice = () => {
    const qty = Number(tambahForm.qty || 0);
    const harga = Number(tambahForm.hargaPenjualan || 0);
    const total = qty * harga;

    const doc = new jsPDF("p", "mm", "a4");
    let y = 15;

    doc.setFontSize(16);
    doc.text("INVOICE PENJUALAN", 14, y);
    y += 8;

    doc.setFontSize(11);
    doc.text(`Tanggal: ${tambahForm.tanggal || "-"}`, 14, y);
    y += 6;
    doc.text(`No Faktur: ${tambahForm.noFaktur || "-"}`, 14, y);
    y += 6;
    doc.text(`Nama Toko: ${tambahForm.namaToko || "-"}`, 14, y);
    y += 8;

    doc.text(`Kategori: ${tambahForm.kategoriBarang || "-"}`, 14, y);
    y += 6;
    doc.text(`Brand: ${tambahForm.namaBrand || "-"}`, 14, y);
    y += 6;
    doc.text(`Barang: ${tambahForm.namaBarang || "-"}`, 14, y);
    y += 6;
    doc.text(`Warna: ${tambahForm.warna || "-"}`, 14, y);
    y += 6;
    doc.text(`IMEI: ${tambahForm.imei || "-"}`, 14, y);
    y += 8;

    doc.text(`QTY: ${qty}`, 14, y);
    y += 6;
    doc.text(`Harga Jual: Rp ${fmt(harga)}`, 14, y);
    y += 6;
    doc.text(`Total Penjualan: Rp ${fmt(total)}`, 14, y);
    y += 8;

    doc.text(`Tipe Bayar: ${tambahForm.tipeBayar || "-"}`, 14, y);
    y += 6;
    doc.text(`Status: ${tambahForm.status || "-"}`, 14, y);
    y += 8;

    doc.text(`ID Pelanggan: ${tambahForm.idPelanggan || "-"}`, 14, y);
    y += 6;
    doc.text(`Nama SH: ${tambahForm.namaSH || "-"}`, 14, y);
    y += 6;
    doc.text(`Nama SALES: ${tambahForm.namaSales || "-"}`, 14, y);
    y += 6;
    doc.text(`Staff: ${tambahForm.staff || "-"}`, 14, y);
    y += 8;

    doc.text(`Keterangan: ${tambahForm.keterangan || "-"}`, 14, y);

    doc.save(
      `INVOICE_${tambahForm.noFaktur || `FJ-${new Date().getTime()}`}.pdf`
    );
  };

  // ===================== RENDER =====================
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">MASTER PENJUALAN</h2>

      {/* TOOLBAR */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <div className="flex items-center border rounded px-3 py-2 w-full sm:w-72">
          <FaSearch className="text-gray-500" />
          <input
            className="ml-2 flex-1 outline-none text-sm"
            placeholder="Cari toko / brand / barang / IMEI / pelanggan ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <input
          type="date"
          className="border rounded px-3 py-2 text-sm"
          value={filterTanggal}
          onChange={(e) => setFilterTanggal(e.target.value)}
        />

        <select
          className="border rounded px-3 py-2 text-sm"
          value={filterKategori}
          onChange={(e) => setFilterKategori(e.target.value)}
        >
          <option value="">Semua Kategori</option>
          {KATEGORI_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>

        <select
          className="border rounded px-3 py-2 text-sm"
          value={filterToko}
          onChange={(e) => setFilterToko(e.target.value)}
        >
          <option value="">Semua Toko</option>
          {fallbackTokoNames.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <button
          onClick={openTambahModal}
          className="px-3 py-2 bg-indigo-600 text-white rounded flex items-center text-sm"
        >
          <FaPlus className="mr-2" /> Tambah Penjualan
        </button>

        <button
          onClick={handleExportExcel}
          className="px-3 py-2 bg-green-600 text-white rounded flex items-center text-sm"
        >
          <FaFileExcel className="mr-2" /> Export Excel
        </button>

        <button
          onClick={handleExportPDF}
          className="px-3 py-2 bg-red-600 text-white rounded flex items-center text-sm"
        >
          <FaFilePdf className="mr-2" /> Export PDF
        </button>
      </div>

      {/* TABLE */}
      <div
        ref={tableRef}
        className="bg-white rounded shadow overflow-x-auto border"
      >
        <table className="w-full text-xs sm:text-sm border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">No</th>
              <th className="border p-2">Tanggal</th>
              <th className="border p-2">No Faktur</th>
              <th className="border p-2">Nama Toko</th>
              <th className="border p-2">Kategori Barang</th>
              <th className="border p-2">Nama Brand</th>
              <th className="border p-2">Nama Barang</th>
              <th className="border p-2">IMEI</th>
              <th className="border p-2">Warna</th>
              <th className="border p-2 text-center">QTY</th>
              <th className="border p-2 text-right">Harga Jual</th>
              <th className="border p-2 text-right">Total Penjualan</th>
              <th className="border p-2">ID Pelanggan</th>
              <th className="border p-2">Nama SH</th>
              <th className="border p-2">Nama SALES</th>
              <th className="border p-2">STAFF</th>
              <th className="border p-2">Tipe Bayar</th>
              <th className="border p-2">Payment Method</th>
              <th className="border p-2">Status</th>
              <th className="border p-2">Keterangan</th>
              <th className="border p-2 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredList.length === 0 ? (
              <tr>
                <td
                  colSpan={21}
                  className="border p-3 text-center text-gray-500"
                >
                  Tidak ada data penjualan.
                </td>
              </tr>
            ) : (
              filteredList.map((row, idx) => {
                const hargaJual = row.HARGA_JUAL || row.TOTAL || 0;
                const totalRow = hargaJual * (row.QTY || 1);

                return (
                  <tr key={row.id || idx} className="hover:bg-gray-50">
                    <td className="border p-2 text-center">{idx + 1}</td>
                    <td className="border p-2">
                      {(row.TANGGAL_TRANSAKSI || "").slice(0, 10)}
                    </td>
                    <td className="border p-2">{row.NO_INVOICE}</td>
                    <td className="border p-2">{row.NAMA_TOKO}</td>
                    <td className="border p-2">
                      {row.KATEGORI_BARANG || row.KATEGORI_BRAND}
                    </td>
                    <td className="border p-2">{row.NAMA_BRAND}</td>
                    <td className="border p-2">{row.NAMA_BARANG}</td>
                    <td className="border p-2">{row.IMEI}</td>
                    <td className="border p-2">{row.WARNA}</td>
                    <td className="border p-2 text-center">{row.QTY}</td>
                    <td className="border p-2 text-right">
                      Rp {fmt(hargaJual)}
                    </td>
                    <td className="border p-2 text-right">
                      Rp {fmt(totalRow)}
                    </td>
                    <td className="border p-2">{row.ID_PELANGGAN}</td>
                    <td className="border p-2">{row.NAMA_SH}</td>
                    <td className="border p-2">{row.NAMA_SALES}</td>
                    <td className="border p-2">{row.STAFF}</td>
                    <td className="border p-2">{row.TIPE_BAYAR}</td>
                    <td className="border p-2">
                      {row.PAYMENT_METHOD || row.PAYMENT_METODE}
                    </td>
                    <td className="border p-2">{row.STATUS}</td>
                    <td className="border p-2 whitespace-pre-wrap">
                      {row.KETERANGAN}
                    </td>
                    <td className="border p-2 text-center space-x-2">
                      <button
                        onClick={() => openEditModal(row)}
                        className="text-blue-600 inline-block mr-2"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(row)}
                        className="text-red-600 inline-block"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL TAMBAH */}
      {showModalTambah && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-start py-8 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded shadow p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold">Tambah Penjualan</h3>
              <button
                onClick={() => setShowModalTambah(false)}
                className="text-gray-600"
              >
                <FaTimes />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
              <div>
                <label className="text-xs">Tanggal</label>
                <input
                  type="date"
                  className="w-full border p-2 rounded"
                  value={tambahForm.tanggal}
                  onChange={(e) =>
                    setTambahForm((p) => ({ ...p, tanggal: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">No Faktur / Invoice</label>
                <input
                  className="w-full border p-2 rounded"
                  value={tambahForm.noFaktur}
                  onChange={(e) =>
                    setTambahForm((p) => ({ ...p, noFaktur: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">Nama Toko</label>
                <select
                  className="w-full border p-2 rounded"
                  value={tambahForm.namaToko}
                  onChange={(e) =>
                    setTambahForm((p) => ({ ...p, namaToko: e.target.value }))
                  }
                >
                  {fallbackTokoNames.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs">Kategori Barang</label>
                <select
                  className="w-full border p-2 rounded"
                  value={tambahForm.kategoriBarang}
                  onChange={(e) =>
                    setTambahForm((p) => ({
                      ...p,
                      kategoriBarang: e.target.value,
                      namaBrand: "",
                    }))
                  }
                >
                  <option value="">Pilih Kategori</option>
                  {KATEGORI_OPTIONS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs">Nama Brand</label>
                <select
                  className="w-full border p-2 rounded"
                  value={tambahForm.namaBrand}
                  onChange={(e) =>
                    setTambahForm((p) => ({ ...p, namaBrand: e.target.value }))
                  }
                  disabled={!tambahForm.kategoriBarang}
                >
                  <option value="">
                    {tambahForm.kategoriBarang
                      ? "Pilih Brand"
                      : "Pilih Kategori dulu"}
                  </option>
                  {tambahForm.kategoriBarang &&
                    (CATEGORY_BRAND_OPTIONS[tambahForm.kategoriBarang] || []
                    ).map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs">Nama Barang</label>
                <input
                  className="w-full border p-2 rounded"
                  value={tambahForm.namaBarang}
                  onChange={(e) =>
                    setTambahForm((p) => ({ ...p, namaBarang: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">IMEI</label>
                <input
                  className="w-full border p-2 rounded"
                  value={tambahForm.imei}
                  onChange={(e) =>
                    setTambahForm((p) => ({ ...p, imei: e.target.value }))
                  }
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Bisa isi banyak IMEI dipisah ENTER / koma / titik koma.
                </p>
              </div>

              <div>
                <label className="text-xs">Warna</label>
                <input
                  className="w-full border p-2 rounded"
                  value={tambahForm.warna}
                  onChange={(e) =>
                    setTambahForm((p) => ({ ...p, warna: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">QTY</label>
                <input
                  type="number"
                  min={1}
                  className="w-full border p-2 rounded"
                  value={tambahForm.qty}
                  onChange={(e) =>
                    setTambahForm((p) => ({ ...p, qty: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">Harga Penjualan</label>
                <input
                  type="number"
                  className="w-full border p-2 rounded"
                  value={tambahForm.hargaPenjualan}
                  onChange={(e) =>
                    setTambahForm((p) => ({
                      ...p,
                      hargaPenjualan: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">Total Penjualan</label>
                <input
                  className="w-full border p-2 rounded bg-gray-100"
                  value={`Rp ${fmt(totalTambah)}`}
                  readOnly
                />
              </div>

              <div>
                <label className="text-xs">ID Pelanggan</label>
                <input
                  className="w-full border p-2 rounded"
                  value={tambahForm.idPelanggan}
                  onChange={(e) =>
                    setTambahForm((p) => ({
                      ...p,
                      idPelanggan: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">Nama SH</label>
                <input
                  className="w-full border p-2 rounded"
                  value={tambahForm.namaSH}
                  onChange={(e) =>
                    setTambahForm((p) => ({ ...p, namaSH: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">Nama SALES</label>
                <input
                  className="w-full border p-2 rounded"
                  value={tambahForm.namaSales}
                  onChange={(e) =>
                    setTambahForm((p) => ({
                      ...p,
                      namaSales: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">STAFF</label>
                <input
                  className="w-full border p-2 rounded"
                  value={tambahForm.staff}
                  onChange={(e) =>
                    setTambahForm((p) => ({ ...p, staff: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">Tipe Bayar</label>
                <select
                  className="w-full border p-2 rounded"
                  value={tambahForm.tipeBayar}
                  onChange={(e) => handleChangeTipeBayarTambah(e.target.value)}
                >
                  <option value="">Pilih Tipe Bayar</option>
                  {TIPE_BAYAR_OPTIONS.map((tb) => (
                    <option key={tb} value={tb}>
                      {tb}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs">Payment Method</label>
                <select
                  className="w-full border p-2 rounded"
                  value={tambahForm.paymentMethod}
                  onChange={(e) =>
                    setTambahForm((p) => ({
                      ...p,
                      paymentMethod: e.target.value,
                    }))
                  }
                >
                  <option value="">Pilih Payment Method</option>
                  {PAYMENT_METHOD_OPTIONS.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs">Status</label>
                <select
                  className="w-full border p-2 rounded"
                  value={tambahForm.status}
                  onChange={(e) =>
                    setTambahForm((p) => ({ ...p, status: e.target.value }))
                  }
                >
                  <option value="">Pilih Status</option>
                  <option value="LUNAS">LUNAS</option>
                  <option value="PIUTANG">PIUTANG</option>
                </select>
                <p className="text-[10px] text-gray-500 mt-1">
                  Status akan otomatis mengikuti Tipe Bayar (CASH/DEBIT → LUNAS,
                  PIUTANG → PIUTANG), tapi masih bisa diubah manual jika
                  diperlukan.
                </p>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs">Keterangan</label>
                <textarea
                  rows={3}
                  className="w-full border p-2 rounded text-xs sm:text-sm"
                  value={tambahForm.keterangan}
                  onChange={(e) =>
                    setTambahForm((p) => ({
                      ...p,
                      keterangan: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-between items-center gap-2 mt-4">
              <div className="flex gap-2">
                <button
                  className="px-3 py-1 bg-gray-500 text-white rounded text-sm flex items-center"
                  onClick={handlePreviewInvoice}
                >
                  <FaEye className="mr-1" /> Preview
                </button>
                <button
                  className="px-3 py-1 bg-orange-600 text-white rounded text-sm flex items-center"
                  onClick={handlePrintInvoice}
                >
                  <FaPrint className="mr-1" /> Cetak Invoice
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  className="px-3 py-1 bg-gray-400 text-white rounded text-sm"
                  onClick={() => setShowModalTambah(false)}
                >
                  <FaTimes className="inline" /> Batal
                </button>
                <button
                  className="px-3 py-1 bg-indigo-600 text-white rounded text-sm flex items-center"
                  onClick={handleSubmitTambah}
                >
                  <FaSave className="mr-1" /> Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT */}
      {showModalEdit && editForm && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-start py-8 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded shadow p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold">Edit Penjualan</h3>
              <button
                onClick={() => setShowModalEdit(false)}
                className="text-gray-600"
              >
                <FaTimes />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
              <div>
                <label className="text-xs">Tanggal</label>
                <input
                  type="date"
                  className="w-full border p-2 rounded"
                  value={editForm.tanggal}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, tanggal: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">No Faktur / Invoice</label>
                <input
                  className="w-full border p-2 rounded"
                  value={editForm.noFaktur}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, noFaktur: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">Nama Toko</label>
                <select
                  className="w-full border p-2 rounded"
                  value={editForm.namaToko}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, namaToko: e.target.value }))
                  }
                >
                  {fallbackTokoNames.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs">Kategori Barang</label>
                <select
                  className="w-full border p-2 rounded"
                  value={editForm.kategoriBarang}
                  onChange={(e) =>
                    setEditForm((p) => ({
                      ...p,
                      kategoriBarang: e.target.value,
                      namaBrand: "",
                    }))
                  }
                >
                  <option value="">Pilih Kategori</option>
                  {KATEGORI_OPTIONS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs">Nama Brand</label>
                <select
                  className="w-full border p-2 rounded"
                  value={editForm.namaBrand}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, namaBrand: e.target.value }))
                  }
                  disabled={!editForm.kategoriBarang}
                >
                  <option value="">
                    {editForm.kategoriBarang
                      ? "Pilih Brand"
                      : "Pilih Kategori dulu"}
                  </option>
                  {editForm.kategoriBarang &&
                    (CATEGORY_BRAND_OPTIONS[editForm.kategoriBarang] || []
                    ).map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs">Nama Barang</label>
                <input
                  className="w-full border p-2 rounded"
                  value={editForm.namaBarang}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, namaBarang: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">IMEI</label>
                <input
                  className="w-full border p-2 rounded"
                  value={editForm.imei}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, imei: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">Warna</label>
                <input
                  className="w-full border p-2 rounded"
                  value={editForm.warna}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, warna: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">QTY</label>
                <input
                  type="number"
                  min={1}
                  className="w-full border p-2 rounded"
                  value={editForm.qty}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, qty: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">Harga Penjualan</label>
                <input
                  type="number"
                  className="w-full border p-2 rounded"
                  value={editForm.hargaPenjualan}
                  onChange={(e) =>
                    setEditForm((p) => ({
                      ...p,
                      hargaPenjualan: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">Total Penjualan</label>
                <input
                  className="w-full border p-2 rounded bg-gray-100"
                  value={`Rp ${fmt(totalEdit)}`}
                  readOnly
                />
              </div>

              <div>
                <label className="text-xs">ID Pelanggan</label>
                <input
                  className="w-full border p-2 rounded"
                  value={editForm.idPelanggan}
                  onChange={(e) =>
                    setEditForm((p) => ({
                      ...p,
                      idPelanggan: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">Nama SH</label>
                <input
                  className="w-full border p-2 rounded"
                  value={editForm.namaSH}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, namaSH: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">Nama SALES</label>
                <input
                  className="w-full border p-2 rounded"
                  value={editForm.namaSales}
                  onChange={(e) =>
                    setEditForm((p) => ({
                      ...p,
                      namaSales: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">STAFF</label>
                <input
                  className="w-full border p-2 rounded"
                  value={editForm.staff}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, staff: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">Tipe Bayar</label>
                <select
                  className="w-full border p-2 rounded"
                  value={editForm.tipeBayar}
                  onChange={(e) =>
                    handleChangeTipeBayarEdit(e.target.value)
                  }
                >
                  <option value="">Pilih Tipe Bayar</option>
                  {TIPE_BAYAR_OPTIONS.map((tb) => (
                    <option key={tb} value={tb}>
                      {tb}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs">Payment Method</label>
                <select
                  className="w-full border p-2 rounded"
                  value={editForm.paymentMethod}
                  onChange={(e) =>
                    setEditForm((p) => ({
                      ...p,
                      paymentMethod: e.target.value,
                    }))
                  }
                >
                  <option value="">Pilih Payment Method</option>
                  {PAYMENT_METHOD_OPTIONS.map((pm) => (
                    <option key={pm} value={pm}>
                      {pm}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs">Status</label>
                <select
                  className="w-full border p-2 rounded"
                  value={editForm.status}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, status: e.target.value }))
                  }
                >
                  <option value="">Pilih Status</option>
                  <option value="LUNAS">LUNAS</option>
                  <option value="PIUTANG">PIUTANG</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs">Keterangan</label>
                <textarea
                  rows={3}
                  className="w-full border p-2 rounded text-xs sm:text-sm"
                  value={editForm.keterangan}
                  onChange={(e) =>
                    setEditForm((p) => ({
                      ...p,
                      keterangan: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-3 py-1 bg-gray-400 text-white rounded text-sm"
                onClick={() => setShowModalEdit(false)}
              >
                <FaTimes />
              </button>
              <button
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm flex items-center"
                onClick={handleSubmitEdit}
              >
                <FaSave className="mr-1" /> Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PREVIEW INVOICE (dari form tambah) */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white w-full max-w-lg rounded shadow p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold">Preview Invoice Penjualan</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-600"
              >
                <FaTimes />
              </button>
            </div>
            <div className="text-xs sm:text-sm space-y-1">
              <p>
                <span className="font-semibold">Tanggal:</span>{" "}
                {tambahForm.tanggal || "-"}
              </p>
              <p>
                <span className="font-semibold">No Faktur:</span>{" "}
                {tambahForm.noFaktur || "-"}
              </p>
              <p>
                <span className="font-semibold">Nama Toko:</span>{" "}
                {tambahForm.namaToko || "-"}
              </p>
              <hr className="my-2" />
              <p>
                <span className="font-semibold">Kategori:</span>{" "}
                {tambahForm.kategoriBarang || "-"}
              </p>
              <p>
                <span className="font-semibold">Brand:</span>{" "}
                {tambahForm.namaBrand || "-"}
              </p>
              <p>
                <span className="font-semibold">Barang:</span>{" "}
                {tambahForm.namaBarang || "-"}
              </p>
              <p>
                <span className="font-semibold">Warna:</span>{" "}
                {tambahForm.warna || "-"}
              </p>
              <p className="whitespace-pre-wrap">
                <span className="font-semibold">IMEI:</span>{" "}
                {tambahForm.imei || "-"}
              </p>
              <hr className="my-2" />
              <p>
                <span className="font-semibold">QTY:</span>{" "}
                {tambahForm.qty || 0}
              </p>
              <p>
                <span className="font-semibold">Harga Jual:</span>{" "}
                Rp {fmt(tambahForm.hargaPenjualan || 0)}
              </p>
              <p>
                <span className="font-semibold">Total Penjualan:</span>{" "}
                Rp {fmt(totalTambah)}
              </p>
              <hr className="my-2" />
              <p>
                <span className="font-semibold">Tipe Bayar:</span>{" "}
                {tambahForm.tipeBayar || "-"}
              </p>
              <p>
                <span className="font-semibold">Payment Method:</span>{" "}
                {tambahForm.paymentMethod || "-"}
              </p>
              <p>
                <span className="font-semibold">Status:</span>{" "}
                {tambahForm.status || "-"}
              </p>
              <hr className="my-2" />
              <p>
                <span className="font-semibold">ID Pelanggan:</span>{" "}
                {tambahForm.idPelanggan || "-"}
              </p>
              <p>
                <span className="font-semibold">Nama SH:</span>{" "}
                {tambahForm.namaSH || "-"}
              </p>
              <p>
                <span className="font-semibold">Nama SALES:</span>{" "}
                {tambahForm.namaSales || "-"}
              </p>
              <p>
                <span className="font-semibold">Staff:</span>{" "}
                {tambahForm.staff || "-"}
              </p>
              <p className="whitespace-pre-wrap">
                <span className="font-semibold">Keterangan:</span>{" "}
                {tambahForm.keterangan || "-"}
              </p>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-3 py-1 bg-gray-400 text-white rounded text-sm"
                onClick={() => setShowPreview(false)}
              >
                <FaTimes className="inline" /> Tutup
              </button>
              <button
                className="px-3 py-1 bg-orange-600 text-white rounded text-sm flex items-center"
                onClick={handlePrintInvoice}
              >
                <FaPrint className="mr-1" /> Cetak Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
