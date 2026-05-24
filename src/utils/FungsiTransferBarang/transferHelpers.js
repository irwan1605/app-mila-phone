export const normalizeText = (text) => {
    return String(text || "")
      .trim()
      .toUpperCase();
  };
  
  export const normalizeImei = (imei) => {
    return String(imei || "")
      .replace(/\s+/g, "")
      .replace(/-/g, "")
      .trim()
      .toUpperCase();
  };
  
  export const isNonImei = (imei) => {
    const clean = normalizeImei(imei);
  
    return (
      !clean ||
      [
        "NONIMEI",
        "NON-IMEI",
      ].includes(clean)
    );
  };