const test = require("node:test");
const assert = require("node:assert/strict");
const { rankListings } = require("../utils/listingSearch.js");

const listings = [
  {
    title: "Desert Oasis in Dubai",
    location: "Dubai",
    country: "United Arab Emirates",
    description: "Experience a luxurious desert retreat.",
  },
  {
    title: "Mountain Retreat",
    location: "Aspen",
    country: "United States",
    description: "A peaceful cabin surrounded by nature.",
  },
];

test("fuzzy search finds Dubai when the destination has a typo", () => {
  const results = rankListings("bubai", listings);

  assert.equal(results.length, 1);
  assert.equal(results[0].location, "Dubai");
});

test("fuzzy search handles transposed characters and ignores case", () => {
  const results = rankListings("DUABI", listings);

  assert.equal(results[0].location, "Dubai");
});

test("fuzzy search does not return unrelated listings", () => {
  assert.deepEqual(rankListings("tokyo", listings), []);
});

test("fuzzy search requires every query word to match", () => {
  assert.deepEqual(rankListings("bubai cabin", listings), []);
});

test("fuzzy search skips overly short terms", () => {
  assert.deepEqual(rankListings("NY", listings), []);
});
