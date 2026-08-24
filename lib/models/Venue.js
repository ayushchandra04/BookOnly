import mongoose, { Schema } from "mongoose";

const SeatTemplateSchema = new Schema(
  {
    row: { type: Number, required: true },
    col: { type: Number, required: true },
    label: { type: String, required: true },
    category: { type: String, required: true },
  },
  { _id: false }
);

const VenueSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    categories: { type: [String], required: true },
    layout: {
      rows: { type: Number, required: true },
      cols: { type: Number, required: true },
      seats: { type: [SeatTemplateSchema], required: true },
    },
  },
  { timestamps: true }
);

export const Venue = mongoose.models.Venue || mongoose.model("Venue", VenueSchema);
