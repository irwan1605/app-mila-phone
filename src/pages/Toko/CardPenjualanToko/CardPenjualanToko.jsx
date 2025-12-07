// src/pages/Toko/CardPenjualanToko/CardPenjualanToko.jsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import { FaSave, FaSearch } from "react-icons/fa";

import FormUserSection from "./FormUserSection";
import FormPaymentSection from "./FormPaymentSection";
import FormItemSection from "./FormItemSection";
import IMEISearchModal from "./IMEISearchModal";
import SalesResultTable from "./SalesResultTable";
import InvoicePreview from "./InvoicePreview";

import {
  addTransaksi,
  addPenjualan,
  getTokoName,
  listenUsers,
  adjustInventoryStock,
  updateTransaksi,
} from "../../../services/FirebaseService";

import logoUrl from "../../../assets/logoMMT.png";

const glassCard =
  "bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl shadow-md p-4";

const formatRupiah = (num) => {
  const n = Number(num || 0);
  return n.toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });
};

export default function CardPenjualanToko() {
  const { tokoId } = useParams(); // /toko/:tokoId/penjualan
  const navigate = useNavigate();

  const [tokoName, setTokoName] = useState(
    (tokoId || "").replace(/-/g, " ").toUpperCase() || "TOKO"
  );

  // ========== STATE FORM GLOBAL ==========

  const [userForm, setUserForm] = useState({
    tanggalPembelian: new Date().toISOString().slice(0, 10),
    noFaktur: "",
    idPelanggan: "",
    noTelepon: "",
    namaToko: (tokoId || "").replace(/-/g, " ").toUpperCase(),
    namaSales: "",
    salesTitipan: "",
    namaPelanggan: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    kategoriBayar: "", // CASH / TRANSFER / PIUTANG
    paymentMethod: "",
    mdr: "", // persen (manual input)
    mpProteck: "", // ✅ TAMBAHAN: MP PROTECK
    dpUser: "",
    tenor: "",
    status: "PIUTANG",
  });

  const [items, setItems] = useState([
    {
      id: Date.now(),
      kategoriBarang: "",
      namaBrand: "",
      namaBarang: "",
      qty: 1,
      imei: "",
      hargaUnit: 0,
      discount: 0,
    },
  ]);

  // isi tabel hasil transaksi (draft + approved)
  // ✅ SIMPAN KE LOCALSTORAGE AGAR TIDAK HILANG SAAT REFRESH
  const [cartRows, setCartRows] = useState(() => {
    try {
      const key = `CART_PENJUALAN_TOKO_${tokoId || "GLOBAL"}`;
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch (err) {
      console.error("Gagal load cartRows dari localStorage:", err);
      return [];
    }
  });

  useEffect(() => {
    try {
      const key = `CART_PENJUALAN_TOKO_${tokoId || "GLOBAL"}`;
      localStorage.setItem(key, JSON.stringify(cartRows));
    } catch (err) {
      console.error("Gagal simpan cartRows ke localStorage:", err);
    }
  }, [cartRows, tokoId]);

  // tabel cepat dari pencarian IMEI
  const [quickRows, setQuickRows] = useState([]);

  // modal cari IMEI
  const [imeiModalOpen, setImeiModalOpen] = useState(false);

  // preview invoice untuk 1 row
  const [previewData, setPreviewData] = useState(null);
  const previewRef = useRef(null);

  // preview invoice global dengan form input pelanggan
  const [globalPreviewOpen, setGlobalPreviewOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    idPelanggan: "",
    namaPelanggan: "",
    noTlp: "",
    namaSales: "",
  });

  const [saving, setSaving] = useState(false);

  // data user (karyawan / sales) untuk autocomplete
  const [users, setUsers] = useState([]);

  // mode pembayaran (CASH / TRANSFER / PIUTANG)
  const [paymentMode, setPaymentMode] = useState("");
  const [cashAmount, setCashAmount] = useState("");

  // ✅✅✅ RESET CASH SAAT MODE BUKAN CASH
  useEffect(() => {
    if (paymentMode !== "CASH") {
      setCashAmount("");
    }
  }, [paymentMode]);

  // ========== AMBIL NAMA TOKO DARI FIREBASE ==========

  useEffect(() => {
    if (!tokoId) return;

    (async () => {
      try {
        const tokoName = await getTokoName?.(tokoId);
        const finalName =
        tokoName || (tokoId || "").replace(/-/g, " ").toUpperCase();

        setTokoName(finalName);
        setUserForm((prev) => ({
          ...prev,
          namaToko: finalName,
        }));
      } catch (e) {
        console.error("Gagal ambil nama toko:", e);
        const fallback = (tokoId || "").replace(/-/g, " ").toUpperCase();
        setTokoName(fallback);
        setUserForm((prev) => ({
          ...prev,
          namaToko: fallback,
        }));
      }
    })();
  }, [tokoId]);

  // listen user list
  useEffect(() => {
    const unsub = listenUsers?.((list) => {
      setUsers(Array.isArray(list) ? list : []);
    });
    return () => unsub && unsub();
  }, []);

  // ========== HELPER ==========

  const generateInvoiceNo = useCallback(() => {
    return `INV-${tokoId || "X"}-${Date.now()}`;
  }, [tokoId]);

  const parseImeiLines = (imeiStr) =>
    (imeiStr || "")
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);

  const calcLineTotal = (item) => {
    const qty = Number(item.qty || 0);
    const price = Number(item.hargaUnit || 0);
    const disc = Number(item.discount || 0);
    const subtotal = qty * price;
    const discValue = (disc / 100) * subtotal;
    const lineTotal = subtotal - discValue;
    return {
      qty,
      price,
      disc,
      subtotal,
      discValue,
      lineTotal,
    };
  };

  // ✅ TOTAL ITEM & GRAND TOTAL (PASTI TERHUBUNG KE TABEL UTAMA)
  const totals = useMemo(() => {
    const totalItems = cartRows.reduce(
      (sum, row) => sum + Number(row.item?.qty || 0),
      0
    );

    const totalAmount = cartRows.reduce(
      (sum, row) => sum + Number(row.totals?.lineTotal || 0),
      0
    );

    return {
      totalItems,
      totalAmount, // ✅ INI YANG JADI TOTAL BAYAR
    };
  }, [cartRows]);

  // Harga total untuk skema PIUTANG
  const hargaTotalUnitPiutang = totals.totalAmount;
  const mdrPersenNum = Number(paymentForm.mdr || 0);
  const hargaTotalPiutang = useMemo(() => {
    const base = Number(totals.totalAmount || 0);
    const mdrValue = (mdrPersenNum / 100) * base;
    return base + mdrValue;
  }, [totals.totalAmount, mdrPersenNum]);

  // ✅ KEMBALIAN = UANG CASH - TOTAL BAYAR
  const cashChange = useMemo(() => {
    if (paymentMode !== "CASH") return 0;

    const cash = Number(cashAmount || 0);
    const total = Number(totals.totalAmount || 0);

    const result = cash - total;
    return result > 0 ? result : 0;
  }, [paymentMode, cashAmount, totals.totalAmount]);

  // ========== FORM → TABEL (TAMBAH BARIS MANUAL / ITEM SECTION) ==========

  function handleAddRowFromForm(item) {
    const parsed = parseImeiLines(item.imei || "");
    const kategori = (item.kategoriBarang || "").toUpperCase();

    // ✅ Jika kategori ACCESSORIES → boleh tanpa IMEI (multi qty)
    if (kategori !== "ACCESSORIES") {
      if (parsed.length !== 0 && parsed.length !== Number(item.qty)) {
        if (parsed.length === 1 && Number(item.qty) > 1) {
          // 1 imei dipakai untuk banyak qty -> diizinkan
        } else {
          alert(
            "Jumlah IMEI harus sama dengan QTY (atau kosong jika tidak ada IMEI)."
          );
          return;
        }
      }
    }

    const invoice = userForm.noFaktur?.trim() || generateInvoiceNo();
    const lineCalc = calcLineTotal(item);

    const newRow = {
      id: Date.now() + Math.random(),
      tanggal: userForm.tanggalPembelian,
      invoice,
      tokoId,
      tokoName,
      user: { ...userForm },
      payment: {
        ...paymentForm,
        kategoriBayar: paymentMode || paymentForm.kategoriBayar,
      },
      item: { ...item },
      totals: lineCalc,
      status: "DRAFT",
      source: "FORM",
    };

    setCartRows((p) => [...p, newRow]);
  }

  function handleRemoveCartRow(rowId) {
    setCartRows((p) => p.filter((r) => r.id !== rowId));
  }

  function handleEditCartRow(rowId, updated) {
    setCartRows((p) =>
      p.map((r) => (r.id === rowId ? { ...r, ...updated } : r))
    );
  }

  // ========== APPROVE (SIMPAN SATU BARIS KE FIREBASE) ==========

  async function internalApproveRow(row) {
    const imeiList = parseImeiLines(row.item.imei || "");
    let finalImeis = imeiList.length ? imeiList : Array(row.item.qty).fill("");

    if (finalImeis.length !== Number(row.item.qty)) {
      if (finalImeis.length === 1) {
        finalImeis = Array(row.item.qty).fill(finalImeis[0]);
      } else {
        alert("Jumlah IMEI tidak sesuai dengan QTY.");
        return false;
      }
    }

    for (let i = 0; i < finalImeis.length; i++) {
      const payload = {
        TANGGAL_TRANSAKSI: row.tanggal,
        NO_INVOICE: row.invoice,
        ID_PELANGGAN: row.user.idPelanggan || "-",
        NO_TELEPON: row.user.noTelepon || "-",
        NAMA_TOKO: row.tokoName,
        NAMA_SALES: row.user.namaSales || "",
        SALES_TITIPAN: row.user.salesTitipan || "",
        NAMA_PELANGGAN: row.user.namaPelanggan || "",

        KATEGORI_BAYAR: row.payment.kategoriBayar || paymentMode || "",
        PAYMENT_METHOD: row.payment.paymentMethod || "",
        MDR: row.payment.mdr || "",
        MP_PROTECK: row.payment.mpProteck || "", // ✅ SIMPAN MP PROTECK
        DP_USER: row.payment.dpUser || null,
        TENOR: row.payment.tenor || null,

        KATEGORI_BARANG: row.item.kategoriBarang || "",
        NAMA_BRAND: row.item.namaBrand || "",
        NAMA_BARANG: row.item.namaBarang || "",
        IMEI: finalImeis[i] || "",
        QTY: 1,
        HARGA_UNIT: Number(row.item.hargaUnit || 0),
        DISCOUNT: Number(row.item.discount || 0),
        HARGA_TOTAL:
          Number(row.totals.lineTotal || 0) / Number(row.item.qty || 1),
        STATUS: row.payment.kategoriBayar === "PIUTANG" ? "PIUTANG" : "LUNAS",
      };

      if (typeof addTransaksi === "function") {
        await addTransaksi(tokoId, payload);
      } else if (typeof addPenjualan === "function") {
        await addPenjualan(payload);
      }
    }

    // kurangi stok jika ada IMEI / namaBarang
    if (row.item.namaBarang) {
      try {
        await adjustInventoryStock(
          row.item.namaBarang || row.item.sku || "",
          Number(row.item.qty || 0) * -1,
          "OUT"
        );
      } catch (err) {
        console.warn("adjustInventoryStock error:", err);
      }
    }

    return true;
  }

  function handleApproveRow(rowId) {
    const row = cartRows.find((r) => r.id === rowId);
    if (!row) return;

    (async () => {
      try {
        setSaving(true);
        const ok = await internalApproveRow(row);
        if (!ok) {
          setSaving(false);
          return;
        }

        setCartRows((p) =>
          p.map((r) => (r.id === rowId ? { ...r, status: "APPROVED" } : r))
        );
        alert("Transaksi berhasil disimpan & APPROVED.");
      } catch (err) {
        console.error("Approve error:", err);
        alert("Gagal menyimpan transaksi. Cek console.");
      } finally {
        setSaving(false);
      }
    })();
  }

  // ========== VOID TRANSAKSI (KEMBALIKAN STOK) ==========

  function handleVoidRow(rowId) {
    const row = cartRows.find((r) => r.id === rowId);
    if (!row) return;

    if (!window.confirm("Yakin VOID transaksi ini? Stok akan dikembalikan.")) {
      return;
    }

    (async () => {
      try {
        if (typeof updateTransaksi === "function") {
          await updateTransaksi(tokoId, row.firebaseId || row.id, {
            STATUS: "VOID",
          });
        }

        if (typeof adjustInventoryStock === "function") {
          await adjustInventoryStock(
            row.item.namaBarang || row.item.sku || "",
            Number(row.item.qty || 0),
            "IN"
          );
        }

        setCartRows((p) =>
          p.map((r) => (r.id === rowId ? { ...r, status: "VOID" } : r))
        );
        alert("Transaksi di-VOID dan stok dikembalikan.");
      } catch (err) {
        console.error("Void error:", err);
        alert("Gagal VOID transaksi. Cek console.");
      }
    })();
  }

  // ========== BULK APPROVE (SUBMIT SEMUA) ==========

  function handleBulkApprove() {
    if (!cartRows.length) {
      alert("Belum ada data transaksi di tabel utama.");
      return;
    }
    if (!paymentMode) {
      alert(
        "Pilih mode pembayaran (CASH / TRANSFER / PIUTANG) terlebih dahulu."
      );
      return;
    }

    if (
      paymentMode === "CASH" &&
      Number(cashAmount || 0) < Number(totals.totalAmount || 0)
    ) {
      alert("Jumlah uang cash masih kurang dari total belanja.");
      return;
    }

    if (paymentMode === "PIUTANG") {
      if (
        !userForm.namaPelanggan ||
        !userForm.noTelepon ||
        !paymentForm.paymentMethod ||
        !paymentForm.mdr
      ) {
        alert(
          "Lengkapi Nama Pelanggan, No. Telepon, Payment Method dan MDR untuk PIUTANG."
        );
        return;
      }
    }

    if (
      !window.confirm(
        `Yakin submit ${cartRows.length} baris transaksi dengan mode ${paymentMode}?`
      )
    ) {
      return;
    }

    (async () => {
      try {
        setSaving(true);
        for (const row of cartRows) {
          const rowWithMode = {
            ...row,
            user: {
              ...row.user,
              idPelanggan: userForm.idPelanggan,
              noTelepon: userForm.noTelepon,
              namaPelanggan: userForm.namaPelanggan,
              namaSales: userForm.namaSales,
            },
            payment: {
              ...row.payment,
              kategoriBayar: paymentMode,
              paymentMethod: paymentForm.paymentMethod,
              mdr: paymentForm.mdr,
              mpProteck: paymentForm.mpProteck, // ✅ ikut dibawa
              dpUser: paymentForm.dpUser,
              tenor: paymentForm.tenor,
            },
          };
          const ok = await internalApproveRow(rowWithMode);
          if (!ok) {
            setSaving(false);
            return;
          }
        }

        setCartRows((p) => p.map((r) => ({ ...r, status: "APPROVED" })));
        alert("Semua transaksi berhasil disimpan & APPROVED.");
      } catch (err) {
        console.error("Bulk approve error:", err);
        alert("Gagal menyimpan transaksi. Cek console.");
      } finally {
        setSaving(false);
      }
    })();
  }

  // ========== EXPORT EXCEL ==========

  function handleExportExcel() {
    try {
      // eslint-disable-next-line global-require
      const XLSX = require("xlsx");
      const rows = cartRows.map((r) => ({
        Tanggal: r.tanggal,
        Invoice: r.invoice,
        Toko: r.tokoName,
        Barang: r.item?.namaBarang,
        IMEI: r.item?.imei,
        Qty: r.item?.qty,
        HargaUnit: r.item?.hargaUnit,
        Discount: r.item?.discount,
        Total: r.totals?.lineTotal,
        Status: r.status,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Penjualan");
      const fileName = `Penjualan_${tokoName}_${new Date()
        .toISOString()
        .slice(0, 10)}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } catch (err) {
      console.error("Export Excel error:", err);
      alert("Gagal export Excel. Pastikan package xlsx terpasang.");
    }
  }

  // ========== PREVIEW INVOICE ==========

  function handlePreviewInvoice(mode) {
    if (mode === "GLOBAL") {
      setGlobalPreviewOpen(true);
      // isi default dari form global berdasarkan userForm
      setInvoiceForm((prev) => ({
        ...prev,
        idPelanggan: userForm.idPelanggan,
        namaPelanggan: userForm.namaPelanggan,
        noTlp: userForm.noTelepon,
        namaSales: userForm.namaSales,
      }));
      return;
    }

    const row = cartRows.find((r) => r.id === mode);
    if (!row) return;
    setPreviewData(row);
    setTimeout(() => {
      previewRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 150);
  }

  function handlePrintInvoice() {
    window.print();
  }

  // ========== CALLBACK DARI MODAL IMEI SEARCH (PENJUALAN CEPAT) ==========

  const handleAddFromImeiSearch = (selectedItems) => {
    if (!selectedItems || !selectedItems.length) {
      setImeiModalOpen(false);
      return;
    }

    const mapped = selectedItems.map((it) => {
      const calc = calcLineTotal(it);
      return {
        id: Date.now() + Math.random(),
        tanggal: userForm.tanggalPembelian,
        invoice: userForm.noFaktur?.trim() || generateInvoiceNo(),
        tokoId,
        tokoName,
        user: { ...userForm },
        payment: {
          ...paymentForm,
          kategoriBayar: paymentMode || paymentForm.kategoriBayar,
        },
        item: { ...it },
        totals: calc,
        status: "DRAFT",
        source: "IMEI",
      };
    });

    // ⛔ Tidak langsung ke tabel utama — masuk dulu ke tabel QUICK
    setQuickRows((prev) => [...prev, ...mapped]);
    setImeiModalOpen(false);
  };

  function handleSubmitQuickToMain() {
    if (!quickRows.length) return;
    setCartRows((prev) => [...prev, ...quickRows]);
    setQuickRows([]);
  }

  // ========== RENDER ==========

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* HEADER */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="h-10 w-10 rounded-lg bg-white/60 border border-white/30 backdrop-blur flex items-center justify-center shadow"
            >
              <FaArrowBackIconFallback />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Penjualan - {tokoName}
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Form penjualan & invoice (Glassmorphism Modern).
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setImeiModalOpen(true)}
              className="px-3 py-2 rounded-lg bg-white/70 border border-white/30 flex items-center gap-2 text-xs sm:text-sm"
            >
              <FaSearch /> Penjualan Cepat Cari IMEI
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3 py-2 rounded-lg bg-emerald-600 text-white flex items-center gap-2 text-xs sm:text-sm"
            >
              Export Excel
            </button>

            <button
              onClick={handleBulkApprove}
              disabled={!paymentMode || !cartRows.length || saving}
              className={`px-3 py-2 rounded-lg flex items-center gap-2 text-xs sm:text-sm ${
                !paymentMode || !cartRows.length || saving
                  ? "bg-indigo-300 text-white cursor-not-allowed"
                  : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              <FaSave /> Submit
            </button>
          </div>
        </div>

        {/* 3 SKEMA HORIZONTAL */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className={`${glassCard} min-h-[260px]`}>
            <FormUserSection
              value={userForm}
              onChange={(next) => setUserForm(next)}
              users={users}
            />
          </div>

          <div className={`${glassCard} min-h-[260px]`}>
            <FormPaymentSection
              value={paymentForm}
              onChange={(next) => setPaymentForm(next)}
              mode={paymentMode}
            />
          </div>

          <div className={`${glassCard} min-h-[260px]`}>
            <FormItemSection
              value={items}
              onChange={(next) => setItems(next)}
              onAddRow={(row) => handleAddRowFromForm(row)}
            />
          </div>
        </div>

        {/* TABEL TRANSAKSI BERDASARKAN PENCARIAN IMEI */}
        {quickRows.length > 0 && (
          <div className="bg-white rounded-2xl shadow p-4 border border-dashed border-indigo-200">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-slate-700">
                Transaksi Berdasarkan Pencarian IMEI
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setQuickRows([])}
                  className="px-3 py-1 rounded-lg bg-gray-100 text-xs md:text-sm hover:bg-gray-200"
                >
                  Kosongkan
                </button>
                <button
                  type="button"
                  onClick={handleSubmitQuickToMain}
                  className="px-3 py-1 rounded-lg bg-indigo-600 text-white text-xs md:text-sm hover:bg-indigo-700"
                >
                  Submit ke Tabel Utama
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm border-collapse">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="border p-2">No</th>
                    <th className="border p-2">Tanggal</th>
                    <th className="border p-2">Invoice</th>
                    <th className="border p-2">Nama Barang</th>
                    <th className="border p-2">IMEI</th>
                    <th className="border p-2">Qty</th>
                    <th className="border p-2">Harga Unit</th>
                    <th className="border p-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {quickRows.map((r, idx) => (
                    <tr key={r.id}>
                      <td className="border p-2 text-center">{idx + 1}</td>
                      <td className="border p-2 text-center">{r.tanggal}</td>
                      <td className="border p-2 text-center">{r.invoice}</td>
                      <td className="border p-2">{r.item?.namaBarang}</td>
                      <td className="border p-2 whitespace-pre-wrap">
                        {r.item?.imei}
                      </td>
                      <td className="border p-2 text-center">{r.item?.qty}</td>
                      <td className="border p-2 text-right">
                        {formatRupiah(r.item?.hargaUnit || 0)}
                      </td>
                      <td className="border p-2 text-right">
                        {formatRupiah(r.totals?.lineTotal || 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-1 text-[11px] text-slate-500">
              • Data di atas belum masuk ke tabel utama. Klik{" "}
              <span className="font-semibold">Submit ke Tabel Utama</span> untuk
              memindahkan.
            </p>
          </div>
        )}

        {/* MODE PEMBAYARAN + TOTAL + KEMBALIAN + SKEMA PIUTANG */}
        <div className={`${glassCard} flex flex-col gap-3`}>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">
              Mode Pembayaran:
            </span>
            {["CASH", "TRANSFER", "PIUTANG"].map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setPaymentMode(mode);
                  setPaymentForm((prev) => ({
                    ...prev,
                    kategoriBayar: mode,
                    status: mode === "PIUTANG" ? "PIUTANG" : "LUNAS",
                  }));
                }}
                className={`px-3 py-1 rounded-full text-xs md:text-sm border transition ${
                  paymentMode === mode
                    ? "bg-indigo-600 text-white border-indigo-600 shadow"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                }`}
              >
                {mode}
              </button>
            ))}

            {paymentMode && (
              <span className="ml-2 text-[11px] text-slate-500">
                Mode aktif: <span className="font-semibold">{paymentMode}</span>
              </span>
            )}
          </div>

          {/* TOTAL ITEM & GRAND TOTAL */}
          <div className="flex flex-wrap justify-between text-xs md:text-sm text-slate-700">
            <div>
              Total Item:{" "}
              <span className="font-semibold">{totals.totalItems}</span>
            </div>
            <div>
              Grand Total:{" "}
              <span className="font-semibold text-indigo-600">
                {formatRupiah(totals.totalAmount)}
              </span>
            </div>
          </div>

          {/* MODE CASH → TOTAL BAYAR & KEMBALIAN */}
          {paymentMode === "CASH" && (
            <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm">
              <div>
                Total Bayar:{" "}
                <span className="font-semibold text-emerald-600">
                  {formatRupiah(totals.totalAmount)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span>Jumlah Uang Cash:</span>
                <input
                  type="number"
                  className="border rounded-lg px-2 py-1 text-xs md:text-sm bg-white"
                  placeholder="Masukkan nominal cash"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                />
              </div>

              <div>
                Total Kembalian:{" "}
                <span className="font-semibold text-indigo-600">
                  {formatRupiah(cashChange)}
                </span>
              </div>
            </div>
          )}

          {/* MODE PIUTANG → SKEMA 2 & 3 */}
          {paymentMode === "PIUTANG" && (
            <div className="mt-2 border-t border-slate-200 pt-3 space-y-2 text-xs md:text-sm">
              <div className="font-semibold text-slate-700 mb-1">
                SKEMA PIUTANG (DATA AKUN)
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <input
                  className="border rounded-lg px-2 py-1 bg-white"
                  placeholder="NAMA AKUN / PELANGGAN"
                  value={userForm.namaPelanggan}
                  onChange={(e) =>
                    setUserForm((prev) => ({
                      ...prev,
                      namaPelanggan: e.target.value.toUpperCase(),
                    }))
                  }
                />
                <input
                  className="border rounded-lg px-2 py-1 bg-white"
                  placeholder="NO. TELEPON"
                  value={userForm.noTelepon}
                  onChange={(e) =>
                    setUserForm((prev) => ({
                      ...prev,
                      noTelepon: e.target.value.toUpperCase(),
                    }))
                  }
                />
                <input
                  className="border rounded-lg px-2 py-1 bg-white"
                  placeholder="ID PELANGGAN"
                  value={userForm.idPelanggan}
                  onChange={(e) =>
                    setUserForm((prev) => ({
                      ...prev,
                      idPelanggan: e.target.value.toUpperCase(),
                    }))
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <select
                  className="border rounded-lg px-2 py-1 bg-white"
                  value={paymentForm.paymentMethod}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      paymentMethod: e.target.value.toUpperCase(),
                    }))
                  }
                >
                  <option value="">PAYMENT METHOD</option>
                  <option value="DEBIT">DEBIT</option>
                  <option value="KREDIT">KREDIT</option>
                  <option value="VIRTUAL ACCOUNT">VIRTUAL ACCOUNT</option>
                  <option value="PAYLATER">PAYLATER</option>
                </select>

                {/* ✅ MDR MANUAL */}
                <input
                  className="border rounded-lg px-2 py-1 bg-white"
                  type="number"
                  placeholder="MDR (%)"
                  value={paymentForm.mdr}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      mdr: e.target.value,
                    }))
                  }
                />

                {/* ✅ MP PROTECK DI SAMPING MDR */}
                <input
                  className="border rounded-lg px-2 py-1 bg-white"
                  type="number"
                  placeholder="MP PROTECK"
                  value={paymentForm.mpProteck}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      mpProteck: e.target.value,
                    }))
                  }
                />

                <input
                  className="border rounded-lg px-2 py-1 bg-white"
                  type="number"
                  placeholder="DP USER"
                  value={paymentForm.dpUser}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      dpUser: e.target.value,
                    }))
                  }
                />

                <input
                  className="border rounded-lg px-2 py-1 bg-white"
                  placeholder="TENOR"
                  value={paymentForm.tenor}
                  onChange={(e) =>
                    setPaymentForm((prev) => ({
                      ...prev,
                      tenor: e.target.value.toUpperCase(),
                    }))
                  }
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="border rounded-lg px-2 py-1 bg-slate-50 flex justify-between">
                  <span>HARGA TOTAL UNIT</span>
                  <span className="font-semibold">
                    {formatRupiah(hargaTotalUnitPiutang)}
                  </span>
                </div>
                <div className="border rounded-lg px-2 py-1 bg-slate-50 flex justify-between">
                  <span>HARGA TOTAL + MDR</span>
                  <span className="font-semibold text-indigo-600">
                    {formatRupiah(hargaTotalPiutang)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TOMBOL PREVIEW GLOBAL */}
          <div className="flex justify-end mt-2">
            <button
              onClick={() => handlePreviewInvoice("GLOBAL")}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs sm:text-sm hover:bg-indigo-700"
            >
              Preview Invoice
            </button>
          </div>
        </div>

        {/* TABEL HASIL TRANSAKSI (UTAMA) */}
        <div className="bg-white rounded-2xl shadow p-4">
          <SalesResultTable
            rows={cartRows}
            onRemove={handleRemoveCartRow}
            onEdit={handleEditCartRow}
            onApprove={handleApproveRow}
            onVoid={handleVoidRow}
            onPreview={handlePreviewInvoice}
            onExport={handleExportExcel}
          />
        </div>

        {/* PREVIEW INVOICE SATU ROW */}
        <div ref={previewRef}>
          {previewData && (
            <div className="bg-white rounded-2xl shadow p-4 print:p-0 print:shadow-none">
              <InvoicePreview
                data={previewData}
                logoUrl={logoUrl}
                tokoName={tokoName}
              />
              <div className="mt-3 flex justify-end gap-2 print:hidden">
                <button
                  onClick={handlePrintInvoice}
                  className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs sm:text-sm"
                >
                  Cetak Invoice
                </button>
                <button
                  onClick={() => setPreviewData(null)}
                  className="px-3 py-2 rounded-lg bg-gray-300 text-xs sm:text-sm"
                >
                  Tutup Preview
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL CARI IMEI */}
      {imeiModalOpen && (
        <IMEISearchModal
          onClose={() => setImeiModalOpen(false)}
          onSelect={handleAddFromImeiSearch}
        />
      )}

      {/* MODAL PREVIEW GLOBAL */}
      {globalPreviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
          <div className="bg-white rounded-xl p-4 w-full max-w-md">
            <h2 className="font-bold mb-3 text-sm">
              Preview & Cetak Invoice (Global)
            </h2>

            {[
              ["idPelanggan", "ID Pelanggan"],
              ["namaPelanggan", "Nama Pelanggan"],
              ["noTlp", "No Tlp"],
              ["namaSales", "Nama Sales"],
            ].map(([k, label]) => (
              <div key={k} className="mb-2">
                <label className="text-xs block mb-1">{label}</label>
                <input
                  className="w-full border rounded p-2 text-sm"
                  value={invoiceForm[k]}
                  onChange={(e) =>
                    setInvoiceForm((prev) => ({
                      ...prev,
                      [k]: e.target.value.toUpperCase(),
                    }))
                  }
                />
              </div>
            ))}

            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setGlobalPreviewOpen(false)}
                className="px-3 py-2 bg-gray-300 rounded text-xs sm:text-sm"
              >
                Batal
              </button>

              <button
                onClick={() => {
                  setPreviewData({
                    tanggal:
                      userForm.tanggalPembelian ||
                      new Date().toISOString().slice(0, 10),
                    invoice: userForm.noFaktur || generateInvoiceNo(),
                    user: {
                      idPelanggan: invoiceForm.idPelanggan,
                      noTelepon: invoiceForm.noTlp,
                      namaSales: invoiceForm.namaSales,
                      namaPelanggan: invoiceForm.namaPelanggan,
                    },
                    item: {
                      namaBarang:
                        cartRows[0]?.item?.namaBarang || "ITEM PENJUALAN",
                      imei: cartRows.map((r) => r.item?.imei || "").join("\n"),
                      qty: totals.totalItems,
                      hargaUnit: 0,
                      discount: 0,
                    },
                    totals: { lineTotal: totals.totalAmount },
                    status: "APPROVED",
                  });
                  setGlobalPreviewOpen(false);
                  setTimeout(() => window.print(), 300);
                }}
                className="px-3 py-2 bg-indigo-600 text-white rounded text-xs sm:text-sm"
              >
                Cetak
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FaArrowBackIconFallback() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" className="text-slate-700">
      <path
        fill="currentColor"
        d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
      />
    </svg>
  );
}
