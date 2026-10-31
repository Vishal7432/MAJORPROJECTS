const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    listing: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
    },
    guest: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    checkIn: {
      type: Date,
      required: true,
    },
    checkOut: {
      type: Date,
      required: true,
    },
    nights: {
      type: Number,
      required: true,
      min: 1,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0.01,
    },
    status: {
      type: String,
      enum: ["pending", "payment_pending", "confirmed", "rejected", "expired"],
      default: "pending",
      required: true,
    },
    approvedAt: Date,
    paymentExpiresAt: Date,
    razorpayOrderId: String,
    razorpayPaymentId: String,
  },
  { timestamps: true }
);

bookingSchema.index({ listing: 1, status: 1, checkIn: 1, checkOut: 1 });
bookingSchema.index({ guest: 1, createdAt: -1 });

module.exports = mongoose.model("Booking", bookingSchema);
