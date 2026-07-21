import User from "../../models/userModels.js"
import DeliveryEntry from "../../models/deliveryEntryModels.js"
export const updateCustomerSubs = async (req, res) => {
    try{
        const {customerId} = req.params
        const finalArr = req.body

        const currUser = await User.findById(customerId);
        currUser.products = finalArr

        await currUser.save()

        return res.status(200).json({
            message: "Subscriptions updated successfully",
            products: currUser.products
        });

    }catch(err){
        console.log("error occured updating subs ", err)
    }
}

export const getTodaysDeliveryStatus = async (req, res) => {
    try {
        const userId = req.user._id;

        const startTime = new Date();
        startTime.setHours(0, 0, 0, 0);

        const endTime = new Date();
        endTime.setHours(23, 59, 59, 999);


        const delivery = await DeliveryEntry.findOne({
            customer: userId,
            createdAt: {
                $gte: startTime,
                $lte: endTime
            }
        });


        if (!delivery) {
            return res.status(200).json({
                status: "no_delivery"
            });
        }


        return res.status(200).json({
            status: delivery.status,
            deliveredAt: delivery.deliveredAt || null
        });


    } catch (err) {
        console.log("GET TODAY DELIVERY STATUS ERROR:", err);

        return res.status(500).json({
            message: "Server error"
        });
    }
};


export const getMonthlyDeliveryTrack = async (req, res) => {
    try {
        const userId = req.user._id;
        console.log("came here")

        const month = Number(req.query.month);
        const year = Number(req.query.year);

        if (!month || !year) {
            return res.status(400).json({
                message: "Month and year are required"
            });
        }

        // month is 1-12 from frontend
        // JS Date month is 0-11
        const startDate = new Date(year, month - 1, 1);

        const endDate = new Date(year, month, 1);

        const deliveries = await DeliveryEntry.find({
            customer: userId,
            createdAt: {
                $gte: startDate,
                $lt: endDate
            }
        }).sort({ createdAt: 1 });

        const response = deliveries.map((entry)=>({
            date: entry.createdAt,
            status: entry.status,
            deliveredAt: entry.deliveredAt || null
        }));

        return res.status(200).json(response);

    } catch(err) {

        console.log("GET MONTHLY DELIVERY TRACK ERROR:", err);

        return res.status(500).json({
            message:"Server error"
        });
    }
};