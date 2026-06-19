import { useEffect, useState, type ComponentType } from "react";

/** Loads field reminders after splash — avoids expo-notifications startup noise during intro. */
export function DeferredFieldReminderController() {
  const [Controller, setController] = useState<ComponentType | null>(null);

  useEffect(() => {
    void import("./FieldReminderController").then((mod) => {
      setController(() => mod.FieldReminderController);
    });
  }, []);

  if (!Controller) {
    return null;
  }

  return <Controller />;
}
