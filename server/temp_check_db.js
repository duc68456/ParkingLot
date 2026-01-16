require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('./models/customer');
// mongo URI from env or default
const mongoUrl = process.env.MONGODB_URI || 'mongodb://localhost:27017/parking-lot';

mongoose.connect(mongoUrl)
  .then(async () => {
    console.log('Connected to Mongo');
    const customers = await Customer.find({}).limit(5).lean();
    console.log('Customers found:', customers.length);
    customers.forEach(c => {
      console.log(`ID: ${c.ID}, RegisteredDay: ${c.RegisteredDay}`);
    });
    process.exit(0);
  })
  .catch(err => { console.error(err); process.exit(1); });
