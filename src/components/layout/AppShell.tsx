import type { ReactNode } from "react";
import styles from "./AppShell.module.css";

type AppShellProps = {
  children: ReactNode;
  maxWidth?: "mobile" | "desktop" | "full";
  variant?: "default" | "auth" | "plain";
  withBottomPadding?: boolean;
  className?: string;
};

function cx(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function AppShell({
  children,
  maxWidth = "mobile",
  variant = "default",
  withBottomPadding = true,
  className,
}: AppShellProps) {
  return (
    <main
      className={cx(
        styles.shell,
        styles[maxWidth],
        styles[variant],
        withBottomPadding && styles.withBottomPadding,
        className
      )}
    >
      {children}
    </main>
  );
}
