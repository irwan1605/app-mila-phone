// src/components/Navbar.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./Navbar.css";
import { LogOut, UserCircle } from "lucide-react";
import { FaBell } from "react-icons/fa";

import { ref, onValue } from "firebase/database";
import { db } from "../firebase/FirebaseInit";
import { updateUserAccount } from "../services/FirebaseService";
import { renameUsername } from "../services/FirebaseService";

// import {
//   listenUsers,
//   listenTransferRequests,
// } from "../services/FirebaseService";
import FirebaseService from "../services/FirebaseService";

const Navbar = ({ user, onLogout }) => {
  const [showWhatsAppDropdown, setShowWhatsAppDropdown] = useState(false);
  const [firebaseUsers, setFirebaseUsers] = useState([]);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();
  const [notifTransfer, setNotifTransfer] = useState([]);
  const [pendingTransfer, setPendingTransfer] = useState([]);

  // ===== EDIT ACCOUNT STATE =====
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editPassword2, setEditPassword2] = useState("");
  const [showEditAccount, setShowEditAccount] = useState(false);
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    return onValue(ref(db, "toko"), (snap) => {
      const rows = [];
  
      snap.forEach((tokoSnap) => {
        const trxSnap = tokoSnap.child("transaksi");
        if (!trxSnap.exists()) return;
  
        trxSnap.forEach((trx) => {
          const v = trx.val();
          if (!v.IMEI) return;
  
          const metode = String(v.PAYMENT_METODE || "").toUpperCase();
          let status = "AVAILABLE";
          if (metode === "PENJUALAN") status = "OUT";
  
          rows.push({ imei: String(v.IMEI).trim(), status });
        });
      });
  
      setInventory(rows);
    });
  }, []);
  
  


  // ✅ SAFE USER DARI LOCALSTORAGE
  const activeUser = useMemo(() => {
    try {
      return user || JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  }, [user]);

  const TOKO_LOGIN = useMemo(() => {
    try {
      const u = activeUser || JSON.parse(localStorage.getItem("user"));
      return String(u?.tokoNama || u?.toko || "").toUpperCase();
    } catch {
      return "";
    }
  }, [activeUser]);

  useEffect(() => {
    return FirebaseService.listenTransferRequests((rows) => {
      const relevant = (rows || []).filter((t) => {
        if (t.status !== "Pending") return false;
  
        const dari = String(t.dari || t.tokoPengirim || "").toUpperCase();
        const ke = String(t.ke || "").toUpperCase();
  
        return dari === TOKO_LOGIN || ke === TOKO_LOGIN;
      });
  
      setPendingTransfer(relevant);
    });
  }, [TOKO_LOGIN]);

  useEffect(() => {
    if (!pendingTransfer.length) return;
  
    const validPending = pendingTransfer.filter((t) => {
      if (!Array.isArray(t.imeis)) return false;
  
      return t.imeis.every((im) => {
        const found = inventory.find((i) => i.imei === im);
        return found && found.status === "AVAILABLE";
      });
    });
  
    if (validPending.length > 0) {
      bellAudio.current?.play().catch(() => {});
    }
  }, [pendingTransfer, inventory]);
  
  



  const bellAudio = useRef(null);

  useEffect(() => {
    return onValue(ref(db, "toko"), (snap) => {
      const map = {}; // key = imei
  
      snap.forEach((tokoSnap) => {
        const trxSnap = tokoSnap.child("transaksi");
        if (!trxSnap.exists()) return;
  
        trxSnap.forEach((trx) => {
          const v = trx.val();
          if (!v.IMEI) return;
  
          const imei = String(v.IMEI).trim();
          const metode = String(v.PAYMENT_METODE || "").toUpperCase();
  
          // DEFAULT
          if (!map[imei]) {
            map[imei] = { imei, status: "AVAILABLE" };
          }
  
          // RULE MUTLAK
          if (metode === "PENJUALAN") {
            map[imei].status = "SOLD";   // 🔥 PALING KUAT
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
  
  
  
  

  // useEffect(() => {
  //   const unsub = listenTransferRequests((list) => {
  //     const pending = (list || []).filter((t) => t.status === "Pending");
  //     setNotifTransfer(pending);
  //   });

  //   return () => unsub && unsub();
  // }, []);

  // // ✅ AMBIL DATA USER DARI FIREBASE
  // useEffect(() => {
  //   const unsub = listenUsers((list) => {
  //     setFirebaseUsers(Array.isArray(list) ? list : []);
  //   });

  //   return () => unsub && unsub();
  // }, []);

  const handleUpdateAccount = async () => {
    const session = JSON.parse(localStorage.getItem("user"));

    if (!session || !session.username) {
      alert("❌ Session tidak valid, silakan login ulang");
      return;
    }

    if (!editPassword || editPassword !== editPassword2) {
      alert("Password tidak sama");
      return;
    }

    try {
      await updateUserAccount(session.username, {
        password: editPassword,
      });

      alert("✅ Password berhasil diubah, silakan login ulang");
      localStorage.removeItem("user");
      window.location.href = "/";
    } catch (err) {
      console.error(err);
      alert("❌ Gagal update akun");
    }
  };

  
  

  // ✅ SINKRONKAN NAMA DARI USER MANAGEMENT
  const finalUser = useMemo(() => {
    if (!activeUser?.username) return activeUser;

    const found = firebaseUsers.find(
      (u) => u.username?.toLowerCase() === activeUser.username?.toLowerCase()
    );

    return found ? { ...activeUser, name: found.name } : activeUser;
  }, [activeUser, firebaseUsers]);

  const handleRenameAccount = async () => {
    const session = JSON.parse(localStorage.getItem("user"));

    if (!session || !session.username) {
      alert("❌ Session tidak valid, silakan login ulang");
      return;
    }

    if (!editUsername) {
      alert("Username baru wajib diisi");
      return;
    }

    if (editPassword && editPassword !== editPassword2) {
      alert("Password tidak sama");
      return;
    }

    try {
      await renameUsername(
        session.username, // OLD KEY
        editUsername, // NEW KEY
        editPassword
      );

      alert(
        "✅ Username berhasil diubah\nSilakan login ulang dengan username baru"
      );

      // 🔐 FORCE LOGOUT
      localStorage.removeItem("user");
      window.location.href = "/";
    } catch (err) {
      console.error(err);
      alert("❌ " + err.message);
    }
  };

  const handleWhatsAppClick = (phoneNumber) => {
    window.open(`https://wa.me/${phoneNumber}`, "_blank");
  };

  const picContacts = [
    { name: "PIC CILANGKAP PUSAT", phone: "6281384158142" },
    { name: "PIC CIBINONG", phone: "6287737398191" },
    { name: "PIC GAS ALAM", phone: "628121854336" },
    { name: "PIC CITEUREUP", phone: "6281284458160" },
    { name: "PIC CIRACAS", phone: "6287878712342" },
    { name: "PIC METLAND 1", phone: "6281384158142" },
    { name: "PIC METLAND 2", phone: "6287737398191" },
    { name: "PIC PITARA", phone: "628121854336" },
    { name: "PIC KOTA WISATA", phone: "6281284458160" },
    { name: "PIC SAWANGAN", phone: "6287878712342" },
  ];

  const handleLogout = () => {
    localStorage.removeItem("user");
    if (typeof onLogout === "function") onLogout();
    navigate("/", { replace: true });
  };

  // ✅ CLOSE DROPDOWN JIKA KLIK DI LUAR
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowWhatsAppDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  return (
    <nav className="bg-gradient-to-r from-indigo-600 to-blue-600 shadow-xl py-4 px-6 flex justify-between items-center text-white">
      <h1 className="text-xl md:text-2xl font-bold tracking-wide">
        Monitoring & Report Management — MILA PHONE
      </h1>

      <div
        onClick={() =>
          navigate("/transfer-barang", {
            state: {
              fromNotif: true,
              filterStatus: "Pending",
            },
          })
        }
        className={`
        relative cursor-pointer
        ${pendingTransfer.length > 0 ? "animate-pulse" : ""}
      `}
      >
        <FaBell
          className={`
          text-2xl transition-all
          ${
            pendingTransfer.length > 0
              ? "text-red-500 drop-shadow-[0_0_12px_rgba(255,0,0,0.9)] animate-bounce"
              : "text-gray-500"
          }
        `}
        />

        {pendingTransfer.length > 0 && (
          <span
            className="
            absolute -top-2 -right-2
            bg-red-600 text-white text-xs
            px-2 py-0.5 rounded-full
            animate-ping
          "
          >
            {pendingTransfer.length}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4" ref={dropdownRef}>
        {/* ✅ ✅ ✅ USER ICON + NAMA USER */}
        {finalUser?.username && (
          <div className="bg-white px-4 py-2 rounded-lg shadow font-bold text-black text-sm md:text-base flex items-center gap-2 shadow-md transition">
            {/* ✅ ICON USER BERWARNA */}
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
              <UserCircle size={22} className="text-white" />
            </div>

            {/* ✅ NAMA USER */}
            <span>{finalUser.name || finalUser.username}</span>
          </div>
        )}

        {/* ✅ WHATSAPP */}
        <div className="relative">
          <button
            onClick={() => setShowWhatsAppDropdown(!showWhatsAppDropdown)}
            className="wa-btn px-4 py-2 bg-green-500 text-white hover:bg-green-600 rounded-lg shadow-md transition"
          >
            Chat WhatsApp
          </button>

          {showWhatsAppDropdown && (
            <div className="dropdown-animate absolute right-0 mt-2 w-64 bg-white text-black border rounded-lg shadow-xl z-10">
              {picContacts.map((pic, index) => (
                <button
                  key={index}
                  onClick={() => handleWhatsAppClick(pic.phone)}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-200 transition"
                >
                  {pic.name}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setShowEditAccount(true)}
          className="ml-2 text-xs px-2 py-1 rounded bg-yellow-400 text-black hover:bg-yellow-500"
        >
          ⚙️ Update Akun
        </button>

        {/* ✅ LOGOUT */}
        <button
          type="button"
          onClick={handleLogout}
          className="logout-btn flex items-center gap-2 px-4 py-2 rounded-lg shadow-md transition"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
      {showEditAccount && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl p-6 w-96 space-y-3 text-black">
            <h3 className="text-lg font-bold">Edit Akun</h3>

            <input
              className="w-full border rounded p-2"
              placeholder="Username Baru"
              value={editUsername}
              onChange={(e) => setEditUsername(e.target.value.toUpperCase())}
            />

            <input
              type="password"
              className="w-full border rounded p-2"
              placeholder="Password Baru (opsional)"
              onChange={(e) => setEditPassword(e.target.value)}
            />

            <input
              type="password"
              className="w-full border rounded p-2"
              placeholder="Ulangi Password"
              onChange={(e) => setEditPassword2(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowEditAccount(false)}
                className="px-4 py-2 rounded bg-gray-300"
              >
                Batal
              </button>
              <button
                onClick={handleRenameAccount}
                className="px-4 py-2 rounded bg-indigo-600 text-white"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
