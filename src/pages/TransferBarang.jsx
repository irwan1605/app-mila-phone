// src/pages/TransferBarang.jsx — FINAL OTOMATIS + SUPERADMIN APPROVE + VOID + PAGINATION ✅

import React, { useEffect, useMemo, useRef, useState } from "react";
import { FaExchangeAlt, FaFileExcel, FaPrint, FaFilePdf,  FaPlus,} from "react-icons/fa";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import FirebaseService from "../services/FirebaseService";
import { useLocation } from "react-router-dom";
import Logo from "../assets/logoMMT.png";
import { ref, get, update, onValue } from "firebase/database";
import { db } from "../firebase/FirebaseInit";
import { reduceStock, addStock } from "../services/FirebaseService";
// import { getAvailableImeisFromInventoryReport } from "./Reports/InventoryReport";

export const approveTransferFINAL = async ({ transfer, performedBy }) => {
  const { id, dari, ke, brand, barang, imeis = [] } = transfer;

  if (!dari || !ke || !imeis.length) {
    throw new Error("Data transfer tidak lengkap");
  }

  const sku = `${brand}_${barang}`.replace(/\s+/g, "_");
  const now = new Date().toISOString();

  // ===================== 1. PINDAHKAN IMEI =====================
  const snap = await get(ref(db, "inventory"));
  if (!snap.exists()) throw new Error("Inventory kosong");

  const updates = {};

  snap.forEach((child) => {
    const row = child.val();
    const rowImei = String(row.imei || row.IMEI);

    if (
      imeis.includes(rowImei) &&
      String(row.toko || row.NAMA_TOKO || "").trim().toUpperCase() ===
      String(dari).trim().toUpperCase()
    ) {
      updates[`inventory/${child.key}/toko`] = ke;
      updates[`inventory/${child.key}/status`] = "AVAILABLE";
      updates[`inventory/${child.key}/updatedAt`] = now;
    }
  });

  if (!Object.keys(updates).length) {
    throw new Error("IMEI tidak ditemukan di toko pengirim");
  }

  await update(ref(db), updates);

  // ===================== 2. UPDATE STOCK =====================
  await reduceStock(dari, sku, imeis.length);
  await addStock(ke, sku, {
    nama: barang,
    qty: imeis.length,
  });

  // ===================== 3. UPDATE TRANSFER =====================
  await update(ref(db, `transfer_requests/${id}`), {
    status: "Approved",
    approvedAt: now,
    approvedBy: performedBy,
  });

  return true;
};

