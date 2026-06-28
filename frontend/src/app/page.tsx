"use client";

import dynamic from "next/dynamic";

const KanbanBoard = dynamic(
  () => import("@/components/KanbanBoard").then((m) => ({ default: m.KanbanBoard })),
  { ssr: false }
);

export default function Home() {
  return <KanbanBoard />;
}
