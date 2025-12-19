// src/pages/StockOpname.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  listenAllTransaksi,
  addTransaksi,
  updateTransaksi,
  deleteTransaksi,
  listenStockAll,
  addStock,
  reduceStock,
  listenMasterBarangHarga,
} from "../services/FirebaseService";
import StockBarang from "../data/StockBarang"; // pastikan path sesuai project
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { useLocation } from "react-router-dom";

import {
  FaPlus,
  FaEdit,
  FaTrash,
  FaFileExcel,
  FaFilePdf,
  FaSearch,
  FaChevronLeft,
  FaChevronRight,
  FaSave,
  FaTimes,
} from "react-icons/fa";

/*
  StockOpname.jsx
  - Menampilkan stok pusat & semua toko (realtime melalui transaksi)
  - Fallback ke StockBarang (dummy stok PUSAT) jika Firebase kosong
  - CRUD transaksi (Tambah/Edit/Delete/Approve/VOID)
  - Stok Opname Cepat per SKU (selisih stok fisik vs sistem)
  - Export Excel (Aggregated + Raw) & PDF
  - Import Excel → update/add ke Firebase
  - Cek IMEI unik (tidak boleh ada IMEI yang sama di tabel)
  - VOID mengembalikan stok ke CILANGKAP PUSAT
  - Draft form disimpan ke localStorage agar tidak hilang saat pindah halaman/refresh
*/

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

const rowsPerPageDefault = 12;
const FORM_STORAGE_KEY = "stockOpnameFormDraft";

