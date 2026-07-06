import api from "../api";

type dmCredentials = {
    name: string,
    mobile: string,
    password: string,
}

export const addDm = async (formData: dmCredentials) => {
    const res = await api.post("/dm", formData);
    return res.data.data; 
}