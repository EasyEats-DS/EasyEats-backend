const express = require("express");
const {
  createRestaurant,
  getRestaurantById,
  updateRestaurant,
  getRestaurantsByOwner,
  addMenuItem,
  updateMenuItem,
  getAllRestaurants
} = require("../controllers/resturantController");

const router = express.Router();
router.get("/", getAllRestaurants);
router.post("/", createRestaurant);
router.get("/:id", getRestaurantById);
router.put("/:id", updateRestaurant);
router.get("/owner/:ownerId", getRestaurantsByOwner);
router.post("/:id/menu", addMenuItem);
router.put("/:id/menu/:menuItemId", updateMenuItem);
router.delete("/:id", deleteRestaurantById);

module.exports = router;