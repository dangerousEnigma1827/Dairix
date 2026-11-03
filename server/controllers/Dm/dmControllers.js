import User from "../../models/userModels.js";

export const getDmCustomers = async(req,res)=>{
    try{
        const dmId = req.user._id;

        const customers = await User.find({
            role:"customer",
            assignedDm:dmId
        })
        .select("-password");

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


export const getDmCustomersById = async(req,res)=>{
    try{
        const dmId = req.params.dmId;

        const customers = await User.find({
            role:"customer",
            assignedDm:dmId
        })
        .select("-password");

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

export const updateDmProfile = async (req, res) => {
    try {
        const dmId = req.user._id;
        const { name, mobile, address, addressEnabled } = req.body;
        const updateData = {};
        if (name) updateData.name = name;
        if (mobile) updateData.mobile = mobile;
        if (addressEnabled !== undefined) {
            updateData.addressEnabled = addressEnabled;
            updateData.isAddressEnabled = addressEnabled;
        }
        if (address && typeof address === "object") {
            const existingDm = await User.findById(dmId);
            const mergedAddress = {
                ...(existingDm?.address ? (existingDm.address.toObject ? existingDm.address.toObject() : existingDm.address) : {}),
                ...address,
                enabled: address.enabled !== undefined ? address.enabled : true,
                isAddressEnabled: address.isAddressEnabled !== undefined ? address.isAddressEnabled : true,
            };
            updateData.address = mergedAddress;

            if (address.latitude && address.longitude) {
                updateData.location = { latitude: Number(address.latitude), longitude: Number(address.longitude) };
                updateData.latitude = Number(address.latitude);
                updateData.longitude = Number(address.longitude);
            }
        }

        const dm = await User.findByIdAndUpdate(dmId, { $set: updateData }, { new: true }).select("-password");
        return res.status(200).json({ success: true, user: dm });
    } catch (err) {
        console.log("UPDATE DM PROFILE ERROR:", err);
        return res.status(500).json({ message: "Server error updating DM profile" });
    }
};
