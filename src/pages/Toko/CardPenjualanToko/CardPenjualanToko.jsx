// ============================================================
// CARDPENJUALANTOKO.JSX — FINAL FIX + STOCK TYPE A + BUNDLING OPSI 2
// ============================================================

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useNavigate, useParams } from "react-router-dom";

import FormUserSection from "./FormUserSection";
import FormPaymentSection from "./FormPaymentSection";
import FormItemSection from "./FormItemSection";
import IMEISearchModal from "./IMEISearchModal";
import NamaBarangSearchModal from "./NamaBarangSearchModal";

import {
  getTokoName,
  listenUsers,
  addTransaksi,
  updateTransaksi, // ✅ TAMBAH
  reduceStock,
  addStock,
  returnStock, // ✅ TAMBAH
  logStockActivity,
  checkImeiAvailable,
  lockImei,
  lockImeiAtomic,
  updateStockAtomic,
  addAuditLog,
  updateAuditLog,
  unlockImei,
  rollbackStock,
} from "../../../services/FirebaseService";

// FIX IMPORT (SESUAI FILE KAMU)
import { db } from "../../../services/FirebaseInit";

import { ref, onValue, get } from "firebase/database";

import logoUrl from "../../../assets/logoMMT.png";

// UI PRESET
const glassCard =
  "bg-white/60 backdrop-blur-md border border-white/30 rounded-2xl shadow-md p-4";

const formatRupiah = (num) =>
  Number(num || 0).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });

// ============================================================
// LISTEN STOCK TYPE A
// ============================================================

const listenStockByCategory = (tokoName, kategori, callback) => {
  const path = `stock/${tokoName}`;
  return onValue(ref(db, path), (snap) => {
    const data = snap.val() || {};

    const filtered = Object.values(data).filter(
      (item) =>
        item?.kategori?.toUpperCase() === kategori?.toUpperCase() &&
        item?.qty > 0
    );

    callback(filtered);
  });
};

const listenStockByName = (tokoName, namaBarang, callback) => {
  const path = `stock/${tokoName}`;
  return onValue(ref(db, path), (snap) => {
    const data = snap.val() || {};

    const filtered = Object.values(data).filter(
      (item) =>
        item?.namaBarang?.toUpperCase().includes(namaBarang.toUpperCase()) &&
        item?.qty > 0
    );

    callback(filtered);
  });
};

// ============================================================
// GET BUNDLING MODEL OPSI 2
// ============================================================

const getBundlingItems = async (namaBarang) => {
  const snap = await get(ref(db, `bundling/${namaBarang}`));
  const data = snap.val() || {};

  return Object.keys(data).map((key) => ({
    sku: data[key].sku,
    nama: data[key].nama,
    harga: data[key].harga ?? 0,
    bolehDijualTerpisah: data[key].bolehDijualTerpisah ?? false,
  }));
};

// ============================================================
// HITUNG TOTAL SATU ITEM
// ============================================================

const calcLineTotal = (item) => {
  const price = Number(item.hargaUnit || 0);
  const disc = Number(item.discount || 0);
  const subtotal = price;
  const discValue = (disc / 100) * subtotal;
  const lineTotal = subtotal - discValue;

  return { subtotal, discValue, lineTotal };
};

// ============================================================
// COMPONENT UTAMA
// ============================================================

