import DeliveryEntry from "../../models/deliveryEntryModels.js";

export const getWeeklyStats = async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setHours(0, 0, 0, 0);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const stats = await DeliveryEntry.aggregate([
      {
        $match: {
          createdAt: {
            $gte: sevenDaysAgo,
          },
        },
      },

      {
        $unwind: "$products",
      },

      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },

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
            $sum: "$products.quantity",
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
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);

      const key = d.toISOString().split("T")[0];

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