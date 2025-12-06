import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // ✅ TAMBAHKAN INI
import {
  FaUsers,
  FaUserTie,
  FaStore,
  FaBoxOpen,
  FaTruck,
  FaUserShield,
  FaUserFriends,
  FaUserTag,
} from "react-icons/fa";

import MasterPelangganCard from "../components/master-management/MasterPelangganCard";
import MasterSalesCard from "../components/master-management/MasterSalesCard";
import MasterStoreHeadCard from "../components/master-management/MasterStoreHeadCard";
import MasterStoreLeaderCard from "../components/master-management/MasterStoreLeaderCard";
import MasterSalesTitipanCard from "../components/master-management/MasterSalesTitipanCard";
import MasterTokoCard from "../components/master-management/MasterTokoCard";
// ❌ TIDAK DIPAKAI LAGI:
// import MasterBarangHargaCard from "../components/master-management/MasterBarangHargaCard";
import MasterSupplierCard from "../components/master-management/MasterSupplierCard";

const cardsConfig = [
  {
    key: "masterPelanggan",
    title: "MASTER PELANGGAN",
    description: "Kelola data akun / pelanggan.",
    icon: FaUsers,
    gradient: "from-sky-500 via-sky-400 to-cyan-400",
  },
  {
    key: "masterSales",
    title: "MASTER SALES",
    description: "Kelola data sales lapangan.",
    icon: FaUserTie,
    gradient: "from-emerald-500 via-emerald-400 to-green-400",
  },
  {
    key: "masterStoreHead",
    title: "MASTER STORE HEAD (SH)",
    description: "Kelola data Store Head (SH).",
    icon: FaUserShield,
    gradient: "from-indigo-500 via-indigo-400 to-blue-400",
  },
  {
    key: "masterStoreLeader",
    title: "MASTER STORE LEADER (SL)",
    description: "Kelola data Store Leader (SL).",
    icon: FaUserFriends,
    gradient: "from-purple-500 via-purple-400 to-fuchsia-400",
  },
  {
    key: "masterSalesTitipan",
    title: "MASTER SALES TITIPAN (ST)",
    description: "Kelola data Sales Titipan (ST).",
    icon: FaUserTag,
    gradient: "from-amber-500 via-amber-400 to-orange-400",
  },
  {
    key: "masterToko",
    title: "MASTER TOKO",
    description: "Kelola data nama toko dan alamat.",
    icon: FaStore,
    gradient: "from-rose-500 via-rose-400 to-pink-400",
  },
  {
    key: "masterBarangHarga",
    title: "BARANG & HARGA",
    description: "Kelola master brand, kategori brand & harga.",
    icon: FaBoxOpen,
    gradient: "from-cyan-500 via-sky-400 to-blue-400",
  },
  {
    key: "masterSupplier",
    title: "MASTER SUPPLIER",
    description: "Kelola data supplier.",
    icon: FaTruck,
    gradient: "from-slate-500 via-slate-400 to-gray-400",
  },
];

export default function MasterManagement() {
  const [activeKey, setActiveKey] = useState("masterPelanggan");
  const navigate = useNavigate(); // ✅ INI KUNCINYA

  const renderActiveCard = () => {
    switch (activeKey) {
      case "masterPelanggan":
        return <MasterPelangganCard />;
      case "masterSales":
        return <MasterSalesCard />;
      case "masterStoreHead":
        return <MasterStoreHeadCard />;
      case "masterStoreLeader":
        return <MasterStoreLeaderCard />;
      case "masterSalesTitipan":
        return <MasterSalesTitipanCard />;
      case "masterToko":
        return <MasterTokoCard />;
      case "masterSupplier":
        return <MasterSupplierCard />;
      default:
        return null;
    }
  };

  // ✅ KHUSUS UNTUK BARANG & HARGA → REDIRECT KE MASTER BARANG
  const handleCardClick = (key) => {
    if (key === "masterBarangHarga") {
      navigate("/master-barang"); // ✅ SESUAI ROUTE MASTER BARANG
    } else {
      setActiveKey(key);
    }
  };

  return (
    <div className="p-4 md:p-6 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-wide">
          MASTER MANAGEMENT
        </h1>
        <p className="text-sm md:text-base text-slate-600 mt-1">
          Kelola seluruh master data (Pelanggan, Sales, Store, Barang, Supplier)
          secara realtime & terintegrasi Firebase tanpa reload.
        </p>
      </div>

      {/* Grid pilihan Card / Sub Menu */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {cardsConfig.map((card) => {
          const Icon = card.icon;
          const isActive = activeKey === card.key;

          return (
            <button
              key={card.key}
              onClick={() => handleCardClick(card.key)} // ✅ GANTI INI
              className={[
                "relative w-full text-left rounded-xl shadow-lg overflow-hidden",
                "bg-gradient-to-br",
                card.gradient,
                "transition transform hover:-translate-y-1 hover:shadow-2xl",
                "border border-white/60",
                isActive ? "ring-2 ring-offset-2 ring-white/80" : "",
              ].join(" ")}
            >
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.6),_transparent_60%)]" />
              <div className="relative p-4 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                  <Icon className="text-white text-xl" />
                </div>
                <div>
                  <h2 className="text-sm md:text-base font-bold text-white drop-shadow-sm">
                    {card.title}
                  </h2>
                  <p className="text-xs md:text-sm text-white/90 mt-1">
                    {card.description}
                  </p>
                </div>
              </div>

              {isActive && card.key !== "masterBarangHarga" && (
                <div className="relative px-4 pb-3 text-xs text-white/90">
                  <span className="inline-flex items-center gap-1 bg-white/15 px-2 py-1 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />
                    Aktif
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Area konten kartu aktif */}
      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-slate-100 p-4 md:p-5">
        {renderActiveCard()}
      </div>
    </div>
  );
}
