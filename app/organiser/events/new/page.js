import CreateEventForm from "@/components/CreateEventForm";

export default function NewEventPage() {
  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">Create event</h1>
      <CreateEventForm />
    </div>
  );
}
