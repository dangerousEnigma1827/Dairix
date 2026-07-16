import mongoose from "mongoose";


const dispatchSchema = new mongoose.Schema(
{
    date:{
        type:Date,
        default:Date.now
    },


    deliveries:[
        {
            dm:{
                type:mongoose.Schema.Types.ObjectId,
                ref:"User",
                required:true
            },

            allocations:[
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
                    "assigned",
                    "completed"
                ],
                default:"assigned"
            }
        }
    ],


    status:{
        type:String,
        enum:[
            "created",
            "completed"
        ],
        default:"created"
    }

},
{
    timestamps:true
});


export default mongoose.model("Dispatch",dispatchSchema);