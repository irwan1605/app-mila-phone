export const getMasterPembelianQty = (trx) => {
  const qtyManual = Number(trx?.QTY_INPUT_MANUAL || 0);

  if (qtyManual > 0) {
    return qtyManual;
  }

  return Number(trx?.QTY || 0);
};
