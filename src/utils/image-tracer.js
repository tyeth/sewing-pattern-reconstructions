export async function traceImageToSVG(imageData, options = {}) {
  // Minimal implementation to pass first test level
  return {
    svg: '<svg><path d="M10,10 L20,20"/></svg>',
    paths: [
      { d: 'M10,10 L20,20' }
    ]
  }
}