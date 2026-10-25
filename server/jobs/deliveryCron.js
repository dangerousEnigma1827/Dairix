import cron from "node-cron";
import DeliveryEntry from "../models/deliveryEntryModels.js";
import { getDeliveryDayRange, TIMEZONE } from "../utils/deliveryDay.js";

/**
 * Idempotently transitions uncompleted deliveries whose scheduled delivery day
 * has fully ended (past the cutoff at 23:59:59.999 IST) from "pending" to "skipped".
 *
 * Rules:
 * - Uncompleted deliveries whose delivery day is still in progress (today) or in future remain "pending".
 * - Deliveries marked "delivered" remain "delivered" and are never touched.
 * - Idempotent: safe to run multiple times without corrupting state or duplicating work.
 *
 * @param {Date} [asOfDate=new Date()]
 * @returns {Promise<number>} Number of transitioned deliveries
 */
export const transitionExpiredPendingDeliveries = async (asOfDate = new Date(), extraFilter = {}) => {
  const { startOfDay: startOfToday } = getDeliveryDayRange(asOfDate);

  // Match only pending deliveries whose scheduled day strictly precedes today in Asia/Kolkata
  const result = await DeliveryEntry.updateMany(
    {
      ...extraFilter,
      status: "pending",
      $or: [
        { date: { $lt: startOfToday } },
        { date: { $exists: false }, createdAt: { $lt: startOfToday } },
      ],
    },
    {
      $set: { status: "skipped" },
    }
  );

  return result.modifiedCount;
};

/**
 * Starts the delivery lifecycle cron job.
 * Runs at midnight (00:01 IST) every day, and runs immediately on server startup to catch up.
 */
export const startUpdatingDeliveryJob = () => {
  // Catch up any deliveries that expired while server was offline
  transitionExpiredPendingDeliveries()
    .then((count) => {
      if (count > 0) {
        console.log(`[Delivery Lifecycle] Startup sweep: marked ${count} expired deliveries as skipped.`);
      }
    })
    .catch((err) => {
      console.error("[Delivery Lifecycle] Error during startup transition sweep:", err);
    });

  // Schedule to run at 00:01 AM every day in Asia/Kolkata
  cron.schedule(
    "1 0 * * *",
    async () => {
      try {
        const count = await transitionExpiredPendingDeliveries();
        console.log(
          `[Delivery Lifecycle] Scheduled cutoff run completed: ${count} pending deliveries marked as skipped.`
        );
      } catch (err) {
        console.error("[Delivery Lifecycle] Error in scheduled cutoff run:", err);
      }
    },
    {
      timezone: TIMEZONE,
    }
  );

  console.log(`[Delivery Lifecycle] Cron job scheduled for 00:01 AM (${TIMEZONE}).`);
};