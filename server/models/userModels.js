import mongoose from "mongoose";


const addressSchema = new mongoose.Schema(
    {
        houseNo: {
            type: String,
            trim: true,
            default: "",
        },

        street: {
            type: String,
            trim: true,
            default: "",
        },

        landmark: {
            type: String,
            trim: true,
            default: "",
        },

        city: {
            type: String,
            trim: true,
            default: "",
        },

        pincode: {
            type: String,
            trim: true,
            default: "",
        },
    },
    {
        _id: false,
    }
);



const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
        },


        mobile: {
            type: String,
            required: true,
            unique: true,
            trim: true,
        },


        password: {
            type: String,
            required: true,
            select: false,
        },


        role: {
            type: String,
            enum: ["owner", "dm", "customer"],
            default: "customer",
        },


        address: {
            type: addressSchema,
            default: () => ({}),
        },


        deliveryNotes: {
            type: String,
            trim: true,
            default: "",
        },

        assignedDm: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null,
        },

        qrCode: {
            type: String,
            default: ""
        },

        products:{ 
            type:[
                {
                    _id:String,
                    name:String,
                    price:Number,
                    unit:String,
                    image:String,
                    quantity:Number
                }
            ],
            default:[]
        }
        
    },

    {
        timestamps: true,
    }
);


const User = mongoose.model("User", userSchema);

export default User;