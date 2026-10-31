const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const Booking = require("../models/booking.js");
const { bookingSchema } = require("../schema.js");
const {
  getBookingPeriod,
  getOverlappingBookingQuery,
} = require("../utils/bookingDates.js");

test("booking request accepts ISO date-only check-in and check-out", () => {
  const result = bookingSchema.validate({
    booking: { checkIn: "2030-01-10", checkOut: "2030-01-12" },
  });

  assert.equal(result.error, undefined);
});

test("booking request rejects malformed date values", () => {
  const result = bookingSchema.validate({
    booking: { checkIn: "next Friday", checkOut: "2030-01-12" },
  });

  assert.ok(result.error);
});

test("booking period counts nights and normalizes dates in UTC", () => {
  const period = getBookingPeriod("2030-02-01", "2030-02-04", new Date("2030-01-01"));

  assert.equal(period.error, undefined);
  assert.equal(period.nights, 3);
  assert.equal(period.checkIn.toISOString(), "2030-02-01T00:00:00.000Z");
});

test("booking period rejects past dates, invalid dates, and non-positive stays", () => {
  const now = new Date("2030-01-10T12:00:00.000Z");

  assert.match(getBookingPeriod("2030-01-09", "2030-01-11", now).error, /past/);
  assert.match(getBookingPeriod("2030-02-31", "2030-03-03", now).error, /valid/);
  assert.match(getBookingPeriod("2030-02-12", "2030-02-12", now).error, /after/);
});

test("overlap query only reserves confirmed or unexpired payment bookings", () => {
  const listingId = new mongoose.Types.ObjectId();
  const bookingId = new mongoose.Types.ObjectId();
  const now = new Date("2030-01-01T00:00:00.000Z");
  const query = getOverlappingBookingQuery({
    listingId,
    checkIn: new Date("2030-02-01T00:00:00.000Z"),
    checkOut: new Date("2030-02-03T00:00:00.000Z"),
    now,
    excludeBookingId: bookingId,
  });

  assert.equal(query.listing, listingId);
  assert.deepEqual(query.status.$in, ["payment_pending", "confirmed"]);
  assert.deepEqual(query.checkIn, { $lt: new Date("2030-02-03T00:00:00.000Z") });
  assert.deepEqual(query.checkOut, { $gt: new Date("2030-02-01T00:00:00.000Z") });
  assert.deepEqual(query._id, { $ne: bookingId });
  assert.equal(query.$or[2].paymentExpiresAt.$gt, now);
});

test("booking model allows expired payment requests", () => {
  assert.ok(Booking.schema.path("status").enumValues.includes("expired"));
});
