import api from "../../api";


export const getAllCustomers = async ()=>{
    let req=await api.get('/customers/');
    return req.data.data
}

export const getCustomerById = async (id : string) => {
    let req=await api.get(`/customers/${id}`);
    return req.data.data
}

export const assignDm = async (customerId:string, selectedDm:string) => {
    let req = await api.post(`/customers/${customerId}/assign-dm`,{
        selectedDm
    })
    return req.data.data
}