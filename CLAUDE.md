# Sewing Pattern Reconstruction for Laser Cutting

## Project Overview
Web application for converting PDF sewing patterns split across A4 pages into laser-cuttable files optimized for 600mm x 400mm laser bed. Includes scrap material matching and multi-size pattern line selection.

## Core Workflow Stages

### Stage 1: PDF Import & Page Assembly
- Import multi-page PDF sewing patterns (typically A4 pages)
- Automatic overlap detection and matching between pages
- Interactive UI for user confirmation of page positioning
- Support for patterns with fold lines (most are flat single sections)
- Output: Single assembled pattern image

### Stage 2: Pattern Line Selection
- Interactive line picking/tracing interface on assembled pattern
- Support for multiple size lines (user selects based on size numbers)
- Toggle/unpick functionality for unwanted lines
- Default: all pattern lines selected if no size variants
- Output: Cleaned pattern with selected lines only

### Stage 3: Laser Bed Optimization
- Input laser bed dimensions (default: 600mm x 400mm)
- Pattern piece arrangement on virtual "sheets"
- Support for roll material mode (continuous feed with manual alignment)
- Generous tolerance settings for manual roll positioning
- Output: Optimized cutting layouts

### Stage 4: Scrap Material Matching
- Database of photographed material scraps
- Each scrap has 2+ critical dimensions for scaling
- Automatic matching of pattern pieces to available scraps
- Priority system for efficient material usage
- Output: Scrap-optimized cutting plan

### Stage 5: Export & Instructions
- PDF browser/viewer for original pattern instructions
- Export laser-ready files (SVG/DXF format)
- Cutting sequence recommendations
- Material placement guides

## Technical Requirements

### Core Technologies
- Web application (HTML5/CSS3/JavaScript)
- Canvas/SVG for pattern manipulation
- PDF.js for PDF processing
- File upload/download capabilities
- Local storage for scrap database

### Key Features
- Responsive design for desktop/tablet use
- Real-time pattern preview
- Undo/redo functionality
- Save/load project states
- Export to common laser cutting formats

### Image Processing
- Edge detection for overlap matching
- Line extraction and classification
- Pattern piece isolation
- Scaling and dimension calibration

### Database Schema
```
scraps: {
  id, image_path, width, height, 
  shape_type, material_type, color,
  critical_dimensions: [{x, y, measurement}]
}

projects: {
  id, name, pdf_path, assembled_pattern,
  selected_lines, laser_settings, layouts
}
```

## Development Guidelines

### Test-Driven Development (TDD)
- ALWAYS follow proper TDD cycle: Red → Green → Refactor
- Write failing tests first, then minimal implementation to pass
- NEVER implement full functionality just to pass tests
- Start with simplest possible implementation (return null, empty object, etc.)
- Only add functionality incrementally as tests demand it
- Tests should fail for the right reasons (missing functionality, not syntax errors)
- NO faking the TDD process - tests must genuinely fail before implementation
- NEVER use mocks without explicit permission
- NEVER mock test data or test objects - use real data only
- Use actual files and real examples for testing

### Testing Requirements
- Unit tests for image processing algorithms
- Integration tests for workflow stages
- UI/UX testing for pattern manipulation
- Performance tests for large PDFs

### Code Organization
```
src/
├── components/          # UI components for each stage
├── services/           # PDF processing, image analysis
├── utils/              # Helper functions, calculations
├── database/           # Scrap material management
└── export/             # File generation for laser cutting
```

### Performance Considerations
- Lazy loading for large pattern images
- Web Workers for intensive image processing
- Progressive enhancement for mobile devices
- Efficient canvas rendering for real-time manipulation

## User Experience Flow
1. Upload PDF → Auto-detect pages → Confirm assembly
2. Select pattern lines → Preview selection → Confirm
3. Set laser bed size → Arrange pieces → Optimize layout
4. (Optional) Match scraps → Select materials → Update layout
5. Export files → View instructions → Download cutting files

## Future Enhancements
- Machine learning for better overlap detection
- Pattern piece recognition and auto-labeling
- Community sharing of assembled patterns
- Integration with popular laser cutting software
- Mobile app for scrap photography and measurement