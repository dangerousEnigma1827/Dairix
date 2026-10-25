import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../models/userModels.js';
import Dispatch from '../models/dispatchModels.js';
import DeliveryEntry from '../models/deliveryEntryModels.js';
import {
  TIMEZONE,
  getKolkataDateString,
  getDeliveryDayRange,
  isDeliveryDayEnded,
  isTodayOrFutureDelivery,
} from '../utils/deliveryDay.js';
import { transitionExpiredPendingDeliveries } from '../jobs/deliveryCron.js';
import {
  startSession,
  stopSession,
  updateSessionLocation,
  clearAllSessions,
} from '../socket/deliverySession.js';

describe('Delivery Lifecycle: Pending vs Skipped Business Rules', () => {
  let testDm;
  let testCustomer;
  let testDispatch;
  const createdEntryIds = [];

  beforeAll(async () => {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is required.');
    }
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    testDm = await User.findOne({ role: 'dm' });
    if (!testDm) {
      testDm = await User.create({
        name: 'Lifecycle Test DM',
        mobile: `+91${Date.now().toString().slice(-10)}`,
        password: 'Password@123',
        role: 'dm',
      });
    }

    testCustomer = await User.findOne({ role: 'customer' });
    if (!testCustomer) {
      testCustomer = await User.create({
        name: 'Lifecycle Test Customer',
        mobile: `+91${(Date.now() + 1).toString().slice(-10)}`,
        password: 'Password@123',
        role: 'customer',
      });
    }

    testDispatch = await Dispatch.create({
      date: new Date(),
      deliveries: [{ dm: testDm._id, allocations: [], status: 'assigned' }],
      status: 'created',
    });
  });

  afterAll(async () => {
    if (createdEntryIds.length > 0) {
      await DeliveryEntry.deleteMany({ _id: { $in: createdEntryIds } });
    }
    if (testDispatch?._id) {
      await Dispatch.deleteOne({ _id: testDispatch._id });
    }
    clearAllSessions();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  // ── 1. Timezone & Boundary Helpers Tests ─────────────────────────────────

  test('1. Timezone is strictly set to Asia/Kolkata (+05:30)', () => {
    expect(TIMEZONE).toBe('Asia/Kolkata');
  });

  test('2. getDeliveryDayRange returns exact IST day boundaries', () => {
    // Arbitrary date in IST: 2026-10-25
    const testDate = new Date('2026-10-25T12:00:00.000+05:30');
    const { startOfDay, endOfDay, dateString } = getDeliveryDayRange(testDate);

    expect(dateString).toBe('2026-10-25');
    // Start of day in IST: 00:00:00.000+05:30 -> 18:30:00.000Z previous day
    expect(startOfDay.toISOString()).toBe('2026-10-24T18:30:00.000Z');
    // End of day (cutoff) in IST: 23:59:59.999+05:30 -> 18:29:59.999Z same day
    expect(endOfDay.toISOString()).toBe('2026-10-25T18:29:59.999Z');
  });

  test('3. isDeliveryDayEnded returns false before cutoff and true after cutoff', () => {
    const scheduledDate = new Date('2026-10-25T06:00:00.000+05:30');

    // 10:00 AM on delivery day (before cutoff) -> false
    const morningTime = new Date('2026-10-25T10:00:00.000+05:30');
    expect(isDeliveryDayEnded(scheduledDate, morningTime)).toBe(false);

    // 23:59:00 PM on delivery day (before cutoff) -> false
    const nightTime = new Date('2026-10-25T23:59:00.000+05:30');
    expect(isDeliveryDayEnded(scheduledDate, nightTime)).toBe(false);

    // 00:00:01 AM on next day (after cutoff) -> true
    const nextDayMorning = new Date('2026-10-26T00:00:01.000+05:30');
    expect(isDeliveryDayEnded(scheduledDate, nextDayMorning)).toBe(true);
  });

  test('4. isTodayOrFutureDelivery identifies today and future delivery dates accurately', () => {
    const todayRef = new Date('2026-10-25T14:00:00.000+05:30');

    const pastDate = new Date('2026-10-24T18:00:00.000+05:30');
    const todayDate = new Date('2026-10-25T06:00:00.000+05:30');
    const futureDate = new Date('2026-10-26T06:00:00.000+05:30');

    expect(isTodayOrFutureDelivery(pastDate, todayRef)).toBe(false);
    expect(isTodayOrFutureDelivery(todayDate, todayRef)).toBe(true);
    expect(isTodayOrFutureDelivery(futureDate, todayRef)).toBe(true);
  });

  // ── 2. Pending vs Skipped Lifecycle & Cutoff Transition Tests ─────────────

  test('5. Uncompleted deliveries before cutoff remain pending; past incomplete deliveries become skipped', async () => {
    const todayIST = getKolkataDateString();
    const pastIST = new Date();
    pastIST.setDate(pastIST.getDate() - 2);
    const pastDate = new Date(`${getKolkataDateString(pastIST)}T06:00:00.000+05:30`);
    const todayDate = new Date(`${todayIST}T06:00:00.000+05:30`);
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2);
    const futureDateObj = new Date(`${getKolkataDateString(futureDate)}T06:00:00.000+05:30`);

    // 1. Past delivery incomplete (pending)
    const pastPending = await DeliveryEntry.create({
      dispatch: testDispatch._id,
      customer: testCustomer._id,
      dm: testDm._id,
      products: [],
      status: 'pending',
      date: pastDate,
      createdAt: pastDate,
    });
    createdEntryIds.push(pastPending._id);

    // 2. Past delivery completed (delivered)
    const pastDelivered = await DeliveryEntry.create({
      dispatch: testDispatch._id,
      customer: testCustomer._id,
      dm: testDm._id,
      products: [],
      status: 'delivered',
      deliveredAt: pastDate,
      date: pastDate,
      createdAt: pastDate,
    });
    createdEntryIds.push(pastDelivered._id);

    // 3. Today delivery incomplete (pending)
    const todayPending = await DeliveryEntry.create({
      dispatch: testDispatch._id,
      customer: testCustomer._id,
      dm: testDm._id,
      products: [],
      status: 'pending',
      date: todayDate,
      createdAt: todayDate,
    });
    createdEntryIds.push(todayPending._id);

    // 4. Today delivery completed (delivered)
    const todayDelivered = await DeliveryEntry.create({
      dispatch: testDispatch._id,
      customer: testCustomer._id,
      dm: testDm._id,
      products: [],
      status: 'delivered',
      deliveredAt: new Date(),
      date: todayDate,
      createdAt: todayDate,
    });
    createdEntryIds.push(todayDelivered._id);

    // 5. Future delivery incomplete (pending)
    const futurePending = await DeliveryEntry.create({
      dispatch: testDispatch._id,
      customer: testCustomer._id,
      dm: testDm._id,
      products: [],
      status: 'pending',
      date: futureDateObj,
      createdAt: futureDateObj,
    });
    createdEntryIds.push(futurePending._id);

    // Execute transition as of today
    await transitionExpiredPendingDeliveries(new Date());

    // Assertions
    const checkPastPending = await DeliveryEntry.findById(pastPending._id);
    expect(checkPastPending.status).toBe('skipped'); // Cutoff passed -> skipped

    const checkPastDelivered = await DeliveryEntry.findById(pastDelivered._id);
    expect(checkPastDelivered.status).toBe('delivered'); // Completed remains delivered

    const checkTodayPending = await DeliveryEntry.findById(todayPending._id);
    expect(checkTodayPending.status).toBe('pending'); // Day still in progress -> remains pending!

    const checkTodayDelivered = await DeliveryEntry.findById(todayDelivered._id);
    expect(checkTodayDelivered.status).toBe('delivered'); // Completed remains delivered

    const checkFuturePending = await DeliveryEntry.findById(futurePending._id);
    expect(checkFuturePending.status).toBe('pending'); // Future delivery -> remains pending!
  });

  test('6. Transition is idempotent across repeated executions', async () => {
    // Run transition 3 times consecutively
    const count1 = await transitionExpiredPendingDeliveries();
    const count2 = await transitionExpiredPendingDeliveries();
    const count3 = await transitionExpiredPendingDeliveries();

    // Subsequent runs must modify 0 documents
    expect(count2).toBe(0);
    expect(count3).toBe(0);
  });

  test('7. When reference date moves past cutoff into next day, today uncompleted becomes skipped', async () => {
    const todayIST = getKolkataDateString();
    const todayDate = new Date(`${todayIST}T06:00:00.000+05:30`);

    const entry = await DeliveryEntry.create({
      dispatch: testDispatch._id,
      customer: testCustomer._id,
      dm: testDm._id,
      products: [],
      status: 'pending',
      date: todayDate,
      createdAt: todayDate,
    });
    createdEntryIds.push(entry._id);

    // As of today afternoon -> remains pending
    const todayAfternoon = new Date(`${todayIST}T15:00:00.000+05:30`);
    await transitionExpiredPendingDeliveries(todayAfternoon, { _id: entry._id });
    let current = await DeliveryEntry.findById(entry._id);
    expect(current.status).toBe('pending');

    // Simulate cutoff passing: reference time is tomorrow 00:01 AM IST
    const tomorrow = new Date(todayAfternoon);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowMorning = new Date(`${getKolkataDateString(tomorrow)}T00:01:00.000+05:30`);

    await transitionExpiredPendingDeliveries(tomorrowMorning, { _id: entry._id });
    current = await DeliveryEntry.findById(entry._id);
    expect(current.status).toBe('skipped');
  });

  test('8. Tracking session start/location/stop does NOT alter delivery entry status', async () => {
    const todayIST = getKolkataDateString();
    const todayDate = new Date(`${todayIST}T06:00:00.000+05:30`);

    const entry = await DeliveryEntry.create({
      dispatch: testDispatch._id,
      customer: testCustomer._id,
      dm: testDm._id,
      products: [],
      status: 'pending',
      date: todayDate,
      createdAt: todayDate,
    });
    createdEntryIds.push(entry._id);

    // 1. Start tracking session
    startSession(testDm._id.toString(), 'socket-1', testDm);
    let check = await DeliveryEntry.findById(entry._id);
    expect(check.status).toBe('pending');

    // 2. Location updates
    updateSessionLocation(testDm._id.toString(), {
      latitude: 12.9716,
      longitude: 77.5946,
    });
    check = await DeliveryEntry.findById(entry._id);
    expect(check.status).toBe('pending');

    // 3. Stop tracking session
    stopSession(testDm._id.toString());
    check = await DeliveryEntry.findById(entry._id);
    expect(check.status).toBe('pending');
  });

  // ── 3. DM Dashboard Metrics & Calculations Regression Tests ─────────────

  test('9. Completion rate calculation formula: delivered / total * 100 with zero handling', () => {
    const computeRate = (delivered, total) => (total > 0 ? Math.round((delivered / total) * 100) : 0);

    // Scenario A: Four assigned, zero delivered, four pending -> 0% rate (NEVER 100%)
    expect(computeRate(0, 4)).toBe(0);

    // Scenario B: Four assigned, two delivered, one pending, one skipped -> 50% rate
    expect(computeRate(2, 4)).toBe(50);

    // Scenario C: Zero assigned -> 0% (safe zero division handling)
    expect(computeRate(0, 0)).toBe(0);

    // Scenario D: All completed (4 delivered) -> 100% rate
    expect(computeRate(4, 4)).toBe(100);

    // Scenario E: 4 skipped, 0 delivered -> 0% rate (previously was wrongly 100%)
    expect(computeRate(0, 4)).toBe(0);
  });

  test('10. DM dashboard counts and recent activity match underlying records for 4 assigned, 0 delivered, 4 pending', async () => {
    const todayIST = getKolkataDateString();
    const todayDate = new Date(`${todayIST}T06:00:00.000+05:30`);

    // Dedicated DM for dashboard test
    const dashDm = await User.create({
      name: 'Dashboard Test DM',
      mobile: `+91${Date.now().toString().slice(-10)}`,
      password: 'Password@123',
      role: 'dm',
    });

    const entries = [];
    for (let i = 0; i < 4; i++) {
      const e = await DeliveryEntry.create({
        dispatch: testDispatch._id,
        customer: testCustomer._id,
        dm: dashDm._id,
        products: [],
        status: 'pending',
        date: todayDate,
        createdAt: todayDate,
      });
      entries.push(e);
      createdEntryIds.push(e._id);
    }

    const { startOfDay, endOfDay } = getDeliveryDayRange();
    const fetchedDeliveries = await DeliveryEntry.find({
      dm: dashDm._id,
      date: { $gte: startOfDay, $lte: endOfDay },
    }).lean();

    const total = fetchedDeliveries.length;
    const delivered = fetchedDeliveries.filter((d) => d.status === 'delivered').length;
    const skipped = fetchedDeliveries.filter((d) => d.status === 'skipped').length;
    const pending = fetchedDeliveries.filter((d) => d.status === 'pending').length;
    const rate = total > 0 ? Math.round((delivered / total) * 100) : 0;
    const recentActivity = fetchedDeliveries.filter((d) => d.status !== 'pending');

    expect(total).toBe(4);
    expect(delivered).toBe(0);
    expect(skipped).toBe(0);
    expect(pending).toBe(4);
    expect(rate).toBe(0); // MUST be 0%, not 100%
    expect(recentActivity.length).toBe(0); // Incomplete pending orders do not appear as skipped recent activity

    // Cleanup dashDm
    await User.deleteOne({ _id: dashDm._id });
  });

  test('11. DM dashboard counts for 4 assigned: 2 delivered, 1 pending, 1 skipped -> 50% rate', async () => {
    const todayIST = getKolkataDateString();
    const todayDate = new Date(`${todayIST}T06:00:00.000+05:30`);

    const dashDm = await User.create({
      name: 'Dashboard Test DM 2',
      mobile: `+91${(Date.now() + 2).toString().slice(-10)}`,
      password: 'Password@123',
      role: 'dm',
    });

    // 2 delivered
    for (let i = 0; i < 2; i++) {
      const e = await DeliveryEntry.create({
        dispatch: testDispatch._id,
        customer: testCustomer._id,
        dm: dashDm._id,
        products: [],
        status: 'delivered',
        deliveredAt: new Date(),
        date: todayDate,
        createdAt: todayDate,
      });
      createdEntryIds.push(e._id);
    }

    // 1 pending
    const pendingEntry = await DeliveryEntry.create({
      dispatch: testDispatch._id,
      customer: testCustomer._id,
      dm: dashDm._id,
      products: [],
      status: 'pending',
      date: todayDate,
      createdAt: todayDate,
    });
    createdEntryIds.push(pendingEntry._id);

    // 1 legitimately skipped (e.g. past cutoff)
    const skippedEntry = await DeliveryEntry.create({
      dispatch: testDispatch._id,
      customer: testCustomer._id,
      dm: dashDm._id,
      products: [],
      status: 'skipped',
      date: todayDate,
      createdAt: todayDate,
    });
    createdEntryIds.push(skippedEntry._id);

    const { startOfDay, endOfDay } = getDeliveryDayRange();
    const fetchedDeliveries = await DeliveryEntry.find({
      dm: dashDm._id,
      date: { $gte: startOfDay, $lte: endOfDay },
    }).lean();

    const total = fetchedDeliveries.length;
    const delivered = fetchedDeliveries.filter((d) => d.status === 'delivered').length;
    const skipped = fetchedDeliveries.filter((d) => d.status === 'skipped').length;
    const pending = fetchedDeliveries.filter((d) => d.status === 'pending').length;
    const rate = total > 0 ? Math.round((delivered / total) * 100) : 0;
    const recentActivity = fetchedDeliveries.filter((d) => d.status !== 'pending');

    expect(total).toBe(4);
    expect(delivered).toBe(2);
    expect(skipped).toBe(1);
    expect(pending).toBe(1);
    expect(rate).toBe(50); // Exactly 50%
    expect(recentActivity.length).toBe(3); // 2 delivered + 1 skipped

    await User.deleteOne({ _id: dashDm._id });
  });
});
