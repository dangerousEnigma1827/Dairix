import api from "../../api";

export const getWeeklyStatsService = async () => {
    const req = await api.get('/dashboard/weekly-stats');
    return req.data?.data || [];
};

export interface ActiveDeliveryLocation {
    latitude: number;
    longitude: number;
    accuracy?: number | null;
    heading?: number | null;
    speed?: number | null;
    updatedAt: string;
}

export interface ActiveDeliverySession {
    dmId: string;
    name: string;
    mobile?: string;
    startedAt: string;
    lastLocation?: ActiveDeliveryLocation | null;
}

export const getActiveDeliverySessionsService = async (): Promise<ActiveDeliverySession[]> => {
    const req = await api.get('/dashboard/active-delivery-sessions');
    return req.data?.data || [];
};

export interface CustomerDeliveryLocation {
    customerId: string;
    name: string;
    mobile: string;
    address?: {
        houseNo?: string;
        street?: string;
        landmark?: string;
        city?: string;
        pincode?: string;
    } | null;
    coordinates: {
        latitude: number;
        longitude: number;
    } | null;
    assignedDm: {
        _id: string;
        name: string;
        mobile?: string;
    } | null;
    overallStatus: "delivered" | "pending" | "skipped" | "partial";
    totalDeliveries: number;
    productSummary?: string;
    deliveries: {
        entryId: string;
        status: "delivered" | "pending" | "skipped";
        deliveredAt?: string | null;
        products: {
            name: string;
            quantity: number;
            unit: string;
        }[];
        dm?: {
            _id: string;
            name: string;
            mobile?: string;
        } | null;
    }[];
}

export interface CustomerLocationsResponse {
    date: string;
    totalCustomers: number;
    withCoordinatesCount: number;
    withoutCoordinatesCount: number;
    data: CustomerDeliveryLocation[];
}

export const getCustomerDeliveryLocationsService = async (date?: string): Promise<CustomerLocationsResponse> => {
    const req = await api.get('/dashboard/customer-locations', {
        params: date ? { date } : {}
    });
    return req.data;
};