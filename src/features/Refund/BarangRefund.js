// src/features/Refund/BarangRefund.js

const normalizeImei = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

const normalizeText = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");

const RETURN_METHODS = new Set(["REFUND", "RETUR", "RETURN"]);
const AVAILABLE_METHODS = new Set([
  ...RETURN_METHODS,
  "TRANSFER_MASUK",
  "TRANSFER_REJECT",
  "PEMBELIAN",
  "READY_RESALE",
  "VOID OPNAME",
]);
const OUT_METHODS = new Set(["PENJUALAN", "TRANSFER_KELUAR"]);
const VALID_STATUSES = new Set(["APPROVED", "REFUND", "RETUR", "RETURN"]);

const getMethod = (trx = {}) =>
  normalizeText(trx.PAYMENT_METODE || trx.paymentMetode || trx.metode);

const getStatus = (trx = {}) =>
  normalizeText(trx.STATUS || trx.status);

const getOwner = (trx = {}) =>
  normalizeText(
    trx.CURRENT_OWNER ||
      trx.OWNER_AKHIR ||
      trx.NAMA_TOKO ||
      trx.namaToko ||
      trx.toko ||
      trx.ke ||
      trx.tokoTujuan ||
      trx.tokoPenerima
  );

const getTimestamp = (trx = {}) => {
  const raw =
    trx.UPDATED_AT ||
    trx.updatedAt ||
    trx.CREATED_AT ||
    trx.createdAt ||
    trx.TANGGAL_TRANSAKSI ||
    trx.tanggal ||
    0;
  const numeric = Number(raw);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  const parsed = new Date(raw).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const isReturnEvent = (trx = {}, method = getMethod(trx)) => {
  const status = getStatus(trx);
  return (
    RETURN_METHODS.has(method) ||
    ["REFUND", "RETUR", "RETURN"].includes(status) ||
    normalizeText(trx.statusPembayaran) === "REFUND" ||
    trx.IS_REFUND === true ||
    trx.IS_RETUR === true ||
    trx.IS_RETURN === true
  );
};

const isRefundLineage = (trx = {}, method = getMethod(trx)) =>
  isReturnEvent(trx, method) ||
  trx.IS_REFUND_TRANSFER === true ||
  trx.IS_RETUR_TRANSFER === true ||
  ["REFUND", "RETUR", "RETURN"].includes(normalizeText(trx.SUMBER_STOCK)) ||
  normalizeText(trx.LAST_ACTION).includes("REFUND") ||
  normalizeText(trx.LAST_ACTION).includes("RETUR");

const isValidEvent = (trx = {}) => {
  const status = getStatus(trx);
  return !status || VALID_STATUSES.has(status);
};

const getImeis = (trx = {}) => {
  const imeis = new Set();
  const add = (value) => {
    const normalized = normalizeImei(value);
    if (normalized && !["NONIMEI", "NON-IMEI", "-"].includes(normalized)) {
      imeis.add(normalized);
    }
  };

  add(trx.IMEI || trx.imei);
  if (Array.isArray(trx.imeis)) trx.imeis.forEach(add);
  if (Array.isArray(trx.imeiList)) trx.imeiList.forEach(add);
  if (Array.isArray(trx.items)) {
    trx.items.forEach((item) => {
      if (Array.isArray(item?.imeiList)) item.imeiList.forEach(add);
      if (Array.isArray(item?.imeis)) item.imeis.forEach(add);
      add(item?.IMEI || item?.imei);
    });
  }

  return [...imeis];
};

const sortTransactions = (transactions = []) =>
  transactions
    .map((trx, index) => ({ trx, index, timestamp: getTimestamp(trx) }))
    .sort((a, b) => a.timestamp - b.timestamp || a.index - b.index)
    .map(({ trx }) => trx);

const createImeiState = () => ({
  hasRefund: false,
  hasReturn: false,
  returnType: "",
  available: false,
  soldAfterRefund: false,
  inTransfer: false,
  owner: "",
  cycle: 0,
  lastMethod: "",
  lastTimestamp: 0,
});

/**
 * Membentuk status lifecycle refund/retur per IMEI dari histori immutable.
 * Refund/retur membuka siklus baru; transfer hanya memindahkan owner; penjualan
 * menutup siklus. Dengan demikian multi refund dan multi transfer tetap aman.
 */
export const buildRefundReturnTracker = (transactions = []) => {
  const tracker = {};

  sortTransactions(transactions).forEach((trx) => {
    if (!trx || !isValidEvent(trx)) return;

    const method = getMethod(trx);
    const returnEvent = isReturnEvent(trx, method);
    const lineage = isRefundLineage(trx, method);
    const owner = getOwner(trx);
    const timestamp = getTimestamp(trx);

    getImeis(trx).forEach((imei) => {
      const state = tracker[imei] || createImeiState();

      if (returnEvent) {
        state.hasRefund = true;
        state.hasReturn = true;
        state.returnType = method === "RETUR" || trx.IS_RETUR ? "RETUR" : "REFUND";
        state.available = true;
        state.soldAfterRefund = false;
        state.inTransfer = false;
        state.cycle += 1;
        if (owner) state.owner = owner;
      } else if (method === "TRANSFER_KELUAR" && (state.hasReturn || lineage)) {
        state.available = false;
        state.inTransfer = true;
      } else if (
        ["TRANSFER_MASUK", "TRANSFER_REJECT"].includes(method) &&
        (state.hasReturn || lineage)
      ) {
        state.hasRefund = true;
        state.hasReturn = true;
        state.available = true;
        state.soldAfterRefund = false;
        state.inTransfer = false;
        if (owner) state.owner = owner;
      } else if (method === "PENJUALAN" && state.hasReturn && state.available) {
        state.available = false;
        state.soldAfterRefund = true;
        state.inTransfer = false;
      } else if (AVAILABLE_METHODS.has(method) && lineage) {
        state.available = true;
        state.soldAfterRefund = false;
        state.inTransfer = false;
        if (owner) state.owner = owner;
      } else if (OUT_METHODS.has(method) && state.hasReturn) {
        state.available = false;
      }

      state.lastMethod = method;
      state.lastTimestamp = timestamp;
      tracker[imei] = state;
    });
  });

  return tracker;
};

const buildNonImeiReturnTracker = (transactions = []) => {
  const tracker = {};
  const processedReturns = new Set();

  sortTransactions(transactions).forEach((trx) => {
    if (!trx || !isValidEvent(trx) || getImeis(trx).length > 0) return;

    const method = getMethod(trx);
    const owner = getOwner(trx);
    const brand = normalizeText(trx.NAMA_BRAND || trx.brand);
    const item = normalizeText(trx.NAMA_BARANG || trx.barang);
    if (!owner || !brand || !item) return;

    const key = `${owner}|${brand}|${item}`;
    const state = tracker[key] || {
      refundQty: 0,
      soldQty: 0,
      availableQty: 0,
      lastStatus: "",
    };
    const qty = Math.abs(Number(trx.QTY || trx.qty || 0));
    const lineage = isRefundLineage(trx, method);

    if (isReturnEvent(trx, method)) {
      // Refund penjualan sering tersimpan sebagai update invoice asli sekaligus
      // event REFUND baru. Keduanya mewakili satu barang masuk, bukan dua stok.
      const reference = normalizeText(
        trx.REFUND_FROM ||
          trx.INVOICE_ASAL ||
          trx.NO_INVOICE ||
          trx.invoice ||
          trx.refId ||
          trx.id
      );
      const returnKey = `${reference}|${key}`;
      if (reference && processedReturns.has(returnKey)) return;
      if (reference) processedReturns.add(returnKey);

      state.refundQty += qty;
      state.availableQty += qty;
      state.lastStatus = method === "RETUR" || trx.IS_RETUR ? "RETUR" : "REFUND";
    } else if (method === "PENJUALAN" && state.availableQty > 0) {
      const consumed = Math.min(qty, state.availableQty);
      state.soldQty += consumed;
      state.availableQty -= consumed;
    } else if (method === "TRANSFER_KELUAR" && lineage) {
      state.availableQty = Math.max(0, state.availableQty - qty);
    } else if (["TRANSFER_MASUK", "TRANSFER_REJECT"].includes(method) && lineage) {
      state.availableQty += qty;
    }

    tracker[key] = state;
  });

  return tracker;
};

export const filterRefundSoldRows = ({ rows = [], transaksi = [] }) => {
  const imeiTracker = buildRefundReturnTracker(transaksi);
  const skuTracker = buildNonImeiReturnTracker(transaksi);

  return rows.flatMap((row) => {
    const imei = normalizeImei(row.imei || row.IMEI);
    if (imei && !["NONIMEI", "NON-IMEI", "-"].includes(imei)) {
      const state = imeiTracker[imei];
      return state?.hasReturn && !state.available ? [] : [row];
    }

    const key = `${normalizeText(row.namaToko || row.NAMA_TOKO)}|${normalizeText(
      row.brand || row.NAMA_BRAND
    )}|${normalizeText(row.barang || row.NAMA_BARANG)}`;
    const state = skuTracker[key];
    const description = normalizeText(
      row.keterangan || row.statusBarang || row.LAST_ACTION
    );
    const isReturnRow = ["REFUND", "RETUR", "RETURN"].some((type) =>
      description.includes(type)
    );

    if (!isReturnRow || !state) return [row];
    const availableQty = Math.max(0, Number(state.availableQty || 0));
    if (availableQty <= 0) return [];

    // Jangan mutasi row sumber karena row mungkin berasal dari useMemo React.
    return [{ ...row, qty: Math.min(Number(row.qty || row.QTY || 0), availableQty) }];
  });
};

export const buildRefundSoldSet = (transactions = []) => {
  const tracker = buildRefundReturnTracker(transactions);
  return new Set(
    Object.entries(tracker)
      .filter(([, state]) => state.hasReturn && state.soldAfterRefund && !state.available)
      .map(([imei]) => imei)
  );
};

export const getRefundReturnState = (imei, transactions = []) =>
  buildRefundReturnTracker(transactions)[normalizeImei(imei)] || null;

export const canTransferRefundReturnImei = (imei, transactions = []) => {
  const state = getRefundReturnState(imei, transactions);
  return Boolean(state?.hasReturn && state.available && !state.inTransfer);
};

export const canResellRefundReturnImei = (imei, transactions = []) =>
  canTransferRefundReturnImei(imei, transactions);

export const isRefundSoldImei = (imei, transactions = []) => {
  const state = getRefundReturnState(imei, transactions);
  return Boolean(state?.hasReturn && state.soldAfterRefund && !state.available);
};
