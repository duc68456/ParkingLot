const mongoose = require('mongoose');
const EntrySession = require('./models/entrySession');
const fs = require('fs');
require('dotenv').config();

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);

    const sessions = await EntrySession.find({ Status: 'EXITED' })
      .sort({ ExitTime: -1 })
      .limit(5)
      .select('ID LicensePlate ProcessedExitBy ExitTime Status')
      .lean();

    let output = '--- Last 5 Exited Sessions ---\n';
    if (sessions.length === 0) {
      output += 'No exited sessions found.\n';
    }
    sessions.forEach(s => {
      output += `Session: ${s.ID}\n`;
      output += `  Plate: ${s.LicensePlate}\n`;
      output += `  Status: ${s.Status}\n`;
      output += `  ProcessedExitBy: '${s.ProcessedExitBy}'\n`;
      output += `  ExitTime: ${s.ExitTime}\n`;
      output += '------------------------------\n';
    });

    fs.writeFileSync('db_result.txt', output);
    console.log('Done writing to db_result.txt');

  } catch (err) {
    console.error('Error:', err);
    fs.writeFileSync('db_result.txt', 'Error: ' + err.message);
  } finally {
    await mongoose.disconnect();
  }
};

run();
