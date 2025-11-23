import React, { createContext, useContext, useState, useEffect } from "react";

/*
  ===============================
   🔥 SEARCH PRO MAX CORE ENGINE
  ===============================

  Fitur:
  ✔ Global keyword — dipakai Navbar, Sidebar, dan semua halaman.
  ✔ triggerSearch — memaksa halaman melakukan re-filter, walaupun keyword tidak berubah.
  ✔ lastPage — halaman terakhir sebelum search, untuk smart navigation.
  ✔ autoSave — keyword akan disimpan dan dikembalikan setelah refresh.
*/

const GlobalSearchContext = createContext();

export const GlobalSearchProvider = ({ children }) => {

  // =====================================================================================
  // 🔍 STATE UTAMA SEARCH PRO MAX
  // =====================================================================================
  const [keyword, setKeyword] = useState(() => {
    return localStorage.getItem("global_search") || "";
  });

  const [triggerSearch, setTriggerSearch] = useState(Date.now());

  // menyimpan halaman terakhir → dipakai untuk smart navigation
  const [lastPage, setLastPage] = useState(
    () => localStorage.getItem("global_last_page") || "/"
  );

  // =====================================================================================
  // 💾 Auto Save — keyword disimpan saat berubah
  // =====================================================================================
  useEffect(() => {
    localStorage.setItem("global_search", keyword);
  }, [keyword]);

  useEffect(() => {
    localStorage.setItem("global_last_page", lastPage);
  }, [lastPage]);

  // =====================================================================================
  // ⚡ EVENTS
  // =====================================================================================

  // Reset pencarian global
  const resetSearch = () => {
    setKeyword("");
    setTriggerSearch(Date.now());
  };

  // Set key dan paksa refresh
  const updateSearch = (value) => {
    setKeyword(value);
    setTriggerSearch(Date.now());
  };

  return (
    <GlobalSearchContext.Provider
      value={{
        keyword,
        setKeyword,

        triggerSearch,
        setTriggerSearch,

        lastPage,
        setLastPage,

        resetSearch,
        updateSearch,
      }}
    >
      {children}
    </GlobalSearchContext.Provider>
  );
};

// =====================================================================================
// HOOK
// =====================================================================================
export const useGlobalSearch = () => {
  return useContext(GlobalSearchContext);
};
