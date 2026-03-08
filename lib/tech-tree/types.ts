export type TechNode = {
  id: string
  name: string
  icon: string
  level: number
  maxLevel: number
  x: number
  y: number
  parents: string[]
  requirements?: {
    [techId: string]: number // techId -> required level
  }
  timeCost?: number // cost per level (in seconds)
  resourceCosts?: {
    [resourceType: string]: number // resource -> cost per level
  }
  power?: number // power per level
  mgePoints?: number // MGE points per level
}
