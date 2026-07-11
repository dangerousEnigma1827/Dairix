import type { Subscription } from "../../../pages/Customer/CustomerSubscriptions";
import type { ProductType } from "../../../Types/Customer";
import api from "../../api";

export const updateSubsService = async (products: Subscription[], customerId:string|null) => {
    console.log(products)
    const req=await api.post(`/customers/${customerId}/products/manage`, products)
    return req
}