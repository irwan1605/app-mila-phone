// ==============================================
// src/stockEngine/helpers/sortTransaction.js
// ==============================================

export function sortTransaction(transaksi = []) {
  return [...transaksi]

    .filter(Boolean)

    .sort((a, b) => {
      const dateA = new Date(
        a.CREATED_AT || a.UPDATED_AT || a.TANGGAL_TRANSAKSI || 0
      ).getTime();

      const dateB = new Date(
        b.CREATED_AT || b.UPDATED_AT || b.TANGGAL_TRANSAKSI || 0
      ).getTime();

      if (dateA !== dateB) return dateA - dateB;

      return String(a.id || "").localeCompare(String(b.id || ""));
    });
}
