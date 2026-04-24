import React, { useMemo, useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { db } from "../../services/FirebaseInit";
import { ref, onValue } from "firebase/database";
import { listenKaryawan } from "../../services/FirebaseService";

const rupiah = (n) =>
  Number(n || 0).toLocaleString("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });

export default function TableLaporanPenjualan({ data = [] }) {
  const [keyword, setKeyword] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);
  const [masterKaryawan, setMasterKaryawan] = useState([]);
  const [masterBarang, setMasterBarang] = useState({});

  const pageSize = 10;

  useEffect(() => {
    const dbRef = ref(db, "dataManagement/masterBarang");
  
    onValue(dbRef, (snapshot) => {
      const val = snapshot.val();
  
      console.log("🔥 MASTER BARANG:", val);
  
      setMasterBarang(val || {});
    });
  }, []);

  useEffect(() => {
    const unsub = listenKaryawan((rows) => {
      setMasterKaryawan(Array.isArray(rows) ? rows : []);
    });

    return () => unsub && unsub();
  }, []);

  const karyawanMap = useMemo(() => {
    const map = {};

    masterKaryawan.forEach((k) => {
      const key = String(k.NAMA || "")
        .toLowerCase()
        .trim();

      map[key] = {
        NIK: k.NIK,
        NAMA: k.NAMA,
        JABATAN: k.JABATAN,
        TOKO: k.TOKO_BERTUGAS,
      };
    });

    return map;
  }, [masterKaryawan]);

  // 🔥 TARUH DI SINI
  const headers = [
    "NO",
    "Tgl transaksi",
    "No RESI / INVOICE",
    "MASA KERJA",
    "NIK",
    "NAMA SALES/FL",
    "REFERENSI",
    "TOKO",
    "LEADER",
    "KOMODITI",
    "NAMA BRAND",
    "TYPE UNIT",
    "IMEI / NO MESIN",
    "HARGA UNIT",
    "KATEGORI HARGA",
    "MARKET PRICE",
    "AKSESORIS / SPAREPART / ONGKIR",
    "HARGA AKSESORIS DLL",
    "MP PROTECK",
    "PAYMENT METODE",
    "SYSTEM PAYMENT",
    "TOTAL PAYMENT USER",
    "MDR",
    "POTONGAN MDR",
    "TOTAL",
    "SISA LIMIT UNIT",
    "NO KONTRAK",
    "NAMA AKUN",
    "NO HP",
    "TENOR",
    "DP USER (MERCHANT)",
    "DP USER (TOKO)",
    "REQUEST DP",
    "SALDO TOKO",
    "SALDO FL",
    "SISA",
    "NAMA FL",
    "NAMA TEKNISI",
    "SALES HANDLE",
    "STATUS PICKUP",
    "KETERANGAN",
  ];

  const masterBarangMap = useMemo(() => {
    const map = {};
  
    Object.values(masterBarang || {}).forEach((item) => {
      const key = item.namaBarang?.toLowerCase().trim();
      if (key) {
        map[key] = item;
      }
    });
  
    return map;
  }, [masterBarang]);

  // ===============================
  // 🔥 FLATTEN PER BARANG (LEVEL DETAIL)
  // ===============================
  const tableData = useMemo(() => {
    console.log("DATA MASUK:", data);
    const rows = [];

    (data || []).forEach((trx) => {
      const tanggal = trx.tanggal || trx.TANGGAL_TRANSAKSI || "-";

      const invoice = trx.invoice || trx.NO_INVOICE || "-";

      const user = trx.user || {
        namaSales: trx.NAMA_SALES,
        idPelanggan: trx.ID_PELANGGAN,
        namaPelanggan: trx.NAMA_PELANGGAN,
        noTlpPelanggan: trx.NO_TLP,
        storeHead: trx.STORE_HEAD,
        salesHandle: trx.SALES_HANDLE,
      };

      // 🔥 FIX DISINI
      const items =
        Array.isArray(trx.items) && trx.items.length > 0
          ? trx.items
          : [
              {
                namaBarang: trx.NAMA_BARANG,
                namaBrand: trx.NAMA_BRAND,
                kategoriBarang: trx.KATEGORI_BARANG,
                hargaAktif: trx.HARGA,
                qty: trx.QTY || 1,
                imeiList: trx.IMEI ? [trx.IMEI] : [],
              },
            ];

      items.forEach((item) => {
        const salesName = user.namaSales || "";
        const salesKey = salesName.toLowerCase().trim();
        const salesData = karyawanMap[salesKey] || {};

        const imei = item.imeiList?.join(", ") || item.IMEI || trx.IMEI || "-";
        const barangKey = (item.namaBarang || trx.NAMA_BARANG || "")
  .toLowerCase()
  .trim();

const barangMaster = masterBarangMap[barangKey] || {};

        rows.push({
            NO: rows.length + 1,
          
            "Tgl transaksi": tanggal,
            "No RESI / INVOICE": invoice,
          
            "MASA KERJA": salesData.MASA_KERJA || "-",
          
            NIK: salesData.NIK || user.idPelanggan || "-",
          
            "NAMA SALES/FL": salesData.NAMA || salesName || "-",
          
            REFERENSI: imei,
          
            TOKO: trx.toko || trx.NAMA_TOKO || "-",
          
            LEADER: salesData.LEADER || user.storeHead || "-",
          
            KOMODITI:
              barangMaster.kategoriBarang ||
              item.kategoriBarang ||
              trx.KATEGORI_BARANG ||
              "-",
          
            "NAMA BRAND":
              barangMaster.brand ||
              item.namaBrand ||
              trx.NAMA_BRAND ||
              "-",
          
            "TYPE UNIT":
              barangMaster.namaBarang ||
              item.namaBarang ||
              trx.NAMA_BARANG ||
              "-",
          
            "IMEI / NO MESIN": imei,
          
            "HARGA UNIT":
              item.hargaAktif ||
              trx.HARGA ||
              barangMaster.harga?.srp ||
              0,
          
            "KATEGORI HARGA":
              trx.KATEGORI_HARGA || "SRP",
          
            "MARKET PRICE":
              barangMaster.harga?.srp || 0,
          
            "AKSESORIS / SPAREPART / ONGKIR":
              trx.AKSESORIS || trx.SPAREPART || trx.ONGKIR || "-",
          
            "HARGA AKSESORIS DLL":
              trx.HARGA_AKSESORIS ||
              trx.HARGA_SPAREPART ||
              trx.HARGA_ONGKIR ||
              0,
          
            "MP PROTECK": trx.MP_PROTECK || "-",
          
            "PAYMENT METODE":
              trx.payment?.metode || trx.PAYMENT_METODE || "-",
          
            "SYSTEM PAYMENT":
              trx.payment?.status === "PIUTANG"
                ? "KREDIT"
                : "CASH",
          
            "TOTAL PAYMENT USER":
              trx.payment?.nominalPayment || 0,
          
            MDR: trx.payment?.nominalMdr || 0,
          
            "POTONGAN MDR": trx.payment?.nominalMdr || 0,
          
            TOTAL:
              (item.qty || trx.QTY || 1) *
              (item.hargaAktif ||
                trx.HARGA ||
                barangMaster.harga?.srp ||
                0),
          
            "SISA LIMIT UNIT": trx.SISA_LIMIT || "-",
          
            "NO KONTRAK": trx.NO_KONTRAK || invoice,
          
            "NAMA AKUN": user.namaPelanggan || "-",
          
            "NO HP": user.noTlpPelanggan || "-",
          
            TENOR: trx.payment?.tenor || "-",
          
            "DP USER (MERCHANT)": trx.payment?.dpTalangan || 0,
          
            "DP USER (TOKO)": trx.DP_TOKO || 0,
          
            "REQUEST DP": trx.REQUEST_DP || 0,
          
            "SALDO TOKO": trx.SALDO_TOKO || 0,
          
            "SALDO FL": trx.SALDO_FL || 0,
          
            SISA: trx.payment?.kurangBayar || 0,
          
            "NAMA FL": trx.NAMA_FL || "-",
          
            "NAMA TEKNISI": trx.NAMA_TEKNISI || "-",
          
            "SALES HANDLE": user.salesHandle || "-",
          
            "STATUS PICKUP":
              trx.STATUS || trx.statusPembayaran || "-",
          
            KETERANGAN: trx.keterangan || "-",
          });
      });
    });

    console.log("HASIL TABLE:", rows);
    console.log("DATA RAW:", data);
    console.log("JUMLAH DATA:", data.length);

    return rows;
  }, [data, karyawanMap]);

  // ===============================
  // FILTER
  // ===============================
  const filtered = useMemo(() => {
    return tableData.filter((r) => {
      const text = JSON.stringify(r).toLowerCase();

      const matchKeyword = text.includes(keyword.toLowerCase());

      let matchDate = true;

      if (dateFrom) {
        matchDate = new Date(r.TANGGAL) >= new Date(dateFrom);
      }

      if (matchDate && dateTo) {
        matchDate = new Date(r.TANGGAL) <= new Date(dateTo);
      }

      return matchKeyword && matchDate;
    });
  }, [tableData, keyword, dateFrom, dateTo]);

  // ===============================
  // PAGINATION
  // ===============================
  const pageCount = Math.ceil(filtered.length / pageSize);

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  // ===============================
  // EXPORT EXCEL
  // ===============================
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filtered);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Laporan Penjualan");

    XLSX.writeFile(wb, "Laporan_Penjualan.xlsx");
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <h2 className="font-bold text-lg mb-3">
        📊 TABLE LAPORAN PENJUALAN (DETAIL)
      </h2>

      {/* FILTER */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        <input
          placeholder="Cari..."
          className="border p-1"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="border p-1"
        />

        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="border p-1"
        />

        <button
          onClick={exportExcel}
          className="bg-green-600 text-white px-2 rounded"
        >
          Export Excel
        </button>
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto border">
        <table className="min-w-[3500px] text-xs border-collapse">
          <thead className="bg-gray-100">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="border border-gray-400 px-2 py-2">
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {paged.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                {headers.map((key, j) => (
                  <td key={j} className="border px-2 py-1">
                    {key === "NO"
                      ? row[key]
                      : typeof row[key] === "number"
                      ? rupiah(row[key])
                      : row[key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="flex justify-between mt-3">
        <button disabled={page === 1} onClick={() => setPage(page - 1)}>
          Prev
        </button>

        <span>
          Page {page} / {pageCount || 1}
        </span>

        <button disabled={page === pageCount} onClick={() => setPage(page + 1)}>
          Next
        </button>
      </div>
    </div>
  );
}
