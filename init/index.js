const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");

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

const initDB = async () => {
  await Listing.deleteMany({});
  await Listing.insertMany(initData.data);
  console.log("data was initialize");
};

initDB();
