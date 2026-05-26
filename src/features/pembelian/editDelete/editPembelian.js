import {
  updateTransaksi,
  deleteTransaksi,
  addTransaksi,
  addStock,
  reduceStock,
  updateMasterBarangHarga,
  addLogPembelian,

  // ✅ TAMBAHAN
  listenMasterSupplier,
  listenMasterBarangHarga,
  addMasterSupplier,
  addMasterBarangHarga,
  updateMasterBarang,
} from "../../../services/FirebaseService";

const removeUndefined = (obj) => {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, v]) => v !== undefined)
  );
};

// ======================================
// KATEGORI IMEI
// ======================================
const KATEGORI_WAJIB_IMEI = ["SEPEDA LISTRIK", "MOTOR LISTRIK", "HANDPHONE"];

// ======================================
// SKU
// ======================================
const makeSku = (brand, barang) =>
  `${(brand || "").trim()}_${(barang || "").trim()}`.replace(/\s+/g, "_");

// ======================================
// NORMALIZE TEXT
// ======================================
const normalizeText = (txt) =>
  String(txt || "")
    .trim()
    .toUpperCase();

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
// GET TOKO ID
// ======================================
const getValidTokoId = (row, masterToko = []) => {
  if (row?.tokoId) return row.tokoId;

  if (row?.TOKO_ID) return row.TOKO_ID;

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
// SAVE EDIT PEMBELIAN
// ======================================
export const saveEditPembelian = async ({
  editData,

  allTransaksi = [],

  stockSnapshot = {},

  masterToko = [],

  validateImeisEdit,
}) => {
  try {
    if (!editData) return;

    const oldToko = editData.originalToko || "CILANGKAP PUSAT";

    const newToko = editData.namaToko || "CILANGKAP PUSAT";

    const sku = makeSku(editData.brand, editData.barang);

    const isKategoriImei = KATEGORI_WAJIB_IMEI.includes(editData.kategoriBrand);

    // ======================================
    // AMBIL DATA TRANSAKSI LAMA
    // ======================================
    const rows = (allTransaksi || []).filter((t) => {
      if (String(t.PAYMENT_METODE || "").toUpperCase() !== "PEMBELIAN") {
        return false;
      }

      const k = makePembelianKey(t);

      return k === editData.originalKey;
    });

    if (!rows.length) {
      throw new Error("Data pembelian tidak ditemukan");
    }

    const oldSku = makeSku(rows?.[0]?.NAMA_BRAND, rows?.[0]?.NAMA_BARANG);

    // ======================================
    // VALIDASI TOKO
    // ======================================
    const tokoExist = masterToko.some(
      (t) => normalizeText(t.nama) === normalizeText(newToko)
    );

    if (!tokoExist) {
      throw new Error(`❌ MASTER TOKO "${newToko}" tidak ditemukan`);
    }

    // ======================================
    // UPDATE MASTER BARANG & HARGA
    // ======================================
    if (editData.masterHargaId) {
      const payloadHarga = {
        namaMasterBrand: editData.brand || "",

        namaKategoriBrand: editData.kategoriBrand || "",

        tipeNamaBarang: editData.barang || "",

        hargaSRP: Number(editData.hargaSRP || 0),

        hargaGrosir: Number(editData.hargaGrosir || 0),

        hargaReseller: Number(editData.hargaReseller || 0),

        harga: {
          srp: Number(editData.hargaSRP || 0),

          grosir: Number(editData.hargaGrosir || 0),

          reseller: Number(editData.hargaReseller || 0),
        },

        updatedAt: Date.now(),
      };

      await updateMasterBarangHarga(editData.masterHargaId, payloadHarga);

      // ======================================
      // UPDATE MASTER BARANG
      // ======================================
      if (editData.masterBarangId) {
        await updateMasterBarang(editData.masterBarangId, {
          brand: editData.brand || "",

          namaBarang: editData.barang || "",

          kategoriBarang: String(editData.kategoriBrand || "").toUpperCase(),

          harga: {
            srp: Number(editData.hargaSRP || 0),

            grosir: Number(editData.hargaGrosir || 0),

            reseller: Number(editData.hargaReseller || 0),
          },

          updatedAt: Date.now(),
        });
      }
    }

    // ======================================
    // ORIGINAL QTY
    // ======================================
    const originalQty = rows.reduce((sum, r) => sum + Number(r.QTY || 0), 0);

    // ======================================
    // HITUNG QTY BARU
    // ======================================
    let imeis = [];

    let newQty = originalQty;

    if (isKategoriImei) {
      imeis = String(editData.imeiList || "")
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);

      // ======================================
      // VALIDASI IMEI
      // ======================================
      if (validateImeisEdit) {
        const err = validateImeisEdit(imeis, editData.originalKey, rows);

        if (err.length) {
          throw new Error(err.join("\n"));
        }
      }

      newQty = imeis.length;
    } else {
      newQty = Number(editData.totalQty || originalQty);
    }

    // ======================================
    // DIFF QTY
    // ======================================
    const diffQty = newQty - originalQty;

    // ======================================
    // VALIDASI STOCK
    // ======================================
    const stockReal = stockSnapshot?.[newToko]?.[sku]?.qty || 0;

    const safeStock = stockReal + originalQty;

    if (diffQty < 0 && safeStock < Math.abs(diffQty)) {
      throw new Error(`❌ Stok ${newToko} tidak mencukupi`);
    }

    // ======================================
    // PINDAH TOKO
    // ======================================
    if (oldToko !== newToko) {
      await reduceStock(oldToko, sku, originalQty);

      await addStock(newToko, sku, {
        brand: editData.brand,

        barang: editData.barang,

        qty: newQty,
      });
    } else {
      // ======================================
      // UPDATE STOCK SELISIH
      // ======================================
      if (diffQty < 0) {
        await reduceStock(newToko, sku, Math.abs(diffQty));
      }

      if (diffQty > 0) {
        await addStock(newToko, sku, {
          brand: editData.brand,

          barang: editData.barang,

          qty: diffQty,
        });
      }
    }

    // ======================================
    // AUTO MASTER SUPPLIER
    // ======================================
    try {
      const supplierExist = allTransaksi.some(
        (x) =>
          normalizeText(x.NAMA_SUPPLIER) === normalizeText(editData.supplier)
      );

      if (!supplierExist && editData.supplier) {
        await addMasterSupplier({
          namaSupplier: editData.supplier,
          noTelpon: "",
          alamat: "",
          createdAt: Date.now(),
        });
      }
    } catch (err) {
      console.warn("AUTO MASTER SUPPLIER ERROR:", err);
    }

    // ======================================
    // SMART EDIT IMEI
    // ======================================
    if (isKategoriImei) {
      const oldImeis = rows.map((r) => String(r.IMEI || "").trim());

      const newImeis = imeis;

      const toAdd = newImeis.filter((im) => !oldImeis.includes(im));

      const toDelete = oldImeis.filter((im) => !newImeis.includes(im));

      const toKeep = newImeis.filter((im) => oldImeis.includes(im));

      // ======================================
      // DELETE IMEI
      // ======================================
      for (const im of toDelete) {
        const row = rows.find((r) => String(r.IMEI).trim() === im);

        if (!row?.id) continue;

        const tokoId = getValidTokoId(row, masterToko);

        if (!tokoId) continue;

        await deleteTransaksi(tokoId, row.id);
      }

      // ======================================
      // ADD IMEI BARU
      // ======================================
      for (const im of toAdd) {
        const exist = allTransaksi.some((x) => {
          if (String(x.PAYMENT_METODE || "").toUpperCase() !== "PEMBELIAN") {
            return false;
          }

          return String(x.IMEI || "").trim() === String(im).trim();
        });

        if (exist) {
          console.warn("IMEI SUDAH ADA:", im);

          continue;
        }

        const firstRow = rows[0];

        const tokoId = getValidTokoId(firstRow, masterToko);

        if (!tokoId) {
          throw new Error("TOKO ID tidak ditemukan");
        }

        const cleanRow = {
          ...firstRow,
        };

        delete cleanRow.id;

        await addTransaksi(
          tokoId,
          removeUndefined({
            ...cleanRow,

            TANGGAL_TRANSAKSI: editData.tanggal,

            NO_INVOICE: editData.noDo,

            NAMA_SUPPLIER: editData.supplier,

            NAMA_TOKO: newToko,

            NAMA_BRAND: editData.brand,

            KATEGORI_BRAND: editData.kategoriBrand,

            NAMA_BARANG: editData.barang,

            IMEI: String(im).trim(),

            QTY: 1,

            HARGA_SUPLAYER: Number(editData.hargaSup || 0),

            HARGA_UNIT: Number(editData.hargaSup || 0),

            TOTAL: Number(editData.hargaSup || 0),

            HARGA_SRP: Number(editData.hargaSRP || 0),

            HARGA_GROSIR: Number(editData.hargaGrosir || 0),

            HARGA_RESELLER: Number(editData.hargaReseller || 0),

            NOMOR_UNIK: `PEMBELIAN|${editData.brand}|${editData.barang}|${im}`,

            PAYMENT_METODE: "PEMBELIAN",

            STATUS: "Approved",

            CREATED_AT: Date.now(),

            UPDATED_AT: Date.now(),

            LAST_EDIT: Date.now(),

            EDIT_BY: "SYSTEM",
          })
        );
      }

      // ======================================
      // UPDATE EXISTING IMEI
      // ======================================
      for (const r of rows) {
        if (toKeep.includes(String(r.IMEI || "").trim())) {
          const tokoId = getValidTokoId(r, masterToko);

          if (!tokoId) continue;

          await updateTransaksi(tokoId, r.id, {
            ...r,

            UPDATED_AT: Date.now(),
            LAST_EDIT: Date.now(),

            EDIT_BY: "SYSTEM",

            TANGGAL_TRANSAKSI: editData.tanggal,

            NO_INVOICE: editData.noDo,

            NAMA_SUPPLIER: editData.supplier,

            NAMA_TOKO: newToko,

            NAMA_BRAND: editData.brand,

            KATEGORI_BRAND: editData.kategoriBrand,

            NAMA_BARANG: editData.barang,

            QTY: 1,

            IMEI: String(r.IMEI || "").trim(),

            NOMOR_UNIK: `PEMBELIAN|${editData.brand}|${
              editData.barang
            }|${String(r.IMEI || "").trim()}`,

            HARGA_SUPLAYER: Number(editData.hargaSup || 0),

            HARGA_UNIT: Number(editData.hargaSup || 0),

            TOTAL: Number(editData.hargaSup || 0),

            HARGA_SRP: Number(editData.hargaSRP || 0),

            HARGA_GROSIR: Number(editData.hargaGrosir || 0),

            HARGA_RESELLER: Number(editData.hargaReseller || 0),
          });
        }
      }
    }

    // ======================================
    // NON IMEI
    // ======================================
    else {
      const r = rows[0];

      const tokoId = getValidTokoId(r, masterToko);

      if (!tokoId) {
        throw new Error("TOKO ID tidak ditemukan");
      }

      await updateTransaksi(tokoId, r.id, {
        ...r,
        UPDATED_AT: Date.now(),
        LAST_EDIT: Date.now(),

        TANGGAL_TRANSAKSI: editData.tanggal,

        NO_INVOICE: editData.noDo,

        NAMA_SUPPLIER: editData.supplier,

        NAMA_TOKO: newToko,

        NAMA_BRAND: editData.brand,

        KATEGORI_BRAND: editData.kategoriBrand,

        NAMA_BARANG: editData.barang,

        QTY: Number(editData.totalQty || 0),

        HARGA_SUPLAYER: Number(editData.hargaSup || 0),

        HARGA_UNIT: Number(editData.hargaSup || 0),

        TOTAL: Number(editData.hargaSup || 0) * Number(editData.totalQty || 0),

        HARGA_SRP: Number(editData.hargaSRP || 0),

        HARGA_GROSIR: Number(editData.hargaGrosir || 0),

        HARGA_RESELLER: Number(editData.hargaReseller || 0),

        EDIT_BY: "SYSTEM",
      });
    }

    // ======================================
    // LOG PEMBELIAN
    // ======================================
    await addLogPembelian({
      action: "EDIT_PEMBELIAN",

      user: "SYSTEM",

      oldToko,

      newToko,

      brand: editData.brand,

      barang: editData.barang,

      originalQty,

      newQty,

      diffQty,

      createdAt: Date.now(),
    });

    return {
      success: true,
    };
  } catch (err) {
    console.error("saveEditPembelian ERROR:", err);

    return {
      success: false,

      message: err?.message || "❌ Gagal edit pembelian",
    };
  }
};
