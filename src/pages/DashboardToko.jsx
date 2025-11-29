// src/pages/DashboardToko.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  FaStore,
  FaShoppingCart,
  FaBoxes,
  FaExchangeAlt,
  FaSearch,
  FaSun,
  FaMoon,
} from "react-icons/fa";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

import { listenAllTransaksi, addTransaksi } from "../services/FirebaseService";

// ======================= KONSTAN =======================
const TOKO_LIST = [
  { id: "1", name: "CILANGKAP PUSAT", code: "cilangkap-pusat" },
  { id: "2", name: "CIBINONG", code: "cibinong" },
  { id: "3", name: "GAS ALAM", code: "gas-alam" },
  { id: "4", name: "CITEUREUP", code: "citeureup" },
  { id: "5", name: "CIRACAS", code: "ciracas" },
  { id: "6", name: "METLAND 1", code: "metland-1" },
  { id: "7", name: "METLAND 2", code: "metland-2" },
  { id: "8", name: "PITARA", code: "pitara" },
  { id: "9", name: "KOTA WISATA", code: "kota-wisata" },
  { id: "10", name: "SAWANGAN", code: "sawangan" },
];

// Sama seperti MasterPenjualan
const TIPE_BAYAR_OPTIONS = ["CASH", "PIUTANG", "DEBIT CARD"];
const PAYMENT_METHOD_OPTIONS = [
  "AKULAKU",
  "KREDIVO",
  "BRITAMA",
  "BCA",
  "BLI BLI",
  "ONLINE SHOPE",
  "HOME CREDIT INDONESIA (HCI)",
  "SPEKTRA",
];

const fmt = (n) => {
  try {
    return Number(n || 0).toLocaleString("id-ID");
  } catch {
    return String(n || "");
  }
};

// Mapping status otomatis dari tipe bayar (sama seperti MasterPenjualan)
const getStatusFromTipeBayar = (tipe) => {
  const t = (tipe || "").toUpperCase();
  if (t === "CASH" || t === "DEBIT CARD") return "LUNAS";
  if (t === "PIUTANG") return "PIUTANG";
  return "";
};

// Preset contoh untuk KREDIT/PIUTANG (boleh kamu sesuaikan)
const CREDIT_PRESET = {
  AKULAKU: { mdr: "2.5", kategoriHarga: "KREDIT", mpProtec: "YA", tenor: "12" },
  KREDIVO: { mdr: "2.0", kategoriHarga: "KREDIT", mpProtec: "YA", tenor: "6" },
  "HOME CREDIT INDONESIA (HCI)": {
    mdr: "3.0",
    kategoriHarga: "KREDIT",
    mpProtec: "YA",
    tenor: "12",
  },
};

export default function DashboardToko(props) {
  const params = useParams();
  const tokoId = props.tokoId || params.tokoId || params.id;
  const navigate = useNavigate();

  const toko = TOKO_LIST.find((t) => t.id === String(tokoId));

  // ======================= STATE GLOBAL =======================
  const [isDark, setIsDark] = useState(true);

  const [allTransaksi, setAllTransaksi] = useState([]);

  // Penjualan cepat via IMEI
  const [searchImei, setSearchImei] = useState("");
  const [quickItems, setQuickItems] = useState([]);

  const [paymentType, setPaymentType] = useState(""); // "CASH" | "TRANSFER" | "KREDIT"
  const [creditForm, setCreditForm] = useState({
    paymentMethod: "",
    mdr: "",
    kategoriHarga: "",
    mpProtec: "",
    tenor: "",
  });

  // ======================= DRAFT STORAGE (ANTI HILANG SAAT REFRESH) =======================
const DRAFT_KEY = `DASHBOARD_DRAFT_TOKO_${tokoId}`;

// Load draft saat pertama render
useEffect(() => {
  const saved = localStorage.getItem(DRAFT_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      setQuickItems(parsed.quickItems || []);
      setPaymentType(parsed.paymentType || "");
      setCreditForm(
        parsed.creditForm || {
          paymentMethod: "",
          mdr: "",
          kategoriHarga: "",
          mpProtec: "",
          tenor: "",
        }
      );
    } catch {}
  }
}, [tokoId]);

