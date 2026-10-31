const crypto = require("node:crypto");
const Booking = require("../models/booking.js");
const Listing = require("../models/listing.js");
const ExpressError = require("../utils/ExpressError.js");
const {
  getBookingPeriod,
  getOverlappingBookingQuery,
} = require("../utils/bookingDates.js");

const PAYMENT_WINDOW_MS = 24 * 60 * 60 * 1000;

function getPaymentCredentials() {
  const { RAZORPAY_KEY_ID: keyId, RAZORPAY_KEY_SECRET: keySecret } =
    process.env;
  if (!keyId || !keySecret) {
    throw new ExpressError(
      503,
      "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to the server environment."
    );
  }
  return { keyId, keySecret };
}

function razorpayAuthorization(keyId, keySecret) {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

async function razorpayFetch(url, options) {
  try {
    return await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(15000),
    });
  } catch (error) {
    console.error("Razorpay request failed:", error.message);
    throw new ExpressError(
      502,
      "Razorpay is unavailable right now. Please try again."
    );
  }
}

async function createRazorpayOrder(booking, credentials) {
  const amount = Math.round(booking.totalPrice * 100);
  const expiresAt = new Date(Date.now() + PAYMENT_WINDOW_MS);
  const response = await razorpayFetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: razorpayAuthorization(
        credentials.keyId,
        credentials.keySecret
      ),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount,
      currency: "INR",
      receipt: `booking_${booking.id}`,
      expire_by: Math.floor(expiresAt.getTime() / 1000),
      notes: { bookingId: booking.id },
    }),
  });

  let result;
  try {
    result = await response.json();
  } catch {
    throw new ExpressError(502, "Razorpay returned an invalid response.");
  }

  if (!response.ok || !result.id) {
    console.error("Razorpay order creation failed:", response.status);
    throw new ExpressError(502, "Could not start payment. Please try again.");
  }

  booking.razorpayOrderId = result.id;
  booking.paymentExpiresAt = expiresAt;
  await booking.save();
  return result;
}

async function getRazorpayPayment(paymentId, credentials) {
  const response = await razorpayFetch(
    `https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}`,
    {
      headers: {
        Authorization: razorpayAuthorization(
          credentials.keyId,
          credentials.keySecret
        ),
      },
    }
  );
  let result;
  try {
    result = await response.json();
  } catch {
    throw new ExpressError(502, "Razorpay returned an invalid response.");
  }

  if (!response.ok) {
    console.error("Razorpay payment lookup failed:", response.status);
    throw new ExpressError(502, "Could not verify payment. Please try again.");
  }
  return result;
}

async function captureRazorpayPayment(payment, amount, credentials) {
  if (payment.status === "captured") {
    return payment;
  }
  if (payment.status !== "authorized") {
    throw new ExpressError(400, "The payment has not been authorized.");
  }

  const response = await razorpayFetch(
    `https://api.razorpay.com/v1/payments/${encodeURIComponent(payment.id)}/capture`,
    {
      method: "POST",
      headers: {
        Authorization: razorpayAuthorization(
          credentials.keyId,
          credentials.keySecret
        ),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount, currency: "INR" }),
    }
  );
  let result;
  try {
    result = await response.json();
  } catch {
    throw new ExpressError(502, "Razorpay returned an invalid response.");
  }

  if (!response.ok) {
    console.error("Razorpay payment capture failed:", response.status);
    throw new ExpressError(502, "Payment capture failed. Please contact support.");
  }
  return result;
}

async function findBookingForGuest(bookingId, userId) {
  const booking = await Booking.findById(bookingId).populate("listing");
  if (!booking) {
    throw new ExpressError(404, "Booking not found.");
  }
  if (!booking.guest.equals(userId)) {
    throw new ExpressError(403, "You cannot access this booking.");
  }
  if (!booking.listing) {
    throw new ExpressError(410, "This stay is no longer available.");
  }
  return booking;
}

module.exports.newBooking = async (req, res) => {
  const listing = await Listing.findById(req.params.id).populate("owner");
  if (!listing) {
    throw new ExpressError(404, "Stay not found.");
  }
  if (listing.owner && listing.owner._id.equals(req.user._id)) {
    req.flash("error", "You cannot book your own stay.");
    return res.redirect(`/listings/${listing.id}`);
  }

  res.render("bookings/new.ejs", { listing });
};

