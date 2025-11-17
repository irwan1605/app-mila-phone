// src/data/StockCounters.js
export const STOCK_COUNTERS_EVENT = "stock:changed";

const KEY = (toko) => `stockCounters::${toko}`;
const clamp = (n) => (isNaN(n) ? 0 : Math.max(0, Number(n)));

/** Baca counters per-toko dari localStorage */
export function readStockCounters(toko) {
  try {
    const raw = localStorage.getItem(KEY(toko));
    const obj = raw ? JSON.parse(raw) : {};
    return {
      accessories: clamp(obj.accessories || 0),
      handphone: clamp(obj.handphone || 0),
      motor_listrik: clamp(obj.motor_listrik || 0),
    };
  } catch {
    return { accessories: 0, handphone: 0, motor_listrik: 0 };
  }
}

/**
 * Tulis counters per-toko.
 * mode="set" (default) -> set absolut, mode="inc" -> tambah/kurang (delta)
 */
export function writeStockCounters(toko, values, { mode = "set" } = {}) {
  const curr = readStockCounters(toko);
  const next =
    mode === "inc"
      ? {
          accessories: clamp(curr.accessories + (values.accessories || 0)),
          handphone: clamp(curr.handphone + (values.handphone || 0)),
          motor_listrik: clamp(curr.motor_listrik + (values.motor_listrik || 0)),
        }
      : {
          accessories:
            values.accessories != null ? clamp(values.accessories) : curr.accessories,
          handphone:
            values.handphone != null ? clamp(values.handphone) : curr.handphone,
          motor_listrik:
            values.motor_listrik != null ? clamp(values.motor_listrik) : curr.motor_listrik,
        };

  localStorage.setItem(KEY(toko), JSON.stringify(next));

  // Broadcast ke halaman lain yang terbuka
  window.dispatchEvent(
    new CustomEvent(STOCK_COUNTERS_EVENT, { detail: { toko, data: next } })
  );
  return next;
}

/** Helper tambah/kurang */
export function incrementStockCounters(toko, delta) {
  return writeStockCounters(toko, delta, { mode: "inc" });
}
