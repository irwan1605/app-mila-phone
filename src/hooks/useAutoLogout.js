import { useEffect } from "react";

const IDLE_LIMIT = 15 * 60 * 1000; // 15 menit

export default function useAutoLogout(logout) {
  useEffect(() => {
    let timer;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        alert("⏱️ Logout otomatis karena tidak ada aktivitas");
        logout();
      }, IDLE_LIMIT);
    };

    const events = ["mousemove", "keydown", "click", "scroll"];

    events.forEach((e) => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [logout]);
}
