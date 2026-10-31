const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

function parseDateOnly(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return date.toISOString().slice(0, 10) === value ? date : null;
}

function getBookingPeriod(checkInValue, checkOutValue, now = new Date()) {
  const checkIn = parseDateOnly(checkInValue);
  const checkOut = parseDateOnly(checkOutValue);
  if (!checkIn || !checkOut) {
    return { error: "Please enter valid check-in and check-out dates." };
  }

  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  if (checkIn < today) {
    return { error: "Check-in date cannot be in the past." };
  }
  if (checkOut <= checkIn) {
    return { error: "Check-out must be after check-in." };
  }

  const nights = Math.round((checkOut - checkIn) / DAY_IN_MILLISECONDS);
  return { checkIn, checkOut, nights };
}

function getOverlappingBookingQuery({
  listingId,
  checkIn,
  checkOut,
  now = new Date(),
  excludeBookingId,
}) {
  const query = {
    listing: listingId,
    status: { $in: ["payment_pending", "confirmed"] },
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn },
    $or: [
      { status: "confirmed" },
      { paymentExpiresAt: null },
      { paymentExpiresAt: { $gt: now } },
    ],
  };

  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }
  return query;
}

module.exports = { getBookingPeriod, getOverlappingBookingQuery };
