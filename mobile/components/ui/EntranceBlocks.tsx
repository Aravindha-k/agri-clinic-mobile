import { Children, type ReactNode } from "react";
import {
  FadeInSection,
  entranceListStagger,
  entranceStagger
} from "./FadeInSection";

type Props = {
  replayKey: number | string;
  startStep?: number;
  variant?: "section" | "card";
  /** Tighter stagger for list rows inside one section. */
  listStyle?: boolean;
  children: ReactNode;
};

/** Stagger children top-to-bottom with the same smooth landing as Home. */
export function EntranceBlocks({
  replayKey,
  startStep = 0,
  variant = "section",
  listStyle = false,
  children
}: Props) {
  const items = Children.toArray(children).filter(Boolean);

  return (
    <>
      {items.map((child, index) => (
        <FadeInSection
          key={listStyle ? `list-${index}` : `block-${index}`}
          replayKey={replayKey}
          delay={
            listStyle ? entranceListStagger(startStep, index) : entranceStagger(startStep + index)
          }
          variant={variant === "card" || index > 0 ? "card" : "section"}
        >
          {child}
        </FadeInSection>
      ))}
    </>
  );
}
