export const getFinalIMEIStatus = ({
  imei,
  detailStock = {},
}) => {
  const target = String(imei || "")
    .trim()
    .toUpperCase();

  let stock = null;

  // Cari berdasarkan KEY Firebase
  const foundKey = Object.keys(detailStock || {}).find(
    (key) =>
      String(key || "")
        .trim()
        .toUpperCase() === target
  );

  if (foundKey) {
    stock = detailStock[foundKey];
  }

  // Cari berdasarkan field imei
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

  if (!stock) {
    console.warn(
      "IMEI TIDAK DITEMUKAN:",
      imei
    );

    return "NOT_FOUND";
  }

  return String(
    stock.status ||
    stock.STATUS ||
    "AVAILABLE"
  )
    .trim()
    .toUpperCase();
};