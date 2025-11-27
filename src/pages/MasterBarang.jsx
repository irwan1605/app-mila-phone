// MasterBarang.jsx FINAL + TANGGAL + KATEGORI BRAND + FILTER
// Aturan:
// - Jumlah IMEI harus sama dengan Stok Sistem (Qty).
// - IMEI tidak boleh duplikat (input & antar SKU).
// - Tanggal menggunakan field TANGGAL_TRANSAKSI (opsi A).
// - Kategori Brand: SEPEDA LISTRIK, MOTOR LISTRIK, HANDPHONE, ACCESORIES.
// src/pages/MasterBarang.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  listenAllTransaksi,
  addTransaksi,
  updateTransaksi,
  deleteTransaksi,
} from "../services/FirebaseService";
import { deleteMasterBarang } from "../services/FirebaseService";

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

import { getDatabase, ref, get, remove } from "firebase/database";

const db = getDatabase();

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

const fmt = (n) => {
  try {
    return Number(n || 0).toLocaleString("id-ID");
  } catch {
    return String(n || "");
  }
};

const KATEGORI_OPTIONS = [
  "SEPEDA LISTRIK",
  "MOTOR LISTRIK",
  "HANDPHONE",
  "ACCESORIES",
];

export default function MasterBarang() {
  const [allTransaksi, setAllTransaksi] = useState([]);
  const [search, setSearch] = useState("");

  // filter tambahan
  const [filterTanggal, setFilterTanggal] = useState("");
  const [filterKategori, setFilterKategori] = useState("");

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
    tanggal: new Date().toISOString().slice(0, 10),
    kategoriBrand: "",
  });

  const tableRef = useRef(null);

  // LISTENER FIREBASE
  useEffect(() => {
    const unsub =
      typeof listenAllTransaksi === "function"
        ? listenAllTransaksi((list) => {
            setAllTransaksi(Array.isArray(list) ? list : []);
          })
        : null;

    return () => unsub && unsub();
  }, []);

  // GROUP SKU
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
          tanggalSample: x.TANGGAL_TRANSAKSI || "",
          kategoriBrandSample: x.KATEGORI_BRAND || "",
        };
      }

      map[key].totalQty += Number(x.QTY || 0);

      if (x.IMEI && String(x.IMEI).trim() !== "") {
        map[key].imeis.push(String(x.IMEI).trim());
      }

      // ambil harga terakhir jika ada
      map[key].hargaSup = Number(x.HARGA_SUPLAYER || map[key].hargaSup || 0);
      map[key].hargaUnit = Number(x.HARGA_UNIT || map[key].hargaUnit || 0);
      if (x.NO_INVOICE) map[key].noInvoiceSample = x.NO_INVOICE;

      // tanggal sample → ambil yang paling awal
      if (
        x.TANGGAL_TRANSAKSI &&
        (!map[key].tanggalSample ||
          x.TANGGAL_TRANSAKSI < map[key].tanggalSample)
      ) {
        map[key].tanggalSample = x.TANGGAL_TRANSAKSI;
      }

      // kategori brand sample → jika belum ada dan x punya
      if (x.KATEGORI_BRAND && !map[key].kategoriBrandSample) {
        map[key].kategoriBrandSample = x.KATEGORI_BRAND;
      }
    });

    return map;
  }, [allTransaksi]);

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

  // FILTER (search + tanggal + kategori)
  const filteredSkuList = useMemo(() => {
    let list = Object.values(groupedSku);

    const q = (search || "").toLowerCase();
    if (q) {
      list = list.filter((x) => {
        return (
          (x.brand || "").toLowerCase().includes(q) ||
          (x.barang || "").toLowerCase().includes(q) ||
          (x.noInvoiceSample || "").toLowerCase().includes(q) ||
          (x.kategoriBrandSample || "").toLowerCase().includes(q) ||
          (x.imeis || []).some((im) => im.toLowerCase().includes(q))
        );
      });
    }

    if (filterTanggal) {
      list = list.filter((x) => x.tanggalSample === filterTanggal);
    }

    if (filterKategori) {
      list = list.filter((x) => x.kategoriBrandSample === filterKategori);
    }

    return list;
  }, [groupedSku, search, filterTanggal, filterKategori]);

  // VALIDASI IMEI
  const validateImeis = (
    imeiLines,
    originalBrand = null,
    originalBarang = null
  ) => {
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

    // konflik dengan database SKU lain
    for (const im of imeiLines) {
      const conflict = (allTransaksi || []).find((t) => {
        const tImei = String(t.IMEI || "").trim();
        if (!tImei || tImei !== im) return false;

        const b = (t.NAMA_BRAND || "").trim();
        const brg = (t.NAMA_BARANG || "").trim();

        if (
          originalBrand &&
          originalBarang &&
          b === originalBrand.trim() &&
          brg === originalBarang.trim()
        ) {
          return false; // IMEI milik SKU ini sendiri → boleh
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

  // HELPER: toko index
  const getTokoIndex = (r) =>
    fallbackTokoNames.findIndex(
      (t) => t.toUpperCase() === String(r.NAMA_TOKO || "PUSAT").toUpperCase()
    ) + 1;

  // OPEN EDIT
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
      tanggal: data.tanggalSample || new Date().toISOString().slice(0, 10),
      kategoriBrand: data.kategoriBrandSample || "",
    });
    setShowModalEdit(true);
  };

  // SAVE EDIT (Final, Qty == jumlah IMEI, IMEI unik, + tanggal & kategori)
  const saveEdit = async () => {
    if (!editData) return;

    // 1. Ambil IMEI dari textarea
    let rawImeis = String(editData.imeiList || "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    // 2. Validasi duplikat & konflik DB (pakai rawImeis dulu)
    const vErr = validateImeis(
      rawImeis,
      editData.originalBrand,
      editData.originalBarang
    );
    if (vErr.length) {
      alert(vErr.join("\n"));
      return;
    }

    if (!editData.kategoriBrand) {
      alert("Kategori Brand wajib dipilih.");
      return;
    }

    const stokInput = Number(editData.stokSistem || 0);

    // 3. Terapkan aturan A1 + B1
    // - Jika stokInput > 0 dan stokInput < jumlah IMEI → potong IMEI dari bawah (A1)
    // - Selain itu → Qty mengikuti jumlah IMEI (B1)
    let finalImeis = [...rawImeis];
    let newQty = 0;

    if (stokInput > 0 && stokInput < finalImeis.length) {
      finalImeis = finalImeis.slice(0, stokInput); // potong dari bawah
      newQty = stokInput;
    } else {
      newQty = finalImeis.length; // Qty ikut jumlah IMEI
    }

    // Pastikan tetap konsisten
    if (newQty !== finalImeis.length) {
      alert("Terjadi ketidaksesuaian Qty dan IMEI. Mohon cek kembali.");
      return;
    }

    const skuKeyOriginal = `${(editData.originalBrand || "").trim()}|${(
      editData.originalBarang || ""
    ).trim()}`;

    // 4. Ambil semua row transaksi untuk SKU ini
    const skuRows = allTransaksi.filter((r) => {
      const key = `${(r.NAMA_BRAND || "").trim()}|${(
        r.NAMA_BARANG || ""
      ).trim()}`;
      return key === skuKeyOriginal;
    });

    if (skuRows.length === 0) {
      alert("Data transaksi untuk SKU ini tidak ditemukan.");
      return;
    }

    const oldQty = skuRows.reduce((s, r) => s + Number(r.QTY || 0), 0);

    // 5. Update jumlah baris transaksi supaya sama dengan newQty
    let updatedAll = [...allTransaksi];

    // Helper untuk cari index di updatedAll
    const getIndexInAll = (row) =>
      updatedAll.findIndex(
        (x) =>
          x === row ||
          (x.id && row.id && x.id === row.id) ||
          (x.NOMOR_UNIK && row.NOMOR_UNIK && x.NOMOR_UNIK === row.NOMOR_UNIK)
      );

    // 5.a. Jika stok lama > stok baru → hapus baris dari belakang (A1)
    if (oldQty > newQty) {
      for (let i = skuRows.length - 1; i >= newQty; i--) {
        const r = skuRows[i];
        const tokoIndex = getTokoIndex(r) || 1;

        try {
          if (r.id && typeof deleteTransaksi === "function") {
            await deleteTransaksi(tokoIndex, r.id);
          }
        } catch (err) {
          console.error("deleteTransaksi (kurangi stok) error:", err);
        }

        // hapus juga dari state lokal
        const idxInAll = getIndexInAll(r);
        if (idxInAll !== -1) {
          updatedAll.splice(idxInAll, 1);
        }
      }
    }

    // Rebuild skuRowsAfter (baris yang tersisa untuk di-update)
    const skuRowsAfter = updatedAll.filter((r) => {
      const key = `${(r.NAMA_BRAND || "").trim()}|${(
        r.NAMA_BARANG || ""
      ).trim()}`;
      return key === skuKeyOriginal;
    });

    // 5.b. Jika stok baru > stok lama → tambah baris baru (QTY=1)
    if (newQty > oldQty) {
      const template = skuRowsAfter[0] || skuRows[0];

      const tokoIndex =
        fallbackTokoNames.findIndex(
          (t) =>
            t.toUpperCase() ===
            String(template.NAMA_TOKO || "PUSAT").toUpperCase()
        ) + 1;

      for (let i = oldQty; i < newQty; i++) {
        const payload = {
          TANGGAL_TRANSAKSI:
            editData.tanggal ||
            template.TANGGAL_TRANSAKSI ||
            new Date().toISOString().slice(0, 10),
          NO_INVOICE:
            editData.noInvoiceSample ||
            template.NO_INVOICE ||
            `ADJ-${Date.now()}`,
          NAMA_USER: template.NAMA_USER || "SYSTEM",
          NAMA_TOKO: template.NAMA_TOKO || "PUSAT",
          NAMA_BRAND: editData.brand,
          NAMA_BARANG: editData.barang,
          QTY: 1,
          IMEI: finalImeis[i] || "",
          NOMOR_UNIK: `ADJ|EDIT|${Date.now()}|${i}`,
          HARGA_UNIT: Number(editData.hargaUnit || template.HARGA_UNIT || 0),
          HARGA_SUPLAYER: Number(
            editData.hargaSup || template.HARGA_SUPLAYER || 0
          ),
          TOTAL: Number(editData.hargaUnit || template.HARGA_UNIT || 0) * 1,
          PAYMENT_METODE: template.PAYMENT_METODE || "TAMBAH STOCK",
          SYSTEM_PAYMENT: template.SYSTEM_PAYMENT || "SYSTEM",
          KETERANGAN:
            template.KETERANGAN || "Penyesuaian stok (Edit Master Barang)",
          STATUS: template.STATUS || "Approved",
          KATEGORI_BRAND:
            editData.kategoriBrand || template.KATEGORI_BRAND || "",
        };

        try {
          if (typeof addTransaksi === "function") {
            await addTransaksi(tokoIndex, payload);
          }
        } catch (err) {
          console.error("addTransaksi (tambah stok) error:", err);
        }

        // tambahkan ke state lokal (tanpa id, nanti listener Firebase akan memperbaiki)
        updatedAll.push(payload);
      }
    }

    // 6. Setelah jumlah baris sesuai, update metadata & IMEI
    const finalSkuRows = updatedAll
      .filter((r) => {
        const key = `${(r.NAMA_BRAND || "").trim()}|${(
          r.NAMA_BARANG || ""
        ).trim()}`;
        // cocokkan ke SKU lama (brand/barang original) ATAU SKU baru (brand/barang hasil edit)
        return (
          key === skuKeyOriginal ||
          key ===
            `${(editData.brand || "").trim()}|${(editData.barang || "").trim()}`
        );
      })
      // pastikan urutan stabil
      .sort((a, b) => {
        const da = a.TANGGAL_TRANSAKSI || "";
        const db = b.TANGGAL_TRANSAKSI || "";
        if (da < db) return -1;
        if (da > db) return 1;
        return 0;
      });

    // Hanya ambil sebanyak newQty
    const rowsToUpdate = finalSkuRows.slice(0, newQty);

    for (let i = 0; i < rowsToUpdate.length; i++) {
      const r = rowsToUpdate[i];
      const tokoIndex = getTokoIndex(r) || 1;

      const newRow = {
        ...r,
        NAMA_BRAND: editData.brand,
        NAMA_BARANG: editData.barang,
        NO_INVOICE: editData.noInvoiceSample || r.NO_INVOICE || "",
        HARGA_SUPLAYER: Number(editData.hargaSup || r.HARGA_SUPLAYER || 0),
        HARGA_UNIT: Number(editData.hargaUnit || r.HARGA_UNIT || 0),
        TOTAL:
          Number(r.QTY || 0) * Number(editData.hargaUnit || r.HARGA_UNIT || 0),
        IMEI: finalImeis[i] || "",
        TANGGAL_TRANSAKSI:
          editData.tanggal ||
          r.TANGGAL_TRANSAKSI ||
          new Date().toISOString().slice(0, 10),
        KATEGORI_BRAND: editData.kategoriBrand || r.KATEGORI_BRAND || "",
      };

      try {
        if (r.id && typeof updateTransaksi === "function") {
          await updateTransaksi(tokoIndex, r.id, newRow);
        }
      } catch (err) {
        console.error("saveEdit updateTransaksi error:", err);
      }

      // update state lokal
      const idxInAll = getIndexInAll(r);
      if (idxInAll !== -1) {
        updatedAll[idxInAll] = newRow;
      }
    }

    // 7. Set state dan tutup modal
    setAllTransaksi(updatedAll);
    setShowModalEdit(false);
    alert(
      "Perubahan disimpan. Stok Sistem = jumlah IMEI, IMEI unik, Tanggal & Kategori tersimpan."
    );
  };

  // ===================== DELETE SKU PRO MAX (HILANG TOTAL) =====================
  const deleteSku = async (data) => {
    const brand = data.brand;
    const barang = data.barang;

    if (!window.confirm(`Yakin hapus TOTAL:\n${brand} - ${barang}?`)) return;

    try {
      // 1️⃣ HAPUS SEMUA TRANSAKSI DI SEMUA TOKO
      const rows = allTransaksi.filter(
        (x) =>
          x.NAMA_BRAND === brand &&
          x.NAMA_BARANG === barang
      );

      for (const r of rows) {
        const tokoIndex =
          fallbackTokoNames.findIndex(
            (t) =>
              t.toUpperCase() ===
              String(r.NAMA_TOKO || "PUSAT").toUpperCase()
          ) + 1;

        if (r.id) {
          await deleteTransaksi(tokoIndex, r.id);
        } else {
          const trxPath = `toko/${tokoIndex}/transaksi`;
          const snap = await get(ref(db, trxPath));
          if (snap.exists()) {
            snap.forEach((child) => {
              const val = child.val();
              if (
                val.NAMA_BRAND === brand &&
                val.NAMA_BARANG === barang
              ) {
                remove(ref(db, `${trxPath}/${child.key}`));
              }
            });
          }
        }
      }

      // 2️⃣ HAPUS MASTER STOCK FIREBASE
      await deleteMasterBarang(brand, barang);

      // 3️⃣ HAPUS DARI STATE
      setAllTransaksi((prev) =>
        prev.filter(
          (x) =>
            x.NAMA_BRAND !== brand ||
            x.NAMA_BARANG !== barang
        )
      );

      alert("✅ SKU berhasil dihapus TOTAL dari Firebase.");
    } catch (err) {
      console.error("Delete SKU ERROR:", err);
      alert("❌ Gagal menghapus SKU.");
    }
  };

  useEffect(() => {
    const unsub =
      typeof listenAllTransaksi === "function"
        ? listenAllTransaksi((list) => {
            setAllTransaksi(Array.isArray(list) ? list : []);
          })
        : null;

    return () => unsub && unsub();
  }, []);

  // TAMBAH STOCK
  const openTambahModal = () => {
    setTambahForm({
      brand: "",
      barang: "",
      hargaSup: "",
      hargaUnit: "",
      qty: 1,
      imeiList: "",
      namaToko:  "CILANGKAP PUSAT",
      noInvoice: "",
      tanggal: new Date().toISOString().slice(0, 10),
      kategoriBrand: "",
    });
    setShowModalTambah(true);
  };

  const submitTambahStock = async () => {
    const brand = tambahForm.brand.trim();
    const barang = tambahForm.barang.trim();
    const hargaSup = Number(tambahForm.hargaSup || 0);
    const hargaUnit = Number(tambahForm.hargaUnit || 0);
    const qty = Number(tambahForm.qty || 0);
    const invoice = tambahForm.noInvoice.trim() || `INV-${Date.now()}`;
    const namaToko = tambahForm.namaToko || "PUSAT";
    const tanggal = tambahForm.tanggal || new Date().toISOString().slice(0, 10);
    const kategoriBrand = tambahForm.kategoriBrand;

    if (!brand || !barang) {
      alert("Brand & Barang wajib diisi.");
      return;
    }

    if (!kategoriBrand) {
      alert("Kategori Brand wajib dipilih.");
      return;
    }

    const imeiLines = String(tambahForm.imeiList || "")
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

    const err = validateImeis(imeiLines);
    if (err.length) {
      alert(err.join("\n"));
      return;
    }

    // IMEI wajib sama dengan Qty
    if (imeiLines.length !== qty) {
      alert("Jumlah IMEI / No MESIN harus sama dengan Qty.");
      return;
    }

    const tokoIndex =
      fallbackTokoNames.findIndex(
        (t) => t.toUpperCase() === namaToko.toUpperCase()
      ) + 1;

    for (let i = 0; i < imeiLines.length; i++) {
      const payload = {
        TANGGAL_TRANSAKSI: tanggal,
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
        TOTAL: hargaUnit,
        PAYMENT_METODE: "PEMBELIAN",
        SYSTEM_PAYMENT: "SYSTEM",
        KETERANGAN: "Tambah stok (IMEI)",
        STATUS: "Approved",
        KATEGORI_BRAND: kategoriBrand,
      };

      await addTransaksi(tokoIndex, payload);
    }

    alert("Stock berhasil ditambahkan.");
    setShowModalTambah(false);
  };

  // EXPORT EXCEL
  const exportExcel = () => {
    const sheetData = filteredSkuList.map((x) => ({
      Tanggal: x.tanggalSample,
      Kategori_Brand: x.kategoriBrandSample,
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
    XLSX.writeFile(
      wb,
      `MASTER_BARANG_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  // EXPORT PDF
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

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">MASTER BARANG</h2>

      {/* TOOLBAR */}
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <div className="flex items-center border rounded px-3 py-2 w-72">
          <FaSearch className="text-gray-500" />
          <input
            className="ml-2 flex-1 outline-none text-sm"
            placeholder="Cari brand / barang / IMEI / kategori ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* FILTER TANGGAL */}
        <input
          type="date"
          className="border rounded px-3 py-2 text-sm"
          value={filterTanggal}
          onChange={(e) => setFilterTanggal(e.target.value)}
        />

        {/* FILTER KATEGORI BRAND */}
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

        <button
          onClick={openTambahModal}
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
              <th className="border p-2">Tanggal</th>
              <th className="border p-2">Kategori Brand</th>
              <th className="border p-2">Brand</th>
              <th className="border p-2">Barang</th>
              <th className="border p-2 whitespace-pre-wrap">
                IMEI / No MESIN
              </th>
              <th className="border p-2 text-right">Harga Supplier</th>
              <th className="border p-2 text-right">Harga Unit</th>
              <th className="border p-2 text-center">Stok Sistem</th>
              <th className="border p-2 text-center">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {filteredSkuList.length === 0 ? (
              <tr>
                <td
                  colSpan={10}
                  className="p-3 border text-center text-gray-500"
                >
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
                    <td className="border p-2">
                      {x.tanggalSample ? x.tanggalSample : "-"}
                    </td>
                    <td className="border p-2">
                      {x.kategoriBrandSample || "-"}
                    </td>
                    <td className="border p-2">{x.brand}</td>
                    <td className="border p-2">{x.barang}</td>

                    <td className="border p-2 whitespace-pre-wrap">
                      {imeiShown.length > 0 ? imeiShown.join("\n") : "-"}
                    </td>

                    <td className="border p-2 text-right">
                      Rp {fmt(x.hargaSup)}
                    </td>
                    <td className="border p-2 text-right">
                      Rp {fmt(x.hargaUnit)}
                    </td>
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

      {/* MODAL TAMBAH STOCK */}
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
                    setTambahForm((p) => ({ ...p, brand: e.target.value }))
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
                    setTambahForm((p) => ({ ...p, barang: e.target.value }))
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
                    setTambahForm((p) => ({ ...p, hargaSup: e.target.value }))
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
                    setTambahForm((p) => ({ ...p, hargaUnit: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">Qty</label>
                <input
                  type="number"
                  min={0}
                  className="w-full border p-2 rounded"
                  value={tambahForm.qty}
                  onChange={(e) =>
                    setTambahForm((p) => ({ ...p, qty: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">No Invoice</label>
                <input
                  className="w-full border p-2 rounded"
                  value={tambahForm.noInvoice}
                  onChange={(e) =>
                    setTambahForm((p) => ({ ...p, noInvoice: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">Tanggal</label>
                <input
                  type="date"
                  className="w-full border p-2 rounded text-sm"
                  value={tambahForm.tanggal}
                  onChange={(e) =>
                    setTambahForm((p) => ({ ...p, tanggal: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">Kategori Brand</label>
                <select
                  className="w-full border p-2 rounded text-sm"
                  value={tambahForm.kategoriBrand}
                  onChange={(e) =>
                    setTambahForm((p) => ({
                      ...p,
                      kategoriBrand: e.target.value,
                    }))
                  }
                >
                  <option value="">- Pilih Kategori -</option>
                  {KATEGORI_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="text-xs">
                  IMEI / No MESIN (1 per baris – WAJIB sama dengan Qty)
                </label>
                <textarea
                  rows={5}
                  className="w-full border p-2 rounded text-xs font-mono"
                  value={tambahForm.imeiList}
                  onChange={(e) =>
                    setTambahForm((p) => ({ ...p, imeiList: e.target.value }))
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

      {/* MODAL EDIT MASTER */}
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
                    setEditData((p) => ({ ...p, brand: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">Barang</label>
                <input
                  className="w-full border p-2 rounded text-sm"
                  value={editData.barang}
                  onChange={(e) =>
                    setEditData((p) => ({ ...p, barang: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">No Invoice</label>
                <input
                  className="w-full border p-2 rounded text-sm"
                  value={editData.noInvoiceSample}
                  onChange={(e) =>
                    setEditData((p) => ({
                      ...p,
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
                    setEditData((p) => ({ ...p, hargaSup: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">Harga Unit</label>
                <input
                  type="number"
                  className="w-full border p-2 rounded text-sm"
                  value={editData.hargaUnit}
                  onChange={(e) =>
                    setEditData((p) => ({ ...p, hargaUnit: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">Stok Sistem</label>
                <input
                  type="number"
                  min={0}
                  className="w-full border p-2 rounded text-sm"
                  value={editData.stokSistem}
                  onChange={(e) =>
                    setEditData((p) => ({
                      ...p,
                      stokSistem: Number(e.target.value),
                    }))
                  }
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Saat simpan: Stok Sistem akan otomatis disesuaikan dengan
                  jumlah IMEI, atau IMEI akan dipotong dari bawah jika lebih
                  banyak dari stok.
                </p>
              </div>

              <div>
                <label className="text-xs">Tanggal</label>
                <input
                  type="date"
                  className="w-full border p-2 rounded text-sm"
                  value={editData.tanggal}
                  onChange={(e) =>
                    setEditData((p) => ({ ...p, tanggal: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-xs">Kategori Brand</label>
                <select
                  className="w-full border p-2 rounded text-sm"
                  value={editData.kategoriBrand}
                  onChange={(e) =>
                    setEditData((p) => ({
                      ...p,
                      kategoriBrand: e.target.value,
                    }))
                  }
                >
                  <option value="">- Pilih Kategori -</option>
                  {KATEGORI_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs">IMEI / No MESIN (1 per baris)</label>
                <textarea
                  rows={4}
                  className="w-full border p-2 rounded text-xs font-mono"
                  value={editData.imeiList}
                  onChange={(e) =>
                    setEditData((p) => ({ ...p, imeiList: e.target.value }))
                  }
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  • IMEI tidak boleh sama. • Jumlah IMEI akan disinkronkan
                  dengan Stok Sistem sesuai aturan A1 & B1.
                </p>
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
