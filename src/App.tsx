import { useCallback, useEffect, useState } from "react";
import { AuthProvider, useAuth } from "./auth";
import { AuthScreen } from "./AuthScreen";
import { Landing } from "./Landing";
import { CreateBridge } from "./shell/CreateBridge";
import { SpaceProvider, useSpace } from "./shell/SpaceContext";
import { writeLocalPreferredSpace, type InklystSpace } from "./shell/space";
import "./shell/shell.css";
import "./landing.css";
import "./spaces/studio/styles.css";
import { ReaderSpace } from "./spaces/reader/ReaderSpace";
import { StudioSpace } from "./spaces/studio/StudioSpace";
import { ThemeProvider } from "./theme";

export function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AuthedApp />
      </AuthProvider>
    </ThemeProvider>
  );
}

function AuthedApp() {
  const { ready, configured, session, user, profile } = useAuth();
  const [gate, setGate] = useState<"landing" | "auth-in" | "auth-up" | "local">("landing");

  if (!ready) {
    return (
      <main className="auth-screen">
        <p className="fine">A carregar…</p>
      </main>
    );
  }

  if (configured && !session) {
    if (gate === "auth-in" || gate === "auth-up") {
      return (
        <AuthScreen
          initialMode={gate === "auth-up" ? "up" : "in"}
          onBack={() => setGate("landing")}
        />
      );
    }
    return (
      <Landing
        onEnter={(mode = "up") => setGate(mode === "in" ? "auth-in" : "auth-up")}
      />
    );
  }

  if (!configured && gate === "landing") {
    return <Landing local onEnter={() => setGate("local")} />;
  }

  const preferred = (profile?.preferred_space ?? null) as InklystSpace | null;

  return (
    <SpaceProvider preferred={preferred}>
      <InklystShell cloudUserId={configured ? user?.id ?? null : null} />
    </SpaceProvider>
  );
}

function InklystShell({ cloudUserId }: { cloudUserId: string | null }) {
  const { space, setSpace, openReaderEdition, createBridgeOpen, closeCreateBridge, openCreateBridge } =
    useSpace();
  const { savePreferredSpace } = useAuth();

  const persistSpace = useCallback(
    (next: InklystSpace) => {
      writeLocalPreferredSpace(next);
      void savePreferredSpace(next);
    },
    [savePreferredSpace],
  );

  useEffect(() => {
    function onOpenEdition(event: Event) {
      const detail = (event as CustomEvent<{ editionId: string }>).detail;
      if (!detail?.editionId) return;
      openReaderEdition(detail.editionId);
      persistSpace("reader");
    }
    window.addEventListener("inklyst:open-reader-edition", onOpenEdition);
    return () => window.removeEventListener("inklyst:open-reader-edition", onOpenEdition);
  }, [openReaderEdition, persistSpace]);

  return (
    <>
      {space === "reader" ? (
        <ReaderSpace onOpenCreate={openCreateBridge} />
      ) : (
        <StudioSpace cloudUserId={cloudUserId} />
      )}
      <CreateBridge
        open={createBridgeOpen}
        onClose={closeCreateBridge}
        onCreate={() => {
          setSpace("studio", { persist: true });
          persistSpace("studio");
          window.setTimeout(() => {
            window.dispatchEvent(new CustomEvent("inklyst:start-first-story"));
          }, 50);
        }}
      />
    </>
  );
}
