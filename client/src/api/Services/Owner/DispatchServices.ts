import api from "../../api";

type ProductAllocationPayload = {
  productId: string;
  quantity: number;
};


type DMDispatchPayload = {
  dmId: string;
  allocations: ProductAllocationPayload[];
};


type DispatchPayload = DMDispatchPayload[];

export const createDispatchService = async (payload:DispatchPayload) => {
    const req=api.post('/dispatch', payload);
    return (await req).data.data
}