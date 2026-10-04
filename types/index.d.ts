export type Obstacle = 'cactus' | 'cactus2' | 'bird-low' | 'bird-mid'
export type Game = {
  isOn: boolean
  y: number
  vy: number
  ox: number
  kind: Obstacle
  tick: number
  best: number
  duck: number
  seed: number
  isOver: boolean
  isRunning: boolean
}

declare module 'claude-code' {
  interface PluginState {
    'runner-band': { game: Game }
  }
}
