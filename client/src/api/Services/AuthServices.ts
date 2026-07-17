import api from "../api"

type formDataType = {
    name: string;
    mobile: string;
    password: string;
    confirmPassword: string;

    address: {
        houseNo: string;
        street: string;
        landmark: string;
        city: string;
        pincode: string;
    };

    deliveryNotes: string;
};


export const registerService = async (formData : formDataType) => {
    console.log(formData)
    let req = await api.post('/auth/signup', formData)

    return req.data.data
}

export const currUserService = async () => {
    let req = await api.get('/auth/me');
    return req.data.data
}

export const getCustomerDeliveryByIdService = async (_id:string) => {
    let req = await api.get(`/auth/${_id}`)
    return req.data.data
}
