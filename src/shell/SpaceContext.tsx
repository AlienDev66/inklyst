import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  pushSpaceUrl,
  readEditionFromUrl,
  resolveInitialSpace,
  writeLocalPreferredSpace,
  type InklystSpace,
} from "./space";

type SpaceState = {
  space: InklystSpace;
  editionId: string;
  setSpace: (space: InklystSpace, opts?: { edition?: string; persist?: boolean }) => void;
  openReaderEdition: (editionId: string) => void;
  openCreateBridge: () => void;
  createBridgeOpen: boolean;
  closeCreateBridge: () => void;
};

const SpaceContext = createContext<SpaceState | null>(null);

export function SpaceProvider({
  children,
  preferred,
}: {
  children: ReactNode;
  preferred?: InklystSpace | null;
}) {
  const [space, setSpaceState] = useState<InklystSpace>(() => resolveInitialSpace(preferred));
  const [editionId, setEditionId] = useState(() => readEditionFromUrl());
  const [createBridgeOpen, setCreateBridgeOpen] = useState(false);

  useEffect(() => {
    pushSpaceUrl(space, { edition: space === "reader" ? editionId || undefined : undefined });
  }, [space, editionId]);

  const setSpace = useCallback(
    (next: InklystSpace, opts?: { edition?: string; persist?: boolean }) => {
      setSpaceState(next);
      if (opts?.edition !== undefined) setEditionId(opts.edition);
      else if (next === "studio") setEditionId("");
      if (opts?.persist !== false) writeLocalPreferredSpace(next);
    },
    [],
  );

  const openReaderEdition = useCallback((id: string) => {
    setEditionId(id);
    setSpaceState("reader");
    writeLocalPreferredSpace("reader");
  }, []);

  const value = useMemo<SpaceState>(
    () => ({
      space,
      editionId,
      setSpace,
      openReaderEdition,
      openCreateBridge: () => setCreateBridgeOpen(true),
      createBridgeOpen,
      closeCreateBridge: () => setCreateBridgeOpen(false),
    }),
    [space, editionId, setSpace, openReaderEdition, createBridgeOpen],
  );

  return <SpaceContext.Provider value={value}>{children}</SpaceContext.Provider>;
}

export function useSpace() {
  const ctx = useContext(SpaceContext);
  if (!ctx) throw new Error("useSpace must be used within SpaceProvider");
  return ctx;
}
