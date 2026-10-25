import Dispatch from "../../models/dispatchModels.js";
import DeliveryEntry from "../../models/deliveryEntryModels.js";
import { getDeliveryDayRange, isDeliveryDayEnded } from "../../utils/deliveryDay.js";

export const updateDeliveryStatus = async(req,res)=>{
    try {
        const {customerId}=req.params;
        const dmId=req.user._id;

        const { startOfDay, endOfDay } = getDeliveryDayRange();

        const dispatches = await Dispatch.find({
            $or: [
                { date: { $gte: startOfDay, $lte: endOfDay } },
                { createdAt: { $gte: startOfDay, $lte: endOfDay } }
            ]
        }).select("_id");

        const dispatchIds = dispatches.map(d => d._id);

        const entry = await DeliveryEntry.findOne({
            customer: customerId,
            dm: dmId,
            $or: [
                { dispatch: { $in: dispatchIds } },
                { date: { $gte: startOfDay, $lte: endOfDay } }
            ]
        });

        if(!entry){
            return res.status(404).json({
                message:"Delivery entry not found"
            });
        }

        const requestedStatus = req.body.status;
        let finalStatus = "pending";
        let deliveredAtTime = null;

        if (requestedStatus === "delivered") {
            finalStatus = "delivered";
            deliveredAtTime = new Date();
        } else if (requestedStatus === "skipped") {
            // Cutoff rule: uncompleted deliveries can only be skipped after the delivery day cutoff has passed
            const dayEnded = isDeliveryDayEnded(entry.date || entry.createdAt);
            if (dayEnded) {
                finalStatus = "skipped";
            } else {
                // While delivery day is in progress, uncompleted stops remain pending
                finalStatus = "pending";
            }
        }

        entry.status = finalStatus;
        if (deliveredAtTime) {
            entry.deliveredAt = deliveredAtTime;
        }
        await entry.save();


        res.json(entry);


    } catch(err){

        console.log("UPDATE DELIVERY ERROR:",err);

        res.status(500).json({
            message:err.message
        });

    }
};