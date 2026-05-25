"use client";

type Props = {
  /** Full Jitsi room URL (e.g. https://meet.jit.si/RoomName#userInfo.displayName=...) */
  roomUrl: string;
  title?: string;
  className?: string;
};

/** Embeds Jitsi Meet in an iframe — works on mobile and desktop without extra SDK setup. */
export function JitsiMeetEmbed({ roomUrl, title = "Video consultation", className }: Props): JSX.Element {
  return (
    <iframe
      src={roomUrl}
      title={title}
      allow="camera; microphone; fullscreen; display-capture; autoplay"
      className={className ?? "h-full w-full border-0"}
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}
