// ======================================================
// HANDLE REFUND PENJUALAN
// REALTIME REFUND
// ======================================================

import {
  updateTransaksiPenjualan,
  addTransaksi,
} from "../../../services/FirebaseService";
import { set } from "firebase/database";

import { ref, get, update, remove } from "firebase/database";

import { db } from "../../../services/FirebaseInit";
import {
  validateRefund,
} from "./validateRefund";

// ======================================================
// NORMALIZE
// ======================================================

const normalize = (v) =>
  String(v || "")
    .trim()
    .toUpperCase();

const normalizeImei = (v) =>
  String(v || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

    console.log("VALIDATE REFUND =", validateRefund);
console.log("TYPE =", typeof validateRefund);

// ======================================================
// HANDLE REFUND
// ======================================================

export const handleRefundPenjualan = async ({
  row,
  rows,
  userLogin,

  setDeletedRows,
  setInstantRefund,
  setLocalHiddenRefund,
  setRefundLoading,
}) => {
  try {
    // =========================================
    // VALIDASI
    // =========================================
    let validateResult;

    try {
      validateResult = await validateRefund({
        row,
        rows,
        userLogin,
      });
    } catch (err) {
      console.error(
        "VALIDATE REFUND ERROR:",
        err?.message,
        err
      );
    
      throw err;
    }

    const trx = validateResult?.trx;

    // =========================================
    // 🔥 REFUND READY OVERRIDE
    // TANPA MERUBAH LOGIC LAMA
    // =========================================
    const refundReady =
      trx?.READY_RESALE === true ||
      trx?.statusRefund === "READY_RESALE" ||
      trx?.IS_REFUND === true ||
      normalize(trx?.LAST_ACTION) === "REFUND" ||
      normalize(trx?.PAYMENT_METODE) === "REFUND";

    if (refundReady) {
      console.log("♻️ REFUND READY OVERRIDE", trx?.invoice);

      trx.refundLocked = false;
      trx.refundProcessed = false;
    }

    if (!trx) {
      throw new Error("Transaksi tidak ditemukan");
    }

    if (!trx) {
      throw new Error("Transaksi tidak ditemukan");
    }

    // =========================================
    // BLOCK DOUBLE REFUND
    // =========================================
    const alreadyRefund =
      trx.refundProcessed === true ||
      trx.IS_REFUND === true ||
      trx.deleted === true ||
      trx.deletedFromPenjualan === true ||
      trx.refundLocked === true ||
      normalize(trx.STATUS) === "REFUND" ||
      normalize(trx.PAYMENT_METODE) === "REFUND" ||
      normalize(trx.statusPembayaran) === "REFUND";

    // =========================================
    // 🔥 REFUND READY BYPASS
    // TANPA MENGUBAH LOGIC LAMA
    // =========================================
    let finalAlreadyRefund = alreadyRefund;

    if (trx?.READY_RESALE === true || trx?.statusRefund === "READY_RESALE") {
      console.log("♻️ BYPASS REFUND LOCK", trx?.invoice);

      finalAlreadyRefund = false;
    }

    if (finalAlreadyRefund) {
      console.log("⛔ REFUND SUDAH DIPROSES");

      return false;
    }

    // =========================================
    // UI REALTIME HIDE
    // =========================================
    setInstantRefund((prev) => ({
      ...prev,
      [row.invoice]: true,
    }));

    setLocalHiddenRefund((prev) => ({
      ...prev,
      [row.invoice]: true,
    }));

    setRefundLoading(row.invoice);

    // =========================================
    // 🔥 SAVE BLACKLIST
    // =========================================
    try {
      const oldBlacklist = JSON.parse(
        localStorage.getItem("refundBlacklist") || "[]"
      );

      const newBlacklist = [
        ...new Set([...oldBlacklist, normalize(row.invoice)]),
      ];

      localStorage.setItem("refundBlacklist", JSON.stringify(newBlacklist));
    } catch (e) {
      console.log("BLACKLIST ERROR");
    }

    // =========================================
    // 🔥 GLOBAL REALTIME REFUND SYNC
    // =========================================

    await set(ref(db, `refundRealtime/${normalize(row.invoice)}`), {
      invoice: normalize(row.invoice),

      deleted: true,

      refundedAt: Date.now(),

      toko: row.toko || "",

      by: userLogin?.username || "SYSTEM",
    });

    // =========================================
    // UPDATE PENJUALAN
    // =========================================
    await updateTransaksiPenjualan(
      trx.trxKey || trx.id,
      {
        STATUS: "REFUND_DELETED",

        statusPembayaran: "REFUND",

        refundProcessed: true,

        IS_REFUND: true,

        refundLocked: true,

        deleted: true,

        deletedFromPenjualan: true,

        HIDE_FROM_PENJUALAN: true,

        PAYMENT_METODE: "REFUND",

        refundedAt: Date.now(),

        refundedBy: userLogin?.username || userLogin?.nama || "SYSTEM",
      },
      userLogin
    );

    // =========================================
    // 🔥 GLOBAL REFUND LOCK
    // FIREBASE REALTIME
    // =========================================
    await update(ref(db, `toko/${row.tokoId}/transaksi/${row.id}`), {
      refundProcessed: true,

      refundLocked: true,

      deleted: true,

      deletedFromPenjualan: true,

      HIDE_FROM_PENJUALAN: true,

      IS_REFUND: true,

      STATUS: "REFUND_DELETED",

      statusPembayaran: "REFUND",

      PAYMENT_METODE: "REFUND",

      refundedAt: Date.now(),

      refundedBy: userLogin?.username || userLogin?.nama || "SYSTEM",
    });

    // =========================================
    // 🔥 HAPUS DATA PENJUALAN ASLI
    // =========================================

    try {
      // ===============================
      // GLOBAL PENJUALAN
      // ===============================
      if (trx?.id) {
        await remove(ref(db, `penjualan/${trx.id}`));

        console.log("✅ REMOVE penjualan/id");
      }

      // ===============================
      // trxKey
      // ===============================
      if (trx?.trxKey) {
        await remove(ref(db, `penjualan/${trx.trxKey}`));

        console.log("✅ REMOVE penjualan/trxKey");
      }

      // ===============================
      // invoice
      // ===============================
      if (trx?.invoice) {
        await remove(ref(db, `penjualanByInvoice/${trx.invoice}`));

        console.log("✅ REMOVE invoice");
      }
    } catch (err) {
      console.log("❌ REMOVE ERROR:", err.message);
    }

    // =========================================
    // 🔥 HAPUS DATA PENJUALAN ASLI
    // =========================================

    try {
      // path global penjualan
      if (trx?.id) {
        await remove(ref(db, `penjualan/${trx.id}`));
      }

      // alt key
      if (trx?.trxKey) {
        await remove(ref(db, `penjualan/${trx.trxKey}`));
      }

      // invoice key
      if (trx?.invoice) {
        await remove(ref(db, `penjualanByInvoice/${trx.invoice}`));
      }

      console.log("✅ DATA PENJUALAN DIHAPUS");
    } catch (err) {
      console.log("⚠️ REMOVE PENJUALAN:", err.message);
    }

    // =========================================
    // 🔥 REMOVE FROM GLOBAL PENJUALAN
    // =========================================
    try {
      if (trx?.id) {
        await remove(ref(db, `penjualan/${trx.id}`));
      }

      if (trx?.trxKey) {
        await remove(ref(db, `penjualan/${trx.trxKey}`));
      }
    } catch (e) {
      console.log("⚠️ penjualan path sudah hilang");
    }

    // =========================================
    // 🔥 HARD DELETE FROM TABLE PENJUALAN
    // =========================================
    try {
      await remove(ref(db, `penjualan/${trx.trxKey || trx.id}`));
    } catch (e) {
      console.log("⚠️ penjualan path tidak ditemukan");
    }

    // =========================================
    // RESTORE STOCK
    // =========================================
    const items = Array.isArray(trx.items) ? trx.items : [];

    for (const item of items) {
      // =====================================
      // IMEI
      // =====================================
      if (Array.isArray(item.imeiList) && item.imeiList.length > 0) {
        for (const imeiRaw of item.imeiList) {
          const imei = normalizeImei(imeiRaw);

          if (!imei) continue;

          // ===============================
          // DETAIL STOCK
          // ===============================
          await update(ref(db, `detail_stock/${imei}`), {
            imei: imeiRaw,

            namaBarang: item.namaBarang || "",

            namaBrand: item.namaBrand || "",

            toko: trx.toko || "",

            status: "AVAILABLE",

            sold: false,

            READY_RESALE: true,

            IS_REFUND: true,

            LAST_ACTION: "REFUND",

            PAYMENT_METODE: "REFUND",

            statusRefund: "READY_RESALE",

            STATUS_STOK: "AVAILABLE",

            STATUS: "APPROVED",

            updatedAt: Date.now(),
          });

          // =========================================
          // 🔥 AUTO UNLOCK REFUND
          // =========================================
          try {
            await remove(ref(db, `imei_lock/${imei}`));
          } catch {}

          try {
            await remove(ref(db, `imeiLocks/${imei}`));
          } catch {}

          try {
            await remove(ref(db, `stokLock/${imei}`));
          } catch {}

          try {
            await remove(ref(db, `refundLock/${imei}`));
          } catch {}

          console.log("🔓 REFUND LOCK RELEASED", imei);

          // ===============================
          // STOK TOKO
          // ===============================
          await update(ref(db, `stokToko/${trx.tokoId}/${imei}`), {
            imei: imeiRaw,

            namaBarang: item.namaBarang || "",

            namaBrand: item.namaBrand || "",

            toko: trx.toko || "",

            status: "AVAILABLE",

            sold: false,

            READY_RESALE: true,

            IS_REFUND: true,

            LAST_ACTION: "REFUND",

            updatedAt: Date.now(),
          });

          // ===============================
          // TRANSAKSI REFUND
          // ===============================
          await addTransaksi(trx.tokoId, {
            deleted: true,

            deletedFromPenjualan: true,

            refundProcessed: true,

            refundLocked: true,

            HIDE_FROM_PENJUALAN: true,

            HIDE_FROM_TABLE: true,

            TANGGAL_TRANSAKSI: new Date().toISOString().slice(0, 10),

            NO_INVOICE: `REF-${trx.invoice}`,

            NAMA_TOKO: trx.toko,

            NAMA_BARANG: item.namaBarang,

            NAMA_BRAND: item.namaBrand,

            IMEI: imeiRaw,

            QTY: 1,

            PAYMENT_METODE: "REFUND",

            statusRefund: "READY_RESALE",

            STATUS_STOK: "AVAILABLE",

            READY_RESALE: true,

            STATUS: "REFUND",

            CREATED_AT: Date.now(),

            IS_REFUND: true,
          });
        }

        continue;
      }

      // =====================================
      // NON IMEI
      // =====================================
      const qty = Number(item.qty || item.QTY || 0);

      const stockKey = `${normalize(item.namaBrand)}|${normalize(
        item.namaBarang
      )}`;

      const stokRef = ref(db, `stokToko/${trx.tokoId}/NON_IMEI/${stockKey}`);

      const snap = await get(stokRef);

      const oldQty = Number(snap.val()?.qty || 0);

      // ===============================
      // RESTORE STOCK
      // ===============================
      await update(stokRef, {
        namaBarang: item.namaBarang || "",

        namaBrand: item.namaBrand || "",

        toko: trx.toko || "",

        qty: oldQty + qty,

        status: "AVAILABLE",

        sold: false,

        updatedAt: Date.now(),

        lastAction: "REFUND",
      });

      // ===============================
      // TRANSAKSI REFUND
      // ===============================
      await addTransaksi(trx.tokoId, {
        deleted: true,

        deletedFromPenjualan: true,

        refundProcessed: true,

        refundLocked: true,

        HIDE_FROM_PENJUALAN: true,

        HIDE_FROM_TABLE: true,

        TANGGAL_TRANSAKSI: new Date().toISOString().slice(0, 10),

        NO_INVOICE: `REF-${trx.invoice}`,

        NAMA_TOKO: trx.toko,

        NAMA_BARANG: item.namaBarang,

        NAMA_BRAND: item.namaBrand,

        IMEI: "NON-IMEI",

        QTY: qty,

        PAYMENT_METODE: "REFUND",

        STATUS: "REFUND",

        CREATED_AT: Date.now(),

        IS_REFUND: true,
      });
    }

    // =========================================
    // HIDE FINAL
    // =========================================
    setDeletedRows((prev) => ({
      ...prev,
      [row.invoice]: true,
    }));

    // =========================================
// 🔥 FINAL REFUND OVERRIDE
// =========================================
try {
  const itemsRefund =
    Array.isArray(trx.items)
      ? trx.items
      : [];

  for (const item of itemsRefund) {
    for (const imeiRaw of item.imeiList || []) {
      const imei =
        normalizeImei(imeiRaw);

      await update(
        ref(db, `detail_stock/${imei}`),
        {
          READY_RESALE: true,
          IS_REFUND: true,
          LAST_ACTION: "REFUND",
          PAYMENT_METODE: "REFUND",
          refundLocked: false,
        }
      );
    }
  }
} catch (e) {
  console.log(
    "⚠️ FINAL REFUND OVERRIDE",
    e.message
  );
}

    return true;
  } catch (err) {
    console.error(err);

    alert("❌ Refund gagal : " + err.message);

    return false;
  } finally {
    setRefundLoading(null);
  }
};
