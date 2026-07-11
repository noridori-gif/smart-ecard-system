"use client";

import { useEffect, useState } from "react";
import Card from "@/components/Card";
import {
  getDashboardStats,
  type DashboardStats,
} from "@/services/dashboardService";

const initialStats: DashboardStats = {
  totalEvents: 0,
  totalGuests: 0,
  checkedIn: 0,
  pending: 0,
  viewed: 0,
  accepted: 0,
  maybe: 0,
  declined: 0,
};

export default function DashboardPage() {
  const [stats, setStats] =
    useState<DashboardStats>(initialStats);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadDashboardStats() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const data = await getDashboardStats();

        setStats(data);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Dashboard statistics hazikuweza kupatikana."
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardStats();
  }, []);

  return (
    <section>
      <div>
        <h1 className="text-4xl font-bold text-blue-700">
          Dashboard
        </h1>

        <p className="mt-2 text-gray-600">
          Welcome to Smart Event Pass
        </p>
      </div>

      {errorMessage && (
        <div className="mt-6 rounded-lg bg-red-50 p-4 text-red-700">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="mt-8 rounded-xl bg-white p-8 text-gray-500 shadow-md">
          Loading dashboard statistics...
        </div>
      ) : (
        <>
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <Card
              title="Total Events"
              value={stats.totalEvents}
            />

            <Card
              title="Total Guests"
              value={stats.totalGuests}
            />

            <Card
              title="Checked In"
              value={stats.checkedIn}
            />

            <Card
              title="Pending Check-In"
              value={stats.pending}
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
            <Card
              title="Invitations Viewed"
              value={stats.viewed}
            />

            <Card
              title="RSVP Accepted"
              value={stats.accepted}
            />

            <Card
              title="RSVP Maybe"
              value={stats.maybe}
            />

            <Card
              title="RSVP Declined"
              value={stats.declined}
            />
          </div>

          <div className="mt-8 rounded-xl bg-white p-6 shadow-md">
            <h2 className="text-xl font-bold text-gray-800">
              Attendance Summary
            </h2>

            <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl bg-blue-50 p-5">
                <p className="text-sm font-medium text-blue-700">
                  Total Guests
                </p>

                <p className="mt-2 text-3xl font-bold text-blue-900">
                  {stats.totalGuests}
                </p>
              </div>

              <div className="rounded-xl bg-emerald-50 p-5">
                <p className="text-sm font-medium text-emerald-700">
                  Checked In
                </p>

                <p className="mt-2 text-3xl font-bold text-emerald-900">
                  {stats.checkedIn}
                </p>
              </div>

              <div className="rounded-xl bg-amber-50 p-5">
                <p className="text-sm font-medium text-amber-700">
                  Remaining
                </p>

                <p className="mt-2 text-3xl font-bold text-amber-900">
                  {stats.pending}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <div className="mb-2 flex items-center justify-between text-sm text-gray-600">
                <span>Check-in Progress</span>

                <span>
                  {stats.totalGuests > 0
                    ? Math.round(
                        (stats.checkedIn / stats.totalGuests) *
                          100
                      )
                    : 0}
                  %
                </span>
              </div>

              <div className="h-3 overflow-hidden rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-emerald-600 transition-all"
                  style={{
                    width: `${
                      stats.totalGuests > 0
                        ? Math.round(
                            (stats.checkedIn /
                              stats.totalGuests) *
                              100
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}