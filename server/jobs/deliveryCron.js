import cron from "node-cron";
import DeliveryEntry from "../models/deliveryEntryModels.js";

export const startUpdatingDeliveryJob = () => {
    cron.schedule(
        "21 1 * * *",
        async () => {
            try {
                const start = new Date();
                start.setHours(0, 0, 0, 0);

                const end = new Date();
                end.setHours(23, 59, 59, 999);

                const result = await DeliveryEntry.updateMany(
                    {
                        status: "pending",
                        // createdAt: {
                            // $gte: start,
                            // $lte: end,
                        // },
                    },
                    {
                        status: "skipped",
                    }
                );

                console.log(
                    `Cron job completed. ${result.modifiedCount} deliveries marked as skipped.`
                );
            } catch (err) {
                console.log("Error occurred changing status:", err);
            }
        },
        {
            timezone: "Asia/Kolkata",
        }
    );

    console.log("Delivery cron job started.");
};