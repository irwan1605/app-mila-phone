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

export default function DetailStockToko() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const tableRef = useRef(null);

  const namaToko = state?.namaToko || "";

  /* ======================
     STATE
  ====================== */
  const [transaksi, setTransaksi] = useState([]);
  const [masterBarang, setMasterBarang] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const pageSize = 25;

  /* ======================
     REALTIME LISTENER
  ====================== */
  useEffect(() => {
    const unsub1 = listenAllTransaksi((rows) => setTransaksi(rows || []));
    const unsub2 = listenMasterBarang((rows) => setMasterBarang(rows || []));

    return () => {
      unsub1 && unsub1();
      unsub2 && unsub2();
    };
  }, []);

  // ===============================
  // 🔥 STOCK ENGINE UNIVERSAL
  // ===============================
  const getStockEffectUniversal = (t) => {
    const metode = String(t.PAYMENT_METODE || "").toUpperCase();
    const qtyBase = t.IMEI ? 1 : Number(t.QTY || 0);

    if (["PEMBELIAN", "TRANSFER_MASUK", "REFUND"].includes(metode)) {
      return qtyBase;
    }

    if (["PENJUALAN", "TRANSFER_KELUAR"].includes(metode)) {
      return -qtyBase;
    }

    return 0;
  };

  // ===============================
  // 🔥 UNIVERSAL STOCK ENGINE
  // ===============================
  const getStockEffect = (t) => {
    const metode = String(t.PAYMENT_METODE || "").toUpperCase();
    const qtyBase = t.IMEI ? 1 : Number(t.QTY || 0);

    if (["PEMBELIAN", "TRANSFER_MASUK", "REFUND"].includes(metode)) {
      return qtyBase;
    }

    if (["PENJUALAN", "TRANSFER_KELUAR"].includes(metode)) {
      return -qtyBase;
    }

    return 0;
  };

  const normalize = (v) =>
    String(v || "")
      .trim()
      .toUpperCase();

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

  const imeiFinalMap = useMemo(() => {
    const map = {};

    transaksi.forEach((t) => {
      if (!t || t.STATUS !== "Approved" || !t.IMEI) return;

      const imei = String(t.IMEI).trim();
      const toko = String(t.NAMA_TOKO || "").trim();
      const metode = String(t.PAYMENT_METODE || "").toUpperCase();

      if (!map[imei]) {
        map[imei] = {
          imei,
          toko: null,
          tanggal: t.TANGGAL_TRANSAKSI || "-",
          noDo: t.NO_INVOICE || "-",
          supplier: t.NAMA_SUPPLIER || "-",
          brand: t.NAMA_BRAND || "-",
          barang: t.NAMA_BARANG || "-",
          keterangan: "",
        };
      }

      if (metode === "PEMBELIAN") {
        map[imei].toko = toko;
      }

      if (metode === "TRANSFER_MASUK") {
        map[imei].toko = toko;
        map[imei].keterangan = `Transfer masuk ke Toko ${toko}`;
      }

      if (metode === "PENJUALAN") {
        delete map[imei];
      }
    });

    return map;
  }, [transaksi]);

  const imeiTerjual = useMemo(() => {
    const sold = new Set();

    transaksi.forEach((t) => {
      if (t.STATUS !== "Approved" || !t.IMEI) return;

      const imei = String(t.IMEI);
      const metode = String(t.PAYMENT_METODE || "").toUpperCase();

      // PENJUALAN → tandai terjual
      if (metode === "PENJUALAN") {
        sold.add(imei);
      }

      // ✅ REFUND → keluarkan dari daftar terjual
      if (metode === "REFUND") {
        sold.delete(imei);
      }
    });

    return sold;
  }, [transaksi]);

  const imeiTransferKeluar = useMemo(() => {
    const set = new Set();

    transaksi.forEach((t) => {
      if (
        t.STATUS === "Approved" &&
        String(t.PAYMENT_METODE).toUpperCase() === "TRANSFER_KELUAR" &&
        t.IMEI
      ) {
        set.add(String(t.IMEI));
      }
    });

    return set;
  }, [transaksi]);


