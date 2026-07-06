import { createContext, useState, useEffect } from "react";
import api from "../api/api";

type User = {
    name: string;
    mobile: number;
    role: "owner" | "dm" | "customer";
    _id: string;
};

type UserContextType = {
    user: User | null;
    setUser: React.Dispatch<React.SetStateAction<User | null>>;
    loading: boolean;
};

export const UserContext = createContext<UserContextType | null>(null);

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await api.get("/auth/me");

                setUser(res.data.data.user); // ✅ valid session
            } catch (err: any) {
                // IMPORTANT: treat 401 as "not logged in", not error crash
                if (err?.response?.status === 401) {
                    setUser(null);
                } else {
                    console.log("Auth error:", err);
                    setUser(null);
                }
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, []);

    return (
        <UserContext.Provider value={{ user, setUser, loading }}>
            {children}
        </UserContext.Provider>
    );
};