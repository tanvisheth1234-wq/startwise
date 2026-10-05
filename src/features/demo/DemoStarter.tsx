"use client";
import { useEffect, useRef } from "react";
import { startDemo } from "./actions";

/** Kicks off the demo copy once; the server action redirects to the new plan. */
export function DemoStarter() {
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void startDemo();
  }, []);
  return null;
}
