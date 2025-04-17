const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const { send } = require("process");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");

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

// ✅ Root route
app.get("/", (req, res) => {
  res.send("Hi, I am root");
});

// index route
app.get("/listings", async (req, res) => {
  const allListings = await Listing.find({});
  res.render("listings/index.ejs", { allListings });
});

//new route
app.get("/listings/new", (req, res) => {
  res.render("listings/new.ejs");
});

//show route
app.get("/listings/:id", async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  res.render("listings/show.ejs", { listing });
});

//Create post route
app.post(
  "/listings",
  wrapAsync(async (req, res, next) => {
    // let {title, description, image, price, country, location} = req.body:

    const newListing = new Listing(req.body.listing);
    await newListing.save();
    res.redirect("/listings");
  })
);

// Edit Route
app.get("/listings/:id/edit", async (req, res) => {
  let { id } = req.params;
  const listing = await Listing.findById(id);
  res.render("listings/edit.ejs", { listing });
});

//  Update Route
app.put("/listings/:id", async (req, res) => {
  let { id } = req.params;
  await Listing.findByIdAndUpdate(id, { ...req.body.listing });
  res.redirect("/listings");
});

// Delete route
app.delete("/listings/:id", async (req, res) => {
  let { id } = req.params;
  let deletedListing = await Listing.findByIdAndDelete(id);
  console.log(deletedListing);
  res.redirect("/listings");
});

app.all("*", (req, res, next) => {
  next(new ExpressError(404, "Page Not Found!"));
});

app.use((err, req, res, next) => {
  let { statusCode, message } = err;
  res.status(statusCode).send(message);
});

// // ✅ Fix: Typo in "Listing" and "title"
// app.get("/testListing", async (req, res) => {
//   let sampleListing = new Listing({
//     title: "My new villa",
//     description: "By the Beach",
//     price: 1200, // ✅ make it a number, not a string
//     location: "Calangute, Goa",
//     country: "India",
//   });

//   await sampleListing.save();
//   console.log("Sample listing was saved");
//   res.send("Successful testing");
// });

// ✅ Fix typo in log message ("post" → "port")
app.listen(8080, () => {
  console.log("Server is listening on port 8080");
});
