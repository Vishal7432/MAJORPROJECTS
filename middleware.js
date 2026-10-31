const Listing = require("./models/listing");
const Review = require("./models/review.js");

const ExpressError = require("./utils/ExpressError.js");
const { listingSchema, reviewSchema, bookingSchema } = require("./schema.js");

module.exports.isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    // redirectUrl
    req.session.redirectUrl = req.originalUrl;
    req.flash("error", "Please log in or create an account to continue.");
    return res.redirect("/login");
  }
  next();
};

module.exports.saveRedirctUrl = (req, res, next) => {
  if (req.session.redirectUrl) {
    res.locals.redirectUrl = req.session.redirectUrl;
  }
  next();
};

module.exports.isOwner = async (req, res, next) => {
  const { id } = req.params;
  const listing = await Listing.findById(id);
  if (!listing) {
    return next(new ExpressError(404, "Listing not found."));
  }

  if (!listing.owner || !listing.owner.equals(res.locals.currUser._id)) {
    req.flash("error", "You are not owner of this list.");
    return res.redirect(`/listings/${id}`);
  }

  next();
};

module.exports.validateListing = (req, res, next) => {
  let { error } = listingSchema.validate(req.body);
  if (error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

module.exports.validateReview = (req, res, next) => {
  let { error } = reviewSchema.validate(req.body);
  if (error) {
    let errMsg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(400, errMsg);
  } else {
    next();
  }
};

module.exports.validateBooking = (req, res, next) => {
  const { error } = bookingSchema.validate(req.body);
  if (error) {
    const message = error.details.map((detail) => detail.message).join(", ");
    return next(new ExpressError(400, message));
  }
  next();
};

module.exports.isReviewAuthor = async (req, res, next) => {
  const { id, reviewId } = req.params;
  const [review, listing] = await Promise.all([
    Review.findById(reviewId),
    Listing.findById(id),
  ]);

  if (
    !review ||
    !listing ||
    !listing.reviews.some((entry) => entry.equals(reviewId))
  ) {
    return next(new ExpressError(404, "Review not found."));
  }

  if (!review.author || !review.author.equals(res.locals.currUser._id)) {
    req.flash("error", "You are not author of this review!.");
    return res.redirect(`/listings/${id}`);
  }

  next();
};
