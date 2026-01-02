// src/components/master-management/MasterSalesTitipanCard.jsx
import React from "react";
import MasterCrudCard from "./MasterCrudCard";
import { exportToExcel } from "../../utils/exportToExcel";

export default function MasterSalesTitipanCard() {
  const fields = [
    { name: "namaTitipan", label: "Nama Sales Titipan", required: true },
    { name: "nik", label: "NIK" },
    { name: "noTelpon", label: "No. Telpon" },
    { name: "alamat", label: "Alamat", type: "textarea" },
  ];

  return (
    <MasterCrudCard
      title="MASTER SALES TITIPAN (ST)"
      subtitle="Data sales titipan"
      collectionKey="masterSalesTitipan"
      fields={fields}
      excelFileName="Master_SalesTitipan"

      listenFnName="listenMasterSalesTitipan"
      addFnName="addMasterSalesTitipan"
      updateFnName="updateMasterSalesTitipan"
      deleteFnName="deleteMasterSalesTitipan"
    />
  );
}
