import User from "../../models/userModels.js";

export const getDmCustomers = async(req,res)=>{
    try{
        const dmId = req.user._id;

        const customers = await User.find({
            role:"customer",
            assignedDm:dmId
        })
        .select("-password");

        console.log(customers)
        return res.status(200).json({
            customers
        });

    }catch(err){
        console.log("GET DM CUSTOMERS ERROR:",err);
        return res.status(500).json({
            message:"Server error"
        });
    }
};