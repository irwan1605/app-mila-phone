// =============================
// GLOBAL SEARCH ENGINE PRO MAX
// =============================
export function applyGlobalSearch(item, query) {
    if (!query) return true;
  
    const q = query.toLowerCase();
  
    const flat = JSON.stringify(item)
      .replace(/[{}"[\]]/g, "")
      .toLowerCase();
  
    return flat.includes(q);
  }
  