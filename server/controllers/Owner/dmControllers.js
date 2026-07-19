import bcrypt from "bcrypt";
import User from "../../models/userModels.js"
import ApiError from "../../utils/apiError.js"
import ApiResponse from "../../utils/apiResponse.js";
import asyncHandler from "../../utils/asyncHandler.js";


const generatePassword = (length = 10) => {
    const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&*";

    let password = "";

    for (let i = 0; i < length; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return password;
};


export const createDM = asyncHandler(async (req, res) => {
    const { name, mobile, password } = req.body;

    if (!name || !mobile || mobile.length !== 10) {
        throw new ApiError(
            400,
            "Validation Error",
            "Invalid name or mobile number"
        );
    }

    const existingDM = await User.findOne({ mobile });
    if (existingDM) {
        throw new ApiError(
            400,
            "Mobile number already exists"
        );
    }

    const plainPassword = password || generatePassword();

    const hashedPassword = await bcrypt.hash(
        plainPassword,
        10
    );


    const dm = await User.create({
        name,
        mobile,
        password: hashedPassword,
        role:"dm"
    });


    return res
        .status(201)
        .json(
            new ApiResponse(
                201,
                {
                    _id: dm._id,
                    name: dm.name,
                    mobile: dm.mobile,
                    role: dm.role,
                    tempPassword: plainPassword
                },
                "DM created successfully"
            )
        );

});



export const getAllDMs = asyncHandler(async(req,res)=>{
    const dms = await User
        .find({role:"dm"})
        .select("-password");


    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                dms,
                "DMs fetched successfully"
            )
        );

});



export const getDMById = asyncHandler(async(req,res)=>{

    const dm = await User
        .findOne({
            _id:req.params.id,
            role:"dm"
        })
        .select("-password");


    if(!dm){
        throw new ApiError(
            404,
            "DM not found"
        );
    }


    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                dm
            )
        );

});



export const updateDM = asyncHandler(async(req,res)=>{

    const {name,mobile}=req.body;


    const dm = await User
        .findOneAndUpdate(
            {
                _id:req.params.id,
                role:"dm"
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


    if(!dm){
        throw new ApiError(
            404,
            "DM not found"
        );
    }


    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                dm,
                "DM updated successfully"
            )
        );

});



export const deleteDM = asyncHandler(async(req,res)=>{

    const dm = await User.findOneAndDelete({
        _id:req.params.id,
        role:"dm"
    });


    if(!dm){
        throw new ApiError(
            404,
            "DM not found"
        );
    }


    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                null,
                "DM deleted successfully"
            )
        );

});

