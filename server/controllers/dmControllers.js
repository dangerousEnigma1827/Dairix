import bcrypt from "bcrypt";
import User from "../models/userModels.js";

const generatePassword = (length = 10) => {
    const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*";

    let password = "";

    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return password;
};


export const createDM = async (req, res) => {
    try {
        const { name, mobile, password } = req.body;

        const existingDM = await User.findOne({ mobile });

        if (existingDM) {
            return res.status(400).json({
                message: "Mobile number already exists"
            });
        }

        const plainPassword = password || generatePassword();

        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        const dm = await User.create({
            name,
            mobile,
            password: hashedPassword,
            role: "dm"
        });

        res.status(201).json({
            message: "DM created successfully",
            tempPassword: plainPassword,
            dm: {
                _id: dm._id,
                name: dm.name,
                mobile: dm.mobile,
                role: dm.role
            }
        });

    } catch (err) {
        res.status(500).json({
            message: "Error creating DM",
            error: err.message
        });
    }
};


export const getAllDMs = async (req, res) => {
    try {

        const dms = await User
            .find({ role: "dm" })
            .select("-password");

        res.json(dms);

    } catch (err) {
        res.status(500).json({
            message: "Error fetching DMs",
            error: err.message
        });
    }
};


export const getDMById = async (req, res) => {
    try {

        const dm = await User
            .findOne({
                _id: req.params.id,
                role: "dm"
            })
            .select("-password");


        if (!dm) {
            return res.status(404).json({
                message: "DM not found"
            });
        }


        res.json(dm);

    } catch (err) {
        res.status(500).json({
            message: "Error fetching DM",
            error: err.message
        });
    }
};


export const updateDM = async (req, res) => {
    try {

        const { name, mobile } = req.body;


        const dm = await User
            .findOneAndUpdate(
                {
                    _id: req.params.id,
                    role: "dm"
                },
                {
                    name,
                    mobile
                },
                {
                    new:true
                }
            )
            .select("-password");


        if (!dm) {
            return res.status(404).json({
                message:"DM not found"
            });
        }


        res.json({
            message:"DM updated successfully",
            dm
        });


    } catch(err) {

        res.status(500).json({
            message:"Error updating DM",
            error:err.message
        });

    }
};


export const deleteDM = async (req, res) => {
    try {

        const dm = await User.findOneAndDelete({
            _id:req.params.id,
            role:"dm"
        });


        if(!dm){
            return res.status(404).json({
                message:"DM not found"
            });
        }


        res.json({
            message:"DM deleted successfully"
        });


    } catch(err){

        res.status(500).json({
            message:"Error deleting DM",
            error:err.message
        });

    }
};