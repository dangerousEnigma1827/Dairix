import express from "express";
import {
    createDM,
    getAllDMs,
    getDMById,
    updateDM,
    deleteDM
} from "../controllers/dmControllers.js";
import validate from "../middlewares/validateMiddlewares.js";
import createDMSchema from "../schemas/dmSchemas.js";

const router = express.Router();

// CREATE DM (Owner only)
router.post("/", createDM);

// GET ALL DMs
router.get("/", getAllDMs);
// GET SINGLE DM
router.get("/:id", getDMById);
// UPDATE DM
router.put("/:id", updateDM);
// DELETE DM
router.delete("/:id", deleteDM);

export default router;