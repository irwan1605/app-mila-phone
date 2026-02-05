import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaExchangeAlt, FaSearch, FaPlus, FaPrint } from "react-icons/fa";

import {
  listenMasterToko,
  listenMasterKategoriBarang,
  listenMasterBarang,
  lockImeiTransfer,
  listenKaryawan,
} from "../services/FirebaseService";
import { hitungStokBarang } from "../utils/stockUtils";

import FirebaseService from "../services/FirebaseService";
import { ref, onValue, update, push, off } from "firebase/database";
import { db } from "../firebase/FirebaseInit";
import TableTransferBarang from "./table/TableTransferBarang";
import PrintSuratJalan from "./Print/PrintSuratJalan";

const initialForm = {
  tanggal: new Date().toISOString().slice(0, 10),
  noDo: "",
  noSuratJalan: "",
  dari: "",
  ke: "",
  tokoPengirim: "",
  pengirim: "",
  kategori: "",
  brand: "",
  barang: "",
  imeis: [],
  qty: 0,
  status: "Pending",
};

/* ================= KONFIG ================= */
const KATEGORI_IMEI = ["SEPEDA LISTRIK", "MOTOR LISTRIK", "HANDPHONE"];
const TODAY = new Date().toISOString().slice(0, 10);

/* ================= AUTONUMBER ================= */
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

