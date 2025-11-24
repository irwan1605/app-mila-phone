// PART 1/4
// src/pages/MasterBarang.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  listenAllTransaksi,
  addTransaksi,
  updateTransaksi,
  deleteTransaksi,
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
} from "react-icons/fa";

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

const fmt = (n) => {
  try {
    return Number(n || 0).toLocaleString("id-ID");
  } catch {
    return String(n || "");
  }
};

export default function MasterBarang() {
  const [allTransaksi, setAllTransaksi] = useState([]);
  const [search, setSearch] = useState("");

  const [editData, setEditData] = useState(null);
  const [showModalEdit, setShowModalEdit] = useState(false);

  const [showModalTambah, setShowModalTambah] = useState(false);
  const [tambahForm, setTambahForm] = useState({
    brand: "",
    barang: "",
    hargaSup: "",
    hargaUnit: "",
    qty: 1,
    imeiList: "",
    namaToko: "PUSAT",
    noInvoice: "",
  });

  const tableRef = useRef(null);

  // ===================== LISTENER FIREBASE =====================
  useEffect(() => {
    const unsub =
      typeof listenAllTransaksi === "function"
        ? listenAllTransaksi((list) => {
            setAllTransaksi(Array.isArray(list) ? list : []);
          })
        : null;

    return () => unsub && unsub();
  }, []);

  // ===================== GROUP SKU (per BRAND + BARANG) =====================
  const groupedSku = useMemo(() => {
    const map = {};

    (allTransaksi || []).forEach((x) => {
      const brand = (x.NAMA_BRAND || "").trim();
      const barang = (x.NAMA_BARANG || "").trim();
      if (!brand && !barang) return;

      const key = `${brand}|${barang}`;
      if (!map[key]) {
        map[key] = {
          skuKey: key,
          brand,
          barang,
          imeis: [],
          hargaSup: Number(x.HARGA_SUPLAYER || 0),
          hargaUnit: Number(x.HARGA_UNIT || 0),
          totalQty: 0,
          noInvoiceSample: x.NO_INVOICE || "",
        };
      }

      map[key].totalQty += Number(x.QTY || 0);

      if (x.IMEI && String(x.IMEI).trim() !== "") {
        map[key].imeis.push(String(x.IMEI).trim());
      }

      // gunakan harga terakhir sebagai sample
      map[key].hargaSup = Number(x.HARGA_SUPLAYER || map[key].hargaSup || 0);
      map[key].hargaUnit = Number(x.HARGA_UNIT || map[key].hargaUnit || 0);
      if (x.NO_INVOICE) {
        map[key].noInvoiceSample = x.NO_INVOICE;
      }
    });

    return map;
  }, [allTransaksi]);

  // daftar brand untuk datalist
  const brandList = useMemo(
    () =>
      Array.from(
        new Set(
          Object.values(groupedSku)
            .map((x) => x.brand)
            .filter(Boolean)
        )
      ),
    [groupedSku]
  );

  // ===================== FILTER SEARCH =====================
  const filteredSkuList = useMemo(() => {
    const q = (search || "").toLowerCase();

    return Object.values(groupedSku).filter((x) => {
      if (!q) return true;
      return (
        (x.brand || "").toLowerCase().includes(q) ||
        (x.barang || "").toLowerCase().includes(q) ||
        (x.noInvoiceSample || "").toLowerCase().includes(q) ||
        (x.imeis || []).some((im) => im.toLowerCase().includes(q))
      );
    });
  }, [groupedSku, search]);

  // ===================== VALIDASI IMEI =====================
  const validateImeis = (imeiLines, originalBrand = null, originalBarang = null) => {
    const errors = [];
    const seen = new Set();

    // duplikat di input
    for (const im of imeiLines) {
      if (seen.has(im)) {
        errors.push(`IMEI / No MESIN duplikat di input: ${im}`);
        break;
      }
      seen.add(im);
    }

    // tabrakan dengan database (IMEI sudah dipakai SKU lain)
    for (const im of imeiLines) {
      const conflict = (allTransaksi || []).find((t) => {
        const tImei = String(t.IMEI || "").trim();
        if (!tImei || tImei !== im) return false;

        const b = (t.NAMA_BRAND || "").trim();
        const brg = (t.NAMA_BARANG || "").trim();

        if (
          originalBrand &&
          originalBarang &&
          b === (originalBrand || "").trim() &&
          brg === (originalBarang || "").trim()
        ) {
          // konflik di SKU yang sama saat edit → diizinkan
          return false;
        }

        return true;
      });

      if (conflict) {
        errors.push(
          `IMEI / No MESIN ${im} sudah digunakan di SKU ${conflict.NAMA_BRAND} - ${conflict.NAMA_BARANG}`
        );
        break;
      }
    }

    return errors;
  };

  // End PART 1: lanjut PART 2/4 untuk fungsi tambah/edit lengkap, adjust stok, render table, modal, dsb.
  // ===================== HELPER: SESUAIKAN STOK SAAT EDIT =====================
  const adjustStockForEdit = async (currentAll, skuKeyOriginal, oldQty, newQty) => {
    const diff = Number(newQty) - Number(oldQty);
    if (diff === 0) return { added: 0, removed: 0 };

    // ambil semua baris yang berhubungan dengan SKU ini
    const skuRows = (currentAll || []).filter((r) => {
      const key = `${(r.NAMA_BRAND || "").trim()}|${(r.NAMA_BARANG || "").trim()}`;
      return key === skuKeyOriginal;
    });

    const getTokoIndex = (r) =>
      fallbackTokoNames.findIndex(
        (t) => t.toUpperCase() === String(r.NAMA_TOKO || "PUSAT").toUpperCase()
      ) + 1;

    // ===== TAMBAH STOK =====
    if (diff > 0) {
      let added = 0;
      const template = skuRows[0] || {};
      const namaToko = template.NAMA_TOKO || "PUSAT";
      const tokoIndex = getTokoIndex(template) || 1;

      for (let i = 0; i < diff; i++) {
        const payload = {
          TANGGAL_TRANSAKSI: template.TANGGAL_TRANSAKSI || new Date().toISOString().slice(0, 10),
          NO_INVOICE: template.NO_INVOICE || `ADJ-${Date.now()}`,
          NAMA_USER: template.NAMA_USER || "SYSTEM",
          NAMA_TOKO: namaToko,
          NAMA_BRAND: template.NAMA_BRAND || skuKeyOriginal.split("|")[0] || "UNKNOWN",
          NAMA_BARANG: template.NAMA_BARANG || skuKeyOriginal.split("|")[1] || "UNKNOWN",
          QTY: 1,
          IMEI: "",
          NOMOR_UNIK: `ADJ|${Date.now()}|${i}`,
          HARGA_UNIT: Number(template.HARGA_UNIT || 0),
          HARGA_SUPLAYER: Number(template.HARGA_SUPLAYER || 0),
          TOTAL: Number(template.HARGA_UNIT || 0) * 1,
          PAYMENT_METODE: "TAMBAH STOCK",
          SYSTEM_PAYMENT: "SYSTEM",
          KETERANGAN: "Penyesuaian stok (Tambah via Edit Master Barang)",
          STATUS: "Approved",
        };

        try {
          if (typeof addTransaksi === "function") {
            await addTransaksi(tokoIndex, payload);
          }
          added++;
        } catch (err) {
          console.error("adjustStockForEdit addTransaksi error:", err);
        }
      }

      return { added, removed: 0 };
    }

    // ===== KURANGI STOK =====
    if (diff < 0) {
      let toRemove = Math.abs(diff);
      let removed = 0;

      // prioritize removable rows: prefer PAYMENT_METODE "TAMBAH STOCK" non-IMEI first
      const removable = (currentAll || []).filter((r) => {
        const key = `${(r.NAMA_BRAND || "").trim()}|${(r.NAMA_BARANG || "").trim()}`;
        return key === skuKeyOriginal && (r.PAYMENT_METODE || "").toUpperCase() === "TAMBAH STOCK";
      });

      const nonImei = removable.filter((r) => !r.IMEI || String(r.IMEI).trim() === "");
      const withImei = removable.filter((r) => r.IMEI && String(r.IMEI).trim() !== "");

      const tryDeleteList = async (list) => {
        // delete from last (LIFO)
        for (let i = list.length - 1; i >= 0 && toRemove > 0; i--) {
          const r = list[i];
          const tokoIndex = getTokoIndex(r) || 1;

          try {
            if (r.id && typeof deleteTransaksi === "function") {
              await deleteTransaksi(tokoIndex, r.id);
            }
          } catch (err) {
            console.error("adjustStockForEdit deleteTransaksi error:", err);
          }

          // also remove from currentAll reference (caller will re-fetch state)
          toRemove--;
          removed++;
        }
      };

      await tryDeleteList(nonImei);
      if (toRemove > 0) {
        await tryDeleteList(withImei);
      }

      return { added: 0, removed };
    }

    return { added: 0, removed: 0 };
  };

  // ===================== OPEN EDIT (mengisi stokSistem & imeiList) =====================
  const openEdit = (data) => {
    setEditData({
      brand: data.brand,
      barang: data.barang,
      hargaSup: data.hargaSup || 0,
      hargaUnit: data.hargaUnit || 0,
      noInvoiceSample: data.noInvoiceSample || "",
      imeiList: (data.imeis || []).join("\n"),
      stokSistem: data.totalQty || 0,
      originalBrand: data.brand,
      originalBarang: data.barang,
    });
    setShowModalEdit(true);
  };

  // ===================== SAVE EDIT (fix final) =====================
  const saveEdit = async () => {
    if (!editData) return;

    // parse imei lines
    const imeiLines = String(editData.imeiList || "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    // validate imei conflicts
    const errors = validateImeis(imeiLines, editData.originalBrand, editData.originalBarang);
    if (errors.length) {
      alert(errors.join("\n"));
      return;
    }

    // find all transaksi rows that belong to original SKU
    const skuKeyOriginal = `${(editData.originalBrand || "").trim()}|${(editData.originalBarang || "").trim()}`;
    const skuRows = (allTransaksi || []).filter((r) => {
      const key = `${(r.NAMA_BRAND || "").trim()}|${(r.NAMA_BARANG || "").trim()}`;
      return key === skuKeyOriginal;
    });

    const oldQty = skuRows.reduce((s, r) => s + Number(r.QTY || 0), 0);
    const newQty = Number(editData.stokSistem || 0);
    const diff = newQty - oldQty;

    try {
      // adjust stock (add / delete transactions)
      await adjustStockForEdit(allTransaksi, skuKeyOriginal, oldQty, newQty);
    } catch (err) {
      console.error("saveEdit adjustStockForEdit error:", err);
      alert("Gagal menyesuaikan stok. Cek console.");
      return;
    }

    // after adjustment, re-read rows for this SKU from current state (we'll use setAllTransaksi after updates)
    // Build updated list by mapping over current allTransaksi
    let currentAll = [...allTransaksi];

    // fetch fresh rows belonging to this SKU
    const latestSkuRows = currentAll.filter((r) => {
      const key = `${(r.NAMA_BRAND || "").trim()}|${(r.NAMA_BARANG || "").trim()}`;
      return key === skuKeyOriginal || key === `${(editData.brand || "").trim()}|${(editData.barang || "").trim()}`;
    });

    // update rows metadata (brand, barang, harga, invoice, IMEI mapping)
    // We'll map IMEIs to rows that have IMEI; if number of imeis equals number of rows, map 1:1; if one imei, set to all; otherwise keep existing where no mapping.
    const rowsToUpdate = currentAll.filter((r) => {
      const key = `${(r.NAMA_BRAND || "").trim()}|${(r.NAMA_BARANG || "").trim()}`;
      return key === skuKeyOriginal;
    });

    // Determine mapping logic
    for (let i = 0; i < rowsToUpdate.length; i++) {
      const r = rowsToUpdate[i];
      const tokoIndex =
        fallbackTokoNames.findIndex(
          (t) => t.toUpperCase() === String(r.NAMA_TOKO || "PUSAT").toUpperCase()
        ) + 1;

      let newImei = r.IMEI;
      if (imeiLines.length === 1) {
        newImei = imeiLines[0];
      } else if (imeiLines.length === rowsToUpdate.length) {
        // map by position if lengths match
        newImei = imeiLines[i] || r.IMEI;
      } else if (imeiLines.length > 1 && imeiLines.length < rowsToUpdate.length) {
        newImei = imeiLines[i] || r.IMEI;
      }
      // else keep existing IMEI for rows where present

      const newRow = {
        ...r,
        NAMA_BRAND: editData.brand,
        NAMA_BARANG: editData.barang,
        NO_INVOICE: editData.noInvoiceSample || r.NO_INVOICE || "",
        HARGA_SUPLAYER: Number(editData.hargaSup || r.HARGA_SUPLAYER || 0),
        HARGA_UNIT: Number(editData.hargaUnit || r.HARGA_UNIT || 0),
        TOTAL: Number(r.QTY || 0) * Number(editData.hargaUnit || r.HARGA_UNIT || 0),
        IMEI: newImei,
      };

      try {
        if (r.id && typeof updateTransaksi === "function") {
          await updateTransaksi(tokoIndex, r.id, newRow);
        }
      } catch (err) {
        console.error("saveEdit updateTransaksi error:", err);
      }

      // mutate currentAll (so subsequent iterations see updated values)
      currentAll = currentAll.map((x) => (x === r ? newRow : x));
    }

    // Finally update local state
    setAllTransaksi(currentAll);
    setShowModalEdit(false);
    alert("Perubahan Master Barang & Stok Sistem berhasil disimpan.");
  };
  // ===================== DELETE SKU =====================
  const deleteSku = async (data) => {
    if (!window.confirm(`Hapus semua transaksi untuk SKU ini?\n${data.brand} - ${data.barang}`))
      return;

    const rows = allTransaksi.filter(
      (x) =>
        `${(x.NAMA_BRAND || "").trim()}|${(x.NAMA_BARANG || "").trim()}` ===
        `${(data.brand || "").trim()}|${(data.barang || "").trim()}`
    );

    try {
      for (const r of rows) {
        const tokoIndex =
          fallbackTokoNames.findIndex(
            (t) => t.toUpperCase() === String(r.NAMA_TOKO || "").toUpperCase()
          ) + 1;

        if (r.id && typeof deleteTransaksi === "function") {
          await deleteTransaksi(tokoIndex, r.id);
        }
      }

      setAllTransaksi((prev) =>
        prev.filter(
          (x) =>
            !(
              `${(x.NAMA_BRAND || "").trim()}|${(x.NAMA_BARANG || "").trim()}` ===
              `${(data.brand || "").trim()}|${(data.barang || "").trim()}`
            )
        )
      );

      alert("SKU berhasil dihapus.");
    } catch (err) {
      console.error("deleteSku error:", err);
      alert("Gagal menghapus SKU.");
    }
  };

    // ===================== OPEN TAMBAH STOCK =====================
    const openTambahModal = () => {
      setTambahForm({
        brand: "",
        barang: "",
        hargaSup: "",
        hargaUnit: "",
        qty: 1,
        imeiList: "",
        namaToko: "PUSAT",
        noInvoice: "",
      });
      setShowModalTambah(true);
    };

      // ===================== SUBMIT TAMBAH STOCK =====================
  const submitTambahStock = async () => {
    const brand = tambahForm.brand.trim();
    const barang = tambahForm.barang.trim();
    const hargaSup = Number(tambahForm.hargaSup || 0);
    const hargaUnit = Number(tambahForm.hargaUnit || 0);
    const qty = Number(tambahForm.qty || 0);
    const invoice = tambahForm.noInvoice.trim() || `INV-${Date.now()}`;
    const namaToko = tambahForm.namaToko || "PUSAT";

    if (!brand || !barang) {
      alert("Brand & Barang wajib diisi.");
      return;
    }

    // IMEI parsing
    const imeiLines = String(tambahForm.imeiList || "")
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

    // Validasi duplikat IMEI (di input + database)
    const err = validateImeis(imeiLines);
    if (err.length) {
      alert(err.join("\n"));
      return;
    }

    // Tidak boleh jumlah IMEI > qty
    if (imeiLines.length > qty) {
      alert("Jumlah IMEI melebihi QTY yang ditulis.");
      return;
    }

    // Temukan toko index
    const tokoIndex =
      fallbackTokoNames.findIndex(
        (t) => t.toUpperCase() === namaToko.toUpperCase()
      ) + 1;

    // Proses IMEI terlebih dahulu
    for (let i = 0; i < imeiLines.length; i++) {
      const payload = {
        TANGGAL_TRANSAKSI: new Date().toISOString().slice(0, 10),
        NO_INVOICE: invoice,
        NAMA_USER: "SYSTEM",
        NAMA_TOKO: namaToko,
        NAMA_BRAND: brand,
        NAMA_BARANG: barang,
        QTY: 1,
        IMEI: imeiLines[i],
        NOMOR_UNIK: `${Date.now()}|${i}`,
        HARGA_UNIT: hargaUnit,
        HARGA_SUPLAYER: hargaSup,
        TOTAL: hargaUnit * 1,
        PAYMENT_METODE: "PEMBELIAN",
        SYSTEM_PAYMENT: "SYSTEM",
        KETERANGAN: "Tambah stok (IMEI)",
        STATUS: "Approved",
      };

      await addTransaksi(tokoIndex, payload);
    }

    // Sisa QTY tanpa IMEI
    const sisa = qty - imeiLines.length;

    for (let i = 0; i < sisa; i++) {
      const payload = {
        TANGGAL_TRANSAKSI: new Date().toISOString().slice(0, 10),
        NO_INVOICE: invoice,
        NAMA_USER: "SYSTEM",
        NAMA_TOKO: namaToko,
        NAMA_BRAND: brand,
        NAMA_BARANG: barang,
        QTY: 1,
        IMEI: "",
        NOMOR_UNIK: `${Date.now()}|NIMEI|${i}`,
        HARGA_UNIT: hargaUnit,
        HARGA_SUPLAYER: hargaSup,
        TOTAL: hargaUnit * 1,
        PAYMENT_METODE: "PEMBELIAN",
        SYSTEM_PAYMENT: "SYSTEM",
        KETERANGAN: "Tambah stok (NON-IMEI)",
        STATUS: "Approved",
      };

      await addTransaksi(tokoIndex, payload);
    }

    alert("Stock berhasil ditambahkan.");
    setShowModalTambah(false);
  };

  

  // ===================== EXPORT EXCEL =====================
  const exportExcel = () => {
    const sheetData = filteredSkuList.map((x) => ({
      Brand: x.brand,
      Barang: x.barang,
      IMEI: (x.imeis || []).join(", "),
      Harga_Supplier: x.hargaSup,
      Harga_Unit: x.hargaUnit,
      Stok_Sistem: x.totalQty,
      Invoice_Contoh: x.noInvoiceSample,
    }));

    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MASTER_BARANG");
    XLSX.writeFile(wb, `MASTER_BARANG_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // ===================== EXPORT PDF =====================
  const exportPDF = async () => {
    try {
      const element = tableRef.current;
      if (!element) {
        alert("Tabel tidak ditemukan.");
        return;
      }

      const canvas = await html2canvas(element, { scale: 1.4 });
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF("l", "mm", "a4");
      const width = pdf.internal.pageSize.getWidth();
      const height = (canvas.height * width) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, width, height);
      pdf.save(`MASTER_BARANG_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (err) {
      console.error("exportPDF error:", err);
      alert("Gagal export PDF");
    }
  };

  // ===================== RENDER =====================
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">MASTER BARANG</h2>

      {/* TOOLBAR */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <div className="flex items-center border rounded px-3 py-2 w-72">
          <FaSearch className="text-gray-500" />
          <input
            className="ml-2 flex-1 outline-none text-sm"
            placeholder="Cari brand / barang / IMEI ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button
          onClick={() => openTambahModal()}
          className="px-3 py-2 bg-indigo-600 text-white rounded flex items-center text-sm"
        >
          <FaPlus className="mr-2" /> Tambah Stock Barang
        </button>

        <button
          onClick={exportExcel}
          className="px-3 py-2 bg-green-600 text-white rounded flex items-center text-sm"
        >
          <FaFileExcel className="mr-2" /> Export Excel
        </button>

        <button
          onClick={exportPDF}
          className="px-3 py-2 bg-red-600 text-white rounded flex items-center text-sm"
        >
          <FaFilePdf className="mr-2" /> Export PDF
        </button>
      </div>

      {/* TABLE */}
      <div ref={tableRef} className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="border p-2">No</th>
              <th className="border p-2">Brand</th>
              <th className="border p-2">Barang</th>
              <th className="border p-2 whitespace-pre-wrap">IMEI / No MESIN</th>
              <th className="border p-2 text-right">Harga Supplier</th>
              <th className="border p-2 text-right">Harga Unit</th>
              <th className="border p-2 text-center">Stok Sistem</th>
              <th className="border p-2 text-center">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {filteredSkuList.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-3 border text-center text-gray-500">
                  Tidak ada data.
                </td>
              </tr>
            ) : (
              filteredSkuList.map((x, idx) => {
                const imeiShown =
                  search.trim() === ""
                    ? x.imeis || []
                    : (x.imeis || []).filter((im) =>
                        im.toLowerCase().includes(search.toLowerCase())
                      );

                return (
                  <tr key={x.skuKey} className="hover:bg-gray-50">
                    <td className="border p-2 text-center">{idx + 1}</td>
                    <td className="border p-2">{x.brand}</td>
                    <td className="border p-2">{x.barang}</td>

                    <td className="border p-2 whitespace-pre-wrap">
                      {imeiShown.length > 0 ? imeiShown.join("\n") : "-"}
                    </td>

                    <td className="border p-2 text-right">Rp {fmt(x.hargaSup)}</td>
                    <td className="border p-2 text-right">Rp {fmt(x.hargaUnit)}</td>
                    <td className="border p-2 text-center">{x.totalQty}</td>

                    <td className="border p-2 text-center space-x-2">
                      <button
                        onClick={() => openEdit(x)}
                        className="text-blue-600"
                        title="Edit"
                      >
                        <FaEdit />
                      </button>

                      <button
                        onClick={() => deleteSku(x)}
                        className="text-red-600"
                        title="Hapus SKU"
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
      {/* MODAL: TAMBAH STOCK */}
      {showModalTambah && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-start py-8 z-50 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded shadow p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold">TAMBAHKAN STOCK</h3>
              <button
                onClick={() => setShowModalTambah(false)}
                className="text-gray-600"
              >
                <FaTimes />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs">Brand</label>
                <input
                  list="brand-list"
                  className="w-full border p-2 rounded"
                  value={tambahForm.brand}
                  onChange={(e) =>
                    setTambahForm((prev) => ({ ...prev, brand: e.target.value }))
                  }
                />
                <datalist id="brand-list">
                  {brandList.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="text-xs">Barang</label>
                <input
                  className="w-full border p-2 rounded"
                  value={tambahForm.barang}
                  onChange={(e) =>
                    setTambahForm((prev) => ({ ...prev, barang: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">Harga Supplier</label>
                <input
                  type="number"
                  className="w-full border p-2 rounded"
                  value={tambahForm.hargaSup}
                  onChange={(e) =>
                    setTambahForm((prev) => ({ ...prev, hargaSup: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">Harga Unit</label>
                <input
                  type="number"
                  className="w-full border p-2 rounded"
                  value={tambahForm.hargaUnit}
                  onChange={(e) =>
                    setTambahForm((prev) => ({ ...prev, hargaUnit: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">Qty (Tanpa IMEI)</label>
                <input
                  type="number"
                  min={1}
                  className="w-full border p-2 rounded"
                  value={tambahForm.qty}
                  onChange={(e) =>
                    setTambahForm((prev) => ({ ...prev, qty: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">No Invoice</label>
                <input
                  className="w-full border p-2 rounded"
                  value={tambahForm.noInvoice}
                  onChange={(e) =>
                    setTambahForm((prev) => ({ ...prev, noInvoice: e.target.value }))
                  }
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs">
                  IMEI / No MESIN (1 per baris – opsional)
                </label>
                <textarea
                  rows={5}
                  className="w-full border p-2 rounded text-xs font-mono"
                  placeholder={`Contoh:\n6633849364\nABCD9983XYZ`}
                  value={tambahForm.imeiList}
                  onChange={(e) =>
                    setTambahForm((prev) => ({ ...prev, imeiList: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-3 py-1 bg-gray-400 text-white rounded text-sm"
                onClick={() => setShowModalTambah(false)}
              >
                <FaTimes className="inline" /> Batal
              </button>

              <button
                className="px-3 py-1 bg-indigo-600 text-white rounded text-sm flex items-center"
                onClick={submitTambahStock}
              >
                <FaSave className="mr-1" /> Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT MASTER BARANG */}
      {showModalEdit && editData && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white w-full max-w-md rounded shadow p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold">Edit Master Barang</h3>
              <button
                onClick={() => setShowModalEdit(false)}
                className="text-gray-600"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-3 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-xs">Brand</label>
                <input
                  className="w-full border p-2 rounded text-sm"
                  value={editData.brand}
                  onChange={(e) =>
                    setEditData((prev) => ({ ...prev, brand: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">Barang</label>
                <input
                  className="w-full border p-2 rounded text-sm"
                  value={editData.barang}
                  onChange={(e) =>
                    setEditData((prev) => ({ ...prev, barang: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">No Invoice</label>
                <input
                  className="w-full border p-2 rounded text-sm"
                  value={editData.noInvoiceSample}
                  onChange={(e) =>
                    setEditData((prev) => ({
                      ...prev,
                      noInvoiceSample: e.target.value,
                    }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">Harga Supplier</label>
                <input
                  type="number"
                  className="w-full border p-2 rounded text-sm"
                  value={editData.hargaSup}
                  onChange={(e) =>
                    setEditData((prev) => ({ ...prev, hargaSup: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">Harga Unit</label>
                <input
                  type="number"
                  className="w-full border p-2 rounded text-sm"
                  value={editData.hhargaUnit}
                  onChange={(e) =>
                    setEditData((prev) => ({ ...prev, hargaUnit: e.target.value }))
                  }
                />
              </div>

              {/* FIELD STOK SISTEM */}
              <div>
                <label className="text-xs">Stok Sistem</label>
                <input
                  type="number"
                  min={0}
                  className="w-full border p-2 rounded text-sm"
                  value={editData.stokSistem}
                  onChange={(e) =>
                    setEditData((prev) => ({
                      ...prev,
                      stokSistem: Number(e.target.value),
                    }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">IMEI / No MESIN (1 per baris)</label>
                <textarea
                  rows={4}
                  className="w-full border p-2 rounded text-xs font-mono"
                  value={editData.imeiList}
                  onChange={(e) =>
                    setEditData((prev) => ({ ...prev, imeiList: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-3">
              <button
                className="px-3 py-1 bg-gray-400 text-white rounded text-sm"
                onClick={() => setShowModalEdit(false)}
              >
                <FaTimes />
              </button>

              <button
                className="px-3 py-1 bg-blue-600 text-white rounded text-sm flex items-center"
                onClick={saveEdit}
              >
                <FaSave className="inline mr-1" /> Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
