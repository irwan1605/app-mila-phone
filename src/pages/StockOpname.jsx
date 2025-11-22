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
} from "../services/FirebaseService";
import StockBarang from "../data/StockBarang"; // pastikan path sesuai project
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

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
  - CRUD transaksi (Tambah/Edit/Delete/Approve)
  - Stok Opname Cepat per SKU (selisih stok fisik vs sistem)
  - Export Excel (Aggregated + Raw) & PDF
  - Import Excel → update/add ke Firebase
*/

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

const rowsPerPageDefault = 12;

export default function StockOpname() {
  // data sources
  const [allTransaksi, setAllTransaksi] = useState([]); // merged all toko transaksi
  const [stockRealtime, setStockRealtime] = useState({}); // jika memakai listenStockAll

  // form & CRUD
  const [form, setForm] = useState({});
  const [editId, setEditId] = useState(null);

  // opname local { keyOrSku: stokFisik }
  const [opnameMap, setOpnameMap] = useState({});

  // UI controls
  const [filterToko, setFilterToko] = useState("semua");
  const [filterStatus, setFilterStatus] = useState("semua");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageDefault);

  const tableRef = useRef(null);

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
        (Date.now().toString() + Math.random().toString(36).slice(2)),
      TANGGAL_TRANSAKSI: r.TANGGAL_TRANSAKSI || r.TANGGAL || "",
      NO_INVOICE: r.NO_INVOICE || "",
      NAMA_USER: r.NAMA_USER || "",
      NO_HP_USER: r.NO_HP_USER || "",
      NAMA_PIC_TOKO: r.NAMA_PIC_TOKO || "",
      NAMA_SALES: r.NAMA_SALES || "",
      TITIPAN_REFERENSI: r.TITIPAN_REFERENSI || "",
      NAMA_TOKO: r.NAMA_TOKO || r.TOKO || "PUSAT",
      NAMA_BRAND: r.NAMA_BRAND || r.BRAND || "",
      NAMA_BARANG: r.NAMA_BARANG || r.BARANG || "",
      QTY: Number(r.QTY || 0),
      NOMOR_UNIK: r.NOMOR_UNIK || r.IMEI || r.NO_DINAMO || r.NO_RANGKA || "",
      KATEGORI_HARGA: r.KATEGORI_HARGA || "",
      HARGA_UNIT: Number(r.HARGA_UNIT || r.HARGA || 0),
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
              NAMA_TOKO: "PUSAT",
              NAMA_BRAND: s.brand || s.NAMA_BRAND || "",
              NAMA_BARANG: s.nama || s.NAMA_BARANG || s.BARANG || "",
              QTY: s.qty || s.stock || 1,
              NOMOR_UNIK:
                s.imei || s.NOMOR_UNIK || s.SKU || `SKU-DUMMY-${idx + 1}`,
              HARGA_UNIT: s.harga || s.HARGA_UNIT || 0,
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
              NAMA_TOKO: "PUSAT",
              NAMA_BRAND: s.brand || s.NAMA_BRAND || "",
              NAMA_BARANG: s.nama || s.NAMA_BARANG || s.BARANG || "",
              QTY: s.qty || s.stock || 1,
              NOMOR_UNIK:
                s.imei || s.NOMOR_UNIK || s.SKU || `SKU-DUMMY-${idx + 1}`,
              HARGA_UNIT: s.harga || s.HARGA_UNIT || 0,
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

  // ===================== Derivasi: options toko, filter, pagination =====================
  const tokoOptions = useMemo(() => {
    const names = [
      ...new Set(
        (allTransaksi || [])
          .map((r) => r.NAMA_TOKO)
          .filter(Boolean)
          .map((t) => String(t))
      ),
    ];
    if (!names.includes("PUSAT")) names.unshift("PUSAT");
    return names.length ? names : fallbackTokoNames;
  }, [allTransaksi]);

  const filteredRows = useMemo(() => {
    return allTransaksi.filter((r) => {
      let ok = true;
      if (filterToko !== "semua") {
        ok = ok && String(r.NAMA_TOKO || "") === String(filterToko || "");
      }
      if (filterStatus !== "semua") {
        ok =
          ok &&
          String(r.STATUS || "").toLowerCase() ===
            String(filterStatus || "").toLowerCase();
      }
      if (search.trim()) {
        const s = search.trim().toLowerCase();
        ok =
          ok &&
          ((r.NOMOR_UNIK || "").toLowerCase().includes(s) ||
            (r.NAMA_BRAND || "").toLowerCase().includes(s) ||
            (r.NAMA_BARANG || "").toLowerCase().includes(s) ||
            (r.NO_INVOICE || "").toLowerCase().includes(s));
      }
      return ok;
    });
  }, [allTransaksi, filterToko, filterStatus, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / (rowsPerPage || rowsPerPageDefault))
  );

  useEffect(() => {
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

  // ===================== Form Handlers =====================
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    const val =
      type === "number" ? (value === "" ? "" : Number(value)) : value;
    setForm((f) => ({ ...f, [name]: val }));
  };

  const handleSave = async () => {
    const tanggal =
      form.TANGGAL_TRANSAKSI || form.TANGGAL || new Date().toISOString().slice(0, 10);
    const brand = form.NAMA_BRAND || form.BRAND;
    const barang = form.NAMA_BARANG || form.BARANG;
    const tokoName = form.NAMA_TOKO || "PUSAT";
    const qty = Number(form.QTY || 0);
    const hargaUnit = Number(form.HARGA_UNIT || form.HARGA || 0);

    if (!tanggal || !brand || !barang || !tokoName) {
      alert("Isi minimal: Tanggal, Toko, Nama Brand, Nama Barang");
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
      HARGA_UNIT: hargaUnit,
      HARGA: hargaUnit,
      TOTAL: total,
      STATUS: form.STATUS || "Pending",
    };

    try {
      if (editId) {
        const tokoIndex = fallbackTokoNames.findIndex(
          (n) =>
            String(n).toUpperCase() === String(payload.NAMA_TOKO || "").toUpperCase()
        );
        const tokoId = tokoIndex >= 0 ? tokoIndex + 1 : 1;
        if (typeof updateTransaksi === "function") {
          await updateTransaksi(tokoId, editId, payload);
        } else {
          console.warn("updateTransaksi not found");
        }
        setAllTransaksi((d) =>
          d.map((x) =>
            x.id === editId
              ? normalizeRecord({ id: editId, ...payload })
              : x
          )
        );
      } else {
        const tokoIndex = fallbackTokoNames.findIndex(
          (n) =>
            String(n).toUpperCase() === String(payload.NAMA_TOKO || "").toUpperCase()
        );
        const tokoId = tokoIndex >= 0 ? tokoIndex + 1 : 1;
        if (typeof addTransaksi === "function") {
          await addTransaksi(tokoId, payload);
        } else {
          console.warn("addTransaksi not found");
        }
        setAllTransaksi((d) => [...d, normalizeRecord(payload)]);
      }

      setForm({});
      setEditId(null);
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

  const handleDelete = async (row) => {
    if (!window.confirm("Yakin hapus transaksi ini?")) return;
    try {
      const tokoIndex = fallbackTokoNames.findIndex(
        (n) =>
          String(n).toUpperCase() === String(row.NAMA_TOKO || "").toUpperCase()
      );
      const tokoId = tokoIndex >= 0 ? tokoIndex + 1 : 1;
      if (typeof deleteTransaksi === "function") {
        await deleteTransaksi(tokoId, row.id);
      } else {
        console.warn("deleteTransaksi not found");
      }
      setAllTransaksi((d) => d.filter((x) => x.id !== row.id));
      alert("Berhasil dihapus");
    } catch (err) {
      console.error("delete error", err);
      alert("Gagal menghapus");
    }
  };

  const handleApproval = async (row, status) => {
    try {
      const tokoIndex = fallbackTokoNames.findIndex(
        (n) =>
          String(n).toUpperCase() === String(row.NAMA_TOKO || "").toUpperCase()
      );
      const tokoId = tokoIndex >= 0 ? tokoIndex + 1 : 1;
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
      const key =
        (r.NOMOR_UNIK && String(r.NOMOR_UNIK).trim()) ||
        `${(r.NAMA_BRAND || "").trim()}|${(r.NAMA_BARANG || "").trim()}`;
      if (!map[key]) {
        map[key] = {
          key,
          brand: r.NAMA_BRAND,
          barang: r.NAMA_BARANG,
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
      `${record.NAMA_BRAND || record.brand}|${record.NAMA_BARANG || record.barang}`;
    const fisik = Number(opnameMap[key] ?? "");
    const sistemQty = Number(record.QTY || record.QTY_SYSTEM || record.totalQty || 0);

    if (Number.isNaN(fisik)) {
      alert("Masukkan angka stok fisik yang valid");
      return;
    }

    const selisih = fisik - sistemQty;
    if (selisih === 0) {
      alert("Tidak ada selisih - tidak perlu disimpan");
      return;
    }

    const payload = {
      TANGGAL_TRANSAKSI: new Date().toISOString().slice(0, 10),
      NO_INVOICE: `OPN-${Date.now()}`,
      NAMA_USER: "SYSTEM OPNAME",
      NAMA_TOKO: "PUSAT",
      NAMA_BRAND: record.NAMA_BRAND || record.brand || "",
      NAMA_BARANG: record.NAMA_BARANG || record.barang || "",
      QTY: Math.abs(selisih),
      NOMOR_UNIK: record.NOMOR_UNIK || key,
      HARGA_UNIT: record.HARGA_UNIT || record.lastPrice || 0,
      TOTAL:
        Math.abs(selisih) * (record.HARGA_UNIT || record.lastPrice || 0),
      PAYMENT_METODE: "STOK OPNAME",
      SYSTEM_PAYMENT: "SYSTEM",
      KETERANGAN:
        selisih > 0
          ? "Opname: Adjustment (Tambah)"
          : "Opname: Adjustment (Kurang)",
      STATUS: "Approved",
    };

    try {
      const tokoId = fallbackTokoNames.findIndex((n) => n === "PUSAT") + 1;
      if (typeof addTransaksi === "function") {
        await addTransaksi(tokoId, payload);
      } else {
        console.warn("addTransaksi missing");
      }

      // integrasi dengan tabel stock/stockRealtime bila diinginkan
      if (typeof addStock === "function" && selisih > 0) {
        await addStock("PUSAT", payload.NOMOR_UNIK || payload.NO_INVOICE, {
          nama: payload.NAMA_BARANG,
          imei: payload.NOMOR_UNIK,
          qty: Math.abs(selisih),
        });
      }
      if (typeof reduceStock === "function" && selisih < 0) {
        await reduceStock(
          "PUSAT",
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

  // ===================== Export / Import =====================
  const exportAggregatedExcel = () => {
    const map = new Map();
    allTransaksi.forEach((r) => {
      const key =
        (r.NOMOR_UNIK && r.NOMOR_UNIK.trim()) ||
        `${(r.NAMA_BRAND || "").trim()}|${(r.NAMA_BARANG || "").trim()}`;
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
      if ((r.NAMA_TOKO || "").toUpperCase() === "PUSAT")
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
      HARGA_UNIT: r.HARGA_UNIT,
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
    if (!file) return;
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const data = new Uint8Array(ev.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(ws, { defval: "" });

        for (const row of json) {
          const tokoName = row.NAMA_TOKO || row.TOKO || "PUSAT";
          const tokoIndex = fallbackTokoNames.findIndex(
            (t) =>
              String(t).toUpperCase() === String(tokoName || "").toUpperCase()
          );
          const tokoId = tokoIndex >= 0 ? tokoIndex + 1 : 1;
          const payload = {
            ...row,
            QTY: Number(row.QTY || row.QUANTITY || 0),
            HARGA_UNIT: Number(row.HARGA_UNIT || row.PRICE || 0),
            TANGGAL_TRANSAKSI: row.TANGGAL_TRANSAKSI || row.TANGGAL || "",
            NAMA_BRAND: row.NAMA_BRAND || row.BRAND || "",
            NAMA_BARANG: row.NAMA_BARANG || row.BARANG || "",
            NOMOR_UNIK: row.NOMOR_UNIK || row.IMEI || "",
            STATUS: row.STATUS || "Pending",
          };

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
    <div className="p-4 bg-gray-100 rounded-xl shadow-md">
      <h2 className="text-xl font-bold mb-2">
        Stok Opname & Inventory Management
      </h2>
      <p className="text-sm text-gray-600 mb-4">
        Pantau stok PUSAT & semua toko, lakukan opname cepat, dan sinkronkan
        dengan transaksi penjualan.
      </p>

      {/* CONTROL BAR */}
      <div className="bg-white rounded shadow p-3 mb-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <FaSearch className="text-gray-500" />
          <input
            placeholder="Cari brand / barang / invoice / nomor unik..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="p-2 border rounded w-72"
          />
        </div>

        <select
          value={filterToko}
          onChange={(e) => {
            setFilterToko(e.target.value);
            setCurrentPage(1);
          }}
          className="p-2 border rounded"
        >
          <option value="semua">Semua Toko</option>
          {tokoOptions.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <select
          value={filterStatus}
          onChange={(e) => {
            setFilterStatus(e.target.value);
            setCurrentPage(1);
          }}
          className="p-2 border rounded"
        >
          <option value="semua">Semua Status</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>

        <select
          value={rowsPerPage}
          onChange={(e) => setRowsPerPage(Number(e.target.value) || 10)}
          className="p-2 border rounded"
        >
          <option value={10}>10 baris</option>
          <option value={20}>20 baris</option>
          <option value={50}>50 baris</option>
        </select>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button
            onClick={exportAggregatedExcel}
            className="px-3 py-1 bg-indigo-600 text-white rounded flex items-center text-sm"
          >
            <FaFileExcel className="mr-2" /> Agg Excel
          </button>

          <button
            onClick={exportRawExcel}
            className="px-3 py-1 bg-green-600 text-white rounded flex items-center text-sm"
          >
            <FaFileExcel className="mr-2" /> Raw Excel
          </button>

          <button
            onClick={exportPDF}
            className="px-3 py-1 bg-red-600 text-white rounded flex items-center text-sm"
          >
            <FaFilePdf className="mr-2" /> PDF
          </button>

          <label className="px-3 py-1 bg-blue-600 text-white rounded cursor-pointer flex items-center text-sm">
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

      {/* FORM INPUT TRANSAKSI */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <h3 className="font-semibold mb-3">Input / Edit Transaksi Stok</h3>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm mb-1">Tanggal Transaksi</label>
            <input
              type="date"
              name="TANGGAL_TRANSAKSI"
              value={form.TANGGAL_TRANSAKSI || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">No Invoice</label>
            <input
              name="NO_INVOICE"
              value={form.NO_INVOICE || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              placeholder="INV-YYYY-XXXXX"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Nama Toko</label>
            <select
              name="NAMA_TOKO"
              value={form.NAMA_TOKO || "PUSAT"}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            >
              {tokoOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Nama Brand</label>
            <input
              name="NAMA_BRAND"
              value={form.NAMA_BRAND || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Nama Barang</label>
            <input
              name="NAMA_BARANG"
              value={form.NAMA_BARANG || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Qty</label>
            <input
              type="number"
              name="QTY"
              value={form.QTY || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">
              IMEI / No Dinamo / No Rangka
            </label>
            <input
              name="NOMOR_UNIK"
              value={form.NOMOR_UNIK || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Kategori Harga</label>
            <input
              name="KATEGORI_HARGA"
              value={form.KATEGORI_HARGA || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              placeholder="Retail / Grosir / Promo"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Harga Unit</label>
            <input
              type="number"
              name="HARGA_UNIT"
              value={form.HARGA_UNIT || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Payment Metode</label>
            <input
              name="PAYMENT_METODE"
              value={form.PAYMENT_METODE || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              placeholder="Cash / Kredit / dll"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">System Payment</label>
            <input
              name="SYSTEM_PAYMENT"
              value={form.SYSTEM_PAYMENT || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              placeholder="PT. / Leasing / dll"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">MDR</label>
            <input
              type="number"
              name="MDR"
              value={form.MDR || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Potongan MDR</label>
            <input
              type="number"
              name="POTONGAN_MDR"
              value={form.POTONGAN_MDR || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">No Order / Kontrak</label>
            <input
              name="NO_ORDER_KONTRAK"
              value={form.NO_ORDER_KONTRAK || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Tenor</label>
            <input
              name="TENOR"
              value={form.TENOR || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
              placeholder="12x, 24x, dll"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">DP User Merchant</label>
            <input
              type="number"
              name="DP_USER_MERCHANT"
              value={form.DP_USER_MERCHANT || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">DP User ke Toko</label>
            <input
              type="number"
              name="DP_USER_TOKO"
              value={form.DP_USER_TOKO || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Request DP Talangan</label>
            <input
              type="number"
              name="REQUEST_DP_TALANGAN"
              value={form.REQUEST_DP_TALANGAN || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div className="col-span-3">
            <label className="block text-sm mb-1">Keterangan</label>
            <textarea
              name="KETERANGAN"
              value={form.KETERANGAN || ""}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Status</label>
            <select
              name="STATUS"
              value={form.STATUS || "Pending"}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            >
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded flex items-center"
          >
            <FaSave className="mr-2" /> {editId ? "Update" : "Tambah"} Data
          </button>
          <button
            onClick={() => {
              setForm({});
              setEditId(null);
            }}
            className="px-4 py-2 border rounded flex items-center"
          >
            <FaTimes className="mr-2" />
            Batal
          </button>
        </div>
      </div>

      {/* TABLE TRANSAKSI */}
      <div className="bg-white rounded shadow overflow-x-auto" ref={tableRef}>
        <table className="w-full text-sm border-collapse">
          <thead className="bg-blue-600 text-white">
            <tr>
              <th className="p-2 border">Tanggal</th>
              <th className="p-2 border">Invoice</th>
              <th className="p-2 border">Toko</th>
              <th className="p-2 border">Brand</th>
              <th className="p-2 border">Barang</th>
              <th className="p-2 border">Qty</th>
              <th className="p-2 border">No EMEI / MESIN</th>
              <th className="p-2 border">Harga Unit</th>
              <th className="p-2 border">Total</th>
              <th className="p-2 border">Status</th>
              <th className="p-2 border">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {paginated.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50">
                <td className="p-2 border">{r.TANGGAL_TRANSAKSI}</td>
                <td className="p-2 border">{r.NO_INVOICE}</td>
                <td className="p-2 border">{r.NAMA_TOKO}</td>
                <td className="p-2 border">{r.NAMA_BRAND}</td>
                <td className="p-2 border">{r.NAMA_BARANG}</td>
                <td className="p-2 border text-center">{r.QTY}</td>
                <td className="p-2 border font-mono">{r.NOMOR_UNIK}</td>
                <td className="p-2 border text-right">
                  Rp {fmt(r.HARGA_UNIT)}
                </td>
                <td className="p-2 border text-right">Rp {fmt(r.TOTAL)}</td>
                <td
                  className={`p-2 border font-semibold ${
                    r.STATUS === "Approved"
                      ? "text-green-600"
                      : r.STATUS === "Rejected"
                      ? "text-red-600"
                      : "text-yellow-600"
                  }`}
                >
                  {r.STATUS}
                </td>
                <td className="p-2 border text-center space-x-2">
                  <button
                    onClick={() => handleEdit(r)}
                    className="text-blue-600 hover:text-blue-800"
                    title="Edit"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(r)}
                    className="text-red-600 hover:text-red-800"
                    title="Hapus"
                  >
                    <FaTrash />
                  </button>
                  <button
                    onClick={() => handleApproval(r, "Approved")}
                    className="text-green-600 hover:text-green-800"
                    title="Approve"
                  >
                    ✓
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="flex justify-between items-center mt-3 text-sm">
        <span>
          Halaman {currentPage} dari {totalPages} ({filteredRows.length} data)
        </span>
        <div className="space-x-2">
          <button
            onClick={() =>
              currentPage > 1 && setCurrentPage((p) => p - 1)
            }
            disabled={currentPage === 1}
            className="px-2 py-1 border rounded disabled:opacity-40"
          >
            <FaChevronLeft />
          </button>
          <button
            onClick={() =>
              currentPage < totalPages && setCurrentPage((p) => p + 1)
            }
            disabled={currentPage === totalPages}
            className="px-2 py-1 border rounded disabled:opacity-40"
          >
            <FaChevronRight />
          </button>
        </div>
      </div>

      {/* STOK OPNAME CEPAT */}
      <div className="bg-white p-4 rounded shadow mt-6">
        <h3 className="font-semibold mb-3">Stok Opname Cepat (Per SKU)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-gray-200">
              <tr>
                <th className="p-2 border">No</th>
                <th className="p-2 border">SKU / No Unik</th>
                <th className="p-2 border">Brand</th>
                <th className="p-2 border">Barang</th>
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
                  return (
                    <tr key={key} className="hover:bg-gray-50">
                      <td className="p-2 border text-center">{idx + 1}</td>
                      <td className="p-2 border font-mono">{key}</td>
                      <td className="p-2 border">{ag.brand}</td>
                      <td className="p-2 border">{ag.barang}</td>
                      <td className="p-2 border text-center">{sistem}</td>
                      <td className="p-2 border">
                        <input
                          className="w-24 p-1 border rounded"
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
                      <td className="p-2 border text-center">
                        <button
                          onClick={() =>
                            saveOpnameFor({
                              ...ag,
                              NOMOR_UNIK: key,
                              QTY: ag.totalQty,
                            })
                          }
                          className="px-3 py-1 bg-blue-600 text-white rounded text-xs flex items-center mx-auto"
                        >
                          <FaSave className="mr-1" /> Simpan Opname
                        </button>
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
