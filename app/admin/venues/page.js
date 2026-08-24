import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { Venue } from "@/lib/models";
import DeleteVenueButton from "@/components/DeleteVenueButton";

export const dynamic = "force-dynamic";

export default async function AdminVenuesPage() {
  const session = await getSession();
  if (!session || session.role !== "admin") redirect("/login?redirect=/admin/venues");

  await connectDB();
  const venues = await Venue.find().sort({ createdAt: -1 }).lean();

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Venues</h1>
        <Link href="/admin/venues/new" className="btn-primary">
          + New venue
        </Link>
      </div>

      {venues.length === 0 && (
        <div className="card py-12 text-center">
          <p className="muted">No venues yet — create your first one.</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {venues.map((v) => (
          <div key={v._id} className="card card-hover flex items-center justify-between">
            <div>
              <p className="font-semibold">{v.name}</p>
              <p className="text-sm muted">{v.address}</p>
              <p className="mt-2 flex flex-wrap gap-1.5">
                <span className="badge">{v.layout.seats.length} seats</span>
                {v.categories.map((c) => (
                  <span key={c} className="badge badge-accent">{c}</span>
                ))}
              </p>
            </div>
            <DeleteVenueButton venueId={String(v._id)} />
          </div>
        ))}
      </div>
    </div>
  );
}
