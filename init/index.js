const path = require("node:path");
const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");

require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

async function seedListings() {
  const databaseUrl = process.env.ATLASDB_URL;
  if (!databaseUrl) {
    throw new Error("ATLASDB_URL is required to seed the application database.");
  }

  await mongoose.connect(databaseUrl);
  console.log("Connected to the application database.");

  try {
    const result = await Listing.bulkWrite(
      initData.data.map((listing) => ({
        updateOne: {
          filter: { title: listing.title, location: listing.location },
          update: { $setOnInsert: listing },
          upsert: true,
        },
      }))
    );

    console.log(
      `Seed complete: ${result.upsertedCount} added, ${result.matchedCount} already present.`
    );
  } finally {
    await mongoose.disconnect();
  }
}

seedListings().catch((error) => {
  console.error("Failed to seed listings:", error);
  process.exitCode = 1;
});
