import 'dotenv/config';
import { jest } from '@jest/globals';
import http from 'http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import request from 'supertest';
import { io as Client } from 'socket.io-client';
import app from '../app.js';
import User from '../models/userModels.js';
import Dispatch from '../models/dispatchModels.js';
import DeliveryEntry from '../models/deliveryEntryModels.js';
import { initSocket, getIO } from '../config/socket.js';
import { getKolkataDateString } from '../utils/deliveryDay.js';

describe('P0: Real-Time Delivery Status Synchronization', () => {
  let httpServer;
  let serverPort;
  let authDm;
  let otherDm;
  let targetCustomer;
  let unrelatedCustomer;
  let ownerUser;

  let dmToken;
  let otherDmToken;
  let targetCustomerToken;
  let unrelatedCustomerToken;
  let ownerToken;

  let todayDispatch;
  let activeDeliveryEntry;

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
    const salt = Date.now().toString().slice(-8);

    // 1. Create Users
    ownerUser = await User.create({
      name: `Sync Owner ${salt}`,
      mobile: `90${salt}01`,
      password: 'Password@123',
      role: 'owner',
    });
    createdUserIds.push(ownerUser._id);

    authDm = await User.create({
      name: `Sync Auth DM ${salt}`,
      mobile: `90${salt}02`,
      password: 'Password@123',
      role: 'dm',
    });
    createdUserIds.push(authDm._id);

    otherDm = await User.create({
      name: `Sync Other DM ${salt}`,
      mobile: `90${salt}03`,
      password: 'Password@123',
      role: 'dm',
    });
    createdUserIds.push(otherDm._id);

    targetCustomer = await User.create({
      name: `Target Customer ${salt}`,
      mobile: `90${salt}04`,
      password: 'Password@123',
      role: 'customer',
      assignedDm: authDm._id,
    });
    createdUserIds.push(targetCustomer._id);

    unrelatedCustomer = await User.create({
      name: `Unrelated Customer ${salt}`,
      mobile: `90${salt}05`,
      password: 'Password@123',
      role: 'customer',
      assignedDm: otherDm._id,
    });
    createdUserIds.push(unrelatedCustomer._id);

    // 2. Generate Tokens
    ownerToken = jwt.sign(
      { _id: ownerUser._id, mobile: ownerUser.mobile, role: ownerUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    dmToken = jwt.sign(
      { _id: authDm._id, mobile: authDm.mobile, role: authDm.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    otherDmToken = jwt.sign(
      { _id: otherDm._id, mobile: otherDm.mobile, role: otherDm.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    targetCustomerToken = jwt.sign(
      { _id: targetCustomer._id, mobile: targetCustomer.mobile, role: targetCustomer.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    unrelatedCustomerToken = jwt.sign(
      { _id: unrelatedCustomer._id, mobile: unrelatedCustomer.mobile, role: unrelatedCustomer.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // 3. Create Today's Dispatch and DeliveryEntry
    todayDispatch = await Dispatch.create({
      date: todayDate,
      createdAt: todayDate,
      deliveries: [
        { dm: authDm._id, allocations: [], status: 'assigned' },
        { dm: otherDm._id, allocations: [], status: 'assigned' },
      ],
      status: 'created',
    });

    activeDeliveryEntry = await DeliveryEntry.create({
      dispatch: todayDispatch._id,
      customer: targetCustomer._id,
      dm: authDm._id,
      products: [],
      status: 'pending',
      date: todayDate,
      createdAt: todayDate,
    });
    createdEntryIds.push(activeDeliveryEntry._id);

    // 4. Start HTTP Server with Socket.IO attached
    httpServer = http.createServer(app);
    initSocket(httpServer);

    await new Promise((resolve) => {
      httpServer.listen(0, () => {
        serverPort = httpServer.address().port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    if (createdEntryIds.length > 0) {
      await DeliveryEntry.deleteMany({ _id: { $in: createdEntryIds } });
    }
    if (todayDispatch?._id) {
      await Dispatch.deleteOne({ _id: todayDispatch._id });
    }
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }

    try {
      const io = getIO();
      await new Promise((resolve) => io.close(resolve));
    } catch {}

    if (httpServer?.listening) {
      await new Promise((resolve) => httpServer.close(resolve));
    }

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  test('1. Successful delivery confirmation updates MongoDB and emits delivery:entry:updated', async () => {
    const ownerSocket = Client(`http://localhost:${serverPort}`, {
      auth: { token: ownerToken },
      transports: ['websocket'],
    });

    const targetCustomerSocket = Client(`http://localhost:${serverPort}`, {
      auth: { token: targetCustomerToken },
      transports: ['websocket'],
    });

    const unrelatedCustomerSocket = Client(`http://localhost:${serverPort}`, {
      auth: { token: unrelatedCustomerToken },
      transports: ['websocket'],
    });

    await Promise.all([
      new Promise((res) => ownerSocket.on('connect', res)),
      new Promise((res) => targetCustomerSocket.on('connect', res)),
      new Promise((res) => unrelatedCustomerSocket.on('connect', res)),
    ]);

    let ownerReceivedPayload = null;
    let customerReceivedPayload = null;
    let unrelatedReceived = false;

    ownerSocket.on('delivery:entry:updated', (payload) => {
      ownerReceivedPayload = payload;
    });

    targetCustomerSocket.on('delivery:entry:updated', (payload) => {
      customerReceivedPayload = payload;
    });

    unrelatedCustomerSocket.on('delivery:entry:updated', () => {
      unrelatedReceived = true;
    });

    // DM confirms delivery via HTTP API
    const res = await request(app)
      .post(`/api/deliveryEntry/delivery/${targetCustomer._id}`)
      .set('Cookie', [`token=${dmToken}`])
      .send({ status: 'delivered' })
      .expect(200);

    expect(res.body.status).toBe('delivered');
    expect(res.body.deliveredAt).toBeTruthy();

    // Verify MongoDB update succeeded
    const updatedInDb = await DeliveryEntry.findById(activeDeliveryEntry._id);
    expect(updatedInDb.status).toBe('delivered');
    expect(updatedInDb.deliveredAt).toBeTruthy();

    // Wait briefly for socket events to arrive
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Verify Owner received the exact update payload
    expect(ownerReceivedPayload).toBeTruthy();
    expect(ownerReceivedPayload.entryId).toBe(activeDeliveryEntry._id.toString());
    expect(ownerReceivedPayload.customerId).toBe(targetCustomer._id.toString());
    expect(ownerReceivedPayload.dmId).toBe(authDm._id.toString());
    expect(ownerReceivedPayload.status).toBe('delivered');
    expect(ownerReceivedPayload.deliveredAt).toBeTruthy();

    // Verify Target Customer received the update payload in their personal room
    expect(customerReceivedPayload).toBeTruthy();
    expect(customerReceivedPayload.entryId).toBe(activeDeliveryEntry._id.toString());
    expect(customerReceivedPayload.customerId).toBe(targetCustomer._id.toString());
    expect(customerReceivedPayload.status).toBe('delivered');

    // Verify Unrelated Customer did NOT receive the event
    expect(unrelatedReceived).toBe(false);

    ownerSocket.disconnect();
    targetCustomerSocket.disconnect();
    unrelatedCustomerSocket.disconnect();
  });

  test('2. Failed delivery confirmation does not emit delivery:entry:updated', async () => {
    const ownerSocket = Client(`http://localhost:${serverPort}`, {
      auth: { token: ownerToken },
      transports: ['websocket'],
    });

    const targetCustomerSocket = Client(`http://localhost:${serverPort}`, {
      auth: { token: targetCustomerToken },
      transports: ['websocket'],
    });

    await Promise.all([
      new Promise((res) => ownerSocket.on('connect', res)),
      new Promise((res) => targetCustomerSocket.on('connect', res)),
    ]);

    let eventEmitted = false;
    ownerSocket.on('delivery:entry:updated', () => {
      eventEmitted = true;
    });
    targetCustomerSocket.on('delivery:entry:updated', () => {
      eventEmitted = true;
    });

    // Attempt delivery with invalid status
    await request(app)
      .post(`/api/deliveryEntry/delivery/${targetCustomer._id}`)
      .set('Cookie', [`token=${dmToken}`])
      .send({ status: 'invalid_status_value' })
      .expect(400);

    // Attempt unauthorized DM updating target customer
    await request(app)
      .post(`/api/deliveryEntry/delivery/${targetCustomer._id}`)
      .set('Cookie', [`token=${otherDmToken}`])
      .send({ status: 'delivered' })
      .expect(403);

    await new Promise((resolve) => setTimeout(resolve, 300));

    // No event should have been emitted
    expect(eventEmitted).toBe(false);

    ownerSocket.disconnect();
    targetCustomerSocket.disconnect();
  });

  test('3. Unrelated customers cannot receive another customer\'s delivery updates', async () => {
    const todayIST = getKolkataDateString();
    const todayDate = new Date(`${todayIST}T06:00:00.000+05:30`);

    // Create a new delivery entry for unrelatedCustomer assigned to otherDm
    const secondEntry = await DeliveryEntry.create({
      dispatch: todayDispatch._id,
      customer: unrelatedCustomer._id,
      dm: otherDm._id,
      products: [],
      status: 'pending',
      date: todayDate,
      createdAt: todayDate,
    });
    createdEntryIds.push(secondEntry._id);

    const targetCustomerSocket = Client(`http://localhost:${serverPort}`, {
      auth: { token: targetCustomerToken },
      transports: ['websocket'],
    });

    const unrelatedCustomerSocket = Client(`http://localhost:${serverPort}`, {
      auth: { token: unrelatedCustomerToken },
      transports: ['websocket'],
    });

    await Promise.all([
      new Promise((res) => targetCustomerSocket.on('connect', res)),
      new Promise((res) => unrelatedCustomerSocket.on('connect', res)),
    ]);

    let targetCustomerReceived = false;
    let unrelatedCustomerReceivedPayload = null;

    targetCustomerSocket.on('delivery:entry:updated', () => {
      targetCustomerReceived = true;
    });

    unrelatedCustomerSocket.on('delivery:entry:updated', (payload) => {
      unrelatedCustomerReceivedPayload = payload;
    });

    // otherDm confirms delivery for unrelatedCustomer
    await request(app)
      .post(`/api/deliveryEntry/delivery/${unrelatedCustomer._id}`)
      .set('Cookie', [`token=${otherDmToken}`])
      .send({ status: 'delivered' })
      .expect(200);

    await new Promise((resolve) => setTimeout(resolve, 300));

    // Target customer should NOT receive unrelatedCustomer's update
    expect(targetCustomerReceived).toBe(false);

    // Unrelated customer should receive their own update
    expect(unrelatedCustomerReceivedPayload).toBeTruthy();
    expect(unrelatedCustomerReceivedPayload.customerId).toBe(unrelatedCustomer._id.toString());
    expect(unrelatedCustomerReceivedPayload.status).toBe('delivered');

    targetCustomerSocket.disconnect();
    unrelatedCustomerSocket.disconnect();
  });

  test('4. Idempotency: repeated confirmation on delivered entry succeeds without duplicate corruption', async () => {
    // Calling confirm delivery again on already delivered entry returns 200 idempotently
    const res = await request(app)
      .post(`/api/deliveryEntry/delivery/${targetCustomer._id}`)
      .set('Cookie', [`token=${dmToken}`])
      .send({ status: 'delivered' })
      .expect(200);

    expect(res.body.status).toBe('delivered');

    const inDb = await DeliveryEntry.findById(activeDeliveryEntry._id);
    expect(inDb.status).toBe('delivered');
  });

  test('5. Successful skipped update persists to MongoDB and emits delivery:entry:updated', async () => {
    const salt = Date.now().toString().slice(-8);

    const skipCustomer = await User.create({
      name: `Skip Customer ${salt}`,
      mobile: `91${salt}01`,
      password: 'Password@123',
      role: 'customer',
      assignedDm: authDm._id,
    });
    createdUserIds.push(skipCustomer._id);

    const skipCustomerToken = jwt.sign(
      { _id: skipCustomer._id, mobile: skipCustomer.mobile, role: skipCustomer.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Entry with date in the past (cutoff passed -> isDeliveryDayEnded is true)
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const skipEntry = await DeliveryEntry.create({
      dispatch: todayDispatch._id,
      customer: skipCustomer._id,
      dm: authDm._id,
      products: [],
      status: 'pending',
      date: pastDate,
      createdAt: pastDate,
    });
    createdEntryIds.push(skipEntry._id);

    const ownerSocket = Client(`http://localhost:${serverPort}`, {
      auth: { token: ownerToken },
      transports: ['websocket'],
    });

    const customerSocket = Client(`http://localhost:${serverPort}`, {
      auth: { token: skipCustomerToken },
      transports: ['websocket'],
    });

    await Promise.all([
      new Promise((res) => ownerSocket.on('connect', res)),
      new Promise((res) => customerSocket.on('connect', res)),
    ]);

    let ownerReceived = null;
    let customerReceived = null;

    ownerSocket.on('delivery:entry:updated', (payload) => {
      ownerReceived = payload;
    });
    customerSocket.on('delivery:entry:updated', (payload) => {
      customerReceived = payload;
    });

    const res = await request(app)
      .post(`/api/deliveryEntry/delivery/${skipCustomer._id}`)
      .set('Cookie', [`token=${dmToken}`])
      .send({ status: 'skipped' })
      .expect(200);

    expect(res.body.status).toBe('skipped');

    // Verify MongoDB persistence
    const inDb = await DeliveryEntry.findById(skipEntry._id);
    expect(inDb.status).toBe('skipped');

    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(ownerReceived).toBeTruthy();
    expect(ownerReceived.entryId).toBe(skipEntry._id.toString());
    expect(ownerReceived.status).toBe('skipped');
    expect(ownerReceived.customerId).toBe(skipCustomer._id.toString());

    expect(customerReceived).toBeTruthy();
    expect(customerReceived.entryId).toBe(skipEntry._id.toString());
    expect(customerReceived.status).toBe('skipped');

    ownerSocket.disconnect();
    customerSocket.disconnect();
  });

  test('6. Database save error fails safe without emitting delivery:entry:updated', async () => {
    // Reset entry to pending so that it enters the update logic
    await DeliveryEntry.findByIdAndUpdate(activeDeliveryEntry._id, { status: 'pending' });

    const ownerSocket = Client(`http://localhost:${serverPort}`, {
      auth: { token: ownerToken },
      transports: ['websocket'],
    });
    await new Promise((res) => ownerSocket.on('connect', res));

    let eventEmitted = false;
    ownerSocket.on('delivery:entry:updated', () => {
      eventEmitted = true;
    });

    const saveSpy = jest.spyOn(DeliveryEntry.prototype, 'save').mockImplementationOnce(() => {
      throw new Error('Database write failure');
    });

    await request(app)
      .post(`/api/deliveryEntry/delivery/${targetCustomer._id}`)
      .set('Cookie', [`token=${dmToken}`])
      .send({ status: 'delivered' })
      .expect(500);

    saveSpy.mockRestore();

    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(eventEmitted).toBe(false);

    ownerSocket.disconnect();
  });

  test('7. Multi-tenant business isolation: updates for Business A are not emitted to Business B owner', async () => {
    const salt = Date.now().toString().slice(-8);

    // Business B owner, DM, and customer
    const ownerB = await User.create({
      name: `Owner Dairy B ${salt}`,
      mobile: `92${salt}01`,
      password: 'Password@123',
      role: 'owner',
    });
    createdUserIds.push(ownerB._id);

    const dmB = await User.create({
      name: `DM Dairy B ${salt}`,
      mobile: `92${salt}02`,
      password: 'Password@123',
      role: 'dm',
      businessId: ownerB._id,
    });
    createdUserIds.push(dmB._id);

    const customerB = await User.create({
      name: `Customer Dairy B ${salt}`,
      mobile: `92${salt}03`,
      password: 'Password@123',
      role: 'customer',
      businessId: ownerB._id,
      assignedDm: dmB._id,
    });
    createdUserIds.push(customerB._id);

    const ownerBToken = jwt.sign(
      { _id: ownerB._id, mobile: ownerB.mobile, role: ownerB.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Associate authDm with ownerUser businessId
    authDm.businessId = ownerUser._id;
    await authDm.save();

    const dmATokenScoped = jwt.sign(
      { _id: authDm._id, mobile: authDm.mobile, role: authDm.role, businessId: ownerUser._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const ownerASocket = Client(`http://localhost:${serverPort}`, {
      auth: { token: ownerToken },
      transports: ['websocket'],
    });

    const ownerBSocket = Client(`http://localhost:${serverPort}`, {
      auth: { token: ownerBToken },
      transports: ['websocket'],
    });

    await Promise.all([
      new Promise((res) => ownerASocket.on('connect', res)),
      new Promise((res) => ownerBSocket.on('connect', res)),
    ]);

    let ownerAReceived = false;
    let ownerBReceived = false;

    ownerASocket.on('delivery:entry:updated', () => {
      ownerAReceived = true;
    });
    ownerBSocket.on('delivery:entry:updated', () => {
      ownerBReceived = true;
    });

    const todayIST = getKolkataDateString();
    const todayDate = new Date(`${todayIST}T06:00:00.000+05:30`);

    const entryBusinessA = await DeliveryEntry.create({
      dispatch: todayDispatch._id,
      customer: targetCustomer._id,
      dm: authDm._id,
      businessId: ownerUser._id,
      products: [],
      status: 'pending',
      date: todayDate,
      createdAt: todayDate,
    });
    createdEntryIds.push(entryBusinessA._id);

    await request(app)
      .post(`/api/deliveryEntry/delivery/${targetCustomer._id}`)
      .set('Cookie', [`token=${dmATokenScoped}`])
      .send({ status: 'delivered' })
      .expect(200);

    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(ownerAReceived).toBe(true);
    expect(ownerBReceived).toBe(false);

    ownerASocket.disconnect();
    ownerBSocket.disconnect();
  });

  test('8. Repeated delivery update does not emit duplicate delivery:entry:updated socket events', async () => {
    const ownerSocket = Client(`http://localhost:${serverPort}`, {
      auth: { token: ownerToken },
      transports: ['websocket'],
    });

    await new Promise((res) => ownerSocket.on('connect', res));

    let eventCount = 0;
    ownerSocket.on('delivery:entry:updated', () => {
      eventCount++;
    });

    // targetCustomer's delivery entry is already 'delivered'
    // Send repeated delivered confirmation
    const res = await request(app)
      .post(`/api/deliveryEntry/delivery/${targetCustomer._id}`)
      .set('Cookie', [`token=${dmToken}`])
      .send({ status: 'delivered' })
      .expect(200);

    expect(res.body.status).toBe('delivered');

    await new Promise((resolve) => setTimeout(resolve, 300));
    // Must not emit duplicate event
    expect(eventCount).toBe(0);

    ownerSocket.disconnect();
  });

  test('9. Socket event payload contains minimum required fields without sensitive user data', async () => {
    const ownerSocket = Client(`http://localhost:${serverPort}`, {
      auth: { token: ownerToken },
      transports: ['websocket'],
    });

    await new Promise((res) => ownerSocket.on('connect', res));

    let receivedPayload = null;
    ownerSocket.on('delivery:entry:updated', (payload) => {
      receivedPayload = payload;
    });

    const todayIST = getKolkataDateString();
    const todayDate = new Date(`${todayIST}T06:00:00.000+05:30`);
    const salt = Date.now().toString().slice(-8);

    const payloadTestCustomer = await User.create({
      name: `Payload Customer ${salt}`,
      mobile: `93${salt}01`,
      password: 'SecretPassword@123',
      role: 'customer',
      assignedDm: authDm._id,
    });
    createdUserIds.push(payloadTestCustomer._id);

    const payloadEntry = await DeliveryEntry.create({
      dispatch: todayDispatch._id,
      customer: payloadTestCustomer._id,
      dm: authDm._id,
      products: [],
      status: 'pending',
      date: todayDate,
      createdAt: todayDate,
    });
    createdEntryIds.push(payloadEntry._id);

    await request(app)
      .post(`/api/deliveryEntry/delivery/${payloadTestCustomer._id}`)
      .set('Cookie', [`token=${dmToken}`])
      .send({ status: 'delivered' })
      .expect(200);

    await new Promise((resolve) => setTimeout(resolve, 300));

    expect(receivedPayload).toBeTruthy();
    // Required fields
    expect(receivedPayload.entryId).toBe(payloadEntry._id.toString());
    expect(receivedPayload.customerId).toBe(payloadTestCustomer._id.toString());
    expect(receivedPayload.dmId).toBe(authDm._id.toString());
    expect(receivedPayload.status).toBe('delivered');
    expect(receivedPayload.deliveredAt).toBeTruthy();
    expect(receivedPayload.date).toBeTruthy();
    expect(receivedPayload.updatedAt).toBeTruthy();

    // Must NOT contain sensitive data
    expect(receivedPayload.password).toBeUndefined();
    expect(receivedPayload.mobile).toBeUndefined();
    expect(receivedPayload.token).toBeUndefined();

    ownerSocket.disconnect();
  });
});
