import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import type { Game, Obstacle } from '../types'
import { SPRITES } from './sheet'
import type { SpriteName } from './sheet'

// Tuning. One tick is 100 ms, the fastest the band redraws.
const CONFIG = {
  tickMs: 100,
  gravity: 3,
  jumpVelocity: 17,
  startSpeed: 12,
  maxSpeed: 24,
  speedUpPerTick: 0.012,
  duckTicks: 6,
  birdsAfter: 200,
  seed: 1234,
  hitboxInset: 4,
}

const W = 600
const H = 130
const GROUND_Y = 108
const PLAYER_X = 56

const start: Game = {
  isOn: false, y: 0, vy: 0, ox: W, kind: 'cactus', tick: 0, best: 0,
  duck: 0, seed: CONFIG.seed, isOver: false, isRunning: false,
}
const game = atom({ plugin: 'dino-runner-band', key: 'game' } as const, start)
const norm = (g: Game): Game => ({ ...start, ...g })

const size = (name: SpriteName) => ({ w: SPRITES[name].w, h: SPRITES[name].h })
const rng = (seed: number) => {
  const next = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff
  return { next, r: next / 0x7fffffff }
}

const playerSprite = (g: Game): SpriteName =>
  g.duck > 0 ? (g.tick % 2 === 0 ? 'duck1' : 'duck2')
  : g.y > 0 ? 'jump'
  : g.tick % 2 === 0 ? 'run1' : 'run2'

const obstacleSprite = (g: Game): SpriteName =>
  g.kind === 'bird-low' || g.kind === 'bird-mid' ? (g.tick % 4 < 2 ? 'bird1' : 'bird2') : g.kind

// Height of an obstacle's bottom edge above the ground
const lift = (kind: Obstacle) => (kind === 'bird-low' ? 4 : kind === 'bird-mid' ? 30 : 0)

const step = (g: Game): Game => {
  if (!g.isRunning || g.isOver) return g
  const duck = Math.max(0, g.duck - 1)
  let y = g.y + g.vy
  let vy = g.vy - CONFIG.gravity
  if (y <= 0) { y = 0; vy = 0 }
  const speed = Math.min(CONFIG.maxSpeed, CONFIG.startSpeed + g.tick * CONFIG.speedUpPerTick)
  let ox = g.ox - speed
  let kind = g.kind
  let seed = g.seed
  if (ox < -size('cactus2').w) {
    const a = rng(seed)
    const b = rng(a.next)
    const c = rng(b.next)
    seed = c.next
    const score = Math.floor(g.tick / 2)
    kind = score > CONFIG.birdsAfter && a.r < 0.3 ? (b.r < 0.5 ? 'bird-low' : 'bird-mid') : a.r > 0.75 ? 'cactus2' : 'cactus'
    ox = W + 80 + c.r * 260
  }
  const tick = g.tick + 1
  const next = { ...g, y, vy, ox, kind, seed, duck, tick }

  // Hit test: player box against obstacle box, both shrunk by the inset
  const p = size(playerSprite(next))
  const o = size(obstacleSprite(next))
  const i = CONFIG.hitboxInset
  const pl = PLAYER_X + i
  const pr = PLAYER_X + p.w - i
  const pb = y
  const pt = y + p.h - i
  const ol = ox + i
  const or = ox + o.w - i
  const ob = lift(kind)
  const ot = ob + o.h - i
  const isHit = pl < or && pr > ol && pb < ot && pt > ob
  return isHit ? { ...next, isOver: true, best: Math.max(g.best, Math.floor(tick / 2)) } : next
}

// One sprite: its vector paths, placed in the scene
const sprite = (name: SpriteName, x: number, bottom: number) => {
  const { h, paths } = SPRITES[name]
  return (
    `<g transform="translate(${Math.round(x)} ${Math.round(GROUND_Y - bottom - h)})">` +
    paths.map(p => `<path fill="${p.fill}" d="${p.d}"/>`).join('') +
    `</g>`
  )
}

