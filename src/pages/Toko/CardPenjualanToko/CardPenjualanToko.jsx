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

export default function CardPenjualanToko() {
  const { tokoId } = useParams(); // /toko/:tokoId/penjualan
  const navigate = useNavigate();

  const [tokoName, setTokoName] = useState(`Toko ${tokoId || ""}`);

  useEffect(() => {
    if (!tokoId) return;
  
    (async () => {
      try {
        const name = await getTokoName?.(tokoId);
  
        const finalName =
          name ||
          tokoId
            .replace(/-/g, " ")
            .toUpperCase();
  
        setTokoName(finalName);
  
        // ✅ PENTING: Sinkron ke form
        setUserForm((prev) => ({
          ...prev,
          namaToko: finalName,
        }));
      } catch (e) {
        console.error("Gagal ambil nama toko:", e);
  
        const fallback = tokoId
          .replace(/-/g, " ")
          .toUpperCase();
  
        setTokoName(fallback);
        setUserForm((prev) => ({
          ...prev,
          namaToko: fallback,
        }));
      }
    })();
  }, [tokoId]);
  

  // ========== STATE FORM GLOBAL ==========
  const [userForm, setUserForm] = useState({
    tanggalPembelian: new Date().toISOString().slice(0, 10),
    noFaktur: "",
    idPelanggan: "",
    noTelepon: "",
    namaToko: tokoName,
    namaSales: "",
    salesTitipan: "",
  });

  const [paymentForm, setPaymentForm] = useState({
    kategoriBayar: "",
    paymentMethod: "",
    mdr: "",
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
  const [cartRows, setCartRows] = useState([]);

  // modal cari IMEI
  const [imeiModalOpen, setImeiModalOpen] = useState(false);

  // preview invoice untuk 1 row
  const [previewData, setPreviewData] = useState(null);
  const previewRef = useRef();

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

  // total item & amount untuk footer
  const totals = useMemo(() => {
    const totalItems = cartRows.reduce(
      (s, r) => s + Number(r.item?.qty || 0),
      0
    );
    const totalAmount = cartRows.reduce(
      (s, r) => s + Number(r.totals?.lineTotal || 0),
      0
    );
    return { totalItems, totalAmount };
  }, [cartRows]);

  // ========== FORM → TABEL (TAMBAH BARIS) ==========

  function handleAddRowFromForm(item) {
    const parsed = parseImeiLines(item.imei || "");

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

    const invoice = userForm.noFaktur?.trim() || generateInvoiceNo();
    const lineCalc = calcLineTotal(item);

    const newRow = {
      id: Date.now() + Math.random(),
      tanggal: userForm.tanggalPembelian,
      invoice,
      tokoId,
      tokoName,
      user: { ...userForm },
      payment: { ...paymentForm },
      item: { ...item },
      totals: lineCalc,
      status: "DRAFT",
    };

    setCartRows((p) => [...p, newRow]);
  }

  function handleRemoveCartRow(rowId) {
    setCartRows((p) => p.filter((r) => r.id !== rowId));
  }

  function handleEditCartRow(rowId, updated) {
    setCartRows((p) => p.map((r) => (r.id === rowId ? { ...r, ...updated } : r)));
  }

  // ========== APPROVE (SIMPAN KE FIREBASE) ==========

  function handleApproveRow(rowId) {
    const row = cartRows.find((r) => r.id === rowId);
    if (!row) return;

    (async () => {
      try {
        setSaving(true);
        const imeiList = parseImeiLines(row.item.imei || "");
        let finalImeis = imeiList.length
          ? imeiList
          : Array(row.item.qty).fill("");

        if (finalImeis.length !== Number(row.item.qty)) {
          if (finalImeis.length === 1) {
            finalImeis = Array(row.item.qty).fill(finalImeis[0]);
          } else {
            alert("Jumlah IMEI tidak sesuai dengan QTY.");
            setSaving(false);
            return;
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

            KATEGORI_BAYAR: row.payment.kategoriBayar || "",
            PAYMENT_METHOD: row.payment.paymentMethod || "",
            MDR: row.payment.mdr || "",
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
            STATUS: "LUNAS",
          };

          if (typeof addTransaksi === "function") {
            await addTransaksi(tokoId, payload);
          } else if (typeof addPenjualan === "function") {
            await addPenjualan(payload);
          }
        }

        setCartRows((p) =>
          p.map((r) =>
            r.id === rowId ? { ...r, status: "APPROVED" } : r
          )
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

  async function handleBulkApprove() {
    for (const r of cartRows.filter((c) => c.status !== "APPROVED")) {
      await handleApproveRow(r.id);
    }
  }

  // ========== VOID (KEMBALIKAN STOK) ==========

  function handleVoidRow(rowId) {
    const row = cartRows.find((r) => r.id === rowId);
    if (!row) return;

    if (!window.confirm("Yakin VOID dan kembalikan stok barang?")) return;

    (async () => {
      try {
        // update transaksi di Firebase (status VOID)
        if (typeof updateTransaksi === "function") {
          await updateTransaksi(tokoId, row.firebaseId || row.id, {
            STATUS: "VOID",
          });
        }

        // kembalikan stok ke inventory
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

  // ========== CALLBACK DARI MODAL IMEI SEARCH ==========

  const handleAddFromImeiSearch = (selectedItems) => {
    const mapped = selectedItems.map((it) => {
      const calc = calcLineTotal(it);
      return {
        id: Date.now() + Math.random(),
        tanggal: userForm.tanggalPembelian,
        invoice: userForm.noFaktur?.trim() || generateInvoiceNo(),
        tokoId,
        tokoName,
        user: { ...userForm },
        payment: { ...paymentForm },
        item: { ...it },
        totals: calc,
        status: "DRAFT",
      };
    });
    setCartRows((p) => [...p, ...mapped]);
    setImeiModalOpen(false);
  };

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
              <FaSearch /> Cari IMEI
            </button>

            <button
              onClick={handleExportExcel}
              className="px-3 py-2 rounded-lg bg-emerald-600 text-white flex items-center gap-2 text-xs sm:text-sm"
            >
              Export Excel
            </button>

            <button
              onClick={handleBulkApprove}
              className="px-3 py-2 rounded-lg bg-indigo-600 text-white flex items-center gap-2 text-xs sm:text-sm"
            >
              <FaSave /> Simpan Semua
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

        {/* TABEL HASIL TRANSAKSI */}
        <div className="bg-white rounded-2xl shadow p-4">
          <SalesResultTable
            rows={cartRows}
            onRemove={handleRemoveCartRow}
            onEdit={handleEditCartRow}
            onApprove={handleApproveRow}
            onVoid={handleVoidRow}
            onPreview={handlePreviewInvoice}
            totals={totals}
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
                    setInvoiceForm({ ...invoiceForm, [k]: e.target.value })
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
                    },
                    item: {
                      namaBarang:
                        cartRows[0]?.item?.namaBarang || "Item Penjualan",
                      imei: cartRows
                        .map((r) => r.item?.imei || "")
                        .join("\n"),
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
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      className="text-slate-700"
    >
      <path
        fill="currentColor"
        d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"
      />
    </svg>
  );
}
