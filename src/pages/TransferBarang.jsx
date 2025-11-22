// src/pages/TransferBarang.jsx — PRO MAX+ with Approval Admin
import React, { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowRight,
  FaExchangeAlt,
  FaSearch,
  FaFileExcel,
  FaInfoCircle,
  FaPrint,
  FaCheck,
  FaTimes,
} from "react-icons/fa";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import FirebaseService from "../services/FirebaseService"; // expects functions documented below

const fallbackTokoNames = [
  "PUSAT",
  "CILANGKAP",
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

export default function TransferBarang() {
  const navigate = useNavigate();

  // -----------------------
  // app state
  // -----------------------
  const [stockAll, setStockAll] = useState({});
  const [tokoList, setTokoList] = useState(fallbackTokoNames);
  const [skuSearch, setSkuSearch] = useState("");
  const [skuDropdownOpen, setSkuDropdownOpen] = useState(false);
  const [showTokoDropdown, setShowTokoDropdown] = useState(false);

  // form state supports multiple items optionally in future — keep single item for now
  const [form, setForm] = useState({
    tanggal: new Date().toISOString().slice(0, 10),
    dari: "PUSAT",
    ke: "",
    sku: "",
    brand: "",
    nama: "",
    imei: "",
    qty: 1,
    harga: "",
    pic: "",
    keterangan: "",
  });

  const [availableQty, setAvailableQty] = useState(0);
  const [targetQty, setTargetQty] = useState(0);
  const [loading, setLoading] = useState(false);

  // session local history for quick review
  const [sessionHistory, setSessionHistory] = useState([]);

  // pending requests (from firebase if available)
  const [pendingRequests, setPendingRequests] = useState([]);

  // admin flag: simple detection from localStorage.user.isAdmin === true
  const [isAdmin, setIsAdmin] = useState(false);

  const tableRef = useRef(null);

  // ------------------------------------------------------------------
  // 1) realtime stock listener
  // ------------------------------------------------------------------
  useEffect(() => {
    // prefer FirebaseService.listenStockAll if available
    if (typeof FirebaseService.listenStockAll === "function") {
      const unsub = FirebaseService.listenStockAll((snap) => {
        setStockAll(snap || {});
      });
      return () => unsub && unsub();
    } else {
      console.warn("FirebaseService.listenStockAll not found — stockAll will be empty");
      setStockAll({});
      return;
    }
  }, []);

  // keep tokoList synchronized with stockAll
  useEffect(() => {
    const keys = Object.keys(stockAll || {});
    const list = keys.length ? Array.from(new Set([...keys, ...fallbackTokoNames])) : fallbackTokoNames;
    // ensure PUSAT first
    list.sort((a, b) => {
      if (a === "PUSAT") return -1;
      if (b === "PUSAT") return 1;
      return a.localeCompare(b);
    });
    setTokoList(list);
  }, [stockAll]);

  // ---------------------------
  // detect admin from localStorage
  // ---------------------------
  useEffect(() => {
    try {
      const u = JSON.parse(localStorage.getItem("user") || "{}");
      setIsAdmin(Boolean(u?.isAdmin));
    } catch {
      setIsAdmin(false);
    }
  }, []);

  // ------------------------------------------------------------------
  // 2) SKU options (based on form.dari and skuSearch)
  // ------------------------------------------------------------------
  const skuOptions = useMemo(() => {
    const perToko = stockAll[form.dari] || {};
    let skus = Object.keys(perToko || {});
    if (skuSearch && skuSearch.trim()) {
      const s = skuSearch.trim().toLowerCase();
      skus = skus.filter((k) => {
        const it = perToko[k] || {};
        return (
          k.toLowerCase().includes(s) ||
          (String(it.nama || "").toLowerCase().includes(s)) ||
          (String(it.imei || "").toLowerCase().includes(s))
        );
      });
    }
    return skus;
  }, [stockAll, form.dari, skuSearch]);

  // ------------------------------------------------------------------
  // 3) load stok untuk SKU tertentu di toko asal
  // ------------------------------------------------------------------
  useEffect(() => {
    // run effect when form.dari or form.sku changes
    const { dari, sku } = form;
    if (!dari || !sku) {
      setAvailableQty(0);
      return;
    }

    if (typeof FirebaseService.getStockForToko === "function") {
      FirebaseService.getStockForToko(dari, sku)
        .then((item) => {
          const qty = item?.qty ? Number(item.qty) : 0;
          setAvailableQty(qty);
          if (item) {
            setForm((f) => ({
              ...f,
              brand: f.brand || item.brand || "",
              nama: f.nama || item.nama || "",
              imei: f.imei || item.imei || "",
              harga: f.harga !== "" && f.harga !== undefined ? f.harga : item.harga || "",
            }));
          }
        })
        .catch(() => setAvailableQty(0));
    } else {
      // fallback read from stockAll (not realtime safe but ok)
      const it = (stockAll[dari] || {})[sku] || null;
      const qty = it?.qty ? Number(it.qty) : 0;
      setAvailableQty(qty);
      if (it) {
        setForm((f) => ({
          ...f,
          brand: f.brand || it.brand || "",
          nama: f.nama || it.nama || "",
          imei: f.imei || it.imei || "",
          harga: f.harga !== "" && f.harga !== undefined ? f.harga : it.harga || "",
        }));
      }
    }
  }, [form.dari, form.sku, stockAll]);

  // ------------------------------------------------------------------
  // 4) target qty preview
  // ------------------------------------------------------------------
  useEffect(() => {
    const { ke, sku } = form;
    if (!ke || !sku) {
      setTargetQty(0);
      return;
    }
    const qty = (stockAll[ke] || {})[sku]?.qty || 0;
    setTargetQty(Number(qty));
  }, [form.ke, form.sku, stockAll]);

  // ------------------------------------------------------------------
  // 5) listen pending requests (admin view) — optional
  // ------------------------------------------------------------------
  useEffect(() => {
    if (typeof FirebaseService.listenTransferRequests === "function") {
      const unsub = FirebaseService.listenTransferRequests((list) => {
        // expect list array of requests
        setPendingRequests(Array.isArray(list) ? list : (list || []));
      });
      return () => unsub && unsub();
    } else {
      // no firebase requests listener; keep pendingRequests empty
      setPendingRequests([]);
    }
  }, []);

  // ------------------------------------------------------------------
  // 6) handlers
  // ------------------------------------------------------------------
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setForm((f) => ({ ...f, [name]: type === "number" ? (value === "" ? "" : Number(value)) : value }));
    if (name === "sku") {
      setSkuSearch(value);
      setSkuDropdownOpen(Boolean(value));
    }
  };

  const handleSkuSelect = (skuVal) => {
    const it = (stockAll[form.dari] || {})[skuVal] || {};
    setForm((f) => ({
      ...f,
      sku: skuVal,
      brand: f.brand || it.brand || "",
      nama: f.nama || it.nama || "",
      imei: f.imei || it.imei || "",
      harga: f.harga !== "" && f.harga !== undefined ? f.harga : it.harga || "",
    }));
    setSkuSearch("");
    setSkuDropdownOpen(false);
  };

  // create transfer request (for approval)
  const createTransferRequest = async () => {
    const {
      tanggal, dari, ke, sku, qty, nama, brand, imei, harga, pic, keterangan,
    } = form;

    if (!tanggal || !pic || !harga) {
      alert("Tanggal, Harga, dan PIC wajib diisi!");
      return;
    }
    if (!dari || !ke || !sku) {
      alert("Mohon isi: Dari, Ke, dan SKU.");
      return;
    }
    if (dari === ke) {
      alert("Toko asal & tujuan tidak boleh sama.");
      return;
    }
    if (!qty || Number(qty) <= 0) {
      alert("Qty harus > 0.");
      return;
    }
    if (availableQty < Number(qty)) {
      alert(`Stok tidak cukup. Tersedia: ${availableQty}`);
      return;
    }

    const performedBy = (() => {
      try { const u = JSON.parse(localStorage.getItem("user")); return u?.username || u?.name || "system"; } catch { return "system"; }
    })();

    const payload = {
      tanggal,
      dari,
      ke,
      sku,
      brand,
      nama,
      imei,
      qty: Number(qty),
      harga: Number(harga),
      pic,
      keterangan,
      status: "Pending",
      createdAt: new Date().toISOString(),
      requestedBy: performedBy,
    };

    setLoading(true);
    try {
      if (typeof FirebaseService.createTransferRequest === "function") {
        const res = await FirebaseService.createTransferRequest(payload);
        // res can include id
        alert("Request transfer berhasil dibuat dan menunggu approval admin.");
      } else {
        // fallback: store in sessionHistory local and pendingRequests local
        const id = `local-${Date.now()}`;
        const r = { id, ...payload };
        setPendingRequests((p) => [r, ...p]);
        alert("Request transfer dibuat secara lokal (FirebaseService.createTransferRequest tidak tersedia).");
      }

      // local session history
      setSessionHistory((h) => [{ id: `req-${Date.now()}`, ...payload }, ...h].slice(0, 500));
      setForm((f) => ({ ...f, sku: "", qty: 1, nama: "", brand: "", imei: "", harga: "", pic: "", keterangan: "" }));
    } catch (err) {
      console.error("createTransferRequest error:", err);
      alert("Gagal membuat request transfer. Cek console.");
    } finally {
      setLoading(false);
    }
  };

  // admin: approve request -> perform actual transferStock and mark request approved
  const approveRequest = async (req) => {
    if (!window.confirm(`Setujui transfer ${req.sku} ${req.qty} dari ${req.dari} ke ${req.ke}?`)) return;
    try {
      // 1) perform actual stock move using transferStock
      if (typeof FirebaseService.transferStock === "function") {
        await FirebaseService.transferStock({
          fromToko: req.dari,
          toToko: req.ke,
          sku: req.sku,
          qty: Number(req.qty),
          nama: req.nama,
          imei: req.imei,
          keterangan: `APPROVED: ${req.keterangan || ""}`,
          performedBy: req.requestedBy || "admin",
        });
      } else {
        throw new Error("FirebaseService.transferStock not implemented");
      }

      // 2) update request status in firebase if function provided
      if (typeof FirebaseService.updateTransferRequest === "function") {
        await FirebaseService.updateTransferRequest(req.id, { status: "Approved", approvedAt: new Date().toISOString(), approvedBy: (JSON.parse(localStorage.getItem("user") || "{}")).username || "admin" });
      } else {
        // fallback: remove from pendingRequests local
        setPendingRequests((p) => p.filter((x) => x.id !== req.id));
      }

      alert("Transfer disetujui & stok telah dipindahkan.");
    } catch (err) {
      console.error("approveRequest error:", err);
      alert("Gagal approve request. Cek console.");
    }
  };

  // admin: reject request
  const rejectRequest = async (req, reason = "") => {
    if (!window.confirm(`Tolak request ${req.sku} ${req.qty} dari ${req.dari} ke ${req.ke}?`)) return;
    try {
      if (typeof FirebaseService.updateTransferRequest === "function") {
        await FirebaseService.updateTransferRequest(req.id, { status: "Rejected", rejectedAt: new Date().toISOString(), rejectedBy: (JSON.parse(localStorage.getItem("user") || "{}")).username || "admin", rejectReason: reason });
      } else {
        setPendingRequests((p) => p.filter((x) => x.id !== req.id));
      }
      alert("Request ditolak.");
    } catch (err) {
      console.error("rejectRequest error:", err);
      alert("Gagal menolak request.");
    }
  };

  // export session history as excel
  const exportHistoryExcel = () => {
    if (!sessionHistory.length) { alert("Belum ada riwayat."); return; }
    const rows = sessionHistory.map((h, i) => ({
      NO: i + 1, TANGGAL: h.tanggal, DARI: h.dari, KE: h.ke, SKU: h.sku, BRAND: h.brand, NAMA: h.nama, IMEI: h.imei, QTY: h.qty, HARGA: h.harga, PIC: h.pic, KETERANGAN: h.keterangan, STATUS: h.status || "Local"
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TransferSession");
    XLSX.writeFile(wb, `Transfer_Session_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  // print PDF for the latest session transfer
  const printLatestSuratJalan = () => {
    if (!sessionHistory.length) { alert("Belum ada riwayat untuk dicetak."); return; }
    const t = sessionHistory[0];
    const doc = new jsPDF("p", "mm", "a4");

    doc.setFontSize(12);
    doc.rect(14, 10, 36, 24); // logo box
    doc.text("LOGO", 32, 26, { align: "center" });

    doc.setFontSize(16);
    doc.text("SURAT JALAN", 105, 18, { align: "center" });
    doc.setFontSize(10);
    doc.text(`No : SJ-${t.tanggal.replace(/-/g,'')}-${t.id?.slice(-4) || '0000'}`, 15, 40);
    doc.text(`Tanggal : ${t.tanggal}`, 15, 46);
    doc.text(`Dari : ${t.dari}`, 15, 52);
    doc.text(`Ke : ${t.ke}`, 15, 58);
    doc.text(`PIC : ${t.pic}`, 15, 64);
    doc.text(`Dibuat : ${t.requestedBy || t.performedBy || 'system'}`, 15, 70);

    // table
    let y = 80;
    doc.setFontSize(10);
    doc.text("No", 15, y); doc.text("SKU/IMEI", 30, y); doc.text("Barang", 70, y); doc.text("Qty", 150, y);
    y += 6;
    doc.text("1", 15, y); doc.text(t.sku || t.imei || "-", 30, y); doc.text(t.nama || "-", 70, y); doc.text(String(t.qty || 0), 150, y);
    y += 20;
    doc.text(`Keterangan: ${t.keterangan || '-'}`, 15, y);

    doc.save(`SuratJalan_${t.tanggal}_${t.dari}_to_${t.ke}.pdf`);
  };

  // helper format
  const fmt = (v) => {
    try { return Number(v || 0).toLocaleString("id-ID"); } catch { return String(v || ""); }
  };

  // UI component render
  return (
    <div className="p-4 bg-gray-100 rounded-xl shadow-md">
      <div className="bg-gradient-to-r from-indigo-600 to-blue-500 text-white p-4 rounded-lg mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Transfer Barang — PRO MAX+ (Approval)</h2>
          <p className="text-sm text-indigo-100">{isAdmin ? "Mode Admin — approve/reject transfer requests" : "Buat request transfer, menunggu approval admin"}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs"><FaInfoCircle /> <span>Realtime sync via Firebase</span></div>
      </div>

      {/* FORM + SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-3 flex items-center gap-2"><FaExchangeAlt /> Form Transfer Barang</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-sm mb-1">Tanggal</label>
              <input type="date" name="tanggal" value={form.tanggal} onChange={handleChange} className="w-full p-2 border rounded" />
            </div>

            <div>
              <label className="block text-sm mb-1">Dari Toko</label>
              <select name="dari" value={form.dari} onChange={(e) => { setForm(f => ({ ...f, dari: e.target.value, sku: "", brand: "", nama: "", imei: "" })); setSkuSearch(""); }} className="w-full p-2 border rounded">
                {tokoList.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="relative">
              <label className="block text-sm mb-1">Ke Toko (Tujuan)</label>
              <input type="text" name="ke" value={form.ke} onChange={(e) => { setForm(f => ({ ...f, ke: e.target.value })); setShowTokoDropdown(true); }} onFocus={() => setShowTokoDropdown(true)} placeholder="Ketik nama toko..." className="w-full p-2 border rounded" />
              {showTokoDropdown && (
                <div className="absolute z-20 w-full bg-white border rounded shadow max-h-40 overflow-y-auto" onMouseDown={(e)=>e.preventDefault()}>
                  {tokoList.filter(t => t !== form.dari).filter(t => t.toLowerCase().includes(form.ke.toLowerCase())).map(t => (
                    <div key={t} className="px-3 py-2 hover:bg-indigo-100 cursor-pointer text-sm" onClick={() => { setForm(f => ({ ...f, ke: t })); setShowTokoDropdown(false); }}>{t}</div>
                  ))}
                  {form.ke && !tokoList.some(t => t === form.ke) && <div className="px-3 py-2 text-xs italic text-gray-500">Toko baru (manual): {form.ke}</div>}
                </div>
              )}
            </div>

            {/* SKU input (searchable + manual) */}
            <div className="md:col-span-1">
              <label className="block text-sm mb-1"><FaSearch className="inline mr-1" />Cari SKU / IMEI</label>
              <input value={skuSearch} onChange={(e) => { setSkuSearch(e.target.value); setSkuDropdownOpen(Boolean(e.target.value)); }} className="w-full p-2 border rounded" placeholder="Ketik SKU / IMEI / nama..." />
            </div>

            <div className="md:col-span-2 relative">
              <label className="block text-sm mb-1">SKU / Item (klik untuk pilih)</label>
              <input name="sku" value={form.sku} onChange={(e)=>handleChange(e)} onFocus={()=>setSkuDropdownOpen(true)} placeholder="Ketik manual atau pilih dari daftar" className="w-full p-2 border rounded" />
              {skuDropdownOpen && skuSearch !== null && (
                <div className="absolute z-30 w-full bg-white border rounded shadow max-h-48 overflow-y-auto" onMouseDown={(e)=>e.preventDefault()}>
                  {skuOptions.length > 0 ? skuOptions.map(skuVal => {
                    const it = (stockAll[form.dari] || {})[skuVal] || {};
                    return <div key={skuVal} onClick={()=>handleSkuSelect(skuVal)} className="px-3 py-2 hover:bg-indigo-100 cursor-pointer text-sm">{skuVal} — {it.nama || 'Tanpa Nama'} (stok {it.qty || 0})</div>
                  }) : <div className="px-3 py-2 text-xs text-gray-400 italic">SKU tidak ditemukan (gunakan input manual)</div>}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm mb-1">Brand</label>
              <input name="brand" value={form.brand} onChange={handleChange} className="w-full p-2 border rounded" />
            </div>

            <div>
              <label className="block text-sm mb-1">Nama Barang</label>
              <input name="nama" value={form.nama} onChange={handleChange} className="w-full p-2 border rounded" />
            </div>

            <div>
              <label className="block text-sm mb-1">IMEI / Nomor Unik</label>
              <input name="imei" value={form.imei} onChange={handleChange} className="w-full p-2 border rounded" />
            </div>

            <div>
              <label className="block text-sm mb-1">Harga Unit (Rp)</label>
              <input type="number" name="harga" value={form.harga} onChange={handleChange} className="w-full p-2 border rounded text-right" />
            </div>

            <div>
              <label className="block text-sm mb-1">Qty Transfer</label>
              <input type="number" min={1} name="qty" value={form.qty} onChange={handleChange} className="w-full p-2 border rounded text-right" />
              <div className="text-xs text-gray-500 mt-1">Stok tersedia di {form.dari}: {availableQty}</div>
            </div>

            <div>
              <label className="block text-sm mb-1">PIC Pengirim</label>
              <input name="pic" value={form.pic} onChange={handleChange} className="w-full p-2 border rounded" />
            </div>

            <div className="md:col-span-3">
              <label className="block text-sm mb-1">Keterangan</label>
              <input name="keterangan" value={form.keterangan} onChange={handleChange} className="w-full p-2 border rounded" />
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            {isAdmin ? (
              <button onClick={() => { alert("Admin harus membuat request via UI biasa OR approve existing requests."); }} className="px-4 py-2 bg-green-600 text-white rounded flex items-center">Buat & Setujui</button>
            ) : (
              <button onClick={createTransferRequest} disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded flex items-center"><FaArrowRight className="mr-2" />{loading ? "Memproses..." : "Buat Request"}</button>
            )}

            <button onClick={() => navigate("/inventory-report")} className="px-4 py-2 border rounded">Kembali</button>
          </div>
        </div>

        {/* summary */}
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold mb-2">Ringkasan</h3>
          <div className="mb-2 text-xs text-gray-600">SKU</div>
          <div className="font-mono mb-3">{form.sku || form.imei || "-"}</div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-50 p-2 rounded border">
              <div className="text-xs text-gray-500">Dari</div>
              <div className="font-semibold">{form.dari || "-"}</div>
              <div className="text-xs">Sistem: <span className="font-mono">{availableQty}</span></div>
            </div>

            <div className="bg-green-50 p-2 rounded border">
              <div className="text-xs text-gray-500">Ke</div>
              <div className="font-semibold">{form.ke || "-"}</div>
              <div className="text-xs">Sistem: <span className="font-mono">{targetQty}</span></div>
            </div>
          </div>

          <div className="bg-slate-50 p-2 rounded border mt-3">
            <div className="flex justify-between text-xs text-gray-500"><span>Qty Transfer</span><span>Estimasi</span></div>
            <div className="flex justify-between items-center mt-1"><span className="font-semibold">{form.qty || 0} unit</span><span className="font-mono">{targetQty} → {targetQty + (Number(form.qty) || 0)}</span></div>
          </div>

          <div className="mt-3">
            <button onClick={printLatestSuratJalan} className="px-3 py-2 bg-purple-600 text-white rounded text-sm flex items-center"><FaPrint className="mr-2" />Cetak Surat Jalan (Terbaru)</button>
          </div>
        </div>
      </div>

      {/* admin pending requests */}
      <div className="bg-white p-4 rounded shadow mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">Pending Transfer Requests {isAdmin ? "(Admin Mode)" : ""}</h3>
          <div className="flex items-center gap-2">
            <button onClick={exportHistoryExcel} className="px-3 py-1 bg-green-600 text-white rounded text-xs"><FaFileExcel className="mr-1" /> Export Sesi</button>
          </div>
        </div>

        {isAdmin ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-2 border">No</th>
                  <th className="p-2 border">Tanggal</th>
                  <th className="p-2 border">Dari</th>
                  <th className="p-2 border">Ke</th>
                  <th className="p-2 border">SKU</th>
                  <th className="p-2 border">QTY</th>
                  <th className="p-2 border">PIC</th>
                  <th className="p-2 border">Status</th>
                  <th className="p-2 border">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {(pendingRequests || []).length === 0 && (
                  <tr><td colSpan={9} className="p-3 border text-center text-xs text-gray-500">Tidak ada request</td></tr>
                )}
                {(pendingRequests || []).map((req, idx) => (
                  <tr key={req.id || idx} className="hover:bg-gray-50">
                    <td className="p-2 border text-center">{idx+1}</td>
                    <td className="p-2 border">{req.tanggal}</td>
                    <td className="p-2 border">{req.dari}</td>
                    <td className="p-2 border">{req.ke}</td>
                    <td className="p-2 border font-mono">{req.sku}</td>
                    <td className="p-2 border text-center">{req.qty}</td>
                    <td className="p-2 border">{req.pic}</td>
                    <td className="p-2 border">{req.status || 'Pending'}</td>
                    <td className="p-2 border text-center space-x-2">
                      <button onClick={() => approveRequest(req)} className="px-2 py-1 bg-green-600 text-white rounded text-xs flex items-center"><FaCheck className="mr-1" />Approve</button>
                      <button onClick={() => rejectRequest(req)} className="px-2 py-1 bg-red-600 text-white rounded text-xs flex items-center ml-2"><FaTimes className="mr-1" />Reject</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-sm text-gray-600">Sebagai user biasa, kamu dapat membuat request transfer. Admin akan menerima notifikasi/lihat halaman ini untuk approve.</div>
        )}
      </div>

      {/* session history table */}
      <div className="bg-white p-4 rounded shadow">
        <h3 className="font-semibold mb-3">Riwayat Transfer (Sesi Ini)</h3>
        <div className="overflow-x-auto">
          <table ref={tableRef} className="w-full text-sm border-collapse">
            <thead className="bg-slate-100">
              <tr>
                <th className="p-2 border">No</th>
                <th className="p-2 border">Tanggal</th>
                <th className="p-2 border">Dari</th>
                <th className="p-2 border">Ke</th>
                <th className="p-2 border">SKU</th>
                <th className="p-2 border">Nama</th>
                <th className="p-2 border">Qty</th>
                <th className="p-2 border">Harga</th>
                <th className="p-2 border">PIC</th>
                <th className="p-2 border">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {sessionHistory.length === 0 && <tr><td colSpan={10} className="p-3 border text-center text-xs text-gray-500">Belum ada riwayat</td></tr>}
              {sessionHistory.map((h, idx) => (
                <tr key={h.id || idx} className="hover:bg-gray-50">
                  <td className="p-2 border text-center">{idx+1}</td>
                  <td className="p-2 border">{h.tanggal}</td>
                  <td className="p-2 border">{h.dari}</td>
                  <td className="p-2 border">{h.ke}</td>
                  <td className="p-2 border font-mono">{h.sku}</td>
                  <td className="p-2 border">{h.nama}</td>
                  <td className="p-2 border text-center">{h.qty}</td>
                  <td className="p-2 border text-right">Rp {fmt(h.harga)}</td>
                  <td className="p-2 border">{h.pic}</td>
                  <td className="p-2 border text-xs">{h.keterangan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
