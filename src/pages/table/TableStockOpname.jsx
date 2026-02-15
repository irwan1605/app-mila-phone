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
    const imei = String(item.imei || item.key || "").trim();

    let qty = 0;
    let lastMetode = "";
    let lastStatus = "TERSEDIA";
    let lastTime = 0;

    allTransaksi.forEach((t) => {
      const trxImei = String(t.IMEI || t.NOMOR_UNIK || "").trim();
      if (trxImei !== imei) return;

      const metode = String(t.PAYMENT_METODE || "").toUpperCase();
      const status = String(t.STATUS || "").toUpperCase();
      const time = Number(t.CREATED_AT || 0);

      const isRefund = status === "REFUND";

      // =====================
      // HITUNG STOCK
      // =====================
      if (
        metode === "PEMBELIAN" ||
        metode === "TRANSFER_MASUK" ||
        metode === "STOK OPNAME" ||
        isRefund
      ) {
        qty += 1;
      }

      // =====================
// KELUAR (HANYA PENJUALAN)
// =====================
if (metode === "PENJUALAN" && !isRefund) {
  qty -= 1;
}

      // =====================
      // TRANSAKSI TERAKHIR
      // =====================
      // if (time >= lastTime) {
      //   lastTime = time;

      //   if (isRefund) {
      //     lastMetode = "REFUND";
      //     lastStatus = "TERSEDIA";

      //   } else {
      //     lastMetode = metode;
      //     lastStatus = metode === "PENJUALAN" ? "TERJUAL" : "TERSEDIA";
      //   }

      // }
      if (time >= lastTime) {
        lastTime = time;

        // =============================
        // PRIORITAS STATUS TERAKHIR
        // =============================

        // ✅ REFUND → barang kembali tersedia
        if (isRefund) {
          lastMetode = "REFUND";
          lastStatus = "TERSEDIA";
        }

        // ✅ TRANSFER MASUK → barang tersedia
        else if (metode === "TRANSFER_MASUK") {
          lastMetode = "TRANSFER_MASUK";
          lastStatus = "TERSEDIA";
        }

        // ✅ PEMBELIAN → tersedia
        else if (metode === "PEMBELIAN") {
          lastMetode = "PEMBELIAN";
          lastStatus = "TERSEDIA";
        }

        // ✅ PENJUALAN → terjual
        else if (metode === "PENJUALAN") {
          lastMetode = "PENJUALAN";
          lastStatus = "TERJUAL";
        }

        // default
        else {
          lastMetode = metode;
          lastStatus = "TERSEDIA";
        }
      }
    });

    const isTransfer =
      lastMetode === "TRANSFER_MASUK" || lastMetode === "TRANSFER_KELUAR";

    return {
      qty,
      status: isTransfer ? "TERSEDIA" : qty > 0 ? "TERSEDIA" : "TERJUAL",

      isSold: !isTransfer && qty <= 0,
      isRefund: lastMetode === "REFUND",
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

                  {r.lastTransaksi === "PENJUALAN" && (
                    <span className="ml-2 text-xs bg-red-500 text-white px-2 py-0.5 rounded">
                      SOLD
                    </span>
                  )}
                </td>

                <td className="p-2 border font-mono text-xs">
                  {r.imei ? r.imei : "NON-IMEI"}
                </td>

                <td className="p-2 border text-center font-bold">
                  {r.qty > 0 ? "TERSEDIA" : "TERJUAL"}
                </td>

                <td className="p-2 border text-xs text-gray-600">
                  {stockInfo.isRefund
                    ? "REFUND"
                    : stockInfo.isTransfer
                    ? "TRANSFER BARANG"
                    : r.keterangan || "-"}
                </td>

                <td className="p-2 border text-center">{r.qty}</td>

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
