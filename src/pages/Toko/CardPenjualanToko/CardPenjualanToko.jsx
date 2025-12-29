// ============================================================
// CardPenjualanToko.jsx — FINAL FIX (TANPA UBAH UI)
// Tahap 1 → Tahap 2 → Tahap 3 + Penjualan Cepat IMEI
// ============================================================

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ref, get, set, update, remove } from "firebase/database";
import { db } from "../../../firebase/FirebaseInit";

import FormUserSection from "./FormUserSection";
import FormItemSection from "./FormItemSection";
import FormPaymentSection from "./FormPaymentSection";

import {
  listenUsers,
  listenMasterToko,
  listenPenjualan,
  addTransaksi,
  updateStockAtomic,
  lockImeiPenjualan,
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

  /* ================= STATE ================= */
  const todayISO = new Date().toISOString().slice(0, 10);

  const [imeiQuick, setImeiQuick] = useState("");
  const [items, setItems] = useState([]);
  const [loadingQuick, setLoadingQuick] = useState(false);



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
  
  

  const [paymentForm, setPaymentForm] = useState({
    metode: "",
    status: "LUNAS",
    kategoriBayar: "",
  });

  const [users, setUsers] = useState([]);
  const [masterToko, setMasterToko] = useState([]);
  const [penjualanList, setPenjualanList] = useState([]);

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

  const tahap3Complete = Boolean(paymentForm.kategoriBayar);

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
        payment: paymentForm,
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
            grandTotal={items.reduce((a, b) => a + (b.total || 0), 0)}
            disabled={!items.length}
          />
        </div>
        <p className="text-xs text-red-500">
          allowManual (tahap1Complete): {String(tahap1Complete)}
        </p>
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
