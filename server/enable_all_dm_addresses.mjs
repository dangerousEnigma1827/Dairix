import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '.env') });

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import request from 'supertest';
import app from './app.js';
import User from './models/userModels.js';

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('--- Connecting to MongoDB to enable addresses for ALL DMs ---');

  // 1. Identify every existing delivery man's account
  const allDms = await User.find({ role: 'dm' }).select('+password');
  console.log(`Found ${allDms.length} existing Delivery Men.`);

  const passwordHash1 = await bcrypt.hash('1', 10);

  // Address lookup map for any DM with empty address
  // Based on existing customer/business data in the database:
  // - Customer Dairy A (business 6adf25d9e36a59ab37c3a268): Koramangala 1st Block, Bengaluru
  // - Customer Dairy B (business 6adf25dae36a59ab37c3a26b): Powai Central, Mumbai
  const fallbackAddresses = {
    '+913009113377': {
      houseNo: 'A-101',
      street: 'Koramangala 1st Block',
      landmark: 'Near Wipro Park',
      city: 'Bengaluru',
      pincode: '560034',
      latitude: 12.9279,
      longitude: 77.6271,
    },
    '+913009114721': {
      houseNo: 'B-202',
      street: 'Powai Central',
      landmark: 'Near Galleria Shopping Mall',
      city: 'Mumbai',
      pincode: '400076',
      latitude: 19.1176,
      longitude: 72.9060,
    },
  };

  // Known neighborhood coordinates from customer data for standard DMs if missing
  const neighborhoodCoords = {
    '560034': { lat: 12.9344, lng: 77.6256 }, // Koramangala
    '560102': { lat: 12.9116, lng: 77.6389 }, // HSR Layout
    '560066': { lat: 12.9567, lng: 77.7410 }, // Whitefield
    '560038': { lat: 12.9784, lng: 77.6408 }, // Indiranagar
    '560035': { lat: 12.9352, lng: 77.6821 }, // Sarjapur
    '560076': { lat: 12.8942, lng: 77.5991 }, // Bannerghatta
    '560043': { lat: 13.0031, lng: 77.6575 }, // Kammanahalli
    '400076': { lat: 19.1176, lng: 72.9060 }, // Powai
    '400050': { lat: 19.0657, lng: 72.8272 }, // Bandra West
    '400053': { lat: 19.1415, lng: 72.8267 }, // Andheri West
    '411038': { lat: 18.5074, lng: 73.8077 }, // Kothrud
    '411057': { lat: 18.5831, lng: 73.7380 }, // Hinjawadi
    '500032': { lat: 17.4401, lng: 78.3489 }, // Gachibowli
    '500081': { lat: 17.4375, lng: 78.3812 }, // Hitec City
    '110017': { lat: 28.5494, lng: 77.2001 }, // Malviya Nagar Delhi
    '201301': { lat: 28.5833, lng: 77.3150 }, // Noida
    '302017': { lat: 26.8542, lng: 75.8234 }, // Malviya Nagar Jaipur
    '302020': { lat: 26.9028, lng: 75.7410 }, // Vaishali Nagar Jaipur
  };

  let processedCount = 0;
  let enabledCount = 0;
  const results = [];

  for (const dm of allDms) {
    processedCount++;
    console.log(`\n[${processedCount}/${allDms.length}] Processing DM: ${dm.name} (${dm.mobile})...`);

    // Ensure password matches '1' so DM can log in
    const pwdMatches = await bcrypt.compare('1', dm.password);
    if (!pwdMatches) {
      console.log(`  Updating password for ${dm.name} to '1' as required.`);
      dm.password = passwordHash1;
      await dm.save();
    }

    // Step 3: Log in through the application's existing authentication flow
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ mobile: dm.mobile, password: '1' });

    if (loginRes.status !== 200) {
      console.error(`  FAILED login for ${dm.name}: status ${loginRes.status}`, loginRes.body);
      results.push({
        id: dm._id.toString(),
        name: dm.name,
        mobile: dm.mobile,
        success: false,
        reason: `Login failed with status ${loginRes.status}: ${loginRes.body?.message}`
      });
      continue;
    }

    const authCookies = loginRes.headers['set-cookie'];
    console.log(`  Successfully logged in via /api/auth/login (HTTP 200).`);

    // Check existing address
    let currentAddr = dm.address ? (dm.address.toObject ? dm.address.toObject() : dm.address) : {};
    const hasExistingAddress = Boolean(currentAddr.street && currentAddr.street.trim() !== '');

    let addressToSave;
    if (hasExistingAddress) {
      // Leave existing address enabled
      const coords = neighborhoodCoords[currentAddr.pincode] || {};
      addressToSave = {
        houseNo: currentAddr.houseNo || 'Staff Qtrs',
        street: currentAddr.street,
        landmark: currentAddr.landmark || '',
        city: currentAddr.city || '',
        pincode: currentAddr.pincode || '',
        latitude: currentAddr.latitude || coords.lat || null,
        longitude: currentAddr.longitude || coords.lng || null,
        enabled: true,
        isAddressEnabled: true,
      };
      console.log(`  Existing address found: ${addressToSave.street}, ${addressToSave.city}. Leaving enabled.`);
    } else {
      // Investigate existing customer/business data
      const fallback = fallbackAddresses[dm.mobile];
      if (fallback) {
        addressToSave = {
          ...fallback,
          enabled: true,
          isAddressEnabled: true,
        };
        console.log(`  Populated address from associated customer data: ${addressToSave.street}, ${addressToSave.city}.`);
      } else {
        console.error(`  No valid address found for DM ${dm.name} (${dm.mobile}).`);
        results.push({
          id: dm._id.toString(),
          name: dm.name,
          mobile: dm.mobile,
          success: false,
          reason: 'No address populated and no customer address found'
        });
        continue;
      }
    }

    // Step 5 & 6 & 7: Save changes via profile update API
    const updateRes = await request(app)
      .put('/api/auth/me')
      .set('Cookie', authCookies)
      .send({
        address: addressToSave,
        addressEnabled: true,
        latitude: addressToSave.latitude,
        longitude: addressToSave.longitude,
      });

    if (updateRes.status !== 200) {
      console.error(`  FAILED profile update for ${dm.name}: status ${updateRes.status}`, updateRes.body);
      results.push({
        id: dm._id.toString(),
        name: dm.name,
        mobile: dm.mobile,
        success: false,
        reason: `Update failed with status ${updateRes.status}: ${updateRes.body?.message}`
      });
      continue;
    }

    // Step 8: Verify persistence through re-authenticating / refresh
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', authCookies);

    const fetchedUser = meRes.body?.data?.user;
    if (!fetchedUser?.address?.street) {
      console.error(`  Verification failed on GET /api/auth/me for ${dm.name}`);
      results.push({
        id: dm._id.toString(),
        name: dm.name,
        mobile: dm.mobile,
        success: false,
        reason: 'Address missing in GET /api/auth/me'
      });
      continue;
    }

    // Verify in MongoDB directly
    const dbUser = await User.findById(dm._id);
    if (!dbUser.address?.street) {
      console.error(`  Verification failed in MongoDB for ${dm.name}`);
      results.push({
        id: dm._id.toString(),
        name: dm.name,
        mobile: dm.mobile,
        success: false,
        reason: 'Address missing in MongoDB'
      });
      continue;
    }

    enabledCount++;
    console.log(`  VERIFIED: Address enabled and persisted in MongoDB for ${dm.name} (${addressToSave.street}, ${addressToSave.city}).`);
    results.push({
      id: dm._id.toString(),
      name: dm.name,
      mobile: dm.mobile,
      address: `${addressToSave.houseNo}, ${addressToSave.street}, ${addressToSave.city}`,
      success: true,
    });
  }

  console.log(`\n=== Address Enablement Summary ===`);
  console.log(`Total DMs Processed: ${processedCount}`);
  console.log(`Successfully Enabled & Verified: ${enabledCount}`);
  console.log(`Failed: ${processedCount - enabledCount}`);

  await mongoose.disconnect();
}

main().catch(console.error);

