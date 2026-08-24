import SeatMap from "@/components/SeatMap";

export default async function SeatsPage({ params }) {
  const { id } = await params;
  return <SeatMap eventId={id} />;
}
