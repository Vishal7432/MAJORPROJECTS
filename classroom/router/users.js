const express = require("express");
const router = express.Router();

//Index - users
router.get("/", (req, res) => {
  res.send("Get for users");
});

//Show - users
router.get("/:id", (req, res) => {
  res.send("Get for users id ");
});

//Post - users
router.post("/", (req, res) => {
  res.send("POST for users");
});

//DELETE - users
router.get("/:id", (req, res) => {
  res.send("Delete for user id");
});

module.exports = router;
