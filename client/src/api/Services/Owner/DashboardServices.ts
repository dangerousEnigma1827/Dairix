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