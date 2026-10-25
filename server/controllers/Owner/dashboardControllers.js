import DeliveryEntry from "../../models/deliveryEntryModels.js";
import { getDeliveryDayRange, getKolkataDateString, TIMEZONE } from "../../utils/deliveryDay.js";

export const getWeeklyStats = async (req, res) => {
  try {
    const { startOfDay: todayStart } = getDeliveryDayRange();
    const sevenDaysAgo = new Date(todayStart);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const stats = await DeliveryEntry.aggregate([
      {
        $match: {
          $or: [
            { date: { $gte: sevenDaysAgo } },
            { date: { $exists: false }, createdAt: { $gte: sevenDaysAgo } },
          ],
        },
      },
      // First, project per DeliveryEntry: compute total volume across products without unwinding
      {
        $project: {
          status: 1,
          dateStr: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: { $ifNull: ["$date", "$createdAt"] },
              timezone: TIMEZONE,
            },
          },
          entryVolume: {
            $reduce: {
              input: { $ifNull: ["$products", []] },
              initialValue: 0,
              in: { $add: ["$$value", { $ifNull: ["$$this.quantity", 0] }] },
            },
          },
        },
      },
      // Second, group by the Asia/Kolkata dateStr so each delivery entry counts as exactly 1 stop
      {
        $group: {
          _id: "$dateStr",
          delivered: {
            $sum: {
              $cond: [{ $eq: ["$status", "delivered"] }, 1, 0],
            },
          },
          skipped: {
            $sum: {
              $cond: [{ $eq: ["$status", "skipped"] }, 1, 0],
            },
          },
          pending: {
            $sum: {
              $cond: [{ $eq: ["$status", "pending"] }, 1, 0],
            },
          },
          volume: {
            $sum: "$entryVolume",
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    const result = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(todayStart);
      d.setDate(d.getDate() - i);
      const key = getKolkataDateString(d);

      const found = stats.find((s) => s._id === key);

      result.push({
        date: key,
        delivered: found?.delivered ?? 0,
        skipped: found?.skipped ?? 0,
        pending: found?.pending ?? 0,
        volume: found?.volume ?? 0,
      });
    }

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (err) {
    console.error("Error fetching weekly stats:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch weekly stats",
    });
  }
};

import { getActiveSessionsSnapshot } from "../../socket/deliverySession.js";

/**
 * Controller to fetch initial snapshot of currently active delivery sessions.
 * Restricted to authenticated owner accounts.
 */
export const getActiveDeliverySessions = async (req, res) => {
  try {
    const sessions = getActiveSessionsSnapshot();
    return res.status(200).json({
      success: true,
      data: sessions,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Error fetching active delivery sessions:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch active delivery sessions",
    });
  }
};