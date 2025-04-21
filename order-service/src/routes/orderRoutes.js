const express = require("express");
const { createOrder, getOrderById, getOrders, updateOrderStatus } = require("../controllers/orderController");

const router = express.Router();

router.post("/", createOrder);
router.get('/', getOrders);
router.put('/:id/status', updateOrderStatus);
router.get("/:orderId", getOrderById); 

module.exports = router;
