
const Message = require('./models/Message');

async function handlePayload(payload) {
  const processed = [];
  const entry = payload.metaData && payload.metaData.entry;
  if (!entry) return processed;
  for (const e of entry) {
    for (const ch of (e.changes || [])) {
      const val = ch.value || {};
      if (val.messages && val.messages.length) {
        for (const m of val.messages) {
          const contact = (val.contacts && val.contacts[0]) || {};
          const wa_id = contact.wa_id || (m.from || m.to) || null;
          const contact_name = contact.profile && contact.profile.name;
          const doc = {
            payload_type: payload.payload_type || 'whatsapp_webhook',
            raw: payload,
            wa_id,
            contact_name,
            from: m.from,
            msg_id: m.id,
            meta_msg_id: m.id || null,
            body: (m.text && m.text.body) || m.body || '',
            type: m.type || 'text',
            timestamp: Number(m.timestamp) || Math.floor(Date.now()/1000),
            status: 'received'
          };
          await Message.findOneAndUpdate(
            { msg_id: doc.msg_id },
            { $set: doc },
            { upsert: true, new: true }
          );
          processed.push(doc.msg_id || null);
        }
      }
      if (val.statuses && val.statuses.length) {
        for (const s of val.statuses) {
          const targetId = s.id || s.meta_msg_id || null;
          const status = s.status;
          if (!targetId) continue;
          const res = await Message.findOneAndUpdate(
            { $or: [{ msg_id: targetId }, { meta_msg_id: targetId }] },
            { $set: { status, gs_id: s.gs_id || null, conversation_id: (s.conversation && s.conversation.id) || null, updatedAt: Date.now() } },
            { new: true }
          );
          if (!res) {
            await Message.create({
              payload_type: payload.payload_type || 'status_only',
              raw: payload,
              msg_id: targetId,
              meta_msg_id: targetId,
              wa_id: s.recipient_id || null,
              body: '',
              status
            });
          }
          processed.push(targetId);
        }
      }
    }
  }
  return processed;
}

module.exports = { handlePayload };
