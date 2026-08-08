import {
  buildRefundReturnTracker,
  buildRefundSoldSet,
  canResellRefundReturnImei,
  canTransferRefundReturnImei,
  filterRefundSoldRows,
} from "./BarangRefund";

const trx = (method, time, extra = {}) => ({
  STATUS: "APPROVED",
  PAYMENT_METODE: method,
  CREATED_AT: time,
  IMEI: "12345",
  NAMA_TOKO: "TOKO A",
  ...extra,
});

describe("refund/retur lifecycle", () => {
  test("refund dapat ditransfer, owner berpindah, lalu dapat dijual", () => {
    const refund = trx("REFUND", 1, { IS_REFUND: true });
    expect(canTransferRefundReturnImei("12345", [refund])).toBe(true);

    const transferOut = trx("TRANSFER_KELUAR", 2, {
      IS_REFUND_TRANSFER: true,
      SUMBER_STOCK: "REFUND",
    });
    expect(
      canTransferRefundReturnImei("12345", [refund, transferOut])
    ).toBe(false);

    const transferIn = trx("TRANSFER_MASUK", 3, {
      NAMA_TOKO: "TOKO B",
      IS_REFUND_TRANSFER: true,
      SUMBER_STOCK: "REFUND",
    });
    const transferred = [refund, transferOut, transferIn];
    expect(canTransferRefundReturnImei("12345", transferred)).toBe(true);
    expect(buildRefundReturnTracker(transferred)["12345"].owner).toBe("TOKO B");

    const sale = trx("PENJUALAN", 4, { NAMA_TOKO: "TOKO B" });
    const sold = [...transferred, sale];
    expect(canResellRefundReturnImei("12345", sold)).toBe(false);
    expect(buildRefundSoldSet(sold).has("12345")).toBe(true);
  });

  test("retur kedua membuka siklus baru setelah barang dijual kembali", () => {
    const history = [
      trx("RETUR", 1, { IS_RETUR: true }),
      trx("PENJUALAN", 2),
      trx("RETUR", 3, { IS_RETUR: true }),
    ];

    const state = buildRefundReturnTracker(history)["12345"];
    expect(state.returnType).toBe("RETUR");
    expect(state.cycle).toBe(2);
    expect(state.available).toBe(true);
    expect(buildRefundSoldSet(history).has("12345")).toBe(false);
  });

  test("multi transfer tidak dianggap penjualan", () => {
    const history = [
      trx("REFUND", 1),
      trx("TRANSFER_KELUAR", 2, { SUMBER_STOCK: "REFUND" }),
      trx("TRANSFER_MASUK", 3, {
        NAMA_TOKO: "TOKO B",
        SUMBER_STOCK: "REFUND",
      }),
      trx("TRANSFER_KELUAR", 4, {
        NAMA_TOKO: "TOKO B",
        SUMBER_STOCK: "REFUND",
      }),
      trx("TRANSFER_MASUK", 5, {
        NAMA_TOKO: "TOKO C",
        SUMBER_STOCK: "REFUND",
      }),
    ];

    const state = buildRefundReturnTracker(history)["12345"];
    expect(state.owner).toBe("TOKO C");
    expect(state.available).toBe(true);
    expect(state.soldAfterRefund).toBe(false);
  });

  test("event refund non-IMEI yang sama tidak membuat double stock", () => {
    const base = {
      STATUS: "REFUND",
      statusPembayaran: "REFUND",
      PAYMENT_METODE: "PENJUALAN",
      NO_INVOICE: "INV-1",
      NAMA_TOKO: "TOKO A",
      NAMA_BRAND: "BRAND",
      NAMA_BARANG: "BARANG",
      QTY: 2,
      CREATED_AT: 1,
    };
    const event = {
      ...base,
      STATUS: "APPROVED",
      PAYMENT_METODE: "REFUND",
      CREATED_AT: 2,
    };
    const [row] = filterRefundSoldRows({
      transaksi: [base, event],
      rows: [
        {
          namaToko: "TOKO A",
          brand: "BRAND",
          barang: "BARANG",
          keterangan: "REFUND",
          qty: 10,
        },
      ],
    });

    expect(row.qty).toBe(2);
  });

  test("transaksi normal tanpa refund/retur tidak ikut diubah", () => {
    const normal = [trx("PEMBELIAN", 1), trx("PENJUALAN", 2)];
    expect(buildRefundReturnTracker(normal)["12345"].hasReturn).toBe(false);
    expect(buildRefundSoldSet(normal).size).toBe(0);
  });
});
