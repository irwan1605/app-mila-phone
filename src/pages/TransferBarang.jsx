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

const KATEGORI_WAJIB_IMEI = ["MOTOR LISTRIK", "SEPEDA LISTRIK", "HANDPHONE"];

const NON_IMEI_KATEGORI = ["ACCESSORIES", "JASA", "SPARE PART"];

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
  const [inventory, setInventory] = useState([]);
  const [stokAccessories, setStokAccessories] = useState([]);
  const [previewSJ, setPreviewSJ] = useState(null);

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

  const isKategoriImei = useMemo(() => {
    if (!form.kategori) return false;

    // ✅ cara lama (tetap dipakai)
    const byKategori = inventory.some(
      (i) => i.kategori?.toUpperCase() === form.kategori.toUpperCase() && i.imei
    );

    // 🔥 FIX: paksa NON IMEI kategori
    if (NON_IMEI_KATEGORI.includes(String(form.kategori || "").toUpperCase())) {
      return false;
    }

    // ✅ tambahan FIX:
    // kalau sudah ada IMEI di form → pasti barang IMEI
    if (form.imeis && form.imeis.length > 0) return true;

    return byKategori;
  }, [form.kategori, inventory, form.imeis]);

  const isNonImeiKategori = useMemo(() => {
    return NON_IMEI_KATEGORI.includes(
      String(form.kategori || "").toUpperCase()
    );
  }, [form.kategori]);

  // ✅ OVERRIDE AMAN TANPA MERUSAK LOGIC LAMA
  const isKategoriImeiFinal = isKategoriImei && !isNonImeiKategori;

  const getSafeStokNonImei = () => {
    const toko = String(form.tokoPengirim || "")
      .toUpperCase()
      .trim();
    const brand = String(form.brand || "")
      .toUpperCase()
      .trim();
    const barang = String(form.barang || "")
      .toUpperCase()
      .trim();

    // =========================
    // 1. PRIORITAS: stok_toko
    // =========================
    const stokDb =
      stokAccessories?.[form.tokoPengirim]?.[form.brand]?.[form.barang];

    if (stokDb && Number(stokDb) > 0) {
      return Number(stokDb);
    }

    // =========================
    // 2. PRIORITAS: inventoryAccessories
    // =========================
    const found = inventoryAccessories.find(
      (i) =>
        i.toko?.toUpperCase().trim() === toko &&
        i.namaBrand?.toUpperCase().trim() === brand &&
        i.namaBarang?.toUpperCase().trim() === barang
    );

    if (found && Number(found.qty || 0) > 0) {
      return Number(found.qty);
    }

    // =========================
    // 🔥 3. FIX TERAKHIR (WAJIB)
    // =========================
    // kalau barang ada di master → anggap stok tersedia minimal 999
    const existInMaster = masterBarang.some(
      (b) =>
        String(b.brand || "")
          .toUpperCase()
          .trim() === brand &&
        String(b.namaBarang || "")
          .toUpperCase()
          .trim() === barang
    );

    if (existInMaster) {
      return 999; // 🔥 BIAR BISA TRANSFER
    }

    return 0;
  };

  /* ================= DATA ================= */

  const [history, setHistory] = useState([]);
  const [masterToko, setMasterToko] = useState([]);
  const [masterKategori, setMasterKategori] = useState([]);
  const [masterBarang, setMasterBarang] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentRole, setCurrentRole] = useState("user");
  const isSuperAdmin = String(currentRole || "").toLowerCase() === "superadmin";

  const [masterKaryawan, setMasterKaryawan] = useState([]);
  const [editIndex, setEditIndex] = useState(null);
  const [inventoryAccessories, setInventoryAccessories] = useState([]);

  // ================= INVENTORY ACCESSORIES (NON IMEI) =================
  useEffect(() => {
    return onValue(ref(db, "toko"), (snap) => {
      const map = {};

      snap.forEach((tokoSnap) => {
        const transaksiSnap = tokoSnap.child("transaksi");
        if (!transaksiSnap.exists()) return;

        const trxList = [];

        transaksiSnap.forEach((trx) => {
          const v = trx.val();
          if (!v || !v.IMEI) return;

          trxList.push(v);
        });

        // ============================================
        // 🔥 SORT TRANSAKSI BERDASARKAN WAKTU
        // ============================================
        trxList.sort((a, b) => {
          const ta = a.CREATED_AT || a.createdAt || 0;
          const tb = b.CREATED_AT || b.createdAt || 0;
          return ta - tb;
        });

        trxList.forEach((v) => {
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

          // ============================================
          // RULE STATUS IMEI
          // ============================================

          if (metode === "PEMBELIAN") {
            map[imei].status = "AVAILABLE";
            map[imei].toko = String(v.NAMA_TOKO || "").trim();
          }

          if (metode === "REFUND") {
            map[imei].status = "AVAILABLE";
            map[imei].toko = String(v.NAMA_TOKO || "").trim();
          }

          if (metode === "TRANSFER_KELUAR") {
            if (map[imei].status !== "SOLD") {
              map[imei].status = "OUT";
            }
          }

          if (metode === "TRANSFER_MASUK") {
            if (map[imei].status !== "SOLD") {
              map[imei].status = "AVAILABLE";
              map[imei].toko = String(v.NAMA_TOKO || "").trim();
            }
          }

          if (metode === "PENJUALAN") {
            map[imei].status = "SOLD";
          }
        });
      });

      // 🔥 FIX: jangan filter qty (karena IMEI tidak punya qty)
      setInventoryAccessories(Object.values(map));
    });
  }, []);

  useEffect(() => {
    return onValue(ref(db, "stok_toko"), (snap) => {
      const data = snap.val() || {};
      setStokAccessories(data);
    });
  }, []);

  const handleDeleteTransfer = (index) => {
    if (!window.confirm("Hapus item transfer ini?")) return;

    setDaftarTransfer((prev) => prev.filter((_, i) => i !== index));
  };

  const handleEditTransfer = (index) => {
    const item = daftarTransfer[index];

    setForm({
      ...item,
    });

    setEditIndex(index);

    // hapus dari daftar sementara
    setDaftarTransfer((prev) => prev.filter((_, i) => i !== index));
  };

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
  const [daftarTransfer, setDaftarTransfer] = useState([]);

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
          if (metode === "REFUND") {
            map[imei].status = "AVAILABLE";

            // 🔥 owner kembali ke toko transaksi
            map[imei].toko = String(v.NAMA_TOKO || "").trim();
          } else if (metode === "PENJUALAN") {
            map[imei].status = "SOLD";
          } else if (metode === "TRANSFER_KELUAR") {
            // JANGAN set OUT permanen
            // biarkan status tetap AVAILABLE
            if (map[imei].status !== "SOLD") {
              map[imei].status = "AVAILABLE";
            }
          } else if (metode === "TRANSFER_MASUK") {
            if (map[imei].status !== "SOLD") {
              map[imei].status = "AVAILABLE";

              // 🔥 UPDATE OWNER TOKO TERAKHIR
              map[imei].toko = String(v.NAMA_TOKO || "").trim();
            }
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

  /* ================= HELPER ================= */
  const normalize = (v) =>
    String(v || "")
      .trim()
      .replace(/\s+/g, " ")
      .toUpperCase();

  // ================= NORMALIZE IMEI =================
  const normalizeImei = (v) =>
    String(v || "")
      .trim()
      .replace(/\s+/g, "")
      .toUpperCase();

  const normalizeText = (v) =>
    String(v || "")
      .trim()
      .toUpperCase();

  // ======================================================
  // 🔥 GET OWNER TERAKHIR DARI INVENTORY (TRANSFER BERANTAI)
  // ======================================================
  const getLastInventoryOwner = (imei) => {
    const clean = normalizeImei(imei);

    const items = inventory.filter((i) => normalizeImei(i.imei) === clean);

    if (items.length === 0) return null;

    return String(items[items.length - 1].toko || "").toUpperCase();
  };

  // =======================================================
  // 🔥 OWNER TERAKHIR DARI TRANSFER APPROVED
  // =======================================================
  const getApprovedTransferOwner = (imei) => {
    const clean = normalizeImei(imei);

    let owner = null;
    let lastTime = 0;

    history.forEach((trx) => {
      if (trx.status !== "Approved") return;
      if (!Array.isArray(trx.imeis)) return;

      if (trx.imeis.map(normalizeImei).includes(clean)) {
        const waktu = trx.approvedAt || trx.createdAt || 0;

        if (waktu >= lastTime) {
          lastTime = waktu;
          owner = trx.ke; // toko tujuan jadi owner
        }
      }
    });

    return owner;
  };

  // =======================================================
  // 🔥 GET OWNER TERAKHIR DARI TRANSAKSI TOKO (REAL OWNER)
  // =======================================================
  const getLastOwnerFromTokoTransaksi = (imei) => {
    const clean = normalizeImei(imei);

    let lastOwner = null;
    let lastTime = 0;

    inventory.forEach((item) => {
      if (normalizeImei(item.imei) !== clean) return;

      // inventory sudah menyimpan owner terakhir
      lastOwner = item.toko;
    });

    return lastOwner;
  };

  // =======================================================
  // 🔎 GET LAST OWNER FROM TRANSFER HISTORY
  // =======================================================
  const getLastOwnerFromTransfer = (imei, rows) => {
    const clean = String(imei).trim();

    let lastOwner = null;
    let lastTime = 0;

    rows.forEach((r) => {
      if (!Array.isArray(r.imeis)) return;

      if (!r.imeis.map((x) => String(x).trim()).includes(clean)) return;

      const waktu = r.approvedAt || r.createdAt || 0;

      if (waktu >= lastTime && r.status === "Approved") {
        lastTime = waktu;
        lastOwner = r.ke; // toko tujuan jadi owner
      }
    });

    return lastOwner;
  };

  // =======================================================
  // 🔥 ENGINE : CARI TOKO PEMILIK TERAKHIR IMEI
  // =======================================================
  const getCurrentImeiOwner = (imei) => {
    const clean = normalizeImei(imei);

    let saldo = 0;
    let owner = null;
    let waktuTerakhir = 0;

    history.forEach((trx) => {
      if (!Array.isArray(trx.imeis)) return;

      if (!trx.imeis.map(normalizeImei).includes(clean)) return;

      const waktu = trx.createdAt || trx.approvedAt || 0;

      if (waktu >= waktuTerakhir) {
        waktuTerakhir = waktu;

        if (trx.status === "Approved") {
          owner = trx.ke;
        }
      }

      if (trx.status === "Approved") saldo++;
      if (trx.status === "SOLD") saldo--;
    });

    return {
      owner,
      saldo,
    };
  };

  // =======================================================
  // 🔥 CEK STATUS TERAKHIR IMEI DARI HISTORY
  // =======================================================
  const getLastImeiStatus = (imei) => {
    const clean = normalizeImei(imei);

    let lastStatus = "AVAILABLE";
    let lastTime = 0;

    history.forEach((trx) => {
      if (!trx.imeis) return;

      if (trx.imeis.map(normalizeImei).includes(clean)) {
        const waktu = trx.createdAt || trx.approvedAt || 0;

        if (waktu >= lastTime) {
          lastTime = waktu;
          lastStatus = trx.status;
        }
      }
    });

    return lastStatus;
  };

  // =======================================================
  // 🔥 GET LAST OWNER TOKO BERDASARKAN HISTORI TRANSAKSI
  // =======================================================
  const getLastOwnerFromHistory = (imei) => {
    const clean = normalizeImei(imei);

    let lastOwner = null;
    let lastTime = 0;

    history.forEach((trx) => {
      if (!trx.imeis) return;

      if (trx.imeis.map(normalizeImei).includes(clean)) {
        const waktu = trx.createdAt || trx.approvedAt || 0;

        if (waktu >= lastTime) {
          lastTime = waktu;
          lastOwner = trx.ke || trx.tokoPengirim;
        }
      }
    });

    return lastOwner;
  };

  // ==========================================================
  // 🔒 GLOBAL STOCK & IMEI LOCK ENGINE (FINAL PROTECTION)
  // ==========================================================
  const validateStockAndImeiOwnership = () => {
    const errors = [];

    for (const imei of form.imeis || []) {
      const clean = normalizeImei(imei);

      const found = inventory.find((i) => normalizeImei(i.imei) === clean);

      // ❌ IMEI tidak ada
      if (!found) {
        errors.push(`IMEI ${clean} tidak ditemukan di stok`);
        continue;
      }

      // ❌ jika sudah terjual
      if (found.status === "SOLD") {
        errors.push(`IMEI ${clean} sudah TERJUAL`);
        continue;
      }

      // ======================================================
      // 🔥 OWNER ENGINE (TANPA MERUBAH LOGIC LAMA)
      // ======================================================

      let owner = String(found.toko || "").toUpperCase();

      // 🔥 fallback owner dari inventory terbaru
      const lastInventoryOwner = inventory
        .filter((i) => normalizeImei(i.imei) === clean)
        .map((i) => String(i.toko || "").toUpperCase())
        .pop();

      if (lastInventoryOwner) {
        owner = lastInventoryOwner;
      }

      // 🔥 fallback owner dari transfer APPROVED
      const approvedOwner = history
        .filter((trx) => trx.status === "Approved")
        .reverse()
        .find((trx) => (trx.imeis || []).map(normalizeImei).includes(clean));

      if (approvedOwner) {
        owner = String(approvedOwner.ke || owner).toUpperCase();
      }

      // ======================================================
      // 🔥 VALIDASI TOKO PENGIRIM
      // ======================================================

      if (owner !== String(form.tokoPengirim).toUpperCase()) {
        errors.push(
          `IMEI ${clean} berada di toko ${owner}, bukan di ${form.tokoPengirim}`
        );
        continue;
      }

      // ======================================================
      // ❌ CEK PENDING TRANSFER
      // ======================================================

      const pendingTransfer = history.some(
        (trx) =>
          trx.status === "Pending" &&
          (trx.imeis || []).some((im) => normalizeImei(im) === clean)
      );

      if (pendingTransfer) {
        errors.push(`IMEI ${clean} sedang dalam proses transfer lain`);
        continue;
      }

      // ======================================================
      // ❌ DUPLIKAT DI DRAFT TABLE
      // ======================================================

      const duplicateDraft = daftarTransfer.some((item) =>
        (item.imeis || []).some((im) => normalizeImei(im) === clean)
      );

      if (duplicateDraft) {
        errors.push(`IMEI ${clean} sudah ada di daftar transfer`);
        continue;
      }
    }

    return errors;
  };

  // ================= HARD GLOBAL IMEI LOCK =================
  const isImeiUsedInPendingTransfer = (imei) => {
    const clean = normalizeImei(imei);

    return history.some((trx) => {
      if (trx.status !== "Pending") return false;

      return (trx.imeis || []).some((im) => normalizeImei(im) === clean);
    });
  };

  // ================= VALIDASI STOK TOKO SENDIRI =================
  const isImeiFromThisStore = (imei) => {
    const clean = normalizeImei(imei);

    const found = inventory.find((i) => normalizeImei(i.imei) === clean);

    if (!found) return false;

    const owner = String(found.toko || "").toUpperCase();
    const tokoForm = String(form.tokoPengirim || "").toUpperCase();
    const tokoLogin = String(TOKO_LOGIN || "").toUpperCase();

    // 🔥 harus benar-benar milik toko pengirim
    if (owner !== tokoForm) return false;

    // 🔥 harus milik toko login juga
    if (owner !== tokoLogin) return false;

    return true;
  };
  // ================= IMEI LAST OWNER =================
  const getLastOwnerToko = (imei) => {
    const clean = normalizeImei(imei);

    const found = inventory.find((i) => normalizeImei(i.imei) === clean);

    if (!found) return null;

    return String(found.toko || "").toUpperCase();
  };

  // ================= GLOBAL HARD LOCK ENGINE =================
  // const isImeiGloballyLocked = (imei) => {
  //   const clean = normalizeImei(imei);
  //   if (!clean) return true;

  //   // 1️⃣ Cek di form sekarang
  //   if (form.imeis.some((im) => normalizeImei(im) === clean)) return true;

  //   // 2️⃣ Cek di daftar transfer draft
  //   if (
  //     daftarTransfer.some((item) =>
  //       (item.imeis || []).some((im) => normalizeImei(im) === clean)
  //     )
  //   )
  //     return true;

  //   // 3️⃣ Cek di seluruh history transfer (SEMUA STATUS KECUALI VOIDED)
  //   if (
  //     history.some(
  //       (trx) =>
  //         trx.status !== "Voided" &&
  //         (trx.imeis || []).some((im) => normalizeImei(im) === clean)
  //     )
  //   )
  //     return true;

  //   // 4️⃣ 🔥 Cek di INVENTORY kalau status sudah OUT
  //   const inv = inventory.find((i) => normalizeImei(i.imei) === clean);

  //   if (!inv) return true;

  //   if (inv.status === "OUT") return true;

  //   return false;
  // };

  // ================= FINAL STRICT IMEI CHECK =================
  // ================= FINAL IMEI VALIDATOR =================
  // const isImeiDuplicateAnywhere = (imei) => {
  //   const clean = normalizeImei(imei);
  //   if (!clean) return true;

  //   // 1️⃣ cek di form sekarang
  //   if (form.imeis.some((im) => normalizeImei(im) === clean)) return true;

  //   // 2️⃣ cek di draft transfer
  //   if (
  //     daftarTransfer.some((item) =>
  //       (item.imeis || []).some((im) => normalizeImei(im) === clean)
  //     )
  //   )
  //     return true;

  //   // 3️⃣ cek di inventory REAL STATUS (INI YANG PENTING)
  //   const found = inventory.find((i) => normalizeImei(i.imei) === clean);

  //   if (!found) return true;
  //   if (found.status !== "AVAILABLE") return true;

  //   return false;
  // };

  // ================= GLOBAL IMEI USED =================
  const getAllUsedImeis = () => {
    const used = new Set();

    history.forEach((trx) => {
      if (trx.status === "Voided") return;

      (trx.imeis || []).forEach((im) => used.add(normalizeImei(im)));
    });

    daftarTransfer.forEach((item) => {
      (item.imeis || []).forEach((im) => used.add(normalizeImei(im)));
    });

    return used;
  };
  // ================= GLOBAL IMEI LOCK (FIX TRANSFER BERANTAI) =================
  const globalImeiSet = useMemo(() => {
    const set = new Set();

    history.forEach((trx) => {
      if (trx.status !== "Pending") return;

      (trx.imeis || []).forEach((im) => {
        set.add(normalizeImei(im));
      });
    });

    daftarTransfer.forEach((item) => {
      (item.imeis || []).forEach((im) => {
        set.add(normalizeImei(im));
      });
    });

    (form.imeis || []).forEach((im) => {
      set.add(normalizeImei(im));
    });

    // 🔥 INVENTORY LOCK CHECK
    inventory.forEach((item) => {
      if (item.LOCK_TRANSFER === true) {
        set.add(normalizeImei(item.imei));
      }
    });

    return set;
  }, [history, daftarTransfer, form.imeis, inventory]);

  /* ================= OPTIONS ================= */
  const TOKO_OPTIONS = useMemo(() => {
    return (masterToko || [])
      .map((t) => String(t.namaToko || t.nama || "").trim())
      .filter(Boolean);
  }, [masterToko]);

  const brandOptions = useMemo(() => {
    // ================= ACCESSORIES (MASTER ONLY) =================
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

    if (!form.kategori || !form.tokoPengirim) return [];

    // ================= ACCESSORIES =================
    if (form.kategori === "ACCESSORIES") {
      const brandsFromAccessories = [
        ...new Set(
          inventoryAccessories
            .filter(
              (i) => i.toko.toUpperCase() === form.tokoPengirim.toUpperCase()
            )
            .map((i) => i.namaBrand)
            .filter(Boolean)
        ),
      ];

      // 🔥 fallback ke MASTER BARANG kalau kosong
      if (brandsFromAccessories.length === 0) {
        return [
          ...new Set(
            masterBarang
              .filter(
                (b) =>
                  String(b.kategoriBarang || "")
                    .toUpperCase()
                    .trim() === form.kategori.toUpperCase().trim()
              )
              .map((b) => b.brand)
              .filter(Boolean)
          ),
        ];
      }

      return brandsFromAccessories;
    }

    // ================= NON ACCESSORIES =================
    const brandsFromInventory = [
      ...new Set(
        inventory
          .filter(
            (i) =>
              i.status === "AVAILABLE" &&
              i.toko.toUpperCase() === form.tokoPengirim.toUpperCase() &&
              i.kategori.toUpperCase() === form.kategori.toUpperCase()
          )
          .map((i) => i.namaBrand)
          .filter(Boolean)
      ),
    ];

    // 🔥 JANGAN UBAH LOGIC LAMA
    // kalau ada stok → pakai ini
    if (brandsFromInventory.length > 0) {
      return brandsFromInventory;
    }

    // 🔥 kalau tidak ada stok → ambil dari MASTER BARANG
    return [
      ...new Set(
        masterBarang
          .filter(
            (b) =>
              String(b.kategoriBarang || "")
                .toUpperCase()
                .trim() === form.kategori.toUpperCase().trim()
          )
          .map((b) => b.brand)
          .filter(Boolean)
      ),
    ];
  }, [
    inventory,
    inventoryAccessories,
    masterBarang,
    form.tokoPengirim,
    form.kategori,
  ]);

  // ================= REAL STOCK NON IMEI PER TOKO =================
  const stokNonImeiPerToko = useMemo(() => {
    const map = {};

    history
      .filter((h) => h.status === "Approved")
      .forEach((h) => {
        const metodeMasuk = ["TRANSFER_MASUK"];
        const metodeKeluar = ["TRANSFER_KELUAR"];

        if (!Array.isArray(h.imeis) || h.imeis.length > 0) return; // skip IMEI

        const key = `${h.tokoPengirim}|${h.brand}|${h.barang}`;
        const qty = Number(h.qty || 0);

        if (!map[key]) map[key] = 0;

        if (metodeKeluar.includes("TRANSFER_KELUAR")) {
          map[key] -= qty;
        }

        if (metodeMasuk.includes("TRANSFER_MASUK")) {
          map[key] += qty;
        }
      });

    return map;
  }, [history]);

  // ================= BARANG OPTIONS (DARI STOK TOKO) =================
  const barangOptions = useMemo(() => {
    // ================= ACCESSORIES (MASTER ONLY) =================
    if (form.kategori === "ACCESSORIES") {
      return [
        ...new Set(
          masterBarang
            .filter(
              (b) =>
                String(b.kategoriBarang || "")
                  .toUpperCase()
                  .trim() === "ACCESSORIES" &&
                String(b.brand || "")
                  .toUpperCase()
                  .trim() ===
                  String(form.brand || "")
                    .toUpperCase()
                    .trim()
            )
            .map((b) => b.namaBarang)
            .filter(Boolean)
        ),
      ];
    }

    if (!form.kategori || !form.brand) return [];

    if (form.kategori === "ACCESSORIES") {
      return [
        ...new Set(
          inventoryAccessories
            .filter(
              (i) =>
                i.toko.toUpperCase() === form.tokoPengirim.toUpperCase() &&
                i.namaBrand.toUpperCase() === form.brand.toUpperCase()
            )
            .map((i) => i.namaBarang)
        ),
      ];
    }

    // ambil dari MASTER BARANG dulu
    const masterList = masterBarang
      .filter(
        (b) =>
          String(b.kategoriBarang || "").toUpperCase() ===
            form.kategori.toUpperCase() &&
          String(b.brand || "").toUpperCase() === form.brand.toUpperCase()
      )
      .map((b) => b.namaBarang);

    // ambil dari INVENTORY
    const inventoryList = inventory
      .filter(
        (i) =>
          i.kategori?.toUpperCase() === form.kategori.toUpperCase() &&
          i.namaBrand?.toUpperCase() === form.brand.toUpperCase()
      )
      .map((i) => i.namaBarang);

    return [...new Set([...masterList, ...inventoryList])];
  }, [inventory, masterBarang, form.kategori, form.brand]);

  const stokTersedia = useMemo(() => {
    if (!form.tokoPengirim || !form.barang) return 0;

    const toko = String(form.tokoPengirim || "")
      .toUpperCase()
      .trim();
    const brand = String(form.brand || "")
      .toUpperCase()
      .trim();
    const barang = String(form.barang || "")
      .toUpperCase()
      .trim();

    // =====================
    // 🔥 IMEI
    // =====================
    if (isKategoriImeiFinal) {
      return inventory.filter(
        (i) =>
          i.status === "AVAILABLE" &&
          i.toko.toUpperCase() === toko &&
          i.namaBarang.toUpperCase() === barang
      ).length;
    }

    // =====================
    // 🔥 NON IMEI (FIX TOTAL)
    // =====================

    // 1. cek stok_toko
    const stokDb =
      stokAccessories?.[form.tokoPengirim]?.[form.brand]?.[form.barang];

    if (stokDb && Number(stokDb) > 0) {
      return Number(stokDb);
    }

    // 2. cek inventoryAccessories
    const found = inventoryAccessories.find(
      (i) =>
        i.toko?.toUpperCase().trim() === toko &&
        i.namaBrand?.toUpperCase().trim() === brand &&
        i.namaBarang?.toUpperCase().trim() === barang
    );

    if (found && Number(found.qty || 0) > 0) {
      return Number(found.qty);
    }

    // 3. 🔥 fallback master barang (WAJIB)
    const existInMaster = masterBarang.some(
      (b) =>
        String(b.brand || "")
          .toUpperCase()
          .trim() === brand &&
        String(b.namaBarang || "")
          .toUpperCase()
          .trim() === barang
    );

    if (existInMaster) {
      return 999; // 🔥 biar tidak 0
    }

    return 0;
  }, [
    inventory,
    inventoryAccessories,
    stokAccessories,
    masterBarang,
    form,
    isKategoriImeiFinal,
  ]);

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

  const addImei = () => {
    const clean = normalizeImei(imeiInput);
    if (!imeiSource.includes(clean)) return;

    setForm((f) => ({
      ...f,
      imeis: [...f.imeis, clean],
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

  // ================= FINAL IMEI VALIDATOR =================
  const isImeiValidForTransfer = (imei) => {
    const clean = normalizeImei(imei);
    if (!clean) return false;

    const found = inventory.find((i) => normalizeImei(i.imei) === clean);

    if (!found) {
      alert("❌ IMEI tidak ditemukan di inventory");
      return false;
    }

    // ❌ sudah terjual
    if (found.status === "SOLD") {
      alert("❌ IMEI sudah TERJUAL");
      return false;
    }

    // ❌ bukan AVAILABLE
    if (found.status !== "AVAILABLE") {
      alert("❌ IMEI sedang tidak tersedia");
      return false;
    }

    // ❌ terkunci
    if (found.LOCK_TRANSFER === true) {
      alert("❌ IMEI masih terkunci oleh transfer lain");
      return false;
    }

    // ❌ duplikat di form
    if (form.imeis.some((im) => normalizeImei(im) === clean)) {
      alert("❌ IMEI sudah ada di form");
      return false;
    }

    // ❌ duplikat di draft
    if (
      daftarTransfer.some((item) =>
        (item.imeis || []).some((im) => normalizeImei(im) === clean)
      )
    ) {
      alert("❌ IMEI sudah ada di daftar transfer");
      return false;
    }

    return true;
  };
  // ================= HARD BLOCK IMEI DUPLIKAT =================
  // const isImeiBlocked = (imei) => {
  //   const clean = String(imei || "").trim();
  //   if (!clean) return true;

  //   // ❌ sudah ada di form
  //   if (form.imeis.includes(clean)) {
  //     alert("❌ IMEI sudah ada di form ini");
  //     return true;
  //   }

  //   // ❌ sudah ada di daftar transfer draft
  //   const existsInDraft = daftarTransfer.some((item) =>
  //     (item.imeis || []).includes(clean)
  //   );

  //   if (existsInDraft) {
  //     alert("❌ IMEI sudah ada di daftar transfer");
  //     return true;
  //   }

  //   // ❌ sudah dipakai transfer Pending lain
  //   const existsInPending = history.some(
  //     (trx) => trx.status === "Pending" && (trx.imeis || []).includes(clean)
  //   );

  //   if (existsInPending) {
  //     alert("❌ IMEI sedang dalam proses transfer lain");
  //     return true;
  //   }

  //   return false;
  // };

  // ================= FINAL CLEAN IMEI VALIDATOR =================
  const isImeiValid = (imei) => {
    const clean = normalizeImei(imei);
    if (!clean) return false;

    const found = inventory.find((i) => normalizeImei(i.imei) === clean);

    if (!found) {
      alert("❌ IMEI tidak ditemukan di stok");
      return false;
    }

    // ❌ jika sudah terjual
    if (found.status === "SOLD") {
      alert("❌ IMEI sudah TERJUAL");
      return false;
    }

    // ==============================
    // STATUS YANG BOLEH TRANSFER LAGI
    // ==============================
    const allowedStatus = [
      "AVAILABLE",
      "TRANSFER_MASUK",
      "REFUND",
      "PEMBELIAN",
      "OUT",
    ];

    if (!allowedStatus.includes(found.status)) {
      alert("❌ IMEI tidak tersedia untuk transfer");
      return false;
    }

    // ❌ duplikat di form
    if (form.imeis.some((im) => normalizeImei(im) === clean)) {
      alert("❌ IMEI sudah ada di form");
      return false;
    }

    // ❌ duplikat di daftar transfer
    if (
      daftarTransfer.some((item) =>
        (item.imeis || []).some((im) => normalizeImei(im) === clean)
      )
    ) {
      alert("❌ IMEI sudah ada di daftar transfer");
      return false;
    }

    // ❌ IMEI sedang pending di transfer lain
    const imeiPending = history.some(
      (trx) =>
        trx.status === "Pending" &&
        (trx.imeis || []).some((im) => normalizeImei(im) === clean)
    );

    if (imeiPending) {
      alert("❌ IMEI sedang dalam proses transfer lain");
      return false;
    }

    return true;
  };

  const handleAddImeiAuto = () => {
    const im = normalizeImei(imeiSearch);
    if (!im) return;

    // ================= VALIDASI TOKO PEMILIK =================
    if (!isImeiFromThisStore(im)) {
      alert(
        `❌ IMEI ${im} bukan milik toko ${form.tokoPengirim}\nTidak boleh mengambil stok toko lain`
      );
      setImeiSearch("");
      return;
    }

    // ❌ HARD BLOCK DUPLICATE IMEI
    if (globalImeiSet.has(im)) {
      alert(`❌ IMEI ${im} sudah digunakan pada transfer lain`);
      setImeiSearch("");
      return;
    }

    if (!isImeiValid(im)) {
      setImeiSearch("");
      return;
    }

    const usedImeis = getAllUsedImeis();

    if (usedImeis.has(im)) {
      alert(`❌ IMEI ${im} sudah digunakan pada transfer lain`);
      return;
    }

    const found = inventory.find((i) => normalizeImei(i.imei) === im);

    // ❌ CEK TOKO PEMILIK
    if (
      String(found.toko).toUpperCase() !==
      String(form.tokoPengirim).toUpperCase()
    ) {
      alert(
        `❌ IMEI ${im} berada di toko ${found.toko}, bukan di ${form.tokoPengirim}`
      );
      setImeiSearch("");
      return;
    }

    // ================= CEK TOKO PEMILIK =================
    const lastOwner = getLastOwnerToko(im);

    // 🔥 TRANSFER BERANTAI DIIZINKAN
    // tapi harus dari toko owner terakhir

    if (lastOwner && lastOwner !== TOKO_LOGIN.toUpperCase()) {
      alert(
        `❌ IMEI berada di toko ${lastOwner}, bukan di toko login ${TOKO_LOGIN}`
      );
      return;
    }

    // 🔥 CEK STOK TOKO (REAL TIME)
    const stokAvailable = inventory.filter(
      (i) =>
        i.status === "AVAILABLE" &&
        i.toko.toUpperCase() === form.tokoPengirim.toUpperCase() &&
        i.namaBarang.toUpperCase() === found.namaBarang.toUpperCase()
    ).length;

    // 🔥 VALIDASI TOKO ASAL
    if (found.toko?.toUpperCase() !== form.tokoPengirim?.toUpperCase()) {
      alert(
        `❌ IMEI berada di toko ${found.toko}, bukan di ${form.tokoPengirim}`
      );
      return;
    }

    if (stokAvailable <= 0) {
      alert("❌ Stok barang sudah HABIS (0)");
      return;
    }

    if (!found) {
      alert("❌ No IMEI tidak ditemukan di stok");
      return;
    }

    const allowedStatus = [
      "AVAILABLE",
      "TRANSFER_MASUK",
      "REFUND",
      "PEMBELIAN",
      "OUT",
    ];

    if (!allowedStatus.includes(found.status)) {
      alert("❌ IMEI tidak tersedia untuk transfer");
      return;
    }

    // ❌ DUPLIKAT DI FORM
    if (form.imeis.includes(found.imei)) {
      alert("❌ IMEI sudah ada di daftar");
      return;
    }

    // ❌ DUPLIKAT DI LIST TRANSFER
    const imeiSudahAda = daftarTransfer.some((item) =>
      (item.imeis || []).includes(found.imei)
    );

    if (imeiSudahAda) {
      alert("❌ IMEI sudah ada di daftar transfer");
      return;
    }

    // ❌ MASIH PENDING DI TRANSFER LAIN
    const imeiPending = history.some(
      (trx) =>
        trx.status === "Pending" && (trx.imeis || []).includes(found.imei)
    );

    if (imeiPending) {
      alert("❌ IMEI sedang dalam proses transfer lain");
      return;
    }

    // ================= DUPLICATE CHECK =================
    const allImeis = [
      ...form.imeis,
      ...daftarTransfer.flatMap((i) => i.imeis || []),
    ].map(normalizeImei);

    if (allImeis.includes(im)) {
      alert(`❌ IMEI ${im} sudah ada dalam daftar transfer`);
      return;
    }

    setForm((f) => ({
      ...f,
      brand: found.namaBrand,
      barang: found.namaBarang,
      kategori: found.kategori,
      imeis: [...f.imeis, im],
      qty: (f.imeis?.length || 0) + 1,
    }));

    setImeiSearch("");
  };

  const handleSearchByImei = () => {
    const im = normalizeImei(imeiSearch);
    if (!im) return;

    if (globalImeiSet.has(im)) {
      alert(`❌ IMEI ${im} sudah ada di transfer`);
      return;
    }

    const found = inventory.find((i) => normalizeImei(i.imei) === im);

    if (!found) {
      alert("❌ No IMEI tidak ditemukan di stok");
      return;
    }

    if (found.status !== "AVAILABLE") {
      alert("❌ No IMEI tidak tersedia untuk transfer");
      return;
    }

    const allowedStatus = [
      "AVAILABLE",
      "TRANSFER_MASUK",
      "REFUND",
      "PEMBELIAN",
      "OUT",
    ];

    if (!allowedStatus.includes(found.status)) {
      alert("❌ No IMEI tidak tersedia untuk transfer");
      return;
    }

    // ❌ DUPLIKAT
    if (form.imeis.includes(found.imei)) {
      alert("⚠️ IMEI sudah ada di daftar");
      return;
    }

    // ================= CEK IMEI DI TRANSFER PENDING SAJA =================
    const imeiPending = history.some(
      (trx) =>
        trx.status === "Pending" &&
        (trx.imeis || []).some((x) => normalizeImei(x) === im)
    );

    if (imeiPending) {
      alert(`❌ IMEI ${im} sedang dalam proses transfer lain`);
      setImeiSearch("");
      return;
    }

    // ✅ FIX UTAMA
    // tokoPengirim tidak berubah
    setForm((f) => ({
      ...f,
      brand: found.namaBrand,
      barang: found.namaBarang,
      kategori: found.kategori,
      imeis: [...f.imeis, found.imei],
      qty: (f.imeis?.length || 0) + 1,
    }));

    setImeiSearch("");
  };

  // ================= VALIDASI MASTER BARANG =================
  const isBarangValidDiMaster = () => {
    if (!form.brand || !form.barang) return false;

    const brandUpper = String(form.brand).toUpperCase().trim();
    const barangUpper = String(form.barang).toUpperCase().trim();
    const tokoUpper = String(form.tokoPengirim).toUpperCase().trim();

    // ✅ 1. CEK DI MASTER BARANG
    const adaDiMaster = masterBarang.some(
      (b) =>
        String(b.brand || "")
          .toUpperCase()
          .trim() === brandUpper &&
        String(b.namaBarang || "")
          .toUpperCase()
          .trim() === barangUpper
    );

    if (adaDiMaster) return true;

    // ✅ 2. CEK DI INVENTORY IMEI
    const adaDiInventoryImei = inventory.some(
      (i) =>
        i.toko?.toUpperCase().trim() === tokoUpper &&
        i.namaBrand?.toUpperCase().trim() === brandUpper &&
        i.namaBarang?.toUpperCase().trim() === barangUpper
    );

    if (adaDiInventoryImei) return true;

    // ✅ 3. CEK DI INVENTORY NON IMEI
    const adaDiInventoryNonImei = inventoryAccessories.some(
      (i) =>
        i.toko?.toUpperCase().trim() === tokoUpper &&
        i.namaBrand?.toUpperCase().trim() === brandUpper &&
        i.namaBarang?.toUpperCase().trim() === barangUpper
    );

    if (adaDiInventoryNonImei) return true;

    return false;
  };

  const handleTambahTransfer = () => {
    // ==================================================
    // 🔒 FINAL GLOBAL VALIDATION ENGINE
    // ==================================================
    const stockErrors = validateStockAndImeiOwnership();

    if (stockErrors.length > 0) {
      alert("❌ Transfer dibatalkan:\n\n" + stockErrors.join("\n"));
      return;
    }

    // ================= HARD GLOBAL VALIDATION =================
    for (const imei of form.imeis || []) {
      const clean = normalizeImei(imei);

      // ❌ DUPLIKAT DI TRANSFER PENDING
      if (isImeiUsedInPendingTransfer(clean)) {
        alert(`❌ IMEI ${clean} sudah ada di transfer lain`);
        return;
      }

      // ❌ DUPLIKAT DI TABLE TRANSFER YANG BELUM DI SUBMIT
      const duplicateDraft = daftarTransfer.some((item) =>
        (item.imeis || []).some((im) => normalizeImei(im) === clean)
      );

      if (duplicateDraft) {
        alert(`❌ IMEI ${clean} sudah ada di daftar transfer`);
        return;
      }

      // ❌ CEK OWNER TOKO
      const found = inventory.find((i) => normalizeImei(i.imei) === clean);

      if (!found) {
        alert(`❌ IMEI ${clean} tidak ditemukan di stok`);
        return;
      }

      if (
        String(found.toko).toUpperCase() !==
        String(form.tokoPengirim).toUpperCase()
      ) {
        alert(
          `❌ IMEI ${clean} berada di toko ${found.toko}, bukan di ${form.tokoPengirim}`
        );
        return;
      }
    }

    // ================= HARD VALIDASI OWNER TOKO =================
    for (const imei of form.imeis || []) {
      if (!isImeiFromThisStore(imei)) {
        alert(
          `❌ IMEI ${imei} bukan milik toko ${form.tokoPengirim}\nTransfer hanya boleh dari stok toko sendiri`
        );
        return;
      }
    }

    // ================= SECURITY TOKO LOGIN =================
    if (form.tokoPengirim.toUpperCase() !== TOKO_LOGIN.toUpperCase()) {
      alert(
        `❌ Anda login sebagai toko ${TOKO_LOGIN}.
Barang hanya bisa ditransfer dari stok toko sendiri.`
      );
      return;
    }
    // ==================================================
    // 🔥 HARD GLOBAL IMEI DUPLICATE CHECK (SEBELUM MASUK TABLE)
    // ==================================================
    if (Array.isArray(form.imeis) && form.imeis.length > 0) {
      const normalized = form.imeis.map((i) => String(i).trim().toUpperCase());

      const uniqueSet = new Set(normalized);

      // ❌ DUPLIKAT DALAM FORM SENDIRI
      if (uniqueSet.size !== normalized.length) {
        alert("❌ Terdapat IMEI duplikat dalam input ini");
        return;
      }

      // ❌ DUPLIKAT DI daftarTransfer (yang sudah ada di table atas)
      const imeiSudahDiTable = daftarTransfer
        .flatMap((item) => item.imeis || [])
        .map((i) => String(i).trim().toUpperCase());

      for (const im of normalized) {
        if (imeiSudahDiTable.includes(im)) {
          alert(`❌ IMEI ${im} sudah ada di daftar transfer`);
          return;
        }
      }

      // ================================================
      // 🔥 CEK STATUS TERAKHIR IMEI (BOLEH TRANSFER LAGI)
      // ================================================

      const imeiSold = history
        .filter((h) => h.status === "SOLD") // hanya yg sudah dijual
        .flatMap((h) => h.imeis || [])
        .map((i) => String(i).trim().toUpperCase());

      for (const im of normalized) {
        if (imeiSold.includes(im)) {
          alert(`❌ IMEI ${im} sudah TERJUAL dan tidak bisa ditransfer`);
          return;
        }
      }
    }

    const error = validateForm();
    if (error) {
      alert("❌ " + error);
      return;
    }

    if (!isKategoriImeiFinal) {
      if (!form.qty || form.qty <= 0) {
        alert("❌ Qty harus diisi untuk barang non IMEI");
        return;
      }
    }

    if (!isKategoriImeiFinal) {
      if (form.qty > stokTersedia) {
        alert(`❌ Qty melebihi stok tersedia.\nStok tersedia: ${stokTersedia}`);
        return;
      }
    }

    if (!isKategoriImeiFinal) {
      const stokFinal = getSafeStokNonImei();

      if (form.qty > stokFinal) {
        alert(`❌ Qty melebihi stok tersedia (${stokFinal})`);
        return;
      }
    }

    // ================= HARD FINAL DUPLICATE CHECK =================
    const allImeisNow = [
      ...form.imeis,
      ...daftarTransfer.flatMap((i) => i.imeis || []),
    ].map(normalizeImei);

    const uniqueSet = new Set(allImeisNow);

    if (uniqueSet.size !== allImeisNow.length) {
      alert("❌ Terdapat IMEI duplikat. Transfer dibatalkan.");
      return;
    }

    const newItem = {
      ...form,
      id: Date.now(),

      // ✅ SAFE ENGINE v3
      qty: isKategoriImei ? form.imeis?.length || 0 : Number(form.qty || 0),
    };

    const allImeis = [
      ...daftarTransfer.flatMap((i) => i.imeis || []),
      ...(form.imeis || []),
    ];

    const duplicateImeis = allImeis.filter(
      (im, idx) => allImeis.indexOf(im) !== idx
    );

    if (duplicateImeis.length > 0) {
      alert(
        "❌ IMEI tidak boleh duplikat:\n" +
          [...new Set(duplicateImeis)].join(", ")
      );
      return;
    }

    // masuk ke daftar transfer
    setDaftarTransfer((prev) => [...prev, newItem]);

    // reset form supaya bisa input barang berikutnya
    setForm({
      ...initialForm,
      tanggal: form.tanggal,
      noDo: form.noDo,
      noSuratJalan: form.noSuratJalan,
      tokoPengirim: form.tokoPengirim,
      ke: form.ke,
      pengirim: form.pengirim,
    });
  };

  // ================= FILTER HISTORY (FIX ERROR) =================
  const filteredHistory = useMemo(() => {
    if (!Array.isArray(history)) return [];

    return history.filter((h) =>
      filterStatus === "ALL" ? true : h.status === filterStatus
    );
  }, [history, filterStatus]);

  // ================= REAL STOCK FINAL (IMEI + NON IMEI) =================
  const realStock = useMemo(() => {
    const map = {};

    // 🔹 HITUNG IMEI (AVAILABLE saja)
    inventory.forEach((item) => {
      if (item.status === "AVAILABLE") {
        const key = `${item.toko}|${item.namaBrand}|${item.namaBarang}`;
        if (!map[key]) map[key] = 0;
        map[key]++;
      }
    });

    // 🔹 TAMBAH NON IMEI (ACCESSORIES)
    inventoryAccessories.forEach((item) => {
      const key = `${item.toko}|${item.namaBrand}|${item.namaBarang}`;
      map[key] = Number(item.qty || 0);
    });

    return map;
  }, [inventory, inventoryAccessories]);

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

    if (!isBarangValidDiMaster()) {
      return "Nama Brand atau Nama Barang tidak ada di Master Barang";
    }

    if (
      KATEGORI_WAJIB_IMEI.includes(String(form.kategori || "").toUpperCase()) &&
      (!Array.isArray(form.imeis) || form.imeis.length === 0)
    ) {
      return "Kategori ini wajib menggunakan No IMEI";
    }

    // ================= VALIDASI NON IMEI WAJIB ADA STOK =================
    if (!isKategoriImei) {
      const stokReal = getSafeStokNonImei();

      // 🔥 fallback ke stokTersedia kalau accessories belum kebaca
      const finalStok = stokReal > 0 ? stokReal : Number(stokTersedia || 0);

      console.log("DEBUG STOK:", {
        stokAccessories: stokReal,
        stokTersedia,
        finalStok,
      });

      if (finalStok <= 0 && !isNonImeiKategori) {
        return `Stok barang ${form.barang} di toko ${form.tokoPengirim} tidak tersedia`;
      }

      if (Number(form.qty) > finalStok) {
        return `Qty melebihi stok tersedia (${finalStok})`;
      }
    }

    return null; // ⬅️ tetap paling bawah
  };

  // ================= AUTO CLEAN LOCK =================
  const cleanOrphanLock = async (imei) => {
    const invRef = ref(db, `inventory/${form.tokoPengirim}/${imei}`);

    const found = inventory.find((i) => i.imei === imei);
    if (!found) return;

    // Kalau status AVAILABLE tapi masih LOCK → berarti orphan lock
    if (found.status === "AVAILABLE" && found.LOCK_TRANSFER === true) {
      await update(invRef, {
        LOCK_TRANSFER: false,
        TRANSFER_ID: null,
      });
    }
  };

  // ================= SUBMIT TRANSFER (FINAL 100%) =================
  // ================= SUBMIT TRANSFER (FIX 100%) =================
  const submitTransfer = async () => {
    // ==========================================
    // 🔒 WAJIB KLIK TAMBAH TRANSFER BARANG DULU
    // ==========================================
    if (!Array.isArray(daftarTransfer) || daftarTransfer.length === 0) {
      alert("❌ Silakan klik tombol TAMBAH TRANSFER BARANG terlebih dahulu");
      return;
    }
    try {
      let transferList = [...daftarTransfer];

      // 🔥 AUTO UNLOCK ORPHAN LOCK
      for (const item of daftarTransfer) {
        for (const imei of item.imeis || []) {
          await cleanOrphanLock(imei);
        }
      }

      for (const item of transferList) {
        for (const im of item.imeis || []) {
          const found = inventory.find(
            (i) => normalizeImei(i.imei) === normalizeImei(im)
          );
          console.log("DEBUG INVENTORY IMEI:", found);
        }
      }

      if (form.imeis?.length > 0) {
        for (const imei of form.imeis) {
          await cleanOrphanLock(imei);
        }
      }

      // ==========================================
      // JIKA FORM BELUM MASUK DAFTAR
      // ==========================================
      if (transferList.length === 0) {
        const error = validateForm();
        if (error) {
          alert("❌ " + error);
          return;
        }

        transferList.push({
          ...form,
          id: Date.now(),

          // ✅ FIX IMEI QTY
          qty: Array.isArray(form.imeis)
            ? form.imeis.length
            : Number(form.qty || 0),
        });
      }

      // =====================================
      // CEK DUPLIKAT IMEI GLOBAL
      // =====================================
      const allImeis = transferList.flatMap((i) => i.imeis || []);

      const normalized = allImeis.map(normalizeImei);
      const unique = new Set(normalized);

      if (unique.size !== normalized.length) {
        alert("❌ Terdapat IMEI duplikat dalam daftar transfer");
        return;
      }

      const uniqueCheck = new Set(allImeis);

      if (uniqueCheck.size !== allImeis.length) {
        alert("❌ Terdapat IMEI duplikat dalam daftar transfer");
        return;
      }

      const duplicateImeis = allImeis.filter(
        (im, idx) => allImeis.indexOf(im) !== idx
      );

      if (duplicateImeis.length > 0) {
        alert(
          "❌ Terdapat IMEI duplikat:\n" +
            [...new Set(duplicateImeis)].join(", ")
        );
        return;
      }

      // =====================================
      // CEK IMEI SEDANG DIPAKAI TRANSFER LAIN
      // =====================================
      const pendingImeis = history
        .filter((r) => r.status === "Pending")
        .flatMap((r) => r.imeis || []);

      const usedImeis = allImeis.filter((im) => pendingImeis.includes(im));

      if (usedImeis.length > 0) {
        alert(
          "❌ IMEI sedang digunakan di transfer lain:\n" +
            [...new Set(usedImeis)].join(", ")
        );
        return;
      }

      // ==========================================
      // VALIDASI PER ITEM (LOGIC LAMA TIDAK DIUBAH)
      // ==========================================
      for (const item of transferList) {
        if (!item.tokoPengirim) return alert("❌ Toko pengirim kosong");

        if (!item.ke) return alert("❌ Toko tujuan kosong");

        if (!item.barang) return alert("❌ Nama barang kosong");

        // ===============================
        // VALIDASI IMEI
        // ===============================
        if (Array.isArray(item.imeis) && item.imeis.length > 0) {
          const invalidImeis = item.imeis.filter((im) => {
            const found = inventory.find((i) => i.imei === im);

            if (!found) return true;
            if (found.status === "SOLD") return true;

            const allowedStatus = [
              "AVAILABLE",
              "REFUND",
              "TRANSFER_MASUK",
              "PEMBELIAN",
              "OUT", // ✅ TAMBAHAN
            ];

            if (!allowedStatus.includes(found.status)) return true;

            return false;
          });

          if (invalidImeis.length > 0) {
            alert(
              "❌ IMEI tidak valid / sudah keluar:\n" + invalidImeis.join(", ")
            );
            return;
          }
        }
      }

      // ==========================================
      // SIMPAN TRANSFER
      // ==========================================
      for (const item of transferList) {
        const transferRef = push(ref(db, "transfer_barang"));
        const transferId = transferRef.key;

        const safeQty =
          Array.isArray(item.imeis) && item.imeis.length > 0
            ? item.imeis.length
            : Number(item.qty || 0);

        await update(transferRef, {
          ...item,
          qty: safeQty, // ✅ SAFE ENGINE V3
          id: transferId,
          status: "Pending",
          createdAt: Date.now(),
        });

        // ======================================
        // LOCK IMEI
        // ======================================
        for (const imei of item.imeis || []) {
          const invRef = ref(db, `inventory/${item.tokoPengirim}/${imei}`);

          // ===============================
          // VALIDASI NON IMEI (WAJIB SESUAI STOK TOKO)
          // ===============================
          if (!Array.isArray(item.imeis) || item.imeis.length === 0) {
            const stokTokoIni = inventoryAccessories.find(
              (i) =>
                i.toko.toUpperCase() === item.tokoPengirim.toUpperCase() &&
                i.namaBrand.toUpperCase() === item.brand.toUpperCase() &&
                i.namaBarang.toUpperCase() === item.barang.toUpperCase()
            );

            const stokReal = stokTokoIni
              ? Number(stokTokoIni.qty || 0)
              : getSafeStokNonImei(); // 🔥 fallback aman

            if (stokReal <= 0) {
              alert(
                `❌ Barang ${item.barang} tidak tersedia di toko ${item.tokoPengirim}`
              );
              return;
            }

            if (Number(item.qty) > stokReal) {
              alert(
                `❌ Qty melebihi stok toko ${item.tokoPengirim}\n` +
                  `Stok tersedia: ${stokReal}`
              );
              return;
            }
          }

          // ✅ FIX AUTO UNLOCK (REFUND / OLD TRANSFER)
          await update(invRef, {
            TRANSFER_ID: null,
            LOCK_TRANSFER: false,
          });

          // LOCK BARU
          await lockImeiTransfer({
            imei,
            transferId,
            tokoAsal: item.tokoPengirim,
          });

          // UPDATE STATUS OUT
          await update(invRef, {
            STATUS: "OUT",
            TRANSFER_ID: transferId,
            UPDATED_AT: Date.now(),
          });
        }
      }

      alert("✅ Transfer masuk tabel & siap di-approve");

      setForm(initialForm);
      setDaftarTransfer([]);
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
              readOnly={isKategoriImeiFinal}
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

        {daftarTransfer.length > 0 && (
          <div className="mt-6">
            <h3 className="font-bold text-indigo-700 mb-2">
              DAFTAR TRANSFER BARANG
            </h3>

            <table className="w-full border text-sm">
              <thead className="bg-indigo-100">
                <tr>
                  <th>No</th>
                  <th>Kategori</th>
                  <th>Brand</th>
                  <th>Barang</th>
                  <th>Qty</th>
                  <th>IMEI</th>
                  <th>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {daftarTransfer.map((item, i) => (
                  <tr key={item.id} className="border-t">
                    <td>{i + 1}</td>
                    <td>{item.kategori}</td>
                    <td>{item.brand}</td>
                    <td>{item.barang}</td>
                    <td>{item.qty}</td>
                    <td>
                      {item.imeis?.length > 0 ? item.imeis.join(", ") : "-"}
                    </td>

                    <td className="flex gap-2">
                      <button
                        onClick={() => handleEditTransfer(i)}
                        className="px-2 py-1 bg-yellow-500 text-white rounded"
                      >
                        EDIT
                      </button>

                      <button
                        onClick={() => handleDeleteTransfer(i)}
                        className="px-2 py-1 bg-red-600 text-white rounded"
                      >
                        DELETE
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleTambahTransfer}
            className="btn-indigo flex items-center gap-2"
          >
            <FaPlus /> TAMBAH TRANSFER BARANG
          </button>

          <button
            onClick={submitTransfer}
            disabled={loading || daftarTransfer.length === 0}
            className={`btn-submit ${
              daftarTransfer.length === 0 ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Processing..." : "SUBMIT TRANSFER"}
          </button>
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