// Simpan draft setiap ada perubahan
useEffect(() => {
  localStorage.setItem(
    DRAFT_KEY,
    JSON.stringify({
      quickItems,
      paymentType,
      creditForm,
    })
  );
}, [quickItems, paymentType, creditForm, tokoId]);


  // ======================= LISTENER FIREBASE =======================
  useEffect(() => {
    const unsub =
      typeof listenAllTransaksi === "function"
        ? listenAllTransaksi((list) => {
            setAllTransaksi(Array.isArray(list) ? list : []);
          })
        : null;

    return () => unsub && unsub();
  }, []);

  // ======================= DATA CHART PENJUALAN PER TOKO =======================
  const dataPenjualanPerToko = useMemo(() => {
    const map = {};
    TOKO_LIST.forEach((t) => {
      map[t.name] = 0;
    });

    (allTransaksi || []).forEach((x) => {
      if ((x.STATUS || "").toUpperCase() !== "APPROVED") return;

      const tokoName = x.NAMA_TOKO || "";
      const total = Number(x.HARGA_TOTAL || x.TOTAL || 0);

      if (!map[tokoName]) map[tokoName] = 0;
      map[tokoName] += total;
    });

    return Object.entries(map).map(([name, total]) => ({
      name,
      total,
    }));
  }, [allTransaksi]);

  // ======================= DATA CHART STOK PER TOKO =======================
  const dataStockPerToko = useMemo(() => {
    const map = {};
    TOKO_LIST.forEach((t) => {
      map[t.name] = 0;
    });

    (allTransaksi || []).forEach((x) => {
      if ((x.PAYMENT_METODE || "").toUpperCase() !== "PEMBELIAN") return;

      const tokoName = x.NAMA_TOKO || "";
      const qty = Number(x.QTY || 0);

      if (!map[tokoName]) map[tokoName] = 0;
      map[tokoName] += qty;
    });

    return Object.entries(map).map(([name, total]) => ({
      name,
      total,
    }));
  }, [allTransaksi]);

  // ======================= INDEX IMEI DARI DATA PEMBELIAN =======================
  const imeiIndex = useMemo(() => {
    const map = {};
    (allTransaksi || []).forEach((x) => {
      const pm = (x.PAYMENT_METODE || "").toUpperCase();
      const imei = String(x.IMEI || "").trim();
      if (!imei) return;
      if (pm !== "PEMBELIAN") return; // hanya stok dari pembelian

      map[imei] = x;
    });
    return map;
  }, [allTransaksi]);

  // ======================= RINGKASAN PENJUALAN CEPAT =======================
  const totalQty = useMemo(
    () =>
      (quickItems || []).reduce(
        (sum, it) => sum + (Number(it.qty || 1) || 0),
        0
      ),
    [quickItems]
  );

  const totalBayar = useMemo(
    () =>
      (quickItems || []).reduce(
        (sum, it) =>
          sum + Number(it.hargaUnit || 0) * (Number(it.qty || 1) || 0),
        0
      ),
    [quickItems]
  );

  const statusPembayaran = useMemo(() => {
    if (paymentType === "CASH") return getStatusFromTipeBayar("CASH");
    if (paymentType === "TRANSFER") return getStatusFromTipeBayar("DEBIT CARD");
    if (paymentType === "KREDIT") return getStatusFromTipeBayar("PIUTANG");
    return "";
  }, [paymentType]);

  // ======================= HANDLER =======================

  const handleToggleTheme = () => {
    setIsDark((prev) => !prev);
  };

  const handleOpen = (type) => {
    if (!toko) return;
    if (type === "penjualan") {
      navigate(`/toko/${toko.id}/penjualan`);
    } else if (type === "stock") {
      navigate(`/toko/${toko.id}/stock-opname`);
    } else if (type === "transfer") {
      navigate(`/toko/${toko.id}/transfer-gudang`);
    }
  };

  const handleAddItemByImei = () => {
    const imei = searchImei.trim();
    if (!imei) {
      alert("Masukkan IMEI terlebih dahulu.");
      return;
    }
  
    // ✅ CEK DUPLIKAT DI TABEL DRAFT
    const alreadyDraft = quickItems.find((p) => p.imei === imei);
    if (alreadyDraft) {
      alert("❌ IMEI ini sudah ada di tabel penjualan.");
      return;
    }
  
    const data = imeiIndex[imei];
  
    if (!data) {
      alert("❌ IMEI tidak ditemukan di stok pembelian.");
      return;
    }
  
    // ✅ BLOKIR JIKA IMEI SUDAH TERJUAL
    const isSold = (allTransaksi || []).some(
      (t) =>
        String(t.IMEI || "") === imei &&
        (t.STATUS || "").toUpperCase() === "LUNAS" &&
        (t.PAYMENT_METODE || "").toUpperCase() === "PENJUALAN"
    );
  
    if (isSold) {
      alert("❌ IMEI ini sudah pernah terjual.");
      return;
    }
  
    const hargaUnit =
      Number(data.HARGA_UNIT || data.HARGA_JUAL || data.TOTAL || 0) || 0;
  
    const newItem = {
      id: `${imei}-${Date.now()}`,
      tanggal: new Date().toISOString().slice(0, 10),
      noInvoice: `INV-${tokoId || "X"}-${Date.now()}`,
      namaBrand: data.NAMA_BRAND || "",
      namaBarang: data.NAMA_BARANG || "",
      imei,
      hargaUnit,
      qty: 1,
    };
  
    setQuickItems((prev) => [...prev, newItem]);
    setSearchImei("");
  };
  

  const handleRemoveItem = (id) => {
    setQuickItems((prev) => prev.filter((x) => x.id !== id));
  };

  const handlePaymentClick = (type) => {
    setPaymentType(type);
    // reset kredit jika bukan kredit
    if (type !== "KREDIT") {
      setCreditForm({
        paymentMethod: "",
        mdr: "",
        kategoriHarga: "",
        mpProtec: "",
        tenor: "",
      });
    }
  };

  const handleCreditChange = (field, value) => {
    setCreditForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "paymentMethod") {
        const preset = CREDIT_PRESET[value];
        if (preset) {
          next.mdr = preset.mdr;
          next.kategoriHarga = preset.kategoriHarga;
          next.mpProtec = preset.mpProtec;
          next.tenor = preset.tenor;
        }
      }
      return next;
    });
  };

  const buildInvoiceHtml = (invoiceNo, tanggal) => {
    const rowsHtml = (quickItems || [])
      .map(
        (it, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${it.tanggal}</td>
        <td>${it.noInvoice}</td>
        <td>${it.namaBrand}</td>
        <td>${it.namaBarang}</td>
        <td>${it.imei}</td>
        <td style="text-align:right;">${fmt(it.hargaUnit)}</td>
      </tr>`
      )
      .join("");

    const jenisBayarLabel =
      paymentType === "CASH"
        ? "CASH"
        : paymentType === "TRANSFER"
        ? "TRANSFER DEBIT"
        : paymentType === "KREDIT"
        ? "KREDIT / PIUTANG"
        : "-";

    return `
      <html>
      <head>
        <title>Invoice Penjualan</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h2,h3 { margin: 0; padding: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th, td { border: 1px solid #444; padding: 6px 8px; font-size: 12px; }
          th { background: #f1f5f9; }
        </style>
      </head>
      <body>
        <h2>INVOICE PENJUALAN</h2>
        <h3>${toko ? toko.name : "-"}</h3>
        <p><b>No Invoice:</b> ${invoiceNo}</p>
        <p><b>Tanggal:</b> ${tanggal}</p>
        <p><b>Jenis Pembayaran:</b> ${jenisBayarLabel}</p>
        ${
          paymentType === "KREDIT"
            ? `<p><b>Payment Method:</b> ${creditForm.paymentMethod || "-"} |
               <b>MDR:</b> ${creditForm.mdr || "-"}% |
               <b>Kategori Harga:</b> ${creditForm.kategoriHarga || "-"} |
               <b>MP Protek:</b> ${creditForm.mpProtec || "-"} |
               <b>Tenor:</b> ${creditForm.tenor || "-"}</p>`
            : ""
        }

        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>Tanggal</th>
              <th>No Invoice Sumber</th>
              <th>Brand</th>
              <th>Barang</th>
              <th>IMEI</th>
              <th>Harga Unit</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml || "<tr><td colspan='7'>Tidak ada item.</td></tr>"}
          </tbody>
        </table>

        <h3>Total Qty: ${totalQty}</h3>
        <h3>Total Bayar: Rp ${fmt(totalBayar)}</h3>
      </body>
      </html>
    `;
  };

  const handlePreviewInvoice = () => {
    if (!quickItems.length) {
      alert("Belum ada barang di tabel penjualan.");
      return;
    }
    const tanggal = new Date().toISOString().slice(0, 10);
    const invoiceNo = `INV-${tokoId || "X"}-${Date.now()}`;
    const html = buildInvoiceHtml(invoiceNo, tanggal);

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  const handleSimpanCetak = async () => {
    try {
      if (!quickItems.length) {
        alert("Belum ada barang di tabel penjualan.");
        return;
      }
      if (!paymentType) {
        alert("Pilih jenis pembayaran terlebih dahulu.");
        return;
      }
  
      const tanggal = new Date().toISOString().slice(0, 10);
      const invoiceNo = `INV-${tokoId || "X"}-${Date.now()}`;
  
      const tipeBayarForStatus =
        paymentType === "CASH"
          ? "CASH"
          : paymentType === "TRANSFER"
          ? "DEBIT CARD"
          : "PIUTANG";
  
      const status = getStatusFromTipeBayar(tipeBayarForStatus);
  
      const paymentMethodFinal =
        paymentType === "CASH"
          ? "TUNAI"
          : paymentType === "TRANSFER"
          ? "TRANSFER BANK"
          : creditForm.paymentMethod || "";
  
      for (const it of quickItems) {
        const payload = {
          TANGGAL_TRANSAKSI: tanggal,
          NO_INVOICE: invoiceNo,
          NAMA_TOKO: toko ? toko.name : "",
          NAMA_BRAND: it.namaBrand || "",
          NAMA_BARANG: it.namaBarang || "",
          IMEI: it.imei || "",
          QTY: 1,
          HARGA_UNIT: Number(it.hargaUnit || 0),
          TOTAL: Number(it.hargaUnit || 0),
  
          PAYMENT_METHOD: paymentMethodFinal,
          KATEGORI_BAYAR: tipeBayarForStatus,
          MDR: creditForm.mdr || "",
          KATEGORI_HARGA: creditForm.kategoriHarga || "",
          MP_PROTEK: creditForm.mpProtec || "",
          TENOR: creditForm.tenor || "",
  
          PAYMENT_METODE: "PENJUALAN",
          STATUS: status,
        };
  
        // ✅ SIMPAN KE MASTER PENJUALAN TOKO
        await addTransaksi(tokoId, payload);
  
        // ✅ TANDAI STOK DI PUSAT BERKURANG (IMEI SOLD)
        await addTransaksi("1", {
          ...payload,
          NAMA_TOKO: "CILANGKAP PUSAT",
          STATUS: "LUNAS",
          PAYMENT_METODE: "STOCK_KURANG",
        });
      }
  
      // ✅ HAPUS DRAFT SETELAH BERHASIL
      localStorage.removeItem(DRAFT_KEY);
  
      alert("✅ Penjualan berhasil disimpan & stok otomatis berkurang.");
  
      handlePreviewInvoice();
  
      setQuickItems([]);
      setPaymentType("");
      setCreditForm({
        paymentMethod: "",
        mdr: "",
        kategoriHarga: "",
        mpProtec: "",
        tenor: "",
      });
    } catch (err) {
      console.error("handleSimpanCetak error:", err);
      alert("❌ Gagal menyimpan penjualan.");
    }
  };
  

  // ======================= HANDLE TIDAK ADA TOKO =======================
  if (!toko) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white shadow rounded-xl px-6 py-4 text-center">
          <p className="font-semibold text-red-600">Toko tidak ditemukan</p>
          <p className="text-xs text-slate-500 mt-1">
            Pastikan link Sidebar untuk Dashboard Toko menggunakan id 1–10.
          </p>
        </div>
      </div>
    );
  }

  // ======================= UI =======================
  const rootBgClass = isDark
    ? "bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-slate-100"
    : "bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900";

  const cardBgClass = isDark
    ? "bg-slate-900/70 border border-slate-700/80 text-slate-100"
    : "bg-white border border-slate-200 text-slate-900";

  const subTextClass = isDark ? "text-slate-400" : "text-slate-500";

  return (
    <div className={`min-h-screen ${rootBgClass} p-4 sm:p-6`}>
      <div className="max-w-6xl mx-auto space-y-5">
        {/* ================= HEADER ================= */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/40 text-xs text-indigo-200">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Realtime Store Dashboard</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3 tracking-tight">
              <span className="inline-flex items-center justify-center h-11 w-11 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 shadow-lg shadow-indigo-500/30">
                <FaStore className="text-indigo-300 text-xl" />
              </span>
              <span>
                Dashboard Toko
                <span className="block text-sm font-normal text-slate-300">
                  {toko.name}
                </span>
              </span>
            </h1>
            <p className={`text-xs sm:text-sm ${subTextClass} max-w-xl`}>
              Kelola penjualan, stok, dan mutasi barang untuk toko ini secara
              realtime terintegrasi dengan Firebase.
            </p>
          </div>

          <div className="flex items-center gap-3 justify-end">
            <button
              onClick={handleToggleTheme}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-slate-900/60 border border-slate-700/70 shadow-lg shadow-black/40 text-xs hover:scale-105 transition"
            >
              {isDark ? (
                <>
                  <FaSun className="text-yellow-300" />
                  <span>Mode Terang</span>
                </>
              ) : (
                <>
                  <FaMoon className="text-indigo-500" />
                  <span>Mode Gelap</span>
                </>
              )}
            </button>

            <div
              className={`px-3 py-2 rounded-xl ${
                isDark
                  ? "bg-slate-900/60 border-slate-700/80"
                  : "bg-white border-slate-200"
              } border text-xs sm:text-sm flex flex-col items-end shadow-lg`}
            >
              <span className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                Toko ID
              </span>
              <span className="font-semibold">{toko.id}</span>
            </div>
          </div>
        </div>

        {/* ================= 3 MENU CARD ================= */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mt-2 sm:mt-4">
          {/* PENJUALAN */}
          <button
            onClick={() => handleOpen("penjualan")}
            className="group relative overflow-hidden flex flex-col items-start justify-between bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 text-white rounded-2xl p-5 shadow-xl shadow-indigo-900/40 border border-white/10 hover:border-indigo-300/60 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01] transition-all duration-300 text-left"
          >
            <span className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-3xl group-hover:bg-white/20 transition-all" />
            <div className="flex items-center justify-between w-full relative">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] opacity-80">
                  Menu
                </p>
                <p className="font-semibold text-lg mt-1">Penjualan</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center shadow-md shadow-black/30">
                <FaShoppingCart className="text-white text-2xl" />
              </div>
            </div>
            <p className="text-xs sm:text-sm mt-3 opacity-90">
              Input transaksi penjualan lengkap dengan invoice dan approval.
            </p>
          </button>

          {/* STOCK OPNAME */}
          <button
            onClick={() => handleOpen("stock")}
            className="group relative overflow-hidden flex flex-col items-start justify-between bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 text-white rounded-2xl p-5 shadow-xl shadow-emerald-900/40 border border-white/10 hover:border-emerald-300/60 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01] transition-all duration-300 text-left"
          >
            <span className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-3xl group-hover:bg-white/20 transition-all" />
            <div className="flex items-center justify-between w-full relative">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] opacity-80">
                  Menu
                </p>
                <p className="font-semibold text-lg mt-1">Stock Opname</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center shadow-md shadow-black/30">
                <FaBoxes className="text-white text-2xl" />
              </div>
            </div>
            <p className="text-xs sm:text-sm mt-3 opacity-90">
              Cek dan sesuaikan stok fisik dengan sistem secara berkala.
            </p>
          </button>

          {/* TRANSFER GUDANG */}
          <button
            onClick={() => handleOpen("transfer")}
            className="group relative overflow-hidden flex flex-col items-start justify-between bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 text-white rounded-2xl p-5 shadow-xl shadow-amber-900/40 border border-white/10 hover:border-amber-300/70 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.01] transition-all duration-300 text-left"
          >
            <span className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-3xl group-hover:bg-white/25 transition-all" />
            <div className="flex items-center justify-between w-full relative">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] opacity-80">
                  Menu
                </p>
                <p className="font-semibold text-lg mt-1">Transfer Gudang</p>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-white/20 flex items-center justify-center shadow-md shadow-black/30">
                <FaExchangeAlt className="text-white text-2xl" />
              </div>
            </div>
            <p className="text-xs sm:text-sm mt-3 opacity-90">
              Pindahkan stok antar toko atau ke gudang pusat dengan kontrol.
            </p>
          </button>
        </div>

        {/* ================= CHART PENJUALAN & STOK ================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <div
            className={`${cardBgClass} rounded-2xl shadow-xl p-4 sm:p-5 backdrop-blur-xl`}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-sm sm:text-base">
                  Total Penjualan per Toko
                </h3>
                <p className={`text-[11px] ${subTextClass}`}>
                  Berdasarkan transaksi berstatus{" "}
                  <span className="text-emerald-300">APPROVED</span>
                </p>
              </div>
            </div>
            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataPenjualanPerToko}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? "#1f2937" : "#e5e7eb"}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{
                      fill: isDark ? "#9ca3af" : "#4b5563",
                      fontSize: 10,
                    }}
                  />
                  <YAxis
                    tick={{
                      fill: isDark ? "#9ca3af" : "#4b5563",
                      fontSize: 10,
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#020617" : "#f9fafb",
                      border: "1px solid #4b5563",
                      borderRadius: "0.75rem",
                      fontSize: 11,
                      color: "#e5e7eb",
                    }}
                  />
                  <Bar dataKey="total" radius={[8, 8, 2, 2]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div
            className={`${cardBgClass} rounded-2xl shadow-xl p-4 sm:p-5 backdrop-blur-xl`}
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-semibold text-sm sm:text-base">
                  Stock Barang per Toko
                </h3>
                <p className={`text-[11px] ${subTextClass}`}>
                  Berdasarkan total Qty dari transaksi{" "}
                  <span className="text-sky-300">PEMBELIAN</span>
                </p>
              </div>
            </div>
            <div className="h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dataStockPerToko}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={isDark ? "#1f2937" : "#e5e7eb"}
                  />
                  <XAxis
                    dataKey="name"
                    tick={{
                      fill: isDark ? "#9ca3af" : "#4b5563",
                      fontSize: 10,
                    }}
                  />
                  <YAxis
                    tick={{
                      fill: isDark ? "#9ca3af" : "#4b5563",
                      fontSize: 10,
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isDark ? "#020617" : "#f9fafb",
                      border: "1px solid #4b5563",
                      borderRadius: "0.75rem",
                      fontSize: 11,
                      color: "#e5e7eb",
                    }}
                  />
                  <Bar dataKey="total" radius={[8, 8, 2, 2]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ================= PENJUALAN CEPAT VIA IMEI ================= */}
        <div
          className={`${cardBgClass} rounded-2xl shadow-xl p-4 sm:p-5 backdrop-blur-xl mt-6`}
        >
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3 mb-4">
            <div>
              <h2 className="font-semibold text-base sm:text-lg">
                Penjualan Cepat via IMEI
              </h2>
              <p className={`text-xs sm:text-sm ${subTextClass}`}>
                Masukkan IMEI untuk menambahkan barang ke tabel penjualan. Bisa
                lebih dari 1 barang / jenis.
              </p>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <div className="flex-1 flex items-center gap-2 bg-slate-900/40 rounded-xl px-3 py-2 border border-slate-700/60">
                <FaSearch className="text-slate-400 text-sm" />
                <input
                  value={searchImei}
                  onChange={(e) => setSearchImei(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleAddItemByImei();
                  }}
                  className="bg-transparent outline-none text-xs sm:text-sm flex-1"
                  placeholder="Masukkan IMEI lalu Enter..."
                />
              </div>
              <button
                onClick={handleAddItemByImei}
                className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-indigo-900/40"
              >
                Tambah
              </button>
            </div>
          </div>

          {/* TABEL ITEM */}
          <div className="w-full overflow-x-auto rounded-xl border border-slate-700/60 mb-4">
            <table className="min-w-full text-xs sm:text-sm">
              <thead className={isDark ? "bg-slate-900/80" : "bg-slate-100"}>
                <tr>
                  <th className="px-2 py-2 text-left">#</th>
                  <th className="px-2 py-2 text-left">Tanggal</th>
                  <th className="px-2 py-2 text-left">No Invoice</th>
                  <th className="px-2 py-2 text-left">Brand</th>
                  <th className="px-2 py-2 text-left">Barang</th>
                  <th className="px-2 py-2 text-left">IMEI</th>
                  <th className="px-2 py-2 text-right">Harga Unit</th>
                  <th className="px-2 py-2 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {quickItems.length === 0 ? (
                  <tr>
                    <td className="px-3 py-3 text-center text-xs" colSpan={8}>
                      Belum ada item. Cari IMEI di atas untuk menambahkan
                      barang.
                    </td>
                  </tr>
                ) : (
                  quickItems.map((it, idx) => (
                    <tr
                      key={it.id}
                      className={
                        isDark
                          ? "border-t border-slate-800/80 hover:bg-slate-800/70"
                          : "border-t border-slate-200 hover:bg-slate-50"
                      }
                    >
                      <td className="px-2 py-2">{idx + 1}</td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        {it.tanggal}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        {it.noInvoice}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        {it.namaBrand}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        {it.namaBarang}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap font-mono">
                        {it.imei}
                      </td>
                      <td className="px-2 py-2 text-right whitespace-nowrap">
                        Rp {fmt(it.hargaUnit)}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          onClick={() => handleRemoveItem(it.id)}
                          className="text-[11px] px-2 py-1 rounded-lg bg-red-500/80 hover:bg-red-500 text-white"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* TOMBOL PEMBAYARAN */}
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between mb-4">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handlePaymentClick("CASH")}
                className={`px-3 py-2 rounded-full text-xs sm:text-sm border ${
                  paymentType === "CASH"
                    ? "bg-emerald-500 text-white border-emerald-400"
                    : "bg-slate-900/40 border-slate-700 text-slate-200"
                }`}
              >
                CASH
              </button>
              <button
                onClick={() => handlePaymentClick("TRANSFER")}
                className={`px-3 py-2 rounded-full text-xs sm:text-sm border ${
                  paymentType === "TRANSFER"
                    ? "bg-sky-500 text-white border-sky-400"
                    : "bg-slate-900/40 border-slate-700 text-slate-200"
                }`}
              >
                TRANSFER DEBIT
              </button>
              <button
                onClick={() => handlePaymentClick("KREDIT")}
                className={`px-3 py-2 rounded-full text-xs sm:text-sm border ${
                  paymentType === "KREDIT"
                    ? "bg-amber-500 text-white border-amber-400"
                    : "bg-slate-900/40 border-slate-700 text-slate-200"
                }`}
              >
                KREDIT / PIUTANG
              </button>
            </div>

            <div className={`text-xs ${subTextClass}`}>
              Status:{" "}
              <span className="font-semibold text-slate-100">
                {statusPembayaran || "-"}
              </span>
            </div>
          </div>

          {/* FORM KREDIT */}
          {paymentType === "KREDIT" && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mb-4 text-xs sm:text-sm">
              <div className="flex flex-col gap-1">
                <label className={subTextClass}>PAYMENT METODE</label>
                <select
                  value={creditForm.paymentMethod}
                  onChange={(e) =>
                    handleCreditChange("paymentMethod", e.target.value)
                  }
                  className="rounded-lg px-2 py-1 bg-slate-900/60 border border-slate-700 outline-none"
                >
                  <option value="">- Pilih -</option>
                  {PAYMENT_METHOD_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className={subTextClass}>MDR (%)</label>
                <input
                  value={creditForm.mdr}
                  onChange={(e) => handleCreditChange("mdr", e.target.value)}
                  className="rounded-lg px-2 py-1 bg-slate-900/60 border border-slate-700 outline-none"
                  placeholder="MDR"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className={subTextClass}>KATEGORI HARGA</label>
                <input
                  value={creditForm.kategoriHarga}
                  onChange={(e) =>
                    handleCreditChange("kategoriHarga", e.target.value)
                  }
                  className="rounded-lg px-2 py-1 bg-slate-900/60 border border-slate-700 outline-none"
                  placeholder="KREDIT / REGULER"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className={subTextClass}>MP PROTEK</label>
                <input
                  value={creditForm.mpProtec}
                  onChange={(e) =>
                    handleCreditChange("mpProtec", e.target.value)
                  }
                  className="rounded-lg px-2 py-1 bg-slate-900/60 border border-slate-700 outline-none"
                  placeholder="YA / TIDAK"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className={subTextClass}>TENOR</label>
                <input
                  value={creditForm.tenor}
                  onChange={(e) => handleCreditChange("tenor", e.target.value)}
                  className="rounded-lg px-2 py-1 bg-slate-900/60 border border-slate-700 outline-none"
                  placeholder="Bulan"
                />
              </div>
            </div>
          )}

          {/* SUMMARY & ACTION */}
          <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
            <div className="text-xs sm:text-sm space-y-1">
              <p>
                <span className={subTextClass}>Jenis Pembayaran:</span>{" "}
                <span className="font-semibold">
                  {paymentType === "CASH"
                    ? "CASH"
                    : paymentType === "TRANSFER"
                    ? "TRANSFER DEBIT"
                    : paymentType === "KREDIT"
                    ? "KREDIT / PIUTANG"
                    : "-"}
                </span>
              </p>
              <p>
                <span className={subTextClass}>Jumlah QTY:</span>{" "}
                <span className="font-semibold">{totalQty}</span>
              </p>
              <p>
                <span className={subTextClass}>Total Bayar:</span>{" "}
                <span className="font-semibold">Rp {fmt(totalBayar)}</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2 justify-end">
              <button
                onClick={handlePreviewInvoice}
                className="px-3 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-white text-xs sm:text-sm shadow-lg"
              >
                Preview Invoice
              </button>
              <button
                onClick={handleSimpanCetak}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold shadow-lg"
              >
                Simpan & Cetak
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