export default function CardPenjualanToko() {
  const { tokoId } = useParams();
  const navigate = useNavigate();

  const [tokoName, setTokoName] = useState(
    (tokoId || "").replace(/-/g, " ").toUpperCase()
  );

  // ============================================================
  // STATE — TAHAP 1
  // ============================================================

  const [userForm, setUserForm] = useState({
    tanggalPembelian: new Date().toISOString().slice(0, 10),
    noFaktur: "",
    idPelanggan: "",
    noTelepon: "",
    namaToko: tokoName,
    namaSales: "",
    salesTitipan: "",
    namaPelanggan: "",
  });

  // ============================================================
  // STATE — TAHAP 3
  // ============================================================

  const [paymentForm, setPaymentForm] = useState({
    kategoriBayar: "",
    paymentMethod: "",
    mdr: "",
    mpProteck: "",
    dpUser: "",
    tenor: "",
    status: "PIUTANG",
  });

  // ============================================================
  // STATE — TAHAP 2 (ITEM)
  // ============================================================

  const [items, setItems] = useState([
    {
      id: Date.now(),
      sku: "",
      kategoriBarang: "",
      namaBrand: "",
      namaBarang: "",
      imei: "",
      qty: 1,
      hargaUnit: 0,
      discount: 0,
    },
  ]);

  // MODAL STATE
  const [imeiModalOpen, setImeiModalOpen] = useState(false);
  const [namaBarangModalOpen, setNamaBarangModalOpen] = useState(false);

  // REALTIME STOCK STATE
  const [stockKategori, setStockKategori] = useState([]);
  const [stockNamaBarang, setStockNamaBarang] = useState([]);
  const [activeItemIndex, setActiveItemIndex] = useState(null);

  // PREVIEW
  const previewRef = useRef(null);
  const [previewData, setPreviewData] = useState(null);

  // ============================================================
  // USERS LIST
  // ============================================================

  const [users, setUsers] = useState([]);

  useEffect(() => {
    const unsub = listenUsers?.((list) => {
      setUsers(Array.isArray(list) ? list : []);
    });

    return () => unsub && unsub();
  }, []);

  // ============================================================
  // GET TOKO NAME
  // ============================================================

  useEffect(() => {
    if (!tokoId) return;

    (async () => {
      const nm = await getTokoName(tokoId);
      setTokoName(nm || tokoName);
      setUserForm((p) => ({ ...p, namaToko: nm || tokoName }));
    })();
  }, [tokoId]);

  // ============================================================
  // AUTO FAKTUR
  // ============================================================

  const generateAutoFaktur = useCallback(() => {
    const t = new Date();
    const prefix = `${t.getFullYear().toString().slice(-2)}${String(
      t.getMonth() + 1
    ).padStart(2, "0")}${String(t.getDate()).padStart(2, "0")}`;

    const key = `FAKTUR_${prefix}`;
    let next = Number(localStorage.getItem(key) || 0) + 1;

    localStorage.setItem(key, next);

    return `${prefix}${String(next).padStart(3, "0")}`;
  }, []);

  useEffect(() => {
    setUserForm((p) => ({
      ...p,
      noFaktur: generateAutoFaktur(),
    }));
  }, [generateAutoFaktur]);

  // ============================================================
  // VALIDASI
  // ============================================================

  const tahap1Complete = useMemo(
    () =>
      userForm.namaPelanggan &&
      userForm.idPelanggan &&
      userForm.noTelepon &&
      userForm.namaSales &&
      userForm.salesTitipan,
    [userForm]
  );

  const tahap2Complete = useMemo(() => {
    return (
      items.length > 0 &&
      items.every((it) => {
        if (
          ["MOTOR LISTRIK", "SEPEDA LISTRIK", "HANDPHONE"].includes(
            it.kategoriBarang
          )
        ) {
          return it.imeiList && it.imeiList.length > 0;
        }
        return it.qty > 0;
      })
    );
  }, [items]);

  const tahap3Complete = useMemo(() => {
    if (!paymentForm.kategoriBayar) return false;
    if (paymentForm.kategoriBayar === "PIUTANG")
      return paymentForm.paymentMethod && paymentForm.mdr;
    return true;
  }, [paymentForm]);

  // ============================================================
  // REALTIME STOCK LISTENER — KATEGORI
  // ============================================================

  useEffect(() => {
    if (activeItemIndex === null) return;

    const cur = items[activeItemIndex];
    if (!cur?.kategoriBarang) return;

    const unsub = listenStockByCategory(
      tokoName,
      cur.kategoriBarang,
      setStockKategori
    );

    return () => unsub && unsub();
  }, [activeItemIndex, items[activeItemIndex]?.kategoriBarang]);

  // ============================================================
  // REALTIME STOCK LISTENER — NAMA BARANG
  // ============================================================

  useEffect(() => {
    if (activeItemIndex === null) return;

    const cur = items[activeItemIndex];
    if (!cur?.namaBarang) return;

    const unsub = listenStockByName(
      tokoName,
      cur.namaBarang,
      setStockNamaBarang
    );
    return () => unsub && unsub();
  }, [activeItemIndex, items[activeItemIndex]?.namaBarang]);

  // ============================================================
  // UPDATE ITEM SETELAH PILIH NAMA BARANG
  // ============================================================

  useEffect(() => {
    if (stockNamaBarang.length === 0 || activeItemIndex === null) return;

    const updated = [...items];
    const target = updated[activeItemIndex];
    const p = stockNamaBarang[0];

    target.sku = p.sku;
    target.namaBrand = p.brand;
    target.hargaUnit = p.harga;
    target.imei = p.imei || "";

    setItems(updated);
  }, [stockNamaBarang]);

  // ============================================================
  // HITUNG TOTAL SEMUA ITEM
  // ============================================================

  const totals = useMemo(() => {
    let totalAmount = 0;

    items.forEach((it) => {
      const calc = calcLineTotal(it);
      totalAmount += calc.lineTotal;
    });

    return {
      totalItems: items.length,
      totalAmount,
    };
  }, [items]);

  // ============================================================
  // HANDLE ADD ITEM DARI MODAL + BUNDLING OPSI 2
  // ============================================================

  const handleAddFromSearch = async (selected) => {
    if (!selected || selected.length === 0) {
      setImeiModalOpen(false);
      setNamaBarangModalOpen(false);
      return;
    }

    const updated = [...items];
    const item = selected[0];

    updated[activeItemIndex] = {
      ...updated[activeItemIndex],
      sku: item.sku,
      imei: item.imei || "",
      namaBarang: item.namaBarang,
      namaBrand: item.brand,
      kategoriBarang: item.kategori,
      hargaUnit: item.harga || 0,
      qty: 1,
    };

    setItems(updated);

    // BUNDLING OPSI 2
    const bundling = await getBundlingItems(item.namaBarang);

    if (bundling.length > 0) {
      const expanded = [...updated];

      bundling.forEach((b) => {
        expanded.push({
          id: Date.now() + Math.random(),
          sku: b.sku,
          namaBarang: b.nama,
          namaBrand: b.nama.split(" ")[0] ?? "",
          kategoriBarang: "BUNDLING",
          imei: "",
          qty: 1,
          hargaUnit: b.bolehDijualTerpisah ? b.harga : 0,
          discount: 0,
        });
      });

      setItems(expanded);
    }

    setImeiModalOpen(false);
    setNamaBarangModalOpen(false);
  };

  const normalizeItemsBeforeSave = (items) => {
    const normalized = [];

    items.forEach((it) => {
      // KATEGORI IMEI → PECAH PER IMEI
      if (
        ["MOTOR LISTRIK", "SEPEDA LISTRIK", "HANDPHONE"].includes(
          it.kategoriBarang
        ) &&
        Array.isArray(it.imeiList) &&
        it.imeiList.length > 0
      ) {
        it.imeiList.forEach((imei) => {
          normalized.push({
            ...it,
            imei,
            imeiList: [],
            qty: 1,
          });
        });
      } else {
        // ACCESSORIES / NON IMEI
        normalized.push({
          ...it,
          imei: "",
          imeiList: [],
        });
      }
    });

    return normalized;
  };

  const handleEditTransaksi = async (oldData, newData) => {
    try {
      // 1️⃣ BALIKKAN STOK LAMA
      for (const it of oldData.items) {
        await returnStock(oldData.tokoName, it.sku, it.qty || 1);
      }

      // 2️⃣ SIMPAN DATA BARU
      await updateTransaksi(oldData.id, newData);

      // 3️⃣ POTONG STOK BARU
      for (const it of newData.items) {
        await reduceStock(newData.tokoName, it.sku, it.qty || 1);
      }

      alert("✅ Transaksi berhasil di-edit");
    } catch (err) {
      console.error(err);
      alert("❌ Gagal edit transaksi");
    }
  };

  const handleVoidTransaksi = async (transaksi) => {
    if (!window.confirm("Yakin VOID transaksi ini?")) return;

    try {
      for (const itm of transaksi.items) {
        await returnStock(transaksi.tokoName, itm.sku, itm.qty || 1);

        if (Array.isArray(itm.bundling)) {
          for (const b of itm.bundling) {
            await returnStock(transaksi.tokoName, b.sku, b.qty);
          }
        }
      }

      await updateTransaksi(transaksi.id, {
        status: "VOID",
        voidAt: Date.now(),
      });

      alert("✅ Transaksi berhasil di-VOID & stok dikembalikan");
    } catch (err) {
      console.error(err);
      alert("❌ Gagal VOID transaksi");
    }
  };

  // ============================================================
  // PREVIEW HANDLER
  // ============================================================

  const handlePreview = () => {
    setPreviewData({
      tanggal: userForm.tanggalPembelian,
      invoice: userForm.noFaktur,
      tokoName,
      user: { ...userForm },
      payment: { ...paymentForm },
      items: [...items],
      totalAmount: totals.totalAmount,
    });

    setTimeout(() => {
      previewRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 150);
  };

  const finalItems = normalizeItemsBeforeSave(items);

  const calcTotalItem = (item) => {
    const totalUtama = Number(item.hargaUnit || 0) * Number(item.qty || 1);

    const totalBundling = (item.bundling || []).reduce(
      (sum, b) => sum + Number(b.harga || 0) * Number(b.qty || 0),
      0
    );

    return totalUtama + totalBundling;
  };

  const grandTotal = finalItems.reduce((sum, it) => sum + calcTotalItem(it), 0);

  const checkIMEIAvailable = async (imei) => {
    const snap = await get(ref(db, `imeiSold/${imei}`));
    return !snap.exists();
  };

  // ============================================================
  // SAVE TRANSAKSI
  // ============================================================

  const handleSaveTransaksi = async () => {
    const auditId = `${Date.now()}-${userForm.noFaktur}`;
  
    const finalItems = normalizeItemsBeforeSave(items);
  
    // ===============================
    // 🧾 INIT AUDIT
    // ===============================
    await addAuditLog(auditId, {
      action: "PENJUALAN",
      invoice: userForm.noFaktur,
      toko: tokoName,
      user: userForm.namaSales,
      status: "PROCESS",
      steps: {
        lockImei: false,
        updateStock: false,
        saveTransaksi: false,
      },
      imeis: finalItems.map((i) => i.imei).filter(Boolean),
      stockChanges: finalItems.map((i) => ({
        sku: i.sku,
        qty: -(i.qty || 1),
      })),
    });
  
    try {
      // ======================================
      // 🔒 STEP 1: LOCK IMEI
      // ======================================
      for (const item of finalItems) {
        if (!item.imei) continue;
  
        await lockImeiAtomic(item.imei, {
          invoice: userForm.noFaktur,
          toko: tokoName,
        });
      }
  
      await updateAuditLog(auditId, {
        "steps.lockImei": true,
      });
  
      // ======================================
      // 🔒 STEP 2: UPDATE STOK
      // ======================================
      for (const item of finalItems) {
        await updateStockAtomic(tokoName, item.sku, -(item.qty || 1));
      }
  
      await updateAuditLog(auditId, {
        "steps.updateStock": true,
      });
  
      // ======================================
      // 💾 STEP 3: SIMPAN TRANSAKSI
      // ======================================
      await addTransaksi({
        invoice: userForm.noFaktur,
        toko: tokoName,
        user: userForm,
        items: finalItems,
        payment: paymentForm,
        totalBarang: totals.totalAmount,
        createdAt: Date.now(),
      });
  
      await updateAuditLog(auditId, {
        status: "SUCCESS",
        "steps.saveTransaksi": true,
      });
  
      alert("✅ Transaksi berhasil disimpan");
  
    } catch (err) {
      console.error("ROLLBACK:", err);
  
      // ===============================
      // 🔄 ROLLBACK
      // ===============================
      for (const item of finalItems) {
        if (item.imei) {
          await unlockImei(item.imei);
        }
        await rollbackStock(tokoName, item.sku, item.qty || 1);
      }
  
      await updateAuditLog(auditId, {
        status: "FAILED",
        error: err.message,
      });
  
      alert(`❌ Transaksi dibatalkan & rollback dilakukan`);
    }
  };
  
  

  

  // ============================================================
  // RENDER START
  // ============================================================

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="h-10 w-10 rounded-lg bg-white/60 border border-white/30 backdrop-blur flex items-center justify-center shadow"
          >
            <FaArrowBackIconFallback />
          </button>

          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Penjualan — {tokoName}
            </h1>
            <p className="text-xs text-slate-500">
              Form Penjualan — Tahap 1 → 2 → 3
            </p>
          </div>

          <div></div>
        </div>

        {/* FORM GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* TAHAP 1 */}
          <div className={`${glassCard} min-h-[260px]`}>
            <FormUserSection
              value={userForm}
              onChange={setUserForm}
              users={users}
              tahap={1}
              tahap1Complete={tahap1Complete}
            />
          </div>

          {/* TAHAP 2 */}
          <div className={`${glassCard} min-h-[260px]`}>
            <FormItemSection
              value={items}
              onChange={setItems}
              disabled={!tahap1Complete}
              tahap={2}
              onSearchIMEI={(index) => {
                setActiveItemIndex(index);
                setImeiModalOpen(true);
              }}
              onSearchNamaBarang={(index) => {
                setActiveItemIndex(index);
                setNamaBarangModalOpen(true);
              }}
              realtimeKategori={stockKategori}
              realtimeNamaBarang={stockNamaBarang}
            />
          </div>

          {/* TAHAP 3 */}
          <div className={`${glassCard} min-h-[260px]`}>
            <FormPaymentSection
              value={paymentForm}
              onChange={setPaymentForm}
              tahap={3}
              disabled={!tahap2Complete}
              tahap3Complete={tahap3Complete}
            />
          </div>
        </div>

        {/* ============================================================
            SUMMARY
        ============================================================ */}

        <div className={`${glassCard} flex flex-col gap-4`}>
          {/* TOTAL */}
          <div className="flex justify-between text-sm text-slate-700">
            <div>
              Total Item: <strong>{totals.totalItems}</strong>
            </div>
            <div>
              Grand Total:{" "}
              <strong className="text-indigo-600">
                {formatRupiah(totals.totalAmount)}
              </strong>
            </div>
          </div>

          {/* DETAIL RINGKAS */}
          <div className="bg-white rounded-xl shadow p-4">
            <h2 className="text-lg font-bold text-slate-700 mb-3">
              Ringkasan Penjualan
            </h2>

            <table className="w-full text-sm border-collapse mb-3">
              <tbody>
                <tr>
                  <td className="border p-2 font-semibold w-48">
                    Nama Pelanggan
                  </td>
                  <td className="border p-2">{userForm.namaPelanggan}</td>
                </tr>
                <tr>
                  <td className="border p-2 font-semibold">ID Pelanggan</td>
                  <td className="border p-2">{userForm.idPelanggan}</td>
                </tr>
                <tr>
                  <td className="border p-2 font-semibold">No Telepon</td>
                  <td className="border p-2">{userForm.noTelepon}</td>
                </tr>
                <tr>
                  <td className="border p-2 font-semibold">Nama Sales</td>
                  <td className="border p-2">{userForm.namaSales}</td>
                </tr>
                <tr>
                  <td className="border p-2 font-semibold">Sales Titipan</td>
                  <td className="border p-2">{userForm.salesTitipan}</td>
                </tr>
                <tr>
                  <td className="border p-2 font-semibold">Kategori Bayar</td>
                  <td className="border p-2">{paymentForm.kategoriBayar}</td>
                </tr>
                <tr>
                  <td className="border p-2 font-semibold">Payment Method</td>
                  <td className="border p-2">{paymentForm.paymentMethod}</td>
                </tr>
                <tr>
                  <td className="border p-2 font-semibold">MDR</td>
                  <td className="border p-2">{paymentForm.mdr}%</td>
                </tr>
                <tr>
                  <td className="border p-2 font-semibold">DP User</td>
                  <td className="border p-2">{paymentForm.dpUser}</td>
                </tr>
                <tr>
                  <td className="border p-2 font-semibold">Tenor</td>
                  <td className="border p-2">{paymentForm.tenor}</td>
                </tr>
              </tbody>
            </table>

            {/* DETAIL BARANG */}
            <h3 className="text-md font-bold mt-4 mb-2 text-slate-700">
              Detail Barang
            </h3>

            <table className="w-full text-sm border-collapse">
              <thead className="bg-slate-50">
                <tr>
                  <th className="border p-2">SKU</th>
                  <th className="border p-2">Kategori</th>
                  <th className="border p-2">Brand</th>
                  <th className="border p-2">Nama Barang</th>
                  <th className="border p-2">IMEI</th>
                  <th className="border p-2">Harga</th>
                  <th className="border p-2">Disc</th>
                  <th className="border p-2">Total</th>
                </tr>
              </thead>

              <tbody>
                {items.map((it, idx) => {
                  const calc = calcLineTotal(it);

                  return (
                    <tr key={idx}>
                      <td className="border p-2">{it.sku}</td>
                      <td className="border p-2">{it.kategoriBarang}</td>
                      <td className="border p-2">{it.namaBrand}</td>
                      <td className="border p-2">{it.namaBarang}</td>
                      <td className="border p-2 whitespace-pre">{it.imei}</td>
                      <td className="border p-2 text-right">
                        {formatRupiah(it.hargaUnit)}
                      </td>
                      <td className="border p-2 text-center">{it.discount}%</td>
                      <td className="border p-2 text-right">
                        {formatRupiah(calc.lineTotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={handlePreview}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm"
              disabled={!tahap3Complete}
            >
              PREVIEW INVOICE
            </button>

            <button
              onClick={handleSaveTransaksi}
              className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm"
              disabled={!tahap3Complete}
            >
              SIMPAN TRANSAKSI
            </button>
          </div>
        </div>

        {/* ============================================================
            PREVIEW INVOICE
        ============================================================ */}

        <div ref={previewRef}>
          {previewData && (
            <div className="bg-white rounded-xl shadow p-4 mt-6 print:p-0">
              {/* HEADER */}
              <div className="flex justify-between items-center mb-4">
                <img src={logoUrl} alt="Logo" className="h-12" />
                <div className="text-right">
                  <h2 className="text-xl font-bold">INVOICE</h2>
                  <p className="text-xs">No Faktur: {previewData.invoice}</p>
                  <p className="text-xs text-slate-500">
                    Tanggal: {previewData.tanggal}
                  </p>
                </div>
              </div>

              {/* CUSTOMER */}
              <div className="border rounded-lg p-3 bg-slate-50 mb-4">
                <p className="text-xs">
                  <strong>Nama:</strong> {previewData.user.namaPelanggan}
                </p>
                <p className="text-xs">
                  <strong>No Telepon:</strong> {previewData.user.noTelepon}
                </p>
                <p className="text-xs">
                  <strong>Sales:</strong> {previewData.user.namaSales}
                </p>
              </div>

              {/* TABLE */}
              <table className="w-full text-xs border-collapse mb-4">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="border p-2">Nama Barang</th>
                    <th className="border p-2">IMEI</th>
                    <th className="border p-2">Harga</th>
                    <th className="border p-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.items.map((it, idx) => {
                    const calc = calcLineTotal(it);

                    return (
                      <tr key={idx}>
                        <td className="border p-2">{it.namaBarang}</td>
                        <td className="border p-2 whitespace-pre">{it.imei}</td>
                        <td className="border p-2 text-right">
                          {formatRupiah(it.hargaUnit)}
                        </td>
                        <td className="border p-2 text-right">
                          {formatRupiah(calc.lineTotal)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* TOTAL */}
              <div className="flex justify-end">
                <div className="border rounded-lg p-3 bg-slate-50 w-64">
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold">Total Pembayaran:</span>
                    <span className="font-bold text-indigo-600">
                      {formatRupiah(previewData.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* ACTION */}
              <div className="flex justify-end gap-3 mt-4 print:hidden">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm"
                >
                  CETAK
                </button>

                <button
                  onClick={() => setPreviewData(null)}
                  className="px-4 py-2 rounded-lg bg-gray-300 text-sm"
                >
                  Tutup
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================
            MODALS
        ============================================================ */}

        {imeiModalOpen && (
          <IMEISearchModal
            onClose={() => setImeiModalOpen(false)}
            onSelect={handleAddFromSearch}
          />
        )}

        {namaBarangModalOpen && (
          <NamaBarangSearchModal
            onClose={() => setNamaBarangModalOpen(false)}
            onSelect={handleAddFromSearch}
          />
        )}
      </div>
    </div>
  );
}

/* ============================================================
   ICON FALLBACK
============================================================ */

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
