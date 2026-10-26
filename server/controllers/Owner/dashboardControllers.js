import DeliveryEntry from "../../models/deliveryEntryModels.js";
import Dispatch from "../../models/dispatchModels.js";
import { getDeliveryDayRange, getKolkataDateString, TIMEZONE } from "../../utils/deliveryDay.js";
import { normalizeCoordinates } from "../../utils/coordinates.js";

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
    const ownerBusinessId = req.user?.businessId
      ? req.user.businessId.toString()
      : req.user?._id
      ? req.user._id.toString()
      : null;
    const sessions = getActiveSessionsSnapshot(ownerBusinessId);
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

/**
 * Controller to fetch customer delivery locations for the selected delivery day.
 * - Deduplicates multiple delivery entries for the same customer.
 * - Includes customer name, address, delivery statuses, assigned DM, and product summary.
 * - Validates coordinates and never guesses missing coordinates.
 * - Scoped strictly to the authenticated owner's business to prevent data crossing boundaries.
 * - Restricted to authenticated owner accounts.
 */
export const getCustomerDeliveryLocations = async (req, res) => {
  try {
    const { startOfDay, endOfDay, dateString } = getDeliveryDayRange(req.query.date);
    const ownerBusinessId = req.user?.businessId || req.user?._id;

    // Fetch today's dispatches scoped to this owner's business
    const dispatchQuery = {
      $or: [
        { date: { $gte: startOfDay, $lte: endOfDay } },
        { createdAt: { $gte: startOfDay, $lte: endOfDay } },
      ],
    };

    if (ownerBusinessId) {
      dispatchQuery.$and = [
        {
          $or: [
            { owner: ownerBusinessId },
            { businessId: ownerBusinessId },
            { owner: { $in: [null, undefined] }, businessId: { $in: [null, undefined] } },
          ],
        },
      ];
    }

    const dispatches = await Dispatch.find(dispatchQuery).select("_id");
    const dispatchIds = dispatches.map((d) => d._id);

    // Query for all delivery entries on this delivery day, scoped to this business
    const entryQuery = {
      $or: [
        { date: { $gte: startOfDay, $lte: endOfDay } },
        {
          date: { $in: [null, undefined] },
          $or: [
            { dispatch: { $in: dispatchIds } },
            { createdAt: { $gte: startOfDay, $lte: endOfDay } },
          ],
        },
      ],
    };

    if (ownerBusinessId) {
      entryQuery.$and = [
        {
          $or: [
            { owner: ownerBusinessId },
            { businessId: ownerBusinessId },
            {
              owner: { $in: [null, undefined] },
              businessId: { $in: [null, undefined] },
            },
          ],
        },
      ];
    }

    const entries = await DeliveryEntry.find(entryQuery)
      .select("customer dm products status deliveredAt date createdAt owner businessId")
      .populate("customer", "name mobile address location latitude longitude assignedDm businessId")
      .populate("dm", "name mobile businessId")
      .populate("products.product", "name unit price")
      .lean();

    // Deduplicate by customer ID and summarize statuses
    const customerMap = new Map();

    for (const entry of entries) {
      if (!entry.customer || !entry.customer._id) continue;

      // Prevent customer data leakage across business boundaries
      if (
        ownerBusinessId &&
        entry.businessId &&
        entry.businessId.toString() !== ownerBusinessId.toString()
      ) {
        continue;
      }
      if (
        ownerBusinessId &&
        entry.owner &&
        entry.owner.toString() !== ownerBusinessId.toString()
      ) {
        continue;
      }
      if (
        ownerBusinessId &&
        entry.customer.businessId &&
        entry.customer.businessId.toString() !== ownerBusinessId.toString()
      ) {
        continue;
      }

      const custId = entry.customer._id.toString();

      let record = customerMap.get(custId);
      if (!record) {
        const c = entry.customer;
        const coordinates = normalizeCoordinates({
          latitude: c.address?.latitude ?? c.location?.latitude ?? c.latitude,
          longitude: c.address?.longitude ?? c.location?.longitude ?? c.longitude,
        });

        record = {
          customerId: custId,
          name: c.name,
          mobile: c.mobile,
          address: c.address || null,
          coordinates,
          assignedDm: entry.dm
            ? { _id: entry.dm._id, name: entry.dm.name, mobile: entry.dm.mobile }
            : c.assignedDm
            ? { _id: c.assignedDm }
            : null,
          deliveries: [],
        };
        customerMap.set(custId, record);
      }

      // Add delivery stop details
      record.deliveries.push({
        entryId: entry._id,
        status: entry.status,
        deliveredAt: entry.deliveredAt || null,
        products: (entry.products || []).map((p) => ({
          name: p.product?.name || "Milk",
          quantity: p.quantity,
          unit: p.product?.unit || "L",
        })),
        dm: entry.dm
          ? { _id: entry.dm._id, name: entry.dm.name, mobile: entry.dm.mobile }
          : null,
      });

      // Update assignedDm if populated on this entry
      if (entry.dm && (!record.assignedDm || !record.assignedDm.name)) {
        record.assignedDm = {
          _id: entry.dm._id,
          name: entry.dm.name,
          mobile: entry.dm.mobile,
        };
      }
    }

    // Summarize statuses per customer
    const customers = Array.from(customerMap.values()).map((cust) => {
      const statuses = cust.deliveries.map((d) => d.status);
      let overallStatus = "pending";

      if (statuses.length > 0) {
        if (statuses.every((s) => s === "delivered")) {
          overallStatus = "delivered";
        } else if (statuses.every((s) => s === "skipped")) {
          overallStatus = "skipped";
        } else if (statuses.some((s) => s === "delivered") && statuses.some((s) => s !== "delivered")) {
          overallStatus = "partial";
        } else {
          overallStatus = "pending";
        }
      }

      // Format a concise product breakdown
      const productCounts = new Map();
      cust.deliveries.forEach((d) => {
        d.products.forEach((p) => {
          const key = `${p.name} (${p.unit})`;
          productCounts.set(key, (productCounts.get(key) || 0) + p.quantity);
        });
      });
      const productSummary = Array.from(productCounts.entries())
        .map(([name, qty]) => `${qty} ${name}`)
        .join(", ");

      return {
        ...cust,
        overallStatus,
        totalDeliveries: cust.deliveries.length,
        productSummary: productSummary || "Standard delivery",
      };
    });

    const withCoordinates = customers.filter((c) => c.coordinates !== null);
    const withoutCoordinates = customers.filter((c) => c.coordinates === null);

    return res.status(200).json({
      success: true,
      date: dateString,
      totalCustomers: customers.length,
      withCoordinatesCount: withCoordinates.length,
      withoutCoordinatesCount: withoutCoordinates.length,
      data: customers,
    });
  } catch (err) {
    console.error("Error fetching customer delivery locations:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch customer delivery locations",
    });
  }
};