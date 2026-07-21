import type { Subscription } from "../../../pages/Customer/CustomerSubscriptions";
import type { ProductType } from "../../../Types/Customer";
import api from "../../api";

export const updateSubsService = async (products: Subscription[], customerId:string|null) => {
    console.log(products)
    const req=await api.post(`/customers/${customerId}/products/manage`, products)
    return req
}

export const getTodaysCustomerDeliveryStatus = async () => {
    const req=await api.get('/customers/deliveries/today')
    return req.data
}

export const getDeliveryTrackOfAMonth = async (month:number, year:number) => {
    const req = await api.get(`/customers/deliveries/monthTrack?month=${month}&year=${year}`)
    return req.data
}