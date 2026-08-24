import mongoose, { Schema } from "mongoose";

const CategoryPricingSchema = new Schema(
  {
    category: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const EventSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    posterUrl: { type: String, default: "" }, // optional https image URL; falls back to a generated gradient
    type: { type: String, enum: ["movie", "concert"], required: true },
    organiserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    venueId: { type: Schema.Types.ObjectId, ref: "Venue", required: true },
    date: { type: String, required: true }, // YYYY-MM-DD
    time: { type: String, required: true }, // HH:mm
    categoryPricing: { type: [CategoryPricingSchema], required: true },
    status: { type: String, enum: ["scheduled", "cancelled"], default: "scheduled" },
  },
  { timestamps: true }
);

EventSchema.index({ date: 1, type: 1 });

export const Event = mongoose.models.Event || mongoose.model("Event", EventSchema);
