import 'dotenv/config';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

import app from '../app.js';
import User from '../models/userModels.js';
import Product from '../models/productModels.js';
import Dispatch from '../models/dispatchModels.js';
import DeliveryEntry from '../models/deliveryEntryModels.js';
import Payment from '../models/paymentModels.js';
import { getKolkataDateString } from '../utils/deliveryDay.js';

const cookie = (user) => [`token=${jwt.sign({ _id: user._id, role: user.role }, process.env.JWT_SECRET)}`];

describe('Billing for owner, delivery partner and customer', () => {
  let ownerA, ownerB, dmA, dmOther, customerA, customerB, product, dispatch;
  const userIds = [];
  let month, year;

  const mk = async (data, i) => {
    const u = await User.create({
      password: 'Password@123',
      mobile: `+9${(Date.now() + i).toString().slice(-11)}`,
      ...data,
    });
    userIds.push(u._id);
    return u;
  };

  beforeAll(async () => {
    if (!process.env.MONGO_URI) throw new Error('MONGO_URI is required.');
    if (mongoose.connection.readyState === 0) await mongoose.connect(process.env.MONGO_URI);

    const today = getKolkataDateString();
    [year, month] = today.split('-').map(Number);
    const todayDate = new Date(`${today}T06:00:00.000+05:30`);

    ownerA = await mk({ name: 'Bill Owner A', role: 'owner' }, 11);
    ownerB = await mk({ name: 'Bill Owner B', role: 'owner' }, 12);
    dmA = await mk({ name: 'Bill DM A', role: 'dm', businessId: ownerA._id }, 13);
    dmOther = await mk({ name: 'Bill DM Other', role: 'dm', businessId: ownerA._id }, 14);
    customerA = await mk({ name: 'Bill Cust A', role: 'customer', businessId: ownerA._id, assignedDm: dmA._id }, 15);
    customerB = await mk({ name: 'Bill Cust B', role: 'customer', businessId: ownerB._id }, 16);

    product = await Product.create({ name: 'Billing Test Milk', price: 60, unit: 'L', image: 'x' });

    dispatch = await Dispatch.create({
      owner: ownerA._id,
      businessId: ownerA._id,
      date: todayDate,
      deliveries: [{ dm: dmA._id, allocations: [], status: 'assigned' }],
    });

    await DeliveryEntry.create([
      // delivered with snapshot price 50 → 2 × 50 = 100
      { dispatch: dispatch._id, businessId: ownerA._id, date: todayDate, customer: customerA._id, dm: dmA._id,
        products: [{ product: product._id, quantity: 2, price: 50 }], status: 'delivered', deliveredAt: todayDate },
      // delivered without snapshot → falls back to product price 60 × 1 = 60
      { dispatch: dispatch._id, businessId: ownerA._id, date: todayDate, customer: customerA._id, dm: dmA._id,
        products: [{ product: product._id, quantity: 1 }], status: 'delivered', deliveredAt: todayDate },
      // skipped → not billed
      { dispatch: dispatch._id, businessId: ownerA._id, date: todayDate, customer: customerA._id, dm: dmA._id,
        products: [{ product: product._id, quantity: 5, price: 50 }], status: 'skipped' },
    ]);
  });

  afterAll(async () => {
    await Payment.deleteMany({ customer: { $in: userIds } });
    await DeliveryEntry.deleteMany({ customer: { $in: userIds } });
    if (dispatch) await Dispatch.deleteOne({ _id: dispatch._id });
    if (product) await Product.deleteOne({ _id: product._id });
    await User.deleteMany({ _id: { $in: userIds } });
    await mongoose.disconnect();
  });

  test('customer statement bills only delivered stops using snapshot or current price', async () => {
    const res = await request(app)
      .get('/api/billing/customer/statement')
      .query({ month, year })
      .set('Cookie', cookie(customerA));

    expect(res.status).toBe(200);
    const { summary, items } = res.body.data;
    expect(summary.charges).toBe(160);
    expect(summary.delivered).toBe(2);
    expect(summary.skipped).toBe(1);
    expect(summary.outstanding).toBe(160);
    expect(items.find((i) => i.status === 'skipped').amount).toBe(0);
  });

  test('DM records a doorstep payment for an assigned customer only', async () => {
    const ok = await request(app)
      .post('/api/billing/dm/payments')
      .set('Cookie', cookie(dmA))
      .send({ customerId: customerA._id, amount: 100, method: 'cash' });
    expect(ok.status).toBe(201);
    expect(ok.body.data.payment.status).toBe('collected');
    expect(ok.body.data.balance.outstanding).toBe(60);

    const forbidden = await request(app)
      .post('/api/billing/dm/payments')
      .set('Cookie', cookie(dmOther))
      .send({ customerId: customerA._id, amount: 10, method: 'cash' });
    expect(forbidden.status).toBe(403);

    const invalid = await request(app)
      .post('/api/billing/dm/payments')
      .set('Cookie', cookie(dmA))
      .send({ customerId: customerA._id, amount: -5, method: 'card' });
    expect(invalid.status).toBe(400);
  });

  test('DM collections summary shows today totals and pending handover', async () => {
    const res = await request(app).get('/api/billing/dm/collections').set('Cookie', cookie(dmA));
    expect(res.status).toBe(200);
    expect(res.body.data.totals.cash).toBe(100);
    expect(res.body.data.pendingHandover.total).toBe(100);

    const list = await request(app).get('/api/billing/dm/customers').set('Cookie', cookie(dmA));
    expect(list.body.data.customers.find((c) => c._id === customerA._id.toString()).outstanding).toBe(60);
  });

  test('owner overview, settlement and direct payment', async () => {
    const overview = await request(app)
      .get('/api/billing/owner/overview')
      .query({ month, year })
      .set('Cookie', cookie(ownerA));
    expect(overview.status).toBe(200);
    const row = overview.body.data.customers.find((c) => c._id === customerA._id.toString());
    expect(row.charges).toBe(160);
    expect(row.paid).toBe(100);
    expect(row.outstanding).toBe(60);
    expect(overview.body.data.customers.some((c) => c._id === customerB._id.toString())).toBe(false);

    const pending = await request(app).get('/api/billing/owner/collections').set('Cookie', cookie(ownerA));
    const dmGroup = pending.body.data.dms.find((g) => g.dm._id === dmA._id.toString());
    expect(dmGroup.cash).toBe(100);

    const settle = await request(app)
      .post('/api/billing/owner/collections/settle')
      .set('Cookie', cookie(ownerA))
      .send({ dmId: dmA._id });
    expect(settle.status).toBe(200);
    expect(settle.body.data.settledCount).toBe(1);

    const direct = await request(app)
      .post('/api/billing/owner/payments')
      .set('Cookie', cookie(ownerA))
      .send({ customerId: customerA._id, amount: 60, method: 'upi' });
    expect(direct.status).toBe(201);
    expect(direct.body.data.balance.outstanding).toBe(0);
  });

  test('owner can void a payment and cannot touch another business', async () => {
    const pay = await Payment.findOne({ customer: customerA._id, method: 'upi' });
    const voided = await request(app)
      .patch(`/api/billing/owner/payments/${pay._id}/void`)
      .set('Cookie', cookie(ownerA))
      .send({ reason: 'duplicate' });
    expect(voided.status).toBe(200);

    const me = await request(app).get('/api/billing/customer/payments').set('Cookie', cookie(customerA));
    expect(me.body.data.balance.outstanding).toBe(60);

    const cross = await request(app)
      .get(`/api/billing/owner/customers/${customerA._id}/statement`)
      .set('Cookie', cookie(ownerB));
    expect(cross.status).toBe(404);

    const roleCheck = await request(app).get('/api/billing/owner/overview').set('Cookie', cookie(customerA));
    expect(roleCheck.status).toBe(403);
  });
});
