import ApiError from "../utils/apiError.js";

let validate = (schema) => {
    return (req,res,next)=>{
        let result = schema.safeParse(req.body);

        if(!result.success){
            throw new ApiError(400, result.error.issues[0].message)
        }

        next()
    }
}

export default validate;