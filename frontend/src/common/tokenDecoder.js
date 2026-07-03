import { jwtDecode } from 'jwt-decode';

/**
 * Reference-only stub matching your existing token-decoder utility.
 * Replace with your real implementation if already defined elsewhere.
 */
function decodeToken() {
    const token = localStorage.getItem('token');
    if (!token) return null;
    try {
        return jwtDecode(token);
    } catch {
        return null;
    }
}

export const getUserIDFromToken = () => decodeToken()?.UserID ?? null;
export const getGroupIDFromToken = () => decodeToken()?.GroupID ?? null;
export const getRoleFromToken = () => decodeToken()?.Role ?? null;
export const getUsernameFromToken = () => decodeToken()?.Username ?? null;

export const isAuthenticated = () => {
    const decoded = decodeToken();
    if (!decoded) return false;
    if (decoded.exp && Date.now() >= decoded.exp * 1000) return false;
    return true;
};

export const logout = () => {
    localStorage.removeItem('token');
};
