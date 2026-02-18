// ======================================
// MASTER TOKO MAP
// ======================================
const TOKO_ID_MAP = {
  1: "CILANGKAP PUSAT",
  2: "CIBINONG",
  3: "GAS ALAM",
  4: "CITEUREUP",
  5: "CIRACAS",
  6: "METLAND 1",
  7: "METLAND 2",
  8: "PITARA",
  9: "KOTA WISATA",
  10: "SAWANGAN",
};

// ======================================
// FIREBASE ID → NAMA TOKO
// ======================================
const TOKO_FIREBASE_MAP = {
  "-OhWaja6WX9umkosbDVq": "CILANGKAP PUSAT",
  "-OhWd1fLKRcZAhuYOcDV": "CIBINONG",
};

// ======================================
// NORMALIZE TOKO
// ======================================
const normalizeToko = (value) => {
  if (!value) return null;

  let toko = String(value)
    .toUpperCase()
    .replace(/^TOKO\s+/i, "") // hapus "TOKO "
    .trim();

  // FIREBASE ID
  if (TOKO_FIREBASE_MAP[toko]) {
    toko = TOKO_FIREBASE_MAP[toko];
  }

  // mapping angka
  if (TOKO_ID_MAP[Number(toko)]) {
    toko = TOKO_ID_MAP[Number(toko)];
  }

  return toko;
};


// ======================================
// DERIVE STOCK ENGINE
// ======================================
export function deriveStockFromTransaksi(transaksi = []) {
  const map = {};

  const ensureStock = (toko, key, t) => {
    if (!toko || !key) return null;

    if (!map[toko]) map[toko] = {};

    if (!map[toko][key]) {
      map[toko][key] = {
        toko,
        key,
        brand: t.NAMA_BRAND || t.brand || "",
        barang: t.NAMA_BARANG || t.barang || "",
        qty: 0,
      };
    }

    return map[toko][key];
  };

  

  transaksi.forEach((t) => {
    if (!t) return;

    const status = String(t.STATUS || t.status || "").toUpperCase();

    // ✅ APPROVED dan REFUND boleh dihitung
    if (!["APPROVED", "REFUND"].includes(status)) return;
    

    // ======================================
    // NORMALIZE METODE
    // ======================================
    let metode = String(t.PAYMENT_METODE || "").toUpperCase();

    // format transfer baru
    if (!metode && t.dari && t.ke) {
      metode = "TRANSFER_KELUAR";
    }

    // ======================================
    // NORMALIZE TOKO
    // ======================================
    const tokoAsal = normalizeToko(
      t.NAMA_TOKO ||
      t.dari ||
      t.tokoPengirim ||
      t.TOKO ||
      t.tokoId
    );
    

    const tokoTujuan = normalizeToko(
      t.TUJUAN_TOKO ||
      t.ke ||
      t.tokoPenerima
    );

    // ======================================
    // HANDLE TRANSFER IMEI
    // ======================================
    const imeiList =
      t.imeis ||
      (t.IMEI ? [t.IMEI] : []);

    if (metode === "TRANSFER_KELUAR" && imeiList.length) {
      imeiList.forEach((imei) => {
        const key = String(imei).trim();

        const asal = ensureStock(tokoAsal, key, t);
        if (asal) asal.qty -= 1;

        const tujuan = ensureStock(tokoTujuan, key, t);
        if (tujuan) tujuan.qty += 1;
      });

      return;
    }

    // ======================================
    // NORMAL ITEM
    // ======================================
    const key =
      (t.IMEI && String(t.IMEI).trim()) ||
      (t.NOMOR_UNIK && String(t.NOMOR_UNIK).trim()) ||
      `${t.NAMA_BRAND}|${t.NAMA_BARANG}`;

    if (!key) return;

    const qty = t.IMEI ? 1 : Number(t.QTY || 0);

    // ======================================
    // STOCK MASUK
    // ======================================
    if (
      metode === "PEMBELIAN" ||
      metode === "STOK OPNAME" ||
      metode === "REFUND"
    ) {
      const stock = ensureStock(tokoAsal, key, t);
      if (stock) stock.qty += qty;
    }

    // ======================================
    // STOCK KELUAR
    // ======================================
    if (metode === "PENJUALAN") {
      const stock = ensureStock(tokoAsal, key, t);
      if (stock) stock.qty -= qty;
    }
  });

  return map;
}
