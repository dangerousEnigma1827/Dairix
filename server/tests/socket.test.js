import 'dotenv/config';
import http from 'http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { io as Client } from 'socket.io-client';
import app from '../app.js';
import User from '../models/userModels.js';
import Dispatch from '../models/dispatchModels.js';
import DeliveryEntry from '../models/deliveryEntryModels.js';
import { initSocket, getIO } from '../config/socket.js';
import {
  checkPendingDeliveries,
  isValidCoordinates,
  clearAllSessions,
  getSession,
} from '../socket/deliverySession.js';

describe('Socket.IO Integration & Delivery Session Workflow', () => {
  let httpServer;
  let serverPort;
  let testDm;
  let testOwner;
  let testCustomer;
  let dmToken;
  let ownerToken;
  let customerToken;
  let testDispatch;
  let testDeliveryEntry;

  beforeAll(async () => {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined.');
    }
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    // Find or create test DM
    testDm = await User.findOne({ role: 'dm' });
    if (!testDm) {
      testDm = await User.create({
        name: 'Test Delivery Man',
        mobile: `+91${Date.now().toString().slice(-10)}`,
        password: 'Password@123',
        role: 'dm',
      });
    }

    // Find or create test Owner
    testOwner = await User.findOne({ role: 'owner' });
    if (!testOwner) {
      testOwner = await User.create({
        name: 'Test Owner',
        mobile: `+91${(Date.now() + 1).toString().slice(-10)}`,
        password: 'Password@123',
        role: 'owner',
      });
    }

    // Find or create test Customer
    testCustomer = await User.findOne({ role: 'customer' });
    if (!testCustomer) {
      testCustomer = await User.create({
        name: 'Test Customer',
        mobile: `+91${(Date.now() + 2).toString().slice(-10)}`,
        password: 'Password@123',
        role: 'customer',
      });
    }

    dmToken = jwt.sign(
      { _id: testDm._id, mobile: testDm.mobile, role: testDm.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    ownerToken = jwt.sign(
      { _id: testOwner._id, mobile: testOwner.mobile, role: testOwner.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    customerToken = jwt.sign(
      { _id: testCustomer._id, mobile: testCustomer.mobile, role: testCustomer.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create a dispatch and pending delivery entry for testDm for today
    const today = new Date();
    testDispatch = await Dispatch.create({
      date: today,
      createdAt: today,
      deliveries: [
        {
          dm: testDm._id,
          allocations: [],
          status: 'assigned',
        },
      ],
      status: 'created',
    });

    testDeliveryEntry = await DeliveryEntry.create({
      dispatch: testDispatch._id,
      customer: testCustomer._id,
      dm: testDm._id,
      products: [],
      status: 'pending',
      createdAt: today,
    });

    // Dedicated HTTP server for testing
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
    clearAllSessions();
    if (testDeliveryEntry?._id) {
      await DeliveryEntry.deleteOne({ _id: testDeliveryEntry._id });
    }
    if (testDispatch?._id) {
      await Dispatch.deleteOne({ _id: testDispatch._id });
    }

    const io = getIO();
    await new Promise((resolve) => io.close(resolve));
    await new Promise((resolve) => httpServer.close(resolve));
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  beforeEach(() => {
    clearAllSessions();
  });

  // ── 1. Authentication Tests ────────────────────────────────────────────────

  test('1. getIO returns initialized Socket.IO server instance', () => {
    const ioInstance = getIO();
    expect(ioInstance).toBeDefined();
    expect(typeof ioInstance.on).toBe('function');
    expect(typeof ioInstance.emit).toBe('function');
  });

  test('2. Successful socket connection with valid auth token', (done) => {
    const clientSocket = Client(`http://localhost:${serverPort}`, {
      auth: { token: dmToken },
      transports: ['websocket', 'polling'],
    });

    clientSocket.on('connect', () => {
      expect(clientSocket.connected).toBe(true);
      clientSocket.disconnect();
      done();
    });

    clientSocket.on('connect_error', (err) => {
      done(err);
    });
  });

  test('3. Rejects socket connection when no token is provided', (done) => {
    const clientSocket = Client(`http://localhost:${serverPort}`, {
      transports: ['websocket', 'polling'],
      reconnection: false,
    });

    clientSocket.on('connect', () => {
      clientSocket.disconnect();
      done(new Error('Should not have connected without token'));
    });

    clientSocket.on('connect_error', (err) => {
      expect(err.message).toMatch(/Authentication error: No token provided/);
      clientSocket.disconnect();
      done();
    });
  });

  // ── 2. Delivery Eligibility & Pending Orders Tests ────────────────────────

  test('4. checkPendingDeliveries correctly counts eligible pending orders for today', async () => {
    const pendingCount = await checkPendingDeliveries(testDm._id);
    expect(pendingCount).toBeGreaterThan(0);

    const nonExistentDmId = new mongoose.Types.ObjectId().toString();
    const zeroCount = await checkPendingDeliveries(nonExistentDmId);
    expect(zeroCount).toBe(0);
  });

  test('5. isValidCoordinates helper validates coordinate boundaries correctly', () => {
    expect(isValidCoordinates(12.9716, 77.5946)).toBe(true);
    expect(isValidCoordinates(-90, 180)).toBe(true);
    expect(isValidCoordinates(90, -180)).toBe(true);
    expect(isValidCoordinates(0, 0)).toBe(true);

    // Invalid coordinates
    expect(isValidCoordinates(91, 77)).toBe(false);
    expect(isValidCoordinates(-91, 77)).toBe(false);
    expect(isValidCoordinates(12, 181)).toBe(false);
    expect(isValidCoordinates(12, -181)).toBe(false);
    expect(isValidCoordinates('12.9', '77.5')).toBe(false);
    expect(isValidCoordinates(NaN, 77)).toBe(false);
    expect(isValidCoordinates(12, Infinity)).toBe(false);
  });

  // ── 3. Start Delivering Session Tests ─────────────────────────────────────

  test('6. DM with pending orders successfully starts delivery session', (done) => {
    const dmSocket = Client(`http://localhost:${serverPort}`, {
      auth: { token: dmToken },
      transports: ['websocket'],
    });

    dmSocket.on('connect', () => {
      dmSocket.emit('delivery:session:start', (res) => {
        try {
          expect(res.success).toBe(true);
          expect(res.message).toBe('Delivery session started successfully');
          expect(res.session).toBeDefined();
          expect(res.session.dmId).toBe(testDm._id.toString());
          expect(res.session.name).toBe(testDm.name);
          expect(res.pendingCount).toBeGreaterThan(0);

          // Verify session is active in server store
          const active = getSession(testDm._id.toString());
          expect(active).toBeDefined();
          expect(active.socketId).toBe(dmSocket.id);

          dmSocket.disconnect();
          done();
        } catch (err) {
          dmSocket.disconnect();
          done(err);
        }
      });
    });
  });

  test('7. Customer role is rejected when attempting to start delivery session', (done) => {
    const customerSocket = Client(`http://localhost:${serverPort}`, {
      auth: { token: customerToken },
      transports: ['websocket'],
    });

    customerSocket.on('connect', () => {
      customerSocket.emit('delivery:session:start', (res) => {
        try {
          expect(res.success).toBe(false);
          expect(res.message).toMatch(/Access denied/);
          customerSocket.disconnect();
          done();
        } catch (err) {
          customerSocket.disconnect();
          done(err);
        }
      });
    });
  });

  test('8. DM with 0 pending orders is rejected from starting a session', async () => {
    // Create a temporary DM with no orders
    const emptyDm = await User.create({
      name: 'Empty DM',
      mobile: `+91${Date.now().toString().slice(-10)}`,
      password: 'Password@123',
      role: 'dm',
    });

    const emptyDmToken = jwt.sign(
      { _id: emptyDm._id, mobile: emptyDm.mobile, role: emptyDm.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const emptyDmSocket = Client(`http://localhost:${serverPort}`, {
      auth: { token: emptyDmToken },
      transports: ['websocket'],
    });

    await new Promise((resolve, reject) => {
      emptyDmSocket.on('connect', () => {
        emptyDmSocket.emit('delivery:session:start', (res) => {
          try {
            expect(res.success).toBe(false);
            expect(res.message).toMatch(/No eligible pending orders/);
            emptyDmSocket.disconnect();
            resolve();
          } catch (err) {
            emptyDmSocket.disconnect();
            reject(err);
          }
        });
      });
    });

    await User.deleteOne({ _id: emptyDm._id });
  });

  // ── 4. Live GPS Updates & Privacy Scoping Tests ───────────────────────────

  test('9. Location update is validated and broadcasted strictly to role:owner', (done) => {
    const ownerSocket = Client(`http://localhost:${serverPort}`, {
      auth: { token: ownerToken },
      transports: ['websocket'],
    });

    const dmSocket = Client(`http://localhost:${serverPort}`, {
      auth: { token: dmToken },
      transports: ['websocket'],
    });

    const customerSocket = Client(`http://localhost:${serverPort}`, {
      auth: { token: customerToken },
      transports: ['websocket'],
    });

    let customerReceived = false;
    customerSocket.on('delivery:location:broadcast', () => {
      customerReceived = true;
    });

    ownerSocket.on('connect', () => {
      dmSocket.on('connect', () => {
        // Step 1: DM starts session
        dmSocket.emit('delivery:session:start', (startRes) => {
          expect(startRes.success).toBe(true);

          // Step 2: Set up owner listener for broadcast
          ownerSocket.on('delivery:location:broadcast', (payload) => {
            try {
              expect(payload.dmId).toBe(testDm._id.toString());
              expect(payload.coords.latitude).toBe(12.9716);
              expect(payload.coords.longitude).toBe(77.5946);
              expect(payload.coords.accuracy).toBe(10);
              expect(payload.timestamp).toBeDefined();

              // Verify customer did NOT receive the private broadcast
              expect(customerReceived).toBe(false);

              ownerSocket.disconnect();
              dmSocket.disconnect();
              customerSocket.disconnect();
              done();
            } catch (err) {
              ownerSocket.disconnect();
              dmSocket.disconnect();
              customerSocket.disconnect();
              done(err);
            }
          });

          // Step 3: DM transmits valid location
          dmSocket.emit(
            'delivery:location:update',
            { latitude: 12.9716, longitude: 77.5946, accuracy: 10 },
            (updateRes) => {
              expect(updateRes.success).toBe(true);
            }
          );
        });
      });
    });
  });

  test('10. Invalid coordinates are rejected with descriptive error', (done) => {
    const dmSocket = Client(`http://localhost:${serverPort}`, {
      auth: { token: dmToken },
      transports: ['websocket'],
    });

    dmSocket.on('connect', () => {
      dmSocket.emit('delivery:session:start', () => {
        dmSocket.emit(
          'delivery:location:update',
          { latitude: 120.5, longitude: 77.5946 }, // latitude > 90 invalid!
          (res) => {
            try {
              expect(res.success).toBe(false);
              expect(res.message).toMatch(/Invalid GPS coordinates/);
              dmSocket.disconnect();
              done();
            } catch (err) {
              dmSocket.disconnect();
              done(err);
            }
          }
        );
      });
    });
  });

  test('11. Location update without an active session is rejected', (done) => {
    const dmSocket = Client(`http://localhost:${serverPort}`, {
      auth: { token: dmToken },
      transports: ['websocket'],
    });

    dmSocket.on('connect', () => {
      dmSocket.emit(
        'delivery:location:update',
        { latitude: 12.9716, longitude: 77.5946 },
        (res) => {
          try {
            expect(res.success).toBe(false);
            expect(res.message).toMatch(/No active delivery session found/);
            dmSocket.disconnect();
            done();
          } catch (err) {
            dmSocket.disconnect();
            done(err);
          }
        }
      );
    });
  });

  // ── 5. Stop Session & Disconnection Tests ─────────────────────────────────

  test('12. Stopping session notifies owner and removes DM from active sessions', (done) => {
    const ownerSocket = Client(`http://localhost:${serverPort}`, {
      auth: { token: ownerToken },
      transports: ['websocket'],
    });

    const dmSocket = Client(`http://localhost:${serverPort}`, {
      auth: { token: dmToken },
      transports: ['websocket'],
    });

    ownerSocket.on('connect', () => {
      dmSocket.on('connect', () => {
        dmSocket.emit('delivery:session:start', () => {
          expect(getSession(testDm._id.toString())).toBeDefined();

          ownerSocket.on('delivery:dm:inactive', (payload) => {
            try {
              expect(payload.dmId).toBe(testDm._id.toString());
              expect(payload.reason).toBe('stopped');
              expect(getSession(testDm._id.toString())).toBeNull();

              ownerSocket.disconnect();
              dmSocket.disconnect();
              done();
            } catch (err) {
              ownerSocket.disconnect();
              dmSocket.disconnect();
              done(err);
            }
          });

          dmSocket.emit('delivery:session:stop', (stopRes) => {
            expect(stopRes.success).toBe(true);
          });
        });
      });
    });
  });

  test('13. Disconnecting DM terminates session and notifies owner', (done) => {
    const ownerSocket = Client(`http://localhost:${serverPort}`, {
      auth: { token: ownerToken },
      transports: ['websocket'],
    });

    const dmSocket = Client(`http://localhost:${serverPort}`, {
      auth: { token: dmToken },
      transports: ['websocket'],
    });

    ownerSocket.on('connect', () => {
      dmSocket.on('connect', () => {
        dmSocket.emit('delivery:session:start', () => {
          expect(getSession(testDm._id.toString())).toBeDefined();

          ownerSocket.on('delivery:dm:inactive', (payload) => {
            try {
              expect(payload.dmId).toBe(testDm._id.toString());
              expect(payload.reason).toBe('disconnected');
              expect(getSession(testDm._id.toString())).toBeNull();

              ownerSocket.disconnect();
              done();
            } catch (err) {
              ownerSocket.disconnect();
              done(err);
            }
          });

          // Disconnect DM socket abruptly
          dmSocket.disconnect();
        });
      });
    });
  });
});
