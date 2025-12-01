// src/components/master-management/MasterBarangHargaCard.jsx
import React from "react";
import MasterCrudCard from "./MasterCrudCard";

export default function MasterBarangHargaCard() {
  const fields = [
    { name: "namaMasterBrand", label: "Nama Master Brand" },
    { name: "namaKategoriBrand", label: "Nama Kategori Brand" },
    { name: "kategoriHarga", label: "Kategori Harga" },
  ];

  return (
    <MasterCrudCard
      title="MASTER BARANG & HARGA"
      subtitle="Data master brand, kategori brand dan kategori harga."
      collectionKey="masterBarangHarga"
      fields={fields}
      excelFileName="Master_Barang_Harga"
      listenFnName="listenMasterBarangHarga"
      addFnName="addMasterBarangHarga"
      updateFnName="updateMasterBarangHarga"
      deleteFnName="deleteMasterBarangHarga"
    />
  );
}
