// =======================================================
// src/features/dashboad/CardPenjualanToko.jsx
// FINAL FIX
// =======================================================

import React, { useEffect, useMemo, useState } from "react";

import { useNavigate } from "react-router-dom";

import { listenPenjualan } from "../../services/FirebaseService";

// =======================================================
// FORMAT RUPIAH
// =======================================================
const rupiah = (n) => {
  return Number(n || 0).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });
};

// =======================================================
// FORMAT TANGGAL
// =======================================================
const formatDate = (d) => {
  if (!d) return "";

  try {
    return new Date(d).toLocaleDateString("en-CA");
  } catch {
    return "";
  }
};

// =======================================================
// TOKO LIST
// =======================================================
const TOKO_LIST = [
  "CILANGKAP PUSAT",
  "CIBINONG",
  "GAS ALAM",
  "CITEUREUP",
  "MARKETPLACE",
  "METLAND 1",
  "METLAND 2",
  "PITARA",
  "KOTA WISATA",
  "SAWANGAN",
];

// =======================================================
// COMPONENT
// =======================================================
export default function CardPenjualanToko() {
  const navigate = useNavigate();

  const [penjualanList, setPenjualanList] = useState([]);

  // =====================================================
  // LISTENER
  // =====================================================
  useEffect(() => {
    const unsub = listenPenjualan((rows) => {
      setPenjualanList(Array.isArray(rows) ? rows : []);
    });

    return () => {
      if (unsub) unsub();
    };
  }, []);

  // =====================================================
  // DATA TOKO
  // =====================================================
  const dataToko = useMemo(() => {
    const map = {};

    // =================================================
    // TRACKER INVOICE
    // =================================================
    const invoiceTrackerHari = new Map();

    const invoiceTrackerBulan = new Map();

    const today = new Date().toLocaleDateString("en-CA");

    const currentMonth = new Date().getMonth();

    const currentYear = new Date().getFullYear();

    penjualanList.forEach((trx) => {
      // =================================================
      // HANYA HITUNG PENJUALAN VALID
      // =================================================
      // =================================================
      // NORMALIZE
      // =================================================
      const metode = String(
        trx?.PAYMENT_METODE ||
          trx?.paymentMetode ||
          trx?.paymentMetodeUser ||
          ""
      )
        .trim()
        .toUpperCase();

      const status = String(
        trx?.STATUS || trx?.status || trx?.statusPembayaran || ""
      )
        .trim()
        .toUpperCase();

        const invoiceUpper = String(
          trx?.invoice ||
          trx?.NO_INVOICE ||
          ""
        )
          .trim()
          .toUpperCase();
        
        const isRefund =
          trx?.deleted === true ||
          trx?.deletedFromPenjualan === true ||
          trx?.refundProcessed === true ||
          trx?.refundLocked === true ||
          trx?.IS_REFUND === true ||
          trx?.HIDE_FROM_PENJUALAN === true ||
          trx?.HIDE_FROM_TABLE === true ||
          metode === "REFUND" ||
          status === "REFUND" ||
          status === "REFUND_DELETED" ||
          invoiceUpper.startsWith("REF-");

          if (
            metode === "REFUND" ||
            status === "REFUND" ||
            status === "REFUND_DELETED"
          ) {
            console.log(
              "⛔ REFUND TERBLOCK CARD TOKO",
              trx.invoice
            );
          
            return;
          }
        
        if (isRefund) {
          return;
        }

      // =================================================
      // FILTER HANYA PENJUALAN VALID
      // =================================================

      // =================================================
      // FILTER TRANSAKSI TIDAK VALID
      // =================================================

      // ❌ PEMBELIAN
      if (metode === "PEMBELIAN") {
        return;
      }

      // ❌ REFUND
      if (
        metode === "REFUND" ||
        status === "REFUND" ||
        status === "REFUND_DELETED"
      ) {
        return;
      }

      // ❌ TRANSFER
      if (metode === "TRANSFER" || status === "TRANSFER") {
        return;
      }

      // ❌ REJEK
      if (status === "REJEK" || status === "REJECT" || status === "DITOLAK") {
        return;
      }

      // ❌ VOID
      if (status === "VOID") {
        return;
      }

    
      // =================================================
      // FILTER REFUND
      // =================================================
     
     
      // =================================================
      // TOKO
      // =================================================
      const toko = String(trx?.toko || trx?.NAMA_TOKO || trx?.TOKO || "")
        .trim()
        .toUpperCase();

      if (!TOKO_LIST.includes(toko)) return;

      // =================================================
      // INVOICE
      // =================================================
      const invoice = String(trx?.invoice || trx?.NO_INVOICE || "").trim();

      const invoiceKeyHari = `${toko}|${invoice}`;

      const invoiceKeyBulan = `${toko}|${invoice}`;

      if (!invoice) return;

      // =================================================
      // TANGGAL
      // =================================================
      const tanggal = formatDate(
        trx?.tanggal || trx?.createdAt || trx?.TANGGAL_TRANSAKSI
      );

      // =================================================
      // TOTAL
      // =================================================
      let total = 0;

      if (Number(trx?.payment?.grandTotal || 0) > 0) {
        total = Number(trx.payment.grandTotal);
      } else if (Array.isArray(trx?.items)) {
        total =
          trx.items.reduce((s, it) => {
            return s + Number(it.qty || 0) * Number(it.hargaAktif || 0);
          }, 0) + Number(trx?.payment?.nominalMdr || 0);
      }

      // =================================================
      // INIT
      // =================================================
      if (!map[toko]) {
        map[toko] = {
          toko,
          omzetHariIni: 0,
          omzetBulanIni: 0,
          transaksiHariIni: 0,
          transaksiBulanIni: 0,
        };
      }

      // =================================================
      // HARI INI
      // =================================================
      if (tanggal === today) {
        if (!invoiceTrackerHari.has(`TOTAL_${invoiceKeyHari}`)) {
          map[toko].omzetHariIni += total;

          invoiceTrackerHari.set(`TOTAL_${invoiceKeyHari}`, true);
        }

        // =================================================
        // HITUNG QTY BARANG TERJUAL
        // =================================================
        // =================================================
        // HITUNG QTY PER INVOICE
        // =================================================
        if (!invoiceTrackerHari.has(invoiceKeyHari)) {
          let qtyHari = 0;

          // ITEMS ARRAY
          if (Array.isArray(trx?.items)) {
            qtyHari = trx.items.reduce((s, it) => {
              return s + Number(it.qty || 0);
            }, 0);
          }

          // SINGLE ITEM
          else {
            qtyHari = Number(trx?.QTY || trx?.qty || 1);
          }

          invoiceTrackerHari.set(invoiceKeyHari, true);

          map[toko].transaksiHariIni += qtyHari;
        }
      }

      // =================================================
      // BULAN INI
      // =================================================
      const d = new Date(
        trx?.tanggal || trx?.createdAt || trx?.TANGGAL_TRANSAKSI
      );

      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        if (!invoiceTrackerBulan.has(`TOTAL_${invoiceKeyBulan}`)) {
          map[toko].omzetBulanIni += total;

          invoiceTrackerBulan.set(`TOTAL_${invoiceKeyBulan}`, true);
        }

        // =================================================
        // HITUNG QTY BARANG TERJUAL
        // =================================================
        // =================================================
        // HITUNG QTY PER INVOICE
        // =================================================
        if (!invoiceTrackerBulan.has(invoiceKeyBulan)) {
          let qtyBulan = 0;

          // ITEMS ARRAY
          if (Array.isArray(trx?.items)) {
            qtyBulan = trx.items.reduce((s, it) => {
              return s + Number(it.qty || 0);
            }, 0);
          }

          // SINGLE ITEM
          else {
            qtyBulan = Number(trx?.QTY || trx?.qty || 1);
          }

          invoiceTrackerBulan.set(invoiceKeyBulan, true);

          map[toko].transaksiBulanIni += qtyBulan;
        }
      }
    });

    // =================================================
    // FORCE SEMUA TOKO MUNCUL
    // =================================================
    TOKO_LIST.forEach((namaToko) => {
      if (!map[namaToko]) {
        map[namaToko] = {
          toko: namaToko,

          omzetHariIni: 0,

          omzetBulanIni: 0,

          transaksiHariIni: 0,

          transaksiBulanIni: 0,

          invoiceHari: new Set(),

          invoiceBulan: new Set(),
        };
      }
    });

    // =================================================
    // SORTING
    // =================================================
    return Object.values(map).sort((a, b) => {
      return b.omzetBulanIni - a.omzetBulanIni;
    });
  }, [penjualanList]);

  // =====================================================
  // RENDER
  // =====================================================
  return (
    <div className="mt-1">
      <div className="flex items-center justify-between mb-1">
        <div className="text-sm text-gray-500">
          Total Toko : {dataToko.length}
        </div>
      </div>

      <div
        className="
    grid
    grid-cols-1
    sm:grid-cols-2
    lg:grid-cols-5
    gap-4
  "
      >
        {dataToko.map((item, index) => (
          <div
            key={index}
            onClick={() => {
              navigate(
                `/toko/${item.toko
                  .toLowerCase()
                  .replace(/\s+/g, "-")}/penjualan`,
                {
                  state: {
                    filterToko: item.toko,

                    onlyPenjualan: true,

                    excludeRefund: true,

                    excludeTransfer: true,

                    excludePembelian: true,

                    excludeReject: true,
                  },
                }
              );
            }}
            className="
         bg-white
         rounded-2xl
         border
         border-gray-200
         shadow-sm
         p-4
         hover:shadow-lg
         hover:scale-[1.02]
         transition-all
         cursor-pointer
       "
          >
            {/* HEADER */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  {item.toko}
                </h3>

                <p className="text-xs text-gray-500">Dashboard Penjualan</p>
              </div>

              <div
                className="
                  w-9
                  h-9
                  rounded-full
                  bg-blue-100
                  flex
                  items-center
                  justify-center
                  text-blue-600
                  text-sm
                  font-bold
                "
              >
                {index + 1}
              </div>
            </div>

            {/* HARI INI */}
            <div
              className="
                bg-green-50
                border
                border-green-100
                rounded-xl
                p-3
                mb-3
              "
            >
              <div className="text-xs font-semibold text-green-700">
                PENJUALAN HARI INI
              </div>

              <div className="text-lg font-bold text-green-600 mt-1">
                {rupiah(item.omzetHariIni)}
              </div>
            </div>

            {/* BULAN INI */}
            <div
              className="
                bg-blue-50
                border
                border-blue-100
                rounded-xl
                p-3
              "
            >
              <div className="text-xs font-semibold text-blue-700">
                PENJUALAN BULAN INI
              </div>

              <div className="text-lg font-bold text-blue-600 mt-1">
                {rupiah(item.omzetBulanIni)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* EMPTY */}
      {dataToko.length === 0 && (
        <div
          className="
            bg-white
            border
            border-dashed
            border-gray-300
            rounded-2xl
            p-10
            text-center
            text-gray-500
            mt-4
          "
        >
          Belum ada data penjualan toko
        </div>
      )}
    </div>
  );
}
