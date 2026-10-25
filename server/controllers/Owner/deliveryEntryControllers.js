import Dispatch from "../../models/dispatchModels.js";
import User from "../../models/userModels.js";
import DeliveryEntry from "../../models/deliveryEntryModels.js";
import { getDeliveryDayRange } from "../../utils/deliveryDay.js";

export const getDmTodayDeliveries = async (req, res) => {
    try {
        const dmId = req.user._id; 
        const { startOfDay, endOfDay } = getDeliveryDayRange();

        const dispatches = await Dispatch.find({
            $or: [
                { date: { $gte: startOfDay, $lte: endOfDay } },
                { createdAt: { $gte: startOfDay, $lte: endOfDay } }
            ]
        }).select("_id");

        const dispatchIds = dispatches.map(d => d._id);

        const deliveries = await DeliveryEntry.find({
            dm: dmId,
            $or: [
                { dispatch: { $in: dispatchIds } },
                { date: { $gte: startOfDay, $lte: endOfDay } }
            ]
        })
        .populate("customer", "name mobile address")
        .populate("products.product", "name price unit");

        return res.status(200).json({
            deliveries
        });


    } catch(error){
        console.log("Get DM deliveries error:", error);
        return res.status(500).json({
            message:"Server error"
        });
    }
};