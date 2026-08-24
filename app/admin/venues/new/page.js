import VenueLayoutBuilder from "@/components/VenueLayoutBuilder";

export default function NewVenuePage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">Create venue</h1>
      <VenueLayoutBuilder />
    </div>
  );
}
