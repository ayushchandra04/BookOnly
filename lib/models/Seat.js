import mongoose, { Schema } from "mongoose";

// One document per physical seat per event. Keeping seats as top-level
// documents (rather than an array embedded in Event) is what makes
// findOneAndUpdate a true atomic compare-and-swap for holds/bookings —
// MongoDB only guarantees atomicity within a single document.
const SeatSchema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    row: { type: Number, required: true },
    col: { type: Number, required: true },
    label: { type: String, required: true },
    category: { type: String, required: true },
    status: {
      type: String,
      enum: ["available", "held", "offered", "booked"],
      default: "available",
      required: true,
    },
    heldBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    holdExpiresAt: { type: Date, default: null },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", default: null },
    waitlistEntryId: { type: Schema.Types.ObjectId, ref: "WaitlistEntry", default: null },
  },
  { timestamps: true }
);

SeatSchema.index({ eventId: 1, label: 1 }, { unique: true });
SeatSchema.index({ eventId: 1, status: 1 });
SeatSchema.index({ status: 1, holdExpiresAt: 1 });

export const Seat = mongoose.models.Seat || mongoose.model("Seat", SeatSchema);
