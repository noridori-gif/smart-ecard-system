"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

type InvitationViewedTrackerProps = {
  invitationToken: string;
};

export default function InvitationViewedTracker({
  invitationToken,
}: InvitationViewedTrackerProps) {
  useEffect(() => {
    async function markAsViewed() {
      if (!invitationToken) {
        return;
      }

      const { error } = await supabase.rpc(
        "mark_invitation_viewed",
        {
          token_input: invitationToken,
        }
      );

      if (error) {
        console.error(
          "Failed to mark invitation as viewed:",
          error.message
        );
      }
    }

    markAsViewed();
  }, [invitationToken]);

  return null;
}