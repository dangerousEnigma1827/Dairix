import api from "../../api";

// type customerType=

export const getAllCustomers = async ()=>{
    let req=await api.get('/customers/');
    return req.data.data
}