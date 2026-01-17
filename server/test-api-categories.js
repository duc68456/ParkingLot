const fetch = require('node-fetch');

async function testCategoriesAPI() {
  try {
    const API_BASE_URL = 'http://localhost:3001';

    console.log('Testing API: GET /api/card-categories');

    const res = await fetch(`${API_BASE_URL}/api/card-categories?limit=100`);
    const json = await res.json();

    console.log('\nResponse status:', res.status);
    console.log('Response structure:', Object.keys(json));

    if (json.success && json.data) {
      const items = json.data.cardCategories || json.data.items || [];
      console.log(`\nTotal categories returned: ${items.length}`);

      items.forEach((cat, i) => {
        console.log(`\n${i + 1}. ${cat.Name || cat.name}`);
        console.log(`   ID: ${cat.ID || cat.id}`);
        console.log(`   IsActive: ${cat.IsActive}`);
      });

      const visitorCat = items.find(cat =>
        (cat.Name || cat.name || '').toLowerCase().includes('visitor')
      );

      if (visitorCat) {
        console.log('\n✅ Visitor category found in API response:');
        console.log(JSON.stringify(visitorCat, null, 2));
      } else {
        console.log('\n❌ Visitor category NOT found in API response');
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testCategoriesAPI();
