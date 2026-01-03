// src/components/Navbar.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./Navbar.css";
import { LogOut, UserCircle } from "lucide-react";
import { FaBell } from "react-icons/fa";

import { ref, onValue } from "firebase/database";
import { db } from "../firebase/FirebaseInit";

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

  // ✅ SAFE USER DARI LOCALSTORAGE
  const activeUser = useMemo(() => {
    try {
      return user || JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  }, [user]);

  

  useEffect(() => {
    return FirebaseService.listenTransferRequests((rows) => {
      const pending = (rows || []).filter(
        (t) => t.status === "Pending"
      );
      setPendingTransfer(pending);
    });
  }, []);

  useEffect(() => {
    if (notifTransfer.length > 0) {
      console.log("🔔 Ada transfer menunggu approval");
    }
  }, [notifTransfer]);

  useEffect(() => {
    return onValue(ref(db, "transfer_barang"), (snap) => {
      const pending = [];
      snap.forEach((c) => {
        if (c.val().status === "Pending") pending.push(c.val());
      });
      setPendingTransfer(pending);
    });
  }, []);

  const bellAudio = useRef(null);

useEffect(() => {
  bellAudio.current = new Audio("/bell.mp3");
}, []);

useEffect(() => {
  if (pendingTransfer.length > 0) {
    bellAudio.current?.play().catch(() => {});
  }
}, [pendingTransfer.length]);
  

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

  

  

  // ✅ SINKRONKAN NAMA DARI USER MANAGEMENT
  const finalUser = useMemo(() => {
    if (!activeUser?.username) return activeUser;

    const found = firebaseUsers.find(
      (u) => u.username?.toLowerCase() === activeUser.username?.toLowerCase()
    );

    return found ? { ...activeUser, name: found.name } : activeUser;
  }, [activeUser, firebaseUsers]);

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
    </nav>
  );
};

export default Navbar;
