import React, {
    createContext,
    useContext,
    useState,
    useCallback,
    ReactNode,
    useEffect,
} from 'react';
import api, { ACCESS_TOKEN_KEY, client } from '@/services/api';
import {
    clearAccessToken as clearStoredAccessToken,
    getAccessToken as getStoredAccessToken,
    setAccessToken as setStoredAccessToken,
} from '@/services/tokenStore';

// ── Types ─────────────────────────────────────────────────────────────────────

export type UserRole = 'student' | 'faculty' | 'admin';

export interface AuthUser {
    id: string;
    name: string;
    email: string;
    role: UserRole;
}

export interface AuthContextType {
    user: AuthUser | null;
    accessToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (email: string, password: string, role: UserRole) => Promise<void>;
    logout: () => Promise<void>;
    setAccessToken: (token: string) => void;
}

// ── Context ────────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Hook ───────────────────────────────────────────────────────────────────────

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an <AuthProvider>');
    }
    return context;
};

// ── Provider ───────────────────────────────────────────────────────────────────

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [accessToken, setAccessTokenState] = useState<string | null>(null);
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const setAccessToken = useCallback((token: string) => {
        setAccessTokenState(token);
        setStoredAccessToken(token);
    }, []);

    const clearSession = useCallback(() => {
        setAccessTokenState(null);
        setUser(null);
        clearStoredAccessToken();
        window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    }, []);

    const fetchMe = useCallback(async (token: string) => {
        const me = await api.get<AuthUser>('/auth/me', token);
        setUser(me);
    }, []);

    /**
     * autoLogin() runs once on startup:
     * - if memory has an accessToken: try /auth/me
     * - else try /auth/refresh using the HTTP-only refresh cookie
     */
    const autoLogin = useCallback(async () => {
        setIsLoading(true);
        try {
            window.localStorage.removeItem(ACCESS_TOKEN_KEY);
            const stored = getStoredAccessToken();
            if (stored) {
                setAccessTokenState(stored);
                try {
                    await fetchMe(stored);
                    return;
                } catch {
                    // fall through to refresh
                }
            }

            // Refresh using HTTP-only cookie (no Authorization required)
            const refreshRes = await client.post('/auth/refresh', {});
            const newToken: string | undefined = refreshRes?.data?.data?.accessToken;
            if (!newToken) throw new Error('Refresh did not return access token.');

            setStoredAccessToken(newToken);
            setAccessTokenState(newToken);
            await fetchMe(newToken);
        } catch {
            clearSession();
        } finally {
            setIsLoading(false);
        }
    }, [clearSession, fetchMe]);

    useEffect(() => {
        autoLogin();
    }, [autoLogin]);

    useEffect(() => {
        const syncToken = (event: Event) => {
            const token = (event as CustomEvent<{ token: string | null }>).detail?.token || null;
            setAccessTokenState(token);
        };
        window.addEventListener('EduNexus:access-token', syncToken);
        return () => window.removeEventListener('EduNexus:access-token', syncToken);
    }, []);

    /**
     * Authenticates the user and stores the access token in React state.
     * The refresh token is stored automatically in an HTTP-Only cookie by the server.
     */
    const login = useCallback(async (email: string, password: string, role: UserRole) => {
        setIsLoading(true);
        try {
            const res = await api.post<{ accessToken: string; user: AuthUser }>(
                '/auth/login',
                { email, password, role }
            );
            setAccessTokenState(res.accessToken);
            setStoredAccessToken(res.accessToken);
            setUser(res.user);
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Logs the user out, calling the server to revoke the refresh token,
     * then clearing local auth state.
     */
    const logout = useCallback(async () => {
        try {
            if (accessToken) {
                await api.post('/auth/logout', {}, accessToken);
            }
        } catch {
            // Silent fail — still clear local state regardless
        } finally {
            clearSession();
        }
    }, [accessToken, clearSession]);

    const value: AuthContextType = {
        user,
        accessToken,
        isAuthenticated: !!accessToken && !!user,
        isLoading,
        login,
        logout,
        setAccessToken,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
