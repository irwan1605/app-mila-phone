import { buildFinalImeiOwnerTracker } from "./stockTransactionOrder";

const normalizeImei = (value) => String(value || "").trim().toUpperCase();

test("approved transfer chain keeps only the latest destination as owner", () => {
  const transactions = [
    { id: "ab-in", IMEI: "123", STATUS: "Approved", PAYMENT_METODE: "TRANSFER_MASUK", NAMA_TOKO: "B", OWNER_AKHIR: "B", CREATED_AT: 100 },
    { id: "ab-out", IMEI: "123", STATUS: "Approved", PAYMENT_METODE: "TRANSFER_KELUAR", NAMA_TOKO: "A", OWNER_AKHIR: "B", CREATED_AT: 100 },
    { id: "bc-in", IMEI: "123", STATUS: "Approved", PAYMENT_METODE: "TRANSFER_MASUK", NAMA_TOKO: "C", OWNER_AKHIR: "C", CREATED_AT: 200 },
    { id: "bc-out", IMEI: "123", STATUS: "Approved", PAYMENT_METODE: "TRANSFER_KELUAR", NAMA_TOKO: "B", OWNER_AKHIR: "C", CREATED_AT: 200 },
  ];

  expect(buildFinalImeiOwnerTracker(transactions, normalizeImei)["123"]).toMatchObject({
    toko: "C",
    active: true,
    metode: "TRANSFER_MASUK",
  });
});

test("a sale after repeated transfers makes the IMEI inactive", () => {
  const transactions = [
    { id: "transfer-out", IMEI: "123", STATUS: "Approved", PAYMENT_METODE: "TRANSFER_KELUAR", OWNER_AKHIR: "B", CREATED_AT: 100 },
    { id: "transfer-in", IMEI: "123", STATUS: "Approved", PAYMENT_METODE: "TRANSFER_MASUK", NAMA_TOKO: "B", CREATED_AT: 100 },
    { id: "sale", IMEI: "123", STATUS: "Approved", PAYMENT_METODE: "PENJUALAN", NAMA_TOKO: "B", CREATED_AT: 200 },
  ];

  expect(buildFinalImeiOwnerTracker(transactions, normalizeImei)["123"].active).toBe(false);
});
