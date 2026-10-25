import Dispatch from "../../models/dispatchModels.js";
import DeliveryEntry from "../../models/deliveryEntryModels.js";
import { getDeliveryDayRange, isDeliveryDayEnded } from "../../utils/deliveryDay.js";

export const updateDeliveryStatus = async(req,res)=>{
    try {
        const {customerId}=req.params;
        const dmId=req.user._id;

        const requestedStatus = req.body?.status;
        const allowedStatuses = ["delivered", "skipped"];
        if (!requestedStatus || !allowedStatuses.includes(requestedStatus)) {
            return res.status(400).json({
                message: `Invalid or unsupported status value: ${requestedStatus}. Allowed statuses: ${allowedStatuses.join(", ")}`
            });
        }

        const { startOfDay, endOfDay } = getDeliveryDayRange();

        const dispatches = await Dispatch.find({
            $or: [
                { date: { $gte: startOfDay, $lte: endOfDay } },
                { createdAt: { $gte: startOfDay, $lte: endOfDay } }
            ]
        }).select("_id");

        const dispatchIds = dispatches.map(d => d._id);

        // Find today's delivery entry for this customer
        const entry = await DeliveryEntry.findOne({
            customer: customerId,
            $or: [
                { dispatch: { $in: dispatchIds } },
                { date: { $gte: startOfDay, $lte: endOfDay } }
            ]
        }).sort({ createdAt: -1, _id: -1 });

        if(!entry){
            return res.status(404).json({
                message:"Delivery entry not found"
            });
        }

        // Authorize: only the assigned DM can update this delivery
        if(!entry.dm || entry.dm.toString() !== dmId.toString()){
            return res.status(403).json({
                message:"You are not authorized to update another delivery person's delivery"
            });
        }

        // Repeated request on already delivered delivery: idempotent, preserve deliveredAt
        if(entry.status === "delivered"){
            if(requestedStatus === "delivered"){
                return res.status(200).json(entry);
            }
            return res.status(400).json({
                message:"Cannot mark a completed delivery as skipped"
            });
        }

        // Historical skipped deliveries must not be reopened indiscriminately
        if(entry.status === "skipped" && isDeliveryDayEnded(entry.date || entry.createdAt)){
            return res.status(400).json({
                message:"Historical skipped delivery cannot be updated"
            });
        }

        if (requestedStatus === "delivered") {
            entry.status = "delivered";
            if (!entry.deliveredAt) {
                entry.deliveredAt = new Date();
            }
        } else if (requestedStatus === "skipped") {
            // Cutoff rule: uncompleted deliveries can only be skipped after the delivery day cutoff has passed
            const dayEnded = isDeliveryDayEnded(entry.date || entry.createdAt);
            if (dayEnded) {
                entry.status = "skipped";
            } else {
                // While delivery day is in progress, uncompleted stops remain pending
                entry.status = "pending";
            }
        }

        await entry.save();

        res.status(200).json(entry);


    } catch(err){

        console.log("UPDATE DELIVERY ERROR:",err);

        res.status(500).json({
            message:err.message
        });

    }
};