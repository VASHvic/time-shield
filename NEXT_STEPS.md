# Time Shield - Next Steps for Improvement

## 🎯 Immediate Priorities

### 1. Fix Day Tracking System
**Priority:** High  
**Effort:** Medium  
**Impact:** Fixes lock feature and daily reset

**Problem:** Currently uses `getDay()` (day of week 0-6) instead of actual dates, causing weekly resets instead of daily.

**Tasks:**
- [ ] Create a consistent date format utility (e.g., `YYYY-MM-DD`)
- [ ] Update all date comparisons to use the new format
- [ ] Fix lock feature to properly detect new days
- [ ] Test that daily limits reset at midnight

**Files to modify:**
- `src/utils/time.ts` - Add date formatting utilities
- `src/background/index.ts` - Update day tracking
- `src/popup/Popup.tsx` - Update lock detection

---

### 2. Implement Proper Lock/Unlock Feature
**Priority:** High  
**Effort:** Low (depends on #1)  
**Impact:** Users can commit to time limits

**Problem:** Lock never automatically unlocks because `isNewDay` detection is broken.

**Tasks:**
- [ ] Implement new day detection in background script
- [ ] Set `isNewDay` flag when date changes
- [ ] Auto-unlock when new day is detected
- [ ] Add visual feedback when locked/unlocked

---

### 3. Replace setInterval with chrome.alarms API
**Priority:** Medium  
**Effort:** Medium  
**Impact:** More reliable timer in service workers

**Problem:** Service workers can be terminated, killing `setInterval` timers.

**Tasks:**
- [ ] Replace 10-second interval with `chrome.alarms.create()`
- [ ] Add alarm listener to handle timer updates
- [ ] Ensure timer persists across service worker restarts
- [ ] Test with long idle periods

**Reference:** [Chrome Alarms API](https://developer.chrome.com/docs/extensions/reference/alarms/)

---

## 🚀 Feature Enhancements

### 4. Add "Quick Add Current Site" Button
**Priority:** Medium  
**Effort:** Low  
**Impact:** Better UX

**Implementation:**
```tsx
const addCurrentSite = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) {
    const url = new URL(tab.url);
    const domain = url.hostname.replace('www.', '');
    setUrlInput(domain);
  }
};
```

**Tasks:**
- [ ] Add button to popup UI
- [ ] Implement current tab detection
- [ ] Extract domain from URL
- [ ] Auto-populate input field

---

### 5. Historical Time Tracking
**Priority:** Medium  
**Effort:** High  
**Impact:** Analytics and insights

**Features:**
- Daily, weekly, monthly statistics
- Time spent per site over time
- Trends and patterns visualization
- Export data functionality

**Tasks:**
- [ ] Design time series data structure
- [ ] Implement data collection in background
- [ ] Create statistics/analytics page
- [ ] Add charts/visualizations (Chart.js or Recharts)
- [ ] Add export to CSV/JSON

---

### 6. Better URL Matching
**Priority:** Medium  
**Effort:** Medium  
**Impact:** More accurate site blocking

**Current Issue:** Matching is too broad (e.g., "chat" blocks all URLs with "chat")

**Improvements:**
- [ ] Match against hostname only, not full URL path
- [ ] Support wildcard patterns (e.g., `*.google.com`)
- [ ] Support regex patterns for advanced users
- [ ] Add URL preview when adding sites

---

### 7. Visual Improvements
**Priority:** Low  
**Effort:** Low-Medium  
**Impact:** Better UX

**Ideas:**
- [ ] Red badges/chips for restricted sites
- [ ] Progress bars showing time remaining
- [ ] Color coding (green → yellow → red as time runs out)
- [ ] Smooth animations and transitions
- [ ] Dark mode support
- [ ] Custom themes

---

## 🧹 Code Quality

### 8. Reduce Console Logging
**Priority:** Low  
**Effort:** Low  
**Impact:** Cleaner production code

**Tasks:**
- [ ] Create logging utility with levels (debug, info, warn, error)
- [ ] Replace all `console.log` with utility
- [ ] Disable debug logs in production builds
- [ ] Add environment-based logging config

**Example:**
```typescript
const logger = {
  debug: (...args: any[]) => import.meta.env.DEV && console.log(...args),
  info: console.info,
  warn: console.warn,
  error: console.error,
};
```

---

### 9. Add Automated Tests
**Priority:** Medium  
**Effort:** High  
**Impact:** Prevent regressions

**Test Coverage:**
- [ ] Unit tests for utilities (time conversion, URL parsing)
- [ ] Unit tests for storage service
- [ ] Integration tests for background script
- [ ] Component tests for React UI
- [ ] E2E tests for critical flows

**Tools:** Vitest, React Testing Library, Playwright

---

### 10. Improve Error Handling & User Feedback
**Priority:** Medium  
**Effort:** Medium  
**Impact:** Better UX

**Tasks:**
- [ ] Add toast notifications for errors
- [ ] Show loading states during async operations
- [ ] Add confirmation dialogs for destructive actions
- [ ] Display helpful error messages (not just console)
- [ ] Add retry logic for failed storage operations

---

## 🎨 Advanced Features (Future)

### 11. Site Categories/Groups
**Priority:** Low  
**Effort:** High

- Group sites by category (Social Media, News, Entertainment)
- Set different time limits per category
- Quick add entire category

### 12. Focus Mode
**Priority:** Low  
**Effort:** Medium

- Temporarily block all restricted sites
- Pomodoro timer integration
- Whitelist mode (block everything except allowed sites)

### 13. Productivity Insights
**Priority:** Low  
**Effort:** High

- Weekly/monthly reports
- Most visited restricted sites
- Time saved vs. time wasted
- Productivity score

### 14. Sync Across Devices
**Priority:** Low  
**Effort:** Medium

- Use `chrome.storage.sync` instead of `chrome.storage.local`
- Sync settings and restrictions across devices
- Conflict resolution for time limits

### 15. Custom Notifications
**Priority:** Low  
**Effort:** Low

- Customize notification messages
- Set notification frequency
- Warning notifications at 50%, 75%, 90% time used

---

## 📋 Recommended Implementation Order

### Phase 1: Critical Fixes (1-2 days)
1. Fix day tracking system
2. Fix lock/unlock feature
3. Replace setInterval with chrome.alarms

### Phase 2: Quick Wins (1-2 days)
4. Add "Quick Add Current Site" button
5. Reduce console logging
6. Visual improvements (progress bars, colors)

### Phase 3: Major Features (1-2 weeks)
7. Historical time tracking
8. Better URL matching
9. Automated tests

### Phase 4: Polish (ongoing)
10. Error handling improvements
11. Advanced features as needed

---

## 🛠️ Development Setup Improvements

### Add Development Scripts
```json
{
  "scripts": {
    "dev:watch": "vite build --watch",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "type-check": "tsc --noEmit"
  }
}
```

### Add Pre-commit Hooks
```bash
npm install -D husky lint-staged
npx husky init
```

### Add GitHub Actions CI/CD
- Automated linting
- Automated tests
- Automated builds
- Release automation

---

## 📚 Documentation Improvements

- [ ] Add JSDoc comments to complex functions
- [ ] Create API documentation
- [ ] Add architecture diagram
- [ ] Document storage schema
- [ ] Create user guide
- [ ] Add troubleshooting section to README

---

## 🎯 Success Metrics

Track these to measure improvement:
- **Stability:** Zero critical bugs in production
- **Performance:** Timer accuracy within 1 second
- **Code Quality:** 80%+ test coverage
- **User Experience:** < 3 clicks to add a site
- **Reliability:** No data loss incidents

---

## 💡 Ideas for Consideration

- Browser history analysis to suggest sites to restrict
- Integration with productivity tools (Notion, Todoist)
- Gamification (streaks, achievements)
- Social features (share settings with friends)
- Mobile companion app
- Browser-agnostic version (Firefox, Edge)

---

**Start with Phase 1 to fix critical issues, then move to quick wins for immediate UX improvements!** 🚀
