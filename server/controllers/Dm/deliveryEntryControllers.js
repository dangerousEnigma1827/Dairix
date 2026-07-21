import Dispatch from "../../models/dispatchModels.js";
import DeliveryEntry from "../../models/deliveryEntryModels.js";

export const updateDeliveryStatus = async(req,res)=>{
    try {
        const {customerId}=req.params;
        const dmId=req.user._id;


        const startOfDay = new Date();
        startOfDay.setHours(0,0,0,0);

        const endOfDay = new Date();
        endOfDay.setHours(23,59,59,999);

        const dispatch = await Dispatch.findOne({
            date:{
                $gte:startOfDay,
                $lte:endOfDay
            }
        });


        if(!dispatch){
            return res.status(404).json({
                message:"No dispatch today"
            });
        }

        const entry = await DeliveryEntry.findOneAndUpdate(
            {
                dispatch:dispatch._id,
                customer:customerId,
                dm:dmId
            },
            {
                status:req.body.status,
                deliveredAt:new Date()
            },
            {
                new:true
            }
        );

        if(!entry){
            return res.status(404).json({
                message:"Delivery entry not found"
            });
        }


        res.json(entry);


    } catch(err){

        console.log("UPDATE DELIVERY ERROR:",err);

        res.status(500).json({
            message:err.message
        });

    }
};