export default function StockOpname() {
  // data sources
  const [allTransaksi, setAllTransaksi] = useState([]); // merged all toko transaksi
  const [stockRealtime, setStockRealtime] = useState({}); // jika memakai listenStockAll

  // form & CRUD
  const [form, setForm] = useState({});
  const [editId, setEditId] = useState(null);

  // opname local { keyOrSku: stokFisik }
  const [opnameMap, setOpnameMap] = useState({});

  // ===== Tambahan untuk Edit/Delete per SKU (Stok Opname Cepat) =====
  const [editSku, setEditSku] = useState(null);
  const [editHargaSuplayer, setEditHargaSuplayer] = useState("");
  const [editHargaUnit, setEditHargaUnit] = useState("");
  const [showModalEditSku, setShowModalEditSku] = useState(false);

  // UI controls
  const [filterToko, setFilterToko] = useState("semua");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageDefault);

  const tableRef = useRef(null);

  const loggedUser = JSON.parse(localStorage.getItem("user") || "{}");
  const isSuperAdmin =
    loggedUser?.role === "superadmin" || loggedUser?.level === "superadmin";

  const location = useLocation();

  // 🔒 toko dikunci dari Dashboard Toko
  const lockedTokoFromNav = location?.state?.lockedToko || null;

  // 🔑 toko login final (1 sumber kebenaran)
  const tokoLogin =
    lockedTokoFromNav ||
    loggedUser?.toko ||
    localStorage.getItem("TOKO_LOGIN") ||
    null;

  const myTokoId = loggedUser?.toko;
  const [masterHargaMap, setMasterHargaMap] = useState({});

  useEffect(() => {
    if (!isSuperAdmin && tokoLogin) {
      setFilterToko(tokoLogin); // 🔒 kunci filter
    }
  }, [isSuperAdmin, tokoLogin]);

  useEffect(() => {
    if (typeof listenMasterBarangHarga !== "function") return;

    const unsub = listenMasterBarangHarga((rows = []) => {
      const map = {};
      rows.forEach((r) => {
        const key =
          (r.NOMOR_UNIK && String(r.NOMOR_UNIK).trim()) ||
          `${r.NAMA_BRAND}|${r.NAMA_BARANG}`;

        map[key] = {
          hargaSRP: Number(
            r.HARGA_SRP || r.SRP || r.HARGA_UNIT || r.HARGA || 0
          ),
        };
      });
      setMasterHargaMap(map);
    });
    console.log("USER LOGIN:", loggedUser);
    console.log("IS superadmin:", isSuperAdmin);

    return () => unsub && unsub();
  }, []);

  // ===================== LOAD DRAFT FORM DARI LOCALSTORAGE =====================
  useEffect(() => {
    try {
      const saved = localStorage.getItem(FORM_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          setForm(parsed);
        }
      }
    } catch (e) {
      console.error("Gagal load draft form StockOpname", e);
    }
  }, []);

  // Simpan draft form ke localStorage setiap ada perubahan,
  // agar saat pindah halaman / refresh data input tidak hilang sebelum disimpan.
  useEffect(() => {
    try {
      if (!form || Object.keys(form).length === 0) {
        localStorage.removeItem(FORM_STORAGE_KEY);
      } else {
        localStorage.setItem(FORM_STORAGE_KEY, JSON.stringify(form));
      }
    } catch (e) {
      console.error("Gagal simpan draft form StockOpname", e);
    }
  }, [form]);

  // ===================== LOAD DATA (Firebase + Fallback StockBarang) =====================
  useEffect(() => {
    if (typeof listenAllTransaksi === "function") {
      const unsub = listenAllTransaksi((items = []) => {
        const norm = (items || []).map((r) => normalizeRecord(r));
        if (!norm || norm.length === 0) {
          const fallback = buildTransaksiFromStockBarang();
          setAllTransaksi(fallback);
        } else {
          setAllTransaksi(norm);
        }
        setCurrentPage(1);
      });
      return () => unsub && unsub();
    } else {
      // tidak ada Firebase listener → pakai stok dummy dari StockBarang
      setAllTransaksi(buildTransaksiFromStockBarang());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // optional: stok realtime (jika dipakai)
  useEffect(() => {
    if (typeof listenStockAll === "function") {
      const unsub = listenStockAll((s = {}) => setStockRealtime(s));
      return () => unsub && unsub();
    }
  }, []);

  // ===================== NORMALISASI RECORD =====================
  function normalizeRecord(r = {}) {
    return {
      id:
        r.id ??
        r._id ??
        r.key ??
        Date.now().toString() + Math.random().toString(36).slice(2),
      TANGGAL_TRANSAKSI: r.TANGGAL_TRANSAKSI || r.TANGGAL || "",
      NO_INVOICE: r.NO_INVOICE || "",
      NAMA_USER: r.NAMA_USER || "",
      NO_HP_USER: r.NO_HP_USER || "",
      NAMA_PIC_TOKO: r.NAMA_PIC_TOKO || "",
      NAMA_SALES: r.NAMA_SALES || "",
      TITIPAN_REFERENSI: r.TITIPAN_REFERENSI || "",
      NAMA_TOKO: r.NAMA_TOKO || r.TOKO || "CILANGKAP PUSAT",
      NAMA_BRAND: r.NAMA_BRAND || r.BRAND || "",
      NAMA_BARANG: r.NAMA_BARANG || r.BARANG || "",
      QTY: Number(r.QTY || 0),
      NOMOR_UNIK: r.NOMOR_UNIK || r.IMEI || r.NO_DINAMO || r.NO_RANGKA || "",
      KATEGORI_HARGA: r.KATEGORI_HARGA || "",
      hargaSRP: Number(r.hargaSRP || r.HARGA || 0),
      HARGA_SUPLAYER: Number(r.HARGA_SUPLAYER || r.HARGA_SUPPLIER || 0),
      PAYMENT_METODE: r.PAYMENT_METODE || "",
      SYSTEM_PAYMENT: r.SYSTEM_PAYMENT || "",
      TOTAL:
        Number(r.TOTAL) ||
        Number(r.QTY || 0) * Number(r.HARGA_UNIT || r.HARGA || 0) ||
        0,
      MDR: Number(r.MDR || 0),
      POTONGAN_MDR: Number(r.POTONGAN_MDR || 0),
      NO_ORDER_KONTRAK: r.NO_ORDER_KONTRAK || "",
      TENOR: r.TENOR || "",
      DP_USER_MERCHANT: Number(r.DP_USER_MERCHANT || 0),
      DP_USER_TOKO: Number(r.DP_USER_TOKO || 0),
      REQUEST_DP_TALANGAN: Number(r.REQUEST_DP_TALANGAN || 0),
      KETERANGAN: r.KETERANGAN || "",
      STATUS: r.STATUS || "Pending",
      _raw: r,
    };
  }

  // ===================== Fallback: Transaksi dari StockBarang (stok PUSAT) =====================
  function buildTransaksiFromStockBarang() {
    const all = [];
    try {
      // Jika StockBarang berupa array langsung
      if (Array.isArray(StockBarang)) {
        StockBarang.forEach((s, idx) => {
          all.push(
            normalizeRecord({
              id: `SB-${idx}`,
              TANGGAL_TRANSAKSI: new Date().toISOString().slice(0, 10),
              NO_INVOICE: `SB-DUMMY-${idx + 1}`,
              NAMA_TOKO: "CILANGKAP PUSAT",
              NAMA_BRAND: s.brand || s.NAMA_BRAND || "",
              NAMA_BARANG: s.nama || s.NAMA_BARANG || s.BARANG || "",
              QTY: s.qty || s.stock || 1,
              NOMOR_UNIK:
                s.imei || s.NOMOR_UNIK || s.SKU || `SKU-DUMMY-${idx + 1}`,
              hargaSRP: s.harga || s.hargaSRP || 0,
              PAYMENT_METODE: "DUMMY",
              SYSTEM_PAYMENT: "OFFLINE",
              STATUS: "Approved",
            })
          );
        });
        return all;
      }

      // Jika StockBarang adalah object dengan STOCK_ALL atau kategori lain
      const {
        STOCK_ALL,
        STOCK_ACCESSORIES,
        STOCK_HANDPHONE,
        STOCK_MOTOR_LISTRIK,
      } = StockBarang || {};

      const source =
        STOCK_ALL ||
        []
          .concat(STOCK_ACCESSORIES || [])
          .concat(STOCK_HANDPHONE || [])
          .concat(STOCK_MOTOR_LISTRIK || []);

      if (Array.isArray(source)) {
        source.forEach((s, idx) => {
          all.push(
            normalizeRecord({
              id: `SB-${idx}`,
              TANGGAL_TRANSAKSI: new Date().toISOString().slice(0, 10),
              NO_INVOICE: `SB-DUMMY-${idx + 1}`,
              NAMA_TOKO: "CILANGKAP PUSAT",
              NAMA_BRAND: s.brand || s.NAMA_BRAND || "",
              NAMA_BARANG: s.nama || s.NAMA_BARANG || s.BARANG || "",
              QTY: s.qty || s.stock || 1,
              NOMOR_UNIK:
                s.imei || s.NOMOR_UNIK || s.SKU || `SKU-DUMMY-${idx + 1}`,
              hargaSRP: s.harga || s.hargaSRP || 0,
              PAYMENT_METODE: "DUMMY",
              SYSTEM_PAYMENT: "OFFLINE",
              STATUS: "Approved",
            })
          );
        });
      }

      return all;
    } catch (err) {
      console.error("buildTransaksiFromStockBarang error", err);
      return [];
    }
  }

  // ===================== AUTO ISI FORM DARI IMEI (Master Barang + Penjualan) =====================
  useEffect(() => {
    if (!form.NOMOR_UNIK) return;

    const imeiInput = String(form.NOMOR_UNIK).trim();
    const tokoName = form.NAMA_TOKO || "CILANGKAP PUSAT";
    const stokAll = stockRealtime || {};

    let found = null;

    // Prioritas 1: stok di toko yang dipilih
    if (!myTokoId) return;
    if (stokAll[tokoName]) {
      for (const [sku, item] of Object.entries(stokAll[tokoName] || {})) {
        const imeiItem = String(
          item.imei || item.NOMOR_UNIK || item.no_imei || item.NO_IMEI || ""
        ).trim();
        if (imeiItem && imeiItem === imeiInput) {
          found = { sku, ...item };
          break;
        }
      }
    }

    // Prioritas 2: stok di CILANGKAP PUSAT (Master Barang Pusat)
    if (
      !found &&
      tokoName !== "CILANGKAP PUSAT" &&
      stokAll["CILANGKAP PUSAT"]
    ) {
      for (const [sku, item] of Object.entries(
        stokAll["CILANGKAP PUSAT"] || {}
      )) {
        const imeiItem = String(
          item.imei || item.NOMOR_UNIK || item.no_imei || item.NO_IMEI || ""
        ).trim();
        if (imeiItem && imeiItem === imeiInput) {
          found = { sku, ...item };
          break;
        }
      }
    }

    // Prioritas 3: dari transaksi penjualan (Master Penjualan / Transfer Barang)
    if (!found) {
      const trx = allTransaksi.find(
        (r) => String(r.NOMOR_UNIK || "").trim() === imeiInput
      );
      if (trx) {
        setForm((f) => ({
          ...f,
          NO_INVOICE: f.NO_INVOICE || trx.NO_INVOICE || "",
          NAMA_BRAND: f.NAMA_BRAND || trx.NAMA_BRAND || "",
          NAMA_BARANG: f.NAMA_BARANG || trx.NAMA_BARANG || "",
          hargaSRP:
            f.hargaSRP !== "" && f.hargaSRP !== undefined
              ? f.hargaSRP
              : trx.hargaSRP || trx.HARGA || 0,
        }));
      }
      return;
    }

    // Isi otomatis dari stok master (baik PUSAT maupun Toko masing-masing)
    setForm((f) => ({
      ...f,
      NO_INVOICE:
        f.NO_INVOICE ||
        found.noInvoice ||
        found.NO_INVOICE ||
        f.NO_INVOICE ||
        "",
      NAMA_BRAND: f.NAMA_BRAND || found.brand || found.NAMA_BRAND || "",
      NAMA_BARANG: f.NAMA_BARANG || found.nama || found.NAMA_BARANG || "",
      hargaSRP:
        f.hargaSRP !== "" && f.hargaSRP !== undefined
          ? f.hargaSRP
          : found.harga ||
            found.HARGA_UNIT ||
            found.harga_jual ||
            f.HARGA_UNIT ||
            0,
      QTY: f.QTY || found.qty || 1,
    }));
  }, [form.NOMOR_UNIK, form.NAMA_TOKO, stockRealtime, allTransaksi]);

  // ===================== Derivasi: options toko, filter, pagination =====================
  const tokoOptions = useMemo(() => {
    // 🔒 USER TOKO → hanya 1 toko
    if (!isSuperAdmin && tokoLogin) {
      return [tokoLogin];
    }

    // 👑 SUPERADMIN → semua toko
    const fromTransaksi = [
      ...new Set((allTransaksi || []).map((r) => r.NAMA_TOKO).filter(Boolean)),
    ];

    const fromStock = Object.keys(stockRealtime || {});

    return Array.from(
      new Set([...fromTransaksi, ...fromStock, ...fallbackTokoNames])
    );
  }, [isSuperAdmin, tokoLogin, allTransaksi, stockRealtime]);

  const filteredRows = useMemo(() => {
    return allTransaksi.filter((r) => {
      let ok = true;

      // ❌ Hilangkan data tanpa harga supplier (bukan data DB valid)
      if (!r.HARGA_SUPLAYER || Number(r.HARGA_SUPLAYER) <= 0) {
        return false;
      }

      if (filterToko !== "semua") {
        ok = ok && String(r.NAMA_TOKO) === String(filterToko);
      }

      if (filterStatus !== "semua") {
        ok =
          ok &&
          String(r.STATUS || "").toLowerCase() ===
            String(filterStatus).toLowerCase();
      }

      if (search.trim()) {
        const s = search.toLowerCase();
        ok =
          ok &&
          (String(r.NOMOR_UNIK || "")
            .toLowerCase()
            .includes(s) ||
            String(r.NAMA_BARANG || "")
              .toLowerCase()
              .includes(s) ||
            String(r.NAMA_TOKO || "")
              .toLowerCase()
              .includes(s));
      }

      return ok;
    });
  }, [allTransaksi, filterToko, filterStatus, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / (rowsPerPage || rowsPerPageDefault))
  );

  useEffect(() => {
    if (!myTokoId) return;
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const paginated = filteredRows.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // ===================== Helper format angka =====================
  const fmt = (v) => {
    try {
      return Number(v || 0).toLocaleString("id-ID");
    } catch {
      return String(v || "");
    }
  };

  // ===================== CEK IMEI DUPLIKAT (HARUS UNIK) =====================
  const isDuplicateIMEI = (imei, excludeId = null) => {
    if (!myTokoId) return;
    if (!imei) return false;
    const cleaned = String(imei).trim();
    if (!cleaned) return false;
    return allTransaksi.some(
      (r) =>
        String(r.NOMOR_UNIK || "").trim() === cleaned &&
        (!excludeId || r.id !== excludeId)
    );
  };

  // ===================== Form Handlers =====================
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const val = type === "number" ? (value === "" ? "" : Number(value)) : value;
    setForm((f) => ({ ...f, [name]: val }));
  };

  const handleSave = async () => {
    const tanggal =
      form.TANGGAL_TRANSAKSI ||
      form.TANGGAL ||
      new Date().toISOString().slice(0, 10);
    const brand = form.NAMA_BRAND || form.BRAND;
    const barang = form.NAMA_BARANG || form.BARANG;
    const tokoName = form.NAMA_TOKO || "CILANGKAP PUSAT";
    const qty = Number(form.QTY || 0);
    const hargaUnit =
      masterHargaMap[form.NOMOR_UNIK]?.hargaSRP ??
      masterHargaMap[`${form.NAMA_BRAND}|${form.NAMA_BARANG}`]?.hargaSRP ??
      Number(form.hargaSRP || 0);

    if (!myTokoId) return;
    if (!tanggal || !brand || !barang || !tokoName) {
      alert("Isi minimal: Tanggal, Toko, Nama Brand, Nama Barang");
      return;
    }

    // 🚫 Cek IMEI duplikat (hanya boleh satu di tabel)
    if (form.NOMOR_UNIK && isDuplicateIMEI(form.NOMOR_UNIK, editId)) {
      alert("Nomor IMEI sudah terdaftar. Tidak boleh ada IMEI yang sama.");
      return;
    }

    const total = qty * hargaUnit;

    const payload = {
      ...form,
      TANGGAL_TRANSAKSI: tanggal,
      NAMA_TOKO: tokoName,
      NAMA_BRAND: brand,
      NAMA_BARANG: barang,
      QTY: qty,
      hargaSRP: hargaUnit,
      HARGA: hargaUnit,
      TOTAL: total,
      STATUS: form.STATUS || "Pending",
    };

    try {
      if (editId) {
        const tokoIndex = fallbackTokoNames.findIndex(
          (n) =>
            String(n).toUpperCase() ===
            String(payload.NAMA_TOKO || "").toUpperCase()
        );
        const tokoId = tokoIndex >= 0 ? tokoIndex + 1 : 1;
        if (typeof updateTransaksi === "function") {
          await updateTransaksi(tokoId, editId, payload);
        } else {
          console.warn("updateTransaksi not found");
        }
        setAllTransaksi((d) =>
          d.map((x) =>
            x.id === editId ? normalizeRecord({ id: editId, ...payload }) : x
          )
        );
      } else {
        const tokoIndex = fallbackTokoNames.findIndex(
          (n) =>
            String(n).toUpperCase() ===
            String(payload.NAMA_TOKO || "").toUpperCase()
        );
        const tokoId = tokoIndex >= 0 ? tokoIndex + 1 : 1;
        if (typeof addTransaksi === "function") {
          await addTransaksi(tokoId, payload);
        } else {
          console.warn("addTransaksi not found");
        }
        setAllTransaksi((d) => [...d, normalizeRecord(payload)]);
      }

      // bersihkan form + draft setelah Request / Simpan berhasil
      setForm({});
      setEditId(null);
      try {
        localStorage.removeItem(FORM_STORAGE_KEY);
      } catch (e) {
        console.error("Gagal hapus draft form setelah simpan", e);
      }

      alert("Simpan berhasil");
    } catch (err) {
      console.error("save error", err);
      alert("Gagal menyimpan data");
    }
  };

  const handleEdit = (row) => {
    setForm({ ...row });
    setEditId(row.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // =========== TOMBOL DELETE → VOID (KEMBALIKAN STOK KE MASTER BARANG) ===========
  const handleDelete = async (row) => {
    if (
      !window.confirm(
        "Yakin VOID transaksi ini dan mengembalikan stok ke CILANGKAP PUSAT?"
      )
    )
      return;
    try {
      const qty = Number(row.QTY || 0);
      const imeiKey = row.NOMOR_UNIK || row.NO_INVOICE || "";
      const namaBarang = row.NAMA_BARANG || "";

      // 1. Kembalikan stok ke CILANGKAP PUSAT (MASTER BARANG)
      if (typeof addStock === "function" && imeiKey) {
        await addStock("CILANGKAP PUSAT", imeiKey, {
          nama: namaBarang,
          imei: row.NOMOR_UNIK,
          qty,
        });
      }

      // 2. Kurangi stok dari toko asal (jika bukan pusat)
      const tokoName = row.NAMA_TOKO || "CILANGKAP PUSAT";
      if (
        typeof reduceStock === "function" &&
        tokoName &&
        tokoName !== "CILANGKAP PUSAT" &&
        imeiKey
      ) {
        await reduceStock(tokoName, imeiKey, qty);
      }

      // 3. Update status transaksi → VOID (tidak dihapus)
      const tokoIndex = fallbackTokoNames.findIndex(
        (n) => String(n).toUpperCase() === String(tokoName || "").toUpperCase()
      );
      const tokoId = tokoIndex >= 0 ? tokoIndex + 1 : 1;

      if (typeof updateTransaksi === "function") {
        await updateTransaksi(tokoId, row.id, {
          ...row,
          STATUS: "VOID",
          KETERANGAN:
            (row.KETERANGAN ? row.KETERANGAN + " | " : "") +
            "Transaksi di-VOID, stok dikembalikan ke CILANGKAP PUSAT",
        });
      }

      setAllTransaksi((d) =>
        d.map((x) =>
          x.id === row.id
            ? {
                ...x,
                STATUS: "VOID",
                KETERANGAN:
                  (x.KETERANGAN ? x.KETERANGAN + " | " : "") +
                  "Transaksi di-VOID, stok dikembalikan ke CILANGKAP PUSAT",
              }
            : x
        )
      );

      alert("Transaksi berhasil di-VOID dan stok dikembalikan.");
    } catch (err) {
      console.error("void error", err);
      alert("Gagal melakukan VOID transaksi");
    }
  };

  const handleApproval = async (row, status) => {
    try {
      const tokoIndex = fallbackTokoNames.findIndex(
        (n) =>
          String(n).toUpperCase() === String(row.NAMA_TOKO || "").toUpperCase()
      );
      const tokoId = tokoIndex >= 0 ? tokoIndex + 1 : 1;
      if (!myTokoId) return;
      if (typeof updateTransaksi === "function") {
        await updateTransaksi(tokoId, row.id, { STATUS: status });
      } else {
        console.warn("updateTransaksi not found");
      }
      setAllTransaksi((d) =>
        d.map((x) => (x.id === row.id ? { ...x, STATUS: status } : x))
      );
    } catch (err) {
      console.error("approval error", err);
      alert("Gagal update status");
    }
  };

  // ===================== Aggregate per SKU (untuk Stok Opname Cepat) =====================
  function aggregateBySku(items = []) {
    const map = {};

    items.forEach((r) => {
      // ❌ 1. HILANGKAN DATA BUKAN DB & TANPA HARGA SUPPLIER
      if (!r.HARGA_SUPLAYER || Number(r.HARGA_SUPLAYER) <= 0) return;

      // ❌ 5. FILTER KHUSUS TOKO (CILANGKAP PUSAT)
      if (filterToko !== "semua" && r.NAMA_TOKO !== filterToko) return;

      // 🔍 3. SEARCH IMEI / BARANG / TOKO
      if (search.trim()) {
        const s = search.toLowerCase();
        const match =
          String(r.NOMOR_UNIK || "")
            .toLowerCase()
            .includes(s) ||
          String(r.NAMA_BARANG || "")
            .toLowerCase()
            .includes(s) ||
          String(r.NAMA_TOKO || "")
            .toLowerCase()
            .includes(s);
        if (!match) return;
      }

      const key =
        (r.NOMOR_UNIK && String(r.NOMOR_UNIK).trim()) ||
        `${(r.NAMA_BRAND || "").trim()}|${(r.NAMA_BARANG || "").trim()}`;

      if (!map[key]) {
        map[key] = {
          key,
          brand: r.NAMA_BRAND,
          barang: r.NAMA_BARANG,
          toko: r.NAMA_TOKO,
          tanggal: r.TANGGAL_TRANSAKSI,
          noInvoice: r.NO_INVOICE || r.NO_DO || "",
          totalQty: 0,
        };
      }

      map[key].totalQty += Number(r.QTY || 0);
    });

    return map;
  }

  // ===================== Simpan hasil Opname untuk satu SKU =====================
  const saveOpnameFor = async (record) => {
    const key =
      record.NOMOR_UNIK ||
      `${record.NAMA_BRAND || record.brand}|${
        record.NAMA_BARANG || record.barang
      }`;
    const fisik = Number(opnameMap[key] ?? "");
    const sistemQty = Number(
      record.QTY || record.QTY_SYSTEM || record.totalQty || 0
    );
    if (!myTokoId) return;
    if (Number.isNaN(fisik)) {
      alert("Masukkan angka stok fisik yang valid");
      return;
    }

    const selisih = fisik - sistemQty;
    if (!myTokoId) return;
    if (selisih === 0) {
      alert("Tidak ada selisih - tidak perlu disimpan");
      return;
    }

    const srp =
      masterHargaMap[key]?.hargaSRP ??
      masterHargaMap[`${record.brand}|${record.barang}`]?.hargaSRP ??
      0;

    const payload = {
      TANGGAL_TRANSAKSI: new Date().toISOString().slice(0, 10),
      NO_INVOICE: `OPN-${Date.now()}`,
      NAMA_USER: "SYSTEM OPNAME",
      NAMA_TOKO: "CILANGKAP PUSAT",
      NAMA_BRAND: record.NAMA_BRAND || record.brand || "",
      NAMA_BARANG: record.NAMA_BARANG || record.barang || "",
      QTY: Math.abs(selisih),
      NOMOR_UNIK: record.NOMOR_UNIK || key,
      hargaSRP: srp,
      HARGA: srp,
      TOTAL: Math.abs(selisih) * srp,
      PAYMENT_METODE: "STOK OPNAME",
      SYSTEM_PAYMENT: "SYSTEM",
      KETERANGAN:
        selisih > 0
          ? "Opname: Adjustment (Tambah)"
          : "Opname: Adjustment (Kurang)",
      STATUS: "Approved",
    };

    try {
      const tokoId =
        fallbackTokoNames.findIndex((n) => n === "CILANGKAP PUSAT") + 1;
      if (!myTokoId) return;
      if (typeof addTransaksi === "function") {
        await addTransaksi(tokoId, payload);
      } else {
        console.warn("addTransaksi missing");
      }

      // integrasi dengan tabel stock/stockRealtime bila diinginkan
      if (typeof addStock === "function" && selisih > 0) {
        await addStock(
          "CILANGKAP PUSAT",
          payload.NOMOR_UNIK || payload.NO_INVOICE,
          {
            nama: payload.NAMA_BARANG,
            imei: payload.NOMOR_UNIK,
            qty: Math.abs(selisih),
          }
        );
      }
      if (typeof reduceStock === "function" && selisih < 0) {
        await reduceStock(
          "CILANGKAP PUSAT",
          payload.NOMOR_UNIK || payload.NO_INVOICE,
          Math.abs(selisih)
        );
      }

      alert("Opname disimpan. Sistem akan sinkron.");

      // refresh lokal: push record baru
      setAllTransaksi((d) => [...d, normalizeRecord(payload)]);
      // clear input fisik untuk key ini
      setOpnameMap((m) => ({ ...m, [key]: undefined }));
    } catch (err) {
      console.error("saveOpname error", err);
      alert("Gagal menyimpan opname");
    }
  };

  // ===================== Edit & Delete per SKU (Stok Opname Cepat) =====================
  const openEditSku = (key) => {
    setEditSku(key);
    const sample = allTransaksi.find(
      (x) => x.NOMOR_UNIK === key || `${x.NAMA_BRAND}|${x.NAMA_BARANG}` === key
    );

    setEditHargaSuplayer(sample?.HARGA_SUPLAYER || 0);
    setEditHargaUnit(sample?.hargaSRP || 0);

    setShowModalEditSku(true);
  };

  const saveEditSku = async () => {
    if (!myTokoId) return;
    if (!editSku) return;

    const list = allTransaksi.filter(
      (r) =>
        r.NOMOR_UNIK === editSku ||
        `${r.NAMA_BRAND}|${r.NAMA_BARANG}` === editSku
    );

    for (const row of list) {
      const tokoIndex = fallbackTokoNames.findIndex(
        (n) =>
          String(n).toUpperCase() === String(row.NAMA_TOKO || "").toUpperCase()
      );
      const tokoId = tokoIndex >= 0 ? tokoIndex + 1 : 1;

      const newHargaUnit = Number(editHargaUnit || 0);
      const newHargaSuplayer = Number(editHargaSuplayer || 0);

      await updateTransaksi(tokoId, row.id, {
        ...row,
        HARGA_UNIT: newHargaUnit,
        HARGA_SUPLAYER: newHargaSuplayer,
        TOTAL: row.QTY * newHargaUnit,
      });
    }

    // update lokal juga
    setAllTransaksi((prev) =>
      prev.map((r) => {
        if (!myTokoId) return;
        if (
          r.NOMOR_UNIK === editSku ||
          `${r.NAMA_BRAND}|${r.NAMA_BARANG}` === editSku
        ) {
          const newHargaUnit = Number(editHargaUnit || 0);
          const newHargaSuplayer = Number(editHargaSuplayer || 0);
          return {
            ...r,
            hargaSRP: newHargaUnit,
            HARGA_SUPLAYER: newHargaSuplayer,
            TOTAL: r.QTY * newHargaUnit,
          };
        }
        return r;
      })
    );

    alert("Harga SKU berhasil diperbarui.");
    setShowModalEditSku(false);
  };

  const deleteSku = async (key) => {
    if (!myTokoId) return;
    if (!window.confirm("Hapus semua transaksi untuk SKU ini?")) return;

    const list = allTransaksi.filter(
      (r) => r.NOMOR_UNIK === key || `${r.NAMA_BRAND}|${r.NAMA_BARANG}` === key
    );

    for (const row of list) {
      const tokoIndex = fallbackTokoNames.findIndex(
        (n) =>
          String(n).toUpperCase() === String(row.NAMA_TOKO || "").toUpperCase()
      );
      const tokoId = tokoIndex >= 0 ? tokoIndex + 1 : 1;
      await deleteTransaksi(tokoId, row.id);
    }

    setAllTransaksi((prev) =>
      prev.filter(
        (r) =>
          !(r.NOMOR_UNIK === key || `${r.NAMA_BRAND}|${r.NAMA_BARANG}` === key)
      )
    );

    alert("SKU berhasil dihapus.");
  };

  // ===================== Export / Import =====================
  const exportAggregatedExcel = () => {
    const map = new Map();
    allTransaksi.forEach((r) => {
      const key =
        (r.NOMOR_UNIK && r.NOMOR_UNIK.trim()) ||
        `${(r.NAMA_BRAND || "").trim()}|${(r.NAMA_BARANG || "").trim()}`;
      if (!myTokoId) return;
      if (!map.has(key))
        map.set(key, {
          key,
          BRAND: r.NAMA_BRAND,
          BARANG: r.NAMA_BARANG,
          TOTAL_QTY: 0,
          PUSAT_QTY: 0,
        });
      const rec = map.get(key);
      rec.TOTAL_QTY += Number(r.QTY || 0);
      if ((r.NAMA_TOKO || "").toUpperCase() === "CILANGKAP PUSAT")
        rec.PUSAT_QTY += Number(r.QTY || 0);
    });
    const rows = Array.from(map.values());
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Aggregated");
    XLSX.writeFile(
      wb,
      `Inventory_Aggregated_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const exportRawExcel = () => {
    const rows = allTransaksi.map((r) => ({
      id: r.id,
      TANGGAL_TRANSAKSI: r.TANGGAL_TRANSAKSI,
      NO_INVOICE: r.NO_INVOICE,
      NAMA_TOKO: r.NAMA_TOKO,
      NAMA_BRAND: r.NAMA_BRAND,
      NAMA_BARANG: r.NAMA_BARANG,
      QTY: r.QTY,
      NOMOR_UNIK: r.NOMOR_UNIK,
      hargaSRP: r.hargaSRP,
      HARGA_SUPLAYER: r.HARGA_SUPLAYER,
      STATUS: r.STATUS,
      KETERANGAN: r.KETERANGAN,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Raw");
    XLSX.writeFile(
      wb,
      `Inventory_Raw_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const exportPDF = async () => {
    try {
      const el = tableRef.current;
      if (!myTokoId) return;
      if (!el) {
        alert("Tabel tidak ditemukan");
        return;
      }
      const canvas = await html2canvas(el, { scale: 1.5 });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("l", "mm", "a4");
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      pdf.addImage(img, "PNG", 0, 0, w, h);
      pdf.save(`Inventory_${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      console.error("export pdf failed", e);
      alert("Gagal export PDF");
    }
  };

  const importExcel = async (e) => {
    const file = e.target.files?.[0];
    if (!myTokoId) return;
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const data = new Uint8Array(ev.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: "" });

        for (const row of json) {
          const tokoName = row.NAMA_TOKO || row.TOKO || "CILANGKAP PUSAT";
          const tokoIndex = fallbackTokoNames.findIndex(
            (t) =>
              String(t).toUpperCase() === String(tokoName || "").toUpperCase()
          );
          const tokoId = tokoIndex >= 0 ? tokoIndex + 1 : 1;
          const payload = {
            ...row,
            QTY: Number(row.QTY || row.QUANTITY || 0),
            HARGA_UNIT: Number(row.HARGA_UNIT || row.PRICE || 0),
            HARGA_SUPLAYER: Number(row.HARGA_SUPLAYER || 0),
            TANGGAL_TRANSAKSI: row.TANGGAL_TRANSAKSI || row.TANGGAL || "",
            NAMA_BRAND: row.NAMA_BRAND || row.BRAND || "",
            NAMA_BARANG: row.NAMA_BARANG || row.BARANG || "",
            NOMOR_UNIK: row.NOMOR_UNIK || row.IMEI || "",
            STATUS: row.STATUS || "Pending",
          };

          // 🚫 Cek IMEI Duplikat saat IMPORT (untuk row baru tanpa id)
          if (
            payload.NOMOR_UNIK &&
            !row.id &&
            isDuplicateIMEI(payload.NOMOR_UNIK)
          ) {
            console.warn(
              "Lewati row import karena IMEI sudah ada:",
              payload.NOMOR_UNIK
            );
            continue;
          }

          try {
            if (row.id && typeof updateTransaksi === "function") {
              await updateTransaksi(tokoId, row.id, payload);
            } else if (typeof addTransaksi === "function") {
              await addTransaksi(tokoId, payload);
            } else {
              console.warn(
                "Firebase add/update not found or missing tokoId for row:",
                row
              );
            }
          } catch (err) {
            console.error("Import row failed:", row, err);
          }
        }

        alert("Import selesai. Periksa console untuk error (jika ada).");
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error("Import failed", err);
      alert("Gagal import file.");
    }
  };

  // ===================== RENDER =====================
  return (
    <div className="p-4 md:p-4 bg-gradient-to-br from-slate-50 via-white to-blue-50 rounded-xl shadow-lg">
      <h2 className="text-xl md:text-2xl font-bold mb-2 text-blue-700">
        Stok Opname & Inventory Management
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Pantau stok CILANGKAP PUSAT & semua toko, lakukan opname cepat, dan
        sinkronkan dengan transaksi penjualan.
      </p>

      {/* CONTROL BAR */}
      <div className="bg-white rounded-xl shadow-md p-3 mb-4 flex flex-wrap items-center gap-3 transition hover:shadow-lg">
        <div className="flex items-center gap-2">
          <FaSearch className="text-gray-500" />
          <input
            placeholder="Cari brand / barang / invoice / nomor unik..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="p-2 border rounded w-72 max-w-full focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        <select
          value={filterToko}
          onChange={(e) => setFilterToko(e.target.value)}
          disabled={!isSuperAdmin} // 🔒 user toko tidak bisa ganti
          className={`px-2 py-1 rounded border ${
            !isSuperAdmin ? "bg-gray-100 cursor-not-allowed" : ""
          }`}
        >
          {isSuperAdmin && <option value="semua">SEMUA TOKO</option>}

          {tokoOptions.map((toko) => (
            <option key={toko} value={toko}>
              {toko}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setCurrentPage(1);
          }}
          className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value="semua">Semua Status</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>

        <select
          value={rowsPerPage}
          onChange={(e) => setRowsPerPage(Number(e.target.value) || 10)}
          className="p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <option value={10}>10 baris</option>
          <option value={20}>20 baris</option>
          <option value={50}>50 baris</option>
        </select>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            onClick={exportAggregatedExcel}
            className="px-3 py-1 bg-indigo-600 text-white rounded flex items-center text-sm hover:bg-indigo-700 transition"
          >
            <FaFileExcel className="mr-2" /> Agg Excel
          </button>

          <button
            onClick={exportRawExcel}
            className="px-3 py-1 bg-green-600 text-white rounded flex items-center text-sm hover:bg-green-700 transition"
          >
            <FaFileExcel className="mr-2" /> Raw Excel
          </button>

          <button
            onClick={exportPDF}
            className="px-3 py-1 bg-red-600 text-white rounded flex items-center text-sm hover:bg-red-700 transition"
          >
            <FaFilePdf className="mr-2" /> PDF
          </button>

          <label className="px-3 py-1 bg-blue-600 text-white rounded cursor-pointer flex items-center text-sm hover:bg-blue-700 transition">
            Import Excel
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={importExcel}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* STOK OPNAME CEPAT (Per SKU) */}
      <div className="bg-white p-2 rounded-xl shadow-md mt-4 transition hover:shadow-lg">
        <h3 className="font-semibold mb-3 text-blue-700">
          Stok Opname Cepat (Per SKU)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-2 border">No</th>
                <th className="p-2 border">Tanggal</th>
                <th className="p-2 border">No DO / Invoice</th>
                <th className="p-2 border">Nama Toko</th>
                <th className="p-2 border">SKU / No Unik</th>
                <th className="p-2 border">Brand</th>
                <th className="p-2 border">Barang</th>
                <th className="p-2 border">Harga Suplayer</th>
                <th className="p-2 border">Harga Unit</th>
                <th className="p-2 border">Stok Sistem</th>
                <th className="p-2 border">Stok Fisik</th>
                <th className="p-2 border">Selisih</th>
                <th className="p-2 border">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(aggregateBySku(allTransaksi)).map(
                ([key, ag], idx) => {
                  const sistem = ag.totalQty || 0;
                  const fisik = Number(opnameMap[key] ?? "");
                  const selisih = Number.isNaN(fisik) ? "" : fisik - sistem;

                  const sample = allTransaksi.find(
                    (x) =>
                      x.NOMOR_UNIK === key ||
                      `${x.NAMA_BRAND}|${x.NAMA_BARANG}` === key
                  );
                  const hargaSup = sample?.HARGA_SUPLAYER || 0;

                  const hargaUnit =
                    masterHargaMap[key]?.hargaSRP ??
                    masterHargaMap[`${ag.brand}|${ag.barang}`]?.hargaSRP ??
                    sample?.hargaSRP ??
                    0;

                  return (
                    <tr key={key} className="hover:bg-gray-50">
                      <td className="p-2 border text-center">{idx + 1}</td>
                      <td className="p-2 border">{ag.tanggal}</td>
                      <td className="p-2 border">{ag.noInvoice}</td>
                      <td className="p-2 border">{ag.toko}</td>
                      <td className="p-2 border font-mono">{key}</td>
                      <td className="p-2 border">{ag.brand}</td>
                      <td className="p-2 border">{ag.barang}</td>
                      <td className="p-2 border text-right">
                        Rp {fmt(hargaSup)}
                      </td>
                      <td className="p-2 border text-right">
                        Rp {fmt(hargaUnit)}
                      </td>
                      <td className="p-2 border text-center">{sistem}</td>
                      <td className="p-2 border">
                        <input
                          className="w-24 p-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                          value={opnameMap[key] ?? ""}
                          onChange={(e) =>
                            setOpnameMap((m) => ({
                              ...m,
                              [key]: e.target.value,
                            }))
                          }
                        />
                      </td>
                      <td
                        className={`p-2 border text-center ${
                          selisih < 0
                            ? "text-red-600"
                            : selisih > 0
                            ? "text-green-600"
                            : ""
                        }`}
                      >
                        {selisih === "" ? "-" : selisih}
                      </td>
                      <td className="p-2 border text-center space-x-2">
                        {isSuperAdmin && (
                          <button
                            className="text-blue-600 hover:text-blue-800 inline-flex"
                            onClick={() => openEditSku(key)}
                            title="Edit SKU / Harga"
                          >
                            <FaEdit />
                          </button>
                        )}

                        {isSuperAdmin && (
                          <button
                            className="text-red-600 hover:text-red-800 inline-flex"
                            onClick={() => deleteSku(key)}
                            title="Hapus SKU"
                          >
                            <FaTrash />
                          </button>
                        )}

                        {isSuperAdmin && (
                          <button
                            onClick={() =>
                              saveOpnameFor({
                                ...ag,
                                NOMOR_UNIK: key,
                                QTY: ag.totalQty,
                              })
                            }
                            className="px-2 py-1 bg-blue-600 text-white rounded text-xs inline-flex items-center hover:bg-blue-700 transition"
                            title="Simpan hasil stok opname"
                          >
                            <FaSave className="mr-1" /> Simpan
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL EDIT HARGA PER SKU */}
      {showModalEditSku && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white p-5 rounded shadow-md w-96">
            <h3 className="font-bold mb-3">Edit Harga SKU</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs block mb-1">Harga Suplayer</label>
                <input
                  type="number"
                  className="w-full border p-2 rounded"
                  value={editHargaSuplayer}
                  onChange={(e) => setEditHargaSuplayer(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs block mb-1">Harga Unit</label>
                <input
                  type="number"
                  className="w-full border p-2 rounded"
                  value={editHargaUnit}
                  onChange={(e) => setEditHargaUnit(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-3 py-1 bg-gray-400 text-white rounded"
                onClick={() => setShowModalEditSku(false)}
              >
                Batal
              </button>
              <button
                className="px-3 py-1 bg-blue-600 text-white rounded"
                onClick={saveEditSku}
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
