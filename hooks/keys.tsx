// Keyboard listener for the runner. Draws one line of text; once clicked it
// holds the focus, and each key posts a small message to the hooks module.
// It has no `$`: posting is its only way out.

type Surface = {
  elements: { Text: (p: { children: string; dimColor?: boolean }) => unknown }
  state: boolean | undefined
  setState: (next: boolean) => void
  onKey: (fn: (event: { key: string }) => void) => () => void
  post: (data: { action: string }) => void
}

export default function RunnerKeys(_props: unknown, s: Surface) {
  if (s.state === undefined) {
    s.onKey(event => {
      // Chrome's keys: Space or Up jumps, Down ducks, Enter restarts after a crash.
      // Space can arrive as the character or by name.
      const k = event.key.toLowerCase()
      if (k === ' ' || k === 'space' || k === 'up') s.post({ action: 'jump' })
      else if (k === 'down') s.post({ action: 'duck' })
      else if (k === 'return' || k === 'enter') s.post({ action: 'restart' })
    })
    s.setState(true)
  }
  return s.elements.Text({
    children: 'Click here, then: Space or Up = jump, Down = duck, Enter = restart. Esc gives the keys back.',
    dimColor: true,
  })
}
