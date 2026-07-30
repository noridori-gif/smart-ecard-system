export type CheckInIconName =
  | "camera"
  | "pass"
  | "success"
  | "warning"
  | "error"
  | "users"
  | "ticket"
  | "clock";

export default function CheckInIcon({
  name,
  className = "h-6 w-6",
}: {
  name: CheckInIconName;
  className?: string;
}) {
  const paths: Record<CheckInIconName, React.ReactNode> = {
    camera: <><path d="M4 7h4l2-2h4l2 2h4v12H4z" /><circle cx="12" cy="13" r="4" /></>,
    pass: <><path d="M4 6h16v12H4z" /><path d="M8 10h8M8 14h5" /></>,
    success: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
    warning: <><path d="M12 3 2.5 20h19z" /><path d="M12 9v5M12 17h.01" /></>,
    error: <><circle cx="12" cy="12" r="9" /><path d="m8 8 8 8M16 8l-8 8" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    ticket: <><path d="M3 7a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-3a2 2 0 0 0 0-4z" /><path d="M13 5v14" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  };
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
