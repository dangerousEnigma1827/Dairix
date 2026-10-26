import 'dotenv/config';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

import app from '../app.js';
import User from '../models/userModels.js';

describe('Customer Location Updates API (PUT /api/customers/location)', () => {
  let customerUser;
  let ownerUser;
  let customerToken;
  let ownerToken;
  const createdUserIds = [];

  beforeAll(async () => {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is required.');
    }
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

    customerUser = await User.create({
      name: 'Location Test Customer',
      mobile: `+91${Date.now().toString().slice(-10)}`,
      password: 'Password@123',
      role: 'customer',
      address: {
        houseNo: '10',
        street: 'Main Street',
        city: 'Bengaluru',
      },
    });
    createdUserIds.push(customerUser._id);

    ownerUser = await User.create({
      name: 'Location Test Owner',
      mobile: `+91${(Date.now() + 1).toString().slice(-10)}`,
      password: 'Password@123',
      role: 'owner',
    });
    createdUserIds.push(ownerUser._id);

    customerToken = jwt.sign(
      { _id: customerUser._id, role: customerUser.role },
      process.env.JWT_SECRET
    );
    ownerToken = jwt.sign(
      { _id: ownerUser._id, role: ownerUser.role },
      process.env.JWT_SECRET
    );
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  test('1. Rejects unauthenticated and non-customer requests', async () => {
    // Unauthenticated
    await request(app)
      .put('/api/customers/location')
      .send({ latitude: 12.9716, longitude: 77.5946 })
      .expect(401);

    // Owner role (requires customer role)
    await request(app)
      .put('/api/customers/location')
      .set('Cookie', [`token=${ownerToken}`])
      .send({ latitude: 12.9716, longitude: 77.5946 })
      .expect(403);
  });

  test('2. Rejects invalid coordinates with 400', async () => {
    // Latitude out of bounds
    const res1 = await request(app)
      .put('/api/customers/location')
      .set('Cookie', [`token=${customerToken}`])
      .send({ latitude: 95.0, longitude: 77.5946 })
      .expect(400);
    expect(res1.body.message).toMatch(/valid latitude/i);

    // Longitude out of bounds
    const res2 = await request(app)
      .put('/api/customers/location')
      .set('Cookie', [`token=${customerToken}`])
      .send({ latitude: 12.9716, longitude: 200.0 })
      .expect(400);
    expect(res2.body.message).toMatch(/valid latitude/i);

    // Missing coordinates
    const res3 = await request(app)
      .put('/api/customers/location')
      .set('Cookie', [`token=${customerToken}`])
      .send({ latitude: null, longitude: null })
      .expect(400);
    expect(res3.body.message).toMatch(/valid latitude/i);

    // Non-numeric string coordinates
    const res4 = await request(app)
      .put('/api/customers/location')
      .set('Cookie', [`token=${customerToken}`])
      .send({ latitude: 'abc', longitude: 'xyz' })
      .expect(400);
    expect(res4.body.message).toMatch(/valid latitude/i);
  });

  test('3. Successfully updates coordinates and persists in user profile', async () => {
    const validLat = 12.9344;
    const validLng = 77.6256;

    const res = await request(app)
      .put('/api/customers/location')
      .set('Cookie', [`token=${customerToken}`])
      .send({
        latitude: validLat,
        longitude: validLng,
        address: {
          houseNo: 'Suite 404',
          street: 'Indiranagar 100ft',
          city: 'Bengaluru',
          pincode: '560038',
        },
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.coordinates).toEqual({ latitude: validLat, longitude: validLng });
    expect(res.body.data.address.houseNo).toBe('Suite 404');
    expect(res.body.data.address.latitude).toBe(validLat);
    expect(res.body.data.address.longitude).toBe(validLng);

    // Verify in database
    const updatedInDb = await User.findById(customerUser._id);
    expect(updatedInDb.address.latitude).toBe(validLat);
    expect(updatedInDb.address.longitude).toBe(validLng);
    expect(updatedInDb.location.latitude).toBe(validLat);
    expect(updatedInDb.location.longitude).toBe(validLng);
  });
});
