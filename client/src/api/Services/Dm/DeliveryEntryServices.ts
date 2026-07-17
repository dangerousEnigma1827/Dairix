import api from "../../api";

export const updateDeliveryEntryService = async (customerId:string) => {
    const req = await api.post(`/deliveryEntry/delivery/${customerId}`)
    return req.data
}