const scene = (g: Game) => {
  const score = Math.floor(g.tick / 2)
  const isNight = Math.floor(score / 700) % 2 === 1
  const bg = isNight ? '#202124' : '#f7f7f7'
  const fg = isNight ? '#e8eaed' : '#535353'
  const pad = (n: number) => String(n).padStart(5, '0')
  const text = (y: number, size: number, s: string) =>
    `<text x="${W / 2}" y="${y}" font-family="monospace" font-size="${size}" font-weight="bold" fill="${fg}" text-anchor="middle">${s}</text>`
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">` +
    `<rect width="${W}" height="${H}" fill="${bg}"/>` +
    `<g>` +
    `<line x1="0" y1="${GROUND_Y + 1}" x2="${W}" y2="${GROUND_Y + 1}" stroke="#535353" stroke-width="2"/>` +
    sprite(playerSprite(g), PLAYER_X, g.y) +
    (g.isRunning || g.isOver ? sprite(obstacleSprite(g), g.ox, lift(g.kind)) : '') +
    `</g>` +
    `<text x="${W - 12}" y="18" font-family="monospace" font-size="13" font-weight="bold" fill="${fg}" text-anchor="end">HI ${pad(g.best)}  ${pad(score)}</text>` +
    (g.isOver ? text(58, 18, 'GAME OVER') : !g.isRunning ? text(58, 15, 'Press Start') : '') +
    `</svg>`
  )
}

const act = (action: string) => (g0: Game): Game => {
  const g = norm(g0)
  if (action === 'start' || (action === 'jump' && (!g.isRunning || g.isOver))) {
    return { ...start, isOn: true, best: g.best, isRunning: true }
  }
  if (!g.isRunning || g.isOver) return g
  if (action === 'jump' && g.y === 0) return { ...g, vy: CONFIG.jumpVelocity, duck: 0 }
  if (action === 'duck') return { ...g, duck: CONFIG.duckTicks, vy: g.y > 0 ? Math.min(g.vy, -8) : g.vy }
  return g
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    $.clock.every(CONFIG.tickMs, () =>
      update($, game, g0 => {
        const g = norm(g0)
        return g.isOn && g.isRunning && !g.isOver ? step(g) : g0
      }),
    )
    await $.command.register({ name: 'dino', description: 'Start, stop, show, or hide the dino game', argumentHint: '[start|stop|on|off]' })
    return next(e)
  })

  on('command.run', { command: 'dino' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (!['', 'start', 'stop', 'on', 'off'].includes(arg)) {
      return { text: 'Use /dino start, /dino stop, /dino on, or /dino off.' }
    }
    await update($, game, g0 => {
      const g = norm(g0)
      if (arg === 'start') return act('start')(g)
      if (arg === 'stop') return { ...start, isOn: g.isOn, best: g.best }
      return { ...g, isOn: arg === 'on' ? true : arg === 'off' ? false : !g.isOn }
    })
    const g = norm(await read($, game))
    return { text: arg === 'start' ? 'Game started. Click the keyboard instruction line for keyboard controls.'
      : arg === 'stop' ? 'Game stopped. Run /dino start to play again.'
      : g.isOn ? 'Dino shown. Run /dino start to play.' : 'Dino hidden and paused. Run /dino on to show it again.' }
  })

  // Keys arrive from the Client in keys.tsx
  on('ui.message', async ($, e, next) => {
    if (e.element !== 'runner-keys') return next(e)
    const data = e.data as { action?: string } | null
    if (data?.action) await update($, game, act(data.action))
    return {}
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const g = norm(await read($, game))
    if (!g.isOn || e.props.hasSurvey) return next(e)
    const { Box, Text, Button, Svg, Client } = $.ui.resolve(e) as any
    const below = await next(e)
    if (e.surface !== 'desktop') {
      return (
        <Box flexDirection="column">
          <Text>Dino needs the Claude desktop app.</Text>
          {below}
        </Box>
      )
    }
    return (
      <Box flexDirection="column">
        <Svg source={scene(g)} alt={`Runner, score ${Math.floor(g.tick / 2)}`} width={600} />
        <Box flexDirection="row" gap={1}>
          <Button key="jump" label="Jump" onPress={() => update($, game, act('jump'))} />
          <Button key="duck" label="Duck" onPress={() => update($, game, act('duck'))} />
          <Button key="start" label={g.isRunning ? 'Restart' : 'Start'} onPress={() => update($, game, act('start'))} />
        </Box>
        <Client key="runner-keys" module="./keys.tsx" />
        {below}
      </Box>
    )
  })
}
