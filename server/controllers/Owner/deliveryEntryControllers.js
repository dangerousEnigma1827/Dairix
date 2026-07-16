import Dispatch from "../../models/dispatchModels.js";
import User from "../../models/userModels.js";
import DeliveryEntry from "../../models/deliveryEntryModels.js";

export const getDmTodayDeliveries = async (req, res) => {
    try {

        const dmId = req.user._id; 
        const start = new Date();
        start.setHours(0,0,0,0);

        const end = new Date();
        end.setHours(23,59,59,999);


        const dispatch = await Dispatch.findOne({
            createdAt: {
                $gte: start,
                $lte: end
            }
        });

        console.log("dispatches are " , dispatch)

        if (!dispatch) {
            return res.status(200).json({
                deliveries: []
            });
        }

        const deliveries = await DeliveryEntry.find({
            dispatch: dispatch._id,
            dm: dmId
        })
        .populate("customer", "name mobile address")
        .populate("products.product", "name price unit");

        console.log("deliveries are ", deliveries)


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