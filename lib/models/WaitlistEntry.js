import mongoose, { Schema } from "mongoose";

const WaitlistEntrySchema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    category: { type: String, required: true },
    customerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["waiting", "offered", "expired", "booked", "cancelled"],
      default: "waiting",
      required: true,
    },
    offerToken: { type: String, default: null },
    offerSeatId: { type: Schema.Types.ObjectId, ref: "Seat", default: null },
    offerExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// createdAt (via timestamps) drives FIFO ordering within an event+category queue.
WaitlistEntrySchema.index({ eventId: 1, category: 1, status: 1, createdAt: 1 });
WaitlistEntrySchema.index({ offerToken: 1 });

export const WaitlistEntry =
  mongoose.models.WaitlistEntry || mongoose.model("WaitlistEntry", WaitlistEntrySchema);
