import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import "./Navbar.css";
import { LogOut } from "lucide-react";

const Navbar = ({ user, onLogout, isAuthenticated }) => {
  const [showWhatsAppDropdown, setShowWhatsAppDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const handleWhatsAppClick = (phoneNumber) => {
    window.open(`https://wa.me/${phoneNumber}`, "_blank");
  };

  const picContacts = [
    { name: "PIC Toko 1", phone: "6281384158142" },
    { name: "PIC Toko 2", phone: "6287737398191" },
    { name: "PIC Toko 3", phone: "628121854336" },
    { name: "PIC Toko 4", phone: "6281284458160" },
    { name: "PIC Toko 5", phone: "6287878712342" },
  ];

  const handleLogout = () => {
    localStorage.removeItem("user");
    if (typeof onLogout === "function") onLogout(); // App.jsx akan setUser(null)
    // Tidak perlu navigate(); ketika user null,
    // App.jsx otomatis render branch login dan route "*" → "/"
  };

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
    <nav className="bg-white shadow-md py-4 px-6 flex justify-between items-center">
      <h1 className="text-2xl font-bold">
        Aplikasi Monitoring dan Report Management MILA PHONE
      </h1>

      <div className="flex items-center gap-2" ref={dropdownRef}>
        {/* Search box */}
        <input
          type="text"
          placeholder="Search..."
          className="border border-gray-300 px-4 py-2 rounded"
        />

        {/* Chat WhatsApp button */}
        <div className="relative">
          <button
            onClick={() => setShowWhatsAppDropdown(!showWhatsAppDropdown)}
            className="px-4 py-2 bg-green-500 text-white hover:bg-green-700 rounded-lg wa-btn "
          >
            Chat WhatsApp
          </button>

          {/* Dropdown WhatsApp PIC */}
          {showWhatsAppDropdown && (
            <div className="absolute right-0 mt-2 w-56 bg-white text-black border rounded-lg shadow-lg z-10">
              {picContacts.map((pic, index) => (
                <button
                  key={index}
                  onClick={() => handleWhatsAppClick(pic.phone)}
                  className="block w-full text-left px-4 py-2 hover:bg-gray-200 wa-icon"
                >
                  {pic.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {isAuthenticated && user ? (
          <div className="flex gap-4 items-center">
            {/* Menu untuk Superadmin */}
            {user.role === "superadmin" && (
              <>
                <Link to="/dashboard">Dashboard</Link>
                <Link to="/user-management">User Management</Link>
                <Link to="/laporan">Laporan Semua Toko</Link>
              </>
            )}

            {/* Menu untuk PIC */}
            {user.role === "pic" && (
              <>
                <Link to="/dashboard">Dashboard</Link>
                <Link to={`/toko/${user.toko[0]}`}>Kelola {user.toko[0]}</Link>
              </>
            )}

            {/* Menu untuk Staff */}
            {user.role === "staff" && (
              <>
                <Link to={`/toko/${user.toko[0]}`}>Toko {user.toko[0]}</Link>
              </>
            )}
          </div>
        ) : (
          <div className="flex gap-4 ">
            {/* ⬇️⬇️ Perubahan di sini: Login ke "/" (halaman login) */}
            <button
              type="button"
              onClick={handleLogout}
              className="logout-btn "
            >
              <LogOut size={18} className="logout-icon " />
              <span>Logout</span>
            </button>

            {/* Register tetap ke "/register" */}
           
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