module.exports.createBooking = async (req, res) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) {
    throw new ExpressError(404, "Stay not found.");
  }
  if (listing.owner && listing.owner.equals(req.user._id)) {
    throw new ExpressError(403, "You cannot book your own stay.");
  }

  const period = getBookingPeriod(
    req.body.booking.checkIn,
    req.body.booking.checkOut
  );
  if (period.error) {
    throw new ExpressError(400, period.error);
  }
  if (listing.price <= 0) {
    throw new ExpressError(400, "This stay is not available for paid booking.");
  }

  const overlap = await Booking.exists(
    getOverlappingBookingQuery({
      listingId: listing._id,
      checkIn: period.checkIn,
      checkOut: period.checkOut,
    })
  );
  if (overlap) {
    throw new ExpressError(
      409,
      "This stay is already booked for some of those dates. Please choose different dates."
    );
  }

  const booking = await Booking.create({
    listing: listing._id,
    guest: req.user._id,
    checkIn: period.checkIn,
    checkOut: period.checkOut,
    nights: period.nights,
    totalPrice: Number((listing.price * period.nights).toFixed(2)),
  });

  req.flash("success", "Booking request sent to the host.");
  res.redirect("/bookings");
};

module.exports.myBookings = async (req, res) => {
  await Booking.updateMany(
    {
      guest: req.user._id,
      status: "payment_pending",
      paymentExpiresAt: { $lte: new Date() },
    },
    { $set: { status: "expired" } }
  );
  const bookings = await Booking.find({ guest: req.user._id })
    .populate("listing")
    .sort({ createdAt: -1 });
  res.render("bookings/index.ejs", { bookings, pageTitle: "My trips" });
};

module.exports.hostBookings = async (req, res) => {
  const listings = await Listing.find({ owner: req.user._id }).select("_id");
  if (listings.length > 0) {
    await Booking.updateMany(
      {
        listing: { $in: listings.map((listing) => listing._id) },
        status: "payment_pending",
        paymentExpiresAt: { $lte: new Date() },
      },
      { $set: { status: "expired" } }
    );
  }
  const bookings = listings.length
    ? await Booking.find({
        listing: { $in: listings.map((listing) => listing._id) },
      })
        .populate("listing")
        .populate("guest", "username email")
        .sort({ createdAt: -1 })
    : [];
  res.render("bookings/host.ejs", { bookings });
};

module.exports.requestReapproval = async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate("listing");
  if (!booking) {
    throw new ExpressError(404, "Booking not found.");
  }
  if (!booking.guest.equals(req.user._id)) {
    throw new ExpressError(403, "You cannot update this booking.");
  }
  if (!booking.listing) {
    throw new ExpressError(410, "This stay is no longer available.");
  }
  if (booking.status !== "expired") {
    throw new ExpressError(409, "Only expired bookings can be requested again.");
  }
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (booking.checkIn < today) {
    throw new ExpressError(
      409,
      "The check-in date has passed. Start a new booking request with different dates."
    );
  }

  const overlap = await Booking.exists(
    getOverlappingBookingQuery({
      listingId: booking.listing._id,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      excludeBookingId: booking._id,
    })
  );
  if (overlap) {
    throw new ExpressError(
      409,
      "Those dates are no longer available. Please choose new dates."
    );
  }

  const reopened = await Booking.findOneAndUpdate(
    { _id: booking._id, guest: req.user._id, status: "expired" },
    {
      $set: { status: "pending" },
      $unset: {
        approvedAt: "",
        paymentExpiresAt: "",
        razorpayOrderId: "",
        razorpayPaymentId: "",
      },
    },
    { new: true }
  );
  if (!reopened) {
    throw new ExpressError(409, "This booking request has already changed.");
  }
  req.flash("success", "Your dates were sent to the host for approval again.");
  res.redirect("/bookings");
};

module.exports.approveBooking = async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate("listing");
  if (!booking) {
    throw new ExpressError(404, "Booking not found.");
  }
  if (!booking.listing || !booking.listing.owner) {
    throw new ExpressError(410, "This stay no longer has an active host.");
  }
  if (!booking.listing.owner.equals(req.user._id)) {
    throw new ExpressError(403, "Only the host can approve this booking.");
  }
  if (booking.status !== "pending") {
    throw new ExpressError(409, "This booking request has already been handled.");
  }

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (booking.checkIn < today) {
    throw new ExpressError(
      409,
      "The requested check-in date has passed. Decline this request."
    );
  }

  const approvalTime = new Date();
  const paymentExpiresAt = new Date(approvalTime.getTime() + PAYMENT_WINDOW_MS);
  const claimedBooking = await Booking.findOneAndUpdate(
    { _id: booking._id, status: "pending" },
    {
      $set: {
        status: "payment_pending",
        approvedAt: approvalTime,
        paymentExpiresAt,
      },
    },
    { new: true }
  );
  if (!claimedBooking) {
    throw new ExpressError(409, "This booking request has already been handled.");
  }

  const overlap = await Booking.exists(
    getOverlappingBookingQuery({
      listingId: booking.listing._id,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      now: approvalTime,
      excludeBookingId: claimedBooking._id,
    })
  );
  if (overlap) {
    await Booking.updateOne(
      { _id: claimedBooking._id, status: "payment_pending" },
      {
        $set: { status: "pending" },
        $unset: { approvedAt: "", paymentExpiresAt: "" },
      }
    );
    throw new ExpressError(
      409,
      "Another approved booking overlaps these dates. Reject this request instead."
    );
  }

  req.flash("success", "Request approved. The guest can now complete payment.");
  res.redirect("/bookings/host");
};

