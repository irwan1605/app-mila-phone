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

import {
  listenPenjualan,
  addPenjualan,
  kurangiStokToko,
  listenStockAll,
  kurangiStokImei,
  ensureImeiInInventory,
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

  useEffect(() => {
    const unsub = listenStockAll((data) => {
      setStockRealtime(data || {});
    });
    return () => unsub && unsub();
  }, []);

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

  const handleSubmitPenjualan = useCallback(async () => {
    if (loading || submitting) return;
    if (!validate()) return;
  
    try {
      setSubmitting(true);
  
      // ===============================
      // 1️⃣ KURANGI STOK (LOOP ITEM)
      // ===============================
      for (const item of items) {
        const qty = Number(item.qty || 0);
        const imei = item.isImei ? item.imeiList?.[0] : null;
  
        // ❌ VALIDASI IMEI
        if (item.isImei && !imei) {
          throw new Error("IMEI belum dipilih");
        }
  
        if (item.isImei) {
          // 🔥 PASTIKAN IMEI ADA DI INVENTORY
          await ensureImeiInInventory({
            tokoNama: formUser.namaToko,
            imei,
          });
  
          // 🔥 KURANGI STOK IMEI
          await kurangiStokImei({
            tokoNama: formUser.namaToko,
            imei,
          });
        } else {
          // 🔥 KURANGI STOK NON IMEI
          await kurangiStokToko({
            tokoId: tokoAktifId,
            sku: item.sku,
            qty,
          });
        }
      }
  
      // ===============================
      // 2️⃣ BENTUK TRANSAKSI (SATU KALI)
      // ===============================
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
          hargaUnit: Number(item.hargaUnit || 0),
          total:
            Number(item.qty || 0) * Number(item.hargaUnit || 0),
        })),
      };
  
      // ===============================
      // 3️⃣ SIMPAN TRANSAKSI (SEKALI)
      // ===============================
      await addPenjualan(tokoAktifId, transaksi);
  
      alert("✅ Penjualan berhasil");
  
      // ===============================
      // 4️⃣ RESET FORM
      // ===============================
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
      alert("❌ Penjualan gagal: " + e.message);
    } finally {
      setSubmitting(false);
    }
  }, [
    items,
    formUser,
    payment,
    tokoAktifId,
    loading,
    submitting,
  ]);
  

  

  // ================= TOTAL =================
  const totalPenjualan = useMemo(() => {
    return items.reduce(
      (sum, it) => sum + Number(it.qty || 0) * Number(it.hargaUnit || 0),
      0
    );
  }, [items]);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">PENJUALAN</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-lg p-5">
          <FormUserSection value={formUser} onChange={setFormUser} />
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-5">
          <h2 className="font-bold mb-2">📦 INPUT BARANG</h2>
          <FormItemSection
            value={items}
            onChange={setItems}
            tokoLogin={formUser.namaToko}
            allowManual={!!formUser.namaTokoId}
            stockRealtime={stockRealtime}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-5">
          <h2 className="font-bold mb-2">💳 PEMBAYARAN</h2>
          <FormPaymentSection
            value={payment}
            onChange={setPayment}
            totalBarang={totalPenjualan}
          />

          <div className="flex gap-3 mt-4">
            <button
              onClick={handleSubmitPenjualan}
              disabled={submitting}
              className="px-4 py-2 rounded bg-green-600 text-white"
            >
              {submitting ? "Menyimpan..." : "SUBMIT PENJUALAN"}
            </button>

            <button
              onClick={() =>
                navigate("/print/cetak-invoice-penjualan", {
                  state: {
                    transaksi: {
                      invoice: formUser.noFaktur,
                      toko: formUser.namaToko,
                      user: formUser,
                      items,
                      payment,
                      totalBarang: totalPenjualan,
                    },
                  },
                })
              }
              className="px-4 py-2 rounded bg-purple-600 text-white"
            >
              🖨️ Cetak Invoice
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
