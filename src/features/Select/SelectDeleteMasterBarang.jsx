import React from "react";

export default function SelectDeleteMasterBarang({
  currentRows = [],
  selectedItems = [],
  setSelectedItems,
  onDeleteSelected,
}) {
  // ==========================
  // CEK PILIH SEMUA
  // ==========================
  const allSelected =
    currentRows.length > 0 &&
    currentRows.every((item) =>
      selectedItems.includes(item.id)
    );

  // ==========================
  // SELECT ALL
  // ==========================
  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedItems((prev) =>
        prev.filter(
          (id) =>
            !currentRows.some((row) => row.id === id)
        )
      );
    } else {
      const ids = currentRows.map((row) => row.id);

      setSelectedItems((prev) => [
        ...new Set([...prev, ...ids]),
      ]);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3 bg-slate-50 border rounded-xl p-3 mb-3">
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={handleSelectAll}
          className="w-4 h-4"
        />

        <span className="font-semibold text-slate-700">
          Pilih Semua
        </span>
      </label>

      {selectedItems.length > 0 && (
        <button
          onClick={onDeleteSelected}
          className="
            px-4 py-2
            bg-red-600
            hover:bg-red-700
            text-white
            rounded-lg
            font-semibold
            shadow
          "
        >
          Hapus ({selectedItems.length})
        </button>
      )}
    </div>
  );
}