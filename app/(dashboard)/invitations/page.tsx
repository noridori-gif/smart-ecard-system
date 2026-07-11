export default function InvitationsPage() {
  return (
    <main className="p-8">
      <div className="rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">
          Invitations
        </h1>

        <p className="mt-2 text-slate-500">
          Manage event invitations, sharing, and RSVP responses.
        </p>

        <div className="mt-8 rounded-lg border border-dashed border-slate-300 p-10 text-center">
          <p className="text-lg font-medium text-slate-700">
            Invitation System is ready for setup.
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Invitations created for guests will appear here.
          </p>
        </div>
      </div>
    </main>
  );
}