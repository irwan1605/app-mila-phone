import { useEffect } from "react";
import { clearSession } from "../utils/sessionManager";

export default function useAutoLogout(logout) {

    useEffect(() => {

        const timer = setInterval(() => {

            const expire = Number(
                localStorage.getItem("SESSION_EXPIRE")
            );

            if (!expire) return;

            if (Date.now() >= expire) {

                alert(
                    "Session telah berakhir.\nSilakan login kembali."
                );

                clearSession();

                if (logout) {

                    logout();

                } else {

                    window.location.href = "/";
                }

            }

        },10000);

        return ()=>clearInterval(timer);

    },[logout]);

}