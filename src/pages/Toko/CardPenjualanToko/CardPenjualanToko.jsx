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

  const [printData, setPrintData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [stockRealtime, setStockRealtime] = useState({});
  const location = useLocation();

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
      bundlingItems: d.bundling || [],
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

  // ================= VALIDASI =================
  const validate = () => {
    if (!tokoAktifId) {
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

  const handleSubmitPenjualan = useCallback(async () => {
    if (loading || submitting) return;
    if (!validate()) return;
    if (!validatePayment()) return;

    const imeiLocked = [];
    const stokNonImeiReduced = [];

    try {
      setSubmitting(true);

      // =================================================
      // 1️⃣ VALIDASI & LOCK IMEI (TANPA KURANGI STOK DULU)
      // =================================================
      for (const item of items) {
        const qty = Number(item.qty || 0);
        const imei = item.isImei ? item.imeiList?.[0] : null;

        if (item.isImei) {
          if (!imei) {
            throw new Error(`IMEI belum dipilih (${item.namaBarang})`);
          }

          // VALIDASI DARI STATE SAJA (SUDAH LOCK SEBELUMNYA)
          if (item.isImei) {
            if (!imei) {
              throw new Error(`IMEI belum dipilih (${item.namaBarang})`);
            }
          
            // ✅ VALIDASI STATE SAJA (SUDAH DI LOCK)
            if (!item.imeiList || !item.imeiList.includes(imei)) {
              throw new Error(`IMEI tidak valid (${imei})`);
            }
          
            imeiLocked.push(imei);
          }
          
        } else {
          if (!item.sku) {
            throw new Error(`SKU tidak ditemukan (${item.namaBarang})`);
          }
          if (qty <= 0) {
            throw new Error(`QTY tidak valid (${item.namaBarang})`);
          }
        }
      }

      // =================================================
      // 2️⃣ KURANGI STOK (SETELAH SEMUA VALID)
      // =================================================
      for (const item of items) {
        const qty = Number(item.qty || 0);
        const imei = item.isImei ? item.imeiList?.[0] : null;

        if (item.isImei) {
          await kurangiStokImei({
            tokoNama: String(formUser.namaToko).trim().toUpperCase(),

            imei,
          });
        } else {
          await kurangiStokToko({
            tokoId: tokoAktifId,
            sku: item.sku,
            qty,
          });

          // simpan untuk rollback non IMEI
          stokNonImeiReduced.push({
            sku: item.sku,
            qty,
          });
        }
      }

      // =================================================
      // 3️⃣ BENTUK TRANSAKSI (SINGLE SOURCE OF TRUTH)
      // =================================================
      const transaksi = {
        invoice: formUser.noFaktur,
        tanggal: formUser.tanggal,
        toko: formUser.namaToko,
        tokoId: tokoAktifId,

        user: {
          namaPelanggan: formUser.namaPelanggan,
          noTlpPelanggan: formUser.noTlpPelanggan,
          namaSales: formUser.namaSales,
        },

        payment: {
          ...payment,
        },

        statusPembayaran: "OK",
        createdAt: Date.now(),

        items: items.map((item) => ({
          kategoriBarang: item.kategoriBarang,
          namaBrand: item.namaBrand,
          namaBarang: item.namaBarang,
          bundlingItems: item.bundlingItems || [],
          imeiList: item.isImei ? item.imeiList : [],
          qty: Number(item.qty || 0),
          hargaUnit: Number(item.hargaAktif || 0),
          total: Number(item.qty || 0) * Number(item.hargaAktif || 0),
        })),
      };

      // =================================================
      // 4️⃣ SIMPAN TRANSAKSI (ONCE)
      // =================================================
      await addPenjualan(tokoAktifId, transaksi);

      // =================================================
      // 5️⃣ AUDIT LOG IMEI (SETELAH TRANSAKSI SAH)
      // =================================================
      for (const imei of imeiLocked) {
        try {
          await logImeiAudit({
            imei,
            aksi: "SALE",
            toko: formUser.namaToko,
            tokoId: tokoAktifId,
            invoice: formUser.noFaktur,
            user: userLogin?.email || "",
          });
        } catch (e) {
          console.warn("Audit IMEI gagal:", imei);
        }
      }

      alert("✅ Penjualan berhasil");

      // =================================================
      // 6️⃣ RESET FORM
      // =================================================
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

      // =================================================
      // 🔥 ROLLBACK IMEI
      // =================================================
      for (const imei of imeiLocked) {
        try {
          await unlockImeiRealtime(imei, formUser.namaToko);
        } catch {}
      }

      // =================================================
      // 🔥 ROLLBACK STOK NON IMEI (OPSIONAL TAPI AMAN)
      // =================================================
      for (const s of stokNonImeiReduced) {
        try {
          await kurangiStokToko({
            tokoId: tokoAktifId,
            sku: s.sku,
            qty: -Math.abs(s.qty), // restore
          });
        } catch {}
      }

      alert("❌ Penjualan gagal: " + e.message);
    } finally {
      setSubmitting(false);
    }
  }, [items, formUser, payment, tokoAktifId, loading, submitting, userLogin]);

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

  // ================= VALIDASI TAHAP 2 =================
  const isTahap2Valid = useMemo(() => {
    if (!Array.isArray(items) || items.length === 0) return false;

    return items.every((item) => {
      if (!item.namaBarang) return false;
      if (item.isImei && (!item.imeiList || item.imeiList.length === 0))
        return false;
      if (!item.qty || item.qty <= 0) return false;
      if (!item.hargaAktif || item.hargaAktif <= 0) return false;
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
            <button
              onClick={handleSubmitPenjualan}
              disabled={submitting || !isTahap2Valid || !payment?.grandTotal}
              className="px-4 py-2 rounded bg-green-600 text-white"
            >
              {submitting ? "Menyimpan..." : "SUBMIT PENJUALAN"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-5">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold">📊 TABEL PENJUALAN</h2>
          <ExportExcelButton transaksiType="penjualan" />
        </div>

        <TablePenjualan data={penjualanList} />
      </div>

      {showPreview && printData && (
        <CetakInvoicePenjualan transaksi={printData} ref={previewRef} />
      )}
    </div>
  );
}
