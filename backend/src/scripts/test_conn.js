// Test direct connection to Atlas using standard URI format
// Run: node src/scripts/test_conn.js <your-standard-uri>

const mongoose = require('mongoose');

const uri = process.argv[2];
if (!uri) {
  console.log('Usage: node src/scripts/test_conn.js <mongodb-uri>');
  process.exit(1);
}

console.log('Connecting...');
mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 })
  .then(() => {
    console.log('✅ Connected! DB:', mongoose.connection.name);
    mongoose.connection.close();
  })
  .catch(err => {
    console.error('❌ Failed:', err.message);
    process.exit(1);
  });
