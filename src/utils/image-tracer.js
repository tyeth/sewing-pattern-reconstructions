import potrace from 'potrace'

export async function traceImageToSVG(imageData, options = {}) {
  const {
    turdSize = 2,
    threshold = 128,
    optCurve = true
  } = options

  // Convert RGBA imageData to Buffer for Potrace
  const { width, height, data } = imageData
  
  // Create PNG-like buffer structure that potrace can handle
  const canvas = {
    width: width,
    height: height,
    data: Buffer.from(data)
  }

  return new Promise((resolve, reject) => {
    const params = {
      turdsize: turdSize,
      optcurve: optCurve,
      threshold: threshold
    }

    potrace.trace(canvas, params, (err, svg) => {
      if (err) {
        reject(err)
        return
      }

      // Parse paths from SVG
      const pathMatches = svg.match(/<path[^>]*d="([^"]*)"[^>]*>/g) || []
      const paths = pathMatches.map(pathMatch => {
        const dMatch = pathMatch.match(/d="([^"]*)"/)
        return { d: dMatch ? dMatch[1] : '' }
      })

      resolve({
        svg: svg,
        paths: paths
      })
    })
  })
}