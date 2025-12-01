// src/components/Navbar.jsx
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import "./Navbar.css";
import { LogOut, UserCircle } from "lucide-react";

import { listenUsers } from "../services/FirebaseService";

const Navbar = ({ user, onLogout }) => {
  const [showWhatsAppDropdown, setShowWhatsAppDropdown] = useState(false);
  const [firebaseUsers, setFirebaseUsers] = useState([]);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // ✅ SAFE USER DARI LOCALSTORAGE
  const activeUser = useMemo(() => {
    try {
      return user || JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  }, [user]);

  // ✅ AMBIL DATA USER DARI FIREBASE
  useEffect(() => {
    const unsub = listenUsers((list) => {
      setFirebaseUsers(Array.isArray(list) ? list : []);
    });

    return () => unsub && unsub();
  }, []);

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
