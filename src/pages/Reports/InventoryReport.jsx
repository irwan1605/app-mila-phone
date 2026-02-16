// ======================================================================
// INVENTORY REPORT — PRO MAX FINAL (FIX 100%)
// ======================================================================
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  listenAllTransaksi,
  listenMasterBarang,
  updateTransaksi,
} from "../../services/FirebaseService";
import { FaStore } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { hitungSemuaStok } from "../../utils/stockUtils";

// =======================
// CONST
// =======================
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

const CARD_COLORS = [
  "from-emerald-500 to-teal-500",
  "from-fuchsia-500 to-pink-500",
  "from-orange-500 to-amber-400",
  "from-cyan-500 to-teal-500",
  "from-rose-500 to-red-500",
  "from-purple-500 to-indigo-500",
  "from-lime-500 to-green-500",
  "from-blue-600 to-cyan-500",
  "from-yellow-500 to-orange-500",
];

const rupiah = (n) =>
  Number(n || 0).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  });

const normalize = (v) =>
  String(v || "")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();

// ======================================================================
// COMPONENT
// ======================================================================
export default function InventoryReport() {
  const navigate = useNavigate();
  const tableRef = useRef(null);

  const [transaksi, setTransaksi] = useState([]);
  const [masterBarangMap, setMasterBarangMap] = useState({});
  const [selectedToko] = useState("ALL");

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // ======================
  // LISTENER
  // ======================
  useEffect(() => {
    const unsubTrx = listenAllTransaksi(setTransaksi);
    const unsubBarang = listenMasterBarang((rows) => {
      const map = {};
      rows?.forEach((b) => {
        const key = `${normalize(b.NAMA_BRAND)}|${normalize(b.NAMA_BARANG)}`;
        map[key] = {
          kategori: normalize(b.KATEGORI_BRAND),
          hargaSRP: Number(b.HARGA_SRP || 0),
          hargaGrosir: Number(b.HARGA_GROSIR || 0),
          hargaReseller: Number(b.HARGA_RESELLER || 0),
        };
      });
      setMasterBarangMap(map);
    });

    return () => {
      unsubTrx && unsubTrx();
      unsubBarang && unsubBarang();
    };
  }, []);

  // ======================
  // MAP TRANSAKSI
  // ======================
  const transaksiToko = useMemo(() => {
    const map = {};
    transaksi.forEach((t) => t?.id && (map[t.id] = t));
    return map;
  }, [transaksi]);

  // ======================
  // STOK GLOBAL
  // ======================
  const stokMap = useMemo(
    () =>
      hitungSemuaStok(
        Object.fromEntries(
          Object.entries(transaksiToko).filter(
            ([_, t]) =>
              t.STATUS === "Approved" &&
              !["PENJUALAN", "TRANSFER_KELUAR"].includes(t.PAYMENT_METODE)
          )
        )
      ),
    [transaksiToko]
  );

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

  const imeiTerjual = useMemo(() => {
    const sold = new Set();

    transaksi.forEach((t) => {
      if (
        t.STATUS === "Approved" &&
        t.PAYMENT_METODE === "PENJUALAN" &&
        t.IMEI
      ) {
        sold.add(String(t.IMEI));
      }

      // ✅ REFUND → keluarkan dari sold
      if (t.STATUS === "Approved" && t.PAYMENT_METODE === "REFUND" && t.IMEI) {
        sold.delete(String(t.IMEI));
      }
    });

    return sold;
  }, [transaksi]);

  // ======================
  // DETAIL TABLE
  // ======================
  const detailTable = useMemo(() => {
    if (!selectedToko) return [];

    return transaksi
      .filter(
        (t) =>
          t.STATUS === "Approved" &&
          ["PEMBELIAN", "TRANSFER_MASUK", "TRANSFER_BARANG"].includes(
            t.PAYMENT_METODE
          ) &&
          // ✅ HAPUS IMEI YANG SUDAH TERJUAL
          !(t.IMEI && imeiTerjual.has(String(t.IMEI))) &&
          `${t.NAMA_BRAND} ${t.NAMA_BARANG} ${t.IMEI}`
            .toLowerCase()
            .includes(search.toLowerCase())
      )

      .map((t) => {
        const key = `${normalize(t.NAMA_BRAND)}|${normalize(t.NAMA_BARANG)}`;
        const m = masterBarangMap[key] || {};
        const qty = t.IMEI ? 1 : Number(t.QTY || 0);

        return {
          id: t.id,
          tokoId: t.tokoId,
          tanggal: t.TANGGAL_TRANSAKSI,
          noDo: t.NO_INVOICE,
          supplier: t.NAMA_SUPPLIER,
          brand: normalize(t.NAMA_BRAND),
          barang: normalize(t.NAMA_BARANG),
          imei: t.IMEI || "-",
          qty,
          hargaSRP: m.hargaSRP || 0,
          totalSRP: qty * (m.hargaSRP || 0),
          hargaGrosir: m.hargaGrosir || 0,
          totalGrosir: qty * (m.hargaGrosir || 0),
          hargaReseller: m.hargaReseller || 0,
          totalReseller: qty * (m.hargaReseller || 0),
          band1: m.band1,
          hband1: m.hband1,
          totalBand1: qty * (m.hband1 || 0),
          band2: m.band2,
          hband2: m.hband2,
          totalBand2: qty * (m.hband2 || 0),
          band3: m.band3,
          hband3: m.hband3,
          totalBand3: qty * (m.hband3 || 0),
          transferIn: 0,
          transferOut: 0,
        };
      });
  }, [transaksi, selectedToko, search, masterBarangMap]);

  // ==========================
  // CARD KECIL PER TOKO + PER KATEGORI (FIX)
  // ==========================
  const cardStockPerToko = useMemo(() => {
    return TOKO_LIST.map((toko) => {
      const kategori = {};

      transaksi.forEach((t) => {
        if (t.STATUS !== "Approved") return;
        if (t.NAMA_TOKO !== toko) return;
        console.log(
          "DEBUG:",
          t.NAMA_TOKO,
          t.PAYMENT_METODE,
          t.KATEGORI_BRAND,
          t.QTY
        );

        // ❌ HAPUS TOTAL KATEGORI LAINNYA
        let kat = t.KATEGORI_BRAND;

        // =============================
        // ✅ FIX FINAL NON IMEI CATEGORY
        // =============================
        if (!kat && !t.IMEI) {
          // semua barang non IMEI dianggap accessories
          kat = "ACCESSORIES";
        }

        if (!kat) return;

        kat = normalize(kat);

        // ✅ SAMAKAN PENULISAN KATEGORI
        if (kat === "ACCESSORY") kat = "ACCESSORIES";
        if (kat === "ACC") kat = "ACCESSORIES";
        if (kat === "SPAREPART") kat = "SPARE PART";

        let qty = t.IMEI ? 1 : Number(t.QTY ?? t.qty ?? t.JUMLAH ?? 0);
        console.log(kat, t.PAYMENT_METODE, t.QTY);

        // ✅ TAMBAHAN KHUSUS NON IMEI (ACCESSORIES / SPARE PART / JASA)
        if (
          !t.IMEI &&
          qty === 0 &&
          ["ACCESSORIES", "SPARE PART", "JASA"].includes(kat) &&
          ["PENJUALAN", "TRANSFER_KELUAR"].includes(t.PAYMENT_METODE)
        ) {
          qty = 1;
        }

        // ======================
        // STOK MASUK
        // ======================
        if (["PEMBELIAN", "TRANSFER_MASUK"].includes(t.PAYMENT_METODE)) {
          if (t.IMEI && imeiTerjual.has(String(t.IMEI))) return;

          kategori[kat] = (kategori[kat] || 0) + qty;
        }

        // ======================
        // STOK KELUAR (JUAL / TRANSFER)
        // ======================
        if (["PENJUALAN", "TRANSFER_KELUAR"].includes(t.PAYMENT_METODE)) {
          kategori[kat] = (kategori[kat] || 0) - qty;
        }

        // ======================
        // REFUND → STOK KEMBALI
        // ======================
        if (t.PAYMENT_METODE === "REFUND") {
          kategori[kat] = (kategori[kat] || 0) + qty;
        }
      });

      // ======================
      // HILANGKAN MINUS & NOL
      // ======================
      const kategoriFix = Object.fromEntries(
        Object.entries(kategori).filter(([_, v]) => Number(v) > 0)
      );

      return {
        toko,
        kategori: kategoriFix,
      };
    });
  }, [transaksi]);

  // ==========================
  // TOTAL STOCK SEMUA TOKO (DARI CARD KECIL)
  // ==========================
  const totalStockSemuaToko = useMemo(() => {
    return cardStockPerToko.reduce((grandTotal, toko) => {
      const totalPerToko = Object.values(toko.kategori || {}).reduce(
        (sum, qty) => sum + Number(qty || 0),
        0
      );

      return grandTotal + totalPerToko;
    }, 0);
  }, [cardStockPerToko]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-6 text-white">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">
          INVENTORY REPORT — MILA PHONE
        </h1>

        {/* ================================================================== */}
        {/* CARD BESAR CILANGKAP PUSAT */}
        {/* ================================================================== */}
        {/* CARD BESAR PUSAT */}
        <div
          // onClick={() =>
          //   navigate("/table/detail-stock-all-toko", {
          //     state: { mode: "ALL_TOKO" },
          //   })
          // }
          className="cursor-pointer rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-500 p-6 mb-6 shadow-2xl"
        >
          <div className="flex gap-4 items-center">
            <FaStore className="text-5xl" />
            <div>
              <h2 className="text-2xl font-bold">CILANGKAP PUSAT</h2>
              <p className="text-sm opacity-80">
                TOTAL STOCK SEMUA TOKO: {totalStockSemuaToko}
              </p>
            </div>
          </div>
          <div className="text-sm font-semibold">
            Total Item: {totalStockSemuaToko}
          </div>

          <p className="mt-4 text-4xl font-bold">
            {totalStockSemuaToko.toLocaleString("id-ID")}
          </p>
        </div>
        {/* ================================================================== */}
        {/* CARD KECIL PER TOKO + PER KATEGORI */}
        {/* ================================================================== */}
        {/* CARD KECIL */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
          {cardStockPerToko.map((t, i) => (
            <div
              key={t.toko}
              onClick={() =>
                navigate("/table/detail-stock-toko", {
                  state: {
                    namaToko: t.toko,
                    title: `Detail Stok Toko : ${t.toko}`,
                  },
                })
              }
              className={`cursor-pointer rounded-2xl p-4 bg-gradient-to-br ${
                CARD_COLORS[i % CARD_COLORS.length]
              }`}
            >
              <div className="font-bold mb-2">{t.toko}</div>
              {Object.entries(t.kategori).map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span>{k}</span>
                  <span className="font-bold">{v}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
