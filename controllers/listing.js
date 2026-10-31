const Listing = require("../models/listing");
const ExpressError = require("../utils/ExpressError.js");
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const { rankListings } = require("../utils/listingSearch.js");

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function geocodeLocation(location) {
  if (!process.env.MAP_TOKEN) {
    throw new ExpressError(503, "Location service is not configured.");
  }

  const geocodingClient = mbxGeocoding({
    accessToken: process.env.MAP_TOKEN,
  });
  const response = await geocodingClient
    .forwardGeocode({ query: location, limit: 1 })
    .send();
  const geometry = response.body.features[0]?.geometry;

  if (!geometry) {
    throw new ExpressError(400, "We could not find that location.");
  }

  return geometry;
}

module.exports.index = async (req, res) => {
  const searchQuery = String(req.query.search || "").trim().slice(0, 100);
  const searchPattern = new RegExp(escapeRegex(searchQuery), "i");
  const filter = searchQuery
    ? {
        $or: [
          { title: searchPattern },
          { location: searchPattern },
          { country: searchPattern },
        ],
      }
    : {};

  let allListings = await Listing.find(filter);
  let searchMatchType = "exact";

  if (searchQuery && allListings.length === 0) {
    const candidates = await Listing.find({})
      .select("title location country description image price")
      .lean();
    allListings = rankListings(searchQuery, candidates).map((listing) => ({
      ...listing,
      id: String(listing._id),
    }));
    searchMatchType = allListings.length > 0 ? "fuzzy" : "none";
  }

  res.render("listings/index.ejs", {
    allListings,
    searchQuery,
    searchMatchType,
  });
};

module.exports.renderNewForm = (req, res) => {
  res.render("listings/new.ejs");
};

module.exports.showListing = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id)
    .populate({ path: "reviews", populate: { path: "author" } })
    .populate("owner");
  if (!listing) {
    req.flash("error", "Listing you request does not exist!");
    return res.redirect("/listings");
  }
  res.render("listings/show.ejs", {
    listing,
    mapToken: process.env.MAP_TOKEN || "",
  });
};

module.exports.createListing = async (req, res) => {
  if (!req.file) {
    throw new ExpressError(400, "Please upload an image for the listing.");
  }

  const geometry = await geocodeLocation(req.body.listing.location);
  const { path: url, filename } = req.file;

  const newListing = new Listing(req.body.listing);
  newListing.owner = req.user._id;
  newListing.image = { url, filename };
  newListing.geometry = geometry;
  await newListing.save();
  req.flash("success", "New listing created!");
  res.redirect("/listings");
};

module.exports.renderEditListing = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    req.flash("error", "Listing you request does not exist!");
    return res.redirect("/listings");
  }

  const originalImageUrl = listing.image?.url?.replace(
    "/upload",
    "/upload/w_250"
  ) || "https://placehold.co/800x600?text=Stay";
  res.render("listings/edit.ejs", { listing, originalImageUrl });
};

module.exports.updateListing = async (req, res) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    throw new ExpressError(404, "Listing not found.");
  }

  const updates = req.body.listing;
  listing.set({
    title: updates.title,
    description: updates.description,
    price: updates.price,
    location: updates.location,
    country: updates.country,
    geometry: await geocodeLocation(updates.location),
  });

  // The existing image remains unchanged unless a replacement was uploaded.
  if (req.file) {
    listing.image = { url: req.file.path, filename: req.file.filename };
  }

  await listing.save();
  req.flash("success", "Listing updated!");
  res.redirect("/listings");
};

module.exports.deleteListing = async (req, res) => {
  const { id } = req.params;
  const deletedListing = await Listing.findByIdAndDelete(id);
  if (!deletedListing) {
    throw new ExpressError(404, "Listing not found.");
  }

  req.flash("success", "Listing deleted.");
  res.redirect("/listings");
};
