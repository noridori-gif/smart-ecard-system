"use client";

import { useEffect, useState } from "react";
import {
  getAllInvitations,
  InvitationWithDetails,
} from "@/services/invitationService";

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<
    InvitationWithDetails[]
  >([]);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadInvitations() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const data = await getAllInvitations();

        setInvitations(data);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Failed to load invitations"
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadInvitations();
  }, []);

  return (
    <main className="p-8">
      <div className="rounded-xl bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-slate-900">
          Invitations
        </h1>

        <p className="mt-2 text-slate-500">
          Manage event invitations, sharing, and RSVP responses.
        </p>

        {errorMessage && (
          <div className="mt-6 rounded-lg bg-red-50 p-4 text-red-700">
            {errorMessage}
          </div>
        )}

        {isLoading ? (
          <div className="mt-8 rounded-lg border border-slate-200 p-8 text-center text-slate-500">
            Loading invitations...
          </div>
        ) : invitations.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed border-slate-300 p-10 text-center">
            <p className="text-lg font-medium text-slate-700">
              No invitations found.
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Add a new guest to generate an invitation automatically.
            </p>
          </div>
        ) : (
          <div className="mt-8 overflow-x-auto">
            <table className="min-w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-left">
                  <th className="px-4 py-3 text-sm font-semibold text-slate-700">
                    Guest
                  </th>

                  <th className="px-4 py-3 text-sm font-semibold text-slate-700">
                    Event
                  </th>

                  <th className="px-4 py-3 text-sm font-semibold text-slate-700">
                    Invitation Status
                  </th>

                  <th className="px-4 py-3 text-sm font-semibold text-slate-700">
                    RSVP Status
                  </th>

                  <th className="px-4 py-3 text-sm font-semibold text-slate-700">
                    Token
                  </th>
                </tr>
              </thead>

              <tbody>
                {invitations.map((invitation) => (
                  <tr
                    key={invitation.id}
                    className="border-b border-slate-100"
                  >
                    <td className="px-4 py-4 text-sm text-slate-800">
                      {invitation.guests?.full_name ?? "Unknown guest"}
                    </td>

                    <td className="px-4 py-4 text-sm text-slate-800">
                      {invitation.events?.title ?? "Unknown event"}
                    </td>

                    <td className="px-4 py-4 text-sm">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-blue-700">
                        {invitation.invitation_status}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-sm">
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-amber-700">
                        {invitation.rsvp_status}
                      </span>
                    </td>

                    <td className="max-w-xs truncate px-4 py-4 text-sm text-slate-500">
                      {invitation.invitation_token}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}