import type { CSSProperties, ReactNode } from "react";
import { BottomNav } from "@/components/navigation";
import styles from "./AppShell.module.css";

type AppShellProps = {
  children: ReactNode;
  maxWidth?: "mobile" | "desktop" | "full";
  variant?: "default" | "auth" | "plain";
  withBottomPadding?: boolean;
  withBottomNav?: boolean;
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
  withBottomNav = false,
  className,
}: AppShellProps) {
  const shellStyle = {
    "--sd-page-max": maxWidth === "mobile" ? "var(--sd-mobile-max)" : "var(--sd-content-max)",
    "--sd-desktop-max": maxWidth === "full" ? "none" : "var(--sd-content-max)",
  } as CSSProperties;

  return (
    <main
      style={shellStyle}
      className={cx(
        "page-shell",
        `page-shell--${maxWidth}`,
        `page-shell--${variant}`,
        withBottomNav && "with-bottom-nav",
        styles.shell,
        styles[maxWidth],
        styles[variant],
        withBottomPadding && styles.withBottomPadding,
        withBottomNav && styles.withBottomNav,
        className
      )}
    >
      {children}
      {withBottomNav ? <BottomNav /> : null}
    </main>
  );
}