/* ========================================================= */
export default function TransferBarang() {
  const navigate = useNavigate();
  const location = useLocation();
  const suratJalanRef = useRef(null);

  /* ================= TOKO ================= */
  const TOKO_LOGIN = localStorage.getItem("TOKO_LOGIN") || "CILANGKAP PUSAT";
  const TOKO_FROM_INVENTORY = location.state?.toko || TOKO_LOGIN;

  /* ================= FORM ================= */
  const [form, setForm] = useState({
    tanggal: TODAY,
    noDo: generateNoDO(),
    noSuratJalan: generateNoSuratJalan(),
    tokoPengirim: TOKO_FROM_INVENTORY,
    ke: "",
    pengirim: "",
    kategori: "",
    brand: "",
    barang: "",
    imeis: [],
    qty: 0,
  });

  const isKategoriImei = useMemo(
    () => KATEGORI_IMEI.includes(form.kategori),
    [form.kategori]
  );

  /* ================= DATA ================= */
  const [inventory, setInventory] = useState([]);
  const [history, setHistory] = useState([]);
  const [masterToko, setMasterToko] = useState([]);
  const [masterKategori, setMasterKategori] = useState([]);
  const [masterBarang, setMasterBarang] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentRole, setCurrentRole] = useState("user");
  const isSuperAdmin = String(currentRole || "").toLowerCase() === "superadmin";

  const [masterKaryawan, setMasterKaryawan] = useState([]);

  useEffect(() => {
    const unsub = listenKaryawan((data) => {
      setMasterKaryawan(Array.isArray(data) ? data : []);
    });

    return () => unsub && unsub();
  }, []);

  /* ================= UI ================= */
  const [imeiInput, setImeiInput] = useState("");
  const [imeiSearch, setImeiSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [selectedSJ, setSelectedSJ] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [loading, setLoading] = useState(false);

  /* ================= HELPER ================= */
  const normalize = (v) =>
    String(v || "")
      .trim()
      .replace(/\s+/g, " ")
      .toUpperCase();

  // ================= INVENTORY NORMALIZATION (FINAL) =================
  useEffect(() => {
    return onValue(ref(db, "toko"), (snap) => {
      const map = {}; // key = imei
  
      snap.forEach((tokoSnap) => {
        const transaksiSnap = tokoSnap.child("transaksi");
        if (!transaksiSnap.exists()) return;
  
        transaksiSnap.forEach((trx) => {
          const v = trx.val();
          if (!v.IMEI) return;
  
          const imei = String(v.IMEI).trim();
          const metode = String(v.PAYMENT_METODE || "").toUpperCase();
  
          if (!map[imei]) {
            map[imei] = {
              imei,
              status: "AVAILABLE",
              toko: String(v.NAMA_TOKO || "").trim(),
              namaBrand: String(v.NAMA_BRAND || "").trim(),
              namaBarang: String(v.NAMA_BARANG || "").trim(),
              kategori: String(v.KATEGORI_BRAND || "").trim(),
            };
          }
  
          // 🔥 RULE MUTLAK (WAJIB)
          if (metode === "PENJUALAN") {
            map[imei].status = "SOLD"; // ⛔ TERJUAL (PALING KUAT)
          } else if (metode === "TRANSFER_KELUAR") {
            if (map[imei].status !== "SOLD") map[imei].status = "OUT";
          } else if (metode === "TRANSFER_MASUK") {
            if (map[imei].status !== "SOLD") map[imei].status = "AVAILABLE";
          }
        });
      });
  
      setInventory(Object.values(map));
    });
  }, []);
  
  
  

  useEffect(() => {
    const barangRef = ref(db, "dataManagement/masterBarang");

    onValue(barangRef, (snap) => {
      const data = snap.val() || {};
      const arr = Object.entries(data).map(([id, v]) => ({
        id,
        ...v,
      }));
      setMasterBarang(arr);
    });

    return () => off(barangRef);
  }, []);

  // ================= DARI NOTIFIKASI NAVBAR =================
  useEffect(() => {
    if (location.state?.fromNotif) {
      // set filter ke Pending
      setFilterStatus(location.state.filterStatus || "Pending");

      // scroll ke table transfer
      setTimeout(() => {
        const el = document.getElementById("table-transfer-barang");
        if (el) el.scrollIntoView({ behavior: "smooth" });
      }, 300);
    }
  }, [location.state]);

  /* ================= MASTER DATA ================= */
  /* ================= MASTER DATA ================= */
  useEffect(() => {
    listenMasterToko(setMasterToko);
    listenMasterKategoriBarang(setMasterKategori);
    listenMasterBarang(setMasterBarang);
    FirebaseService.listenTransferRequests(setHistory);

    // 🔥 MASTER KARYAWAN (NAMA PENGIRIM)
    const unsubKaryawan = listenKaryawan((data) => {
      setMasterKaryawan(Array.isArray(data) ? data : []);
    });

    return () => {
      unsubKaryawan && unsubKaryawan();
    };
  }, []);

  /* ================= ROLE ================= */
  useEffect(() => {
    const login = JSON.parse(localStorage.getItem("user") || "{}");

    const roleFromLogin =
      login.role || login.roleDb || login.level || login.tipe || "user";

    setCurrentRole(String(roleFromLogin).toLowerCase());
  }, []);

  /* ================= OPTIONS ================= */
  const TOKO_OPTIONS = useMemo(() => {
    return (masterToko || [])
      .map((t) => String(t.namaToko || t.nama || "").trim())
      .filter(Boolean);
  }, [masterToko]);

  const brandOptions = useMemo(() => {
    if (!form.kategori || !form.tokoPengirim) return [];

    // ✅ KHUSUS ACCESSORIES → dari MASTER BARANG
    if (form.kategori === "ACCESSORIES") {
      return [
        ...new Set(
          masterBarang
            .filter(
              (b) =>
                String(b.kategoriBarang || "")
                  .toUpperCase()
                  .trim() === "ACCESSORIES"
            )
            .map((b) => b.brand)
            .filter(Boolean)
        ),
      ];
    }

    // 🔁 selain accessories → pakai inventory lama
    if (!form.tokoPengirim) return [];

    return [
      ...new Set(
        inventory
          .filter(
            (i) =>
              i.status === "AVAILABLE" && // 🔥 HANYA AVAILABLE
              i.toko.toUpperCase() === form.tokoPengirim.toUpperCase() &&
              i.kategori.toUpperCase() === form.kategori.toUpperCase()
          )
          .map((i) => i.namaBrand)
          .filter(Boolean)
      ),
    ];
  }, [inventory, masterBarang, form.tokoPengirim, form.kategori]);

  // ================= BARANG OPTIONS (DARI STOK TOKO) =================
  const barangOptions = useMemo(() => {
    if (!form.kategori || !form.brand || !form.tokoPengirim) return [];

    // ✅ KHUSUS ACCESSORIES → dari MASTER BARANG
    if (form.kategori === "ACCESSORIES") {
      return [
        ...new Set(
          masterBarang
            .filter(
              (b) =>
                String(b.kategoriBarang || "")
                  .toUpperCase()
                  .trim() === "ACCESSORIES" && b.brand === form.brand
            )
            .map((b) => b.namaBarang)
            .filter(Boolean)
        ),
      ];
    }

    return [
      ...new Set(
        inventory
          .filter(
            (i) =>
              i.status === "AVAILABLE" && // 🔥 SOLD & OUT KE BLOK
              i.toko.toUpperCase() === form.tokoPengirim.toUpperCase() &&
              i.kategori.toUpperCase() === form.kategori.toUpperCase() &&
              i.namaBrand.toUpperCase() === form.brand.toUpperCase()
          )
          .map((i) => i.namaBarang)
          .filter(Boolean)
      ),
    ];
  }, [inventory, masterBarang, form.tokoPengirim, form.kategori, form.brand]);

  // ================= CEK FORM SUDAH LENGKAP =================
  const isFormComplete =
    form.tokoPengirim &&
    form.ke &&
    form.brand &&
    form.barang &&
    Array.isArray(form.imeis) &&
    form.imeis.length > 0;

  const imeiSource = useMemo(() => {
    if (!form.barang || !form.tokoPengirim) return [];

    return inventory
      .filter(
        (i) =>
          i.status === "AVAILABLE" && // 🔥 hanya yang belum terjual
          i.toko.toUpperCase() === form.tokoPengirim.toUpperCase() &&
          i.namaBarang.toUpperCase() === form.barang.toUpperCase()
      )
      .map((i) => i.imei);
  }, [inventory, form.tokoPengirim, form.barang]);

  /* ================= IMEI ================= */
  const addImei = () => {
    if (!imeiSource.includes(imeiInput)) return;

    setForm((f) => ({
      ...f,
      imeis: [...f.imeis, imeiInput],
      qty: f.imeis.length + 1,
    }));

    setImeiInput("");
  };

  // ================= EDIT TRANSFER (DRAFT) =================
  const handleEdit = (row) => {
    alert(
      `Edit transfer\n\nNo SJ: ${row.noSuratJalan}\n(Fitur edit bisa diaktifkan nanti)`
    );
  };

  // ================= VOID / BATAL TRANSFER =================
  const voidTransfer = async (row) => {
    if (!isSuperAdmin) {
      alert("Hanya Superadmin yang bisa membatalkan transfer");
      return;
    }

    try {
      // ⬅️ kembalikan IMEI ke toko asal
      for (const im of row.imeis || []) {
        await update(ref(db, `inventory/${row.ke}/${im}`), {
          STATUS: "TRANSFERRED",
        });

        await update(ref(db, `inventory/${row.tokoPengirim}/${im}`), {
          STATUS: "AVAILABLE",
        });
      }

      // ⬅️ update status transfer
      await FirebaseService.updateTransferRequest(row.id, {
        status: "Voided",
        voidedAt: Date.now(),
      });

      alert("↩️ Transfer berhasil dibatalkan");
    } catch (err) {
      console.error(err);
      alert("Gagal membatalkan transfer");
    }
  };

  const removeImei = (idx) => {
    const next = [...form.imeis];
    next.splice(idx, 1);
    setForm((f) => ({ ...f, imeis: next, qty: next.length }));
  };

  const transferValidList = history.filter((item) => item.status !== "TERJUAL");

  // ================= VALIDASI IMEI SEBELUM MASUK FORM =================
  const validateImeiBeforeAdd = (im) => {
    if (!im) return false;

    const found = inventory.find(
      (i) => String(i.imei).trim() === String(im).trim()
    );

    console.log("IMEI dicari:", im, "FOUND:", found);

    if (!found) {
      alert("❌ No IMEI tidak ditemukan di stok");
      return false;
    }

    if (found.status !== "AVAILABLE") {
      alert("❌ No IMEI sudah TERJUAL dan STOCK TIDAK TERSEDIA");
      return false;
    }

    return true;
  };

  const isImeiAlreadyTransferred = (imei) => {
    const found = inventory.find((i) => i.imei === imei);
    if (!found) return true; // tidak ada di stok
  
    return found.status !== "AVAILABLE"; // kalau bukan AVAILABLE = sudah keluar
  };
  
  

  const handleAddImeiAuto = () => {
    const im = imeiSearch.trim();
    if (!im) return;
  
    const found = inventory.find((i) => i.imei === im);
  
    // ❌ TIDAK ADA
    if (!found) {
      alert("❌ No IMEI tidak ditemukan di stok");
      return;
    }
  
    // ❌ SUDAH TERJUAL
    if (found.status === "SOLD") {
      alert("❌ No IMEI sudah TERJUAL, tidak bisa ditransfer");
      return;
    }
  
    // ❌ SUDAH TRANSFER / OUT
    if (found.status !== "AVAILABLE") {
      alert("❌ No IMEI sudah keluar / tidak tersedia");
      return;
    }
  
    // ❌ DUPLIKAT DI FORM
    if (form.imeis.includes(found.imei)) {
      alert("⚠️ IMEI ini sudah ditambahkan");
      return;
    }
  
    // ✅ AMAN
    setForm((f) => ({
      ...f,
      tokoPengirim: found.toko,
      dari: found.toko,
      brand: found.namaBrand,
      barang: found.namaBarang,
      kategori: found.kategori,
      imeis: [...f.imeis, found.imei],
      qty: f.imeis.length + 1,
    }));
  
    setImeiSearch("");
  };
  

  const handleSearchByImei = () => {
    const im = String(imeiSearch || "").trim();
    if (!im) return;
  
    const found = inventory.find(
      (i) => String(i.imei).trim() === im
    );
  
    console.log("IMEI dicari:", im, "FOUND:", found);
  
    // ❌ tidak ada di stok
    if (!found) {
      alert("❌ No IMEI tidak ditemukan di stok");
      return;
    }
  
    // ❌ SOLD permanen
    if (found.status === "SOLD") {
      alert("❌ No IMEI sudah TERJUAL dan STOCK TIDAK TERSEDIA");
      return;
    }
  
    // ❌ bukan AVAILABLE
    if (found.status !== "AVAILABLE") {
      alert("❌ No IMEI tidak tersedia untuk transfer");
      return;
    }
  
    // ✅ otomatis isi form
    setForm((f) => {
      if (f.imeis.includes(found.imei)) return f;
  
      return {
        ...f,
        tokoPengirim: found.toko,
        dari: found.toko,
        brand: found.namaBrand,
        barang: found.namaBarang,
        kategori: found.kategori,
        imeis: [...f.imeis, found.imei],
        qty: (f.imeis?.length || 0) + 1,
      };
    });
  
    setImeiSearch("");
  };
  
  // ================= FILTER HISTORY (FIX ERROR) =================
  const filteredHistory = useMemo(() => {
    if (!Array.isArray(history)) return [];

    return history.filter((h) =>
      filterStatus === "ALL" ? true : h.status === filterStatus
    );
  }, [history, filterStatus]);

  // ================= HITUNG STOK TOKO (REALTIME) =================
  const stokPengirim = useMemo(() => {
    if (!form.tokoPengirim || !form.barang) return 0;

    return inventory.filter(
      (i) =>
        i.status === "AVAILABLE" &&
        i.toko.toUpperCase() === form.tokoPengirim.toUpperCase() &&
        i.namaBarang.toUpperCase() === form.barang.toUpperCase()
    ).length;
  }, [inventory, form.tokoPengirim, form.barang]);

  const validateForm = () => {
    if (!form.tokoPengirim) return "Toko Pengirim wajib diisi";
    if (!form.ke) return "Toko Tujuan wajib diisi";
    if (!form.pengirim) return "Nama pengirim wajib diisi";
    if (!form.kategori) return "Kategori wajib diisi";
    if (!form.brand) return "Brand wajib diisi";
    if (!form.barang) return "Nama barang wajib diisi";

    if (isKategoriImei && form.imeis.length === 0)
      return "Minimal 1 IMEI harus dimasukkan";

    if (!isKategoriImei && form.qty <= 0) return "Qty wajib diisi";

    return null;
  };

  // ================= SUBMIT TRANSFER (FINAL 100%) =================
  // ================= SUBMIT TRANSFER (FIX 100%) =================
  const submitTransfer = async () => {
    const error = validateForm();
    if (error) {
      alert("❌ " + error);
      return;
    }

    // ❌ CEK BARANG ADA STOK ATAU TIDAK
    const stokBarang = inventory.filter(
      (i) =>
        i.status === "AVAILABLE" &&
        i.toko.toUpperCase() === form.tokoPengirim.toUpperCase() &&
        i.namaBarang.toUpperCase() === form.barang.toUpperCase()
    );

    if (stokBarang.length === 0) {
      alert("❌ Barang tidak tersedia di stok");
      return; // ⛔ STOP SUBMIT
    }

    // 🔥 CEK IMEI TERJUAL / TIDAK TERSEDIA
    const invalidImeis = form.imeis.filter((im) => {
      const found = inventory.find((i) => i.imei === im);
      if (!found) return true;
      if (found.status === "SOLD") return true;
      if (found.status !== "AVAILABLE") return true;
      return false;
    });
    
    if (invalidImeis.length > 0) {
      alert(
        "❌ Transfer dibatalkan!\nIMEI tidak valid / terjual:\n" +
          invalidImeis.join(", ")
      );
      return;
    }
    
    try {
      const payload = {
        ...form,
        status: "Pending",
        createdAt: Date.now(),
      };

      // 🚫 BARU BOLEH PUSH SETELAH VALIDASI LOLOS
      const transferRef = push(ref(db, "transfer_barang"));
      const newTransferId = transferRef.key;

      await update(transferRef, {
        ...payload,
        id: newTransferId,
      });

      // 🔒 LOCK IMEI
      for (const imei of form.imeis) {
        await lockImeiTransfer({
          imei,
          transferId: newTransferId,
          tokoAsal: form.dari || form.tokoPengirim,
        });
      }

      // 🔥 UPDATE INVENTORY → OUT
      for (const imei of form.imeis) {
        await update(ref(db, `inventory/${form.tokoPengirim}/${imei}`), {
          STATUS: "OUT",
          TRANSFER_ID: newTransferId,
          UPDATED_AT: Date.now(),
        });
      }

      alert("✅ Transfer masuk tabel & siap di-approve");
      setForm(initialForm);
    } catch (err) {
      console.error(err);
      alert("❌ Gagal transfer barang");
    }
  };

  /* ================= RENDER ================= */
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-700 via-blue-700 to-purple-700 p-4">
      <div className="max-w-7xl mx-auto bg-white/95 rounded-2xl shadow-2xl p-6 space-y-6">
        <h2 className="text-2xl font-bold text-indigo-700 flex items-center gap-2">
          <FaExchangeAlt /> TRANSFER BARANG
        </h2>

        {/* SEARCH IMEI */}
        <div className="relative w-full md:w-96">
          <input
            placeholder="🔍 Cari / Input IMEI lalu Enter..."
            value={imeiSearch}
            onChange={(e) => setImeiSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearchByImei(); // 🔥 pakai function di atas
              }
            }}
            className="
        w-full px-4 py-2 rounded-xl
        bg-white/90 backdrop-blur
        border border-indigo-300
        focus:ring-4 focus:ring-indigo-300/50
        shadow-lg
        transition
      "
          />
        </div>

        {/* FORM */}
        <div className="grid md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-semibold">Tanggal</label>
            <input
              type="date"
              className="input"
              value={form.tanggal}
              readOnly
            />
          </div>

          <div>
            <label className="text-xs font-semibold">No Do</label>
            <input className="input" value={form.noDo} readOnly />{" "}
          </div>

          <div>
            <label className="text-xs font-semibold">Surat Jalan</label>
            <input className="input" value={form.noSuratJalan} readOnly />{" "}
          </div>

          {/* NAMA PENGIRIM (DARI MASTER KARYAWAN) */}
          <div>
            <label className="text-xs font-semibold">Nama Pengirim</label>
            <input
              list="pengirim-list"
              value={form.pengirim}
              onChange={(e) => setForm({ ...form, pengirim: e.target.value })}
              className="input"
              placeholder="Pilih Karyawan"
            />
            <datalist id="pengirim-list">
              {masterKaryawan.map((k) => (
                <option key={k.id} value={k.NAMA || ""} />
              ))}
            </datalist>
          </div>

          {/* TOKO PENGIRIM */}
          <div>
            <label className="text-xs font-semibold">Toko Pengirim</label>
            <input
              className="input bg-gray-100 cursor-not-allowed"
              value={form.tokoPengirim}
              readOnly
            />

            <datalist id="toko-list">
              {TOKO_OPTIONS.filter((t) => t !== form.tokoPengirim).map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>

          {/* TOKO TUJUAN */}
          <div>
            <label className="text-xs font-semibold">Toko Tujuan</label>
            <input
              list="toko-tujuan-list"
              className="input"
              value={form.ke}
              onChange={(e) => setForm((f) => ({ ...f, ke: e.target.value }))}
              placeholder="Ketik / pilih toko tujuan"
            />
            <datalist id="toko-tujuan-list">
              {TOKO_OPTIONS.filter((t) => t !== form.tokoPengirim).map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </div>

          {/* KATEGORI BARANG */}
          <div>
            <label className="text-xs font-semibold">Kategori Barang</label>
            <select
              className="input"
              value={form.kategori}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  kategori: e.target.value,
                  brand: "",
                  barang: "",
                  imeis: [],
                  qty: 0,
                }))
              }
            >
              <option value="">Pilih Kategori Barang</option>
              {masterKategori.map((k) => (
                <option key={k.id} value={k.namaKategori}>
                  {k.namaKategori}
                </option>
              ))}
            </select>
          </div>

          {/* NAMA BRAND */}
          <div>
            <label className="text-xs font-semibold">Nama Brand</label>
            <input
              list="brand-list"
              className="input"
              value={form.brand}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  brand: e.target.value,
                  barang: "",
                  imeis: [],
                  qty: 0,
                }))
              }
              placeholder="Pilih / ketik nama brand"
            />

            <datalist id="brand-list">
              {brandOptions.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </div>

          {/* NAMA BARANG */}
          <div>
            <label className="text-xs font-semibold">Nama Barang</label>
            <input
              list="barang-list"
              className="input"
              value={form.barang}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  barang: e.target.value,
                  imeis: [],
                  qty: 0,
                }))
              }
              placeholder="Pilih / ketik nama barang"
            />

            <datalist id="barang-list">
              {barangOptions.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
          </div>

          {/* QTY */}
          <div>
            <label className="text-xs font-semibold">QTY (Jumlah Barang)</label>
            <input
              type="number"
              min="1"
              className="input bg-gray-100"
              value={form.qty}
              readOnly={form.kategori !== "ACCESSORIES"}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  qty: Number(e.target.value),
                }))
              }
              placeholder="Jumlah Barang"
            />
          </div>
        </div>

        {/* IMEI / QTY */}
        {isKategoriImei ? (
          <>
            <div className="flex gap-2">
              <label className="text-xs font-semibold">NO IMEI</label>
              <input
                value={imeiSearch}
                onChange={(e) => setImeiSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddImeiAuto(); // 🔥 AUTO MASUK TABLE
                  }
                }}
                className="input"
                placeholder="Scan / ketik IMEI lalu Enter"
              />

              <button onClick={handleAddImeiAuto} className="btn-indigo">
                <FaPlus />
              </button>
            </div>
            <datalist id="imei-list">
              {imeiSource.map((im) => (
                <option key={im} value={im} />
              ))}
            </datalist>

            <div className="flex flex-wrap gap-2">
              {form.imeis.map((im, i) => (
                <span key={im} className="tag">
                  {im}
                  <button onClick={() => removeImei(i)}>×</button>
                </span>
              ))}
            </div>
          </>
        ) : (
          <input
            type="number"
            min="1"
            className="input"
            value={form.qty}
            onChange={(e) => setForm({ ...form, qty: Number(e.target.value) })}
            placeholder="Qty"
          />
        )}

        <div className="flex gap-3">
          <button
            onClick={submitTransfer}
            disabled={loading}
            className="btn-submit"
          >
            {loading ? "Processing..." : "SUBMIT TRANSFER"}
          </button>
          <button
            type="button"
            onClick={() =>
              alert(
                "Surat Jalan dicetak melalui tabel setelah transfer di-Approve"
              )
            }
            className="btn-indigo"
          >
            🖨️ PRINT SURAT JALAN
          </button>

          {showPreview && (
            <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-start overflow-auto p-6">
              <div className="bg-white rounded-2xl shadow-2xl p-4">
                <PrintSuratJalan
                  data={{
                    noSuratJalan: form.noSuratJalan,
                    tanggal: form.tanggal,
                    tokoPengirim: form.tokoPengirim,
                    ke: form.ke,
                    pengirim: form.pengirim,
                    items: [
                      {
                        barang: form.barang,
                        qty: form.qty,
                        imeis: form.imeis,
                      },
                    ],
                  }}
                />

                <div className="flex gap-3 justify-end mt-4">
                  <button onClick={() => window.print()} className="btn-indigo">
                    🖨️ Cetak
                  </button>

                  <button
                    onClick={() => setShowPreview(false)}
                    className="btn-red"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div id="table-transfer-barang">
          <TableTransferBarang currentRole={currentRole} />
        </div>
      </div>
    </div>
  );
}

/* ================= STYLE ================= */
const style = document.createElement("style");
style.innerHTML = `
.input{padding:10px;border:1px solid #cbd5e1;border-radius:12px;width:100%}
.input:focus{outline:none;border-color:#4f46e5;box-shadow:0 0 0 2px rgba(79,70,229,.2)}
.btn-indigo{background:linear-gradient(135deg,#4f46e5,#4338ca);color:white;padding:10px 16px;border-radius:12px;font-weight:600}
.btn-submit{background:linear-gradient(135deg,#16a34a,#22c55e);color:white;padding:12px;border-radius:14px;font-weight:700}
.tag{background:#eef2ff;padding:6px 10px;border-radius:10px}
`;
document.head.appendChild(style);
