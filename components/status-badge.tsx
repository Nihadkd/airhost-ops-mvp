export function StatusBadge({ status }: { status: "PENDING" | "IN_PROGRESS" | "COMPLETED" }) {
  if (status === "COMPLETED") return <span className="badge badge-completed">Fullfort</span>;
  if (status === "IN_PROGRESS") return <span className="badge badge-progress">Pa gar</span>;
  return <span className="badge badge-pending">Venter</span>;
}