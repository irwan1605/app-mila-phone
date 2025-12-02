import React, { useEffect, useMemo, useState } from "react";
import { FaSearch, FaHistory, FaExchangeAlt, FaCheckCircle, FaTimesCircle } from "react-icons/fa";
import FirebaseService from "../services/FirebaseService";

/**
 * HISTORY MUTASI IMEI
 * - Menampilkan timeline mutasi per IMEI
 * - Menarik data dari:
 *   1. Transaksi Pembelian (addTransaksi)
 *   2. Transfer Barang (createTransferRequest + Approved)
 * - Realtime Firebase
 */

export default function HistoryMutasiIMEI() {
  const [allTransaksi, setAllTransaksi] = useState([]); // dari master pembelian & penjualan
  const [transferHistory, setTransferHistory] = useState([]); // dari transfer barang
  const [search, setSearch] = useState("");
  const [selectedImei, setSelectedImei] = useState("");

  // ================== LISTENER REALTIME ==================
  useEffect(() => {
    const unsub1 = FirebaseService.listenAllTransaksi((rows) => {
      setAllTransaksi(rows || []);
    });

    const unsub2 = FirebaseService.listenTransferRequests((rows) => {
      setTransferHistory(rows || []);
    });

    return () => {
      unsub1 && unsub1();
      unsub2 && unsub2();
    };
  }, []);

  // ================== DAFTAR IMEI UNIQUE ==================
  const imeiList = useMemo(() => {
    const fromTransaksi = allTransaksi.map((x) => String(x.IMEI || "").trim());
    const fromTransfer = transferHistory.flatMap((x) => x.imeis || []);
    return Array.from(new Set([...fromTransaksi, ...fromTransfer])).filter(Boolean);
  }, [allTransaksi, transferHistory]);

  // ================== TIMELINE MUTASI ==================
  const timeline = useMemo(() => {
    if (!selectedImei) return [];

    const list = [];

    // Riwayat dari pembelian
    allTransaksi
      .filter((t) => String(t.IMEI) === selectedImei)
      .forEach((t) => {
        list.push({
          tanggal: t.TANGGAL_TRANSAKSI,
          jenis: "PEMBELIAN",
          toko: t.NAMA_TOKO,
          barang: t.NAMA_BARANG,
          keterangan: t.KETERANGAN || "PEMBELIAN MASUK",
          status: t.STATUS || "Approved",
        });
      });

    // Riwayat dari transfer
    transferHistory
      .filter((t) => (t.imeis || []).includes(selectedImei))
      .forEach((t) => {
        list.push({
          tanggal: t.tanggal,
          jenis: "TRANSFER",
          toko: `${t.dari} → ${t.ke}`,
          barang: t.barang,
          keterangan: `SJ: ${t.noSuratJalan}`,
          status: t.status,
        });
      });

    return list.sort((a, b) => new Date(b.tanggal) - new Date(a.tanggal));
  }, [selectedImei, allTransaksi, transferHistory]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-800 via-blue-700 to-purple-700 p-4">
      <div className="max-w-6xl mx-auto bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6">
        <h2 className="text-2xl font-bold text-indigo-700 mb-4 flex items-center gap-2">
          <FaHistory /> HISTORY MUTASI IMEI
        </h2>

        {/* ================= PENCARIAN ================= */}
        <div className="mb-4">
          <div className="flex gap-2">
            <input
              list="imei-list"
              value={selectedImei}
              onChange={(e) => setSelectedImei(e.target.value)}
              placeholder="Cari atau Pilih IMEI"
              className="border p-2 rounded-xl w-full"
            />
            <button className="bg-indigo-600 text-white px-4 rounded-xl">
              <FaSearch />
            </button>
          </div>

          <datalist id="imei-list">
            {imeiList.map((i) => (
              <option key={i} value={i} />
            ))}
          </datalist>
        </div>

        {/* ================= TIMELINE ================= */}
        {!selectedImei && (
          <div className="text-center text-slate-400 py-16">
            Pilih IMEI untuk melihat history mutasi
          </div>
        )}

        {selectedImei && (
          <div className="space-y-3">
            {timeline.length === 0 && (
              <div className="text-center text-slate-400 py-8">
                Tidak ada riwayat untuk IMEI ini
              </div>
            )}

            {timeline.map((row, i) => (
              <div
                key={i}
                className="border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
              >
                <div>
                  <p className="font-semibold text-indigo-700">
                    {row.barang} — {row.jenis}
                  </p>
                  <p className="text-xs text-slate-600">{row.tanggal}</p>
                  <p className="text-sm">{row.toko}</p>
                  <p className="text-xs text-slate-500">{row.keterangan}</p>
                </div>

                <div className="flex items-center gap-2">
                  {row.status === "Approved" && (
                    <span className="flex items-center gap-1 text-green-600 text-sm">
                      <FaCheckCircle /> Approved
                    </span>
                  )}

                  {row.status === "Rejected" && (
                    <span className="flex items-center gap-1 text-red-600 text-sm">
                      <FaTimesCircle /> Rejected
                    </span>
                  )}

                  {row.status === "Pending" && (
                    <span className="flex items-center gap-1 text-amber-600 text-sm">
                      <FaExchangeAlt /> Pending
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
