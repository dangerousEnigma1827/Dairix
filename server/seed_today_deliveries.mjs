import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

import mongoose from 'mongoose';
import User from './models/userModels.js';
import Product from './models/productModels.js';
import Dispatch from './models/dispatchModels.js';
import DeliveryEntry from './models/deliveryEntryModels.js';
import { getDeliveryDayRange } from './utils/deliveryDay.js';

async function seedToday() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('=== Seeding Today (November 3, 2026) Delivery Data ===');

  const { startOfDay, endOfDay, dateString } = getDeliveryDayRange();
  console.log(`Delivery Day: ${dateString}`);
  console.log(`Range: ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);

  // Dispatch timestamp: 05:30 AM IST today
  const dispatchDate = new Date(`${dateString}T05:30:00.000+05:30`);

  // 1. Check existing dispatches and entries for today
  const existingTodayDispatches = await Dispatch.find({
    $or: [
      { date: { $gte: startOfDay, $lte: endOfDay } },
      { createdAt: { $gte: startOfDay, $lte: endOfDay } }
    ]
  });

  if (existingTodayDispatches.length > 0) {
    console.log(`Cleaning up ${existingTodayDispatches.length} existing today's dispatches and entries to avoid duplicates...`);
    const dispatchIds = existingTodayDispatches.map(d => d._id);
    await DeliveryEntry.deleteMany({
      $or: [
        { dispatch: { $in: dispatchIds } },
        { date: { $gte: startOfDay, $lte: endOfDay } },
        { createdAt: { $gte: startOfDay, $lte: endOfDay } }
      ]
    });
    await Dispatch.deleteMany({ _id: { $in: dispatchIds } });
  }

  // 2. Fetch existing products and DMs
  const products = await Product.find();
  console.log(`Loaded ${products.length} existing products.`);

  const dms = await User.find({ role: 'dm', businessId: null }).sort({ mobile: 1 });
  console.log(`Loaded ${dms.length} existing primary DMs.`);

  // 3. Fetch assigned customers
  const assignedCustomers = await User.find({
    role: 'customer',
    businessId: null,
    assignedDm: { $ne: null }
  }).sort({ _id: 1 });

  console.log(`Loaded ${assignedCustomers.length} assigned customers.`);

  // Map customers by DM
  const dmCustomersMap = new Map();
  for (const dm of dms) {
    dmCustomersMap.set(dm._id.toString(), []);
  }

  for (const customer of assignedCustomers) {
    const dmIdStr = customer.assignedDm.toString();
    if (dmCustomersMap.has(dmIdStr)) {
      dmCustomersMap.get(dmIdStr).push(customer);
    }
  }

  // Plan delivery statuses per DM:
  // DMs 0..3 (4 DMs): 100% completed
  // DMs 4..10 (7 DMs): mostly completed (1 pending, rest delivered)
  // DMs 11..14 (4 DMs): mid-round (1 delivered, rest pending)
  // DMs 15..17 (3 DMs): just started (0 delivered, all pending)
  const dmDeliveriesConfig = [];
  let dmIndex = 0;

  for (const dm of dms) {
    const custs = dmCustomersMap.get(dm._id.toString()) || [];
    if (custs.length === 0) continue;

    let targetDeliveredCount = 0;
    if (dmIndex < 4) {
      // 100% completed
      targetDeliveredCount = custs.length;
    } else if (dmIndex < 11) {
      // Mostly completed: deliver all except 1
      targetDeliveredCount = Math.max(1, custs.length - 1);
    } else if (dmIndex < 15) {
      // Mid round: 1 delivered, rest pending
      targetDeliveredCount = 1;
    } else {
      // Just started: 0 delivered
      targetDeliveredCount = 0;
    }

    dmDeliveriesConfig.push({
      dm,
      customers: custs,
      targetDeliveredCount,
      dmIndex
    });

    dmIndex++;
  }

  // Build Dispatch allocations and blocks
  const deliveriesArr = [];
  const entriesToCreate = [];
  let totalDelivered = 0;
  let totalPending = 0;

  // Track DM delivery summary for logging
  const dmSummary = [];

  for (const config of dmDeliveriesConfig) {
    const { dm, customers, targetDeliveredCount, dmIndex } = config;
    const allocationsMap = new Map();

    let dmDelivered = 0;
    let dmPending = 0;

    for (let cIdx = 0; cIdx < customers.length; cIdx++) {
      const customer = customers[cIdx];
      const isDelivered = cIdx < targetDeliveredCount;

      // Ensure customer has product subscriptions
      const custProducts = (customer.products && customer.products.length > 0)
        ? customer.products
        : [{
            product: products[0]._id,
            quantity: 1
          }];

      const entryProducts = [];
      for (const p of custProducts) {
        const pIdStr = (p._id || p.product).toString();
        const qty = p.quantity || 1;
        entryProducts.push({
          product: new mongoose.Types.ObjectId(pIdStr),
          quantity: qty
        });

        // Add to DM allocations
        const currentTotal = allocationsMap.get(pIdStr) || 0;
        allocationsMap.set(pIdStr, currentTotal + qty);
      }

      let deliveredAt = undefined;
      let status = 'pending';

      if (isDelivered) {
        status = 'delivered';
        dmDelivered++;
        totalDelivered++;

        // Realistic delivery time between 06:15 and 09:45 AM IST today
        deliveredAt = new Date(`${dateString}T06:00:00.000+05:30`);
        const hourOffset = Math.floor(dmIndex / 4); // 0 to 3 hours (6:00 to 9:00)
        const minuteOffset = 15 + ((cIdx * 18 + dmIndex * 7) % 40);
        deliveredAt.setHours(6 + hourOffset, minuteOffset, 0, 0);
      } else {
        status = 'pending';
        dmPending++;
        totalPending++;
      }

      entriesToCreate.push({
        customer: customer._id,
        dm: dm._id,
        products: entryProducts,
        status,
        deliveredAt,
        date: dispatchDate,
        createdAt: dispatchDate,
        updatedAt: deliveredAt || dispatchDate
      });
    }

    const allocations = [];
    for (const [pId, qty] of allocationsMap.entries()) {
      allocations.push({
        product: new mongoose.Types.ObjectId(pId),
        quantity: qty
      });
    }

    const dmBlockStatus = dmPending === 0 ? 'completed' : 'assigned';
    deliveriesArr.push({
      dm: dm._id,
      allocations,
      status: dmBlockStatus
    });

    dmSummary.push({
      name: dm.name,
      mobile: dm.mobile,
      total: customers.length,
      delivered: dmDelivered,
      pending: dmPending,
      blockStatus: dmBlockStatus
    });
  }

  // 4. Save Today's Dispatch Document
  const dispatch = new Dispatch({
    date: dispatchDate,
    deliveries: deliveriesArr,
    status: totalPending === 0 ? 'completed' : 'created',
    createdAt: dispatchDate,
    updatedAt: dispatchDate
  });

  await dispatch.save();
  console.log(`Created Dispatch: ID ${dispatch._id}, Status: ${dispatch.status}, Deliveries Count: ${dispatch.deliveries.length}`);

  // 5. Save DeliveryEntries with dispatch reference
  for (const entryData of entriesToCreate) {
    entryData.dispatch = dispatch._id;
  }

  const createdEntries = await DeliveryEntry.insertMany(entriesToCreate);
  console.log(`Created ${createdEntries.length} DeliveryEntries.`);

  console.log('\n--- DM Breakdown for Today ---');
  console.table(dmSummary);

  console.log(`\nOverall Totals:`);
  console.log(`Total Deliveries: ${createdEntries.length}`);
  console.log(`Delivered: ${totalDelivered}`);
  console.log(`Pending: ${totalPending}`);
  console.log(`Completion Rate: ${((totalDelivered / createdEntries.length) * 100).toFixed(1)}%`);

  await mongoose.disconnect();
}

seedToday().catch(console.error);

