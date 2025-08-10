
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const processor = require('./processorFunc');

const MONGO = process.env.MONGO_URI;
async function main(){
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  const dir = path.join(__dirname, 'payloads');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  for (const f of files){
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(dir,f),'utf8'));
      const processed = await processor.handlePayload(raw);
      console.log(`Processed ${f} => ${processed.length} items`);
    } catch(e) {
      console.error('Err', f, e);
    }
  }
  await mongoose.disconnect();
}
main().catch(console.error);
