const express = require("express");
const { createOrder, getOrderById, getOrders, updateOrderStatus, deleteOrderById } = require("../controllers/orderController");

const router = express.Router();

router.post("/", createOrder);
router.get('/', getOrders);
router.put('/:id/status', updateOrderStatus);
router.get("/:orderId", getOrderById); 
router.delete('/:id', deleteOrderById);

module.exports = router;
