// Cracked-glass overlay: the page reads as if seen through a shattered pane.
// Purely decorative — fixed to the viewport, ignores pointer events, hidden from AT.
(() => {
  const NS = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(NS, 'svg')
  svg.setAttribute('class', 'shatter')
  svg.setAttribute('aria-hidden', 'true')
  document.body.appendChild(svg)

  // Seeded PRNG so the cracks look the same on every load and resize.
  const rng = (seed) => () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  const el = (name, attrs) => {
    const node = document.createElementNS(NS, name)
    for (const k in attrs) {
      node.setAttribute(k, attrs[k])
    }
    return node
  }

  const pts = (list) => list.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')

  // One impact: jagged radial rays plus partial concentric rings between them.
  const impact = (g, defs, cx, cy, reach, rays, rings, rand, id) => {
    const angles = []
    for (let i = 0; i < rays; i++) {
      angles.push(((i + rand() * 0.7) / rays) * Math.PI * 2)
    }

    // Each ray is a jittered polyline sampled at growing radii.
    const radii = []
    let r = reach * 0.025
    while (r < reach) {
      radii.push(r)
      r *= 1.35 + rand() * 0.25
    }
    radii.push(reach)

    const rayPts = angles.map((a) => {
      let drift = 0
      return radii.map((rad) => {
        drift += (rand() - 0.5) * 0.12
        return [cx + Math.cos(a + drift) * rad, cy + Math.sin(a + drift) * rad]
      })
    })

    // Faceted shards between rays and rings catch the light differently.
    const ringIdx = []
    for (let k = 0; k < rings && k < radii.length - 1; k++) {
      ringIdx.push(Math.min(radii.length - 1, 1 + Math.floor(k * 1.4 + rand())))
    }
    const grad = el('radialGradient', { id: `glint-${id}`, cx, cy, r: reach * 0.6, gradientUnits: 'userSpaceOnUse' })
    grad.appendChild(el('stop', { offset: '0', 'stop-color': '#fff', 'stop-opacity': '0.1' }))
    grad.appendChild(el('stop', { offset: '1', 'stop-color': '#fff', 'stop-opacity': '0' }))
    defs.appendChild(grad)

    for (let i = 0; i < rays; i++) {
      const a = rayPts[i]
      const b = rayPts[(i + 1) % rays]
      let prev = 0
      for (const k of [...ringIdx, radii.length - 1]) {
        if (k <= prev) {
          continue
        }
        const poly = [a[prev], a[k], b[k], b[prev]]
        const o = rand()
        if (o > 0.45) {
          g.appendChild(el('polygon', {
            points: pts(poly),
            class: 'shard',
            fill: o > 0.85 ? `url(#glint-${id})` : '#fff',
            'fill-opacity': (o > 0.85 ? 1 : (o - 0.45) * 0.09).toFixed(3),
          }))
        }
        prev = k
      }
    }

    const cracks = []
    rayPts.forEach((p) => cracks.push(p))
    ringIdx.forEach((k, n) => {
      for (let i = 0; i < rays; i++) {
        if (rand() < 0.85 - n * 0.12) {
          const a = rayPts[i][k]
          const b = rayPts[(i + 1) % rays][k]
          const mid = [
            (a[0] + b[0]) / 2 + (rand() - 0.5) * radii[k] * 0.08,
            (a[1] + b[1]) / 2 + (rand() - 0.5) * radii[k] * 0.08,
          ]
          cracks.push([a, mid, b])
        }
      }
    })

    // Dark shadow + bright edge per crack gives the glass its depth.
    for (const c of cracks) {
      g.appendChild(el('polyline', { points: pts(c.map((p) => [p[0] + 0.8, p[1] + 0.8])), class: 'crack-shadow' }))
      g.appendChild(el('polyline', { points: pts(c), class: 'crack' }))
    }

    // Crushed spot at the point of impact.
    const spot = el('radialGradient', { id: `spot-${id}` })
    spot.appendChild(el('stop', { offset: '0', 'stop-color': '#fff', 'stop-opacity': '0.55' }))
    spot.appendChild(el('stop', { offset: '0.4', 'stop-color': '#fff', 'stop-opacity': '0.18' }))
    spot.appendChild(el('stop', { offset: '1', 'stop-color': '#fff', 'stop-opacity': '0' }))
    defs.appendChild(spot)
    g.appendChild(el('circle', { cx, cy, r: reach * 0.06, fill: `url(#spot-${id})` }))
    for (let i = 0; i < 26; i++) {
      const a = rand() * Math.PI * 2
      const d1 = rand() * reach * 0.03
      const d2 = d1 + reach * (0.01 + rand() * 0.03)
      g.appendChild(el('line', {
        x1: cx + Math.cos(a) * d1, y1: cy + Math.sin(a) * d1,
        x2: cx + Math.cos(a + 0.3) * d2, y2: cy + Math.sin(a + 0.3) * d2,
        class: 'crack',
      }))
    }
  }

  const draw = () => {
    const w = window.innerWidth
    const h = window.innerHeight
    const rand = rng(1704)
    const diag = Math.hypot(w, h)
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`)
    svg.replaceChildren()
    const defs = el('defs', {})
    const g = el('g', {})
    svg.append(defs, g)
    // Main impact sits horizontally centred, at face height in the hero photo (as seen at the top of the page).
    const hero = document.querySelector('.hero-image')
    let cx = w * 0.5
    let cy = h * 0.3
    if (hero) {
      const r = hero.getBoundingClientRect()
      cx = r.left + r.width * 0.5
      cy = r.top + window.scrollY + r.height * 0.205
    }
    impact(g, defs, cx, cy, diag * 1.1, 17, 6, rand, 'a')
    impact(g, defs, w * 0.14, h * 0.82, diag * 0.32, 9, 3, rand, 'b')
  }

  let pending = 0
  window.addEventListener('resize', () => {
    cancelAnimationFrame(pending)
    pending = requestAnimationFrame(draw)
  })
  draw()
})()
