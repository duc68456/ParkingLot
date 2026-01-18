const mongoose = require('mongoose');
const EntrySession = require('./models/entrySession');
require('dotenv').config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const sessions = await EntrySession.find({ Status: 'EXITED' })
      .sort({ ExitTime: -1 })
      .limit(5)
      .select('ID LicensePlate ProcessedExitBy ExitTime Status')
      .lean();

    console.log('--- Last 5 Exited Sessions ---');
    if (sessions.length === 0) {
      console.log('No exited sessions found.');
    }
    sessions.forEach(s => {
      console.log(`Session: ${s.ID}`);
      console.log(`  Plate: ${s.LicensePlate}`);
      console.log(`  Status: ${s.Status}`);
      console.log(`  ProcessedExitBy: '${s.ProcessedExitBy}'`); // Quote to see empty strings/spaces
      console.log(`  ExitTime: ${s.ExitTime}`);
      console.log('------------------------------');
    });

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.disconnect();
  }
};

run();
