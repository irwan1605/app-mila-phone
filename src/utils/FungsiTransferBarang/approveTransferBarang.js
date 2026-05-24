import { buildTransferStock } from "./buildTransferStock";

import { validateTransferImei } from "./validateTransferImei";

import { validateTransferStock } from "./validateTransferStock";

import { validateTransferQty } from "./validateTransferQty";

// ======================================
// 🔥 APPROVE TRANSFER FINAL
// ======================================

export const approveTransferBarang = async ({ transaksi = [], transfer }) => {
  const { imeiStock, nonImeiStock } = buildTransferStock({
    transaksi,
    tokoPengirim: transfer.tokoPengirim,
  });

  // ======================================
  // 🔥 IMEI
  // ======================================
  if (Array.isArray(transfer.imeis) && transfer.imeis.length > 0) {
    const cleanImeis = validateTransferImei(transfer.imeis);

    validateTransferStock({
      imeis: cleanImeis,
      stock: imeiStock,
    });
  }

  // ======================================
  // 🔥 NON IMEI
  // ======================================
  else {
    validateTransferQty({
      stock: nonImeiStock,

      brand: transfer.brand,

      barang: transfer.barang,

      qty: transfer.qty,
    });
  }

  return true;
};
