import { ref, onValue } from "firebase/database";
import { db } from "../../../services/FirebaseInit";

export const listenRefundRealtime = (callback) => {
  const refundRef = ref(db, "refundRealtime");

  return onValue(refundRef, (snap) => {
    const data = snap.val() || {};

    const map = {};

    Object.keys(data).forEach((key) => {
      map[String(key).trim().toUpperCase()] = true;
    });

    callback(map);
  });
};