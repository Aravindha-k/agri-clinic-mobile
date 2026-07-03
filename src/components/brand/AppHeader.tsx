import { ReactNode } from "react";
import { StackScreenHeader } from "../../../mobile/components/layout/StackScreenHeader";

type Props = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
  showLogoMark?: boolean;
  large?: boolean;
  variant?: "brand" | "dark";
  includeSafeTop?: boolean;
};

/** @deprecated Use StackScreenHeader — kept for existing imports. */
export function AppHeader({ title, subtitle, onBack, right, includeSafeTop = true }: Props) {
  return (
    <StackScreenHeader
      title={title}
      subtitle={subtitle}
      onBack={onBack}
      right={right}
      includeSafeTop={includeSafeTop}
    />
  );
}
