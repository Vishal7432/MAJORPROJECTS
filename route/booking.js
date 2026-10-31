const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync.js");
const { isLoggedIn, validateBooking } = require("../middleware.js");
const BookingController = require("../controllers/booking.js");

router.get("/listings/:id/book", isLoggedIn, wrapAsync(BookingController.newBooking));
router.post(
  "/listings/:id/book",
  isLoggedIn,
  validateBooking,
  wrapAsync(BookingController.createBooking)
);

router.get("/bookings", isLoggedIn, wrapAsync(BookingController.myBookings));
router.get(
  "/bookings/host",
  isLoggedIn,
  wrapAsync(BookingController.hostBookings)
);
router.post(
  "/bookings/:id/reopen",
  isLoggedIn,
  wrapAsync(BookingController.requestReapproval)
);
router.post(
  "/bookings/:id/approve",
  isLoggedIn,
  wrapAsync(BookingController.approveBooking)
);
router.post(
  "/bookings/:id/reject",
  isLoggedIn,
  wrapAsync(BookingController.rejectBooking)
);
router.get(
  "/bookings/:id/pay",
  isLoggedIn,
  wrapAsync(BookingController.payBooking)
);
router.post(
  "/bookings/:id/payment/verify",
  isLoggedIn,
  wrapAsync(BookingController.verifyPayment)
);

module.exports = router;
