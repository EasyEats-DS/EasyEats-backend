const express = require("express");
const { createOrder, getAllOrders, getOrderById, getOrders, updateOrderStatus, deleteOrderById, updateOrder, getOrdersByUserId } = require("../controllers/orderController");

const router = express.Router();

router.post("/", createOrder);
router.get("/all", getAllOrders);
router.get('/', getOrders);
router.get("/:orderId", getOrderById); 
router.get('/user/:userId', getOrdersByUserId);
router.put('/:id', updateOrder);
router.put('/:id/status', updateOrderStatus);
router.delete('/:id', deleteOrderById);

module.exports = router;
