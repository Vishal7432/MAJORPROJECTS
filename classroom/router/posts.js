const express = require("express");
const router = express.Router();

//Index - users
router.get("/", (req, res) => {
  console.log("Get for posts");
});

//Show - users
router.get("/:id", (req, res) => {
  console.log("Get for posts id ");
});

//Post - users
router.post("/", (req, res) => {
  console.log("POST for posts");
});

//DELETE - users
router.get("/:id", (req, res) => {
  console.log("Delete for post by id");
});

module.exports = router;
