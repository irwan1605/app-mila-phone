// ============================================================
// CardPenjualanToko.jsx — FINAL FIX (TANPA UBAH UI)
// Tahap 1 → Tahap 2 → Tahap 3 + Penjualan Cepat IMEI
// ============================================================

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ref, get, set, runTransaction, remove } from "firebase/database";
import { db } from "../../../firebase/FirebaseInit";
import { hitungStokBarang } from "../../../utils/stockUtils";

import FormUserSection from "./FormUserSection";
import FormItemSection from "./FormItemSection";
import FormPaymentSection from "./FormPaymentSection";

import TablePenjualan from "../../table/TablePenjualan";
import ExportExcelButton from "../../../components/ExportExcelButton";

import {
  listenUsers,
  listenMasterToko,
  listenPenjualan,
  addTransaksi,
  updateStockAtomic,
  lockImeiPenjualan,
  lockImei,
  unlockImei,
  markImeiSold,
  addPenjualan ,
  kurangiStokToko,
} from "../../../services/FirebaseService";

import CetakInvoicePenjualan from "../../Print/CetakInvoicePenjualan";

const reduceStockSmart = async (toko, skuKey, qty) => {
  const baseRef = ref(db, `stock/${toko}/${skuKey}`);
  const snap = await get(baseRef);

  if (!snap.exists()) {
    throw new Error(`Stok ${toko} tidak ditemukan`);
  }

  const data = snap.val();

  // CASE 1️⃣: langsung qty
  if (typeof data.qty === "number") {
    if (data.qty < qty) throw new Error(`Stok ${toko} tidak mencukupi`);
    await runTransaction(
      ref(db, `stock/${toko}/${skuKey}/qty`),
      (c) => (c || 0) - qty
    );
    return;
  }

  // CASE 2️⃣: varian (HANDPHONE dll)
  const varianKey = Object.keys(data)[0]; // ambil varian pertama
  const current = data[varianKey]?.qty || 0;

  if (current < qty) throw new Error(`Stok ${toko} tidak mencukupi`);

  await runTransaction(
    ref(db, `stock/${toko}/${skuKey}/${varianKey}/qty`),
    (c) => (c || 0) - qty
  );
};

/* ================= UTIL ================= */
const formatRupiah = (n) =>
  Number(n || 0).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });

