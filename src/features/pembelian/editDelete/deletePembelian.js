import {
  deleteTransaksi,
  addTransaksi,
  reduceStock,
} from "../../../services/FirebaseService";

// ======================================
// PEMBELIAN KEY
// ======================================
const makePembelianKey = (t) => {
  return [
    String(t?.TANGGAL_TRANSAKSI || t?.tanggal || "").trim(),

    String(t?.NO_INVOICE || t?.noDo || "").trim(),

    String(t?.NAMA_SUPPLIER || t?.supplier || "")
      .trim()
      .toUpperCase(),

    String(t?.NAMA_TOKO || t?.namaToko || "")
      .trim()
      .toUpperCase(),

    String(t?.NAMA_BRAND || t?.brand || "")
      .trim()
      .toUpperCase(),

    String(t?.NAMA_BARANG || t?.barang || "")
      .trim()
      .toUpperCase(),

    "PEMBELIAN",
  ].join("|");
};

// ======================================
// SKU
// ======================================
const makeSku = (brand, barang) =>
  `${(brand || "").trim()}_${(barang || "").trim()}`.replace(/\s+/g, "_");

// ======================================
// GET TOKO ID
// ======================================
const getValidTokoId = (row, masterToko = []) => {
  if (row?.tokoId) return row.tokoId;

  const toko = masterToko.find(
    (x) =>
      String(x.nama || "")
        .trim()
        .toUpperCase() ===
      String(row.NAMA_TOKO || "")
        .trim()
        .toUpperCase()
  );

  return toko?.id || null;
};

// ======================================
// DELETE PEMBELIAN
// ======================================
export const deletePembelian = async ({
  item,
  allTransaksi = [],
  masterToko = [],
  setDeletedKeys,
}) => {
  try {
    const confirmDelete = window.confirm(
      `Hapus pembelian?\n\n${item.brand} - ${item.barang}`
    );

    if (!confirmDelete) return;

    const keyGroup = makePembelianKey(item);

    // ======================================
    // HIDE REALTIME
    // ======================================
    setDeletedKeys((prev) => {
      const next = new Set(prev);

      next.add(keyGroup);

      return next;
    });

    // ======================================
    // AMBIL ROWS
    // ======================================
    const rows = allTransaksi.filter((t) => {
      if (!t?.id) return false;

      return (
        String(t.PAYMENT_METODE || "").toUpperCase() === "PEMBELIAN" &&
        makePembelianKey(t) === keyGroup
      );
    });

    if (!rows.length) {
      throw new Error("Data pembelian tidak ditemukan");
    }

    // ======================================
    // DELETE FIREBASE
    // ======================================
    for (const r of rows) {
      await deleteTransaksi(null, r.id);
    }

    // ======================================
    // REDUCE STOCK
    // ======================================
    const qtyDelete = rows.reduce((sum, r) => sum + Number(r.QTY || 0), 0);

    const sku = makeSku(item.brand, item.barang);

    await reduceStock(item.namaToko, sku, qtyDelete);

    // ======================================
    // VOID DELETE
    // ======================================
    const firstRow = rows[0];

    const tokoId = getValidTokoId(firstRow, masterToko);

    if (tokoId) {
      await addTransaksi(tokoId, {
        PAYMENT_METODE: "VOID DELETE",

        CREATED_AT: Date.now(),

        STATUS: "APPROVED",

        KETERANGAN: "DELETE MANUAL PEMBELIAN",

        TANGGAL_TRANSAKSI: firstRow.TANGGAL_TRANSAKSI,

        NO_INVOICE: firstRow.NO_INVOICE,

        NAMA_SUPPLIER: firstRow.NAMA_SUPPLIER,

        NAMA_TOKO: firstRow.NAMA_TOKO,

        NAMA_BRAND: firstRow.NAMA_BRAND,

        NAMA_BARANG: firstRow.NAMA_BARANG,

        QTY: -1,
      });
    }

    alert("✅ Pembelian berhasil dihapus");
  } catch (err) {
    console.error(err);

    alert(err.message || "❌ Gagal delete pembelian");
  }
};
