"use client";

import { AppShell } from "@/components/layout";
import { Button, EmptyState, SectionHeader } from "@/components/ui";

export default function FavorisPage() {
  return (
    <AppShell maxWidth="desktop" withBottomNav>
      <div style={{ padding: "32px 0" }}>
        <SectionHeader
          title="Mes favoris"
          description="Retrouvez ici les annonces que vous souhaitez garder sous la main."
        />
      </div>

      <EmptyState
        title="Aucun favori pour le moment"
        description="Les annonces sauvegardées apparaîtront ici quand la fonctionnalité favoris sera branchée sur cette page."
      >
        <Button href="/" variant="soft">
          Explorer les annonces
        </Button>
      </EmptyState>
    </AppShell>
  );
}
