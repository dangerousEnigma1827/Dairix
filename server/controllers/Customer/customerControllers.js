import User from "../../models/userModels.js"
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