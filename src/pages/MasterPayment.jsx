import React, { useState } from "react";
import {
  FaCreditCard,
  FaHandshake,
  FaPercentage,
  FaCalendarAlt,
  FaTicketAlt,
} from "react-icons/fa";

import MasterPaymentMetodeCard from "../components/master-management/MasterPaymentMetodeCard";
import MasterTenorCard from "../components/master-management/MasterTenorCard ";
import MasterVoucherCard from "../components/master-management/MasterVoucherCard ";
import MasterMDRCard from "../components/master-management/MasterMDRCard ";


const cardsConfig = [
  {
    key: "paymentMetode",
    title: "MASTER PAYMENT METODE",
    desc: "Kelola metode pembayaran",
    icon: FaCreditCard,
    gradient: "from-indigo-500 via-indigo-400 to-blue-400",
  },
  {
    key: "mdr",
    title: "MASTER MDR (%)",
    desc: "Kelola biaya MDR",
    icon: FaPercentage,
    gradient: "from-rose-500 via-rose-400 to-pink-400",
  },
  {
    key: "tenor",
    title: "MASTER TENOR",
    desc: "Kelola tenor cicilan",
    icon: FaCalendarAlt,
    gradient: "from-amber-500 via-amber-400 to-orange-400",
  },
  {
    key: "voucher",
    title: "MASTER VOUCHER",
    desc: "Kelola voucher promo",
    icon: FaTicketAlt,
    gradient: "from-teal-500 via-teal-400 to-cyan-400",
  },
];

export default function MasterPayment() {
  const [activeKey, setActiveKey] = useState("paymentMetode");

  const renderContent = () => {
    switch (activeKey) {
      case "paymentMetode":
        return <MasterPaymentMetodeCard />;
      case "mdr":
        return <MasterMDRCard />; 
      case "tenor":
        return <MasterTenorCard />;
      case "voucher":
    return <MasterVoucherCard />
      //   return null;
    }
  };

  return (
    <div className="p-4 md:p-6 bg-gradient-to-br from-indigo-50 via-sky-50 to-purple-100 min-h-screen">
      <h1 className="text-3xl font-extrabold mb-6">MASTER PAYMENT</h1>

      {/* ================= CARD MENU ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 mb-6">
        {cardsConfig.map((c) => {
          const Icon = c.icon;
          const active = activeKey === c.key;

          return (
            <button
              key={c.key}
              onClick={() => setActiveKey(c.key)}
              className={[
                "rounded-xl text-left shadow-lg overflow-hidden transition",
                "bg-gradient-to-br text-white",
                c.gradient,
                active ? "ring-2 ring-white" : "",
              ].join(" ")}
            >
              <div className="p-4 flex gap-3">
                <div className="p-2 bg-white/20 rounded-lg">
                  <Icon className="text-xl" />
                </div>
                <div>
                  <h2 className="font-bold text-sm">{c.title}</h2>
                  <p className="text-xs text-white/90">{c.desc}</p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* ================= CONTENT ================= */}
      <div className="bg-white/80 backdrop-blur rounded-2xl shadow-xl p-4">
        {renderContent()}
      </div>
    </div>
  );
}
