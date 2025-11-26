import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import {
  listenAllTransaksi,
  addTransaksi,
  updateTransaksi,
  deleteTransaksi,
  addStock,
  reduceStock,
} from "../../services/FirebaseService";
import StockBarang from "../../data/StockBarang";
import * as XLSX from "xlsx";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import {
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
  CardStockOpnameToko.jsx (INTEGRASI MASTER BARANG)

  ✅ Versi khusus TOKO:
     - Toko diambil dari route (tokoId)
     - CILANGKAP PUSAT = TOKO INDUK
     - Toko lain menyesuaikan stok dari transaksi & transfer secara realtime

  ✅ Fitur:
     - Listener listenAllTransaksi (realtime Firebase)
     - FORM Opname dengan:
       KATEGORI_BRAND, NAMA_BRAND, NAMA_BARANG (auto dari Master Barang)
     - TABEL stok per transaksi (per toko)
     - Quick Opname per SKU (IMEI / NOMOR_UNIK)
     - Export Excel & PDF
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

const rowsPerPageDefault = 10;

// Sama seperti MasterBarang.jsx
const KATEGORI_OPTIONS = [
  "SEPEDA LISTRIK",
  "MOTOR LISTRIK",
  "HANDPHONE",
  "ACCESORIES",
];

const fmt = (v) => Number(v || 0).toLocaleString("id-ID");

export default function CardStockOpnameToko() {
  const { tokoId } = useParams(); // /toko/:tokoId/stock-opname
  const finalTokoName = tokoId
    ? tokoId.replace(/-/g, " ").toUpperCase()
    : "CILANGKAP PUSAT";

  const [allTransaksi, setAllTransaksi] = useState([]);
  const [allTransaksiGlobal, setAllTransaksiGlobal] = useState([]); // untuk master kategori/brand

  const [form, setForm] = useState({
    KATEGORI_BRAND: "",
    NAMA_BRAND: "",
    NAMA_BARANG: "",
    QTY: "",
    HARGA_UNIT: "",
    NOMOR_UNIK: "",
  });
  const [editId, setEditId] = useState(null);

  const [opnameMap, setOpnameMap] = useState({});
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(rowsPerPageDefault);

  const tableRef = useRef(null);

  // ===================== NORMALISASI RECORD =====================
  function normalizeRecord(r = {}) {
    return {
      id:
        r.id ??
        r._id ??
        r.key ??
        (Date.now().toString() + Math.random().toString(36).slice(2)),
      TANGGAL_TRANSAKSI: r.TANGGAL_TRANSAKSI || "",
      NO_INVOICE: r.NO_INVOICE || "",
      NAMA_TOKO: r.NAMA_TOKO || finalTokoName,
      NAMA_BRAND: r.NAMA_BRAND || "",
      NAMA_BARANG: r.NAMA_BARANG || "",
      KATEGORI_BRAND: r.KATEGORI_BRAND || "",
      QTY: Number(r.QTY || 0),
      NOMOR_UNIK: r.NOMOR_UNIK || r.IMEI || "",
      HARGA_UNIT: Number(r.HARGA_UNIT || 0),
      TOTAL:
        Number(r.TOTAL) ||
        Number(r.QTY || 0) * Number(r.HARGA_UNIT || 0),
      STATUS: r.STATUS || "Approved",
      _raw: r,
    };
  }

  // ===================== FALLBACK STOK BARANG (UNTUK TOKO INDUK) =====================
  function buildFallbackFromStockBarang(toko) {
    if (!Array.isArray(StockBarang)) return [];
    return StockBarang.map((s, idx) =>
      normalizeRecord({
        id: `SB-${idx}`,
        TANGGAL_TRANSAKSI: new Date().toISOString().slice(0, 10),
        NO_INVOICE: `DUMMY-${idx + 1}`,
        NAMA_TOKO: toko,
        NAMA_BRAND: s.brand,
        NAMA_BARANG: s.nama,
        KATEGORI_BRAND: s.kategori || "",
        QTY: s.qty || s.stock || 1,
        NOMOR_UNIK: s.imei || `SKU-${idx + 1}`,
        HARGA_UNIT: s.harga || 0,
        STATUS: "Approved",
      })
    );
  }

  // ===================== LISTENER ALL TRANSAKSI =====================
  useEffect(() => {
    if (typeof listenAllTransaksi === "function") {
      const unsub = listenAllTransaksi((items = []) => {
        const norm = items.map((r) => normalizeRecord(r));

        setAllTransaksiGlobal(norm);

        // Filter per toko (realtime)
        const onlyThisToko = norm.filter(
          (r) =>
            String(r.NAMA_TOKO || "").toUpperCase() ===
            String(finalTokoName).toUpperCase()
        );

        // CILANGKAP PUSAT boleh pakai fallback master jika masih kosong
        if (
          finalTokoName === "CILANGKAP PUSAT" &&
          onlyThisToko.length === 0 &&
          Array.isArray(StockBarang)
        ) {
          setAllTransaksi(buildFallbackFromStockBarang(finalTokoName));
        } else {
          setAllTransaksi(onlyThisToko);
        }

        setCurrentPage(1);
      });
      return () => unsub && unsub();
    }
  }, [finalTokoName]);

  // ===================== MASTER DATA KATEGORI / BRAND DARI MASTER BARANG (TOKO INDUK) =====================
  const masterSkuMap = useMemo(() => {
    const map = {};
    (allTransaksiGlobal || []).forEach((x) => {
      const toko = (x.NAMA_TOKO || "").toUpperCase();
      if (toko !== "CILANGKAP PUSAT") return;

      const brand = (x.NAMA_BRAND || "").trim();
      const barang = (x.NAMA_BARANG || "").trim();
      if (!brand && !barang) return;

      const key = `${brand}|${barang}`;
      if (!map[key]) {
        map[key] = {
          brand,
          barang,
          kategori: x.KATEGORI_BRAND || "",
          hargaUnit: Number(x.HARGA_UNIT || 0),
        };
      } else {
        if (x.KATEGORI_BRAND && !map[key].kategori) {
          map[key].kategori = x.KATEGORI_BRAND;
        }
        if (x.HARGA_UNIT) {
          map[key].hargaUnit = Number(x.HARGA_UNIT);
        }
      }
    });

    // jika masih kosong & ada StockBarang → isi dari sana
    if (Object.keys(map).length === 0 && Array.isArray(StockBarang)) {
      StockBarang.forEach((s) => {
        const brand = (s.brand || "").trim();
        const barang = (s.nama || "").trim();
        if (!brand && !barang) return;
        const key = `${brand}|${barang}`;
        if (!map[key]) {
          map[key] = {
            brand,
            barang,
            kategori: s.kategori || "",
            hargaUnit: Number(s.harga || 0),
          };
        }
      });
    }

    return map;
  }, [allTransaksiGlobal]);

  const brandByKategori = useMemo(() => {
    const list = Object.values(masterSkuMap);
    const brandSet = new Set(
      list
        .filter((m) =>
          form.KATEGORI_BRAND
            ? m.kategori === form.KATEGORI_BRAND
            : true
        )
        .map((m) => m.brand)
        .filter(Boolean)
    );
    return Array.from(brandSet);
  }, [masterSkuMap, form.KATEGORI_BRAND]);

  const barangByBrand = useMemo(() => {
    const list = Object.values(masterSkuMap);
    const barangSet = new Set(
      list
        .filter((m) => {
          if (form.KATEGORI_BRAND && m.kategori !== form.KATEGORI_BRAND)
            return false;
          if (form.NAMA_BRAND && m.brand !== form.NAMA_BRAND) return false;
          return true;
        })
        .map((m) => m.barang)
        .filter(Boolean)
    );
    return Array.from(barangSet);
  }, [masterSkuMap, form.KATEGORI_BRAND, form.NAMA_BRAND]);

  // ===================== FILTER + PAGINATION =====================
  const filteredRows = useMemo(() => {
    return allTransaksi.filter((r) => {
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      return (
        (r.NAMA_BARANG || "").toLowerCase().includes(s) ||
        (r.NAMA_BRAND || "").toLowerCase().includes(s) ||
        (r.KATEGORI_BRAND || "").toLowerCase().includes(s) ||
        (r.NOMOR_UNIK || "").toLowerCase().includes(s) ||
        (r.NO_INVOICE || "").toLowerCase().includes(s)
      );
    });
  }, [allTransaksi, search]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / rowsPerPage)
  );

  const paginated = filteredRows.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  // ===================== FORM HANDLERS =====================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSelectKategori = (value) => {
    setForm((f) => ({
      ...f,
      KATEGORI_BRAND: value,
      NAMA_BRAND: "",
      NAMA_BARANG: "",
      HARGA_UNIT: "",
    }));
  };

  const handleSelectBrand = (value) => {
    setForm((f) => ({
      ...f,
      NAMA_BRAND: value,
      NAMA_BARANG: "",
      HARGA_UNIT: "",
    }));
  };

  const handleSelectBarang = (value) => {
    const brand = form.NAMA_BRAND;
    const key = `${(brand || "").trim()}|${(value || "").trim()}`;
    const master = masterSkuMap[key];
    setForm((f) => ({
      ...f,
      NAMA_BARANG: value,
      HARGA_UNIT: master ? master.hargaUnit : f.HARGA_UNIT,
    }));
  };

  const handleSave = async () => {
    if (!form.NAMA_BARANG || !form.QTY) {
      alert("Nama Barang & QTY wajib.");
      return;
    }

    const payload = {
      ...form,
      NAMA_TOKO: finalTokoName,
      QTY: Number(form.QTY || 0),
      HARGA_UNIT: Number(form.HARGA_UNIT || 0),
      TOTAL: Number(form.QTY || 0) * Number(form.HARGA_UNIT || 0),
      TANGGAL_TRANSAKSI:
        form.TANGGAL_TRANSAKSI || new Date().toISOString().slice(0, 10),
      KATEGORI_BRAND: form.KATEGORI_BRAND || "",
      NAMA_BRAND: form.NAMA_BRAND || "",
      NAMA_BARANG: form.NAMA_BARANG || "",
      NOMOR_UNIK: form.NOMOR_UNIK || "",
    };

    try {
      if (editId) {
        await updateTransaksi(finalTokoName, editId, payload);
        setAllTransaksi((d) =>
          d.map((x) =>
            x.id === editId ? normalizeRecord({ id: editId, ...payload }) : x
          )
        );
      } else {
        await addTransaksi(finalTokoName, payload);
        setAllTransaksi((d) => [...d, normalizeRecord(payload)]);
      }

      setForm({
        KATEGORI_BRAND: "",
        NAMA_BRAND: "",
        NAMA_BARANG: "",
        QTY: "",
        HARGA_UNIT: "",
        NOMOR_UNIK: "",
      });
      setEditId(null);
      alert("Berhasil disimpan.");
    } catch (err) {
      console.error(err);
      alert("Gagal simpan.");
    }
  };

  const handleEdit = (row) => {
    setForm({
      KATEGORI_BRAND: row.KATEGORI_BRAND || "",
      NAMA_BRAND: row.NAMA_BRAND || "",
      NAMA_BARANG: row.NAMA_BARANG || "",
      QTY: row.QTY || "",
      HARGA_UNIT: row.HARGA_UNIT || "",
      NOMOR_UNIK: row.NOMOR_UNIK || "",
      TANGGAL_TRANSAKSI: row.TANGGAL_TRANSAKSI || "",
    });
    setEditId(row.id);
  };

  const handleDelete = async (row) => {
    if (!window.confirm("Yakin hapus?")) return;
    await deleteTransaksi(finalTokoName, row.id);
    setAllTransaksi((d) => d.filter((x) => x.id !== row.id));
  };

  // ===================== OPNAME CEPAT =====================
  function aggregateBySku(items = []) {
    const map = {};
    items.forEach((r) => {
      const key = r.NOMOR_UNIK || `${r.NAMA_BRAND}|${r.NAMA_BARANG}`;
      if (!map[key]) {
        map[key] = {
          key,
          barang: r.NAMA_BARANG,
          brand: r.NAMA_BRAND,
          kategori: r.KATEGORI_BRAND,
          totalQty: 0,
          lastPrice: r.HARGA_UNIT,
        };
      }
      map[key].totalQty += Number(r.QTY || 0);
    });
    return map;
  }

  const saveOpnameFor = async (record) => {
    const fisik = Number(opnameMap[record.key] ?? "");
    const sistem = Number(record.totalQty || 0);
    if (Number.isNaN(fisik)) return alert("Isi stok fisik.");

    const selisih = fisik - sistem;
    if (selisih === 0) return alert("Tidak ada selisih.");

    const payload = {
      TANGGAL_TRANSAKSI: new Date().toISOString().slice(0, 10),
      NO_INVOICE: `OPN-${Date.now()}`,
      NAMA_TOKO: finalTokoName,
      NAMA_BARANG: record.barang,
      NAMA_BRAND: record.brand,
      KATEGORI_BRAND: record.kategori || "",
      QTY: Math.abs(selisih),
      NOMOR_UNIK: record.key,
      HARGA_UNIT: record.lastPrice,
      TOTAL: Math.abs(selisih) * record.lastPrice,
      STATUS: "Approved",
      KETERANGAN:
        selisih > 0
          ? "Opname: Penambahan Stok"
          : "Opname: Pengurangan Stok",
    };

    await addTransaksi(finalTokoName, payload);

    if (selisih > 0)
      await addStock(finalTokoName, record.key, { qty: selisih });
    if (selisih < 0)
      await reduceStock(finalTokoName, record.key, Math.abs(selisih));

    setAllTransaksi((d) => [...d, normalizeRecord(payload)]);
    setOpnameMap((m) => ({ ...m, [record.key]: "" }));
    alert("Opname disimpan.");
  };

  // ===================== EXPORT =====================
  const exportPDF = async () => {
    const canvas = await html2canvas(tableRef.current);
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("l", "mm", "a4");
    pdf.addImage(img, "PNG", 0, 0, 297, 210);
    pdf.save(`StockOpname_${finalTokoName}.pdf`);
  };

  const exportExcel = () => {
    const sheetData = filteredRows.map((r) => ({
      Tanggal: r.TANGGAL_TRANSAKSI,
      Toko: r.NAMA_TOKO,
      Kategori_Brand: r.KATEGORI_BRAND,
      Brand: r.NAMA_BRAND,
      Barang: r.NAMA_BARANG,
      SKU_IMEI: r.NOMOR_UNIK,
      Qty: r.QTY,
      Harga_Unit: r.HARGA_UNIT,
      Total: r.TOTAL,
      Status: r.STATUS,
    }));

    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "STOCK_OPNAME");
    XLSX.writeFile(
      wb,
      `STOCK_OPNAME_${finalTokoName}_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`
    );
  };

  // ===================== RENDER =====================
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-5">

        {/* HEADER */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              Stock Opname — {finalTokoName}
            </h2>
            <p className="text-xs text-slate-500">
              Terintegrasi Master Barang, stok live per toko, realtime dari Firebase.
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={exportExcel}
              className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs sm:text-sm flex items-center gap-1 shadow-sm hover:bg-emerald-700"
            >
              <FaFileExcel /> Excel
            </button>
            <button
              onClick={exportPDF}
              className="px-3 py-2 bg-red-600 text-white rounded-lg text-xs sm:text-sm flex items-center gap-1 shadow-sm hover:bg-red-700"
            >
              <FaFilePdf /> PDF
            </button>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex items-center bg-white/80 backdrop-blur border rounded-xl px-3 py-2 shadow-sm flex-1">
            <FaSearch className="text-gray-400" />
            <input
              placeholder="Cari barang / brand / kategori / IMEI / invoice..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ml-2 flex-1 outline-none text-sm bg-transparent"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              className="border rounded-lg px-3 py-2 text-xs sm:text-sm bg-white/80"
              value={rowsPerPage}
              onChange={(e) => setRowsPerPage(Number(e.target.value || 10))}
            >
              <option value={5}>5 / halaman</option>
              <option value={10}>10 / halaman</option>
              <option value={20}>20 / halaman</option>
              <option value={50}>50 / halaman</option>
            </select>
          </div>
        </div>

        {/* FORM INPUT OPNAME */}
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow-md p-4 grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Kategori */}
          <div>
            <label className="text-[11px] text-slate-600">Kategori Barang</label>
            <select
              name="KATEGORI_BRAND"
              value={form.KATEGORI_BRAND}
              onChange={(e) => handleSelectKategori(e.target.value)}
              className="w-full border rounded-lg px-2 py-2 text-xs sm:text-sm"
            >
              <option value="">- Pilih Kategori -</option>
              {KATEGORI_OPTIONS.map((k) => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          {/* Brand */}
          <div>
            <label className="text-[11px] text-slate-600">Brand</label>
            <input
              list="brand-list-opname"
              name="NAMA_BRAND"
              value={form.NAMA_BRAND}
              onChange={(e) => handleSelectBrand(e.target.value)}
              className="w-full border rounded-lg px-2 py-2 text-xs sm:text-sm"
              placeholder="Pilih / ketik brand"
            />
            <datalist id="brand-list-opname">
              {brandByKategori.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </div>

          {/* Nama Barang */}
          <div>
            <label className="text-[11px] text-slate-600">Nama Barang</label>
            <input
              list="barang-list-opname"
              name="NAMA_BARANG"
              value={form.NAMA_BARANG}
              onChange={(e) => handleSelectBarang(e.target.value)}
              className="w-full border rounded-lg px-2 py-2 text-xs sm:text-sm"
              placeholder="Pilih / ketik barang"
            />
            <datalist id="barang-list-opname">
              {barangByBrand.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </div>

          {/* QTY */}
          <div>
            <label className="text-[11px] text-slate-600">QTY</label>
            <input
              type="number"
              name="QTY"
              value={form.QTY}
              onChange={handleChange}
              className="w-full border rounded-lg px-2 py-2 text-xs sm:text-sm"
              placeholder="0"
            />
          </div>

          {/* Harga & Tombol */}
          <div className="flex flex-col gap-2">
            <div>
              <label className="text-[11px] text-slate-600">Harga Unit</label>
              <input
                type="number"
                name="HARGA_UNIT"
                value={form.HARGA_UNIT}
                onChange={handleChange}
                className="w-full border rounded-lg px-2 py-2 text-xs sm:text-sm"
                placeholder="0"
              />
            </div>

            <div className="flex gap-2 justify-end mt-1">
              <button
                onClick={handleSave}
                className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs sm:text-sm flex items-center gap-1 shadow-sm hover:bg-indigo-700"
              >
                <FaSave /> Simpan
              </button>
              <button
                onClick={() => {
                  setForm({
                    KATEGORI_BRAND: "",
                    NAMA_BRAND: "",
                    NAMA_BARANG: "",
                    QTY: "",
                    HARGA_UNIT: "",
                    NOMOR_UNIK: "",
                  });
                  setEditId(null);
                }}
                className="border px-3 py-2 rounded-lg text-xs sm:text-sm flex items-center gap-1"
              >
                <FaTimes /> Reset
              </button>
            </div>
          </div>
        </div>

        {/* TABLE TRANSAKSI STOK */}
        <div
          ref={tableRef}
          className="bg-white rounded-2xl shadow-md overflow-x-auto"
        >
          <table className="w-full text-xs sm:text-sm">
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className="p-2 border">Tanggal</th>
                <th className="p-2 border">Kategori</th>
                <th className="p-2 border">Brand</th>
                <th className="p-2 border">Barang</th>
                <th className="p-2 border">QTY</th>
                <th className="p-2 border">IMEI / SKU</th>
                <th className="p-2 border">Harga</th>
                <th className="p-2 border">Total</th>
                <th className="p-2 border">Status</th>
                <th className="p-2 border">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="p-4 border text-center text-slate-500"
                  >
                    Belum ada data stok untuk toko ini.
                  </td>
                </tr>
              ) : (
                paginated.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <td className="p-2 border">{r.TANGGAL_TRANSAKSI}</td>
                    <td className="p-2 border">{r.KATEGORI_BRAND}</td>
                    <td className="p-2 border">{r.NAMA_BRAND}</td>
                    <td className="p-2 border">{r.NAMA_BARANG}</td>
                    <td className="p-2 border text-center">{r.QTY}</td>
                    <td className="p-2 border font-mono">{r.NOMOR_UNIK}</td>
                    <td className="p-2 border text-right">
                      Rp {fmt(r.HARGA_UNIT)}
                    </td>
                    <td className="p-2 border text-right">
                      Rp {fmt(r.TOTAL)}
                    </td>
                    <td className="p-2 border">{r.STATUS}</td>
                    <td className="p-2 border text-center">
                      <button
                        onClick={() => handleEdit(r)}
                        className="text-blue-600 mr-2"
                        title="Edit"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(r)}
                        className="text-red-600"
                        title="Hapus"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINATION */}
        <div className="flex justify-between items-center text-xs mt-1">
          <span>
            Halaman {currentPage} dari {totalPages}
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="px-2 py-1 border rounded-lg flex items-center"
            >
              <FaChevronLeft />
            </button>
            <button
              onClick={() =>
                setCurrentPage((p) => Math.min(p + 1, totalPages))
              }
              className="px-2 py-1 border rounded-lg flex items-center"
            >
              <FaChevronRight />
            </button>
          </div>
        </div>

        {/* QUICK OPNAME PER SKU */}
        <div className="bg-white/90 backdrop-blur rounded-2xl shadow-md p-4">
          <h3 className="font-semibold mb-3 text-sm text-slate-800">
            Stok Opname Cepat per SKU / IMEI
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2 border">SKU / IMEI</th>
                  <th className="p-2 border">Barang</th>
                  <th className="p-2 border">Sistem</th>
                  <th className="p-2 border">Fisik</th>
                  <th className="p-2 border">Selisih</th>
                  <th className="p-2 border">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(aggregateBySku(allTransaksi)).length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-3 border text-center text-slate-500"
                    >
                      Tidak ada data untuk opname.
                    </td>
                  </tr>
                ) : (
                  Object.entries(aggregateBySku(allTransaksi)).map(
                    ([key, ag]) => {
                      const fisik = Number(opnameMap[key] ?? "");
                      const selisih = fisik - ag.totalQty;

                      return (
                        <tr key={key}>
                          <td className="p-2 border">{key}</td>
                          <td className="p-2 border">{ag.barang}</td>
                          <td className="p-2 border text-center">
                            {ag.totalQty}
                          </td>
                          <td className="p-2 border text-center">
                            <input
                              className="border p-1 w-20 text-xs rounded"
                              value={opnameMap[key] ?? ""}
                              onChange={(e) =>
                                setOpnameMap((m) => ({
                                  ...m,
                                  [key]: e.target.value,
                                }))
                              }
                            />
                          </td>
                          <td className="p-2 border text-center">
                            {Number.isNaN(fisik) ? "-" : selisih}
                          </td>
                          <td className="p-2 border text-center">
                            <button
                              onClick={() =>
                                saveOpnameFor({
                                  key,
                                  barang: ag.barang,
                                  brand: ag.brand,
                                  kategori: ag.kategori,
                                  lastPrice: ag.lastPrice,
                                  totalQty: ag.totalQty,
                                })
                              }
                              className="bg-indigo-600 text-white px-3 py-1 rounded text-xs sm:text-sm flex items-center gap-1 mx-auto"
                            >
                              <FaSave /> Simpan
                            </button>
                          </td>
                        </tr>
                      );
                    }
                  )
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
