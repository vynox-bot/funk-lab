"use client";

import { SessionProvider } from "next-auth/react";
import { PlayerProvider, usePlayer } from "@/lib/player-context";
import { PlayerBar } from "@/components/PlayerBar";
import { ThemeProvider } from "@/lib/theme-context";
import { ThemePanel } from "@/components/ThemePanel";

function PlayerSpacer() {
  const { currentTrack } = usePlayer();
  return currentTrack ? <div className="h-[72px]" /> : null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider>
        <PlayerProvider>
          {children}
          <PlayerSpacer />
          <PlayerBar />
          <ThemePanel />
        </PlayerProvider>
      </ThemeProvider>
    </SessionProvider>
  );
}
