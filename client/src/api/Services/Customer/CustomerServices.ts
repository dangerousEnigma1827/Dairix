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

export type MonthlyDeliveryEntry = {
  date: string;               // ISO string (entry.createdAt)
  status: "delivered" | "skipped" | "pending";
  deliveredAt: string | null; // ISO string or null
};
 
export const getMonthlyDeliveryTrack = async (
  month: number, // 1-12
  year: number
): Promise<MonthlyDeliveryEntry[]> => {
  const { data } = await api.get<MonthlyDeliveryEntry[]>(
    "/customers/deliveries/monthly",
    { params: { month, year } }
  );
  return data;
};
 
 
export const getWeeklyDeliveryTrack = async (
): Promise<MonthlyDeliveryEntry[]> => {
  const { data } = await api.get<MonthlyDeliveryEntry[]>(
    "/customers/deliveries/weekly",
  )
  console.log(data)
  return data;
};

export interface UpdateLocationPayload {
  latitude: number;
  longitude: number;
  address?: {
    houseNo?: string;
    street?: string;
    landmark?: string;
    city?: string;
    pincode?: string;
  };
}

export interface UpdateLocationResponse {
  success: boolean;
  message: string;
  data: {
    address: {
      houseNo?: string;
      street?: string;
      landmark?: string;
      city?: string;
      pincode?: string;
      latitude?: number;
      longitude?: number;
    };
    location: {
      latitude: number;
      longitude: number;
    };
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
}

export const updateCustomerLocationService = async (
  payload: UpdateLocationPayload
): Promise<UpdateLocationResponse> => {
  const { data } = await api.put<UpdateLocationResponse>('/customers/location', payload);
  return data;
};
 