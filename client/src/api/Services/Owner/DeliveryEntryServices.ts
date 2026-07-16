import api from "../../api";

export const getDmTodayDeliveriesService = async () => {
    const req=await api.get('/deliveryEntry/today')
    return req.data.deliveries
}