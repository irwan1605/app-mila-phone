// ============================================================
// CardPenjualanToko.jsx — FINAL FIX (TOKO MUNCUL 100%)
// Tahap 1 → Tahap 2 → Tahap 3
// ============================================================

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import FormUserSection from "./FormUserSection";
import FormItemSection from "./FormItemSection";
import FormPaymentSection from "./FormPaymentSection";

import {
  listenUsers,
  listenMasterToko,
  addTransaksi,
  lockImeiAtomic,
  unlockImei,
  updateStockAtomic,
  listenPenjualan,
} from "../../../services/FirebaseService";

import ExportExcelButton from "../../../components/ExportExcelButton";
import logoUrl from "../../../assets/logoMMT.png";

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

  /* ================= MASTER DATA ================= */
  const [users, setUsers] = useState([]);
  const [masterToko, setMasterToko] = useState([]);
  const [penjualanList, setPenjualanList] = useState([]);

  /* 🔥 FIX UTAMA — NORMALISASI MASTER TOKO */
  useEffect(() => {
    const unsubUsers = listenUsers((rows) =>
      setUsers(Array.isArray(rows) ? rows : [])
    );

    const unsubToko = listenMasterToko((rows) => {
      /**
       * rows dari Firebase berbentuk OBJECT:
       * { "-Nx1": {...}, "-Nx2": {...} }
       */
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

 /* ================= TAHAP 1 ================= */
 const today = new Date().toISOString().slice(0, 10);

 const [userForm, setUserForm] = useState({
   tanggalPembelian: today,
   noFaktur: "",
   namaPelanggan: "",
   idPelanggan: "",
   noTelepon: "",
   namaToko: "",
   namaSales: "",
   salesTitipan: "",
 });

  /* 🔒 AUTO SET TOKO UNTUK PIC TOKO */
  useEffect(() => {
    if (!isPicToko || !userLogin?.tokoId || !masterToko.length) return;

    const toko = masterToko.find(
      (t) => String(t.id) === String(userLogin.tokoId)
    );

    if (toko && userForm.namaToko !== toko.namaToko) {
      setUserForm((p) => ({
        ...p,
        namaToko: toko.namaToko,
      }));
    }
  }, [isPicToko, userLogin, masterToko, userForm.namaToko]);

 /* AUTO FAKTUR */
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

  const tahap1Complete = Boolean(
    userForm.namaPelanggan &&
      userForm.idPelanggan &&
      userForm.noTelepon &&
      userForm.namaSales &&
      userForm.salesTitipan &&
      userForm.namaToko
  );

  /* ================= TAHAP 2 ================= */
  const [items, setItems] = useState([]);
  const safeItems = useMemo(() => (Array.isArray(items) ? items : []), [items]);

  const tahap2Complete = useMemo(() => {
    if (!safeItems.length) return false;
    return safeItems.every((it) =>
      it.isImei
        ? Array.isArray(it.imeiList) && it.imeiList.length > 0
        : Number(it.qty || 0) > 0
    );
  }, [safeItems]);

  /* ================= TOTAL ================= */
  const totals = useMemo(() => {
    let total = 0;
    safeItems.forEach((it) => {
      total += Number(it.hargaUnit || 0) * Number(it.qty || 0);
    });
    return { totalItems: safeItems.length, totalAmount: total };
  }, [safeItems]);

  /* ================= TAHAP 3 ================= */
  const [paymentForm, setPaymentForm] = useState({
    kategoriBayar: "",
    status: "LUNAS",
    paymentMethod: "",
    mdrPersen: 0,
    nominalMdr: 0,
    dpUser: 0,
    dpTalangan: 0,
    dpMerchant: 0,
    voucher: 0,
    tenor: "",
  });

  const tahap3Complete = Boolean(paymentForm.kategoriBayar);

  /* ================= SAVE ================= */
  const handleSave = async () => {
    try {
      for (const it of safeItems) {
        if (it.isImei) {
          for (const im of it.imeiList) {
            await lockImeiAtomic(im, {
              invoice: userForm.noFaktur,
              toko: userForm.namaToko,
            });
          }
        }
        await updateStockAtomic(userForm.namaToko, it.sku, -it.qty);
      }

      await addTransaksi({
        invoice: userForm.noFaktur,
        toko: userForm.namaToko,
        user: userForm,
        items: safeItems,
        payment: paymentForm,
        totalBarang: totals.totalAmount,
        PAYMENT_METODE: "PENJUALAN",
        STATUS: "APPROVED",
        createdAt: Date.now(),
      });

      alert("✅ Transaksi berhasil");
      navigate(-1);
    } catch (e) {
      for (const it of safeItems) {
        if (it.isImei) {
          for (const im of it.imeiList) await unlockImei(im);
        }
      }
      alert("❌ Gagal simpan transaksi");
    }
  };

  /* ================= RENDER ================= */
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">PENJUALAN</h1>

      <div className="flex justify-end">
        <ExportExcelButton transaksi={penjualanList} />
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
        <div className={`bg-white rounded-2xl shadow-lg p-5 ${!tahap1Complete && "opacity-50"}`}>
          <h2 className="font-bold mb-2">📦 INPUT BARANG — TAHAP 2</h2>
          <FormItemSection
            value={items}
            onChange={setItems}
            tokoLogin={userForm.namaToko}
            disabled={!tahap1Complete}
          />
        </div>

        {/* TAHAP 3 */}
        <div className={`bg-white rounded-2xl shadow-lg p-5 ${!tahap2Complete && "opacity-50"}`}>
          <h2 className="font-bold mb-2">💳 PEMBAYARAN — TAHAP 3</h2>
          <FormPaymentSection
            value={paymentForm}
            onChange={setPaymentForm}
            disabled={!tahap2Complete}
            grandTotal={totals.totalAmount}
          />
        </div>
      </div>

      <div className="flex justify-between items-center">
        <strong>{formatRupiah(totals.totalAmount)}</strong>
        <button
          disabled={!tahap3Complete}
          onClick={handleSave}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          SIMPAN
        </button>
      </div>

      {/* PREVIEW */}
      <div ref={previewRef} className="border p-4 mt-6 bg-white">
        <img src={logoUrl} alt="logo" className="h-10 mb-2" />
        <p>No Invoice: {userForm.noFaktur}</p>
        <p>Nama Pelanggan: {userForm.namaPelanggan}</p>
        <p>Sales: {userForm.namaSales}</p>

        <table className="w-full mt-3 border text-sm">
          <thead>
            <tr>
              <th>Barang</th>
              <th>IMEI</th>
              <th>Qty</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {safeItems.map((i, idx) => (
              <tr key={idx}>
                <td>{i.namaBarang}</td>
                <td>{(i.imeiList || []).join(", ")}</td>
                <td>{i.qty}</td>
                <td>{formatRupiah(i.hargaUnit * i.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-4 text-right font-bold">
          {formatRupiah(totals.totalAmount)}
        </div>

        <p className="mt-6 text-center text-sm">
          Terima kasih telah berbelanja di tempat kami
        </p>

        <div className="flex justify-between mt-8 text-sm">
          <div>
            Pelanggan
            <br />
            <br />
            {userForm.namaPelanggan}
          </div>
          <div>
            Hormat Kami
            <br />
            <br />
            {userForm.namaSales}
          </div>
        </div>
      </div>
    </div>
  );
}
