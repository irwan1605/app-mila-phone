// =======================
// MasterPembelian.jsx - FINAL
// =======================
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  listenAllTransaksi,
  addTransaksi,
  updateTransaksi,
  deleteTransaksi,
  addStock,
  reduceStock,
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

// =======================
// KONFIGURASI
// =======================
const KATEGORI_OPTIONS = [
  "SEPEDA LISTRIK",
  "MOTOR LISTRIK",
  "HANDPHONE",
  "ACCESORIES",
];

const BRAND_OPTIONS = [
  "OFERO",
  "UWNFLY",
  "E NINE",
  "ZXTEX",
  "UNITED",
  "RAKATA",
  "OPPO",
  "SAMSUNG",
  "REALME",
  "VIVO",
  "IPHONE",
  "ZTE NUBIA",
  "XIOMI",
  "INFINIX",
];

const KATEGORI_WAJIB_IMEI = [
  "SEPEDA LISTRIK",
  "MOTOR LISTRIK",
  "HANDPHONE",
];

const fmt = (n) => {
  try {
    return Number(n || 0).toLocaleString("id-ID");
  } catch {
    return String(n || "");
  }
};

const makeSku = (brand, barang) =>
  `${(brand || "").trim()}_${(barang || "").trim()}`.replace(/\s+/g, "_");

// =======================
// AUTO GENERATE NO DO (INV-YYYYMMDD-0001)
// =======================
const generateNoDo = (allTransaksi, tanggal) => {
  const tgl = (tanggal || "").replaceAll("-", ""); // YYYYMMDD

  const todayInv = (allTransaksi || []).filter(
    (t) =>
      String(t.NO_INVOICE || "").startsWith(`INV-${tgl}`) &&
      (t.PAYMENT_METODE || "").toUpperCase() === "PEMBELIAN"
  );

  const lastNumber = todayInv.length
    ? Math.max(
        ...todayInv.map((t) =>
          Number(String(t.NO_INVOICE || "").split("-").pop() || 0)
        )
      )
    : 0;

  const next = String(lastNumber + 1).padStart(4, "0");
  return `INV-${tgl}-${next}`;
};




