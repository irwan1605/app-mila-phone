// ============================================================
// CardPenjualanToko.jsx — FINAL FIX 100% (STABIL)
// SINGLE SOURCE OF TRUTH FORM
// ============================================================

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";

import FormUserSection from "./FormUserSection";
import FormItemSection from "./FormItemSection";
import FormPaymentSection from "./FormPaymentSection";

import TablePenjualan from "../../table/TablePenjualan";
import ExportExcelButton from "../../../components/ExportExcelButton";
import CetakInvoicePenjualan from "../../Print/CetakInvoicePenjualan";
import { useLocation } from "react-router-dom";

import {
  listenPenjualan,
  addPenjualan,
  kurangiStokToko,
  listenStockAll,
  kurangiStokImei,
  ensureImeiInInventory,
  unlockImeiRealtime,
  logImeiAudit,
  saveTransaksiPenjualan,
  kurangiStokSetelahPenjualan,
  cekImeiSudahTerjual,
  lockImeiRealtime,
  addTransaksi,
} from "../../../services/FirebaseService";

// ================= UTIL =================
const genInvoice = () =>
  `INV-${new Date()
    .toISOString()
    .slice(0, 10)
    .replaceAll("-", "")}-${Math.floor(Math.random() * 10000)}`;

// ================= COMPONENT =================
export default function CardPenjualanToko() {
  const navigate = useNavigate();

  const previewRef = useRef(null);

  // ================= USER LOGIN =================
  const userLogin = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("userLogin")) || {};
    } catch {
      return {};
    }
  }, []);

  // ================= STATE =================
  const [formUser, setFormUser] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    noFaktur: genInvoice(),
    namaPelanggan: "",
    idPelanggan: "",
    noTlpPelanggan: "",
    namaTokoId: "",
    namaToko: "",
    namaSales: "",
    salesTitipan: "",
  });

  const [items, setItems] = useState([]);
  const [payment, setPayment] = useState({});
  const [penjualanList, setPenjualanList] = useState([]);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);

  const [printData, setPrintData] = useState(null);
  const [stockRealtime, setStockRealtime] = useState({});
  const location = useLocation();
  const [listBarang, setListBarang] = useState([]);

  useEffect(() => {
    if (!location.state?.fastSale) return;

    const d = location.state.imeiData;

    if (!d?.imei) return;

    setItems([
      {
        id: Date.now(),
        kategoriBarang: d.kategoriBarang,
        namaBrand: d.namaBrand,
        namaBarang: d.namaBarang,
        imei: d.imei,
        imeiList: [d.imei],
        qty: 1,

        isImei: true,

        hargaMap: d.hargaMap || {},
        skemaHarga: "srp",
        hargaAktif: Number(d.hargaMap?.srp || 0),
      },
    ]);
  }, [location.state]);

  useEffect(() => {
    const unsub = listenStockAll((data) => {
      setStockRealtime(data || {});
    });
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    if (!formUser.namaToko) return;

    const sync = async () => {
      for (const item of items) {
        if (item.isImei && item.imeiList?.length) {
          await ensureImeiInInventory({
            tokoNama: formUser.namaToko,
            imei: item.imeiList[0],
          });
        }
      }
    };

    sync();
  }, [items, formUser.namaToko]);

  // ================= LISTEN TABLE =================
  useEffect(() => {
    const unsub = listenPenjualan((rows) =>
      setPenjualanList(Array.isArray(rows) ? rows : [])
    );
    return () => unsub && unsub();
  }, []);

  // ================= TOKO AKTIF =================
  const tokoAktifId = useMemo(() => {
    return userLogin?.tokoId || formUser.namaTokoId || null;
  }, [userLogin, formUser.namaTokoId]);

  useEffect(() => {
    const unlockAll = async () => {
      for (const item of items) {
        if (item.isImei) {
          for (const im of item.imeiList || []) {
            await unlockImeiRealtime(im, userLogin?.email || "unknown");
          }
        }
      }
    };

    window.addEventListener("beforeunload", unlockAll);

    return () => {
      unlockAll();
      window.removeEventListener("beforeunload", unlockAll);
    };
  }, [items]);

  const handlePreview = () => {
    const draftTransaksi = {
      invoice: "PREVIEW",
      toko: formUser.namaToko,
      user: {
        namaSales: formUser.namaSales,
        namaPelanggan: formUser.namaPelanggan,
        idPelanggan : formUser.idPelanggan ,
        noTlpPelanggan: formUser.noTlpPelanggan,
      },
      items: items.map((it) => ({
        ...it,
        hargaUnit: it.hargaAktif || 0,
      })),
      payment: payment,
    };

    setPreviewData(draftTransaksi);
    setShowPreview(true);
  };

  // ================= CEK DUPLIKASI IMEI DI FORM =================
  const hasDuplicateImeiInForm = () => {
    const allImei = items
      .filter((i) => i.isImei)
      .flatMap((i) => i.imeiList || [])
      .map((x) => String(x).trim());

    return new Set(allImei).size !== allImei.length;
  };

  // ================= VALIDASI =================
  const validate = () => {
    if (!normalizeTokoId(tokoAktifId)) {
      alert("❌ Penjualan gagal: Toko belum dipilih");
      return false;
    }

    if (!formUser.namaPelanggan) {
      alert("❌ Nama pelanggan wajib diisi");
      return false;
    }

    if (!items.length) {
      alert("❌ Minimal 1 barang harus diinput");
      return false;
    }

    // 🔥 CEK DUPLIKASI IMEI DI FORM
    if (hasDuplicateImeiInForm()) {
      alert(
        "❌ IMEI DUPLIKAT!\nTidak boleh ada IMEI yang sama dalam 1 transaksi"
      );
      return false;
    }

    for (const i of items) {
      if (!i.namaBarang) {
        alert("❌ Nama barang belum lengkap");
        return false;
      }
      if (Number(i.qty || 0) <= 0) {
        alert(`❌ QTY tidak valid (${i.namaBarang})`);
        return false;
      }
    }

    return true;
  };

  const tokoLogin = formUser?.namaToko;

  const imeiValidList = useMemo(() => {
    if (!penjualanList || !formUser.namaToko) return [];

    return penjualanList
      .filter(
        (trx) =>
          trx.NAMA_TOKO === formUser.namaToko &&
          trx.IMEI &&
          trx.STATUS === "Approved"
      )
      .map((trx) => String(trx.IMEI).trim());
  }, [penjualanList, formUser.namaToko]);

  const validatePayment = () => {
    if (!payment || !payment.grandTotal) {
      alert("❌ Pembayaran belum lengkap");
      return false;
    }

    // CASH
    if (!payment.splitPayment && payment.paymentMethod === "CASH") {
      if ((payment.uangDibayar || 0) < payment.grandTotal) {
        alert("❌ Uang dibayarkan kurang");
        return false;
      }
    }

    // SPLIT PAYMENT
    if (payment.splitPayment) {
      const totalSplit = payment.splitPayment.reduce(
        (s, p) => s + Number(p.nominal || 0),
        0
      );

      if (totalSplit < payment.grandTotal) {
        alert("❌ Total split payment kurang");
        return false;
      }
    }

    return true;
  };

  const normalizeTokoId = (t) => {
    if (!t) return "";
    if (typeof t === "string") return t;
    if (typeof t === "number") return String(t);
    if (typeof t === "object") {
      return String(t.id || t.tokoId || t.nama || t.namaToko || "");
    }
    return String(t);
  };

  // ================= VALIDASI TAHAP 1 =================
  const isTahap1Valid = useMemo(() => {
    return (
      formUser.tanggal &&
      formUser.noFaktur &&
      formUser.namaPelanggan &&
      formUser.idPelanggan &&
      formUser.noTlpPelanggan &&
      formUser.namaTokoId &&
      formUser.namaSales
    );
  }, [formUser]);

  const barangList = listBarang || [];

  const handleSubmitPenjualan = useCallback(async () => {
    if (loading || submitting) return;
    if (!validate()) return;
  
    const sisa = Number(payment?.sisaBayar || 0);
    if (sisa > 0) {
      alert("❌ Pembayaran belum lengkap");
      return;
    }

  console.log("PAYMENT:", payment);

    const tokoIdFix = normalizeTokoId(tokoAktifId);

    if (!tokoIdFix || tokoIdFix === "[object Object]") {
      alert("❌ ID TOKO INVALID\nSilahkan logout & login ulang");
      return;
    }

    const imeiLocked = [];
    const stokRollback = [];

    try {
      setSubmitting(true);

      /* =================================================
         1️⃣ VALIDASI & LOCK IMEI
      ================================================= */
      for (const item of items) {
        const qty = Number(item.qty || 0);
        const imei = item.isImei ? item.imeiList?.[0] : null;

        if (item.isImei) {
          if (!imei) throw new Error(`IMEI belum dipilih (${item.namaBarang})`);

          // 🔥 CEK DARI FIREBASE (SERVICE)
          const sold = await cekImeiSudahTerjual(imei);
          if (sold) throw new Error(`IMEI ${imei} sudah pernah terjual`);

          // 🔥 CEK DARI DATA TABLE YANG SUDAH ADA (DOUBLE SAFETY)
          const sudahAdaDiTable = penjualanList.some(
            (trx) =>
              Array.isArray(trx.items) &&
              trx.items.some(
                (it) =>
                  Array.isArray(it.imeiList) &&
                  it.imeiList.some(
                    (im) => String(im).trim() === String(imei).trim()
                  )
              )
          );

          if (sudahAdaDiTable) {
            throw new Error(`IMEI ${imei} sudah pernah terjual`);
          }

          await lockImeiRealtime(
            imei,
            formUser.namaToko,
            userLogin?.email || "unknown"
          );

          imeiLocked.push(imei);
        } else {
          // 🔥 NON IMEI (ACCESSORIES, BATERAI, DLL)
          if (qty <= 0) throw new Error(`QTY tidak valid (${item.namaBarang})`);
          // ❌ JANGAN CEK SKU LAGI
        }
      }

      /* =================================================
         2️⃣ BENTUK TRANSAKSI
      ================================================= */
      const transaksi = {
        id: Date.now(), // 🔥 ID LOCAL UNTUK TABLE
        invoice: formUser.noFaktur,
        tanggal: formUser.tanggal,
        toko: formUser.namaToko,
        tokoId: tokoIdFix,

        user: {
          namaPelanggan: formUser.namaPelanggan,
          idPelanggan : formUser.idPelanggan ,
          noTlpPelanggan: formUser.noTlpPelanggan,
          storeHead: formUser.storeHead,
          namaSales: formUser.namaSales,
          salesHandle: formUser.salesHandle,
        },

        payment: { ...payment },
        statusPembayaran: "OK",
        createdAt: Date.now(),

        items: items.map((item) => {
          const masterBarang = barangList.find(
            (b) =>
              String(b.namaBarang || "").trim() ===
              String(item.namaBarang || "").trim()
          );

          return {
            kategoriBarang: item.kategoriBarang,
            namaBrand: item.namaBrand,
            namaBarang: item.namaBarang,

            qty: Number(item.qty || 0),
            imeiList: item.isImei ? item.imeiList : [],

            skemaHarga: item.skemaHarga,
            hargaAktif: Number(item.hargaAktif || 0),
          };
        }),
      };

      /* =================================================
         3️⃣ SIMPAN TRANSAKSI KE FIREBASE
      ================================================= */
      const key = await addPenjualan(tokoIdFix, transaksi);
      if (!key) throw new Error("Gagal menyimpan transaksi");

      await saveTransaksiPenjualan(transaksi);

      /* =================================================
   🔥 3C — CATAT TRANSAKSI STOK (PENJUALAN)
================================================= */
      for (const item of items) {
        const payload = {
          TANGGAL_TRANSAKSI: formUser.tanggal,
          NO_INVOICE: formUser.noFaktur,
          NAMA_TOKO: formUser.namaToko,
          NAMA_SUPPLIER: "-", // penjualan
          NAMA_BRAND: item.namaBrand,
          NAMA_BARANG: item.namaBarang,
          QTY: item.isImei ? 1 : Number(item.qty),
          IMEI: item.isImei ? item.imeiList?.[0] : "",
          NOMOR_UNIK: item.isImei
            ? item.imeiList?.[0]
            : `${item.namaBrand}|${item.namaBarang}`,

          PAYMENT_METODE: "PENJUALAN",
          STATUS: "Approved",
          KETERANGAN: "AUTO FROM PENJUALAN",
        };

        await addTransaksi(tokoIdFix, payload);
      }

      /* =================================================
         🔥 3B — LANGSUNG MASUK KE TABLE (REALTIME)
      ================================================= */
      setPenjualanList((prev) => [
        {
          ...transaksi,
          id: key,
        },
        ...prev,
      ]);

      /* =================================================
         4️⃣ POTONG STOK
      ================================================= */
      await kurangiStokSetelahPenjualan({
        toko: formUser.namaToko,
        items,
      });

      items.forEach((item) => {
        if (!item.isImei) {
          stokRollback.push({
            sku: item.sku,
            qty: Number(item.qty),
          });
        }
      });

      /* =================================================
         5️⃣ AUDIT IMEI
      ================================================= */
      for (const imei of imeiLocked) {
        try {
          await logImeiAudit({
            imei,
            aksi: "SALE",
            toko: formUser.namaToko,
            tokoId: tokoIdFix,
            invoice: formUser.noFaktur,
            user: userLogin?.email || "",
          });
        } catch {}
      }

      alert("✅ PENJUALAN BERHASIL & MASUK TABEL");

      /* =================================================
         6️⃣ RESET
      ================================================= */
      setItems([]);
      setPayment({});
      setFormUser((p) => ({
        ...p,
        noFaktur: genInvoice(),
        namaPelanggan: "",
        idPelanggan: "",
        noTlpPelanggan: "",
      }));
    } catch (e) {
      console.error(e);

      /* =================================================
         ROLLBACK
      ================================================= */
      for (const imei of imeiLocked) {
        try {
          await unlockImeiRealtime(imei, userLogin?.email || "unknown");
        } catch {}
      }

      for (const s of stokRollback) {
        try {
          await kurangiStokToko({
            tokoId: tokoIdFix,
            sku: s.sku,
            qty: -Math.abs(s.qty),
          });
        } catch {}
      }

      alert("❌ Penjualan gagal: " + e.message);
    } finally {
      setSubmitting(false);
    }
  }, [items, formUser, payment, tokoAktifId, loading, submitting, userLogin]);

  // ================= VALIDASI TAHAP 2 =================
  const isTahap2Valid = useMemo(() => {
    if (!Array.isArray(items) || items.length === 0) return false;

    return items.every((item) => {
      if (!item.namaBarang) return false;

      // IMEI wajib kalau barang IMEI
      if (item.isImei && (!item.imeiList || item.imeiList.length === 0))
        return false;

      // QTY wajib
      if (!item.qty || item.qty <= 0) return false;

      // 🔥 HARGA:
      // - IMEI → wajib > 0
      // - NON IMEI (ACCESSORIES) → BOLEH 0
      if (item.isImei && (!item.hargaAktif || item.hargaAktif <= 0))
        return false;

      return true;
    });
  }, [items]);

  // ================= TOTAL =================
  const totalPenjualan = useMemo(() => {
    return items.reduce((sum, item) => sum + item.qty * item.hargaAktif, 0);
  }, [items]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">PENJUALAN</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-lg p-5">
          <FormUserSection value={formUser} onChange={setFormUser} />
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-5">
          <h2 className="font-bold mb-2">TAHAP 2 - 📦 INPUT BARANG</h2>
          <FormItemSection
            value={items}
            onChange={setItems}
            tokoLogin={formUser.namaToko}
            allowManual={true}
            tahap1Valid={isTahap1Valid} // ⬅️ WAJIB
            stockRealtime={stockRealtime}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-5">
          <h2 className="font-bold mb-2"> TAHAP 3 - 💳 PEMBAYARAN</h2>
          <FormPaymentSection
            disabled={!isTahap2Valid}
            totalBarang={totalPenjualan}
            value={payment}
            onChange={setPayment}
          />

          <div className="flex gap-3 mt-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePreview}
                className="px-4 py-2 bg-blue-500 text-white rounded"
              >
                👁 Preview
              </button>

              <button
                onClick={handleSubmitPenjualan}
                className="px-4 py-2 bg-green-600 text-white rounded"
              >
                💾 Submit Penjualan
              </button>
            </div>
          </div>
        </div>
      </div>

      {showPreview && previewData && (
        <div className="fixed inset-0 bg-black/40 z-40 flex justify-center items-center">
          <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-auto">
            <CetakInvoicePenjualan
              transaksi={previewData}
              onClose={() => setShowPreview(false)}
              mode="preview"
            />
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-lg p-5">
        <div className="flex justify-between items-center mb-3">
          <TablePenjualan data={penjualanList} />
        </div>
      </div>
    </div>
  );
}
