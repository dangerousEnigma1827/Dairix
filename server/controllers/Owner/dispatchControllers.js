import Dispatch from "../../models/dispatchModels.js";
import User from "../../models/userModels.js";
import DeliveryEntry from "../../models/deliveryEntryModels.js";

export const createDispatch = async(req,res)=>{
    try{
        console.log(req.body)
        const allocations=req.body;
        const dispatch = await Dispatch.create({
            deliveries: allocations.map((item)=>({
                dm:item.dmId,
                allocations:item.allocations.map((p)=>({
                    product:p.productId,
                    quantity:p.quantity
                }))
            }))
        });

        for(const dmData of allocations){
            const customers = await User.find({
                assignedDm:dmData.dmId,
                role:"customer"
            });

            for(const customer of customers){
                await DeliveryEntry.create({
                    dispatch:dispatch._id,
                    customer:customer._id,
                    dm:dmData.dmId,
                    products:customer.products.map((p)=>({
                        product:p._id,
                        quantity:p.quantity
                    }))
                });
            }
        }

        return res.status(201).json({
            success:true,
            message:"Dispatch created",
            dispatch
        });
    }
    catch(error){
        console.log(error);
        res.status(500).json({
            message:"Server error"
        });
    }
};