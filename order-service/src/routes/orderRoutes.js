const express = require("express");
const { createOrder, getOrderById, getOrders } = require("../controllers/orderController");

const router = express.Router();

router.post("/", createOrder);
router.get('/', getOrders);
router.get("/:orderId", getOrderById); 

module.exports = router;
