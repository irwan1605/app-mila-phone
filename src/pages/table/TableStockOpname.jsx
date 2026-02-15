// src/pages/table/TableStockOpname.jsx
import React from "react";
import { FaSave } from "react-icons/fa";

export default function TableStockOpname({
  data = [],
  allTransaksi = [], // ✅ TAMBAH
  opnameMap = {},
  setOpnameMap,
  isSuperAdmin,
  onSaveOpname,
  tableRef,
  onVoidOpname,
}) {

  const getStockInfo = (item) => {

    const imeiKey = String(item.imei || "").trim();
  
    const skuKey = `${item.brand}|${item.barang}`.trim();
  
    let qty = 0;
    let lastMetode = "";
    let lastTime = 0;
  

  allTransaksi.forEach((t) => {
    const trxKey =
    t.IMEI && String(t.IMEI).trim()
      ? String(t.IMEI).trim()
      : `${t.NAMA_BRAND}|${t.NAMA_BARANG}`.trim();
  
  const currentKey = imeiKey || skuKey;
  
  if (trxKey !== currentKey) return;
    

    const metode = String(t.PAYMENT_METODE || "").toUpperCase();
    const status = String(t.STATUS || "").toUpperCase();
    const time = Number(t.CREATED_AT || 0);

    const isRefundLocal = status === "REFUND";

    // =====================
    // HITUNG STOCK
    // =====================
    if (
      metode === "PEMBELIAN" ||
      metode === "TRANSFER_MASUK" ||
      metode === "STOK OPNAME" ||
      isRefundLocal
    ) {
      qty += 1;
    }

    if (metode === "PENJUALAN" && !isRefundLocal) {
      qty -= 1;
    }

    // =====================
    // TRANSAKSI TERAKHIR
    // =====================
    if (time >= lastTime) {
      lastTime = time;

      if (isRefundLocal) {
        lastMetode = "REFUND";
      } else {
        lastMetode = metode;
      }
    }
  });

  const isTransfer =
    lastMetode === "TRANSFER_MASUK" ||
    lastMetode === "TRANSFER_KELUAR";

  const isRefund = lastMetode === "REFUND";

  // ✅ SOLD hanya jika benar-benar terakhir PENJUALAN
  const isSold =
    lastMetode === "PENJUALAN" &&
    qty <= 0 &&
    !isRefund &&
    !isTransfer;

  return {
    qty,
    status: isSold ? "TERJUAL" : "TERSEDIA",
    isSold,
    isRefund,
    isTransfer,
    lastMetode,
  };
};


  const getLastTransaksi = (imei) => {
    const trx = allTransaksi
      .filter(
        (t) =>
          String(t.IMEI || t.NOMOR_UNIK || "").trim() === String(imei).trim()
      )
      .sort((a, b) => (b.CREATED_AT || 0) - (a.CREATED_AT || 0));

    return trx[0] || null;
  };

  return (
    <div className="overflow-x-auto p-2" ref={tableRef}>
      <table className="w-full text-sm border">
        <thead className="bg-gray-200">
          <tr>
            <th className="p-2 border">No</th>
            <th className="p-2 border">Tanggal</th>
            <th className="p-2 border">Nama Toko</th>
            <th className="p-2 border">Nama Supplier</th>
            <th className="p-2 border">Nama Brand</th>
            <th className="p-2 border">Nama Barang</th>
            <th className="p-2 border">No IMEI / SKU</th>
            <th className="p-2 border">Status</th>
            <th className="p-2 border">Keterangan</th>
            <th className="p-2 border">Stok Sistem</th>
            <th className="p-2 border">Stok Fisik</th>
            <th className="p-2 border">Selisih</th>

            <th className="p-2 border">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => {
            const stockInfo = getStockInfo(r);
            const isTransfer =
              stockInfo.lastMetode === "TRANSFER_MASUK" ||
              stockInfo.lastMetode === "TRANSFER_KELUAR";

            const fisik = Number(opnameMap[r.key] ?? "");
            const selisih = Number.isNaN(fisik) ? "" : fisik - stockInfo.qty;

            return (
              <tr key={r.key} className="hover:bg-gray-50">
                <td className="p-2 border text-center">{i + 1}</td>

                <td className="p-2 border text-center">{r.tanggal || "-"}</td>

                <td className="p-2 border">{r.toko}</td>

                <td className="p-2 border">{r.supplier || "-"}</td>

                <td className="p-2 border">{r.brand}</td>

                <td className="p-2 border font-medium">
                  {r.barang}

                  {stockInfo.isSold && (
                      <span className="ml-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded">
                        SOLD
                      </span>
                    )}
                </td>

                <td className="p-2 border font-mono text-xs">
                  {r.imei ? r.imei : "NON-IMEI"}
                </td>

                <td className="p-2 border text-center font-bold">
                {stockInfo.isSold ? "TERJUAL" : "TERSEDIA"}
                </td>

                <td className="p-2 border text-xs text-gray-600">
                  {stockInfo.isRefund
                    ? "REFUND"
                    : stockInfo.isTransfer
                    ? "TRANSFER BARANG"
                    : r.keterangan || "-"}
                </td>

                <td className="p-2 border text-center">{stockInfo.qty}</td>

                <td className="p-2 border">
                  <input
                    className="border p-1 w-20 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
                    value={opnameMap[r.key] ?? ""}
                    onChange={(e) =>
                      setOpnameMap((m) => ({
                        ...m,
                        [r.key]: e.target.value,
                      }))
                    }
                  />
                </td>

                <td
                  className={`p-2 border text-center ${
                    selisih < 0
                      ? "text-red-600"
                      : selisih > 0
                      ? "text-green-600"
                      : ""
                  }`}
                >
                  {selisih === "" ? "-" : selisih}
                </td>

                <td className="p-2 border text-center space-x-1">
                  {isSuperAdmin ? (
                    <>
                      <button
                        onClick={() => onSaveOpname(r)}
                        className="bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                        title="Simpan Opname"
                      >
                        💾
                      </button>

                      {r.hasOpname && (
                        <button
                          onClick={() => onVoidOpname(r)}
                          className="bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                          title="VOID / Netralisasi"
                        >
                          VOID
                        </button>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-400 text-xs italic">
                      Tidak ada akses
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
