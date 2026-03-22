"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { HugeiconsIcon } from "@hugeicons/react";
import { PaintBoardIcon } from "@hugeicons/core-free-icons";
import { useStyle } from "@/components/style-provider";

const STYLES = [
  { id: "1" as const, label: "Style 1", swatchVar: "var(--swatch-1)" },
  { id: "2" as const, label: "Style 2", swatchVar: "var(--swatch-2)" },
  { id: "3" as const, label: "Style 3", swatchVar: "var(--swatch-3)" },
  { id: "4" as const, label: "Style 4", swatchVar: "var(--swatch-4)" },
  { id: "5" as const, label: "Uber", swatchVar: "var(--swatch-5)" },
] as const;

export function StyleSwitcher({ inline }: { inline?: boolean } = {}) {
  const { style, setStyle } = useStyle();
  const { isMobile } = useSidebar();
  const currentStyle = STYLES.find((s) => s.id === style) ?? STYLES[4];

  const menuItem = (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<SidebarMenuButton size="sm" tooltip="UI Style" />}
        >
          <HugeiconsIcon icon={PaintBoardIcon} strokeWidth={2} />
          <span>UI Style</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="w-auto min-w-[10rem] rounded-lg border-sidebar-border p-1.5 shadow-lg"
          align="start"
          side={isMobile ? "bottom" : "right"}
          sideOffset={4}
        >
          <DropdownMenuGroup className="flex flex-col gap-0.5">
            <DropdownMenuLabel className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Style template
            </DropdownMenuLabel>
            {STYLES.map(({ id, label, swatchVar }) => (
              <DropdownMenuItem
                key={id}
                onClick={() => setStyle(id)}
                className="gap-2 rounded-md px-2 py-2"
              >
                <span
                  className="size-3 shrink-0 rounded-sm border border-border/80"
                  style={{ backgroundColor: swatchVar }}
                  aria-hidden
                />
                <span className="truncate font-medium">{label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );

  if (inline) {
    return menuItem;
  }

  return <SidebarMenu>{menuItem}</SidebarMenu>;
}
