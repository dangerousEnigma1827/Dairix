import { createContext, useState, useEffect, useCallback } from "react";
import api from "../api/api";

export type User = {
    name: string;
    mobile: string;
    role: "owner" | "dm" | "customer";
    _id: string;
};

export type UserContextType = {
    user: User | null;
    setUser: React.Dispatch<React.SetStateAction<User | null>>;
    loading: boolean;
    logout: () => Promise<void>;
    refreshUser: () => Promise<void>;
};

export const UserContext = createContext<UserContextType | null>(null);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);

    const refreshUser = useCallback(async () => {
        try {
            const res = await api.get("/auth/me");
            const userData = res.data?.data?.user || res.data?.data;
            setUser(userData || null);
        } catch (err: any) {
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    const logout = useCallback(async () => {
        try {
            await api.post("/auth/logout");
        } catch (err: any) {
            console.error("Logout error:", err);
        } finally {
            setUser(null);
        }
    }, []);

    useEffect(() => {
        refreshUser();
    }, [refreshUser]);

    return (
        <UserContext.Provider value={{ user, setUser, loading, logout, refreshUser }}>
            {children}
        </UserContext.Provider>
    );
};