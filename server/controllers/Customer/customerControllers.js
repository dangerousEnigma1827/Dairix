import User from "../../models/userModels.js"
import DeliveryEntry from "../../models/deliveryEntryModels.js"
import { getDeliveryDayRange } from "../../utils/deliveryDay.js"
import { isValidCoordinates } from "../../utils/coordinates.js"
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

/**
 * Update authenticated customer's delivery location (coordinates and optional address details).
 */
export const updateCustomerLocation = async (req, res) => {
    try {
        const userId = req.user._id;
        const { latitude, longitude, address } = req.body;

        if (!isValidCoordinates(latitude, longitude)) {
            return res.status(400).json({
                success: false,
                message: "Valid latitude (-90 to 90) and longitude (-180 to 180) are required.",
            });
        }

        const parsedLat = Number(latitude);
        const parsedLng = Number(longitude);

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "Customer not found",
            });
        }

        if (!user.address) {
            user.address = {};
        }

        user.address.latitude = parsedLat;
        user.address.longitude = parsedLng;

        if (address && typeof address === "object") {
            if (address.houseNo !== undefined) user.address.houseNo = address.houseNo;
            if (address.street !== undefined) user.address.street = address.street;
            if (address.landmark !== undefined) user.address.landmark = address.landmark;
            if (address.city !== undefined) user.address.city = address.city;
            if (address.pincode !== undefined) user.address.pincode = address.pincode;
        }

        user.location = {
            latitude: parsedLat,
            longitude: parsedLng,
        };
        user.latitude = parsedLat;
        user.longitude = parsedLng;

        await user.save();

        return res.status(200).json({
            success: true,
            message: "Delivery location updated successfully",
            data: {
                address: user.address,
                location: user.location,
                coordinates: {
                    latitude: parsedLat,
                    longitude: parsedLng,
                },
            },
        });
    } catch (err) {
        console.error("Error updating customer location:", err);
        return res.status(500).json({
            success: false,
            message: "Server error updating delivery location",
        });
    }
};