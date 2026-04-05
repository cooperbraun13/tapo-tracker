"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "@/components/Layout";

export default function TabsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <Layout>
      <AnimatePresence mode="wait">
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </Layout>
  );
}
