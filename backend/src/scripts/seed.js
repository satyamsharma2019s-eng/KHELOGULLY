'use strict';
/**
 * seed.js — Seeds admin + scout accounts into MongoDB.
 *
 * Run: node src/scripts/seed.js
 *
 * Creates:
 *  - 1 admin account
 *  - 2 scout accounts
 *
 * Safe to run multiple times — skips existing accounts.
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Validate env early
const env = require('../config/env');
const logger = require('../utils/logger');

const SEED_ACCOUNTS = [
  {
    name: 'KheloGully Admin',
    phone: '+919999000001',
    password: 'Admin@KheloGully2024!',
    role: 'admin',
    schoolOrRegion: null,
  },
  {
    name: 'Scout Ravi Kumar',
    phone: '+919999000002',
    password: 'Scout@KheloGully2024!',
    role: 'scout',
    schoolOrRegion: 'Delhi Public School, Rohini',
  },
  {
    name: 'Scout Priya Sharma',
    phone: '+919999000003',
    password: 'Scout@KheloGully2024!',
    role: 'scout',
    schoolOrRegion: 'Government School, Saket',
  },
  {
    name: 'Teacher Anita Verma',
    phone: '+919888000001',
    password: 'Teacher@KheloGully2024!',
    role: 'teacher',
    schoolOrRegion: 'Delhi Public School, Rohini',
  },
  {
    name: 'Student Arjun Singh',
    phone: '+919888000002',
    password: 'Student@KheloGully2024!',
    role: 'student',
    schoolOrRegion: 'Delhi Public School, Rohini',
    // Student extras — used only for athlete profile creation
    age: 14,
    gender: 'male',
    village: 'Rohini Sector 7',
    district: 'North West Delhi',
  },
];

async function seed() {
  console.log('\n🌱 KheloGully Seed Script\n');

  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Lazy-require models after connection
    const User = require('../modules/users/user.model');
    const Athlete = require('../modules/athletes/athlete.model');
    const Enrollment = require('../modules/enrollments/enrollment.model');

    for (const account of SEED_ACCOUNTS) {
      const existing = await User.findOne({ phone: account.phone });

      if (existing) {
        console.log(`⏭  Skipped ${account.role.padEnd(7)} — ${account.phone} (already exists)`);
        continue;
      }

      const passwordHash = await bcrypt.hash(account.password, 12);

      if (account.role === 'student') {
        // Create user
        const user = await User.create({
          name: account.name,
          phone: account.phone,
          role: 'student',
          passwordHash,
          schoolOrRegion: account.schoolOrRegion,
        });

        // Create linked athlete profile
        const athlete = await Athlete.create({
          name: account.name,
          age: account.age,
          gender: account.gender,
          village: account.village || null,
          district: account.district || null,
          registeredBy: user._id,
          schoolOrRegion: account.schoolOrRegion,
          userId: user._id,
        });

        // Link back
        await User.findByIdAndUpdate(user._id, { studentProfileId: athlete._id });

        // Auto-enroll
        if (account.schoolOrRegion) {
          await Enrollment.create({
            studentId: user._id,
            athleteId: athlete._id,
            schoolOrRegion: account.schoolOrRegion,
            status: 'active',
          });
        }

        console.log(`✅ Created student  — ${account.phone} (${account.name}) + athlete profile`);
      } else {
        await User.create({
          name: account.name,
          phone: account.phone,
          role: account.role,
          passwordHash,
          schoolOrRegion: account.schoolOrRegion,
        });

        console.log(`✅ Created ${account.role.padEnd(7)} — ${account.phone} (${account.name})`);
      }
    }

    console.log('\n📋 Login credentials (change passwords before demo!):\n');
    SEED_ACCOUNTS.forEach((a) => {
      console.log(`  ${a.role.padEnd(6)} | phone: ${a.phone} | password: ${a.password}`);
    });
    console.log('');
  } catch (err) {
    console.error('\n❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 DB connection closed\n');
  }
}

seed();
