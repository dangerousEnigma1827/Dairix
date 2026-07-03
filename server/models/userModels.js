import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    mobile: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      select: false
    },

    role: {
      type: String,
      enum: ["owner", "dm", "customer"],
      default: "customer",
    },
  },

  { timestamps: true }
);


const User = mongoose.model("User", userSchema);
export default User;