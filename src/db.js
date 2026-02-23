const mongoose = require('mongoose');

const findingSchema = new mongoose.Schema({
  thread: String,
  agent: String,
  findingSummary: String,
  sources: Array,
  confidenceScore: Number,
  runId: String,
  timestamp: { type: Date, default: Date.now },
  domain: String,
  isPublic: { type: Boolean, default: true }
});

const synthesisSchema = new mongoose.Schema({
  topic: String,
  content: String,
  findingCount: Number,
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  isPublic: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

const Finding = mongoose.model('Finding', findingSchema);
const Synthesis = mongoose.model('Synthesis', synthesisSchema);

async function connectDB() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('MongoDB connected');
}

module.exports = { connectDB, Finding, Synthesis };
