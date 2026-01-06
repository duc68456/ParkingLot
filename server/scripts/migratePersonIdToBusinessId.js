/*
  Migration: Customer.PersonID / Employee.PersonID
  - Old: ObjectId (Person._id) stored as string/ObjectId
  - New: business ID string: PER#### (Person.ID)

  This script:
  1) Finds Customer/Employee docs where PersonID is not PER####
  2) Treats PersonID as a Person._id, looks up Person
  3) Updates PersonID to Person.ID

  Safe to run multiple times (idempotent).

  Usage:
    node server/scripts/migratePersonIdToBusinessId.js

  Requires:
    - MONGODB_URI in environment (same as server)
*/

const mongoose = require('mongoose');
const config = require('../utils/config');

// Ensure models are registered
require('../models/person');
const Customer = require('../models/customer');
const Employee = require('../models/employee');
const Person = require('../models/person');

const isPerBusinessId = (value) => /^PER\d{4}$/i.test(String(value || ''));

async function migrateCollection(Model, label) {
  const cursor = Model.find({
    $or: [
      { PersonID: { $exists: false } },
      { PersonID: null },
      { PersonID: '' },
      { PersonID: { $not: /^PER\d{4}$/i } }
    ]
  }).cursor();

  let scanned = 0;
  let updated = 0;
  let skipped = 0;
  let missingPerson = 0;
  let failed = 0;

  for await (const doc of cursor) {
    scanned += 1;

    const raw = doc.PersonID;
    if (!raw) {
      skipped += 1;
      continue;
    }

    if (isPerBusinessId(raw)) {
      skipped += 1;
      continue;
    }

    // Try treat as ObjectId
    const rawStr = String(raw);
    if (!mongoose.isValidObjectId(rawStr)) {
      // Not PER#### and not ObjectId => can't auto-migrate.
      skipped += 1;
      continue;
    }

    try {
      const person = await Person.findById(rawStr).select('ID').lean();
      if (!person?.ID) {
        missingPerson += 1;
        continue;
      }

      doc.PersonID = person.ID;
      await doc.save();
      updated += 1;
    } catch (e) {
      failed += 1;
      // eslint-disable-next-line no-console
      console.error(`[${label}] Failed updating ${doc._id}:`, e.message);
    }
  }

  return { scanned, updated, skipped, missingPerson, failed };
}

async function main() {
  if (!config.MONGODB_URI) {
    throw new Error('Missing MONGODB_URI in environment/config');
  }

  await mongoose.connect(config.MONGODB_URI);

  // eslint-disable-next-line no-console
  console.log('Connected. Starting migration...');

  const customers = await migrateCollection(Customer, 'Customer');
  const employees = await migrateCollection(Employee, 'Employee');

  // eslint-disable-next-line no-console
  console.log('Migration complete.');
  // eslint-disable-next-line no-console
  console.log({ customers, employees });

  await mongoose.disconnect();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Migration failed:', err);
  process.exit(1);
});
