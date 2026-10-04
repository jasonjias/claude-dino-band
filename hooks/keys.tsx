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
      const k = event.key
      if (k === ' ' || k === 'up' || k === 'w') s.post({ action: 'jump' })
      else if (k === 'down' || k === 's') s.post({ action: 'duck' })
      else if (k === 'return' || k === 'r') s.post({ action: 'start' })
    })
    s.setState(true)
  }
  return s.elements.Text({
    children: 'Click here, then: Space or Up = jump, Down = duck, Enter = start. Esc gives the keys back.',
    dimColor: true,
  })
}
