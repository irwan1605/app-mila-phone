export function deriveStockFromTransaksi(transaksi = []) {
  const map = {};

  transaksi.forEach((t) => {
    if (!t) return;

    const metode = String(t.PAYMENT_METODE || "").toUpperCase();
    const status = String(t.STATUS || "").toUpperCase();

    // hanya transaksi valid
    if (status !== "APPROVED") return;

    const toko = t.NAMA_TOKO || "CILANGKAP PUSAT";

    const key =
      t.IMEI?.trim() ||
      t.NOMOR_UNIK?.trim() ||
      `${t.NAMA_BRAND}|${t.NAMA_BARANG}`;

    if (!key) return;

    const qty = t.IMEI ? 1 : Number(t.QTY || 0);

    if (!map[toko]) map[toko] = {};

    if (!map[toko][key]) {
      map[toko][key] = {
        toko,
        key,
        brand: t.NAMA_BRAND || "",
        barang: t.NAMA_BARANG || "",
        qty: 0,
        lastStatus: "TERSEDIA",
        lastTransaksi: "",
        lastTime: 0,
        keterangan: "",
      };
    }

    const stock = map[toko][key];

    const time =
      Number(t.CREATED_AT) ||
      Number(t.createdAt) ||
      Date.now();

    // ======================
    // STOCK MASUK
    // ======================
    if (
      metode === "PEMBELIAN" ||
      metode === "TRANSFER_MASUK" ||
      metode === "STOK OPNAME" ||
      metode === "REFUND"
    ) {
      stock.qty += qty;
    }

    // ======================
    // STOCK KELUAR
    // ======================
    if (
      metode === "PENJUALAN" ||
      metode === "TRANSFER_KELUAR"
    ) {
      stock.qty -= qty;
    }

    // ======================
    // LAST TRANSAKSI (PALING BARU)
    // ======================
   // REFUND selalu menang
if (metode === "REFUND" || time >= stock.lastTime) {
      stock.lastTime = time;
      stock.lastTransaksi = metode;

      if (metode === "REFUND") {
        stock.lastStatus = "TERSEDIA";
        stock.keterangan = "REFUND";
      } else if (
        metode === "PENJUALAN" ||
        metode === "TRANSFER_KELUAR"
      ) {
        stock.lastStatus = "TERJUAL";
        stock.keterangan = "";
      } else {
        stock.lastStatus = "TERSEDIA";
      }
    }
  });

  return map;
}
