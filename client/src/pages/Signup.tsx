import React from 'react'
import { useState } from 'react'
import SignupPage1 from './SignupPage1'
import SignupPage2 from './SignupPage2'

function Signup() {
    type formDataType = {
        // Step 1: Account details
        name: string;
        mobile: string;
        password: string;
        confirmPassword: string;

        // Step 2: Address details
        address: {
            houseNo: string;
            street: string;
            landmark: string;
            city: string;
            pincode: string;
        };

        // Delivery instructions
        deliveryNotes: string;
    };

    const [formData, setFormData] = useState<formDataType>({
        name: "",
        mobile: "",
        password: "",
        confirmPassword: "",

        address: {
            houseNo: "",
            street: "",
            landmark: "",
            city: "",
            pincode: "",
        },

        deliveryNotes: "",
    });

    const [step, setStep] = useState(1)
    return (
        <>
            {
                step==1 && <SignupPage1 step={step} setStep={setStep} formData={formData} setFormData={setFormData}/>
            }
            {
                step==2 && <SignupPage2 step={step} setStep={setStep} formData={formData} setFormData={setFormData}/>
            }
            
        </>
    )
}

export default Signup