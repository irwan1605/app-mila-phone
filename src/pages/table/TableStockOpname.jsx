// src/pages/table/TableStockOpname.jsx
import React from "react";

export const getStockOpnameDisplayRow = (row = {}) => {
  const lastTransaction = String(row.lastTransaksi || "").toUpperCase();
  const isRefund = lastTransaction.includes("REFUND");
  const isRetur = lastTransaction.includes("RETUR");
  const returnType = isRetur ? "RETUR" : "REFUND";
  const returnQty = isRefund || isRetur ? Math.max(1, Number(row.qty || 0)) : 0;

  return {
    ...row,
    qty: isRefund || isRetur ? returnQty : Number(row.qty || 0),
    statusBarang:
      isRefund || isRetur
        ? `${returnType} (${returnQty})`
        : !row.imei
        ? `NON IMEI (${Number(row.qty || 0)})`
        : Number(row.qty || 0) > 0
        ? "TERSEDIA"
        : "TERJUAL",
    keterangan: lastTransaction.includes("TRANSFER")
      ? "TRANSFER BARANG"
      : isRefund || isRetur
      ? `${returnType} BARANG (${returnQty})`
      : !row.imei
      ? "PEMBELIAN"
      : row.lastTransaksi || "-",
  };
};

function TableStockOpname({
  data = [],
  opnameMap = {},
  setOpnameMap,
  isSuperAdmin,
  onSaveOpname,
  tableRef,
  onVoidOpname,
  // 🔥 NEW
  refundLoadingMap = {},
}) {
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
            const displayRow = getStockOpnameDisplayRow(r);
            // ✅ stok fisik
            const fisik = Number(opnameMap[r.key] ?? "");

            // ✅ selisih
            const selisih = Number.isNaN(fisik)
              ? ""
              : fisik - Number(displayRow.qty || 0);

            return (
              <tr key={r.key} className="hover:bg-gray-50">
                <td className="p-2 border text-center">{i + 1}</td>

                <td className="p-2 border text-center">{r.tanggal || "-"}</td>

                <td className="p-2 border">{r.toko}</td>

                <td className="p-2 border">{r.supplier || "-"}</td>

                <td className="p-2 border">{r.brand}</td>

                <td className="p-2 border font-medium">{r.barang}</td>

                <td className="p-2 border font-mono text-xs">
                  {r.imei || "NON-IMEI"}
                </td>

                {/* ✅ SOLD sudah tidak ada */}
                <td className="p-2 border text-center font-bold">
                  {displayRow.statusBarang}
                </td>

                <td className="p-2 border text-xs text-gray-600">
                  {displayRow.keterangan}
                </td>

                {/* ✅ stok dari engine */}
                <td className="p-2 border text-center">
                  {displayRow.qty}
                </td>

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

export default React.memo(TableStockOpname);