// =======================
// KOMPONEN UTAMA
// =======================
export default function MasterPembelian() {
  const [allTransaksi, setAllTransaksi] = useState([]);
  const [search, setSearch] = useState("");

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const tableRef = useRef(null);

  const [showTambah, setShowTambah] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  const [tambahForm, setTambahForm] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    noDo: "",
    supplier: "",
    brand: "", // ✅ Nama Brand
    kategoriBrand: "",
    barang: "", // ✅ Nama Barang
    hargaSup: "",
    imeiList: "",
    qty: 1,
  });

  const [editData, setEditData] = useState(null);

  // ======================= REALTIME FIREBASE =======================
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
      setTambahForm((prev) => ({
        ...prev,
        noDo: autoNo,
      }));
    }
  }, [showTambah, tambahForm.tanggal, allTransaksi]);
  

  // ======================= MASTER BARANG SOURCE (Brand / Barang / Kategori) =======================
  const masterBarangList = useMemo(() => {
    const map = {};
    (allTransaksi || []).forEach((t) => {
      if (!t.NAMA_BRAND || !t.NAMA_BARANG) return;
      const key = `${t.NAMA_BRAND}|${t.NAMA_BARANG}`;
      if (!map[key]) {
        map[key] = {
          brand: t.NAMA_BRAND,
          barang: t.NAMA_BARANG,
          kategoriBrand: t.KATEGORI_BRAND || "",
        };
      }
    });
    return Object.values(map);
  }, [allTransaksi]);

  /* ======================= SUPPLIER OPTIONS (AMANKAN DARI MASTER BARANG) ======================= */
  const supplierOptions = useMemo(
    () =>
      Array.from(
        new Set(
          (allTransaksi || [])
            .filter(
              (t) =>
                (t.PAYMENT_METODE || "").toUpperCase() === "PEMBELIAN" &&
                t.NAMA_SUPPLIER &&
                t.NO_INVOICE
            )
            .map((t) => t.NAMA_SUPPLIER)
        )
      ),
    [allTransaksi]
  );
  

  // Brand: gabungan BRAND_OPTIONS + brand dari masterBarangList
  const brandOptionsDynamic = useMemo(() => {
    const set = new Set(BRAND_OPTIONS);
    masterBarangList.forEach((x) => {
      if (x.brand) set.add(x.brand);
    });
    return Array.from(set);
  }, [masterBarangList]);

  // Nama Barang: dari MasterBarang, bisa difilter by Brand
  const namaBarangOptions = useMemo(() => {
    if (!tambahForm.brand) {
      return Array.from(
        new Set(masterBarangList.map((x) => x.barang).filter(Boolean))
      );
    }
    return Array.from(
      new Set(
        masterBarangList
          .filter((x) => x.brand === tambahForm.brand)
          .map((x) => x.barang)
          .filter(Boolean)
      )
    );
  }, [masterBarangList, tambahForm.brand]);

  // ======================= GROUP DATA PEMBELIAN UNTUK TABEL =======================
  const groupedPembelian = useMemo(() => {
    const map = {};

    (allTransaksi || []).forEach((t) => {
      if (
        (t.PAYMENT_METODE || "").toUpperCase() !== "PEMBELIAN" ||
        !t.NAMA_SUPPLIER ||
        !t.NO_INVOICE
      )
        return;

      const tanggal = t.TANGGAL_TRANSAKSI || "";
      const noDo = t.NO_INVOICE || "";
      const supplier = t.NAMA_SUPPLIER || "";
      const brand = t.NAMA_BRAND || "";
      const barang = t.NAMA_BARANG || "";
      const kategoriBrand = t.KATEGORI_BRAND || "";

      const key = `${tanggal}|${noDo}|${supplier}|${brand}|${barang}`;

      if (!map[key]) {
        map[key] = {
          key,
          tanggal,
          noDo,
          supplier,
          brand,
          barang,
          kategoriBrand,
          hargaSup: Number(t.HARGA_SUPLAYER || 0),
          imeis: [],
          totalQty: 0,
          totalHargaSup: 0,
        };
      }

      const qty = Number(t.QTY || 0);
      const hSup = Number(t.HARGA_SUPLAYER || map[key].hargaSup || 0);

      map[key].totalQty += qty;
      map[key].totalHargaSup += qty * hSup;
      map[key].hargaSup = hSup;

      if (t.IMEI && String(t.IMEI).trim() !== "") {
        map[key].imeis.push(String(t.IMEI).trim());
      }
    });

    return Object.values(map).sort((a, b) => {
      const ta = new Date(a.tanggal || 0).getTime();
      const tb = new Date(b.tanggal || 0).getTime();
      return tb - ta;
    });
  }, [allTransaksi]);

  // ======================= FILTER & PAGINATION =======================
  const filteredPurchases = useMemo(() => {
    const q = String(search || "").toLowerCase();
    if (!q) return groupedPembelian;

    return groupedPembelian.filter((v) => {
      return (
        String(v.tanggal || "").toLowerCase().includes(q) ||
        String(v.noDo || "").toLowerCase().includes(q) ||
        String(v.supplier || "").toLowerCase().includes(q) ||
        String(v.brand || "").toLowerCase().includes(q) ||
        String(v.barang || "").toLowerCase().includes(q) ||
        String(v.kategoriBrand || "").toLowerCase().includes(q) ||
        (v.imeis || []).some((im) =>
          String(im || "").toLowerCase().includes(q)
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

  // ======================= VALIDASI IMEI =======================
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
          `IMEI / No MESIN ${im} sudah dipakai di ${conflict.NAMA_BRAND} - ${conflict.NAMA_BARANG} (Supplier: ${
            conflict.NAMA_SUPPLIER || "-"
          })`
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
          `IMEI / No MESIN ${im} sudah dipakai di ${conflict.NAMA_BRAND} - ${conflict.NAMA_BARANG} (Supplier: ${
            conflict.NAMA_SUPPLIER || "-"
          })`
        );
        break;
      }
    }
    return errors;
  };

  // ======================= HAPUS PEMBELIAN (DELETE + REDUCE STOCK) =======================
  const deletePembelian = async (item) => {
    if (
      !window.confirm(
        `Hapus semua transaksi pembelian untuk:\n${item.tanggal} - DO: ${
          item.noDo
        }\nSupplier: ${item.supplier}\n${item.brand} - ${
          item.barang
        }\n(Qty: ${item.totalQty}) ?`
      )
    ) {
      return;
    }

    const key = `${item.tanggal || ""}|${item.noDo || ""}|${
      item.supplier || ""
    }|${item.brand || ""}|${item.barang || ""}`;

    const rows = (allTransaksi || []).filter((t) => {
      if ((t.PAYMENT_METODE || "").toUpperCase() !== "PEMBELIAN") return false;
      const k = `${t.TANGGAL_TRANSAKSI || ""}|${t.NO_INVOICE || ""}|${
        t.NAMA_SUPPLIER || ""
      }|${t.NAMA_BRAND || ""}|${t.NAMA_BARANG || ""}`;
      return k === key;
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

  // ======================= OPEN EDIT =======================
  const openEdit = (item) => {
    setEditData({
      ...item,
      imeiList: (item.imeis || []).join("\n"),
      originalKey: `${item.tanggal || ""}|${item.noDo || ""}|${
        item.supplier || ""
      }|${item.brand || ""}|${item.barang || ""}`,
      hargaSup: item.hargaSup || 0,
    });
    setShowEdit(true);
  };

  // ======================= SAVE EDIT =======================
  const saveEdit = async () => {
    if (!editData) return;

    const isKategoriImei = KATEGORI_WAJIB_IMEI.includes(
      editData.kategoriBrand
    );
    const isAccessories = editData.kategoriBrand === "ACCESORIES";

    let imeis = [];
    if (isKategoriImei) {
      imeis = String(editData.imeiList || "")
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);

        if (imeis.length <= 0) {
          alert("Silahkan isi Nomor IMEI Terlebih dahulu");
          return;
        }
        

      const err = validateImeisEdit(imeis, editData.originalKey);
      if (err.length) {
        alert(err.join("\n"));
        return;
      }
    }

    const rows = (allTransaksi || []).filter((t) => {
      if ((t.PAYMENT_METODE || "").toUpperCase() !== "PEMBELIAN") return false;
      const k = `${t.TANGGAL_TRANSAKSI || ""}|${t.NO_INVOICE || ""}|${
        t.NAMA_SUPPLIER || ""
      }|${t.NAMA_BRAND || ""}|${t.NAMA_BARANG || ""}`;
      return k === editData.originalKey;
    });

    if (rows.length === 0) {
      alert("Data transaksi untuk pembelian ini tidak ditemukan.");
      return;
    }

    try {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const tokoId = r.tokoId || 1;

        let newIMEI = r.IMEI || "";
        if (isKategoriImei) {
          if (imeis.length === rows.length) {
            newIMEI = imeis[i] || "";
          } else if (imeis.length === 1) {
            newIMEI = imeis[0];
          }
        } else if (isAccessories) {
          newIMEI = "";
        }

        const payload = {
          ...r,
          TANGGAL_TRANSAKSI: editData.tanggal,
          NO_INVOICE: editData.noDo,
          NAMA_SUPPLIER: editData.supplier,
          NAMA_BRAND: editData.brand, // ✅ Brand bener
          NAMA_BARANG: editData.barang, // ✅ Barang bener
          KATEGORI_BRAND: editData.kategoriBrand,
          HARGA_SUPLAYER: Number(editData.hargaSup || 0),
          TOTAL: Number(r.QTY || 0) * Number(editData.hargaSup || 0),
          IMEI: newIMEI,
          NAMA_TOKO: "CILANGKAP PUSAT",
        };

        if (r.id && typeof updateTransaksi === "function") {
          await updateTransaksi(tokoId, r.id, payload);
        }
      }

      alert("✅ Perubahan pembelian berhasil disimpan.");
      setShowEdit(false);
    } catch (err) {
      console.error("saveEdit error:", err);
      alert("❌ Gagal menyimpan perubahan.");
    }
  };

  // ======================= HANDLE FORM TAMBAH (AUTO QTY) =======================
  const handleTambahChange = (key, value) => {
    setTambahForm((prev) => {
      const next = { ...prev, [key]: value };

      const isKategoriImei = KATEGORI_WAJIB_IMEI.includes(
        key === "kategoriBrand" ? value : prev.kategoriBrand
      );

      if (key === "imeiList" || key === "kategoriBrand") {
        const imeis = String(
          key === "imeiList" ? value : prev.imeiList || ""
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

  // ======================= SUBMIT TAMBAH (INSERT TRANSAKSI + MASTER BARANG + STOCK) =======================
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

    const isKategoriImei = KATEGORI_WAJIB_IMEI.includes(kategoriBrand);
    const isAccessories = kategoriBrand === "ACCESORIES";

    if (!tanggal) return alert("Tanggal wajib diisi.");
    if (!noDo) return alert("No Delivery Order wajib diisi.");
    if (!supplier) return alert("Nama Supplier wajib diisi.");
    if (!brand) return alert("Nama Brand wajib diisi.");
    if (!kategoriBrand) return alert("Kategori Brand wajib dipilih.");
    if (!barang) return alert("Nama Barang wajib diisi.");
    const hSup = Number(hargaSup || 0);
    if (!hSup || hSup <= 0)
      return alert("Harga Supplier harus lebih dari 0.");

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

    const tokoId = 1;
    const namaToko = "CILANGKAP PUSAT";
    const sku = makeSku(brand, barang);

    try {
      if (isKategoriImei) {
        // =======================
        // KATEGORI WAJIB IMEI
        // =======================
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
            PAYMENT_METODE: "PEMBELIAN",
            SYSTEM_PAYMENT: "SYSTEM",
            KETERANGAN: "Pembelian",
            STATUS: "Approved",
          };
          await addTransaksi(tokoId, payload);
        }
      } else {
        // =======================
        // NON IMEI → OVERWRITE DATA LAMA
        // =======================
        const sama = (allTransaksi || []).filter(
          (t) =>
            (t.PAYMENT_METODE || "").toUpperCase() === "PEMBELIAN" &&
            t.NAMA_BRAND === brand &&
            t.NAMA_BARANG === barang &&
            !t.IMEI &&
            t.NAMA_SUPPLIER === supplier &&
            t.NO_INVOICE === noDo
        );

        // Hapus data lama yang sama (barang + supplier + DO + tanpa IMEI)
        for (const s of sama) {
          const tId = s.tokoId || 1;
          if (s.id) {
            await deleteTransaksi(tId, s.id);
          }
        }

        // Input data baru (overwrite)
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
          NOMOR_UNIK: `PEMBELIAN|${brand}|${barang}|${Date.now()}`,
          HARGA_SUPLAYER: hSup,
          HARGA_UNIT: hSup,
          TOTAL: hSup * finalQty,
          PAYMENT_METODE: "PEMBELIAN",
          SYSTEM_PAYMENT: "SYSTEM",
          KETERANGAN: "Pembelian (Overwrite)",
          STATUS: "Approved",
        };

        await addTransaksi(tokoId, payload);
      }

      await addStock("CILANGKAP PUSAT", sku, {
        namaBrand: brand,
        namaBarang: barang,
        kategoriBrand,
        qty: finalQty,
      });

      alert(
        "✅ Pembelian berhasil disimpan.\n• Data masuk MASTER PEMBELIAN\n• Otomatis masuk MASTER BARANG\n• Stok CILANGKAP PUSAT bertambah."
      );

      setShowTambah(false);
      setTambahForm({
        tanggal: new Date().toISOString().slice(0, 10),
        noDo: "",
        supplier: "",
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

  // =======================
  // PART 1 SELESAI
  // LANJUTAN: PART 2 (UI JSX: TABEL, MODAL, EXPORT EXCEL/PDF, DLL)
  // =======================
  // ======================= EXPORT EXCEL =======================
  const groupedPurchases = groupedPembelian; // ✅ alias agar nama konsisten

  const exportExcel = () => {
    const rows = groupedPurchases.map((r) => ({
      Tanggal: r.tanggal,
      "No Delivery Order": r.noDo,
      Supplier: r.supplier,
      "Nama Brand": r.brand,
      "Kategori Brand": r.kategoriBrand,
      "Nama Barang": r.barang,
      IMEI: (r.imeis || []).join(", "),
      "Harga Supplier (Satuan)": r.hargaSup || 0,
      Qty: r.totalQty || 0,
      "Total Harga Supplier": r.totalHargaSup || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MasterPembelian");
    XLSX.writeFile(
      wb,
      `MasterPembelian_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  // ======================= EXPORT PDF =======================
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
              <thead className="bg-slate-50">
                <tr>
                  <th className="border p-2">No</th>
                  <th className="border p-2">Tanggal</th>
                  <th className="border p-2">No Delivery Order</th>
                  <th className="border p-2">Nama Supplier</th>
                  <th className="border p-2">Nama Brand</th>
                  <th className="border p-2">Kategori Brand</th>
                  <th className="border p-2">Nama Barang</th>
                  <th className="border p-2">IMEI / No Mesin</th>
                  <th className="border p-2 text-right">
                    Harga Supplier (Satuan)
                  </th>
                  <th className="border p-2 text-center">Qty</th>
                  <th className="border p-2 text-right">
                    Total Harga Supplier
                  </th>
                  <th className="border p-2 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPurchases.length === 0 ? (
                  <tr>
                    <td
                      colSpan={12}
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
                        <td className="border p-2">{item.brand}</td>
                        <td className="border p-2">
                          {item.kategoriBrand || "-"}
                        </td>
                        <td className="border p-2">{item.barang}</td>
                        <td className="border p-2 whitespace-pre-wrap font-mono text-[11px]">
                          {shownImeis.length > 0 ? (
                            shownImeis.join("\n")
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="border p-2 text-right">
                          Rp {fmt(item.hargaSup)}
                        </td>
                        <td className="border p-2 text-center font-semibold">
                          {item.totalQty}
                        </td>
                        <td className="border p-2 text-right">
                          Rp {fmt(item.totalHargaSup)}
                        </td>
                        <td className="border p-2 text-center space-x-2">
                          <button
                            className="inline-flex items-center justify-center p-[6px] rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                            title="Edit"
                            onClick={() => openEdit(item)}
                          >
                            <FaEdit />
                          </button>
                          <button
                            className="inline-flex items-center justify-center p-[6px] rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 transition"
                            title="Hapus"
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
      {showTambah && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-start py-10 z-50 overflow-y-auto">
          <div className="bg-white text-slate-800 w-full max-w-2xl rounded-2xl shadow-2xl p-5">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Tanggal */}
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Tanggal
                </label>
                <input
                  type="date"
                  className="w-full border rounded-lg px-2 py-2 text-sm bg-slate-50"
                  value={tambahForm.tanggal}
                  onChange={(e) =>
                    handleTambahChange("tanggal", e.target.value)
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
                  placeholder="No DO / SJ"
                  value={tambahForm.noDo}
                  onChange={(e) => handleTambahChange("noDo", e.target.value)}
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

              {/* Brand */}
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Nama Brand
                </label>
                <input
                  list="brand-list"
                  className="w-full border rounded-lg px-2 py-2 text-sm bg-slate-50"
                  placeholder="Pilih / ketik brand"
                  value={tambahForm.brand}
                  onChange={(e) => handleTambahChange("brand", e.target.value)}
                />
                <datalist id="brand-list">
                  {brandOptionsDynamic.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>

              {/* Kategori Brand */}
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
                  {KATEGORI_OPTIONS.map((x) => (
                    <option key={x} value={x}>
                      {x}
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
                  placeholder="Pilih / ketik nama barang"
                  value={tambahForm.barang}
                  onChange={(e) => handleTambahChange("barang", e.target.value)}
                />
                <datalist id="barang-list">
                  {namaBarangOptions.map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </div>

              {/* Harga Supplier */}
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Harga Supplier
                </label>
                <input
                  type="number"
                  className="w-full border rounded-lg px-2 py-2 text-sm bg-slate-50"
                  placeholder="0"
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
                  className={`w-full border rounded-lg px-2 py-2 text-sm bg-slate-50 ${
                    KATEGORI_WAJIB_IMEI.includes(tambahForm.kategoriBrand)
                      ? "text-slate-500"
                      : ""
                  }`}
                  value={tambahForm.qty}
                  onChange={(e) =>
                    !KATEGORI_WAJIB_IMEI.includes(tambahForm.kategoriBrand) &&
                    handleTambahChange("qty", e.target.value)
                  }
                  readOnly={KATEGORI_WAJIB_IMEI.includes(
                    tambahForm.kategoriBrand
                  )}
                />
                {KATEGORI_WAJIB_IMEI.includes(tambahForm.kategoriBrand) && (
                  <p className="text-[10px] text-amber-600 mt-1">
                    Qty otomatis mengikuti jumlah baris IMEI.
                  </p>
                )}
              </div>
            </div>

            {/* IMEI hanya jika bukan ACCESORIES */}
            {tambahForm.kategoriBrand !== "ACCESORIES" && (
              <div className="mt-3">
                <label className="text-xs font-semibold text-slate-600">
                  No IMEI / No Mesin{" "}
                  <span className="font-normal">
                    (1 per baris – wajib untuk SEPEDA LISTRIK / MOTOR LISTRIK /
                    HANDPHONE)
                  </span>
                </label>
                <textarea
                  rows={4}
                  className="w-full border rounded-lg px-2 py-2 text-xs font-mono bg-slate-50"
                  placeholder={`Contoh:\nIMEI-001\nIMEI-002`}
                  value={tambahForm.imeiList}
                  onChange={(e) =>
                    handleTambahChange("imeiList", e.target.value)
                  }
                />
              </div>
            )}

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowTambah(false)}
                className="px-3 py-1 bg-gray-400 hover:bg-gray-500 text-white rounded-lg text-sm"
              >
                <FaTimes className="inline mr-1" /> Batal
              </button>
              <button
                onClick={submitTambah}
                className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm flex items-center shadow-md"
              >
                <FaSave className="inline mr-1" /> Simpan
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

              {/* Brand */}
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Nama Brand
                </label>
                <input
                  list="brand-list"
                  className="w-full border rounded-lg px-2 py-2 text-sm bg-slate-50"
                  value={editData.brand}
                  onChange={(e) =>
                    setEditData((p) => ({ ...p, brand: e.target.value }))
                  }
                />
              </div>

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
                  {KATEGORI_OPTIONS.map((x) => (
                    <option key={x} value={x}>
                      {x}
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
                <label className="text-xs font-semibold text-slate-600">
                  Harga Supplier
                </label>
                <input
                  type="number"
                  className="w-full border rounded-lg px-2 py-2 text-sm bg-slate-50"
                  value={editData.hargaSup}
                  onChange={(e) =>
                    setEditData((p) => ({ ...p, hargaSup: e.target.value }))
                  }
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
