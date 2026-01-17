const mongoose = require('mongoose');
require('dotenv').config();

const CardCategory = require('./models/cardCategory');

async function checkCategories() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/parkingdb';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Find all card categories
    const categories = await CardCategory.find({});

    console.log('\n=== CARD CATEGORIES ===');
    console.log(`Total: ${categories.length}\n`);

    categories.forEach((cat, index) => {
      console.log(`${index + 1}. ID: ${cat.ID}`);
      console.log(`   Name: ${cat.Name}`);
      console.log(`   IsActive: ${cat.IsActive}`);
      console.log(`   _id: ${cat._id}`);
      console.log('');
    });

    // Check for Visitor category specifically
    const visitorCats = categories.filter(cat =>
      cat.Name.toLowerCase().includes('visitor') ||
      cat.Name.toLowerCase().includes('vãng lai')
    );

    if (visitorCats.length > 0) {
      console.log('=== VISITOR CATEGORIES FOUND ===');
      visitorCats.forEach(cat => {
        console.log(`ID: ${cat.ID}, Name: ${cat.Name}`);
      });
    } else {
      console.log('⚠️  No Visitor category found!');
    }

    await mongoose.connection.close();
    console.log('\nConnection closed');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkCategories();
