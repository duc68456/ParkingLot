const mongoose = require('mongoose');
require('dotenv').config();

const SinglePricingRuleDetail = require('./models/singlePricingRuleDetail');
const SinglePricingRule = require('./models/singlePricingRule');

async function checkReasonField() {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/parking-lot';
    await mongoose.connect(mongoURI);
    console.log('Connected to MongoDB');

    const details = await SinglePricingRuleDetail.find({ Reason: { $ne: null } }).limit(5).lean();

    console.log(`Found ${details.length} SinglePricingRuleDetail documents with non-null Reason:`);

    details.forEach(doc => {
      console.log('------------------------------------------------');
      console.log(`ID: ${doc.ID}`);
      console.log(`Reason: "${doc.Reason}"`);
    });

    const total = await SinglePricingRuleDetail.countDocuments({});
    const totalWithReason = await SinglePricingRuleDetail.countDocuments({ Reason: { $ne: null } });
    console.log(`Total documents: ${total}`);
    console.log(`Total with Reason: ${totalWithReason}`);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected');
  }
}

checkReasonField();