/* ================= COMPONENT ================= */
export default function CardPenjualanToko() {
  const navigate = useNavigate();
  const previewRef = useRef(null);

  /* ================= USER LOGIN ================= */
  const userLogin = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("userLogin")) || {};
    } catch {
      return {};
    }
  }, []);

  const isSuperAdmin =
    userLogin?.role === "superadmin" || userLogin?.role === "admin";

  const isPicToko =
    typeof userLogin?.role === "string" &&
    userLogin.role.startsWith("pic_toko");

  /* ================= STATE ================= */
  const todayISO = new Date().toISOString().slice(0, 10);

  const [imeiQuick, setImeiQuick] = useState("");
  const [items, setItems] = useState([]);
  const [loadingQuick, setLoadingQuick] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const allImeis = items.flatMap((it) => it.imeiList || []);

  const [payment, setPayment] = useState({});
  

  const [userForm, setUserForm] = useState({
    tanggal: todayISO,
    noFaktur: "",
    namaPelanggan: "",
    idPelanggan: "",
    noTlpPelanggan: "",
    namaToko: "",
    namaSales: "",
    salesTitipan: "",
  });

  const tahap1Complete = useMemo(() => {
    return Boolean(
      userForm.tanggal &&
        userForm.noFaktur &&
        userForm.namaPelanggan &&
        userForm.idPelanggan &&
        userForm.noTlpPelanggan &&
        userForm.namaToko &&
        userForm.namaSales &&
        userForm.salesTitipan
    );
  }, [userForm]);


  const [users, setUsers] = useState([]);
  const [masterToko, setMasterToko] = useState([]);
  const [penjualanList, setPenjualanList] = useState([]);
  const [printData, setPrintData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const tokoLogin = userForm.namaToko;

  const user = JSON.parse(localStorage.getItem("user")) || null;

  /* ================= VALIDASI TAHAP ================= */

  /* ================= MASTER DATA ================= */
  useEffect(() => {
    const unsubUsers = listenUsers((rows) =>
      setUsers(Array.isArray(rows) ? rows : [])
    );

    const unsubToko = listenMasterToko((rows) => {
      if (!rows || typeof rows !== "object") {
        setMasterToko([]);
        return;
      }

      const parsed = Object.entries(rows).map(([id, val]) => ({
        id,
        namaToko: val?.namaToko?.toUpperCase() || "",
        alamat: val?.alamat || "",
      }));

      setMasterToko(parsed);
    });

    const unsubPenjualan = listenPenjualan((rows) =>
      setPenjualanList(Array.isArray(rows) ? rows : [])
    );

    return () => {
      unsubUsers && unsubUsers();
      unsubToko && unsubToko();
      unsubPenjualan && unsubPenjualan();
    };
  }, []);

  // =====================
  // AUTO AKTIFKAN TAHAP 2
  // =====================
  useEffect(() => {
    if (!tahap1Complete) return;

    if (items.length === 0) {
      setItems([
        {
          id: Date.now(),
          kategoriBarang: "",
          namaBrand: "",
          namaBarang: "",
          imeiList: [],
          qty: 0,
          hargaUnit: 0,
          skemaHarga: "SRP",
          namaBundling: "",
          hargaBundling: 0,
          qtyBundling: 0,
          isImei: false,
        },
      ]);
    }
  }, [tahap1Complete, items.length]);

  /* ================= AUTO UNLOCK IMEI ================= */
  useEffect(() => {
    return () => {
      items.forEach((it) => {
        if (it?.isImei && it?.imeiList?.[0]) {
          remove(ref(db, `penjualan_imei/${it.imeiList[0]}`));
        }
      });
    };
  }, [items]);

  /* ================= AUTO TOKO (PIC TOKO) ================= */
  useEffect(() => {
    if (!isPicToko || !userLogin?.tokoId || !masterToko.length) return;

    const toko = masterToko.find(
      (t) => String(t.id) === String(userLogin.tokoId)
    );

    if (!userForm.namaToko) {
      throw new Error("Nama toko belum dipilih (Tahap 1)");
    }

    if (toko && userForm.namaToko !== toko.namaToko) {
      setUserForm((p) => ({ ...p, namaToko: toko.namaToko }));
    }
  }, [isPicToko, userLogin, masterToko, userForm.namaToko]);

  /* ================= AUTO FAKTUR ================= */
  useEffect(() => {
    const d = new Date();
    const prefix = `${String(d.getFullYear()).slice(2)}${String(
      d.getMonth() + 1
    ).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

    const key = `INV_${prefix}`;
    const next = Number(localStorage.getItem(key) || 0) + 1;
    localStorage.setItem(key, next);

    setUserForm((p) => ({
      ...p,
      noFaktur: `${prefix}${String(next).padStart(3, "0")}`,
    }));
  }, []);

  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  const tahap2Complete = useMemo(() => {
    if (!safeItems.length) return false;
    return safeItems.every((it) =>
      it.isImei
        ? Array.isArray(it.imeiList) && it.imeiList.length > 0
        : Number(it.qty || 0) > 0
    );
  }, [safeItems]);

  const totals = useMemo(() => {
    let total = 0;
    safeItems.forEach((it) => {
      total += Number(it.hargaUnit || 0) * Number(it.qty || 0);
    });
    return { totalItems: safeItems.length, totalAmount: total };
  }, [safeItems]);



  /* ================= PENJUALAN CEPAT IMEI ================= */
  const handleQuickImei = async () => {
    const imei = imeiQuick.trim();
    if (!imei || !userForm.namaToko) return;

    setLoadingQuick(true);
    try {
      const soldRef = ref(db, `penjualan_imei/${imei}`);
      const soldSnap = await get(soldRef);

      if (soldSnap.exists() && soldSnap.val()?.status === "SOLD") {
        alert("❌ IMEI sudah terjual");
        return;
      }

      let found = null;
      const trxSnap = await get(ref(db, "toko"));
      trxSnap.forEach((tokoSnap) => {
        tokoSnap.child("transaksi").forEach((trx) => {
          const v = trx.val();
          if (v?.IMEI === imei && v?.STATUS === "Approved") found = v;
        });
      });

      setItems((prev) => [
        ...prev,
        {
          id: Date.now(),
          kategoriBarang: found?.KATEGORI_BRAND || "",
          namaBrand: found?.NAMA_BRAND || "",
          namaBarang: found?.NAMA_BARANG || "",
          imeiList: [imei],
          qty: 1,
          hargaUnit: Number(found?.HARGA_UNIT || 0),
          subtotal: Number(found?.HARGA_UNIT || 0),
          skemaHarga: "SRP",
          isImei: true,
        },
      ]);

      await set(soldRef, {
        imei,
        status: "LOCKED",
        toko: userForm.namaToko,
        lockedAt: Date.now(),
      });

      setImeiQuick("");
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingQuick(false);
    }
  };

  /* ================= SAVE FINAL ================= */
  const handleSave = async () => {
    try {
      for (const it of safeItems) {
        if (it.isImei) {
          for (const im of it.imeiList) {
            await lockImeiPenjualan(im, {
              toko: userForm.namaToko,
              invoice: userForm.noFaktur,
            });
          }
        }

        await updateStockAtomic(
          userForm.namaToko,
          `${it.namaBrand}_${it.namaBarang}`,
          -Number(it.qty)
        );
      }

      

      await addTransaksi({
        invoice: userForm.noFaktur,
        toko: userForm.namaToko,
        user: userForm,
        items: safeItems,
        payment: payment,
        STATUS: "APPROVED",
        totalBarang: totals.totalAmount,
        createdAt: Date.now(),
      });

      alert("✅ Penjualan berhasil");
      navigate(-1);
    } catch (e) {
      console.error(e);
      alert("❌ Gagal simpan transaksi");
    }
  };

  const handlePreviewInvoice = () => {
    setPrintData({
      form,
      items: sanitizeItemsForFirebase(items),
      payment: setPayment,
      total: setPayment.grandTotal,
    });
    setShowPreview(true);
  };
  // ================= VALIDASI SUBMIT (HANYA TAHAP 3) =================
  const canSubmit = useMemo(() => {
    if (!tahap1Complete) return false;
    if (!tahap2Complete) return false;
  
    // ✅ CASH / LUNAS
    if (payment.status === "LUNAS") return true;
  
    // ✅ PIUTANG / KREDIT
    if (payment.status === "PIUTANG") {
      return (
        payment.paymentMethod === "KREDIT" &&
        !!payment.namaMdr &&
        Number(payment.persenMdr) > 0 &&
        !!payment.tenor &&
        Number(payment.dpUser) > 0
      );
    }
  
    return false;
  }, [tahap1Complete, tahap2Complete, payment]);
  

  const form = useMemo(
    () => ({
      tanggal: userForm?.tanggal || "",
      noFaktur: userForm?.noFaktur || "",
      namaPelanggan: userForm?.namaPelanggan || "",
      idPelanggan: userForm?.idPelanggan || "",
      noTlpPelanggan: userForm?.noTlpPelanggan || "",
      namaToko: userForm?.namaToko || "",
      namaSales: userForm?.namaSales || "",
      salesTitipan: userForm?.salesTitipan || "",
    }),
    [userForm]
  );

  const sanitizeItemsForFirebase = (items = []) => {
    return items.map((it, idx) => ({
      id: it.id || Date.now() + idx,

      kategoriBarang: it.kategoriBarang || "",
      namaBrand: it.namaBrand || "",
      namaBarang: it.namaBarang || "",

      // 🔴 FIX UTAMA (TIDAK BOLEH UNDEFINED)
      sku: it.sku ? String(it.sku) : "",

      imeiList: Array.isArray(it.imeiList) ? it.imeiList : [],

      qty: Number(it.qty || 0),
      skemaHarga: it.skemaHarga || "SRP",

      hargaUnit: Number(it.hargaUnit || 0),
      hargaBundling: Number(it.hargaBundling || 0),
      qtyBundling: Number(it.qtyBundling || 0),

      subtotal:
        Number(it.hargaUnit || 0) * Number(it.qty || 0) +
        Number(it.hargaBundling || 0) * Number(it.qtyBundling || 0),

      isImei: Boolean(it.isImei),
    }));
  };
  
  const handleSubmitPenjualan = async () => {
    if (submitting) return;
  
    try {
      setSubmitting(true);
  
      /* =====================================================
         1️⃣ VALIDASI AWAL (HARD STOP)
      ===================================================== */
      if (!items || !items.length) {
        throw new Error("Barang belum diisi");
      }
  
      if (!tokoLogin) {
        throw new Error("Toko login tidak ditemukan");
      }
  
      const invoice = form.noFaktur || `INV-${Date.now()}`;
  
      // HITUNG TOTAL PENJUALAN (FINAL)
      const totalPenjualan = items.reduce(
        (sum, it) => sum + Number(it.qty || 0) * Number(it.hargaUnit || 0),
        0
      );
  
      if (totalPenjualan <= 0) {
        throw new Error("Total penjualan tidak valid");
      }
  
      // PAYMENT FINAL (AMAN UNTUK CASH & KREDIT)
      const paymentFinal = {
        ...payment,
        nominalMdr:
          payment.paymentMethod === "KREDIT"
            ? Number(payment.nominalMdr || 0)
            : 0,
        cicilan:
          payment.paymentMethod === "KREDIT"
            ? Number(payment.cicilan || 0)
            : 0,
        tenor:
          payment.paymentMethod === "KREDIT" ? payment.tenor || "" : "",
        grandTotal: Number(payment.grandTotal || totalPenjualan),
      };
  
      /* =====================================================
         2️⃣ LOCK IMEI + KURANGI STOK (ATOMIC STEP)
      ===================================================== */
      const lockedImeis = [];
  
      for (const item of items) {
        if (!item.sku) {
          throw new Error(`SKU tidak ditemukan (${item.namaBarang})`);
        }
  
        // 🔒 LOCK IMEI (JIKA ADA)
        if (item.isImei) {
          for (const imei of item.imeiList || []) {
            await lockImei({
              imei,
              toko: tokoLogin,
              invoice,
            });
            lockedImeis.push(imei);
          }
        }
  
        // 📉 KURANGI STOK TOKO
        await kurangiStokToko({
          toko: tokoLogin,
          sku: item.sku,
          qty: Number(item.qty || 0),
          imeiList: item.isImei ? item.imeiList : [],
        });
      }

      
  
      /* =====================================================
         3️⃣ SIMPAN PENJUALAN (LAST STEP)
      ===================================================== */
      await addPenjualan({
        invoice,
        toko: userForm.namaToko,
        tanggal: userForm.tanggal,
        pelanggan: {
          nama: userForm.namaPelanggan,
          telp: userForm.noTlpPelanggan,
        },
        sales: userForm.namaSales,
      
        items: sanitizeItemsForFirebase(items),
      
        payment: {
          status: payment.status,
          paymentMethod: payment.paymentMethod,
          namaMdr: payment.namaMdr || "",
          nominalMdr: payment.nominalMdr || 0,
          tenor: payment.tenor || "",
          cicilan: payment.cicilan || 0,
          grandTotal: payment.grandTotal,
        },
      
        STATUS: "APPROVED",
        createdAt: Date.now(),
      });
  
      /* =====================================================
         4️⃣ COMMIT IMEI → SOLD
      ===================================================== */
      for (const imei of lockedImeis) {
        await markImeiSold({
          imei,
          toko: tokoLogin,
          invoice,
        });
      }
  
      alert("✅ Penjualan berhasil");
  
    } catch (err) {
      console.error("❌ PENJUALAN ERROR:", err);
  
      /* =====================================================
         5️⃣ ROLLBACK (ANTI DATA RUSAK)
      ===================================================== */
      try {
        for (const it of items) {
          if (it.isImei) {
            for (const imei of it.imeiList || []) {
              await unlockImei(imei);
            }
          }
        }
      } catch (rollbackErr) {
        console.error("⚠️ ROLLBACK IMEI GAGAL:", rollbackErr);
      }
  
      alert(err.message || "❌ Penjualan gagal");
    } finally {
      setSubmitting(false);
    }
  };
  

  const totalQty = useMemo(
    () => items.reduce((s, it) => s + Number(it.qty || 0), 0),
    [items]
  );
  
  
  const totalPenjualan = useMemo(() => {
    return items.reduce(
      (sum, it) =>
        sum +
        Number(it.hargaUnit || 0) * Number(it.qty || 0) +
        Number(it.hargaBundling || 0) * Number(it.qtyBundling || 0),
      0
    );
  }, [items]);
  
  

  const totalBarang = items.reduce(
    (sum, it) => sum + Number(it.qty || 0),
    0
  );
  

  const totalItemsAmount = useMemo(() => {
    return items.reduce((sum, it) => {
      const itemTotal =
        Number(it.hargaUnit || 0) * Number(it.qty || 0) +
        Number(it.hargaBundling || 0) * Number(it.qtyBundling || 0);
      return sum + itemTotal;
    }, 0);
  }, [items]);

  /* ================= RENDER ================= */
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">PENJUALAN</h1>

      {/* ================= PENJUALAN CEPAT VIA IMEI ================= */}
      <div className="bg-indigo-600 rounded-2xl p-5 text-black shadow-xl">
        <h2 className="text-lg font-bold mb-2">
          ⚡ PENJUALAN CEPAT (SCAN / CARI IMEI)
        </h2>

        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={imeiQuick}
            onChange={(e) => setImeiQuick(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleQuickImei()}
            placeholder="Scan / Ketik IMEI lalu Enter"
            className="input input-bordered w-full"
          />

          <button
            disabled={!imeiQuick || loadingQuick}
            onClick={handleQuickImei}
            className="bg-black/30 hover:bg-black/50 px-6 py-3 rounded-xl font-bold"
          >
            {loadingQuick ? "⏳" : "CARI"}
          </button>
        </div>

        <p className="text-sm mt-2 opacity-90">
          👉 Cukup scan IMEI → Barang otomatis masuk TAHAP 2 👉 Tinggal isi
          TAHAP 1 & PEMBAYARAN
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* TAHAP 1 */}
        <div className="bg-white rounded-2xl shadow-lg p-5">
          <FormUserSection
            value={userForm}
            onChange={setUserForm}
            users={users}
            masterToko={masterToko}
            isSuperAdmin={isSuperAdmin}
            isPicToko={isPicToko}
            userLogin={userLogin}
          />
        </div>

        {/* TAHAP 2 */}
        <div
          className={`bg-white rounded-2xl shadow-lg p-5 ${
            !tahap1Complete && "opacity-50"
          }`}
        >
          <h2 className="font-bold mb-2">📦 INPUT BARANG — TAHAP 2</h2>
          <FormItemSection
            value={items}
            onChange={setItems}
            tokoLogin={userForm.namaToko}
            allowManual={tahap1Complete}
            allowQuickImei={true}
          />
        </div>

        {/* TAHAP 3 */}
        <div
          className={`bg-white rounded-2xl shadow-lg p-5 ${
            !tahap2Complete && "opacity-50"
          }`}
        >
          <h2 className="font-bold mb-2">💳 PEMBAYARAN — TAHAP 3</h2>
          <FormPaymentSection
           value={payment}
           onChange={setPayment}
           totalBarang={totalPenjualan}   // ⬅️ WAJIB INI
           disabled={!tahap2Complete}
          />

          <div className="flex justify-between items-center mt-4 gap-3">
            {/* PREVIEW INVOICE */}
            <button
              type="button"
              onClick={handlePreviewInvoice}
              className="px-4 py-2 rounded bg-blue-600 text-white"
            >
              👁️ Preview Invoice
            </button>

            <button
              type="button"
              disabled={!items.length}
              onClick={() =>
                navigate("/print/cetak-invoice-penjualan", {
                  state: {
                    transaksi: {
                      invoice: form.noFaktur,
                      toko: form.namaToko,
                      user: userForm,
                      items: sanitizeItemsForFirebase(items),
                      payment: payment,
                      totalBarang: totalItemsAmount,
                    },
                  },
                })
              }
              className="px-4 py-2 rounded bg-purple-600 text-white"
            >
              🖨️ Cetak Invoice
            </button>

            {/* SUBMIT */}
            <button
              type="button"
              disabled={!canSubmit || submitting}
              onClick={handleSubmitPenjualan}
              className={`px-4 py-2 rounded text-white ${
                canSubmit ? "bg-green-600" : "bg-gray-400"
              }`}
            >
              {submitting ? "Menyimpan..." : "SUBMIT PENJUALAN"}
            </button>
          </div>

          <div className=" p-2">
            {showPreview && printData && (
              <CetakInvoicePenjualan transaksi={printData} />
            )}
          </div>
        </div>

        <p className="text-xs text-red-500">
          allowManual (tahap1Complete): {String(tahap1Complete)}
        </p>
      </div>

      {/* ================= TABLE PENJUALAN ================= */}
      <div className="bg-white rounded-2xl shadow-lg p-5 mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-bold">📊 TABEL PENJUALAN</h2>

          {/* TOMBOL EXPORT EXCEL */}
          <ExportExcelButton transaksiType="penjualan" />
        </div>

        <TablePenjualan />
      </div>
    </div>
  );
}
