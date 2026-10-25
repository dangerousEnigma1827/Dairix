import User from "../../models/userModels.js"
import DeliveryEntry from "../../models/deliveryEntryModels.js"
import { getDeliveryDayRange } from "../../utils/deliveryDay.js"
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
        const { startOfDay, endOfDay } = getDeliveryDayRange();

        const delivery = await DeliveryEntry.findOne({
            customer: userId,
            $or: [
                { date: { $gte: startOfDay, $lte: endOfDay } },
                { createdAt: { $gte: startOfDay, $lte: endOfDay } }
            ]
        });

        if (!delivery) {
            // While today's delivery day is in progress, an uncompleted delivery remains pending
            return res.status(200).json({
                status: "pending",
                deliveredAt: null
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

export const getWeeklyDeliveryTrack = async (req, res) => {
    try {
        const userId = req.user._id;
        const today = new Date();

        const start = new Date(today);
        start.setDate(today.getDate() - today.getDay()); // Sunday
        start.setHours(0, 0, 0, 0);

        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);

        const deliveries = await DeliveryEntry.find({
        customer: userId,
        createdAt: {
            $gte: start,
            $lte: end
        }
        }).sort({ createdAt: 1 });

        const response = deliveries.map((entry)=>({
            date: entry.createdAt,
            status: entry.status,
            deliveredAt: entry.deliveredAt || null
        }));

        return res.status(200).json(response);

    } catch (err) {
        console.log(err);
        return res.status(500).json({
            message: "Server error"
        });
    }
};