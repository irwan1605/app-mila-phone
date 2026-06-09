const normalize = (v) =>
  String(v || "")
    .trim()
    .toUpperCase();

export const buildFinalImeiStock = ({ transaksi = [] }) => {
  const historyMap = {};

  transaksi.forEach((trx) => {
    const imei = String(trx.IMEI || "").trim();

    if (!imei) return;

    if (normalize(trx.STATUS) !== "APPROVED") {
      return;
    }

    if (!historyMap[imei]) {
      historyMap[imei] = [];
    }

    historyMap[imei].push(trx);
  });

  const result = {};

  Object.entries(historyMap).forEach(([imei, history]) => {
    const historySorted = [...history].sort((a, b) => {
      const ta = new Date(
        a.TANGGAL || a.CREATED_AT || a.createdAt || a.TIMESTAMP || 0
      ).getTime();

      const tb = new Date(
        b.TANGGAL || b.CREATED_AT || b.createdAt || b.TIMESTAMP || 0
      ).getTime();

      return tb - ta;
    });

    const last = historySorted[0];

    const metode = normalize(
      last.LAST_ACTION ||
        last.statusRefund ||
        last.PAYMENT_METODE ||
        last.STATUS_PENJUALAN
    );

    if (imei === "358261510981927") {
      console.table(
        history.map((x) => ({
          metode: x.PAYMENT_METODE,
          status: x.STATUS,
          tanggal: x.TANGGAL,
          created: x.CREATED_AT,
          timestamp: x.TIMESTAMP,
        }))
      );

      console.log("LAST STATUS", last);
    }

    if (imei === "358261510981927") {
      console.log("FINAL IMEI DEBUG", {
        imei,
        metode,
        last,
        history,
      });
    }

    if (imei === "358261510981927") {
      console.log("IMEI DEBUG", {
        imei,
        metode,
        history,
        last,
      });
    }

    // =====================================
    // FINAL STATUS YANG BOLEH DIJUAL LAGI
    // =====================================
    const SELLABLE_STATUS = [
      "PEMBELIAN",

      "REFUND",
      "READY_RESALE",

      "REJECT",
      "TRANSFER_REJECT",

      "TRANSFER_MASUK",
      "TRANSFER BARANG",
      "TRANSFER",

      "RETUR",
      "VOID OPNAME",
    ];

    // =====================================
    // FINAL STATUS TIDAK BOLEH DIJUAL
    // =====================================
    const NOT_SELLABLE_STATUS = [
      "PENJUALAN",
      "SOLD",
      "TERJUAL",
      "TRANSFER_KELUAR",
    ];

    // =====================================
    // SOURCE OF TRUTH
    // STATUS TERAKHIR IMEI
    // =====================================
    // =====================================
    // SOURCE OF TRUTH BARU
    // =====================================
    let available = false;

    // cek histori dari bawah ke atas
    for (const trx of historySorted) {
      const status = normalize(
        trx.LAST_ACTION ||
          trx.statusRefund ||
          trx.PAYMENT_METODE ||
          trx.STATUS_PENJUALAN
      );

      // status yang mengembalikan stok
      if (
        [
          "PEMBELIAN",
          "REFUND",
          "REJECT",
          "TRANSFER BARANG",
          "TRANSFER",
          "TRANSFER_MASUK",
          "TRANSFER_REJECT",
          "READY_RESALE",
          "RETUR",
          "VOID OPNAME",
        ].includes(status)
      ) {
        available = true;
        break;
      }

      // status yang menghabiskan stok
      if (
        ["PENJUALAN", "SOLD", "TERJUAL", "TRANSFER_KELUAR"].includes(status)
      ) {
        available = false;
        break;
      }
    }

    const adaRefund = history.some((x) =>
      ["REFUND", "READY_RESALE"].includes(
        normalize(x.statusRefund || x.PAYMENT_METODE)
      )
    );

    const adaReject = history.some((x) =>
      ["REJECT", "TRANSFER_REJECT"].includes(normalize(x.PAYMENT_METODE))
    );

    const adaTransferMasuk = history.some((x) =>
      ["TRANSFER BARANG", "TRANSFER", "TRANSFER_MASUK"].includes(
        normalize(x.PAYMENT_METODE)
      )
    );

    // jika ada transaksi pengembalian stok
    if (adaRefund || adaReject || adaTransferMasuk) {
      available = true;
    }

    console.log("IMEI STATUS", imei, {
      metode,
      available,
      sellable: SELLABLE_STATUS.includes(metode),
    });

    if (imei === "358261510981927") {
      console.log("FINAL STATUS IMEI", {
        imei,
        available,
        metode,
        history: history.map((x) => x.PAYMENT_METODE),
      });
    }

    result[imei] = {
      imei,

      available,

      lastStatus: metode,

      toko: last.NAMA_TOKO || "",

      namaBarang: last.NAMA_BARANG || "",

      namaBrand: last.NAMA_BRAND || "",
    };
  });

  return result;
};
