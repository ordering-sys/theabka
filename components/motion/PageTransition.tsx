"use client";

import { motion } from "motion/react";

/**
 * Fade between routes (used from template.tsx files, which re-mount on navigation).
 * Opacity only: a transform here would break the fixed bottom bars while it runs.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      className="flex grow flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
