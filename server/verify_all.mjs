import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

import mongoose from 'mongoose';
import request from 'supertest';
import app from './app.js';
import User from './models/userModels.js';
import Product from './models/productModels.js';
import Dispatch from './models/dispatchModels.js';
import DeliveryEntry from './models/deliveryEntryModels.js';
import { getDeliveryDayRange, getKolkataDateString } from './utils/deliveryDay.js';

async function verifyAll() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('====================================================');
  console.log('       DAIRIX FULL VERIFICATION SUITE              ');
  console.log('====================================================\n');

  let passes = 0;
  let failures = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passes++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failures++;
    }
  }

  const { startOfDay, endOfDay, dateString } = getDeliveryDayRange();
  console.log(`Current Delivery Date: ${dateString}`);
  console.log(`Range: ${startOfDay.toISOString()} - ${endOfDay.toISOString()}\n`);

  // --- 1. Check Today's Dispatch Records Exist ---
  console.log('--- 1. Verification: Today\'s Dispatch Records ---');
  const todayDispatches = await Dispatch.find({
    $or: [
      { date: { $gte: startOfDay, $lte: endOfDay } },
      { createdAt: { $gte: startOfDay, $lte: endOfDay } }
    ]
  }).populate('deliveries.dm').populate('deliveries.allocations.product');

  assert(todayDispatches.length === 1, `Exactly 1 dispatch record exists for today (found: ${todayDispatches.length})`);
  const dispatch = todayDispatches[0];
  assert(dispatch?.deliveries?.length === 18, `Dispatch contains 18 DM delivery blocks (found: ${dispatch?.deliveries?.length})`);
  assert(dispatch?.status === 'created', `Dispatch overall status is 'created' while day is in progress (actual: ${dispatch?.status})`);

  // --- 2. Check Today's Delivery Entries Exist & Match Dispatch ---
  console.log('\n--- 2. Verification: Today\'s Delivery Entries ---');
  const todayEntries = await DeliveryEntry.find({
    $or: [
      { date: { $gte: startOfDay, $lte: endOfDay } },
      { createdAt: { $gte: startOfDay, $lte: endOfDay } },
      { dispatch: dispatch?._id }
    ]
  }).populate('customer').populate('dm').populate('products.product');

  assert(todayEntries.length === 55, `Exactly 55 delivery entries exist for today (found: ${todayEntries.length})`);

  const deliveredEntries = todayEntries.filter(e => e.status === 'delivered');
  const pendingEntries = todayEntries.filter(e => e.status === 'pending');
  const skippedEntries = todayEntries.filter(e => e.status === 'skipped');

  assert(deliveredEntries.length === 32, `Exactly 32 delivered entries (found: ${deliveredEntries.length})`);
  assert(pendingEntries.length === 23, `Exactly 23 pending entries (found: ${pendingEntries.length})`);
  assert(skippedEntries.length === 0, `0 skipped entries for today since cutoff has not passed (found: ${skippedEntries.length})`);

  // Verify timestamps on delivered entries
  let validTimestamps = true;
  for (const entry of deliveredEntries) {
    if (!entry.deliveredAt || isNaN(new Date(entry.deliveredAt).getTime())) {
      validTimestamps = false;
      break;
    }
    const entryDateStr = getKolkataDateString(entry.deliveredAt);
    if (entryDateStr !== '2026-11-03') {
      validTimestamps = false;
      break;
    }
  }
  assert(validTimestamps, `All 32 delivered entries have valid delivery timestamps on November 3, 2026`);

  // Verify pending entries have no premature deliveredAt
  let pendingValid = true;
  for (const entry of pendingEntries) {
    if (entry.deliveredAt) {
      pendingValid = false;
      break;
    }
  }
  assert(pendingValid, `All 23 pending entries have deliveredAt unset/null`);

  // --- 3. Consistency Between Dispatch Quantities and Delivery Quantities ---
  console.log('\n--- 3. Verification: Dispatch vs Delivery Quantity Consistency ---');
  let quantitiesConsistent = true;
  for (const block of dispatch.deliveries) {
    const dmIdStr = block.dm._id.toString();
    const dmEntries = todayEntries.filter(e => e.dm._id.toString() === dmIdStr);

    // Sum quantities per product in deliveries
    const expectedTotals = new Map();
    for (const e of dmEntries) {
      for (const p of e.products) {
        const prodIdStr = p.product._id.toString();
        expectedTotals.set(prodIdStr, (expectedTotals.get(prodIdStr) || 0) + p.quantity);
      }
    }

    // Compare with block.allocations
    for (const alloc of block.allocations) {
      const prodIdStr = alloc.product._id.toString();
      const expectedQty = expectedTotals.get(prodIdStr) || 0;
      if (alloc.quantity !== expectedQty) {
        quantitiesConsistent = false;
        console.error(`Mismatch for DM ${block.dm.name}, Product ${alloc.product.name}: dispatch ${alloc.quantity} vs delivery sum ${expectedQty}`);
      }
    }
  }
  assert(quantitiesConsistent, `Dispatch allocation quantities exactly match sum of customer delivery quantities for all 18 DMs`);

  // --- 4. No Duplicate Customers, DMs, or Products Created ---
  console.log('\n--- 4. Verification: No Duplicates Created ---');
  const totalCustomers = await User.countDocuments({ role: 'customer' });
  const totalDms = await User.countDocuments({ role: 'dm' });
  const totalProducts = await Product.countDocuments();
  assert(totalCustomers === 62, `Total customers count remains exactly 62 (found: ${totalCustomers})`);
  assert(totalDms === 20, `Total DMs count remains exactly 20 (found: ${totalDms})`);
  assert(totalProducts === 14, `Total products count remains exactly 14 (found: ${totalProducts})`);

  // --- 5. Address Enablement for EVERY Delivery Man ---
  console.log('\n--- 5. Verification: Every Delivery Man Address Enabled ---');
  const allDms = await User.find({ role: 'dm' });
  let allEnabled = true;
  let allHaveAddresses = true;
  for (const dm of allDms) {
    const hasStreet = Boolean(dm.address?.street && dm.address.street.trim() !== '');
    const hasCity = Boolean(dm.address?.city && dm.address.city.trim() !== '');
    const isEnabled = dm.address?.enabled === true && dm.address?.isAddressEnabled === true;
    if (!hasStreet || !hasCity) {
      allHaveAddresses = false;
      console.error(`DM ${dm.name} missing address!`);
    }
    if (!isEnabled) {
      allEnabled = false;
      console.error(`DM ${dm.name} address not enabled!`);
    }
  }
  assert(allHaveAddresses, `All 20 DMs have valid populated address (street and city)`);
  assert(allEnabled, `All 20 DMs have address enabled flags (enabled: true, isAddressEnabled: true)`);

  // --- 6. Address Settings Persist After Re-authenticating / Refresh ---
  console.log('\n--- 6. Verification: Authentication & Address Persistence via API ---');
  let authSuccessForAll = true;
  for (const dm of allDms) {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ mobile: dm.mobile, password: '1' });

    if (loginRes.status !== 200) {
      authSuccessForAll = false;
      console.error(`Failed login for ${dm.name} (${dm.mobile})`);
      continue;
    }

    const authCookies = loginRes.headers['set-cookie'];
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', authCookies);

    const fetchedUser = meRes.body?.data?.user;
    if (!fetchedUser?.address?.street || fetchedUser.address?.enabled !== true) {
      authSuccessForAll = false;
      console.error(`Address not persisted on /api/auth/me for ${dm.name}`);
    }
  }
  assert(authSuccessForAll, `All 20 DMs successfully authenticate with password '1' and GET /api/auth/me returns persisted enabled address`);

  // --- 7. Owner Dashboard APIs Reflect Today's Dispatch & Delivery Statistics ---
  console.log('\n--- 7. Verification: Owner Dashboard API ---');
  const owner = await User.findOne({ role: 'owner', mobile: '9999999999' });
  const ownerLoginRes = await request(app)
    .post('/api/auth/login')
    .send({ mobile: '9999999999', password: '1' });

  assert(ownerLoginRes.status === 200, `Owner (Muneeb) successfully logged in via /api/auth/login`);
  const ownerCookies = ownerLoginRes.headers['set-cookie'];

  // Test /api/dispatch/today
  const ownerTodayDispatchRes = await request(app)
    .get('/api/dispatch/today')
    .set('Cookie', ownerCookies);

  assert(ownerTodayDispatchRes.status === 200, `GET /api/dispatch/today returned HTTP 200`);
  assert(ownerTodayDispatchRes.body?.exists === true, `Owner today dispatch exists === true`);
  assert(ownerTodayDispatchRes.body?.deliveryEntries?.length === 55, `Owner today deliveryEntries count === 55`);

  // Test /api/dashboard/weekly-stats
  const weeklyStatsRes = await request(app)
    .get('/api/dashboard/weekly-stats')
    .set('Cookie', ownerCookies);

  assert(weeklyStatsRes.status === 200, `GET /api/dashboard/weekly-stats returned HTTP 200`);
  const todayWeeklyStat = weeklyStatsRes.body?.data?.find(s => s.date === dateString);
  assert(todayWeeklyStat?.delivered === 32, `Owner weekly stats for today shows delivered: 32 (actual: ${todayWeeklyStat?.delivered})`);
  assert(todayWeeklyStat?.pending === 23, `Owner weekly stats for today shows pending: 23 (actual: ${todayWeeklyStat?.pending})`);

  // Test /api/dashboard/customer-locations
  const customerLocationsRes = await request(app)
    .get(`/api/dashboard/customer-locations?date=${dateString}`)
    .set('Cookie', ownerCookies);

  assert(customerLocationsRes.status === 200, `GET /api/dashboard/customer-locations returned HTTP 200`);
  assert(customerLocationsRes.body?.data?.length === 55, `Customer delivery locations returned exactly 55 customers (actual: ${customerLocationsRes.body?.data?.length})`);

  // --- 8. DM Dashboard APIs Reflect Assigned Deliveries and Statuses ---
  console.log('\n--- 8. Verification: DM Dashboards API ---');
  // Check Ramesh Kumar (mobile: 9888888888) -> 3 delivered, 1 pending
  const rameshLoginRes = await request(app)
    .post('/api/auth/login')
    .send({ mobile: '9888888888', password: '1' });
  const rameshCookies = rameshLoginRes.headers['set-cookie'];

  const rameshDeliveriesRes = await request(app)
    .get('/api/deliveryEntry/today')
    .set('Cookie', rameshCookies);

  assert(rameshDeliveriesRes.status === 200, `Ramesh Kumar GET /api/deliveryEntry/today returned HTTP 200`);
  const rameshDeliveries = rameshDeliveriesRes.body?.deliveries || [];
  assert(rameshDeliveries.length === 4, `Ramesh Kumar has 4 assigned deliveries today (found: ${rameshDeliveries.length})`);
  const rameshDelivered = rameshDeliveries.filter(d => d.status === 'delivered').length;
  const rameshPending = rameshDeliveries.filter(d => d.status === 'pending').length;
  assert(rameshDelivered === 3 && rameshPending === 1, `Ramesh Kumar has 3 delivered and 1 pending (actual: ${rameshDelivered} delivered, ${rameshPending} pending)`);

  // Check Suresh Sharma (mobile: 9820010002) -> 3 delivered, 0 pending
  const sureshLoginRes = await request(app)
    .post('/api/auth/login')
    .send({ mobile: '9820010002', password: '1' });
  const sureshCookies = sureshLoginRes.headers['set-cookie'];
  const sureshDeliveriesRes = await request(app)
    .get('/api/deliveryEntry/today')
    .set('Cookie', sureshCookies);
  const sureshDeliveries = sureshDeliveriesRes.body?.deliveries || [];
  const sureshDelivered = sureshDeliveries.filter(d => d.status === 'delivered').length;
  const sureshPending = sureshDeliveries.filter(d => d.status === 'pending').length;
  assert(sureshDelivered === 3 && sureshPending === 0, `Suresh Sharma (100% complete DM) has 3 delivered and 0 pending`);

  // Check Harish Mishra (mobile: 9820010018) -> 0 delivered, 3 pending
  const harishLoginRes = await request(app)
    .post('/api/auth/login')
    .send({ mobile: '9820010018', password: '1' });
  const harishCookies = harishLoginRes.headers['set-cookie'];
  const harishDeliveriesRes = await request(app)
    .get('/api/deliveryEntry/today')
    .set('Cookie', harishCookies);
  const harishDeliveries = harishDeliveriesRes.body?.deliveries || [];
  const harishDelivered = harishDeliveries.filter(d => d.status === 'delivered').length;
  const harishPending = harishDeliveries.filter(d => d.status === 'pending').length;
  assert(harishDelivered === 0 && harishPending === 3, `Harish Mishra (round in progress DM) has 0 delivered and 3 pending`);

  // --- 9. No Existing Historical Data Was Accidentally Modified ---
  console.log('\n--- 9. Verification: Historical Data Integrity ---');
  const pastDispatches = await Dispatch.find({
    date: { $lt: startOfDay }
  });
  const pastEntries = await DeliveryEntry.find({
    date: { $lt: startOfDay }
  });
  console.log(`Historical dispatches before today: ${pastDispatches.length}`);
  console.log(`Historical delivery entries before today: ${pastEntries.length}`);
  assert(pastDispatches.length >= 14, `Historical dispatches exist and preserved (found: ${pastDispatches.length})`);
  assert(pastEntries.length > 700, `Historical delivery entries exist and preserved (found: ${pastEntries.length})`);

  console.log('\n====================================================');
  console.log(`VERIFICATION COMPLETE: ${passes} Passed, ${failures} Failed`);
  console.log('====================================================');

  await mongoose.disconnect();
  process.exit(failures > 0 ? 1 : 0);
}

verifyAll().catch((err) => {
  console.error('Verification script crashed:', err);
  process.exit(1);
});
