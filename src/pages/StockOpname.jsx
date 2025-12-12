// src/pages/StockOpname.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  listenAllTransaksi,
  addStock,
  reduceStock,
  updateTransaksi,
  deleteTransaksi,
} from "../services/FirebaseService";
import * as XLSX from "xlsx";

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

// formatting number
const fmt = (v) => {
  try {
    return Number(v || 0).toLocaleString("id-ID");
  } catch {
    return v;
  }
};

export default function StockOpname() {
  const [allTransaksi, setAllTransaksi] = useState([]);
  const [opnameMap, setOpnameMap] = useState({});
  const loggedUser = JSON.parse(localStorage.getItem("user") || "{}");

  // filters
  const [filterToko, setFilterToko] = useState("semua");
  const [filterSupplier, setFilterSupplier] = useState("semua");
  const [filterBrand, setFilterBrand] = useState("semua");
  const [filterKategori, setFilterKategori] = useState("semua");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  // pagination
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  // ===================== LOAD DATA FIREBASE =====================
  useEffect(() => {
    const unsub = listenAllTransaksi((rows = []) => {
      const normal = rows.map((r) => normalizeRecord(r));
      setAllTransaksi(normal);
    });
    return () => unsub && unsub();
  }, []);

  // ===================== NORMALISASI =====================
  const normalizeRecord = (r = {}) => ({
    id: r.id || r._id || Date.now().toString(),
    TANGGAL_TRANSAKSI: r.TANGGAL_TRANSAKSI || "",
    NO_DELIVERY_ORDER: r.NO_DELIVERY_ORDER || "-",
    NAMA_SUPPLIER: r.NAMA_SUPPLIER || "-",
    NAMA_TOKO: r.NAMA_TOKO || "",
    KATEGORI_BARANG: r.KATEGORI_BARANG || "-",
    NAMA_BRAND: r.NAMA_BRAND || "",
    NAMA_BARANG: r.NAMA_BARANG || "",
    NOMOR_UNIK: r.NOMOR_UNIK || "",
    HARGA_UNIT: Number(r.HARGA_UNIT || 0),

    BANDLING_1: r.BANDLING_1 || "-",
    HARGA_1: Number(r.HARGA_1 || 0),
    BANDLING_2: r.BANDLING_2 || "-",
    HARGA_2: Number(r.HARGA_2 || 0),
    BANDLING_3: r.BANDLING_3 || "-",
    HARGA_3: Number(r.HARGA_3 || 0),

    QTY: Number(r.QTY || 0),
    _raw: r,
  });

  // ===================== APPLY FILTER =====================
  const filtered = useMemo(() => {
    return allTransaksi.filter((r) => {
      if (filterToko !== "semua" && r.NAMA_TOKO !== filterToko) return false;
      if (filterSupplier !== "semua" && r.NAMA_SUPPLIER !== filterSupplier) return false;
      if (filterBrand !== "semua" && r.NAMA_BRAND !== filterBrand) return false;
      if (filterKategori !== "semua" && r.KATEGORI_BARANG !== filterKategori) return false;

      if (dateFrom && r.TANGGAL_TRANSAKSI < dateFrom) return false;
      if (dateTo && r.TANGGAL_TRANSAKSI > dateTo) return false;

      if (search.trim()) {
        const s = search.toLowerCase();
        if (
          !(
            r.NOMOR_UNIK.toLowerCase().includes(s) ||
            r.NAMA_BRAND.toLowerCase().includes(s) ||
            r.NAMA_BARANG.toLowerCase().includes(s)
          )
        )
          return false;
      }
      return true;
    });
  }, [
    allTransaksi,
    filterToko,
    filterSupplier,
    filterBrand,
    filterKategori,
    dateFrom,
    dateTo,
    search,
  ]);

  // ===================== OPTIONS FOR FILTERS =====================
  const tokoOptions = ["semua", ...new Set(allTransaksi.map((r) => r.NAMA_TOKO))];
  const supplierOptions = ["semua", ...new Set(allTransaksi.map((r) => r.NAMA_SUPPLIER))];
  const brandOptions = ["semua", ...new Set(allTransaksi.map((r) => r.NAMA_BRAND))];
  const kategoriOptions = ["semua", ...new Set(allTransaksi.map((r) => r.KATEGORI_BARANG))];

  // ===================== AGGREGATE PER SKU (IMEI) =====================
  const aggregateBySku = (items = []) => {
    const map = {};
    items.forEach((r) => {
      const key = r.NOMOR_UNIK;

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
  };

  const grouped = aggregateBySku(filtered);

  // ===================== PAGINATION =====================
  const totalPages = Math.max(1, Math.ceil(Object.keys(grouped).length / rowsPerPage));
  const paginatedKeys = Object.keys(grouped).slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages]);

  // ===================== EXPORT EXCEL =====================
  const exportExcel = () => {
    const rows = Object.entries(grouped).map(([sku, ag]) => {
      const r = allTransaksi.find((x) => x.NOMOR_UNIK === sku);
      return {
        IMEI: sku,
        BRAND: r?.NAMA_BRAND,
        BARANG: r?.NAMA_BARANG,
        TANGGAL: r?.TANGGAL_TRANSAKSI,
        SUPPLIER: r?.NAMA_SUPPLIER,
        TOKO: r?.NAMA_TOKO,
        KATEGORI: r?.KATEGORI_BARANG,
        HARGA_UNIT: r?.HARGA_UNIT,
        BANDLING_1: r?.BANDLING_1,
        HARGA_1: r?.HARGA_1,
        BANDLING_2: r?.BANDLING_2,
        HARGA_2: r?.HARGA_2,
        BANDLING_3: r?.BANDLING_3,
        HARGA_3: r?.HARGA_3,
        STOK_SISTEM: ag.totalQty,
        STOK_FISIK: opnameMap[sku] ?? "",
        SELISIH:
          opnameMap[sku] !== undefined
            ? Number(opnameMap[sku]) - ag.totalQty
            : "",
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Opname");
    XLSX.writeFile(wb, "Stock_Opname_Cepat.xlsx");
  };

  // ===================== SIMPAN OPNAME REAL (addStock / reduceStock) =====================
  const saveOpnameReal = async (r, sistemQty) => {
    const sku = r.NOMOR_UNIK;
    const fisik = Number(opnameMap[sku] ?? "");

    if (Number.isNaN(fisik)) return alert("Stok fisik tidak valid");

    const selisih = fisik - sistemQty;

    if (selisih === 0) return alert("Tidak ada selisih.");

    try {
      if (selisih > 0) {
        await addStock("CILANGKAP PUSAT", sku, { qty: selisih });
      } else {
        await reduceStock("CILANGKAP PUSAT", sku, Math.abs(selisih));
      }

      alert("Opname berhasil disimpan ke Firebase.");
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan opname!");
    }
  };

  // ===================== DELETE SKU =====================
  const deleteSku = async (sku) => {
    if (!window.confirm("Yakin hapus semua transaksi IMEI ini?")) return;

    const list = allTransaksi.filter((x) => x.NOMOR_UNIK === sku);

    for (const row of list) {
      const tokoIndex = fallbackTokoNames.findIndex(
        (n) => String(n).toUpperCase() === String(row.NAMA_TOKO).toUpperCase()
      );
      const tokoId = tokoIndex >= 0 ? tokoIndex + 1 : 1;

      await deleteTransaksi(tokoId, row.id);
    }

    setAllTransaksi((p) => p.filter((x) => x.NOMOR_UNIK !== sku));
    alert("SKU berhasil dihapus.");
  };

  return (
    <div className="p-4 md:p-6">

      <h2 className="text-2xl font-bold text-blue-600 mb-4">
        Stock Opname Cepat (Per SKU)
      </h2>

      {/* ===================== FILTER BAR ===================== */}
      <div className="bg-white p-4 rounded-xl shadow mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">

        {/* SEARCH */}
        <input
          className="p-2 border rounded"
          placeholder="Search IMEI / Brand / Barang..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* FILTER TOKO */}
        <select
          className="p-2 border rounded"
          value={filterToko}
          onChange={(e) => setFilterToko(e.target.value)}
        >
          {tokoOptions.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>

        {/* FILTER SUPPLIER */}
        <select
          className="p-2 border rounded"
          value={filterSupplier}
          onChange={(e) => setFilterSupplier(e.target.value)}
        >
          {supplierOptions.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>

        {/* FILTER BRAND */}
        <select
          className="p-2 border rounded"
          value={filterBrand}
          onChange={(e) => setFilterBrand(e.target.value)}
        >
          {brandOptions.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>

        {/* FILTER KATEGORI */}
        <select
          className="p-2 border rounded"
          value={filterKategori}
          onChange={(e) => setFilterKategori(e.target.value)}
        >
          {kategoriOptions.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>

        {/* DATE RANGE */}
        <input
          type="date"
          className="p-2 border rounded"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
        />
        <input
          type="date"
          className="p-2 border rounded"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
        />

        {/* EXPORT BUTTON */}
        <button
          onClick={exportExcel}
          className="p-2 bg-green-600 text-white rounded"
        >
          Export Excel
        </button>
      </div>

      {/* ===================== TABLE ===================== */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">

        <table className="w-full text-sm">
          <thead className="bg-blue-200">
            <tr>
              <th className="border p-2">No</th>
              <th className="border p-2">Tanggal</th>
              <th className="border p-2">No DO</th>
              <th className="border p-2">Supplier</th>
              <th className="border p-2">Toko</th>
              <th className="border p-2">Kategori</th>
              <th className="border p-2">Brand</th>
              <th className="border p-2">Barang</th>
              <th className="border p-2">IMEI</th>
              <th className="border p-2">Harga Unit</th>

              <th className="border p-2">Bandling 1</th>
              <th className="border p-2">Hrg 1</th>
              <th className="border p-2">Bandling 2</th>
              <th className="border p-2">Hrg 2</th>
              <th className="border p-2">Bandling 3</th>
              <th className="border p-2">Hrg 3</th>

              <th className="border p-2">Stok Sistem</th>
              <th className="border p-2">Stok Fisik</th>
              <th className="border p-2">Selisih</th>
              <th className="border p-2">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {paginatedKeys.map((sku, index) => {
              const ag = grouped[sku];
              const r = allTransaksi.find((x) => x.NOMOR_UNIK === sku);
              const sistem = ag.totalQty;
              const fisik = Number(opnameMap[sku] ?? "");
              const selisih = Number.isNaN(fisik) ? "" : fisik - sistem;

              return (
                <tr key={sku} className="hover:bg-gray-50">
                  <td className="border p-2 text-center">
                    {(currentPage - 1) * rowsPerPage + index + 1}
                  </td>
                  <td className="border p-2">{r?.TANGGAL_TRANSAKSI}</td>
                  <td className="border p-2">{r?.NO_DELIVERY_ORDER}</td>
                  <td className="border p-2">{r?.NAMA_SUPPLIER}</td>
                  <td className="border p-2">{r?.NAMA_TOKO}</td>
                  <td className="border p-2">{r?.KATEGORI_BARANG}</td>
                  <td className="border p-2">{r?.NAMA_BRAND}</td>
                  <td className="border p-2">{r?.NAMA_BARANG}</td>

                  <td className="border p-2 font-mono">{sku}</td>

                  <td className="border p-2 text-right">
                    Rp {fmt(r?.HARGA_UNIT)}
                  </td>

                  <td className="border p-2">{r?.BANDLING_1}</td>
                  <td className="border p-2 text-right">Rp {fmt(r?.HARGA_1)}</td>

                  <td className="border p-2">{r?.BANDLING_2}</td>
                  <td className="border p-2 text-right">Rp {fmt(r?.HARGA_2)}</td>

                  <td className="border p-2">{r?.BANDLING_3}</td>
                  <td className="border p-2 text-right">Rp {fmt(r?.HARGA_3)}</td>

                  <td className="border p-2 text-center">{sistem}</td>

                  {/* INPUT STOK FISIK */}
                  <td className="border p-2 text-center">
                    <input
                      className="w-20 p-1 border rounded"
                      value={opnameMap[sku] ?? ""}
                      onChange={(e) =>
                        setOpnameMap((m) => ({ ...m, [sku]: e.target.value }))
                      }
                    />
                  </td>

                  {/* SELISIH */}
                  <td
                    className={`border p-2 text-center font-bold ${
                      selisih < 0
                        ? "text-red-600"
                        : selisih > 0
                        ? "text-green-600"
                        : ""
                    }`}
                  >
                    {selisih === "" ? "-" : selisih}
                  </td>

                  {/* AKSI */}
                  <td className="border p-2 text-center space-x-2">
                    {loggedUser.role === "superadmin" ? (
                      <>
                        <button
                          onClick={() => deleteSku(sku)}
                          className="text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => saveOpnameReal(r, sistem)}
                          className="px-2 py-1 bg-green-600 text-white rounded text-xs"
                        >
                          Simpan
                        </button>
                      </>
                    ) : (
                      <span className="text-gray-400 text-xs">Operator</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ===================== PAGINATION ===================== */}
      <div className="mt-4 flex justify-between items-center">
        <div>
          Halaman {currentPage} dari {totalPages}
        </div>

        <div className="flex items-center space-x-2">
          <select
            className="p-1 border rounded"
            value={rowsPerPage}
            onChange={(e) => setRowsPerPage(Number(e.target.value))}
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>

          <button
            disabled={currentPage <= 1}
            onClick={() => setCurrentPage((p) => p - 1)}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Prev
          </button>

          <button
            disabled={currentPage >= totalPages}
            onClick={() => setCurrentPage((p) => p + 1)}
            className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
