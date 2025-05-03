const express = require("express");
const app = express();
const mongoose = require("mongoose");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const { send } = require("process");
const ExpressError = require("./utils/ExpressError.js");

const listings = require("./route/listing.js");
const reviews = require("./route/review.js");

// ✅ Fixed closing quote in connection string
const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";

// ✅ Use .catch instead of chaining .then for error handling
main()
  .then(() => {
    console.log("connected to DB");
  })
  .catch((err) => {
    console.log("Error connecting to DB:", err);
  });

async function main() {
  await mongoose.connect(MONGO_URL);
}

app.engine("ejs", ejsMate);
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(express.static(path.join(__dirname, "/public")));
app.use(express.json());

// ✅ Root route
app.get("/", (req, res) => {
  res.send("Hi, I am root");
});

app.use("/listings", listings);
app.use("/listings/:id/reviews", reviews);

// Error handling route
app.all(/.*/, (req, res, next) => {
  next(new ExpressError(404, "Page Not Found"));
});

app.use((err, req, res, next) => {
  let { statusCode = 500, message = "Something went wrong!" } = err;
  res.status(statusCode).render("error.ejs", { message });
});

app.listen(8080, () => {
  console.log("Server is listening on port 8080");
});
