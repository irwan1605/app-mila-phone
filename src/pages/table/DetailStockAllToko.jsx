import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  listenAllTransaksi,
  listenMasterBarang,
} from "../../services/FirebaseService";
import * as XLSX from "xlsx";
import { FaSearch, FaExchangeAlt } from "react-icons/fa";

/* ======================
   HELPER RUPIAH
====================== */
const rupiah = (n) =>
  Number(n || 0).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  });

export default function DetailStockAllToko() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const tableRef = useRef(null);

  const [transaksi, setTransaksi] = useState([]);
  const [masterBarang, setMasterBarang] = useState([]);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  /* ======================
     LISTEN REALTIME
  ====================== */
  useEffect(() => {
    const unsub1 = listenAllTransaksi((rows) => setTransaksi(rows || []));
    const unsub2 = listenMasterBarang((rows) => setMasterBarang(rows || []));
    return () => {
      unsub1 && unsub1();
      unsub2 && unsub2();
    };
  }, []);

  /* ======================
     MAP MASTER BARANG
  ====================== */
  const masterMap = useMemo(() => {
    const map = {};
    masterBarang.forEach((b) => {
      if (!b.brand || !b.namaBarang) return;
      const key = `${b.brand}|${b.namaBarang}`;
      map[key] = {
        hargaSRP: Number(b.harga?.srp ?? b.hargaSRP ?? 0),
        hargaGrosir: Number(b.harga?.grosir ?? b.hargaGrosir ?? 0),
        hargaReseller: Number(b.harga?.reseller ?? b.hargaReseller ?? 0),
      };
    });
    return map;
  }, [masterBarang]);

  /* ======================
     BUILD ROWS (FINAL)
  ====================== */
  const rows = useMemo(() => {
    return transaksi
      .filter(
        (t) => t.STATUS === "Approved" && t.PAYMENT_METODE !== "PENJUALAN"
      )
      .map((t) => {
        const key = `${t.NAMA_BRAND}|${t.NAMA_BARANG}`;
        const master = masterMap[key] || {};

        const qty = Number(t.QTY || 0);

        return {
          tanggal: t.TANGGAL_TRANSAKSI || "-",
          noDo: t.NO_INVOICE || "-",
          supplier: t.NAMA_SUPPLIER || "-",
          namaToko: t.NAMA_TOKO || "-",
          brand: t.NAMA_BRAND || "-",
          barang: t.NAMA_BARANG || "-",
          imei: t.IMEI || "",
          qty,

          hargaSRP: master.hargaSRP || 0,
          hargaGrosir: master.hargaGrosir || 0,
          hargaReseller: master.hargaReseller || 0,

          totalSRP: master.hargaSRP * qty,
          totalGrosir: master.hargaGrosir * qty,
          totalReseller: master.hargaReseller * qty,
        };
      });
  }, [transaksi, masterMap]);

  /* ======================
     SEARCH
  ====================== */
  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.brand.toLowerCase().includes(q) ||
        r.barang.toLowerCase().includes(q) ||
        r.imei.toLowerCase().includes(q) ||
        r.noDo.toLowerCase().includes(q)
    );
  }, [rows, search]);

  /* ======================
     PAGINATION
  ====================== */
  const pageCount = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  /* ======================
     EXPORT EXCEL
  ====================== */
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DetailStock");
    XLSX.writeFile(wb, "Detail_Stock_Semua_Toko.xlsx");
  };

  /* ======================
     RENDER
  ====================== */
  return (
    <div className="p-4 min-h-screen bg-slate-900 text-white">
      <h2 className="text-xl font-bold mb-4">
        {state?.title || "Detail Stok Semua Toko"}
      </h2>

      <div
        ref={tableRef}
        className="bg-white/10 p-4 rounded-xl mb-4 flex items-center"
      >
        <FaSearch />
        <input
          className="ml-3 flex-1 bg-transparent outline-none"
          placeholder="Cari NO DO / Brand / Barang / IMEI"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <button
          onClick={exportExcel}
          className="ml-4 bg-green-600 px-4 py-2 rounded"
        >
          Export
        </button>
      </div>

      <div
        className="
  bg-white 
  text-slate-800
  rounded-2xl 
  shadow-xl 
  overflow-x-auto
  scrollbar-dark
"
      >
        <table className="w-full text-sm min-w-[2000px]">
          <thead className="bg-blue-100 sticky top-0 z-10 text-xs uppercase tracking-wider">
            <tr
              className="
    border-b border-blue-700
    odd:bg-blue-300/40 even:bg-blue-900/20
    hover:bg-blue-300/60
    transition-colors duration-150
  "
            >
              <th className="px-3 py-2 text-left whitespace-nowrap">No</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Tanggal</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">NO DO</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">
                Supplier
              </th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Toko</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Brand</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Barang</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">IMEI</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">Qty</th>
              <th className="px-3 py-2 text-left whitespace-nowrap">
                Harga SRP
              </th>
              <th className="px-3 py-2 text-left whitespace-nowrap">
                Total SRP
              </th>
              <th className="px-3 py-2 text-left whitespace-nowrap">
                Harga Grosir
              </th>
              <th className="px-3 py-2 text-left whitespace-nowrap">
                Total Grosir
              </th>
              <th className="px-3 py-2 text-left whitespace-nowrap">
                Harga Reseller
              </th>
              <th className="px-3 py-2 text-left whitespace-nowrap">
                Total Reseller
              </th>

              <th className="px-3 py-2 text-left whitespace-nowrap">Aksi</th>
            </tr>
          </thead>

          <tbody>
            {paginated.map((r, i) => (
              <tr key={i} className="border-b border-blue-700">
                <td className="px-3 py-2 text-center font-mono">
                  {(page - 1) * pageSize + i + 1}
                </td>
                <td className="px-3 py-2 text-right font-mono">{r.tanggal}</td>
                <td className="px-3 py-2 text-right font-mono">{r.noDo}</td>
                <td className="px-3 py-2 text-right font-mono">{r.supplier}</td>
                <td className="px-3 py-2 text-right font-mono">{r.namaToko}</td>
                <td className="px-3 py-2 text-right font-mono">{r.brand}</td>
                <td className="px-3 py-2 text-right font-mono" td>
                  {r.barang}
                </td>
                <td className="px-3 py-2 text-right font-mono">{r.imei}</td>
                <td className="px-3 py-2 text-right font-mono">{r.qty}</td>
                <td className="px-3 py-2 text-right font-mono">
                  {rupiah(r.hargaSRP)}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {rupiah(r.totalSRP)}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {rupiah(r.hargaGrosir)}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {rupiah(r.totalGrosir)}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {rupiah(r.hargaReseller)}
                </td>
                <td className="px-3 py-2 text-right font-mono">
                  {rupiah(r.totalReseller)}
                </td>

                <td className="px-3 py-2 text-right font-mono">
                  <button
                    onClick={() =>
                      navigate("/transfer-barang", {
                        state: r,
                      })
                    }
                    title="Transfer Barang"
                    className="
    group flex items-center gap-2
    px-3 py-1.5 rounded-lg
    bg-gradient-to-r from-yellow-400 to-orange-500
    hover:from-orange-500 hover:to-yellow-500
    shadow-md hover:shadow-yellow-400/50
    text-white text-xs font-semibold
    transition-all duration-200
    mx-auto
  "
                  >
                    <FaExchangeAlt className="text-sm group-hover:rotate-180 transition-transform duration-300" />
                    <span className="hidden md:inline">Transfer</span>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-between mt-4">
          <button disabled={page === 1} onClick={() => setPage(page - 1)}>
            Prev
          </button>
          <span>
            Page {page} / {pageCount}
          </span>
          <button
            disabled={page === pageCount}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
