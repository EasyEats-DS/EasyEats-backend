// // models/Customer.js
// const mongoose = require('mongoose');
// const bcrypt = require('bcrypt');

// const customerSchema = new mongoose.Schema({
//   fullName: {
//     type: String,
//     required: true,
//   },
//   email: {
//     type: String,
//     unique: true,
//     required: true,
//     lowercase: true,
//   },
//   password: {
//     type: String,
//     required: true,
//   },
//   position: {
//     type: [Number], // [latitude, longitude]
//     default: [],
//   },
//   role:{
//     type: String,
//     enum: ['driver', 'customer'],
//     default: 'customer'
//   },
//   createdAt: {
//     type: Date,
//     default: Date.now,
//   },
// });

// // Hash password before saving
// customerSchema.pre('save', async function (next) {
//   if (!this.isModified('password')) return next();
//   this.password = await bcrypt.hash(this.password, 10);
//   next();
// });

// // Method to compare passwords
// customerSchema.methods.comparePassword = function (password) {
//   return bcrypt.compare(password, this.password);
// };

// module.exports = mongoose.model('Customer', customerSchema);
