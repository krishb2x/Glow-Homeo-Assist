"use client";

import { createContext, useContext } from "react";

type StepLayout = {
  /** Focused workspace — flat forms without nested cards. */
  bare: boolean;
};

const StepLayoutContext = createContext<StepLayout>({ bare: false });

export function StepLayoutProvider({
  bare,
  children
}: {
  bare: boolean;
  children: React.ReactNode;
}): JSX.Element {
  return <StepLayoutContext.Provider value={{ bare }}>{children}</StepLayoutContext.Provider>;
}

export function useStepLayout(): StepLayout {
  return useContext(StepLayoutContext);
}
