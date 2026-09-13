export type CheckInIconName =
  | "camera"
  | "pass"
  | "success"
  | "warning"
  | "error"
  | "users"
  | "ticket"
  | "clock"
  | "back"
  | "flash"
  | "flashOff"
  | "gallery"
  | "refresh"
  | "calendar"
  | "pin"
  | "chevronDown"
  | "logout";

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
    back: <path d="M15 18l-6-6 6-6" />,
    flash: <path d="M13 2 3 14h7l-1 8 11-14h-7z" />,
    flashOff: <><path d="M13 2 3 14h7l-1 8 11-14h-7z" opacity={0.45} /><path d="M4 4l16 16" /></>,
    gallery: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="10.5" r="1.5" /><path d="M21 15l-5-5-4 4-2-2-5 5" /></>,
    refresh: <><path d="M4 4v5h5" /><path d="M20 20v-5h-5" /><path d="M5.5 9a7 7 0 0 1 12-3.5L20 8" /><path d="M18.5 15a7 7 0 0 1-12 3.5L4 16" /></>,
    calendar: <><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></>,
    pin: <><path d="M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
    chevronDown: <path d="m6 9 6 6 6-6" />,
    logout: <><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M14 4h5a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-5" /></>,
  };
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
