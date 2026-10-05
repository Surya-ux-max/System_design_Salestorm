import { useRef, useEffect, useCallback } from 'react'

const ClickSpark = ({
  sparkColor = '#fff',
  sparkSize = 10,
  sparkRadius = 15,
  sparkCount = 8,
  duration = 400,
  easing = 'ease-out',
  extraScale = 1.0,
  children,
  style = {},
}) => {
  const canvasRef    = useRef(null)
  const sparksRef    = useRef([])
  const startTimeRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const parent = canvas.parentElement
    if (!parent) return

    let resizeTimeout

    const resizeCanvas = () => {
      const { width, height } = parent.getBoundingClientRect()
      canvas.width  = width
      canvas.height = height
    }

    const ro = new ResizeObserver(() => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(resizeCanvas, 50)
    })
    ro.observe(parent)
    resizeCanvas()

    return () => { ro.disconnect(); clearTimeout(resizeTimeout) }
  }, [])

  const easeFunc = useCallback(t => {
    switch (easing) {
      case 'linear':      return t
      case 'ease-in':     return t * t
      case 'ease-in-out': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
      default:            return t * (2 - t)
    }
  }, [easing])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let animId

    const draw = ts => {
      if (!startTimeRef.current) startTimeRef.current = ts
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      sparksRef.current = sparksRef.current.filter(spark => {
        const elapsed = ts - spark.startTime
        if (elapsed >= duration) return false
        const eased    = easeFunc(elapsed / duration)
        const dist     = eased * sparkRadius * extraScale
        const lineLen  = sparkSize * (1 - eased)
        const x1 = spark.x + dist * Math.cos(spark.angle)
        const y1 = spark.y + dist * Math.sin(spark.angle)
        const x2 = spark.x + (dist + lineLen) * Math.cos(spark.angle)
        const y2 = spark.y + (dist + lineLen) * Math.sin(spark.angle)
        ctx.strokeStyle = sparkColor
        ctx.lineWidth   = 2.5
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
        return true
      })

      animId = requestAnimationFrame(draw)
    }

    animId = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(animId)
  }, [sparkColor, sparkSize, sparkRadius, sparkCount, duration, easeFunc, extraScale])

  const handleClick = e => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const now  = performance.now()
    sparksRef.current.push(
      ...Array.from({ length: sparkCount }, (_, i) => ({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        angle: (2 * Math.PI * i) / sparkCount,
        startTime: now,
      }))
    )
  }

  return (
    <div
      onClick={handleClick}
      style={{ position: 'relative', minHeight: '100vh', overflowX: 'hidden', ...style }}
    >
      <canvas ref={canvasRef} style={{
        position: 'fixed', top: 0, left: 0,
        width: '100vw', height: '100vh',
        pointerEvents: 'none', userSelect: 'none',
        zIndex: 9999,
      }} />
      {children}
    </div>
  )
}

export default ClickSpark
