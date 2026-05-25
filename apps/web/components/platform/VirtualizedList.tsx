"use client";

import { useRef, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

type Props<T> = {
  items: T[];
  estimateSize?: number;
  className?: string;
  renderRow: (item: T, index: number) => ReactNode;
};

/** Windowed list for 50+ rows — keeps DOM node count bounded at scale. */
export function VirtualizedList<T>({
  items,
  estimateSize = 72,
  className,
  renderRow
}: Props<T>): JSX.Element {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 8
  });

  return (
    <div ref={parentRef} className={className ?? "max-h-[min(70vh,640px)] overflow-y-auto"}>
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative"
        }}
      >
        {virtualizer.getVirtualItems().map((vRow) => (
          <div
            key={vRow.key}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              transform: `translateY(${vRow.start}px)`
            }}
          >
            {renderRow(items[vRow.index]!, vRow.index)}
          </div>
        ))}
      </div>
    </div>
  );
}
