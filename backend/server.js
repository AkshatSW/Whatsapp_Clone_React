require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const Message = require('./models/Message');
const processor = require('./processorFunc');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const { Server } = require('socket.io');
const io = new Server(server, { cors: { origin: '*' } });

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Mongo connected'))
  .catch(err => { console.error('Mongo connect error', err); process.exit(1); });

io.on('connection', (socket) => {
  console.log('socket connected', socket.id);
});

app.post('/webhook', async (req, res) => {
  try {
    const events = await processor.handlePayload(req.body);
    io.emit('webhook_processed', { ok: true });
    res.json({ ok: true, processed: events.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'processing failed' });
  }
});

app.get('/conversations', async (req, res) => {
  const convs = await Message.aggregate([
    { $sort: { timestamp: -1 } },
    {
      $group: {
        _id: '$wa_id',
        contact_name: { $first: '$contact_name' },
        last_body: { $first: '$body' },
        last_timestamp: { $first: '$timestamp' },
        last_status: { $first: '$status' }
      }
    },
    { $sort: { last_timestamp: -1 } }
  ]);
  res.json(convs);
});

app.get('/conversations/:wa_id/messages', async (req, res) => {
  const wa = req.params.wa_id;
  const messages = await Message.find({ wa_id: wa }).sort({ timestamp: 1 }).lean();
  res.json(messages);
});

app.post('/conversations/:wa_id/send', async (req, res) => {
  try {
    const wa = req.params.wa_id;
    const { body, from } = req.body;
    const newMsg = await Message.create({
      payload_type: 'local_outgoing',
      wa_id: wa,
      contact_name: null,
      from: from || process.env.OUR_PHONE_NUMBER,
      msg_id: `local-${Date.now()}`,
      body: body || '',
      type: 'text',
      timestamp: Math.floor(Date.now() / 1000),
      status: 'sent'
    });
    io.emit('new_message', newMsg);
    res.json(newMsg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'could not save message' });
  }
});

/**
 * Load sample data from /sample_payloads into MongoDB
 */
app.get('/load-sample-data', async (req, res) => {
  try {
    const payloadDir = path.join(__dirname, 'sample_payloads');
    const files = fs.readdirSync(payloadDir).filter(f => f.endsWith('.json'));

    // Optional: clear old data before inserting
    await Message.deleteMany({});
    console.log('Cleared old messages');

    let count = 0;
    for (const file of files) {
      const data = JSON.parse(fs.readFileSync(path.join(payloadDir, file), 'utf-8'));
      const events = await processor.handlePayload(data);
      count += events.length;
    }

    res.json({ ok: true, inserted: count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load sample data' });
  }
});

app.get('/', (req, res) => res.send('WhatsApp clone backend running'));

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log('Server listening on', PORT));
