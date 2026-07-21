import api from "../../api";

export const updateDeliveryEntryService = async (customerId:string, status: "delivered"|"skipped") => {
    const req = await api.post(`/deliveryEntry/delivery/${customerId}`)
    return req.data
}

export const getDmCustomersService = async () => {
    const req = await api.get('/bydm/dm/customers')
    console.log(req.data)
    return req.data.customers
}