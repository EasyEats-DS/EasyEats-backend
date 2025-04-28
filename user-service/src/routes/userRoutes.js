const express = require("express");
const { getUsers, createUser,getUserById,deleteUserById,updateUserById,getNearbyDrivers } = require("../controllers/userController");

const router = express.Router();
router.post("/updateLocation", updateLocation);
router.get("/", getUsers);
router.post("/", createUser);
router.get("/:userId", getUserById);
router.delete("/:userId", deleteUserById);
router.put("/:userId", updateUserById);
router.post("/nearby", getNearbyDrivers);


module.exports = router;
