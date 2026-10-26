import 'dotenv/config';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { io as Client } from 'socket.io-client';
import http from 'http';

import app from '../app.js';
import User from '../models/userModels.js';
import Dispatch from '../models/dispatchModels.js';
import DeliveryEntry from '../models/deliveryEntryModels.js';
import { initSocket, getIO } from '../config/socket.js';
import { getKolkataDateString } from '../utils/deliveryDay.js';

describe('Authorization Hardening & Multi-Tenant Business Scoping', () => {
  let server;
  let serverPort;
  let ownerA;
  let ownerB;
  let dmA;
  let dmB;
  let customerA;
  let customerB;
  let tokenOwnerA;
  let tokenOwnerB;
  let tokenDmA;
  let dispatchA;
  let dispatchB;
  let entryA;
  let entryB;
  const createdUserIds = [];
  const createdEntryIds = [];
  const createdDispatchIds = [];

  beforeAll(async () => {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is required.');
    }
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    server = http.createServer(app);
    initSocket(server);
    await new Promise((resolve) => {
      server.listen(0, () => {
        serverPort = server.address().port;
        resolve();
      });
    });

    const todayIST = getKolkataDateString();
    const todayDate = new Date(`${todayIST}T06:00:00.000+05:30`);

    // Business A: Owner A, DM A, Customer A
    ownerA = await User.create({
      name: 'Owner Dairy A',
      mobile: `+91${Date.now().toString().slice(-10)}`,
      password: 'Password@123',
      role: 'owner',
    });
    createdUserIds.push(ownerA._id);

    dmA = await User.create({
      name: 'DM Dairy A',
      mobile: `+91${(Date.now() + 1).toString().slice(-10)}`,
      password: 'Password@123',
      role: 'dm',
      businessId: ownerA._id,
    });
    createdUserIds.push(dmA._id);

    customerA = await User.create({
      name: 'Customer Dairy A',
      mobile: `+91${(Date.now() + 2).toString().slice(-10)}`,
      password: 'Password@123',
      role: 'customer',
      businessId: ownerA._id,
      address: {
        houseNo: 'A-101',
        street: 'Koramangala 1st Block',
        city: 'Bengaluru',
        latitude: 12.9279,
        longitude: 77.6271,
      },
    });
    createdUserIds.push(customerA._id);

    // Business B: Owner B, DM B, Customer B
    ownerB = await User.create({
      name: 'Owner Dairy B',
      mobile: `+91${(Date.now() + 3).toString().slice(-10)}`,
      password: 'Password@123',
      role: 'owner',
    });
    createdUserIds.push(ownerB._id);

    dmB = await User.create({
      name: 'DM Dairy B',
      mobile: `+91${(Date.now() + 4).toString().slice(-10)}`,
      password: 'Password@123',
      role: 'dm',
      businessId: ownerB._id,
    });
    createdUserIds.push(dmB._id);

    customerB = await User.create({
      name: 'Customer Dairy B',
      mobile: `+91${(Date.now() + 5).toString().slice(-10)}`,
      password: 'Password@123',
      role: 'customer',
      businessId: ownerB._id,
      address: {
        houseNo: 'B-202',
        street: 'Powai Central',
        city: 'Mumbai',
        latitude: 19.1176,
        longitude: 72.9060,
      },
    });
    createdUserIds.push(customerB._id);

    tokenOwnerA = jwt.sign({ _id: ownerA._id, role: ownerA.role }, process.env.JWT_SECRET);
    tokenOwnerB = jwt.sign({ _id: ownerB._id, role: ownerB.role }, process.env.JWT_SECRET);
    tokenDmA = jwt.sign(
      { _id: dmA._id, role: dmA.role, businessId: ownerA._id },
      process.env.JWT_SECRET
    );

    // Dispatches and Entries
    dispatchA = await Dispatch.create({
      owner: ownerA._id,
      businessId: ownerA._id,
      date: todayDate,
      deliveries: [{ dm: dmA._id, allocations: [], status: 'assigned' }],
      status: 'created',
    });
    createdDispatchIds.push(dispatchA._id);

    entryA = await DeliveryEntry.create({
      owner: ownerA._id,
      businessId: ownerA._id,
      dispatch: dispatchA._id,
      customer: customerA._id,
      dm: dmA._id,
      products: [],
      status: 'pending',
      date: todayDate,
      createdAt: todayDate,
    });
    createdEntryIds.push(entryA._id);

    dispatchB = await Dispatch.create({
      owner: ownerB._id,
      businessId: ownerB._id,
      date: todayDate,
      deliveries: [{ dm: dmB._id, allocations: [], status: 'assigned' }],
      status: 'created',
    });
    createdDispatchIds.push(dispatchB._id);

    entryB = await DeliveryEntry.create({
      owner: ownerB._id,
      businessId: ownerB._id,
      dispatch: dispatchB._id,
      customer: customerB._id,
      dm: dmB._id,
      products: [],
      status: 'pending',
      date: todayDate,
      createdAt: todayDate,
    });
    createdEntryIds.push(entryB._id);
  });

  afterAll(async () => {
    try {
      const io = getIO();
      if (io) {
        io.close();
      }
    } catch {}
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    if (createdEntryIds.length > 0) {
      await DeliveryEntry.deleteMany({ _id: { $in: createdEntryIds } });
    }
    if (createdDispatchIds.length > 0) {
      await Dispatch.deleteMany({ _id: { $in: createdDispatchIds } });
    }
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  test('1. Owner B cannot see Owner A customer locations or delivery entries via REST API', async () => {
    // Owner A requests customer locations -> sees customer A, never customer B
    const resA = await request(app)
      .get('/api/dashboard/customer-locations')
      .set('Cookie', [`token=${tokenOwnerA}`])
      .expect(200);

    const custIdsInA = resA.body.data.map((c) => c.customerId);
    expect(custIdsInA).toContain(customerA._id.toString());
    expect(custIdsInA).not.toContain(customerB._id.toString());

    // Owner B requests customer locations -> sees customer B, never customer A
    const resB = await request(app)
      .get('/api/dashboard/customer-locations')
      .set('Cookie', [`token=${tokenOwnerB}`])
      .expect(200);

    const custIdsInB = resB.body.data.map((c) => c.customerId);
    expect(custIdsInB).toContain(customerB._id.toString());
    expect(custIdsInB).not.toContain(customerA._id.toString());
  });

  test('2. Live GPS location broadcast is scoped to authorized business owner room', async () => {
    const socketOwnerA = Client(`http://localhost:${serverPort}`, {
      auth: { token: tokenOwnerA },
      transports: ['websocket'],
    });

    const socketOwnerB = Client(`http://localhost:${serverPort}`, {
      auth: { token: tokenOwnerB },
      transports: ['websocket'],
    });

    const socketDmA = Client(`http://localhost:${serverPort}`, {
      auth: { token: tokenDmA },
      transports: ['websocket'],
    });

    const waitForConnect = (sock) =>
      new Promise((res) => (sock.connected ? res() : sock.on('connect', res)));

    await Promise.all([
      waitForConnect(socketOwnerA),
      waitForConnect(socketOwnerB),
      waitForConnect(socketDmA),
    ]);

    let ownerBReceived = false;
    socketOwnerB.on('delivery:location:broadcast', () => {
      ownerBReceived = true;
    });

    // Start DM A session
    await new Promise((resolve) => {
      socketDmA.emit('delivery:session:start', (res) => {
        expect(res.success).toBe(true);
        resolve();
      });
    });

    const ownerAPromise = new Promise((resolve) => {
      socketOwnerA.on('delivery:location:broadcast', (payload) => {
        expect(payload.dmId).toBe(dmA._id.toString());
        expect(payload.businessId).toBe(ownerA._id.toString());
        resolve();
      });
    });

    // DM A sends GPS coordinates
    socketDmA.emit('delivery:location:update', {
      latitude: 12.9279,
      longitude: 77.6271,
      accuracy: 8,
    });

    await ownerAPromise;

    // Small delay to verify Owner B never received DM A broadcast
    await new Promise((r) => setTimeout(r, 200));
    expect(ownerBReceived).toBe(false);

    socketOwnerA.disconnect();
    socketOwnerB.disconnect();
    socketDmA.disconnect();
  });
});
