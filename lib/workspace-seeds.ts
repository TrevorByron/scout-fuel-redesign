export type WorkspaceOrgSeed = {
  id: string
  defaultName: string
  defaultLogoSrc: string
  subtitle?: string
  logoBackground?: "light" | "dark"
}

export const WORKSPACE_SEEDS: WorkspaceOrgSeed[] = [
  {
    id: "frontier",
    defaultName: "Frontier Trucking",
    defaultLogoSrc: "/logos/frontier-trucking.png",
    subtitle: "Fuel Management",
    logoBackground: "dark",
  },
  {
    id: "brink",
    defaultName: "Brink Truck Lines",
    defaultLogoSrc: "/logos/brink-truck-lines.png",
    subtitle: "Fuel Management",
    logoBackground: "light",
  },
  {
    id: "jfw",
    defaultName: "JFW Trucking",
    defaultLogoSrc: "/logos/jfw-trucking.png",
    subtitle: "Fuel Management",
    logoBackground: "light",
  },
]

export function getWorkspaceSeed(id: string): WorkspaceOrgSeed | undefined {
  return WORKSPACE_SEEDS.find((s) => s.id === id)
}
