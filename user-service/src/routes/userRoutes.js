const express = require("express");
const { getUsers, createUser,getUserById,deleteUserById,updateUserById } = require("../controllers/userController");

const router = express.Router();

router.get("/", getUsers);
router.post("/", createUser);
router.get("/:userId", getUserById);
router.delete("/:userId", deleteUserById);
router.put("/:userId", updateUserById);


module.exports = router;
