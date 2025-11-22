import React, { createContext, useContext, useState } from "react";

const GlobalSearchContext = createContext();

export const GlobalSearchProvider = ({ children }) => {
  const [keyword, setKeyword] = useState("");

  return (
    <GlobalSearchContext.Provider value={{ keyword, setKeyword }}>
      {children}
    </GlobalSearchContext.Provider>
  );
};

export const useGlobalSearch = () => useContext(GlobalSearchContext);