const TOKO_TUJUAN = [
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

const KATEGORI_OPTIONS = [
  "SEPEDA LISTRIK",
  "MOTOR LISTRIK",
  "HANDPHONE",
  "ACCESORIES",
];

// ===================== AUTONUMBER =====================
const generateNoDO = () => {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `${d}/${Math.floor(Math.random() * 999)
    .toString()
    .padStart(3, "0")}/SL/TF`;
};

const generateNoSuratJalan = () => {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `SJ/${d}/${Math.floor(Math.random() * 999)
    .toString()
    .padStart(3, "0")}`;
};

export default function TransferBarang() {
  const TOKO_LOGIN = localStorage.getItem("TOKO_LOGIN") || "CILANGKAP PUSAT";
  const location = useLocation();

  /* ================= STATE ================= */
  const [form, setForm] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    noDo: generateNoDO(),
    noSuratJalan: generateNoSuratJalan(),
    dari: TOKO_LOGIN,
    ke: "",
    tokoPengirim: TOKO_LOGIN,
    pengirim: "",
    kategori: "",
    brand: "",
    barang: "",
    imeis: [],
    qty: 0,
  });

  const [loading, setLoading] = useState(false);

  // ===================== DATA REALTIME =====================
  const [history, setHistory] = useState([]);
  const [users, setUsers] = useState([]);
  const [notif, setNotif] = useState(null);
  const [currentRole, setCurrentRole] = useState("USER");
  const [masterBarang, setMasterBarang] = useState([]);
  const [allTransaksi, setAllTransaksi] = useState([]);
  const [stockRealtime, setStockRealtime] = useState({});
  const [showPreview, setShowPreview] = useState(false);
  // const [inventoryData, setInventoryData] = useState([]);
  // const [imeiOptions, setImeiOptions] = useState([]);
  const [imeiInput, setImeiInput] = useState("");
  const [inventory, setInventory] = useState([]);


  const [selectedSJ, setSelectedSJ] = useState(null);
  const suratJalanRef = useRef(null);

  // ===================== FILTER =====================
  const [filterStatus, setFilterStatus] = useState("ALL");

  // ===================== PAGINATION =====================
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

  // useEffect(() => {
  //   let active = true;

  //   const loadImei = async () => {
  //     if (!form.dari || !form.barang) {
  //       setImeiOptions([]);
  //       return;
  //     }

  //     const list = await getAvailableImeisFromInventoryReport(
  //       form.dari,
  //       form.barang
  //     );

  //     if (active) setImeiOptions(list);
  //   };

  //   loadImei();
  //   return () => (active = false);
  // }, [form.dari, form.barang]);

  // useEffect(() => {
  //   if (location?.state?.filterStatus) {
  //     setFilterStatus(location.state.filterStatus);
  //     setPage(1);
  //   }
  // }, [location]);
  useEffect(() => {
    const invRef = ref(db, "inventory");
  
    const unsub = onValue(invRef, (snap) => {
      if (!snap.exists()) {
        console.warn("❌ inventory kosong");
        setInventory([]);
        return;
      }
  
      const arr = [];
      snap.forEach((c) => {
        arr.push({
          id: c.key,
          ...c.val(),
        });
      });
  
      console.log("✅ INVENTORY LOADED:", arr); // ⬅️ WAJIB ADA UNTUK DEBUG
      setInventory(arr);
    });
  
    return () => unsub();
  }, []);
  

  /* ================= HISTORY ================= */
  useEffect(() => {
    const unsub = FirebaseService.listenTransferRequests(setHistory);
    return () => unsub && unsub();
  }, []);

  useEffect(() => {
    const unsubUsers = FirebaseService.listenUsers((list) => {
      const arr = Array.isArray(list) ? list : [];
      setUsers(arr);

      // ✅ JANGAN PERCAYA ROLE DARI LOCALSTORAGE
      const localUser = JSON.parse(localStorage.getItem("user") || "{}");
      const username = localUser.username || "";
      localStorage.getItem("TOKO_LOGIN");

      const me = arr.find(
        (u) =>
          String(u.username).toLowerCase() === String(username).toLowerCase()
      );

      if (me?.role) {
        setCurrentRole(
          String(me.role || "")
            .toLowerCase()
            .trim()
        ); // ✅ SUPERADMIN REAL
      } else {
        setCurrentRole("USER");
      }
    });

    const unsubTransaksi = FirebaseService.listenAllTransaksi(setAllTransaksi);
    const unsubTransfer = FirebaseService.listenTransferRequests(setHistory);
    const unsubStock = FirebaseService.listenStockAll((s) => {
      setStockRealtime(s || {});
    });

    return () => {
      unsubUsers && unsubUsers();
      unsubTransaksi && unsubTransaksi();
      unsubTransfer && unsubTransfer();
      unsubStock && unsubStock();
    };
  }, []);

  // useEffect(() => {
  //   if (!form.dari || !form.barang) {
  //     setImeiOptions([]);
  //     return;
  //   }

  //   const invRef = ref(db, "inventory");

  //   const unsub = onValue(invRef, (snap) => {
  //     if (!snap.exists()) {
  //       setImeiOptions([]);
  //       return;
  //     }

  //     const list = [];

  //     snap.forEach((child) => {
  //       const row = child.val();

  //       if (
  //         String(row.toko).toUpperCase() === String(form.dari).toUpperCase() &&
  //         String(row.namaBarang) === String(form.barang) &&
  //         String(row.status) === "AVAILABLE" &&
  //         row.imei
  //       ) {
  //         list.push(String(row.imei));
  //       }
  //     });

  //     setImeiOptions(list);
  //   });

  //   return () => unsub();
  // }, [form.dari, form.barang]);

  // ===================== MASTER BARANG =====================
  useEffect(() => {
    const map = {};
    (allTransaksi || []).forEach((t) => {
      if (!t.NAMA_BRAND || !t.NAMA_BARANG) return;
      const key = `${t.NAMA_BRAND}|${t.NAMA_BARANG}`;
      if (!map[key]) {
        map[key] = {
          brand: t.NAMA_BRAND,
          barang: t.NAMA_BARANG,
          kategori: t.KATEGORI_BRAND || "",
        };
      }
    });
    setMasterBarang(Object.values(map));
  }, [allTransaksi]);
  

  useEffect(() => {
    setForm((f) => ({ ...f, imeis: [], qty: 0 }));
    setImeiInput("");
  }, [form.tokoPengirim, form.barang]);
  
  

  // ==========================================
  // 🔐 IMEI TERSEDIA DI TOKO PENGIRIM (LOCK)
  // ==========================================

  const addImei = () => {
    const im = imeiInput.trim();
    if (!im) return;
  
    if (!imeiSource.includes(im)) {
      alert("❌ IMEI tidak tersedia di stok toko ini");
      return;
    }
  
    if (form.imeis.includes(im)) {
      alert("❌ IMEI sudah dipilih");
      return;
    }
  
    setForm((f) => ({
      ...f,
      imeis: [...f.imeis, im],
      qty: f.imeis.length + 1,
    }));
  
    setImeiInput("");
  };
  
  
  

  useEffect(() => {
    if (location?.state?.fromInventory) {
      const inv = location.state;

      setForm((f) => ({
        ...f,
        tanggal: inv.tanggal || f.tanggal,
        dari: inv.dari || f.dari,
        tokoPengirim: inv.dari || f.tokoPengirim,
        brand: inv.brand || "",
        barang: inv.barang || "",
        kategori: inv.kategori || "",
        imeis: inv.imei ? [inv.imei] : [],
        qty: inv.qty ? Number(inv.qty) : 1,
      }));

      setImeiInput("");
    }
  }, [location]);

  
  // ===================== SOURCE IMEI =====================
  const imeiSource = useMemo(() => {
    if (!form.tokoPengirim || !form.barang) return [];
  
    const toko = String(form.tokoPengirim).trim().toUpperCase();
    const barang = String(form.barang).trim().toUpperCase();
  
    const result = inventory
      .filter((row) => {
        const status = String(row.STATUS || "").toUpperCase();
        const tokoInv = String(row.NAMA_TOKO || "").trim().toUpperCase();
        const barangInv = String(row.NAMA_BARANG || "")
          .trim()
          .toUpperCase();
  
        return (
          status === "AVAILABLE" &&
          tokoInv === toko &&
          barangInv === barang &&
          row.IMEI
        );
      })
      .map((row) => String(row.IMEI));
  
    console.log("✅ IMEI SOURCE:", result); // ⬅️ DEBUG PENTING
    return result;
  }, [inventory, form.tokoPengirim, form.barang]);
  
  
  
  
  

  const removeImei = (idx) => {
    const next = [...form.imeis];
    next.splice(idx, 1);
    setForm((f) => ({ ...f, imeis: next, qty: next.length }));
  };


  // ===================== IMEI AVAILABLE (FINAL FIX) =====================
  // const imeiAvailable = useMemo(() => {
  //   if (!form.tokoPengirim || !form.barang) return [];

  //   return inventoryData
  //     .filter(
  //       (i) =>
  //         i.status === "AVAILABLE" &&
  //         i.toko === form.tokoPengirim.toUpperCase() &&
  //         i.namaBarang === form.barang
  //     )
  //     .map((i) => i.imei);
  // }, [inventoryData, form.tokoPengirim, form.barang]);

  /* ================= SUBMIT ================= */
  const submitTransfer = async () => {
    try {
      setLoading(true);
      if (!form.ke || !form.barang || !form.imeis.length)
        throw new Error("Form belum lengkap");

      await FirebaseService.createTransferRequest({
        ...form,
        dari: form.tokoPengirim,
        qty: form.imeis.length,
        status: "Pending",
        createdAt: new Date().toISOString(),
      });

      alert("✅ Transfer dikirim (Pending)");
      setForm({
        tanggal: new Date().toISOString().slice(0, 10),
        noDo: generateNoDO(),
        noSuratJalan: generateNoSuratJalan(),
        dari: TOKO_LOGIN,
        ke: "",
        tokoPengirim: TOKO_LOGIN,
        pengirim: "",
        kategori: "",
        brand: "",
        barang: "",
        imeis: [],
        qty: 0,
      });
    } catch (e) {
      alert("❌ " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const isSuperAdmin = (role) =>
    String(role || "")
      .toLowerCase()
      .trim() === "superadmin";

  // useEffect(() => {
  //   console.log("DEBUG stockRealtime:", stockRealtime);
  // }, [stockRealtime]);

  // ===================== ✅ APPROVE (SUPERADMIN ONLY) =====================
  const approveTransfer = async (row) => {
    if (currentRole !== "superadmin") return alert("❌ Hanya SUPERADMIN");

    await FirebaseService.approveTransferFINAL({
      transfer: row,
      performedBy: "SUPERADMIN",
    });

    alert("✅ TRANSFER APPROVED — STOK & IMEI PINDAH");
  };

  const rejectTransfer = async (id) => {
    try {
      const username = localStorage.getItem("USERNAME");

      if (currentRole !== "SUPERADMIN") {
        setNotif("❌ Hanya SUPERADMIN yang boleh menolak transfer!");
        return;
      }

      await FirebaseService.updateTransferRequest(id, {
        status: "Rejected",
        rejectedBy: username,
        rejectedAt: new Date().toISOString(),
      });

      setNotif("✅ Transfer berhasil DITOLAK!");
    } catch (err) {
      setNotif("❌ Gagal reject: " + err.message);
    }
  };

  /* ================= VOID ================= */
  const voidTransfer = async (row) => {
    if (currentRole !== "superadmin") return alert("❌ Hanya SUPERADMIN");

    await FirebaseService.voidTransferFINAL(row);
    alert("✅ VOID — STOK KEMBALI");
  };

  // ===================== FILTER =====================
  const filteredHistory =
    filterStatus === "ALL"
      ? history
      : history.filter((h) => h.status === filterStatus);

  // ===================== PAGINATION DATA =====================
  const pagedHistory = filteredHistory.slice(
    (page - 1) * PER_PAGE,
    page * PER_PAGE
  );
  const totalPages = Math.ceil(filteredHistory.length / PER_PAGE) || 1;

  // ===================== EXPORT EXCEL =====================
  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredHistory);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transfer");
    XLSX.writeFile(wb, "History_Transfer.xlsx");
  };

  // ===================== EXPORT PDF =====================
  const exportPDF = async () => {
    if (!selectedSJ) return alert("Pilih Surat Jalan dulu!");
    const canvas = await html2canvas(suratJalanRef.current);
    const img = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const w = 210;
    const h = (canvas.height * w) / canvas.width;

    pdf.addImage(img, "PNG", 0, 0, w, h);
    pdf.save(`SURAT_JALAN_${selectedSJ.noSuratJalan}.pdf`);
  };

  // ===================== PRINT =====================
  const printSuratJalan = () => {
    if (!selectedSJ) return alert("Pilih SJ dulu!");
    const win = window.open("", "", "width=900,height=700");
    win.document.write(
      `<html><body>${suratJalanRef.current.innerHTML}</body></html>`
    );
    win.document.close();
    win.print();
  };

  // const qrValue = selectedSJ
  //   ? `${selectedSJ.noSuratJalan}|${selectedSJ.tanggal}|${selectedSJ.dari}|${selectedSJ.ke}|${selectedSJ.barang}|${selectedSJ.qty}`
  //   : "";

  // ===================== UI =====================
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-blue-700 to-purple-700 p-4">
      <div className="max-w-7xl mx-auto bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6 space-y-6">
        <h2 className="text-2xl font-bold text-indigo-700 flex items-center gap-2">
          <FaExchangeAlt /> TRANSFER BARANG
        </h2>
        <div className="text-xs text-red-600 font-bold">
          DEBUG ROLE: {currentRole}
        </div>
        {/* ================= FORM ================= */}
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-semibold">Tanggal</label>
            <input
              type="date"
              value={form.tanggal}
              onChange={(e) => setForm({ ...form, tanggal: e.target.value })}
              className="input"
            />
          </div>

          <div>
            <label className="text-xs font-semibold">No DO</label>
            <input value={form.noDo} readOnly className="input" />
          </div>

          <div>
            <label className="text-xs font-semibold">No Surat Jalan</label>
            <input value={form.noSuratJalan} readOnly className="input" />
          </div>

          {/* TOKO TUJUAN */}
          <select
            className="input"
            value={form.ke}
            onChange={(e) => setForm({ ...form, ke: e.target.value })}
          >
            <option value="">Toko Tujuan</option>
            {TOKO_TUJUAN.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </select>

          {/* ✅ TOKO PENGIRIM */}
          <input
            list="toko-list"
            value={form.tokoPengirim}
            onChange={(e) => setForm({ ...form, tokoPengirim: e.target.value })}
            className="input"
            placeholder="Toko Pengirim"
          />
          <datalist id="toko-list">
            {TOKO_TUJUAN.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>

          {/* NAMA PENGIRIM */}
          <input
            list="pengirim-list"
            value={form.pengirim}
            onChange={(e) => setForm({ ...form, pengirim: e.target.value })}
            className="input"
            placeholder="Nama Pengirim"
          />
          <datalist id="pengirim-list">
            {users.map((u) => (
              <option
                key={u.id || u.username}
                value={u.name || u.username || ""}
              />
            ))}
          </datalist>
        </div>

        {/* KATEGORI */}
        <div>
          <label className="text-xs font-semibold">Kategori</label>
          <select
            className="input"
            value={form.kategori}
            onChange={(e) => setForm({ ...form, kategori: e.target.value })}
          >
            <option value="">Pilih Kategori</option>
            {KATEGORI_OPTIONS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* BRAND */}
        <div>
          <label className="text-xs font-semibold">Brand</label>
          <input
            list="brand-list"
            value={form.brand}
            onChange={(e) => setForm({ ...form, brand: e.target.value })}
            className="input"
          />
          <datalist id="brand-list">
            {[...new Set(masterBarang.map((x) => x.brand))].map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </div>

        {/* BARANG */}
        <div>
          <label className="text-xs font-semibold">Nama Barang</label>
          <input
            list="barang-list"
            value={form.barang}
            onChange={(e) => setForm({ ...form, barang: e.target.value })}
            className="input"
          />
          <datalist id="barang-list">
            {masterBarang
              .filter((x) => x.brand === form.brand)
              .map((x) => (
                <option key={x.barang} value={x.barang} />
              ))}
          </datalist>
        </div>

        {/* IMEI */}
        <div className="md:col-span-2">
          <label className="text-xs font-semibold">IMEI</label>
          <div className="flex gap-2 mt-3">
            <input
              list="imei-list"
              value={imeiInput}
              onChange={(e) => setImeiInput(e.target.value)}
              className="border p-2 rounded w-full"
              placeholder="Pilih IMEI"
            />
            <datalist id="imei-list">
              {imeiSource.map((i) => (
                <option key={i} value={i} />
              ))}
            </datalist>
            <button
              onClick={addImei}
              className="bg-indigo-600 text-white px-4 rounded-lg"
            >
              <FaPlus />
            </button>
          </div>

          <div className="flex flex-wrap mt-2">
            {form.imeis.map((im, i) => (
              <div
                key={i}
                className="px-2 py-1 bg-indigo-100 rounded mr-2 mb-2"
              >
                {im}
                <button
                  onClick={() => removeImei(i)}
                  className="ml-2 text-red-600"
                  type="button"
                >
                  x
                </button>
              </div>
            ))}
          </div>
        </div>
        <button
          onClick={submitTransfer}
          disabled={loading}
          className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-6 py-2 rounded-xl shadow"
          type="button"
        >
          {loading ? "Loading..." : "SUBMIT TRANSFER"}
        </button>
      </div>

      {/* ================= FILTER ================= */}
      <div className="flex gap-2 items-center mt-4">
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="ALL">SEMUA</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Rejected">Rejected</option>
        </select>

        <button onClick={exportExcel} className="btn-blue" type="button">
          <FaFileExcel /> Excel
        </button>
        <button onClick={exportPDF} className="btn-red" type="button">
          <FaFilePdf /> PDF
        </button>
        <button onClick={printSuratJalan} className="btn-indigo" type="button">
          <FaPrint /> Print
        </button>
        <button
          onClick={() => {
            if (!selectedSJ) return alert("Pilih Surat Jalan dulu!");
            setShowPreview(true);
          }}
          className="btn-indigo"
          type="button"
        >
          👁️ Preview
        </button>
      </div>

      {notif && (
        <div className="bg-indigo-100 text-indigo-800 p-3 rounded mb-3 font-semibold">
          {notif}
        </div>
      )}

      {/* ================= TABLE ================= */}
      <table className="w-full border text-sm mt-4">
        <thead className="bg-slate-100">
          <tr>
            <th>No SJ</th>
            <th>Barang</th>
            <th>Dari</th>
            <th>Ke</th>
            <th>Qty</th>
            <th>Status</th>
            <th>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {pagedHistory.map((row) => (
            <tr key={row.id} className="hover:bg-slate-50">
              <td
                className="underline text-indigo-600 cursor-pointer"
                onClick={() => setSelectedSJ(row)}
              >
                {row.noSuratJalan}
              </td>
              <td>{row.barang}</td>
              <td>{row.dari}</td>
              <td>{row.ke}</td>
              <td>{row.qty}</td>
              <td>{row.status}</td>
              <td className="flex items-center gap-2">
                {row.status === "Pending" && isSuperAdmin(currentRole) && (
                  <>
                    <button
                      type="button"
                      onClick={() => approveTransfer(row)}
                      className="px-4 py-2 rounded-xl 
             bg-gradient-to-r from-green-500 to-emerald-600
             text-white text-xs font-semibold shadow-lg
             hover:scale-105 active:scale-95 transition"
                    >
                      ✓ APPROVE
                    </button>
                    <button
                      type="button"
                      onClick={() => rejectTransfer(row.id)}
                      className="px-3 py-1 rounded-lg bg-gradient-to-r from-red-500 to-rose-600 
                   text-white text-xs font-semibold shadow hover:scale-105 transition"
                    >
                      ✕ Reject
                    </button>
                  </>
                )}

                {row.status === "Approved" && isSuperAdmin(currentRole) && (
                  <button
                    type="button"
                    onClick={() => voidTransfer(row)}
                    className="px-3 py-1 rounded-lg bg-gradient-to-r from-orange-500 to-amber-600
                 text-white text-xs font-semibold shadow hover:scale-105 transition"
                  >
                    ⟳ VOID
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ✅ PAGINATION */}
      <div className="flex gap-4 justify-center">
        <button onClick={() => setPage(Math.max(1, page - 1))}>Prev</button>
        <span>
          {page} / {totalPages}
        </span>
        <button onClick={() => setPage(Math.min(totalPages, page + 1))}>
          Next
        </button>
      </div>

      {/* ================= SURAT JALAN ================= */}
      {selectedSJ && showPreview && (
        <div
          ref={suratJalanRef}
          className="bg-white p-6 rounded shadow mt-6 text-sm"
          style={{ width: "210mm" }}
        >
          <table className="w-full border border-black">
            <tbody>
              <tr>
                <td
                  colSpan="2"
                  className="border border-black text-center py-4"
                >
                  <img src={Logo} alt="LOGO" className="mx-auto h-16" />

                  <h2 className="font-bold text-xl mt-2">SURAT JALAN</h2>
                </td>
              </tr>

              <tr>
                <td className="border border-black p-2 w-1/3">
                  Nomor Surat Jalan
                </td>
                <td className="border border-black p-2">
                  {selectedSJ.noSuratJalan}
                </td>
              </tr>

              <tr>
                <td className="border border-black p-2">Nama Pengirim</td>
                <td className="border border-black p-2">
                  {selectedSJ.pengirim}
                </td>
              </tr>

              <tr>
                <td className="border border-black p-2">Dari</td>
                <td className="border border-black p-2">
                  {selectedSJ.tokoPengirim || selectedSJ.dari}
                </td>
              </tr>

              <tr>
                <td className="border border-black p-2">Ke</td>
                <td className="border border-black p-2">{selectedSJ.ke}</td>
              </tr>

              <tr>
                <td className="border border-black p-2">Nama Barang</td>
                <td className="border border-black p-2">{selectedSJ.barang}</td>
              </tr>

              <tr>
                <td className="border border-black p-2">QTY</td>
                <td className="border border-black p-2">{selectedSJ.qty}</td>
              </tr>

              <tr>
                <td className="border border-black p-2">IMEI</td>
                <td className="border border-black p-2">
                  {(selectedSJ.imeis || []).join(", ")}
                </td>
              </tr>
            </tbody>
          </table>
          {isSuperAdmin(currentRole) && selectedSJ?.status === "Pending" && (
            <button
              onClick={async () => {
                await approveTransfer(selectedSJ);
                printSuratJalan();
              }}
              className="mt-4 btn-indigo mr-2"
              type="button"
            >
              ✅ APPROVE & CETAK
            </button>
          )}

          <button
            onClick={() => setShowPreview(false)}
            className="mt-4 btn-red"
          >
            Tutup
          </button>
        </div>
      )}
    </div>
  );
}

// ===================== STYLE HELPER =====================
const styles = document.createElement("style");
styles.innerHTML = `
.input{
  width:100%;
  padding:10px;
  border:1px solid #cbd5e1;
  border-radius:10px;
  transition:all .2s ease;
}
.input:focus{
  outline:none;
  border-color:#4f46e5;
  box-shadow:0 0 0 2px rgba(79,70,229,.2);
}

.btn-blue{
  background:linear-gradient(135deg,#2563eb,#1d4ed8);
  color:white;
  padding:8px 16px;
  border-radius:10px;
  font-weight:600;
}

.btn-red{
  background:linear-gradient(135deg,#dc2626,#991b1b);
  color:white;
  padding:8px 16px;
  border-radius:10px;
  font-weight:600;
}

.btn-indigo{
  background:linear-gradient(135deg,#4f46e5,#4338ca);
  color:white;
  padding:8px 16px;
  border-radius:10px;
  font-weight:600;
}

table{
  border-radius:12px;
  overflow:hidden;
}

thead{
  background:linear-gradient(135deg,#e0e7ff,#c7d2fe);
}

tr:hover{
  background:#eef2ff;
  transition:.15s;
}
`;
document.head.appendChild(styles);
