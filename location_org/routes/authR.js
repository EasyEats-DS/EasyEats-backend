// routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Customer = require('../models/Customer');
const Driver = require('../models/Driver');
const bcrypt = require('bcrypt');


const JWT_SECRET = 'yourSecretKey';

router.post('/driver/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const driver = await Driver.findOne({ email });
    if (!driver) return res.status(404).json({ msg: "Driver not found" });

    const isMatch = await bcrypt.compare(password, driver.password);
    if (!isMatch) return res.status(401).json({ msg: "Invalid credentials" });

    const token = jwt.sign({ id: driver._id, role: "driver" },JWT_SECRET, { expiresIn: '7d' });

    res.status(200).json({ token, driver });
  } catch (err) {
    console.error("Driver login error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});


router.post('/driver/register', async (req, res) => {
  const { id ,name, email, password, position } = req.body;

  try {
    const existing = await Driver.findOne({ email });
    if (existing) return res.status(400).json({ msg: "Email already in use" });

    const newDriver = new Driver({driverId:id, name, email, password, position });
    await newDriver.save();

    res.status(201).json({ msg: "Driver registered", driver: newDriver });
  } catch (err) {
    console.error("Driver register error:", err.message);
    res.status(500).json({ msg: "Registration failed" });
  }
});

// Register
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password,position } = req.body;
    console.log('Registration attempt:', req.body); // Debugging line

    const existing = await Customer.findOne({ email });
    if (existing) return res.status(400).json({ message: 'Email already registered' });

    const newCustomer = new Customer({ fullName, email, password, position });
    await newCustomer.save();

    res.status(201).json({ message: 'Registration successful' });
  } catch (err) {
    res.status(500).json({ message: err.message });
    console.log(err)
  }
});

// Login
router.post('/login', async (req, res) => {
  //console.log('Login attempt:', req.body); // Debugging line
  try {
    const { email, password } = req.body;
    const customer = await Customer.findOne({ email });
    //console.log('Customer found:', customer); // Debugging line
    if (!customer) return res.status(404).json({ message: 'User not found' });

    const isMatch = await customer.comparePassword(password);
    console.log('Password match:', isMatch); // Debugging line
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: customer._id, role: 'customer' }, JWT_SECRET, { expiresIn: '1d' });
    res.status(200).json({ token, customer: customer });
    console.log('Token generated:', token); // Debugging line
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



module.exports = router;
