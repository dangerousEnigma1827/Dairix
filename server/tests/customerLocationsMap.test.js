import 'dotenv/config';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

import app from '../app.js';
import User from '../models/userModels.js';
import Dispatch from '../models/dispatchModels.js';
import DeliveryEntry from '../models/deliveryEntryModels.js';
import { getKolkataDateString } from '../utils/deliveryDay.js';

describe('Phase 4: Customer Locations on Owner Map API', () => {
  let ownerUser;
  let dmUser;
  let customerUser;
  let ownerToken;
  let dmToken;
  let customerToken;
  let testDispatch;
  const createdUserIds = [];
  const createdEntryIds = [];

  beforeAll(async () => {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is required.');
    }
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    const todayIST = getKolkataDateString();
    const todayDate = new Date(`${todayIST}T06:00:00.000+05:30`);

    ownerUser = await User.create({
      name: 'Map Test Owner',
      mobile: `+91${Date.now().toString().slice(-10)}`,
      password: 'Password@123',
      role: 'owner',
    });
    createdUserIds.push(ownerUser._id);

    dmUser = await User.create({
      name: 'Map Test DM',
      mobile: `+91${(Date.now() + 1).toString().slice(-10)}`,
      password: 'Password@123',
      role: 'dm',
    });
    createdUserIds.push(dmUser._id);

    customerUser = await User.create({
      name: 'Map Test Customer',
      mobile: `+91${(Date.now() + 2).toString().slice(-10)}`,
      password: 'Password@123',
      role: 'customer',
    });
    createdUserIds.push(customerUser._id);

    ownerToken = jwt.sign({ _id: ownerUser._id, role: ownerUser.role }, process.env.JWT_SECRET);
    dmToken = jwt.sign({ _id: dmUser._id, role: dmUser.role }, process.env.JWT_SECRET);
    customerToken = jwt.sign({ _id: customerUser._id, role: customerUser.role }, process.env.JWT_SECRET);

    testDispatch = await Dispatch.create({
      date: todayDate,
      deliveries: [{ dm: dmUser._id, allocations: [], status: 'assigned' }],
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
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  test('1. Owner authorization: non-owners are rejected with 401/403', async () => {
    // Unauthenticated
    await request(app)
      .get('/api/dashboard/customer-locations')
      .expect(401);

    // Customer role
    const custRes = await request(app)
      .get('/api/dashboard/customer-locations')
      .set('Cookie', [`token=${customerToken}`])
      .expect(403);
    expect(custRes.body.message).toMatch(/Access denied/i);

    // DM role
    const dmRes = await request(app)
      .get('/api/dashboard/customer-locations')
      .set('Cookie', [`token=${dmToken}`])
      .expect(403);
    expect(dmRes.body.message).toMatch(/Access denied/i);

    // Owner role
    const ownerRes = await request(app)
      .get('/api/dashboard/customer-locations')
      .set('Cookie', [`token=${ownerToken}`])
      .expect(200);
    expect(ownerRes.body.success).toBe(true);
    expect(Array.isArray(ownerRes.body.data)).toBe(true);
  });

  test('2. Customers with valid coordinates vs without coordinates', async () => {
    const todayIST = getKolkataDateString();
    const todayDate = new Date(`${todayIST}T06:00:00.000+05:30`);

    // Customer with valid coordinates
    const custWithCoords = await User.create({
      name: 'Mapped Customer Bangalore',
      mobile: `+91${(Date.now() + 10).toString().slice(-10)}`,
      password: 'Password@123',
      role: 'customer',
      address: {
        houseNo: '101',
        street: 'Koramangala 4th Block',
        city: 'Bengaluru',
        pincode: '560034',
        latitude: 12.9344,
        longitude: 77.6256,
      },
    });
    createdUserIds.push(custWithCoords._id);

    // Customer without coordinates
    const custNoCoords = await User.create({
      name: 'Unmapped Customer',
      mobile: `+91${(Date.now() + 20).toString().slice(-10)}`,
      password: 'Password@123',
      role: 'customer',
      address: {
        houseNo: '202',
        street: 'Old Airport Road',
        city: 'Bengaluru',
        pincode: '560008',
      },
    });
    createdUserIds.push(custNoCoords._id);

    const entry1 = await DeliveryEntry.create({
      dispatch: testDispatch._id,
      customer: custWithCoords._id,
      dm: dmUser._id,
      products: [],
      status: 'pending',
      date: todayDate,
      createdAt: todayDate,
    });
    createdEntryIds.push(entry1._id);

    const entry2 = await DeliveryEntry.create({
      dispatch: testDispatch._id,
      customer: custNoCoords._id,
      dm: dmUser._id,
      products: [],
      status: 'pending',
      date: todayDate,
      createdAt: todayDate,
    });
    createdEntryIds.push(entry2._id);

    const res = await request(app)
      .get('/api/dashboard/customer-locations')
      .set('Cookie', [`token=${ownerToken}`])
      .expect(200);

    const mapped = res.body.data.find((c) => c.customerId === custWithCoords._id.toString());
    const unmapped = res.body.data.find((c) => c.customerId === custNoCoords._id.toString());

    expect(mapped).toBeTruthy();
    expect(mapped.coordinates).toEqual({ latitude: 12.9344, longitude: 77.6256 });

    expect(unmapped).toBeTruthy();
    expect(unmapped.coordinates).toBeNull(); // Never guessed or invented!
  });

  test('3. Deduplicates multiple deliveries for the same customer and accurately summarizes statuses', async () => {
    const todayIST = getKolkataDateString();
    const todayDate = new Date(`${todayIST}T06:00:00.000+05:30`);

    const multiCustomer = await User.create({
      name: 'Multi-order Customer',
      mobile: `+91${(Date.now() + 30).toString().slice(-10)}`,
      password: 'Password@123',
      role: 'customer',
      address: {
        houseNo: 'Flat 5B',
        street: 'Indiranagar 100ft Rd',
        city: 'Bengaluru',
        pincode: '560038',
        latitude: 12.9784,
        longitude: 77.6408,
      },
    });
    createdUserIds.push(multiCustomer._id);

    // Delivery 1: delivered
    const delivery1 = await DeliveryEntry.create({
      dispatch: testDispatch._id,
      customer: multiCustomer._id,
      dm: dmUser._id,
      products: [],
      status: 'delivered',
      deliveredAt: new Date(),
      date: todayDate,
      createdAt: todayDate,
    });
    createdEntryIds.push(delivery1._id);

    // Delivery 2: pending
    const delivery2 = await DeliveryEntry.create({
      dispatch: testDispatch._id,
      customer: multiCustomer._id,
      dm: dmUser._id,
      products: [],
      status: 'pending',
      date: todayDate,
      createdAt: todayDate,
    });
    createdEntryIds.push(delivery2._id);

    const res = await request(app)
      .get('/api/dashboard/customer-locations')
      .set('Cookie', [`token=${ownerToken}`])
      .expect(200);

    // Deduplication check: customer appears exactly ONCE
    const customerRecords = res.body.data.filter((c) => c.customerId === multiCustomer._id.toString());
    expect(customerRecords.length).toBe(1);

    const record = customerRecords[0];
    expect(record.totalDeliveries).toBe(2);
    expect(record.deliveries.length).toBe(2);
    // Mixed statuses -> overallStatus: 'partial'
    expect(record.overallStatus).toBe('partial');
    expect(record.assignedDm.name).toBe(dmUser.name);
  });

  test('4. Correctly identifies delivered and skipped overall statuses', async () => {
    const todayIST = getKolkataDateString();
    const todayDate = new Date(`${todayIST}T06:00:00.000+05:30`);

    const deliveredCustomer = await User.create({
      name: 'Delivered Customer',
      mobile: `+91${(Date.now() + 40).toString().slice(-10)}`,
      password: 'Password@123',
      role: 'customer',
      address: {
        houseNo: '12',
        city: 'Bengaluru',
        latitude: 12.9716,
        longitude: 77.5946,
      },
    });
    createdUserIds.push(deliveredCustomer._id);

    const skippedCustomer = await User.create({
      name: 'Skipped Customer',
      mobile: `+91${(Date.now() + 50).toString().slice(-10)}`,
      password: 'Password@123',
      role: 'customer',
      address: {
        houseNo: '14',
        city: 'Bengaluru',
        latitude: 12.9800,
        longitude: 77.6000,
      },
    });
    createdUserIds.push(skippedCustomer._id);

    const d1 = await DeliveryEntry.create({
      dispatch: testDispatch._id,
      customer: deliveredCustomer._id,
      dm: dmUser._id,
      products: [],
      status: 'delivered',
      deliveredAt: new Date(),
      date: todayDate,
      createdAt: todayDate,
    });
    createdEntryIds.push(d1._id);

    const d2 = await DeliveryEntry.create({
      dispatch: testDispatch._id,
      customer: skippedCustomer._id,
      dm: dmUser._id,
      products: [],
      status: 'skipped',
      date: todayDate,
      createdAt: todayDate,
    });
    createdEntryIds.push(d2._id);

    const res = await request(app)
      .get('/api/dashboard/customer-locations')
      .set('Cookie', [`token=${ownerToken}`])
      .expect(200);

    const delRecord = res.body.data.find((c) => c.customerId === deliveredCustomer._id.toString());
    const skipRecord = res.body.data.find((c) => c.customerId === skippedCustomer._id.toString());

    expect(delRecord.overallStatus).toBe('delivered');
    expect(skipRecord.overallStatus).toBe('skipped');
  });

  test('5. Filtering by date parameter returns deliveries for that specific date', async () => {
    const yesterdayDate = new Date('2026-10-24T06:00:00.000+05:30');

    const pastCustomer = await User.create({
      name: 'Past Date Customer',
      mobile: `+91${(Date.now() + 60).toString().slice(-10)}`,
      password: 'Password@123',
      role: 'customer',
      address: {
        city: 'Bengaluru',
        latitude: 12.9200,
        longitude: 77.5800,
      },
    });
    createdUserIds.push(pastCustomer._id);

    const pastEntry = await DeliveryEntry.create({
      dispatch: testDispatch._id,
      customer: pastCustomer._id,
      dm: dmUser._id,
      products: [],
      status: 'delivered',
      deliveredAt: yesterdayDate,
      date: yesterdayDate,
      createdAt: yesterdayDate,
    });
    createdEntryIds.push(pastEntry._id);

    // Query yesterday
    const resYesterday = await request(app)
      .get('/api/dashboard/customer-locations?date=2026-10-24')
      .set('Cookie', [`token=${ownerToken}`])
      .expect(200);

    const foundInYesterday = resYesterday.body.data.find((c) => c.customerId === pastCustomer._id.toString());
    expect(foundInYesterday).toBeTruthy();

    // Query today -> past customer should not be present
    const resToday = await request(app)
      .get('/api/dashboard/customer-locations?date=2026-10-25')
      .set('Cookie', [`token=${ownerToken}`])
      .expect(200);

    const foundInToday = resToday.body.data.find((c) => c.customerId === pastCustomer._id.toString());
    expect(foundInToday).toBeFalsy();
  });
});
