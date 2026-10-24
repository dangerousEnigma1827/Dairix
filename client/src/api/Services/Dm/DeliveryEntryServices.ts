import api from "../../api";

export const updateDeliveryEntryService = async (customerId:string, status: "delivered"|"skipped") => {
    const req = await api.post(`/deliveryEntry/delivery/${customerId}`, {
        status
    })
    return req.data
}

export const getDmCustomersService = async () => {
    const req = await api.get('/bydm/dm/customers')
    return req.data.customers
}


export const getDmCustomersByDmIdService = async (dmId:string) => {
    const req = await api.get(`/bydm/dm/${dmId}/customers`)
    return req.data.customers
}

