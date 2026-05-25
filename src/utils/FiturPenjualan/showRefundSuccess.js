// ======================================
// 🔥 SHOW REFUND SUCCESS
// ======================================
export const showRefundSuccess = ({
  brand = "",
  barang = "",
  qty = 1,
  toko = "",
  imei = "",
}) => {
  const isImei =
    imei &&
    !["", "NON IMEI", "NON-IMEI", "NONIMEI"].includes(
      String(imei).trim().toUpperCase()
    );

  // ======================================
  // 🔥 MESSAGE
  // ======================================
  const message = `
  ✅ REFUND BARANG PENJUALAN BERHASIL
  
  🏪 TOKO :
  ${toko || "-"}
  
  📦 BRAND :
  ${brand || "-"}
  
  🛒 BARANG :
  ${barang || "-"}
  
  ${
    isImei
      ? `📱 IMEI :
  ${imei}`
      : `📊 QTY :
  ${qty}`
  }
  
  🔄 STOCK BERHASIL DIKEMBALIKAN
  `;

  // ======================================
  // 🔥 SHOW
  // ======================================
  alert(message);

  console.log("✅ REFUND SUCCESS", {
    toko,
    brand,
    barang,
    qty,
    imei,
  });
};
