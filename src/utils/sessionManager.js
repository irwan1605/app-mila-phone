const SESSION_DURATION = 8 * 60 * 60 * 1000;

export function startSession() {

    const loginTime = Date.now();

    localStorage.setItem(
        "LOGIN_TIME",
        loginTime
    );

    localStorage.setItem(
        "SESSION_EXPIRE",
        loginTime + SESSION_DURATION
    );
}

export function clearSession() {

    localStorage.removeItem("user");

    localStorage.removeItem("userLogin");

    localStorage.removeItem("ROLE_USER");

    localStorage.removeItem("TOKO_LOGIN");

    localStorage.removeItem("LOGIN_TIME");

    localStorage.removeItem("SESSION_EXPIRE");
}

export function isSessionExpired() {

    const expire = Number(
        localStorage.getItem("SESSION_EXPIRE")
    );

    if (!expire) return true;

    return Date.now() >= expire;
}

export function getRemainingSession() {

    const expire = Number(
        localStorage.getItem("SESSION_EXPIRE")
    );

    if (!expire) return 0;

    return Math.max(
        0,
        expire - Date.now()
    );
}