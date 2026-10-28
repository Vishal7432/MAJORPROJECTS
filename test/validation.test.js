const test = require("node:test");
const assert = require("node:assert/strict");
const { listingSchema, reviewSchema } = require("../schema.js");
const Listing = require("../models/listing.js");

test("listing validation accepts a new listing without an image object", () => {
  const result = listingSchema.validate({
    listing: {
      title: "Cabin",
      description: "A quiet place to stay.",
      location: "Aspen",
      country: "United States",
      price: 1200,
    },
  });

  assert.equal(result.error, undefined);
});

test("listing validation rejects negative prices and missing titles", () => {
  const negativePrice = listingSchema.validate({
    listing: {
      title: "Cabin",
      description: "A quiet place to stay.",
      location: "Aspen",
      country: "United States",
      price: -1,
    },
  });
  const missingTitle = listingSchema.validate({
    listing: {
      description: "A quiet place to stay.",
      location: "Aspen",
      country: "United States",
      price: 1200,
    },
  });

  assert.ok(negativePrice.error);
  assert.ok(missingTitle.error);
});

test("review validation only accepts ratings from one through five", () => {
  const validReview = reviewSchema.validate({
    review: { rating: 5, comment: "Wonderful stay." },
  });
  const invalidReview = reviewSchema.validate({
    review: { rating: 6, comment: "Wonderful stay." },
  });

  assert.equal(validReview.error, undefined);
  assert.ok(invalidReview.error);
});

test("listing model rejects a negative price", () => {
  const listing = new Listing({
    title: "Cabin",
    description: "A quiet place to stay.",
    location: "Aspen",
    country: "United States",
    price: -1,
    geometry: { type: "Point", coordinates: [-106.8, 39.2] },
  });

  assert.ok(listing.validateSync().errors.price);
});
