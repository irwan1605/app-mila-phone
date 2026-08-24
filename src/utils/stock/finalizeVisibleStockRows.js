import { buildFinalNonImeiStock } from "../FungsiTransferBarang/buildFinalNonImeiStock";
import { normalize, normalizeImei, normalizeText } from "../buildFinalStockRows";

// Satu aturan pencarian untuk Detail Stock dan Stock Opname agar jumlah baris
// tabel maupun hasil export tetap identik ketika keyword yang sama digunakan.
export const filterVisibleStockRows = (rows = [], search = "") => {
  const keyword = String(search || "").trim().toLowerCase();
  if (!keyword) return rows;

  return rows.filter((row) =>
    [
      row.imei,
      row.barang,
      row.namaToko || row.toko,
      row.brand,
      row.noDo,
      String(row.tanggal || "").replace("T", " "),
      row.supplier,
      row.statusBarang,
      row.keterangan,
    ].some((value) => String(value || "").toLowerCase().includes(keyword))
  );
};

// Finalisasi tunggal yang dipakai Detail Stock dan Stock Opname. Dengan input
// snapshot yang sama, key, owner, qty dan jumlah baris yang dihasilkan sama.
export const finalizeVisibleStockRows = ({
  rows = [],
  transaksi = [],
  namaToko = "",
  finalOwnerTracker = {},
  imeiTerjual = new Set(),
  refundAvailableSet = new Set(),
  refundSoldSet = new Set(),
  supplierLookup = {},
  masterMap = {},
}) => {
  const targetToko = normalize(namaToko);
  if (!targetToko) return [];

  const finalMap = {};

  rows.forEach((row) => {
    if (row.imei) {
      const imei = normalizeImei(row.imei);
      const owner = finalOwnerTracker[imei];
      if (!owner?.active || normalize(owner.toko) !== targetToko) return;
      if (imeiTerjual.has(imei) && !refundAvailableSet.has(imei)) return;
      if (refundSoldSet.has(imei)) return;

      finalMap[`IMEI_${imei}`] = {
        ...row,
        namaToko: owner.toko,
        qty: 1,
        statusBarang: "TERSEDIA",
      };
      return;
    }

    const toko = row.namaToko || namaToko;
    if (normalize(toko) !== targetToko) return;
    const key = `${normalize(toko)}|${normalizeText(row.brand)}|${normalizeText(
      row.barang
    )}`;
    const qty = buildFinalNonImeiStock({
      transaksi,
      toko,
      brand: row.brand,
      barang: row.barang,
    });
    if (qty <= 0) return;

    const previous = finalMap[key] || {};
    const master =
      masterMap?.[`${row.brand}|${row.barang}`] ||
      masterMap?.[`${normalizeText(row.brand)}|${normalizeText(row.barang)}`] ||
      {};
    finalMap[key] = {
      ...previous,
      ...row,
      namaToko: toko,
      supplier: row.supplier || previous.supplier || supplierLookup?.[key] || "-",
      qty,
      hargaSRP: Number(master.hargaSRP || row.hargaSRP || previous.hargaSRP || 0),
      hargaGrosir: Number(
        master.hargaGrosir || row.hargaGrosir || previous.hargaGrosir || 0
      ),
      hargaReseller: Number(
        master.hargaReseller || row.hargaReseller || previous.hargaReseller || 0
      ),
      statusBarang: "TERSEDIA",
      keterangan: String(row.keterangan || "").toUpperCase().includes("REFUND")
        ? "REFUND"
        : String(row.keterangan || "").toUpperCase().includes("RETUR")
        ? "RETUR"
        : row.keterangan || previous.keterangan || "SYNC STOCK OPNAME",
    };
  });

  return Object.entries(finalMap)
    .map(([key, row]) => ({ key, ...row }))
    .filter((row) => Number(row.qty || 0) > 0)
    .sort((a, b) =>
      `${normalize(a.namaToko)}|${normalizeText(a.brand)}|${normalizeText(
        a.barang
      )}|${normalizeImei(a.imei)}`.localeCompare(
        `${normalize(b.namaToko)}|${normalizeText(b.brand)}|${normalizeText(
          b.barang
        )}|${normalizeImei(b.imei)}`
      )
    );
};
