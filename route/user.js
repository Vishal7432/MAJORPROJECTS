const express = require("express");
const router = express.Router();
const User = require("../models/user.js");
const wrapAsync = require("../utils/wrapAsync.js");
const passport = require("passport");
const { saveRedirctUrl } = require("../middleware.js");
const userController = require("../controllers/user.js");
const { data: sampleListings } = require("../init/data.js");

router.get("/", (req, res) => {
  res.render("home.ejs", { featuredListings: sampleListings.slice(0, 3) });
});

router
  .route("/signup")
  .get(userController.signupForm)
  .post(wrapAsync(userController.userSignup));

router
  .route("/login")
  .get(userController.loginForm)
  .post(
    saveRedirctUrl,
    passport.authenticate("local", {
      failureRedirect: "/login",
      failureFlash: true,
    }),
    userController.login
  );

router.post("/logout", userController.logout);

module.exports = router;