// ===============================
// 🔥 SUPPLIER LOOKUP FROM PEMBELIAN
// ===============================
// ===============================
// 🔥 SUPPLIER LOOKUP UNIVERSAL
// ===============================
const supplierLookup = useMemo(() => {
  const map = {};

  transaksi.forEach((t) => {
    if (t.STATUS !== "Approved") return;
    if (!t.NAMA_BARANG || !t.NAMA_BRAND) return;

    // IMEI
    if (t.IMEI) {
      const imeiKey = String(t.IMEI).trim();

      if (t.PAYMENT_METODE === "PEMBELIAN") {
        map[imeiKey] = t.NAMA_SUPPLIER || "-";
      }
    }

    // NON IMEI (SKU)
    if (!t.IMEI) {
      const skuKey = `${t.NAMA_BRAND}|${t.NAMA_BARANG}`;

      if (t.PAYMENT_METODE === "PEMBELIAN") {
        map[skuKey] = t.NAMA_SUPPLIER || "-";
      }
    }
  });

  return map;
}, [transaksi]);



  /* ======================
   BUILD ROWS (FIX FINAL)
====================== */
const rows = useMemo(() => {
  if (!namaToko) return [];

  const map = {};

  transaksi.forEach((t) => {
    if (t.STATUS !== "Approved") return;
    if (normalize(t.NAMA_TOKO) !== normalize(namaToko)) return;

    const effect = getStockEffect(t);

    // ======================
    // IMEI
    // ======================
    if (t.IMEI) {
      const key = String(t.IMEI).trim();

      if (!map[key]) {
        map[key] = {
          tanggal: t.TANGGAL_TRANSAKSI || "-",
          noDo: t.NO_INVOICE || "-",
          supplier:
            supplierLookup[key] ||
            t.NAMA_SUPPLIER ||
            "-",
          namaToko: t.NAMA_TOKO || "-",
          brand: t.NAMA_BRAND || "-",
          barang: t.NAMA_BARANG || "-",
          imei: key,
          qty: 0,
          hargaSRP:
            masterMap?.[`${t.NAMA_BRAND}|${t.NAMA_BARANG}`]?.hargaSRP || 0,
          hargaGrosir:
            masterMap?.[`${t.NAMA_BRAND}|${t.NAMA_BARANG}`]?.hargaGrosir || 0,
          hargaReseller:
            masterMap?.[`${t.NAMA_BRAND}|${t.NAMA_BARANG}`]?.hargaReseller || 0,
          statusBarang: "TERSEDIA",
        };
      }

      map[key].qty += effect;
      return;
    }

    // ======================
    // NON IMEI
    // ======================
    const skuKey = `${t.NAMA_BRAND}|${t.NAMA_BARANG}`;

    if (!map[skuKey]) {
      map[skuKey] = {
        tanggal: t.TANGGAL_TRANSAKSI || "-",
        noDo: t.NO_INVOICE || "-",
        supplier:
          supplierLookup[skuKey] ||
          t.NAMA_SUPPLIER ||
          "-",
        namaToko: t.NAMA_TOKO || "-",
        brand: t.NAMA_BRAND || "-",
        barang: t.NAMA_BARANG || "-",
        imei: "",
        qty: 0,
        hargaSRP:
          masterMap?.[skuKey]?.hargaSRP || 0,
        hargaGrosir:
          masterMap?.[skuKey]?.hargaGrosir || 0,
        hargaReseller:
          masterMap?.[skuKey]?.hargaReseller || 0,
        statusBarang: "TERSEDIA",
      };
    }

    map[skuKey].qty += effect;
  });

  return Object.values(map).filter((r) => r.qty > 0);
}, [transaksi, masterMap, namaToko, supplierLookup]);

  /* ======================
     SEARCH FILTER
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
      {!namaToko ? (
        <div className="text-red-400 font-semibold">
          ❌ Nama toko tidak ditemukan
        </div>
      ) : (
        <>
          <h2 className="text-xl font-bold mb-4">
            Detail Stok Toko : {namaToko}
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
              onClick={() =>
                navigate("/toko/:tokoId/penjualan", {
                  state: {
                    namaToko: namaToko,
                    source: "DETAIL_STOCK_TOKO",
                  },
                })
              }
              className="
    flex items-center gap-2
    px-5 py-2 rounded-xl
    bg-gradient-to-r from-red-500 to-emerald-600
    hover:from-emerald-600 hover:to-blue-500
    text-white font-semibold
    shadow-lg hover:shadow-green-400/50
    transition-all duration-200
  "
            >
              🛒 PENJUALAN
            </button>
            <button
              onClick={exportExcel}
              className="ml-4 bg-green-600 px-4 py-2 rounded   bg-gradient-to-r from-green-500 to-emerald-600
    hover:from-emerald-600 hover:to-blue-500
    text-white font-semibold
    shadow-lg hover:shadow-blue-400/50
    transition-all duration-200"
            >
              Export
            </button>
          </div>

          <div className="bg-white text-slate-800 rounded-2xl shadow-xl overflow-x-auto scrollbar-dark">
            <table className="w-full min-w-[2200px] text-sm">
              <thead className="bg-blue-100 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 text-left whitespace-nowrap">No</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">
                    Tanggal
                  </th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">
                    NO DO
                  </th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">
                    Supplier
                  </th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">
                    Toko
                  </th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">
                    Brand
                  </th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">
                    Barang
                  </th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">
                    IMEI
                  </th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">Qty</th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">
                    Harga SRP
                  </th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">
                    Harga Grosir
                  </th>

                  <th className="px-3 py-2 text-left whitespace-nowrap">
                    Harga Reseller
                  </th>
                  <th className="px-3 py-2">STATUS</th>

                  <th className="px-3 py-2 text-left whitespace-nowrap">
                    Keterangan
                  </th>
                  <th className="px-3 py-2 text-left whitespace-nowrap">
                    Aksi
                  </th>
                </tr>
              </thead>

              <tbody>
                {paginated.map((r, i) => (
                  <tr key={i} className="border-b border-blue-700">
                    <td className="px-3 py-2 text-center font-mono">
                      {(page - 1) * pageSize + i + 1}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {r.tanggal}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{r.noDo}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {r.supplier}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {r.namaToko}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {r.brand}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      {r.barang}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{r.imei}</td>
                    <td className="px-3 py-2 text-right font-mono">{r.qty}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      {rupiah(r.hargaSRP)}
                    </td>

                    <td className="px-3 py-2 text-right font-mono">
                      {rupiah(r.hargaGrosir)}
                    </td>

                    <td className="px-3 py-2 text-right font-mono">
                      {rupiah(r.hargaReseller)}
                    </td>
                    <td className="px-3 py-2 text-center font-semibold">
                      {r.statusBarang}
                    </td>

                    <td className="px-3 py-2 text-right font-mono text-xs text-gray-600">
                      {r.keterangan || "-"}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      <button
                        onClick={() =>
                          navigate("/transfer-barang", {
                            state: {
                              tokoPengirim: namaToko, // ⬅️ INI PENTING
                            },
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

            <div className="flex justify-between p-4 text-sm">
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
        </>
      )}
    </div>
  );
}
