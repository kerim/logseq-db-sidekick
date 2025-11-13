# Floating Button POC - Implementation Notes

**Created**: 2025-11-11
**Updated**: 2025-11-11 (Added Logseq color scheme + dark mode)
**Status**: Ready for testing
**Location**: `/Users/niyaro/Documents/Code/logseq-copilot-http/poc/floating-button/demo.html`

## Overview

Standalone HTML demo demonstrating the proposed UX for Phase 3: replacing the permanent sidebar with a collapsible floating button that expands into a side panel.

**NEW**: Now uses Logseq's official color scheme with full light/dark mode support!

## Features Implemented

### 0. Logseq Color Scheme & Theming
- **Brand Color**: Teal (#85c8c8) from Logseq's official design
- **Light Mode**: White backgrounds, dark text, subtle grays
- **Dark Mode**: Dark blue-gray (#002b36 base), light text, teal accents
- **Auto-Detection**: Respects browser's `prefers-color-scheme` setting
- **Manual Toggle**: Button in top-right to switch themes
- **Persistence**: Theme preference saved in localStorage
- **Smooth Transitions**: All colors fade smoothly (300ms) when switching
- **CSS Variables**: Uses `--lx-*` naming convention (inspired by Logseq's Radix UI implementation)

**Color Variables:**
```css
--lx-accent: #85c8c8          /* Logseq teal */
--lx-accent-hover: #6eb5b5    /* Darker teal for hover */
--lx-bg-base: #ffffff / #002b36
--lx-bg-secondary: #f9fafb / #073642
--lx-text-primary: #1f2937 / #e5e7eb
--lx-text-secondary: #6b7280 / #9ca3af
```

### 1. Floating Button (Collapsed State)
- **Position**: Fixed bottom-right corner (20px from edges)
- **Size**: 56px diameter circular button
- **Color**: Logseq teal (#85c8c8) with shadow
- **Badge**: Shows result count (22) in white text
- **Interaction**: Hover effect (scales to 1.1x, lightens color), click to toggle panel

### 2. Side Panel (Expanded State)
- **Position**: Fixed right side, slides in from off-screen
- **Size**: 400px width, full viewport height
- **Animation**: Smooth 300ms slide transition
- **Header**:
  - Top row: Title + close button (X)
  - Search bar: Input field with search icon (🔍)
  - **Note**: Search bar is non-functional (UI preview only)
- **Content Area**: Scrollable results list
- **Shadow**: Subtle shadow for depth

### 3. Overlay
- **Background**: Semi-transparent black (50% opacity)
- **Function**: Dims page content, click to close panel
- **Transition**: Fades in/out with panel

### 4. Results Display
- **Data Source**: Real Taiwan search results (22 pages)
- **Format**: Clickable page titles in styled cards
- **Scrolling**: Panel content scrolls independently
- **Links**: Format `logseq://graph/...?block-id={uuid}` (same as working links in v0.0.15)

## Design Decisions

### Search Bar in Panel Header
- **Purpose**: Allow users to refine or start new searches directly within the panel
- **Placement**: Below title, above results - easy to find and use
- **Styling**: Matches Logseq theme, teal accent on focus
- **Current Status**: Non-functional UI preview
- **Future Implementation**:
  - Trigger new Logseq search when Enter pressed
  - Update results dynamically
  - Show loading state while searching
  - Clear button (X) when text entered
  - Maybe: Search history dropdown

### Why Side Panel vs Dropdown?
- **More space**: 400px width allows full page titles (and search bar!)
- **Better scrolling**: Independent scroll container
- **Clearer hierarchy**: Overlay + panel = modal-like focus
- **Familiar pattern**: Similar to mobile menu drawers

### Why Right Side?
- **Common pattern**: Many extensions use right side (less conflict)
- **Natural flow**: Button on right, panel slides from right
- **Search context**: Left side often has search filters/ads

### Positioning Strategy
- **Fixed positioning**: Stays visible during scroll
- **High z-index**: Button (10000), Panel (9999), Overlay (9998)
- **Non-intrusive**: Doesn't block page content when collapsed

## Implementation Details

### HTML Structure
```html
<div class="overlay"></div>
<div class="logseq-sidekick-panel">
  <div class="panel-header">
    <div class="panel-header-top">
      <h2 class="panel-title">Logseq Results</h2>
      <button class="close-button">&times;</button>
    </div>
    <div class="search-container">
      <input class="search-input" placeholder="Search in Logseq...">
      <span class="search-icon">🔍</span>
    </div>
  </div>
  <div class="panel-content">...</div>
</div>
<div class="logseq-sidekick-button">
  <span class="result-count">22</span>
</div>
```

### Key CSS Classes
- `.logseq-sidekick-button` - Floating button
- `.logseq-sidekick-panel` - Side panel container
- `.panel-header-top` - Title and close button row
- `.search-container` - Search input wrapper
- `.search-input` - Search text field (teal focus ring)
- `.search-icon` - Magnifying glass icon
- `.panel-content` - Scrollable results area
- `.overlay` - Background dimming
- `.result-item` - Individual result card

### JavaScript Functions
- `renderResults()` - Generates result HTML from data array
- `togglePanel()` - Opens/closes panel
- `openPanel()` - Shows panel + overlay
- `closePanel()` - Hides panel + overlay

### Data Structure
```javascript
{
  title: "Page Title",
  uuid: "block-uuid"
}
```

## Testing Instructions

1. Open `demo.html` in a browser
2. Verify floating button appears in bottom-right (teal color)
3. Click theme toggle button to test light/dark modes
4. Verify color transitions are smooth
5. Click floating button to open panel
6. Verify panel header:
   - Title and close button on top row
   - Search bar below with placeholder text
   - Search icon (🔍) visible on right side of input
   - Try clicking/typing in search bar (non-functional, just UI)
   - Focus state shows teal border and subtle glow
7. Verify panel content:
   - Panel slides in smoothly
   - Overlay dims background
   - Results are scrollable
   - Links are clickable
   - Close button works
   - Clicking overlay closes panel
   - All colors match current theme
8. Test browser preference:
   - Open DevTools > Rendering > Emulate CSS media feature
   - Toggle `prefers-color-scheme: dark` to verify auto-detection
9. Refresh page and verify theme preference persists

## Browser Compatibility

Tested on:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari

Should work on all modern browsers (uses standard CSS features).

## Next Steps for Integration

### 1. Convert to React Component
- Create `FloatingButton.tsx` component
- Create `SidePanel.tsx` component
- Use existing `LogseqBlock.tsx` for result rendering

### 2. Update Content Script
File: `src/pages/content/index.tsx`
- Replace sidebar rendering with floating button
- Pass search results as props
- Preserve existing search functionality

### 3. Style Integration
File: `src/pages/content/index.module.scss`
- Port CSS from demo to SCSS modules
- Use CSS variables for theming (already using `--lx-*` convention!)
- Ensure styles don't conflict with host pages
- **Theme Implementation**:
  - Detect browser preference with `window.matchMedia('(prefers-color-scheme: dark)')`
  - Apply theme by setting `data-theme` attribute on root element
  - Store user's manual override in `chrome.storage.local` (not localStorage)
  - Listen for system theme changes and update automatically

### 4. State Management
- Track panel open/close state
- Preserve result count in button
- Handle empty results (hide button or show 0?)
- Track theme preference (auto/light/dark)
- Track current search query (for search bar)

### 5. Search Bar Functionality
File: New component or add to `SidePanel.tsx`
- Hook up Enter key to trigger new search
- Call `httpServerClient.searchGraph()` with new query
- Show loading indicator while searching
- Update results dynamically
- Add clear button (X) when text entered
- Maybe: Debounce input for live search
- Maybe: Remember recent searches

### 6. Configuration
- Add user preference: sidebar vs floating button
- Allow customization: button position, panel width
- Store preferences in extension config
- Option to enable/disable search bar

## Design Considerations

### Result Count Badge
- Currently shows number as text
- Consider: Max display (e.g., "99+")
- Consider: Different colors for different counts?
- Consider: Pulsing animation when new results arrive?

### Accessibility
- [ ] Add keyboard navigation (Esc to close)
- [ ] Add ARIA labels for screen readers
- [ ] Ensure focus management (trap focus in panel when open)
- [ ] Add keyboard shortcut to toggle (e.g., Alt+L)

### Responsive Design
- Current: Fixed 400px width
- Consider: Narrower on small screens
- Consider: Full-width on mobile devices
- Consider: Min/max width constraints

### Performance
- Current: All results rendered immediately
- Consider: Virtual scrolling for 100+ results
- Consider: Lazy loading for very long lists
- Consider: Search/filter within results

## Known Issues / Future Enhancements

1. **Mobile Support**: Not optimized for mobile (panel might be too wide)
2. **Animation**: Could add micro-interactions (button bounce, result fade-in)
3. **Empty State**: No UI for zero results
4. **Loading State**: No spinner/skeleton for async searches
5. **Dark Mode**: Only light theme implemented

## Comparison with Original Sidebar

### Advantages of Floating Button
- ✅ Less intrusive (collapsed by default)
- ✅ User controls when to see results
- ✅ No layout shift on host page
- ✅ Works on any page width
- ✅ Clearer visual hierarchy

### Disadvantages
- ❌ Requires extra click to view results
- ❌ Not immediately visible (user might miss it)
- ❌ One more UI element on screen

### Recommendation
Implement both, let users choose in settings. Default to floating button for new users, offer sidebar as "always visible" option for power users.

## Files in This POC

```
poc/floating-button/
├── demo.html        # Standalone demo (this file)
└── NOTES.md         # Implementation notes (this file)
```

## Screenshots Needed

- [ ] Collapsed state (button only)
- [ ] Expanded state (panel open)
- [ ] Hover state (button scaled)
- [ ] Scrolling demonstration
- [ ] Mobile view (if implemented)

---

## Logseq Color Scheme Research

### Sources
1. **Logseq Website**: https://logseq.com/
   - Primary brand color: `#85c8c8` (teal/cyan)
   - Used consistently in badges and UI elements

2. **Logseq GitHub Repository**: https://github.com/logseq/logseq
   - Uses Radix UI color system with 12-step scales
   - CSS variables follow `--lx-accent-[1-12]` and `--lx-gray-[1-12]` pattern
   - Dark theme base: `#002b36` (dark blue-gray, similar to Solarized Dark)

3. **Radix UI Documentation**: https://www.radix-ui.com/colors
   - 12-step color scale system
   - Each color has solid and transparent variants
   - Steps 1-3: Backgrounds
   - Steps 4-6: Interactive components
   - Steps 9-12: Text and borders

### Implementation Notes
- Logseq doesn't publish an official design system guide
- Colors extracted from actual source code and website
- Dark mode colors based on Logseq's actual dark theme
- Teal accent (#85c8c8) is the key brand identifier

---

**POC Status**: ✅ Complete and ready for user review
**Version**: v3 (with Logseq colors + dark mode + search bar UI)
**Next Step**: Get user feedback on search bar placement/styling, then proceed with integration

## Changelog

### v3 (2025-11-11 - Latest)
- Added search bar UI to panel header (non-functional)
- Search bar styled to match Logseq theme
- Teal focus ring on search input
- Updated documentation with search implementation notes

### v2 (2025-11-11)
- Implemented Logseq color scheme (#85c8c8 teal)
- Added full light/dark mode support
- Browser preference detection with manual override
- Theme persistence in localStorage
- Smooth color transitions

### v1 (2025-11-11)
- Initial POC: Floating button with side panel
- Real Taiwan search data (22 results)
- Scrollable results display
- Overlay with click-to-close
