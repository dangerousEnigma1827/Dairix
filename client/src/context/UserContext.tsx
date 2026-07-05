import { createContext, useState, useEffect } from "react"
import api from "../api/api"

type User={
    name:string,
    mobile:number,
    role: "owner"|"dm"|"customer",
    _id:string
}

type UserContextType={
    user:User | null,
    setUser: React.Dispatch<React.SetStateAction<User | null>>,
    loading:boolean
}

const UserContext = createContext<UserContextType|null>(null)

export const UserProvider = ({children}:{children:React.ReactNode}) => {
    const [loading, setLoading]=useState(true)
    const [user, setUser]=useState<User|null>(null)

    useEffect(() => {
        const fetchUser = async () => {
            try{
                setLoading(true);
                const res = await api.get("/auth/me");
                console.log("USER DATA:", res.data.data.user);
                setUser(res.data.data.user);
            }catch (err) {
                console.log("ERROR:", err);
            }finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, []);

    return(
    <UserContext.Provider value={{ user, setUser, loading }}>
      {children}
    </UserContext.Provider>
  );
}