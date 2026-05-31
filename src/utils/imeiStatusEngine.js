import { canResellIMEI } from "./canResellIMEI";

export const getFinalIMEIStatus = ({
  imei,
  detailStock = {},
}) => {
  const target = String(imei || "")
    .trim()
    .toUpperCase();

  let stock = null;

  // =====================================
  // CARI BERDASARKAN KEY FIREBASE
  // =====================================
  const foundKey = Object.keys(detailStock || {}).find(
    (key) =>
      String(key || "")
        .trim()
        .toUpperCase() === target
  );

  if (foundKey) {
    stock = detailStock[foundKey];
  }

  // =====================================
  // CARI BERDASARKAN FIELD IMEI
  // =====================================
  if (!stock) {
    stock = Object.values(detailStock || {}).find(
      (item) =>
        String(
          item?.imei ||
            item?.IMEI ||
            ""
        )
          .trim()
          .toUpperCase() === target
    );
  }

  // =====================================
  // IMEI TIDAK DITEMUKAN
  // =====================================
  if (!stock) {
    console.warn(
      "IMEI TIDAK DITEMUKAN:",
      imei
    );
  
    // =====================================
    // FALLBACK AGAR TIDAK MEMBLOKIR
    // REFUND / TRANSFER / REJECT
    // =====================================
  
    return "AVAILABLE";
  }

  // =====================================
  // REFUND / REJECT / TRANSFER
  // BOLEH DIJUAL LAGI
  // =====================================
  if (canResellIMEI(stock)) {
    console.log(
      "♻️ READY RE-SALE:",
      imei
    );

    return "AVAILABLE";
  }

  // =====================================
  // SOLD
  // =====================================
  if (
    stock?.sold === true ||
    String(stock?.status || "")
      .toUpperCase()
      .trim() === "SOLD"
  ) {
    return "SOLD";
  }

  // =====================================
  // STATUS DARI FIREBASE
  // =====================================
  const finalStatus = String(
    stock?.status ||
      stock?.STATUS ||
      "AVAILABLE"
  )
    .trim()
    .toUpperCase();

  console.log(
    "FINAL STATUS:",
    imei,
    finalStatus
  );

  return finalStatus;
};