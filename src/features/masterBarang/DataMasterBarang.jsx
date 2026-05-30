import React from "react";

export default function DataMasterBarang({
  currentRows = [],
  selectedItems = [],
  setSelectedItems,
  onDeleteSelected,
  lastUpdate,
}) {
  const allSelected =
    currentRows.length > 0 &&
    currentRows.every((row) => selectedItems.includes(row.id));

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedItems((prev) =>
        prev.filter((id) => !currentRows.some((row) => row.id === id))
      );
    } else {
      const ids = currentRows.map((row) => row.id);

      setSelectedItems((prev) => [...new Set([...prev, ...ids])]);
    }
  };

  return (
    <div
      className="
      flex flex-wrap
      items-center
      justify-between
      gap-4
      p-4
      mb-4
      bg-white
      rounded-2xl
      shadow
      border
      "
    >
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={handleSelectAll}
          className="w-5 h-5"
        />

        <span className="font-semibold">Pilih Semua</span>

        <span
          className="
          px-3 py-1
          rounded-full
          bg-indigo-100
          text-indigo-700
          text-sm
          font-bold
          "
        >
          {selectedItems.length} Dipilih
        </span>
      </div>

      {selectedItems.length > 0 && (
        <button
          onClick={onDeleteSelected}
          className="
            px-5 py-2
            bg-red-600
            hover:bg-red-700
            text-white
            rounded-xl
            font-semibold
            shadow
          "
        >
          {selectedItems.length === 1
            ? "Hapus 1 Data"
            : `Hapus ${selectedItems.length} Data`}
        </button>
      )}
      <div className="text-xs text-slate-500">
        Update Terakhir :
        <span className="font-semibold ml-1">{lastUpdate || "-"}</span>
      </div>
    </div>
  );
}
