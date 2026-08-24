import mongoose, { Schema } from "mongoose";

const BookingSchema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    seatIds: [{ type: Schema.Types.ObjectId, ref: "Seat", required: true }],
    totalAmount: { type: Number, required: true, min: 0 },
    bookingRef: { type: String, required: true, unique: true },
    status: { type: String, enum: ["confirmed", "cancelled"], default: "confirmed" },
    source: {
      type: String,
      enum: ["direct", "waitlist"],
      default: "direct",
    },
  },
  { timestamps: true }
);

export const Booking = mongoose.models.Booking || mongoose.model("Booking", BookingSchema);
