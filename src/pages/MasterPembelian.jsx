// src/pages/MasterPembelian.jsx
import React, { useEffect, useMemo, useState, useRef } from "react";
import {
  listenAllTransaksi,
  addTransaksi,
  updateTransaksi,
  deleteTransaksi,
} from "../services/FirebaseService";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import {
  FaEdit,
  FaTrash,
  FaSave,
  FaSearch,
  FaFileExcel,
  FaFilePdf,
  FaPlus,
  FaTimes,
} from "react-icons/fa";

const fallbackTokoNames = [
  "CILANGKAP PUSAT",
  "CIBINONG",
  "GAS ALAM",
  "CITEUREUP",
  "CIRACAS",
  "METLAND 1",
  "METLAND 2",
  "PITARA",
  "KOTA WISATA",
  "SAWANGAN",
];

const fmt = (n) => {
  try {
    return Number(n || 0).toLocaleString("id-ID");
  } catch {
    return String(n || "");
  }
};

export default function MasterPembelian() {
  const [allTransaksi, setAllTransaksi] = useState([]);
  const [search, setSearch] = useState("");
  // ===== PAGINATION STATE =====
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const tableRef = useRef(null);

  // MODAL EDIT
  const [editData, setEditData] = useState(null);
  const [showEdit, setShowEdit] = useState(false);

  // MODAL TAMBAH
  const [showTambah, setShowTambah] = useState(false);
  const [tambahForm, setTambahForm] = useState({
    tanggal: "",
    supplier: "",
    brand: "",
    barang: "",
    hargaSup: "",
    hargaUnit: "",
    qty: 1,
    imeiList: "",
    noInvoice: "",
    namaToko: "CILANGKAP PUSAT", // ✅ default langsung PUSAT
  });

  // ===== LISTENER FIREBASE (REALTIME) =====
  useEffect(() => {
    const unsub =
      typeof listenAllTransaksi === "function"
        ? listenAllTransaksi((list) => {
            setAllTransaksi(Array.isArray(list) ? list : []);
          })
        : null;

    return () => unsub && unsub();
  }, []);

  // ===== GROUP DATA PEMBELIAN (per Tanggal + Supplier + Brand + Barang) =====
  const groupedPembelian = useMemo(() => {
    const map = {};

    (allTransaksi || []).forEach((x) => {
      if ((x.PAYMENT_METODE || "").toUpperCase() !== "PEMBELIAN") return;

      const key = `${x.TANGGAL_TRANSAKSI || ""}|${x.NAMA_SUPPLIER || ""}|${
        x.NAMA_BRAND || ""
      }|${x.NAMA_BARANG || ""}`;

      if (!map[key]) {
        map[key] = {
          key,
          tanggal: x.TANGGAL_TRANSAKSI || "",
          supplier: x.NAMA_SUPPLIER || "",
          brand: x.NAMA_BRAND || "",
          barang: x.NAMA_BARANG || "",
          hargaSup: Number(x.HARGA_SUPLAYER || 0),
          hargaUnit: Number(x.HARGA_UNIT || 0),
          noInvoice: x.NO_INVOICE || "",
          imeis: [],
          totalQty: 0,
          totalHargaSup: 0,
          totalHargaUnit: 0,
        };
      }

      const qty = Number(x.QTY || 0);
      const hSup = Number(x.HARGA_SUPLAYER || map[key].hargaSup || 0);
      const hUnit = Number(x.HARGA_UNIT || map[key].hargaUnit || 0);

      map[key].totalQty += qty;
      map[key].totalHargaSup += qty * hSup;
      map[key].totalHargaUnit += qty * hUnit;

      // update sample unit price
      map[key].hargaSup = hSup;
      map[key].hargaUnit = hUnit;

      if (x.IMEI && String(x.IMEI).trim() !== "") {
        map[key].imeis.push(String(x.IMEI).trim());
      }
    });

    return map;
  }, [allTransaksi]);

  // ===== FILTER SEARCH =====
  const filteredPurchases = useMemo(() => {
    const q = (search || "").toLowerCase();

    return Object.entries(groupedPembelian).filter(([_, v]) => {
      return (
        v.tanggal.toLowerCase().includes(q) ||
        v.supplier.toLowerCase().includes(q) ||
        v.brand.toLowerCase().includes(q) ||
        v.barang.toLowerCase().includes(q) ||
        v.noInvoice.toLowerCase().includes(q) ||
        v.imeis.some((im) => im.toLowerCase().includes(q))
      );
    });
  }, [groupedPembelian, search]);

  // ===== PAGINATION LOGIC =====
  const totalPages = Math.ceil(filteredPurchases.length / itemsPerPage);

  const paginatedPurchases = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPurchases.slice(start, start + itemsPerPage);
  }, [filteredPurchases, currentPage]);

  // ===================== VALIDASI IMEI (INPUT + DATABASE) =====================
  const validateImeis = (imeiLines, originalGroupKey = null) => {
    const errors = [];
    const seen = new Set();

    // Duplikat di input
    for (const im of imeiLines) {
      if (seen.has(im)) {
        errors.push(`IMEI / No MESIN duplikat di input: ${im}`);
        break;
      }
      seen.add(im);
    }

    // Duplikat terhadap database (kecuali record dalam grup yang sama saat edit)
    for (const im of imeiLines) {
      const conflict = (allTransaksi || []).find((t) => {
        const tImei = String(t.IMEI || "").trim();
        if (!tImei) return false;
        if (tImei !== im) return false;
        if (originalGroupKey) {
          const tKey = `${t.TANGGAL_TRANSAKSI || ""}|${t.NAMA_SUPPLIER || ""}|${
            t.NAMA_BRAND || ""
          }|${t.NAMA_BARANG || ""}`;
          if (tKey === originalGroupKey) return false;
        }
        return true;
      });

      if (conflict) {
        errors.push(
          `IMEI / No MESIN ${im} sudah digunakan di SKU ${
            conflict.NAMA_BRAND
          } - ${conflict.NAMA_BARANG} (Supplier: ${
            conflict.NAMA_SUPPLIER || "-"
          })`
        );
        break;
      }
    }

    return errors;
  };

  // ===================== HAPUS PEMBELIAN =====================
  const deletePembelian = async (item) => {
    if (
      !window.confirm(
        `Hapus semua transaksi pembelian untuk:\n${item.tanggal} - ${item.supplier} - ${item.brand} - ${item.barang}?`
      )
    )
      return;

    const rows = (allTransaksi || []).filter(
      (x) =>
        (x.PAYMENT_METODE || "").toUpperCase() === "PEMBELIAN" &&
        (x.TANGGAL_TRANSAKSI || "") === item.tanggal &&
        (x.NAMA_SUPPLIER || "") === item.supplier &&
        (x.NAMA_BRAND || "") === item.brand &&
        (x.NAMA_BARANG || "") === item.barang
    );

    try {
      for (const r of rows) {
        const tokoIndex =
          fallbackTokoNames.findIndex(
            (t) => t.toUpperCase() === String(r.NAMA_TOKO || "").toUpperCase()
          ) + 1;

        if (typeof deleteTransaksi === "function") {
          await deleteTransaksi(tokoIndex, r.id);
        }
      }

      // update lokal
      setAllTransaksi((prev) =>
        prev.filter(
          (x) =>
            !(
              (x.PAYMENT_METODE || "").toUpperCase() === "PEMBELIAN" &&
              (x.TANGGAL_TRANSAKSI || "") === item.tanggal &&
              (x.NAMA_SUPPLIER || "") === item.supplier &&
              (x.NAMA_BRAND || "") === item.brand &&
              (x.NAMA_BARANG || "") === item.barang
            )
        )
      );

      alert("Data pembelian berhasil dihapus.");
    } catch (err) {
      console.error("deletePembelian error:", err);
      alert("Gagal menghapus data pembelian.");
    }
  };

  // ===================== BUKA MODAL EDIT =====================
  const openEdit = (item) => {
    setEditData({
      ...item,
      imeiList: (item.imeis || []).join("\n"),
      originalKey: `${item.tanggal}|${item.supplier}|${item.brand}|${item.barang}`,
    });
    setShowEdit(true);
  };

  // ===================== SIMPAN EDIT =====================
  const saveEdit = async () => {
    if (!editData) return;

    const imeis = String(editData.imeiList || "")
      .split("\n")
      .map((a) => a.trim())
      .filter(Boolean);

    const errors = validateImeis(imeis, editData.originalKey);
    if (errors.length) {
      alert(errors.join("\n"));
      return;
    }

    const rows = (allTransaksi || []).filter(
      (x) =>
        (x.PAYMENT_METODE || "").toUpperCase() === "PEMBELIAN" &&
        `${x.TANGGAL_TRANSAKSI || ""}|${x.NAMA_SUPPLIER || ""}|${
          x.NAMA_BRAND || ""
        }|${x.NAMA_BARANG || ""}` === editData.originalKey
    );

    try {
      for (let i = 0; i < rows.length; i++) {
        const r = rows[i];
        const tokoIndex =
          fallbackTokoNames.findIndex(
            (t) => t.toUpperCase() === String(r.NAMA_TOKO || "").toUpperCase()
          ) + 1;

        let newIMEI = r.IMEI;
        if (imeis.length === 1) {
          newIMEI = imeis[0];
        } else if (imeis.length === rows.length) {
          newIMEI = imeis[i];
        } else if (imeis.length > 1 && imeis.length < rows.length) {
          newIMEI = imeis[i] || r.IMEI;
        }

        const payload = {
          ...r,
          TANGGAL_TRANSAKSI: editData.tanggal,
          NAMA_SUPPLIER: editData.supplier,
          NAMA_BRAND: editData.brand,
          NAMA_BARANG: editData.barang,
          NO_INVOICE: editData.noInvoice,
          HARGA_SUPLAYER: Number(editData.hargaSup || 0),
          HARGA_UNIT: Number(editData.hargaUnit || 0),
          TOTAL: Number(r.QTY || 0) * Number(editData.hargaUnit || 0),
          IMEI: newIMEI,
          NAMA_TOKO: "CILANGKAP PUSAT", // ✅ kalau diedit tetap PUSAT
        };

        if (typeof updateTransaksi === "function") {
          await updateTransaksi(tokoIndex, r.id, payload);
        }
      }

      // update lokal supaya tabel langsung berubah
      setAllTransaksi((prev) =>
        prev.map((x) => {
          if (
            (x.PAYMENT_METODE || "").toUpperCase() === "PEMBELIAN" &&
            `${x.TANGGAL_TRANSAKSI || ""}|${x.NAMA_SUPPLIER || ""}|${
              x.NAMA_BRAND || ""
            }|${x.NAMA_BARANG || ""}` === editData.originalKey
          ) {
            return {
              ...x,
              TANGGAL_TRANSAKSI: editData.tanggal,
              NAMA_SUPPLIER: editData.supplier,
              NAMA_BRAND: editData.brand,
              NAMA_BARANG: editData.barang,
              NO_INVOICE: editData.noInvoice,
              HARGA_SUPLAYER: Number(editData.hargaSup || 0),
              HARGA_UNIT: Number(editData.hargaUnit || 0),
              TOTAL: Number(x.QTY || 0) * Number(editData.hargaUnit || 0),
              NAMA_TOKO: "CILANGKAP PUSAT",
            };
          }
          return x;
        })
      );

      alert("Perubahan pembelian tersimpan.");
      setShowEdit(false);
    } catch (err) {
      console.error("saveEdit error:", err);
      alert("Gagal menyimpan perubahan.");
    }
  };

  // ===================== TAMBAH PEMBELIAN =====================
  const handleTambahChange = (key, val) => {
    setTambahForm((prev) => ({ ...prev, [key]: val }));
  };

  const submitTambah = async () => {
    const {
      tanggal,
      supplier,
      brand,
      barang,
      hargaSup,
      hargaUnit,
      qty,
      imeiList,
      noInvoice,
      namaToko,
    } = tambahForm;

    let qtyInput = Number(qty || 0);
    const hSup = Number(hargaSup || 0);
    const hUnit = Number(hargaUnit || 0);

    const imeis = String(imeiList || "")
      .split("\n")
      .map((a) => a.trim())
      .filter(Boolean);

    if (!tanggal) return alert("Tanggal wajib diisi.");
    if (!supplier) return alert("Nama Supplier wajib diisi.");
    if (!brand) return alert("Brand wajib diisi.");
    if (!barang) return alert("Nama barang wajib diisi.");
    if (!hUnit || hUnit <= 0) return alert("Harga Unit harus lebih dari 0.");
    if (imeis.length === 0 && qtyInput <= 0)
      return alert("Isi IMEI atau Qty (lebih dari 0).");

    // validasi IMEI input sendiri (duplikat di form)
    const seen = new Set();
    for (const im of imeis) {
      if (seen.has(im)) return alert(`IMEI duplikat di input: ${im}`);
      seen.add(im);
    }

    // IMEI > QTY tidak boleh
    if (imeis.length > 0 && qtyInput > 0 && imeis.length > qtyInput) {
      return alert(
        `Jumlah IMEI (${imeis.length}) melebihi Qty yang ditulis (${qtyInput}).`
      );
    }

    if (imeis.length > 0 && qtyInput < imeis.length) {
      qtyInput = imeis.length;
    }

    // cek konflik dengan database (All Transaksi)
    const dbErrors = validateImeis(imeis, null);
    if (dbErrors.length) {
      alert(dbErrors.join("\n"));
      return;
    }

    try {
      // ✅ Paksa semua pembelian masuk CILANGKAP PUSAT
      const forcedNamaToko =
        (namaToko && namaToko.trim() && "CILANGKAP PUSAT") ||
        "CILANGKAP PUSAT";
      const tokoIndex = 1; // index 1 = CILANGKAP PUSAT

      // INSERT PER IMEI
      if (imeis.length > 0) {
        for (const im of imeis) {
          const payload = {
            TANGGAL_TRANSAKSI: tanggal,
            NO_INVOICE: noInvoice || `INV-${Date.now()}`,
            NAMA_SUPPLIER: supplier,
            NAMA_USER: "SYSTEM",
            NAMA_TOKO: forcedNamaToko,
            NAMA_BRAND: brand,
            NAMA_BARANG: barang,
            QTY: 1,
            IMEI: im,
            NOMOR_UNIK: im,
            HARGA_UNIT: hUnit,
            HARGA_SUPLAYER: hSup,
            TOTAL: hUnit * 1,
            PAYMENT_METODE: "PEMBELIAN",
            SYSTEM_PAYMENT: "SYSTEM",
            KETERANGAN: "Pembelian",
            STATUS: "Approved",
          };

          if (typeof addTransaksi === "function") {
            await addTransaksi(tokoIndex, payload);
          }
          // update lokal supaya tabel langsung bertambah
          setAllTransaksi((prev) => [...prev, payload]);
        }
      }

      // INSERT NON IMEI (QTY besar)
      if (imeis.length === 0 && qtyInput > 0) {
        const payload = {
          TANGGAL_TRANSAKSI: tanggal,
          NO_INVOICE: noInvoice || `INV-${Date.now()}`,
          NAMA_SUPPLIER: supplier,
          NAMA_USER: "SYSTEM",
          NAMA_TOKO: forcedNamaToko,
          NAMA_BRAND: brand,
          NAMA_BARANG: barang,
          QTY: qtyInput,
          NOMOR_UNIK: `${brand}|${barang}|${Date.now()}`,
          HARGA_UNIT: hUnit,
          HARGA_SUPLAYER: hSup,
          TOTAL: qtyInput * hUnit,
          PAYMENT_METODE: "PEMBELIAN",
          SYSTEM_PAYMENT: "SYSTEM",
          KETERANGAN: "Pembelian",
          STATUS: "Approved",
        };

        if (typeof addTransaksi === "function") {
          await addTransaksi(tokoIndex, payload);
        }
        setAllTransaksi((prev) => [...prev, payload]);
      }

      alert("Pembelian berhasil ditambahkan ke STOCK CILANGKAP PUSAT.");
      setShowTambah(false);
      setTambahForm({
        tanggal: "",
        supplier: "",
        brand: "",
        barang: "",
        hargaSup: "",
        hargaUnit: "",
        qty: 1,
        imeiList: "",
        noInvoice: "",
        namaToko: "CILANGKAP PUSAT",
      });
    } catch (err) {
      console.error("submitTambah error:", err);
      alert("Gagal menambahkan pembelian.");
    }
  };

  // ===================== EXPORT EXCEL =====================
  const exportExcel = () => {
    const rows = Object.values(groupedPembelian).map((r) => ({
      Tanggal: r.tanggal,
      Supplier: r.supplier,
      Brand: r.brand,
      Barang: r.barang,
      Invoice: r.noInvoice,
      IMEI: (r.imeis || []).join(", "),
      Harga_Supplier: r.hargaSup || 0,
      Harga_Unit: r.hargaUnit || 0,
      Total_Qty: r.totalQty || 0,
      Total_Harga_Supplier: r.totalHargaSup || 0,
      Total_Harga_Unit: r.totalHargaUnit || 0,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "MasterPembelian");
    XLSX.writeFile(
      wb,
      `MasterPembelian_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  // ===================== EXPORT PDF (TABEL) =====================
  const exportPDF = async () => {
    const el = tableRef.current;
    if (!el) {
      alert("Tabel tidak ditemukan.");
      return;
    }

    const canvas = await html2canvas(el, { scale: 1.5 });
    const img = canvas.toDataURL("image/png");
    const pdf = new jsPDF("l", "mm", "a4");
    const w = pdf.internal.pageSize.getWidth();
    const h = (canvas.height * w) / canvas.width;

    pdf.addImage(img, "PNG", 0, 0, w, h);
    pdf.save(`MasterPembelian_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  // ===================== PREVIEW INVOICE =====================
  const previewInvoiceTambah = () => {
    const {
      tanggal,
      supplier,
      brand,
      barang,
      hargaSup,
      qty,
      imeiList,
      noInvoice,
    } = tambahForm;

    if (!tanggal || !supplier || !brand || !barang) {
      return alert(
        "Lengkapi minimal Tanggal, Supplier, Brand, dan Barang sebelum preview invoice."
      );
    }

    const imeis = String(imeiList || "")
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

    const totalQty = imeis.length > 0 ? imeis.length : Number(qty || 0);
    if (totalQty <= 0) return alert("Qty atau IMEI harus diisi.");

    const totalSup = totalQty * Number(hargaSup || 0);

    const html = `
      <html>
      <head>
        <title>Preview Invoice Pembelian</title>
        <style>
          body { font-family: Arial; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #444; padding: 5px; }
          th { background: #eee; }
        </style>
      </head>
      <body>
        <h2 style="text-align:center;">INVOICE PEMBELIAN</h2>
        <h4 style="text-align:center;">PT. MILA MEDIA TELEKOMUNIKASI</h4>
        <hr>

        <p><b>No Invoice:</b> ${noInvoice || `INV-${Date.now()}`}</p>
        <p><b>Tanggal:</b> ${tanggal}</p>
        <p><b>Supplier:</b> ${supplier}</p>

        <table>
          <thead>
            <tr>
              <th>No</th>
              <th>IMEI / No Mesin</th>
              <th>Brand</th>
              <th>Barang</th>
              <th>Qty</th>
              <th>Harga Supplier</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${
              imeis.length > 0
                ? imeis
                    .map(
                      (im, i) => `
                <tr>
                  <td>${i + 1}</td>
                  <td>${im}</td>
                  <td>${brand}</td>
                  <td>${barang}</td>
                  <td>1</td>
                  <td>${Number(hargaSup || 0).toLocaleString()}</td>
                  <td>${Number(hargaSup || 0).toLocaleString()}</td>
                </tr>`
                    )
                    .join("")
                : `
                <tr>
                  <td>1</td>
                  <td>-</td>
                  <td>${brand}</td>
                  <td>${barang}</td>
                  <td>${qty}</td>
                  <td>${Number(hargaSup || 0).toLocaleString()}</td>
                  <td>${(qty * Number(hargaSup || 0)).toLocaleString()}</td>
                </tr>`
            }
          </tbody>
        </table>

        <h3>Total Harga Supplier: Rp ${totalSup.toLocaleString()}</h3>
      </body>
      </html>
    `;

    const win = window.open("", "_blank");
    win.document.write(html);
    win.document.close();
  };

  // ===================== CETAK INVOICE (PDF) =====================
  const printInvoiceTambah = async () => {
    const {
      tanggal,
      supplier,
      brand,
      barang,
      hargaSup,
      qty,
      imeiList,
      noInvoice,
    } = tambahForm;

    if (!tanggal || !supplier || !brand || !barang) {
      return alert(
        "Lengkapi minimal Tanggal, Supplier, Brand, dan Barang sebelum mencetak invoice."
      );
    }

    const imeis = String(imeiList || "")
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean);

    const totalQty = imeis.length > 0 ? imeis.length : Number(qty || 0);
    if (totalQty <= 0) {
      return alert("Qty atau IMEI harus diisi untuk mencetak invoice.");
    }

    const totalSup = totalQty * Number(hargaSup || 0);

    const html = `
      <div style="font-family: Arial; padding: 30px; width: 700px">

        <h2 style="text-align:center; margin:0;">INVOICE PEMBELIAN</h2>
        <h4 style="text-align:center; margin:3px 0;">PT. MILA MEDIA TELEKOMUNIKASI</h4>
        <hr>

        <p><b>No Invoice:</b> ${noInvoice || `INV-${Date.now()}`}</p>
        <p><b>Tanggal:</b> ${tanggal}</p>
        <p><b>Supplier:</b> ${supplier}</p>

        <hr>

        <table style="width:100%; border-collapse:collapse; margin-top:10px;" border="1">
          <thead>
            <tr style="background:#f0f0f0;">
              <th>No</th>
              <th>IMEI / No Mesin</th>
              <th>Brand</th>
              <th>Barang</th>
              <th>Qty</th>
              <th>Harga Supplier</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${
              imeis.length > 0
                ? imeis
                    .map(
                      (im, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${im}</td>
                <td>${brand}</td>
                <td>${barang}</td>
                <td>1</td>
                <td>${Number(hargaSup || 0).toLocaleString()}</td>
                <td>${Number(hargaSup || 0).toLocaleString()}</td>
              </tr>`
                    )
                    .join("")
                : `
              <tr>
                <td>1</td>
                <td>-</td>
                <td>${brand}</td>
                <td>${barang}</td>
                <td>${qty}</td>
                <td>${Number(hargaSup || 0).toLocaleString()}</td>
                <td>${(qty * Number(hargaSup || 0)).toLocaleString()}</td>
              </tr>
            `
            }
          </tbody>
        </table>

        <br>
        <h3>Total Harga Supplier: Rp ${totalSup.toLocaleString()}</h3>
      </div>
    `;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = html;
    document.body.appendChild(wrapper);

    const pdf = new jsPDF("p", "pt", "a4");
    const canvas = await html2canvas(wrapper, { scale: 2 });

    pdf.addImage(
      canvas.toDataURL("image/png"),
      "PNG",
      20,
      20,
      pdf.internal.pageSize.getWidth() - 40,
      0
    );

    pdf.save(`InvoicePembelian_${supplier}_${tanggal}.pdf`);
    wrapper.remove();
  };

  // ===================== RENDER =====================
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">MASTER PEMBELIAN</h2>

      {/* TOOLBAR */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center border px-3 py-2 rounded w-72">
          <FaSearch />
          <input
            className="ml-2 flex-1 outline-none text-sm"
            placeholder="Cari Tanggal / Supplier / Barang / IMEI / Invoice..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <button
          onClick={() => setShowTambah(true)}
          className="bg-indigo-600 text-white px-3 py-2 rounded flex items-center text-sm"
        >
          <FaPlus className="mr-2" /> Tambah Pembelian
        </button>

        <button
          onClick={exportExcel}
          className="flex items-center bg-green-600 text-white px-3 py-2 rounded text-sm"
        >
          <FaFileExcel className="mr-2" /> Excel
        </button>

        <button
          onClick={exportPDF}
          className="flex items-center bg-red-600 text-white px-3 py-2 rounded text-sm"
        >
          <FaFilePdf className="mr-2" /> PDF
        </button>
      </div>

      {/* TABEL */}
      <div ref={tableRef} className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-200">
            <tr>
              <th className="border p-2">No</th>
              <th className="border p-2">Tanggal</th>
              <th className="border p-2">Supplier</th>
              <th className="border p-2">Invoice</th>
              <th className="border p-2">Brand</th>
              <th className="border p-2">Barang</th>
              <th className="border p-2">IMEI / No MESIN</th>
              <th className="border p-2">Harga Supplier</th>
              <th className="border p-2">Harga Unit</th>
              <th className="border p-2">Qty</th>
              <th className="border p-2">Total Harga Supplier</th>
              <th className="border p-2">Total Harga Unit</th>
              <th className="border p-2 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filteredPurchases.length === 0 ? (
              <tr>
                <td colSpan={13} className="text-center text-gray-500 p-3">
                  Tidak ada data pembelian.
                </td>
              </tr>
            ) : (
              paginatedPurchases.map(([key, item], i) => {
                const shownImeis = search.trim()
                  ? (item.imeis || []).filter((im) =>
                      im.toLowerCase().includes(search.toLowerCase())
                    )
                  : item.imeis || [];

                return (
                  <tr key={key} className="hover:bg-gray-50">
                    <td className="border p-2 text-center">
                      {(currentPage - 1) * itemsPerPage + i + 1}
                    </td>
                    <td className="border p-2">{item.tanggal}</td>
                    <td className="border p-2">{item.supplier}</td>
                    <td className="border p-2">{item.noInvoice || "-"}</td>
                    <td className="border p-2">{item.brand}</td>
                    <td className="border p-2">{item.barang}</td>
                    <td className="border p-2 whitespace-pre-wrap">
                      {shownImeis.length > 0 ? shownImeis.join("\n") : "-"}
                    </td>
                    <td className="border p-2 text-right">
                      Rp {fmt(item.hargaSup)}
                    </td>
                    <td className="border p-2 text-right">
                      Rp {fmt(item.hargaUnit)}
                    </td>
                    <td className="border p-2 text-center">{item.totalQty}</td>
                    <td className="border p-2 text-right">
                      Rp {fmt(item.totalHargaSup)}
                    </td>
                    <td className="border p-2 text-right">
                      Rp {fmt(item.totalHargaUnit)}
                    </td>
                    <td className="border p-2 text-center space-x-2">
                      <button
                        className="text-blue-600"
                        title="Edit"
                        onClick={() => openEdit(item)}
                      >
                        <FaEdit />
                      </button>
                      <button
                        className="text-red-600"
                        title="Hapus"
                        onClick={() => deletePembelian(item)}
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION NAVIGATION */}
      <div className="flex justify-between items-center mt-4 text-sm">
        <div>
          Halaman {currentPage} dari {totalPages || 1}
        </div>

        <div className="flex gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className={`px-3 py-1 rounded border ${
              currentPage === 1
                ? "bg-gray-300 text-gray-500"
                : "bg-white hover:bg-gray-100"
            }`}
          >
            Prev
          </button>

          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPage(i + 1)}
              className={`px-3 py-1 rounded border ${
                currentPage === i + 1
                  ? "bg-indigo-600 text-white"
                  : "bg-white hover:bg-gray-100"
              }`}
            >
              {i + 1}
            </button>
          ))}

          <button
            disabled={currentPage === totalPages}
            onClick={() =>
              setCurrentPage((p) => Math.min(totalPages, p + 1))
            }
            className={`px-3 py-1 rounded border ${
              currentPage === totalPages || totalPages === 0
                ? "bg-gray-300 text-gray-500"
                : "bg-white hover:bg-gray-100"
            }`}
          >
            Next
          </button>
        </div>
      </div>

      {/* MODAL TAMBAH */}
      {showTambah && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-start py-10 z-50 overflow-auto">
          <div className="bg-white w-full max-w-2xl rounded shadow p-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-lg">Tambah Pembelian</h3>
              <button
                onClick={() => setShowTambah(false)}
                className="text-gray-600"
              >
                <FaTimes />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs">Tanggal</label>
                <input
                  type="date"
                  className="border p-2 rounded w-full"
                  value={tambahForm.tanggal}
                  onChange={(e) =>
                    handleTambahChange("tanggal", e.target.value)
                  }
                />
              </div>

              <div>
                <label className="text-xs">Supplier</label>
                <input
                  className="border p-2 rounded w-full"
                  value={tambahForm.supplier}
                  onChange={(e) =>
                    handleTambahChange("supplier", e.target.value)
                  }
                />
              </div>

              <div>
                <label className="text-xs">Brand</label>
                <input
                  className="border p-2 rounded w-full"
                  value={tambahForm.brand}
                  onChange={(e) => handleTambahChange("brand", e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs">Barang</label>
                <input
                  className="border p-2 rounded w-full"
                  value={tambahForm.barang}
                  onChange={(e) => handleTambahChange("barang", e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs">Harga Supplier</label>
                <input
                  type="number"
                  className="border p-2 rounded w-full"
                  value={tambahForm.hargaSup}
                  onChange={(e) =>
                    handleTambahChange("hargaSup", e.target.value)
                  }
                />
              </div>

              <div>
                <label className="text-xs">Harga Unit</label>
                <input
                  type="number"
                  className="border p-2 rounded w-full"
                  value={tambahForm.hargaUnit}
                  onChange={(e) =>
                    handleTambahChange("hargaUnit", e.target.value)
                  }
                />
              </div>

              <div>
                <label className="text-xs">Qty (jika tanpa IMEI)</label>
                <input
                  type="number"
                  className="border p-2 rounded w-full"
                  value={tambahForm.qty}
                  onChange={(e) => handleTambahChange("qty", e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs">No Invoice</label>
                <input
                  className="border p-2 rounded w-full"
                  value={tambahForm.noInvoice}
                  onChange={(e) =>
                    handleTambahChange("noInvoice", e.target.value)
                  }
                />
              </div>

              <div className="col-span-2">
                <label className="text-xs">
                  IMEI / No MESIN (opsional, 1 per baris)
                </label>
                <textarea
                  rows={5}
                  className="border p-2 rounded w-full font-mono text-xs"
                  placeholder={`Contoh:
6633849364
ABCD-99383-XYZ`}
                  value={tambahForm.imeiList}
                  onChange={(e) =>
                    handleTambahChange("imeiList", e.target.value)
                  }
                />
              </div>
            </div>

            {/* FOOTER BUTTONS */}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowTambah(false)}
                className="px-3 py-2 bg-gray-500 text-white rounded text-sm"
              >
                Batal
              </button>

              <button
                onClick={submitTambah}
                className="px-3 py-2 bg-indigo-600 text-white rounded text-sm"
              >
                <FaSave className="inline mr-2" />
                Simpan
              </button>

              {/* PREVIEW INVOICE */}
              <button
                onClick={previewInvoiceTambah}
                className="px-3 py-2 bg-blue-600 text-white rounded text-sm"
              >
                Preview
              </button>

              {/* CETAK PDF */}
              <button
                onClick={printInvoiceTambah}
                className="px-3 py-2 bg-yellow-600 text-white rounded text-sm"
              >
                <FaFilePdf className="inline mr-2" />
                Cetak Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDIT */}
      {showEdit && editData && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center py-10 z-50 overflow-auto">
          <div className="bg-white w-full max-w-lg rounded shadow p-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-bold text-lg">Edit Pembelian</h3>
              <button
                onClick={() => setShowEdit(false)}
                className="text-gray-600"
              >
                <FaTimes />
              </button>
            </div>

            <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
              <div>
                <label className="text-xs">Tanggal</label>
                <input
                  type="date"
                  className="border p-2 rounded w-full"
                  value={editData.tanggal}
                  onChange={(e) =>
                    setEditData({ ...editData, tanggal: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="text-xs">Supplier</label>
                <input
                  className="border p-2 rounded w-full"
                  value={editData.supplier}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      supplier: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="text-xs">Kategori Barang</label>
                <input
                  className="border p-2 rounded w-full"
                  value={editData.brand}
                  onChange={(e) =>
                    setEditData({ ...editData, brand: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="text-xs">Barang</label>
                <input
                  className="border p-2 rounded w-full"
                  value={editData.barang}
                  onChange={(e) =>
                    setEditData({ ...editData, barang: e.target.value })
                  }
                />
              </div>

              <div>
                <label className="text-xs">Harga Supplier</label>
                <input
                  type="number"
                  className="border p-2 rounded w-full"
                  value={editData.hargaSup}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      hargaSup: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="text-xs">Harga Unit</label>
                <input
                  type="number"
                  className="border p-2 rounded w-full"
                  value={editData.hargaUnit}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      hargaUnit: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="text-xs">No Invoice</label>
                <input
                  className="border p-2 rounded w-full"
                  value={editData.noInvoice}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      noInvoice: e.target.value,
                    })
                  }
                />
              </div>

              <div>
                <label className="text-xs">IMEI / No MESIN (1 per baris)</label>
                <textarea
                  rows={4}
                  className="border p-2 rounded w-full font-mono text-xs"
                  value={editData.imeiList}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      imeiList: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowEdit(false)}
                className="px-3 py-2 bg-gray-500 text-white rounded text-sm"
              >
                Batal
              </button>

              <button
                onClick={saveEdit}
                className="px-3 py-2 bg-blue-600 text-white rounded text-sm"
              >
                <FaSave className="inline mr-2" />
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
