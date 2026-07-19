import User from "../../models/userModels.js"
import DeliveryEntry from "../../models/deliveryEntryModels.js"
export const updateCustomerSubs = async (req, res) => {
    try{
        const {customerId} = req.params
        const finalArr = req.body
        console.log(finalArr)

        const currUser = await User.findById(customerId);
        console.log(currUser)
        currUser.products = finalArr

        console.log(currUser.products)
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