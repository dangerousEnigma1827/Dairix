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