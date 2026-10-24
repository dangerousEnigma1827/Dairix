import 'dotenv/config';
import request from 'supertest';
import bcrypt from 'bcrypt';
import mongoose from 'mongoose';

import app from '../app.js';
import User from '../models/userModels.js';

const TEST_PASSWORD = 'Password@123';
let testMobile;

beforeAll(async () => {
  if (!process.env.MONGO_URI) {
    throw new Error('MONGO_URI is not defined. Set it before running tests.');
  }

  await mongoose.connect(process.env.MONGO_URI);
  testMobile = `+91${Date.now().toString().slice(-10)}`;
});

afterEach(async () => {
  if (testMobile) {
    await User.deleteMany({ mobile: testMobile });
  }
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('POST /api/auth/login', () => {
  test('1. Correct mobile + correct password -> successful login', async () => {
    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);
    await User.create({
      name: 'Login Success User',
      mobile: testMobile,
      password: hashedPassword,
      role: 'customer',
      address: {
        houseNo: '12',
        street: 'Main Street',
        landmark: 'Near school',
        city: 'Test City',
        pincode: '123456',
      },
      deliveryNotes: 'Door delivery',
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ mobile: testMobile, password: TEST_PASSWORD })
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.message).toBe('User Logged In Successfully');
    expect(response.body.data.user.mobile).toBe(testMobile);
    expect(response.body.data.user.role).toBe('customer');
  });

  test('2. Correct mobile + wrong password -> 401', async () => {
    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);
    await User.create({
      name: 'Wrong Password User',
      mobile: testMobile,
      password: hashedPassword,
      role: 'customer',
      address: {
        houseNo: '13',
        street: 'Second Street',
        landmark: 'Near park',
        city: 'Test City',
        pincode: '654321',
      },
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ mobile: testMobile, password: 'WrongPassword!123' })
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Invalid mobile or password');
  });

  test('3. Non-existent mobile -> 401', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ mobile: '+919999999999', password: TEST_PASSWORD })
      .expect(401);

    expect(response.body.success).toBe(false);
    expect(response.body.message).toBe('Invalid mobile or password');
  });

  test('4. Successful login -> response sets the authentication cookie', async () => {
    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);
    await User.create({
      name: 'Cookie User',
      mobile: testMobile,
      password: hashedPassword,
      role: 'dm',
      address: {
        houseNo: '14',
        street: 'Third Street',
        landmark: 'Near market',
        city: 'Test City',
        pincode: '111111',
      },
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ mobile: testMobile, password: TEST_PASSWORD })
      .expect(200);

    expect(response.headers['set-cookie']).toBeDefined();
    const setCookieHeader = response.headers['set-cookie'];
    const cookieString = Array.isArray(setCookieHeader) ? setCookieHeader.join(';') : setCookieHeader;
    expect(cookieString).toContain('token=');
    expect(cookieString).toContain('HttpOnly');
  });

  test('5. Successful login -> response contains the expected user information', async () => {
    const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);
    await User.create({
      name: 'User Info User',
      mobile: testMobile,
      password: hashedPassword,
      role: 'owner',
      address: {
        houseNo: '15',
        street: 'Fourth Street',
        landmark: 'Near hospital',
        city: 'Test City',
        pincode: '222222',
      },
      deliveryNotes: 'Morning route',
    });

    const response = await request(app)
      .post('/api/auth/login')
      .send({ mobile: testMobile, password: TEST_PASSWORD })
      .expect(200);

    expect(response.body.data.user).toMatchObject({
      name: 'User Info User',
      mobile: testMobile,
      role: 'owner',
      deliveryNotes: 'Morning route',
    });
  });
});
