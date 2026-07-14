// ======================================================
// src/stockEngine/StockEngineV2.js
// Enterprise Version 2.1
// ======================================================

import { FinalOwnershipEngine } from "./engines/FinalOwnershipEngine";

import { FinalTransactionStateEngine } from "./engines/FinalTransactionStateEngine";

import { FinalStockCalculator } from "./engines/FinalStockCalculator";

import { GhostCleanerEngine } from "./engines/GhostCleanerEngine";

import { FinalValidatorEngine } from "./engines/FinalValidatorEngine";

import { selectDashboard } from "./selectors/selectDashboard";

import { selectDetailStock } from "./selectors/selectDetailStock";

import { selectStockOpname } from "./selectors/selectStockOpname";

import { selectExcelExport } from "./selectors/selectExcelExport";

import { selectTransfer } from "./selectors/selectTransfer";

import { selectRefund } from "./selectors/selectRefund";

// ======================================================

export function StockEngineV2({
  transaksi = [],

  currentStore = "",

  masterBarang = {},

  supplierLookup = {},

  refundSoldSet = new Set(),

  rejectSoldSet = new Set(),
} = {}) {
  // ==================================================
  // STEP 1
  // OWNERSHIP
  // ==================================================

  const ownership = FinalOwnershipEngine({
    transaksi,
  });

  // ==================================================
  // STEP 2
  // FINAL STATE
  // ==================================================

  const state = FinalTransactionStateEngine({
    transaksi,

    ownership,
  });

  // ==================================================
  // STEP 3
  // STOCK CALCULATOR
  // ==================================================

  const stock = FinalStockCalculator({
    transaksi,

    ownership,

    state,

    masterMap: masterBarang,

    supplierLookup,
  });

  // ==================================================
  // STEP 4
  // GHOST CLEANER
  // ==================================================

  const cleaned = GhostCleanerEngine({
    stock,

    ownership,

    state,

    currentStore,

    refundSoldSet,

    rejectSoldSet,
  });

  // ==================================================
  // STEP 5
  // FINAL VALIDATOR
  // ==================================================

  const validation = FinalValidatorEngine({
    stock: cleaned,

    currentStore,

    ownerMap: ownership,

    refundSoldSet,

    rejectSoldSet,
  });

  // ==================================================
  // ENTERPRISE RESULT
  // ==================================================

  return {
    ownership,

    state,

    stock,

    cleaned,

    rows: validation.rows,

    summary: validation.summary,

    metrics: validation.metrics,

    removed: validation.removed,

    errors: validation.errors,

    warnings: validation.warnings,

    debug: validation.debug,

    dashboard: selectDashboard(validation),

    detailStock: selectDetailStock(validation),

    stockOpname: selectStockOpname(validation),

    excel: selectExcelExport(validation),

    transfer: selectTransfer(validation),

    refund: selectRefund(validation),
  };
}
