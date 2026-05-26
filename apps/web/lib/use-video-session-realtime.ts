"use client";

import { useRealtimeChannel } from "./use-realtime-channel";

type VideoSessionRow = {
  id?: string;
  status?: string;
  patient_waiting_since?: string | null;
  patient_joined_at?: string | null;
  doctor_joined_at?: string | null;
};

type Options = {
  consultationId: string;
  videoSessionId: string | null;
  enabled?: boolean;
  onChange: (row: VideoSessionRow) => void;
};

/** Subscribe to video_sessions changes for waiting-room / live state sync. */
export function useVideoSessionRealtime({
  consultationId,
  videoSessionId,
  enabled = true,
  onChange
}: Options): void {
  useRealtimeChannel<VideoSessionRow>({
    enabled: enabled && Boolean(videoSessionId),
    table: "video_sessions",
    filter: videoSessionId ? `id=eq.${videoSessionId}` : undefined,
    channelKey: `video-session:${consultationId}`,
    onChange: ({ new: row }) => {
      if (row) onChange(row);
    }
  });
}
