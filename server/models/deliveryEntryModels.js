import mongoose from "mongoose";


const deliveryEntrySchema = new mongoose.Schema(
{
    owner:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        default:null,
        index:true
    },

    businessId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        default:null,
        index:true
    },

    dispatch:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Dispatch",
        required:true
    },

    date:{
        type:Date,
        default:Date.now,
        index:true
    },


    customer:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },


    dm:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },


    products:[
        {
            product:{
                type:mongoose.Schema.Types.ObjectId,
                ref:"Product",
                required:true
            },

            quantity:{
                type:Number,
                required:true
            }
        }
    ],


    status:{
        type:String,
        enum:[
            "pending",
            "delivered",
            "skipped"
        ],
        default:"pending"
    },


    deliveredAt:{
        type:Date
    }

},
{
    timestamps:true
});


export default mongoose.model("DeliveryEntry", deliveryEntrySchema);