module.exports.rejectBooking = async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate("listing");
  if (!booking) {
    throw new ExpressError(404, "Booking not found.");
  }
  if (!booking.listing || !booking.listing.owner) {
    throw new ExpressError(410, "This stay no longer has an active host.");
  }
  if (!booking.listing.owner.equals(req.user._id)) {
    throw new ExpressError(403, "Only the host can reject this booking.");
  }
  if (booking.status !== "pending") {
    throw new ExpressError(409, "Only pending requests can be rejected.");
  }

  const rejectedBooking = await Booking.findOneAndUpdate(
    { _id: booking._id, status: "pending" },
    { $set: { status: "rejected" } },
    { new: true }
  );
  if (!rejectedBooking) {
    throw new ExpressError(409, "This booking request has already been handled.");
  }
  req.flash("success", "Booking request declined.");
  res.redirect("/bookings/host");
};

module.exports.payBooking = async (req, res) => {
  const credentials = getPaymentCredentials();
  const booking = await findBookingForGuest(req.params.id, req.user._id);
  if (booking.status !== "payment_pending") {
    throw new ExpressError(409, "This booking is not awaiting payment.");
  }
  if (!booking.paymentExpiresAt || booking.paymentExpiresAt <= new Date()) {
    await Booking.updateOne(
      { _id: booking._id, status: "payment_pending" },
      { $set: { status: "expired" } }
    );
    throw new ExpressError(
      410,
      "The payment window for this request has expired. Please contact the host to request approval again."
    );
  }

  let order;
  if (
    booking.razorpayOrderId &&
    booking.paymentExpiresAt > new Date(Date.now() + 60 * 1000)
  ) {
    order = {
      id: booking.razorpayOrderId,
      amount: Math.round(booking.totalPrice * 100),
      currency: "INR",
    };
  } else {
    order = await createRazorpayOrder(booking, credentials);
  }

  res.render("bookings/payment.ejs", {
    booking,
    keyId: credentials.keyId,
    order,
    user: req.user,
  });
};

module.exports.verifyPayment = async (req, res) => {
  const credentials = getPaymentCredentials();
  const booking = await findBookingForGuest(req.params.id, req.user._id);
  const {
    razorpay_order_id: orderId,
    razorpay_payment_id: paymentId,
    razorpay_signature: signature,
  } = req.body;

  if (
    booking.status === "confirmed" &&
    booking.razorpayPaymentId === paymentId
  ) {
    req.flash("success", "Your booking is confirmed.");
    return res.redirect("/bookings");
  }
  if (
    booking.status !== "payment_pending" ||
    !booking.razorpayOrderId ||
    booking.razorpayOrderId !== orderId ||
    !booking.paymentExpiresAt ||
    booking.paymentExpiresAt <= new Date()
  ) {
    throw new ExpressError(409, "This payment session is no longer valid.");
  }
  if (typeof paymentId !== "string" || typeof signature !== "string") {
    throw new ExpressError(400, "Razorpay payment details are incomplete.");
  }

  const expectedSignature = crypto
    .createHmac("sha256", credentials.keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest();
  let receivedSignature;
  try {
    receivedSignature = Buffer.from(signature, "hex");
  } catch {
    throw new ExpressError(400, "Razorpay signature is invalid.");
  }
  if (
    receivedSignature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(receivedSignature, expectedSignature)
  ) {
    throw new ExpressError(400, "Razorpay signature verification failed.");
  }

  const amount = Math.round(booking.totalPrice * 100);
  let payment = await getRazorpayPayment(paymentId, credentials);
  if (
    payment.order_id !== orderId ||
    payment.amount !== amount ||
    payment.currency !== "INR"
  ) {
    throw new ExpressError(400, "Payment details do not match this booking.");
  }
  payment = await captureRazorpayPayment(payment, amount, credentials);
  if (payment.status !== "captured") {
    throw new ExpressError(409, "Payment has not been captured yet.");
  }

  const confirmed = await Booking.findOneAndUpdate(
    {
      _id: booking._id,
      guest: req.user._id,
      status: "payment_pending",
      razorpayOrderId: orderId,
      paymentExpiresAt: { $gt: new Date() },
    },
    {
      $set: {
        status: "confirmed",
        razorpayPaymentId: paymentId,
      },
    },
    { new: true }
  );
  if (!confirmed) {
    throw new ExpressError(
      409,
      "Payment was received, but the booking status could not be updated. Please contact support."
    );
  }

  req.flash("success", "Payment successful. Your booking is confirmed.");
  res.redirect("/bookings");
};
