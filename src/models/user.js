const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  username: { type: String, unique: true, sparse: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', function(next) {
  if (this.username) this.username = this.username.toLowerCase();
  if (this.email) this.email = this.email.toLowerCase();
  next();
});

userSchema.pre('save', async function() {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

userSchema.methods.comparePassword = async function(candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('User', userSchema);
