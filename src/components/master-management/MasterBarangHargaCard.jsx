// src/components/master-management/MasterBarangHargaCard.jsx
import React from "react";
import MasterCrudCard from "./MasterCrudCard";

export default function MasterBarangHargaCard() {
  const fields = [
    { name: "namaMasterBrand", label: "Nama Brand", required: true },
    { name: "namaKategoriBrand", label: "Kategori Brand" },
    { name: "tipeNamaBarang", label: "Nama Barang" },
    { name: "kategoriHarga", label: "Kategori Harga" },
    { name: "hargaSRP", label: "Harga SRP", type: "number" },
    { name: "hargaGrosir", label: "Harga Grosir", type: "number" },
    { name: "hargaReseller", label: "Harga Reseller", type: "number" },
  ];

  return (
    <MasterCrudCard
      title="MASTER BARANG & HARGA"
      subtitle="Harga SRP, Grosir, dan Reseller"
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
