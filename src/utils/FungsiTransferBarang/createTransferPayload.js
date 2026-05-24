export const createTransferPayload = ({ transfer, supplier }) => {
  return {
    ...transfer,

    NAMA_SUPPLIER: supplier || "ONLINE NON PKP",

    CREATED_AT: Date.now(),

    STATUS: "Approved",
  };
};
