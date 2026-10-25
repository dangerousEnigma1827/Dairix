import 'dotenv/config';
import http from 'http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { io as Client } from 'socket.io-client';
import app from '../app.js';
import User from '../models/userModels.js';
import { initSocket, getIO } from '../config/socket.js';

describe('Socket.IO Integration & Authentication', () => {
  let httpServer;
  let serverPort;
  let testUser;
  let validToken;

  beforeAll(async () => {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is not defined.');
    }
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    // Find or create a test user
    testUser = await User.findOne({ role: 'dm' });
    if (!testUser) {
      testUser = await User.create({
        name: 'Socket Test DM',
        mobile: `+91${Date.now().toString().slice(-10)}`,
        password: 'Password@123',
        role: 'dm',
      });
    }

    validToken = jwt.sign(
      { _id: testUser._id, mobile: testUser.mobile, role: testUser.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    // Create a dedicated HTTP server for socket testing on an ephemeral port
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
    const io = getIO();
    await new Promise((resolve) => io.close(resolve));
    await new Promise((resolve) => httpServer.close(resolve));
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  });

  test('1. getIO returns the initialized Socket.IO instance', () => {
    const ioInstance = getIO();
    expect(ioInstance).toBeDefined();
    expect(typeof ioInstance.on).toBe('function');
    expect(typeof ioInstance.emit).toBe('function');
  });

  test('2. Successful connection with valid token in auth object', (done) => {
    const clientSocket = Client(`http://localhost:${serverPort}`, {
      auth: { token: validToken },
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

  test('3. Successful connection with valid token in Cookie header', (done) => {
    const clientSocket = Client(`http://localhost:${serverPort}`, {
      extraHeaders: {
        Cookie: `token=${validToken}`,
      },
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

  test('4. Successful connection with valid token in Authorization header', (done) => {
    const clientSocket = Client(`http://localhost:${serverPort}`, {
      extraHeaders: {
        Authorization: `Bearer ${validToken}`,
      },
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

  test('5. Rejects connection with error when no token is provided', (done) => {
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

  test('6. Rejects connection with error when invalid token is provided', (done) => {
    const clientSocket = Client(`http://localhost:${serverPort}`, {
      auth: { token: 'invalid.jwt.token' },
      transports: ['websocket', 'polling'],
      reconnection: false,
    });

    clientSocket.on('connect', () => {
      clientSocket.disconnect();
      done(new Error('Should not have connected with invalid token'));
    });

    clientSocket.on('connect_error', (err) => {
      expect(err.message).toMatch(/Authentication error: Invalid or expired token/);
      clientSocket.disconnect();
      done();
    });
  });
});
