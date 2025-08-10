
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const MessageSchema = new Schema({
  payload_type: String,
  raw: Object,
  wa_id: { type: String, index: true },
  contact_name: String,
  from: String,
  msg_id: { type: String, unique: true, sparse: true },
  meta_msg_id: String,
  gs_id: String,
  conversation_id: String,
  body: String,
  type: String,
  timestamp: Number,
  status: { type: String, enum: ['received','sent','delivered','read','unknown'], default: 'unknown' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
MessageSchema.pre('save', function(next){ this.updatedAt = Date.now(); next(); });
module.exports = mongoose.model('Message', MessageSchema);
