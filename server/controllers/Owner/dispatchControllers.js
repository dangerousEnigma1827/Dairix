import Dispatch from "../../models/dispatchModels.js";
import User from "../../models/userModels.js";
import DeliveryEntry from "../../models/deliveryEntryModels.js";
import { getDeliveryDayRange } from "../../utils/deliveryDay.js";

export const createDispatch = async(req,res)=>{
    try{
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
                    date:dispatch.date || dispatch.createdAt,
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

export const getTodaysDispatch = async (req, res) => {
    try {
        const { startOfDay, endOfDay } = getDeliveryDayRange();

        const dispatch = await Dispatch.findOne({
            $or: [
                { date: { $gte: startOfDay, $lte: endOfDay } },
                { createdAt: { $gte: startOfDay, $lte: endOfDay } }
            ]
        })
        .populate("deliveries.dm", "name mobile")
        .populate("deliveries.allocations.product", "name price unit");


        if(!dispatch){
            return res.status(200).json({
                exists:false,
                dispatch:null,
                deliveryEntries:[]
            });
        }


        const deliveryEntries = await DeliveryEntry.find({
            dispatch:dispatch._id
        })
        .populate("customer","name mobile address")
        .populate("dm","name mobile")
        .populate("products.product","name price unit");


        return res.status(200).json({
            exists:true,
            dispatch,
            deliveryEntries
        });


    } catch(error){

        console.log("Get today's dispatch error:",error);

        return res.status(500).json({
            message:"Server error"
        });
    }
};