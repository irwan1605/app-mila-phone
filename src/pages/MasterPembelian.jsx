// MasterPembelian.jsx — fixed addStock signature (ensure sku passed)
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  listenAllTransaksi,
  addTransaksi,
  updateTransaksi,
  deleteTransaksi,
  addStock,
  reduceStock,
  listenMasterToko,
  listenMasterKategoriBarang,
  addLogPembelian,
  listenStockAll,
  listenMasterBarang,
  listenMasterSupplier,
  addMasterSupplier,
  listenMasterBarangBundling,
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
import TabelPembelianDraft from "./table/TabelPembelianDraft";
import CetakInvoicePembelian from "./Print/CetakInvoicePembelian";

// (omitting repeated comments for brevity in this preview)

const TOKO_LIST = [
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

const KATEGORI_WAJIB_IMEI = ["SEPEDA LISTRIK", "MOTOR LISTRIK", "HANDPHONE"];

const fmt = (n) => {
  try {
    return Number(n || 0).toLocaleString("id-ID");
  } catch {
    return String(n || "");
  }
};

const makeSku = (brand, barang) =>
  `${(brand || "").trim()}_${(barang || "").trim()}`.replace(/\s+/g, "_");

const generateNoDo = (allTransaksi, tanggal) => {
  const tgl = (tanggal || "").replaceAll("-", "");
  const todayInv = (allTransaksi || []).filter(
    (t) =>
      String(t.NO_INVOICE || "").startsWith(`INV-${tgl}`) &&
      (t.PAYMENT_METODE || "").toUpperCase() === "PEMBELIAN"
  );

  const lastNumber = todayInv.length
    ? Math.max(
        ...todayInv.map((t) =>
          Number(
            String(t.NO_INVOICE || "")
              .split("-")
              .pop() || 0
          )
        )
      )
    : 0;

  const next = String(lastNumber + 1).padStart(4, "0");
  return `INV-${tgl}-${next}`;
};

export default function MasterPembelian() {
  const [allTransaksi, setAllTransaksi] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const tableRef = useRef(null);
  const [showTambah, setShowTambah] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const TODAY = new Date().toISOString().slice(0, 10);
  const [tokoTujuan, setTokoTujuan] = useState("CILANGKAP PUSAT");
  const [masterToko, setMasterToko] = useState([]);
  const [kategoriOptions, setKategoriOptions] = useState([]);
  const [stockSnapshot, setStockSnapshot] = useState({});
  const [masterBarang, setMasterBarang] = useState([]);
  const [masterSupplier, setMasterSupplier] = useState([]);
  const [masterBundling, setMasterBundling] = useState([]);
  const [draftItems, setDraftItems] = useState([]); // ← KERANJANG PEMBELIAN
  const [editDraftId, setEditDraftId] = useState(null);
  const [showDraftTable, setShowDraftTable] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);

  const masterBarangMap = useMemo(() => {
    const map = {};

    masterBarang.forEach((b) => {
      if (!b.brand || !b.namaBarang) return;

      const key = `${b.brand}|${b.namaBarang}`;

      map[key] = {
        hargaSRP: Number(b.harga?.srp ?? b.hargaSRP ?? 0),
        hargaGrosir: Number(b.harga?.grosir ?? b.hargaGrosir ?? 0),
        hargaReseller: Number(b.harga?.reseller ?? b.hargaReseller ?? 0),
        isBundling: Boolean(b.IS_BUNDLING),
        bundlingItems: Array.isArray(b.BUNDLING_ITEMS) ? b.BUNDLING_ITEMS : [],
      };
    });

    return map;
  }, [masterBarang]);

  const [tambahForm, setTambahForm] = useState({
    tanggal: TODAY,
    noDo: "",
    supplier: "",
    namaToko: "",
    brand: "",
    kategoriBrand: "",
    barang: "",
    hargaSup: "",
    imeiList: "",
    qty: 1,
    namaBandling1: "",
    hargaBandling1: 0,
    namaBandling2: "",
    hargaBandling2: 0,
    namaBandling3: "",
    hargaBandling3: 0,
  });

  useEffect(() => {
    // RESET bundling default
    setTambahForm((prev) => ({
      ...prev,
      isBundling: false,
      bundlingItems: [],
    }));

    // MOTOR & SEPEDA → bundling harga 0
    if (
      tambahForm.kategoriBrand === "MOTOR LISTRIK" ||
      tambahForm.kategoriBrand === "SEPEDA LISTRIK"
    ) {
      const bundlingList = masterBundling.map((b) => ({
        namaBarang: b.namaBarang,
        harga: 0,
      }));

      setTambahForm((prev) => ({
        ...prev,
        isBundling: true,
        bundlingItems: bundlingList,
      }));
    }

    // ACCESSORIES → harga dari master bundling
    if (tambahForm.kategoriBrand === "ACCESSORIES") {
      const bundlingList = masterBundling.map((b) => ({
        namaBarang: b.namaBarang,
        harga: Number(b.hargaBundling || 0),
      }));

      if (bundlingList.length > 0) {
        setTambahForm((prev) => ({
          ...prev,
          isBundling: true,
          bundlingItems: bundlingList,
        }));
      }
    }
  }, [tambahForm.kategoriBrand, masterBundling]);

  useEffect(() => {
    setTambahForm((prev) => ({
      ...prev,
      barang: "",
    }));
  }, [tambahForm.brand]);

  const [editData, setEditData] = useState(null);

  useEffect(() => {
    const unsub = listenMasterSupplier((rows) => {
      setMasterSupplier(rows || []);
    });
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    const unsub = listenMasterBarangBundling((rows) => {
      setMasterBundling(rows || []);
    });
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    const unsub = listenMasterBarang((rows) => {
      setMasterBarang(rows || []);
    });
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    const unsub = listenStockAll((snap) => {
      setStockSnapshot(snap || {});
    });
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    const unsub = listenMasterKategoriBarang((rows) => {
      setKategoriOptions(rows.map((r) => r.namaKategori));
    });
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    const unsub = listenMasterToko((rows) => {
      setMasterToko(rows || []);
    });
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    const unsub =
      typeof listenAllTransaksi === "function"
        ? listenAllTransaksi((rows) => {
            setAllTransaksi(rows || []);
          })
        : null;

    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    if (showTambah && tambahForm.tanggal) {
      const autoNo = generateNoDo(allTransaksi, tambahForm.tanggal);
      setTambahForm((prev) => ({ ...prev, noDo: autoNo }));
    }
  }, [showTambah, tambahForm.tanggal, allTransaksi]);

  const masterBarangList = useMemo(() => {
    const map = {};
    (allTransaksi || []).forEach((t) => {
      if (!t.NAMA_BRAND || !t.NAMA_BARANG) return;
      const keyGroup = `${t.NAMA_BRAND}|${t.NAMA_BARANG}`;
      if (!map[keyGroup]) {
        map[keyGroup] = {
          brand: t.NAMA_BRAND,
          barang: t.NAMA_BARANG,
          kategoriBrand: t.KATEGORI_BRAND || "",
          NAMA_BANDLING_1: t.NAMA_BANDLING_1 || "",
          HARGA_BANDLING_1: Number(t.HARGA_BANDLING_1 || 0),
          NAMA_BANDLING_2: t.NAMA_BANDLING_2 || "",
          HARGA_BANDLING_2: Number(t.HARGA_BANDLING_2 || 0),
          NAMA_BANDLING_3: t.NAMA_BANDLING_3 || "",
          HARGA_BANDLING_3: Number(t.HARGA_BANDLING_3 || 0),
          IS_BANDLING: t.IS_BANDLING || false,
          TIPE_BANDLING: t.TIPE_BANDLING || "",
        };
      }
    });
    return Object.values(map);
  }, [allTransaksi]);

  const selectedMasterBarang = useMemo(() => {
    return masterBarangList.find(
      (x) => x.brand === tambahForm.brand && x.barang === tambahForm.barang
    );
  }, [masterBarangList, tambahForm.brand, tambahForm.barang]);

  useEffect(() => {
    if (!selectedMasterBarang) return;

    setTambahForm((prev) => ({
      ...prev,
      namaBandling1: selectedMasterBarang.NAMA_BANDLING_1 || "",
      hargaBandling1: Number(selectedMasterBarang.HARGA_BANDLING_1 || 0),
      namaBandling2: selectedMasterBarang.NAMA_BANDLING_2 || "",
      hargaBandling2: Number(selectedMasterBarang.HARGA_BANDLING_2 || 0),
      namaBandling3: selectedMasterBarang.NAMA_BANDLING_3 || "",
      hargaBandling3: Number(selectedMasterBarang.HARGA_BANDLING_3 || 0),
    }));
  }, [selectedMasterBarang]);

  const isBandlingItem = selectedMasterBarang?.IS_BANDLING === true;
  const tipeBandling = selectedMasterBarang?.TIPE_BANDLING || "";

  const supplierOptions = useMemo(() => {
    return masterSupplier.map((s) => s.namaSupplier).filter(Boolean);
  }, [masterSupplier]);

  // ===============================
  // BRAND LIST DARI MASTER BARANG (FINAL)
  // ===============================
  const brandList = useMemo(() => {
    if (!tambahForm.kategoriBrand) return [];

    const set = new Set();

    masterBarang.forEach((b) => {
      if (b.kategoriBarang === tambahForm.kategoriBrand && b.brand) {
        set.add(b.brand);
      }
    });

    return Array.from(set).sort();
  }, [masterBarang, tambahForm.kategoriBrand]);

  // const brandOptions = useMemo(() => {
  //   return Array.from(
  //     new Set(masterBarang.map((b) => b.NAMA_BRAND).filter(Boolean))
  //   );
  // }, [masterBarang]);

  const namaBarangOptionsEdit = useMemo(() => {
    return masterBarang
      .filter(
        (b) =>
          (!editData?.brand || b.namaBrand === editData.brand) &&
          (!editData?.kategoriBrand ||
            b.kategoriBarang === editData.kategoriBrand)
      )
      .map((b) => b.namaBarang)
      .filter(Boolean);
  }, [masterBarang, editData?.brand, editData?.kategoriBrand]);

  const namaBarangOptions = useMemo(() => {
    return masterBarang
      .filter(
        (b) =>
          // filter BRAND
          (!tambahForm.brand || b.namaBrand === tambahForm.brand) &&
          // filter KATEGORI (jika dipilih)
          (!tambahForm.kategoriBrand ||
            b.kategoriBarang === tambahForm.kategoriBrand)
      )
      .map((b) => b.namaBarang)
      .filter(Boolean);
  }, [masterBarang, tambahForm.brand, tambahForm.kategoriBrand]);

  // const namaBarangOptions = useMemo(() => {
  //   if (!tambahForm.brand) {
  //     return Array.from(
  //       new Set(masterBarangList.map((x) => x.barang).filter(Boolean))
  //     );
  //   }
  //   return Array.from(
  //     new Set(
  //       masterBarangList
  //         .filter((x) => x.brand === tambahForm.brand)
  //         .map((x) => x.barang)
  //         .filter(Boolean)
  //     )
  //   );
  // }, [masterBarangList, tambahForm.brand]);

  const getAllDraftImeis = () => {
    return draftItems.flatMap((d) => d.imeis || []);
  };

  const handleAddDraftItem = () => {
    const { brand, kategoriBrand, barang, hargaSup, imeiList, qty } =
      tambahForm;

    if (!brand || !kategoriBrand || !barang || !hargaSup) {
      alert("Lengkapi data barang terlebih dahulu");
      return;
    }

    let finalQty = 0;
    let imeis = [];

    const isKategoriImei = KATEGORI_WAJIB_IMEI.includes(kategoriBrand);

    if (isKategoriImei) {
      imeis = String(imeiList || "")
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);

      if (!imeis.length) {
        alert("IMEI wajib diisi");
        return;
      }

      /* ===============================
         VALIDASI DUPLIKASI IMEI
      =============================== */

      // 1. duplikat di textarea
      const seen = new Set();
      const dupLocal = imeis.find((i) => {
        if (seen.has(i)) return true;
        seen.add(i);
        return false;
      });
      if (dupLocal) {
        alert(`❌ IMEI duplikat di input: ${dupLocal}`);
        return;
      }

      // 2. duplikat antar draft
      const draftImeis = getAllDraftImeis();
      const dupDraft = imeis.find((i) => draftImeis.includes(i));
      if (dupDraft) {
        alert(`❌ IMEI ${dupDraft} sudah ada di daftar pembelian sementara`);
        return;
      }

      // 3. duplikat di database
      const err = validateImeisNew(imeis);
      if (err.length) {
        alert(err.join("\n"));
        return;
      }

      finalQty = imeis.length;
    } else {
      finalQty = Number(qty || 0);
      if (!finalQty) {
        alert("Qty wajib diisi");
        return;
      }
    }

    setDraftItems((prev) => [
      ...prev,
      {
        id: Date.now(),
        tanggal: tambahForm.tanggal,
        noDo: tambahForm.noDo,
        supplier: tambahForm.supplier,
        namaToko: tokoTujuan,

        brand,
        kategoriBrand,
        barang,

        hargaSup: Number(hargaSup),
        qty: finalQty,
        imeis,

        bundlingItems: tambahForm.bundlingItems || [],

        total: Number(hargaSup) * finalQty,
      },
    ]);

    // reset form BARANG SAJA (DO tetap)
    setTambahForm((p) => ({
      ...p,
      brand: "",
      kategoriBrand: "",
      barang: "",
      hargaSup: "",
      imeiList: "",
      qty: 1,
    }));
  };

  const groupedPembelian = useMemo(() => {
    const map = {};

    (allTransaksi || []).forEach((t) => {
      if ((t.PAYMENT_METODE || "").toUpperCase() !== "PEMBELIAN") return;

      const brand = t.NAMA_BRAND || "";
      const barang = t.NAMA_BARANG || "";

      const keyGroup = `${t.TANGGAL_TRANSAKSI}|${t.NO_INVOICE}|${brand}|${barang}`;

      // 🔗 JOIN KE MASTER BARANG (REALTIME)
      const masterKey = `${brand}|${barang}`;
      const masterRef = masterBarangMap[masterKey] || {};

      if (!map[keyGroup]) {
        map[keyGroup] = {
          tanggal: t.TANGGAL_TRANSAKSI,
          noDo: t.NO_INVOICE,
          supplier: t.NAMA_SUPPLIER,
          namaToko: t.NAMA_TOKO,
          brand,
          barang,
          kategoriBrand: t.KATEGORI_BRAND,

          // 🔥 MASTER BARANG (FIX)
          hargaSRP: masterRef.hargaSRP || 0,
          hargaGrosir: masterRef.hargaGrosir || 0,
          hargaReseller: masterRef.hargaReseller || 0,
          isBundling: masterRef.isBundling || false,
          bundlingItems: masterRef.bundlingItems || [],

          // 🔥 PEMBELIAN
          hargaSup: Number(t.HARGA_SUPLAYER || 0),
          imeis: [],
          totalQty: 0,
          totalHargaSup: 0,
        };
      }

      const qty = Number(t.QTY || 0);
      map[keyGroup].totalQty += qty;
      map[keyGroup].totalHargaSup += qty * Number(t.HARGA_SUPLAYER || 0);

      if (t.IMEI) {
        map[keyGroup].imeis.push(String(t.IMEI));
      }
    });

    return Object.values(map).sort(
      (a, b) => new Date(b.tanggal) - new Date(a.tanggal)
    );
  }, [allTransaksi, masterBarangMap]);

  const filteredPurchases = useMemo(() => {
    const q = String(search || "").toLowerCase();
    if (!q) return groupedPembelian;

    return groupedPembelian.filter((v) => {
      return (
        String(v.tanggal || "")
          .toLowerCase()
          .includes(q) ||
        String(v.noDo || "")
          .toLowerCase()
          .includes(q) ||
        String(v.supplier || "")
          .toLowerCase()
          .includes(q) ||
        String(v.brand || "")
          .toLowerCase()
          .includes(q) ||
        String(v.barang || "")
          .toLowerCase()
          .includes(q) ||
        String(v.kategoriBrand || "")
          .toLowerCase()
          .includes(q) ||
        (v.imeis || []).some((im) =>
          String(im || "")
            .toLowerCase()
            .includes(q)
        )
      );
    });
  }, [groupedPembelian, search]);

  const totalPages =
    Math.ceil((filteredPurchases.length || 1) / itemsPerPage) || 1;

  const paginatedPurchases = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPurchases.slice(start, start + itemsPerPage);
  }, [filteredPurchases, currentPage]);

  const validateImeisNew = (imeiLines) => {
    const errors = [];
    const seen = new Set();

    for (const im of imeiLines) {
      if (seen.has(im)) {
        errors.push(`IMEI / No MESIN duplikat di input: ${im}`);
      }
      seen.add(im);
    }
    if (errors.length) return errors;

    for (const im of imeiLines) {
      const conflict = (allTransaksi || []).find((t) => {
        const tImei = String(t.IMEI || "").trim();
        if (!tImei) return false;
        return tImei === im;
      });

      if (conflict) {
        errors.push(
          `IMEI / No MESIN ${im} sudah dipakai di ${conflict.NAMA_BRAND} - ${
            conflict.NAMA_BARANG
          } (Supplier: ${conflict.NAMA_SUPPLIER || "-"})`
        );
        break;
      }
    }
    return errors;
  };

  const validateImeisEdit = (imeiLines, originalGroupKey) => {
    const errors = [];
    const seen = new Set();

    for (const im of imeiLines) {
      if (seen.has(im)) {
        errors.push(`IMEI / No MESIN duplikat di input: ${im}`);
      }
      seen.add(im);
    }
    if (errors.length) return errors;

    for (const im of imeiLines) {
      const conflict = (allTransaksi || []).find((t) => {
        const tImei = String(t.IMEI || "").trim();
        if (!tImei || tImei !== im) return false;

        const k = `${t.TANGGAL_TRANSAKSI || ""}|${t.NO_INVOICE || ""}|${
          t.NAMA_SUPPLIER || ""
        }|${t.NAMA_BRAND || ""}|${t.NAMA_BARANG || ""}`;

        if (k === originalGroupKey) return false;
        return true;
      });

      if (conflict) {
        errors.push(
          `IMEI / No MESIN ${im} sudah dipakai di ${conflict.NAMA_BRAND} - ${
            conflict.NAMA_BARANG
          } (Supplier: ${conflict.NAMA_SUPPLIER || "-"})`
        );
        break;
      }
    }
    return errors;
  };

  const deletePembelian = async (item) => {
    if (
      !window.confirm(
        `Hapus semua transaksi pembelian untuk:\n${item.tanggal} - DO: ${item.noDo}\nSupplier: ${item.supplier}\n${item.brand} - ${item.barang}\n(Qty: ${item.totalQty}) ?`
      )
    ) {
      return;
    }

    const keyGroup = `${item.tanggal || ""}|${item.noDo || ""}|${
      item.supplier || ""
    }|${item.brand || ""}|${item.barang || ""}`;

    const rows = (allTransaksi || []).filter((t) => {
      if ((t.PAYMENT_METODE || "").toUpperCase() !== "PEMBELIAN") return false;
      const k = `${t.TANGGAL_TRANSAKSI || ""}|${t.NO_INVOICE || ""}|${
        t.NAMA_SUPPLIER || ""
      }|${t.NAMA_BRAND || ""}|${t.NAMA_BARANG || ""}`;
      return k === keyGroup;
    });

    try {
      for (const r of rows) {
        const tokoId = r.tokoId || 1;
        if (r.id) {
          await deleteTransaksi(tokoId, r.id);
        }
      }

      const sku = makeSku(item.brand, item.barang);
      try {
        await reduceStock("CILANGKAP PUSAT", sku, item.totalQty);
      } catch (e) {
        console.warn("reduceStock gagal:", e);
      }

      alert("✅ Data pembelian & stok berhasil dihapus.");
    } catch (err) {
      console.error("deletePembelian error:", err);
      alert("❌ Gagal menghapus data.");
    }
  };

  const openEdit = (item) => {
    const hasPenjualan = (allTransaksi || []).some(
      (t) =>
        (t.PAYMENT_METODE || "").toUpperCase() === "PENJUALAN" &&
        t.NAMA_BRAND === item.brand &&
        t.NAMA_BARANG === item.barang &&
        t.NAMA_TOKO === item.namaToko
    );

    if (hasPenjualan) {
      alert(
        "❌ Pembelian tidak bisa diedit karena sebagian barang sudah terjual.\n\nGunakan fitur RETUR atau PENYESUAIAN STOK."
      );
      return;
    }

    setEditData({
      ...item,
      imeiList: (item.imeis || []).join("\n"),
      originalToko: item.namaToko,
      originalKey: `${item.tanggal}|${item.noDo}|${item.supplier}|${item.brand}|${item.barang}`,
      hargaSup: item.hargaSup || 0,
    });
    setShowEdit(true);
  };

  const saveEdit = async () => {
    if (!editData) return;

    const oldToko = editData.originalToko || "CILANGKAP PUSAT";
    const newToko = editData.namaToko || "CILANGKAP PUSAT";
    const sku = makeSku(editData.brand, editData.barang);

    const isKategoriImei = KATEGORI_WAJIB_IMEI.includes(editData.kategoriBrand);
    const isAccessories = editData.kategoriBrand === "ACCESORIES";

    // ===============================
    // AMBIL DATA TRANSAKSI LAMA
    // ===============================
    const rows = (allTransaksi || []).filter((t) => {
      if ((t.PAYMENT_METODE || "").toUpperCase() !== "PEMBELIAN") return false;
      const k = `${t.TANGGAL_TRANSAKSI || ""}|${t.NO_INVOICE || ""}|${
        t.NAMA_SUPPLIER || ""
      }|${t.NAMA_BRAND || ""}|${t.NAMA_BARANG || ""}`;
      return k === editData.originalKey;
    });

    if (!rows.length) {
      alert("Data pembelian tidak ditemukan.");
      return;
    }

    const originalQty = rows.reduce((sum, r) => sum + Number(r.QTY || 0), 0);

    // ===============================
    // HITUNG QTY BARU
    // ===============================
    let imeis = [];
    let newQty = originalQty;

    if (isKategoriImei) {
      imeis = String(editData.imeiList || "")
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);

      const err = validateImeisEdit(imeis, editData.originalKey);
      if (err.length) {
        alert(err.join("\n"));
        return;
      }

      newQty = imeis.length;
    } else if (isAccessories) {
      newQty = Number(editData.totalQty || originalQty);
    }

    // ===============================
    // PINDAH TOKO (JIKA BERUBAH)
    // ===============================
    if (oldToko !== newToko) {
      await reduceStock(oldToko, sku, originalQty);
      await addStock(newToko, sku, {
        namaBrand: editData.brand,
        namaBarang: editData.barang,
        qty: originalQty,
      });
    }

    // ===============================
    // UPDATE QTY (DELTA)
    // ===============================
    const diffQty = newQty - originalQty;

    // ==================================================
    // ⛔ PASANG KODE VALIDASI STOK DI SINI (WAJIB)
    // ==================================================
    const currentStock = stockSnapshot?.[newToko]?.[sku]?.qty || 0;

    if (diffQty < 0 && currentStock < Math.abs(diffQty)) {
      alert(
        `❌ Stok ${newToko} tidak mencukupi.\n\nStok tersedia: ${currentStock}\nPengurangan diminta: ${Math.abs(
          diffQty
        )}`
      );
      return;
    }

    if (diffQty < 0) {
      await reduceStock(newToko, sku, Math.abs(diffQty));
    } else if (diffQty > 0) {
      await addStock(newToko, sku, {
        namaBrand: editData.brand,
        namaBarang: editData.barang,
        qty: diffQty,
      });
    }

    // ===============================
    // UPDATE / REPLACE TRANSAKSI
    // ===============================
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      await updateTransaksi(r.tokoId || 1, r.id, {
        ...r,
        TANGGAL_TRANSAKSI: editData.tanggal,
        NO_INVOICE: editData.noDo,
        NAMA_SUPPLIER: editData.supplier,
        NAMA_TOKO: newToko,
        NAMA_BRAND: editData.brand,
        NAMA_BARANG: editData.barang,
        KATEGORI_BRAND: editData.kategoriBrand,
        HARGA_SUPLAYER: Number(editData.hargaSup),
        TOTAL: Number(editData.hargaSup),
        IMEI: imeis[i] || "",
      });
    }

    await addLogPembelian({
      action: "EDIT_PEMBELIAN",
      user: "SYSTEM", // nanti bisa diganti user login
      oldToko,
      newToko,
      brand: editData.brand,
      barang: editData.barang,
      originalQty,
      newQty,
      diffQty,
    });

    alert("✅ Edit pembelian berhasil & stok sinkron realtime.");
    setShowEdit(false);
  };

  const handleTambahChange = (keyGroup, value) => {
    setTambahForm((prev) => {
      const next = { ...prev, [keyGroup]: value };

      const isKategoriImei = KATEGORI_WAJIB_IMEI.includes(
        keyGroup === "kategoriBrand" ? value : prev.kategoriBrand
      );

      if (keyGroup === "imeiList" || keyGroup === "kategoriBrand") {
        const imeis = String(
          keyGroup === "imeiList" ? value : prev.imeiList || ""
        )
          .split("\n")
          .map((x) => x.trim())
          .filter(Boolean);

        if (isKategoriImei) {
          next.qty = imeis.length || 0;
        }
      }

      return next;
    });
  };

  const submitTambah = async () => {
    const {
      tanggal,
      noDo,
      supplier,
      brand,
      kategoriBrand,
      barang,
      hargaSup,
      imeiList,
      qty,
    } = tambahForm;

    // ===== CEK DUPLIKAT IMEI DI SEMUA DRAFT =====
    const allDraftImeis = getAllDraftImeis();
    const seenDraft = new Set();
    for (const im of allDraftImeis) {
      if (seenDraft.has(im)) {
        alert(`❌ IMEI duplikat di daftar pembelian: ${im}`);
        return;
      }
      seenDraft.add(im);
    }

    const isKategoriImei = KATEGORI_WAJIB_IMEI.includes(kategoriBrand);
    const isAccessories = kategoriBrand === "ACCESORIES";

    if (!tanggal) return alert("Tanggal wajib diisi.");
    if (!noDo) return alert("No Delivery Order wajib diisi.");
    if (!supplier) return alert("Nama Supplier wajib diisi.");
    // ===============================
    // AUTO TAMBAH SUPPLIER KE MASTER
    // ===============================
    const supplierExists = masterSupplier.some(
      (s) =>
        s.namaSupplier?.toLowerCase().trim() === supplier.toLowerCase().trim()
    );

    if (!supplierExists) {
      await addMasterSupplier({
        namaSupplier: supplier,
        createdAt: Date.now(),
        source: "MASTER PEMBELIAN",
      });
    }

    if (!brand) return alert("Nama Brand wajib diisi.");
    if (!kategoriBrand) return alert("Kategori Brand wajib dipilih.");
    if (!barang) return alert("Nama Barang wajib diisi.");
    const hSup = Number(hargaSup || 0);
    if (!hSup || hSup <= 0) return alert("Harga Supplier harus lebih dari 0.");

    let finalQty = 0;
    let imeis = [];

    if (isKategoriImei) {
      imeis = String(imeiList || "")
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);

      if (imeis.length <= 0) {
        return alert("Silahkan isi Nomor IMEI Terlebih dahulu");
      }

      const err = validateImeisNew(imeis);
      if (err.length) {
        alert(err.join("\n"));
        return;
      }

      finalQty = imeis.length;
    } else if (isAccessories) {
      finalQty = Number(qty || 0);
      if (!finalQty || finalQty <= 0) {
        return alert("Qty wajib diisi untuk ACCESORIES.");
      }
    } else {
      finalQty = Number(qty || 0);
      if (!finalQty || finalQty <= 0) {
        return alert("Qty wajib diisi.");
      }
    }

    let hargaBandlingDipakai = 0;

    if (isBandlingItem && tipeBandling === "1") {
      hargaBandlingDipakai = Number(
        selectedMasterBarang?.HARGA_BANDLING_1 || 0
      );
    }
    if (isBandlingItem && tipeBandling === "2") {
      hargaBandlingDipakai = Number(
        selectedMasterBarang?.HARGA_BANDLING_2 || 0
      );
    }
    if (isBandlingItem && tipeBandling === "3") {
      hargaBandlingDipakai = Number(
        selectedMasterBarang?.HARGA_BANDLING_3 || 0
      );
    }

    const namaToko = tokoTujuan;
    const tokoId = TOKO_LIST.indexOf(tokoTujuan) + 1;

    const sku = makeSku(brand, barang);

    try {
      /* ===============================
         IMEI → 1 BARIS PER IMEI
      =============================== */
      if (isKategoriImei) {
        for (const im of imeis) {
          const payload = {
            TANGGAL_TRANSAKSI: tanggal,
            NO_INVOICE: noDo,
            NAMA_SUPPLIER: supplier,
            NAMA_USER: "SYSTEM",
            NAMA_TOKO: namaToko,

            NAMA_BRAND: brand,
            KATEGORI_BRAND: kategoriBrand,
            NAMA_BARANG: barang,

            QTY: 1,
            IMEI: im,
            NOMOR_UNIK: `PEMBELIAN|${brand}|${barang}|${im}`,

            HARGA_SUPLAYER: hSup,
            HARGA_UNIT: hSup,
            TOTAL: hSup,

            IS_BUNDLING: isBandlingItem,
            BUNDLING_ITEMS: tambahForm.bundlingItems || [],
            HARGA_BANDLING_DIPAKAI: hargaBandlingDipakai,

            PAYMENT_METODE: "PEMBELIAN",
            SYSTEM_PAYMENT: "SYSTEM",
            STATUS: "Approved",
            CREATED_AT: Date.now(),
          };

          await addTransaksi(tokoId, payload);
        }
      } else {
        /* ===============================
         NON IMEI → 1 BARIS PER BARANG
      =============================== */
        const payload = {
          TANGGAL_TRANSAKSI: tanggal,
          NO_INVOICE: noDo,
          NAMA_SUPPLIER: supplier,
          NAMA_USER: "SYSTEM",
          NAMA_TOKO: namaToko,

          NAMA_BRAND: brand,
          KATEGORI_BRAND: kategoriBrand,
          NAMA_BARANG: barang,

          QTY: finalQty,
          IMEI: "",

          HARGA_SUPLAYER: hSup,
          HARGA_UNIT: hSup,
          TOTAL: hSup * finalQty,

          IS_BUNDLING: isBandlingItem,
          BUNDLING_ITEMS: tambahForm.bundlingItems || [],
          HARGA_BANDLING_DIPAKAI: hargaBandlingDipakai,

          PAYMENT_METODE: "PEMBELIAN",
          SYSTEM_PAYMENT: "SYSTEM",
          STATUS: "Approved",
          CREATED_AT: Date.now(),
        };

        await addTransaksi(tokoId, payload);
      }

      // Tambah stok toko tujuan (TAPI JANGAN lakukan jika tokoTujuan = CILANGKAP PUSAT)
      if (tokoTujuan && tokoTujuan !== "CILANGKAP PUSAT") {
        await addStock(tokoTujuan, sku, {
          brand: tambahForm.brand,
          barang: tambahForm.barang,
          qty: finalQty,
          NAMA_BANDLING_1: selectedMasterBarang?.NAMA_BANDLING_1 || "",
          HARGA_BANDLING_1: selectedMasterBarang?.HARGA_BANDLING_1 || 0,
          NAMA_BANDLING_2: selectedMasterBarang?.NAMA_BANDLING_2 || "",
          HARGA_BANDLING_2: selectedMasterBarang?.HARGA_BANDLING_2 || 0,
          NAMA_BANDLING_3: selectedMasterBarang?.NAMA_BANDLING_3 || "",
          HARGA_BANDLING_3: selectedMasterBarang?.HARGA_BANDLING_3 || 0,
        });
      }

      alert(
        `✅ Pembelian berhasil disimpan\n
      📦 Toko Tujuan : ${tokoTujuan}
      🏷 Brand : ${brand}
      📱 Barang : ${barang}
      📊 Qty : ${finalQty}
      
      • Data masuk Master Pembelian
      • Stok CILANGKAP PUSAT bertambah
      • Stok ${tokoTujuan} otomatis bertambah`
      );

      /* ===============================
       UPDATE STOK TOKO TUJUAN
    =============================== */
      if (tokoTujuan && tokoTujuan !== "CILANGKAP PUSAT") {
        await addStock(tokoTujuan, sku, {
          brand,
          barang,
          qty: finalQty,
        });
      }

      if (isBandlingItem) {
        const skuBandling = `BANDLING-${tipeBandling}`;

        await addStock("CILANGKAP PUSAT", skuBandling, {
          namaBrand: "BANDLING",
          namaBarang:
            tipeBandling === "1"
              ? selectedMasterBarang?.NAMA_BANDLING_1
              : tipeBandling === "2"
              ? selectedMasterBarang?.NAMA_BANDLING_2
              : selectedMasterBarang?.NAMA_BANDLING_3,
          kategoriBrand: "ACCESORIES",
          qty: finalQty,
        });
      }

      setShowTambah(false);
      setTambahForm({
        tanggal: new Date().toISOString().slice(0, 10),
        noDo: "",
        supplier: "",
        namaToko: "",
        brand: "",
        kategoriBrand: "",
        barang: "",
        hargaSup: "",
        imeiList: "",
        qty: 1,
      });
    } catch (err) {
      console.error("submitTambah error:", err);
      alert("❌ Gagal menyimpan pembelian.");
    }
  };

  const groupedPurchases = groupedPembelian;

  // ------------------------
  // exportExcel (FINAL FIX)
  // ------------------------
  // ------------------------
  // exportExcel (FINAL FIX - per-IMEI rows, Qty/Harga/Total konsisten)
  // ------------------------
  const exportExcel = () => {
    const expandedRows = [];

    groupedPurchases.forEach((r) => {
      const hargaSatuan = Number(r.hargaSup || 0);
      const totalQty = Number(r.totalQty || 0);
      const totalHargaGroup = Number(r.totalHargaSup || 0);

      const imeiList = (r.imeis || [])
        .map((x) => (x || "").toString().trim())
        .filter(Boolean);

      if (imeiList.length === 0) {
        // no IMEI: single row representing the whole purchase (bulk)
        expandedRows.push({
          Tanggal: r.tanggal,
          "No Delivery Order": r.noDo,
          Supplier: r.supplier,
          "Nama Toko": r.namaToko,
          "Nama Brand": r.brand,
          "Kategori Brand": r.kategoriBrand,
          "Nama Barang": r.barang,
          "No IMEI": "",
          "Harga Supplier (Satuan)": hargaSatuan || "",
          Qty: totalQty || "",
          "Total Harga Supplier": totalHargaGroup || "",
        });
      } else {
        // Has IMEIs: create one row per IMEI, each with qty=1 and harga satuan
        imeiList.forEach((imei) => {
          expandedRows.push({
            Tanggal: r.tanggal,
            "No Delivery Order": r.noDo,
            Supplier: r.supplier,
            "Nama Toko": r.namaToko,
            "Nama Brand": r.brand,
            "Kategori Brand": r.kategoriBrand,
            "Nama Barang": r.barang,
            "No IMEI": imei,
            "Harga Supplier (Satuan)": hargaSatuan || "",
            Qty: 1,
            "Total Harga Supplier": hargaSatuan || "",
          });
        });
      }
    });

    // create sheet from expanded rows
    const ws = XLSX.utils.json_to_sheet(expandedRows, { skipHeader: false });

    // ensure header order we want:
    const headerOrder = [
      "Tanggal",
      "No Delivery Order",
      "Supplier",
      "Nama Toko",
      "Nama Brand",
      "Kategori Brand",
      "Nama Barang",
      "No IMEI",
      "Harga Supplier (Satuan)",
      "Qty",
      "Total Harga Supplier",
    ];
    XLSX.utils.sheet_add_aoa(ws, [headerOrder], { origin: "A1" });
    XLSX.utils.sheet_add_json(ws, expandedRows, {
      origin: "A2",
      skipHeader: true,
    });

    // set column widths for readability
    ws["!cols"] = [
      { width: 15 }, // Tanggal
      { width: 20 }, // No DO
      { width: 25 }, // Supplier
      { width: 20 }, // Nama Brand
      { width: 18 }, // Kategori
      { width: 26 }, // Nama Barang
      { width: 36 }, // No IMEI (buat lebar agar rapi)
      { width: 20 }, // Harga Supplier (Satuan)
      { width: 8 }, // Qty
      { width: 22 }, // Total Harga Supplier
    ];

    // row height (opsional) agar tampilan lebih rapih
    ws["!rows"] = expandedRows.map(() => ({ hpt: 18 }));

    // build workbook and write file
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MasterPembelian");

    const filename = `MasterPembelian_${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
  };

  const exportPDF = async () => {
    const el = tableRef.current;
    if (!el) {
      alert("Tabel tidak ditemukan.");
      return;
    }

    const canvas = await html2canvas(el, { scale: 1.4 });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("l", "mm", "a4");
    const w = pdf.internal.pageSize.getWidth();
    const h = (canvas.height * w) / canvas.width;

    pdf.addImage(img, "PNG", 0, 0, w, h);
    pdf.save(`MasterPembelian_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // ======================= RENDER JSX =======================
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-white tracking-wide">
              MASTER PEMBELIAN
            </h2>
            <p className="text-xs md:text-sm text-slate-200/80 mt-1">
              Pusat data pembelian barang yang terhubung dengan{" "}
              <span className="font-semibold">Master Barang</span> &{" "}
              <span className="font-semibold">Stock CILANGKAP PUSAT</span>{" "}
              secara realtime.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-full text-xs md:text-sm bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 shadow-sm">
              ● Realtime Firebase
            </span>
            <span className="px-3 py-1 rounded-full text-xs md:text-sm bg-indigo-500/20 text-indigo-100 border border-indigo-400/40 shadow-sm">
              Master Data Management
            </span>
          </div>
        </div>

        {/* CARD UTAMA */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-4 md:p-6 space-y-4">
          {/* TOOLBAR */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center border border-slate-200 rounded-full px-3 py-2 w-full md:w-80 shadow-sm bg-slate-50/60">
              <FaSearch className="text-gray-500" />
              <input
                className="ml-2 flex-1 outline-none text-sm bg-transparent"
                placeholder="Cari tanggal / DO / supplier / brand / barang / IMEI..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
              />
            </div>

            <button
              onClick={() => setShowTambah(true)}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl flex items-center text-xs md:text-sm shadow-md transition transform hover:-translate-y-[1px]"
            >
              <FaPlus className="mr-2" /> Tambah Pembelian
            </button>

            <button
              onClick={exportExcel}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center text-xs md:text-sm shadow-md transition transform hover:-translate-y-[1px]"
            >
              <FaFileExcel className="mr-2" /> Excel
            </button>

            <button
              onClick={exportPDF}
              className="px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl flex items-center text-xs md:text-sm shadow-md transition transform hover:-translate-y-[1px]"
            >
              <FaFilePdf className="mr-2" /> PDF
            </button>

            <div className="ml-auto text-[11px] text-slate-500">
              Total data: {filteredPurchases.length} baris pembelian
            </div>
          </div>

          {/* TABEL */}
          <div
            ref={tableRef}
            className="bg-white rounded-2xl shadow-inner overflow-x-auto border border-slate-100 mt-2"
          >
            <table className="w-full text-xs md:text-sm border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-10">
                <tr>
                  <th className="border p-2">No</th>
                  <th className="border p-2">Tanggal</th>
                  <th className="border p-2">No DO</th>
                  <th className="border p-2">Supplier</th>
                  <th className="border p-2">Toko</th>
                  <th className="border p-2">Brand</th>
                  <th className="border p-2">Kategori</th>
                  <th className="border p-2">Nama Barang</th>
                  <th className="border p-2">IMEI / No Mesin</th>

                  {/* === MASTER BARANG === */}
                  <th className="border p-2 text-right">Harga SRP</th>
                  <th className="border p-2 text-right">Harga Grosir</th>
                  <th className="border p-2 text-right">Harga Reseller</th>
                  <th className="border p-2">Barang Bundling</th>

                  {/* === PEMBELIAN === */}
                  <th className="border p-2 text-right">Harga Supplier</th>
                  <th className="border p-2 text-center">Qty</th>
                  <th className="border p-2 text-right">Total Harga</th>
                  <th className="border p-2 text-center">Aksi</th>
                </tr>
              </thead>

              <tbody>
                {paginatedPurchases.length === 0 ? (
                  <tr>
                    <td
                      colSpan={17}
                      className="p-4 border text-center text-gray-500"
                    >
                      Tidak ada data pembelian.
                    </td>
                  </tr>
                ) : (
                  paginatedPurchases.map((item, idx) => {
                    const shownImeis =
                      search.trim() === ""
                        ? item.imeis || []
                        : (item.imeis || []).filter((im) =>
                            im.toLowerCase().includes(search.toLowerCase())
                          );

                    const bundlingItems = Array.isArray(item.bundlingItems)
                      ? item.bundlingItems
                      : [];

                    return (
                      <tr
                        key={item.key}
                        className="hover:bg-slate-50/80 transition"
                      >
                        <td className="border p-2 text-center">
                          {(currentPage - 1) * itemsPerPage + idx + 1}
                        </td>

                        <td className="border p-2">{item.tanggal}</td>
                        <td className="border p-2">{item.noDo}</td>
                        <td className="border p-2">{item.supplier}</td>
                        <td className="border p-2">{item.namaToko || "-"}</td>
                        <td className="border p-2">{item.brand}</td>
                        <td className="border p-2">
                          {item.kategoriBrand || "-"}
                        </td>
                        <td className="border p-2 font-medium">
                          {item.barang}
                        </td>

                        <td className="border p-2 whitespace-pre-wrap font-mono text-[11px]">
                          {shownImeis.length ? shownImeis.join("\n") : "-"}
                        </td>

                        {/* === MASTER BARANG === */}
                        <td className="border p-2 text-right">
                          Rp {fmt(item.hargaSRP ?? 0)}
                        </td>
                        <td className="border p-2 text-right">
                          Rp {fmt(item.hargaGrosir ?? 0)}
                        </td>
                        <td className="border p-2 text-right">
                          Rp {fmt(item.hargaReseller ?? 0)}
                        </td>

                        <td className="border p-2">
                          {(item.bundlingItems || []).length === 0 ? (
                            <span className="text-slate-400 italic">—</span>
                          ) : (
                            item.bundlingItems.map((b, i) => (
                              <div
                                key={i}
                                className="flex justify-between text-xs"
                              >
                                <span>{b.namaBarang}</span>
                                <span>Rp {fmt(b.harga)}</span>
                              </div>
                            ))
                          )}
                        </td>

                        {/* === PEMBELIAN === */}
                        <td className="border p-2 text-right">
                          Rp {fmt(item.hargaSup)}
                        </td>

                        <td className="border p-2 text-center">
                          {item.totalQty}
                        </td>

                        <td className="border p-2 text-right">
                          Rp {fmt(item.totalHargaSup)}
                        </td>

                        <td className="border p-2 text-center space-x-2">
                          <button
                            className="inline-flex items-center justify-center p-[6px] rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                            onClick={() => openEdit(item)}
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="inline-flex items-center justify-center p-[6px] rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                            onClick={() => deletePembelian(item)}
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

          {/* PAGINATION */}
          <div className="flex justify-between items-center mt-3 text-xs md:text-sm text-slate-600">
            <div>
              Halaman {currentPage} dari {totalPages}
            </div>
            <div className="flex gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className={`px-3 py-1 rounded-full border text-xs ${
                  currentPage === 1
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-white hover:bg-slate-50"
                }`}
              >
                Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1 rounded-full border text-xs ${
                    currentPage === i + 1
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white hover:bg-slate-50"
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                className={`px-3 py-1 rounded-full border text-xs ${
                  currentPage === totalPages
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : "bg-white hover:bg-slate-50"
                }`}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL TAMBAH PEMBELIAN */}
      {/* MODAL TAMBAH PEMBELIAN */}
      {showTambah && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-start py-10 z-50 overflow-y-auto">
          <div className="bg-white text-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl p-5">
            <TabelPembelianDraft
              draftItems={draftItems}
              onDelete={(id) =>
                setDraftItems((prev) => prev.filter((x) => x.id !== id))
              }
              onEdit={(item) => {
                setTambahForm({
                  ...tambahForm,
                  brand: item.brand,
                  kategoriBrand: item.kategoriBrand,
                  barang: item.barang,
                  hargaSup: item.hargaSup,
                  imeiList: (item.imeis || []).join("\n"),
                  qty: item.qty,
                });
                setDraftItems((prev) => prev.filter((x) => x.id !== item.id));
                setShowDraftTable(false);
                setShowTambah(true);
              }}
              onSubmit={() => {
                setShowDraftTable(false);
                submitTambah(); // ⬅ SIMPAN FINAL KE MASTER PEMBELIAN
              }}
              onPreview={() => {
                setShowDraftTable(false);
                setShowInvoice(true);
              }}
            />

            {showInvoice && (
              <div className="fixed inset-0 bg-black/40 z-50 flex justify-center items-start py-6 overflow-y-auto">
                <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl p-4">
                  <CetakInvoicePembelian
                    draftItems={draftItems}
                    onClose={() => setShowInvoice(false)}
                  />
                </div>
              </div>
            )}

            {/* HEADER */}
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold text-slate-800">
                Tambah Pembelian
              </h3>
              <button
                onClick={() => setShowTambah(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>

            {/* FORM */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Tanggal */}
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Tanggal
                </label>
                <input
                  type="date"
                  className="w-full border rounded-lg px-2 py-2 text-sm bg-slate-100 cursor-not-allowed"
                  value={tambahForm.tanggal}
                  min={TODAY}
                  max={TODAY}
                  readOnly
                />
              </div>

              {/* No DO */}
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  No Delivery Order
                </label>
                <input
                  className="w-full border rounded-lg px-2 py-2 text-sm bg-slate-50"
                  placeholder="No DO / SJ"
                  value={tambahForm.noDo}
                  onChange={(e) => handleTambahChange("noDo", e.target.value)}
                />
              </div>

              {/* Nama Toko */}
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Nama Toko
                </label>
                <select
                  className="input"
                  value={tokoTujuan}
                  onChange={(e) => setTokoTujuan(e.target.value)}
                >
                  <option>CILANGKAP PUSAT</option>
                  <option>CIBINONG</option>
                  <option>GAS ALAM</option>
                  <option>CITEUREUP</option>
                  <option>CIRACAS</option>
                  <option>METLAND 1</option>
                  <option>METLAND 2</option>
                  <option>PITARA</option>
                  <option>KOTA WISATA</option>
                  <option>SAWANGAN</option>
                </select>
              </div>

              {/* Supplier */}
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Nama Supplier
                </label>
                <input
                  list="supplier-list"
                  className="w-full border rounded-lg px-2 py-2 text-sm bg-slate-50"
                  placeholder="Pilih / ketik nama supplier"
                  value={tambahForm.supplier}
                  onChange={(e) =>
                    handleTambahChange("supplier", e.target.value)
                  }
                />
                <datalist id="supplier-list">
                  {supplierOptions.map((s) => (
                    <option key={s} value={s} />
                  ))}
                </datalist>
              </div>

              {/* Kategori */}
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Kategori Brand
                </label>
                <select
                  className="w-full border rounded-lg px-2 py-2 text-sm bg-slate-50"
                  value={tambahForm.kategoriBrand}
                  onChange={(e) =>
                    handleTambahChange("kategoriBrand", e.target.value)
                  }
                >
                  <option value="">- Pilih Kategori -</option>
                  {kategoriOptions.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>

              {/* Brand */}
              <div>
                <label className="text-xs font-semibold">Nama Brand</label>

                <input
                  list="brand-master-list"
                  className="input"
                  placeholder={
                    tambahForm.kategoriBrand
                      ? "Pilih Nama Brand"
                      : "Pilih Kategori dulu"
                  }
                  disabled={!tambahForm.kategoriBrand}
                  value={tambahForm.brand}
                  onChange={(e) =>
                    setTambahForm((prev) => ({
                      ...prev,
                      brand: e.target.value,
                      barang: "", // reset barang
                      imeiList: "",
                      qty: 1,
                    }))
                  }
                />

                <datalist id="brand-master-list">
                  {brandList.map((b, i) => (
                    <option key={i} value={b} />
                  ))}
                </datalist>
              </div>

              {/* Nama Barang */}
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Nama Barang
                </label>
                <input
                  list="barang-list"
                  className="w-full border rounded-lg px-2 py-2 text-sm bg-slate-50"
                  value={tambahForm.barang}
                  onChange={(e) => handleTambahChange("barang", e.target.value)}
                />
                <datalist id="barang-list">
                  {namaBarangOptions.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </div>

              {/* Harga */}
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Harga Supplier
                </label>
                <input
                  type="number"
                  className="w-full border rounded-lg px-2 py-2 text-sm bg-slate-50"
                  value={tambahForm.hargaSup}
                  onChange={(e) =>
                    handleTambahChange("hargaSup", e.target.value)
                  }
                />
              </div>

            {/* Qty */}
<div>
  <label className="text-xs font-semibold text-slate-600">
    Qty
  </label>
  <input
    type="number"
    min={1}
    className={`w-full border rounded-lg px-2 py-2 text-sm bg-slate-50 ${
      KATEGORI_WAJIB_IMEI.includes(tambahForm.kategoriBrand)
        ? "text-slate-500"
        : ""
    }`}
    value={tambahForm.qty}
    readOnly={KATEGORI_WAJIB_IMEI.includes(tambahForm.kategoriBrand)}
    onChange={(e) => {
      // ✅ HANYA ACCESSORIES & NON-IMEI BOLEH MANUAL
      if (
        !KATEGORI_WAJIB_IMEI.includes(tambahForm.kategoriBrand)
      ) {
        handleTambahChange("qty", e.target.value);
      }
    }}
  />

  {KATEGORI_WAJIB_IMEI.includes(tambahForm.kategoriBrand) && (
    <p className="text-[10px] text-amber-600 mt-1">
      Qty otomatis mengikuti jumlah IMEI
    </p>
  )}

  {tambahForm.kategoriBrand === "ACCESSORIES" && (
    <p className="text-[10px] text-emerald-600 mt-1">
      Qty dapat diinput manual untuk Accessories
    </p>
  )}
</div>

            </div>

            {/* IMEI */}
            {tambahForm.kategoriBrand !== "ACCESORIES" && (
              <div className="mt-3">
                <label className="text-xs font-semibold text-slate-600">
                  No IMEI / No Mesin (1 per baris)
                </label>
                <textarea
                  rows={4}
                  className="w-full border rounded-lg px-2 py-2 text-xs font-mono bg-slate-50"
                  value={tambahForm.imeiList}
                  onChange={(e) =>
                    handleTambahChange("imeiList", e.target.value)
                  }
                />
              </div>
            )}

            {/* ===== DRAFT TABLE ===== */}
            {draftItems.length > 0 && (
              <>
                <div className="mt-4 border rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-xs">
                    <tbody>
                      {draftItems.map((d) => (
                        <tr key={d.id}>
                          <td className="border p-2">{d.barang}</td>
                          <td className="border p-2 text-center">{d.qty}</td>
                          <td className="border p-2 text-right">
                            Rp {fmt(d.total)}
                          </td>
                          <td className="border p-2 text-center">
                            <button
                              onClick={() =>
                                setDraftItems((p) =>
                                  p.filter((x) => x.id !== d.id)
                                )
                              }
                              className="text-rose-600"
                            >
                              <FaTrash />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-3 flex justify-end font-bold">
                  Rp {fmt(draftItems.reduce((s, i) => s + i.total, 0))}
                </div>
              </>
            )}

            {/* FOOTER */}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={handleAddDraftItem}
                className="px-3 py-2 bg-emerald-600 text-white rounded-xl"
              >
                <FaPlus /> Tambah ke Daftar
              </button>
              <button
                onClick={() => setShowTambah(false)}
                className="px-3 py-1 bg-gray-400 text-white rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={handleAddDraftItem}
                className="px-3 py-2 bg-emerald-600 text-white rounded-xl"
              >
                <FaPlus /> Tambah Pembelian
              </button>
              <button
                onClick={() => setShowDraftTable(true)}
                className="px-3 py-2 bg-indigo-600 text-white rounded-xl"
              >
                Lihat Daftar Pembelian
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT PEMBELIAN */}
      {showEdit && editData && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-start py-10 z-50 overflow-y-auto">
          <div className="bg-white text-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-bold text-slate-800">
                Edit Pembelian
              </h3>
              <button
                onClick={() => setShowEdit(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FaTimes />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Tanggal */}
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Tanggal
                </label>
                <input
                  type="date"
                  className="w-full border rounded-lg px-2 py-2 text-sm bg-slate-50"
                  value={editData.tanggal}
                  onChange={(e) =>
                    setEditData((p) => ({ ...p, tanggal: e.target.value }))
                  }
                />
              </div>

              {/* No DO */}
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  No Delivery Order
                </label>
                <input
                  className="w-full border rounded-lg px-2 py-2 text-sm bg-slate-50"
                  value={editData.noDo}
                  onChange={(e) =>
                    setEditData((p) => ({ ...p, noDo: e.target.value }))
                  }
                />
              </div>

              {/* Supplier */}
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Nama Supplier
                </label>
                <input
                  list="supplier-list"
                  className="w-full border rounded-lg px-2 py-2 text-sm bg-slate-50"
                  value={editData.supplier}
                  onChange={(e) =>
                    setEditData((p) => ({ ...p, supplier: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Nama Toko
                </label>
                <select
                  value={editData.namaToko}
                  onChange={(e) =>
                    setEditData((prev) => ({
                      ...prev,
                      namaToko: e.target.value,
                    }))
                  }
                >
                  {masterToko.map((t) => (
                    <option key={t.id} value={t.namaToko}>
                      {t.namaToko}
                    </option>
                  ))}
                </select>
                <select
                  className="input"
                  value={editData.namaToko}
                  onChange={(e) =>
                    setEditData((prev) => ({
                      ...prev,
                      namaToko: e.target.value,
                    }))
                  }
                >
                  <option>CILANGKAP PUSAT</option>
                  <option>CIBINONG</option>
                  <option>GAS ALAM</option>
                  <option>CITEUREUP</option>
                  <option>CIRACAS</option>
                  <option>METLAND 1</option>
                  <option>METLAND 2</option>
                  <option>PITARA</option>
                  <option>KOTA WISATA</option>
                  <option>SAWANGAN</option>
                </select>
              </div>

              {/* Brand */}
              <input
                list="barang-list-edit"
                value={editData?.barang || ""}
                onChange={(e) =>
                  setEditData((prev) => ({
                    ...prev,
                    barang: e.target.value,
                  }))
                }
              />

              <datalist id="barang-list-edit">
                {namaBarangOptionsEdit.map((nama) => (
                  <option key={nama} value={nama} />
                ))}
              </datalist>

              {/* Kategori Brand */}
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Kategori Brand
                </label>
                <select
                  className="w-full border rounded-lg px-2 py-2 text-sm bg-slate-50"
                  value={editData.kategoriBrand}
                  onChange={(e) =>
                    setEditData((p) => ({
                      ...p,
                      kategoriBrand: e.target.value,
                    }))
                  }
                >
                  <option value="">- Pilih Kategori -</option>
                  {kategoriOptions.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nama Barang */}
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Nama Barang
                </label>
                <input
                  list="barang-list"
                  className="w-full border rounded-lg px-2 py-2 text-sm bg-slate-50"
                  value={editData.barang}
                  onChange={(e) =>
                    setEditData((p) => ({ ...p, barang: e.target.value }))
                  }
                />
              </div>

              {/* Harga Supplier */}
              <div>
                <label className="text-xs font-semibold">Harga Supplier</label>
                <input
                  type="number"
                  className="input"
                  value={editData?.hargaSup || ""}
                  onChange={(e) =>
                    setEditData((prev) => ({
                      ...prev,
                      hargaSup: Number(e.target.value || 0),
                    }))
                  }
                  placeholder="Harga Supplier"
                />
              </div>

              {/* Qty Info */}
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Qty Total (informasi)
                </label>
                <input
                  disabled
                  className="w-full border rounded-lg px-2 py-2 text-sm bg-slate-100 text-slate-500"
                  value={editData.totalQty}
                />
              </div>
            </div>

            {/* IMEI Saat Edit (kecuali ACCESORIES) */}
            {editData.kategoriBrand !== "ACCESORIES" && (
              <div className="mt-3">
                <label className="text-xs font-semibold text-slate-600">
                  IMEI / No Mesin (1 per baris)
                </label>
                <textarea
                  rows={5}
                  className="w-full border rounded-lg px-2 py-2 text-xs font-mono bg-slate-50"
                  value={editData.imeiList}
                  onChange={(e) =>
                    setEditData((p) => ({ ...p, imeiList: e.target.value }))
                  }
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  • Jumlah baris IMEI sebaiknya sama dengan total Qty.
                </p>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowEdit(false)}
                className="px-3 py-1 bg-gray-400 hover:bg-gray-500 text-white rounded-lg text-sm"
              >
                <FaTimes className="inline mr-1" /> Batal
              </button>
              <button
                onClick={saveEdit}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm flex items-center shadow-md"
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
