import React from "react";

export default function SelectDeleteMasterPembelian({
  currentRows = [],
  selectedItems = [],
  setSelectedItems,
  onDeleteSelected,
}) {
  const allSelected =
    currentRows.length > 0 &&
    currentRows.every((row) => selectedItems.includes(row.__KEY__));

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedItems((prev) =>
        prev.filter((id) => !currentRows.some((row) => row.__KEY__ === id))
      );
    } else {
      const ids = currentRows.map((row) => row.__KEY__);

      setSelectedItems((prev) => [...new Set([...prev, ...ids])]);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 mb-3 bg-slate-50 border rounded-xl">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={handleSelectAll}
          className="w-4 h-4"
        />

        <span className="font-semibold text-slate-700">Pilih Semua</span>
      </label>

      <div className="text-sm text-slate-500">
        {selectedItems.length === 1
          ? "1 Data Dipilih"
          : `${selectedItems.length} Data Dipilih`}
      </div>

      {selectedItems.length > 0 && (
        <button
          onClick={onDeleteSelected}
          className="
            px-4 py-2
            rounded-lg
            bg-red-600
            hover:bg-red-700
            text-white
            font-semibold
            shadow
          "
        >
          {selectedItems.length === 1
            ? "Hapus 1 Data"
            : `Hapus ${selectedItems.length} Data`}
        </button>
      )}
    </div>
  );
}
