# Mobile/Desktop Component Refactor Plan

## Goal
Separate mobile and desktop rendering logic into distinct component files organized by platform, making future iOS/mobile-only development easier.

## Current State Analysis

### Components with Mobile/Desktop Differences:
1. **Marketplace.tsx**
   - Desktop: Shows ProfileSidebar on left, nav in header with logout button
   - Mobile: Hides sidebar, shows mobile sidebar overlay, hides "Post Ask" button in nav, adds "Post Ask" card above content

2. **AskCard.tsx**
   - Desktop: Shows bid statistics subcard, date/location in column layout
   - Mobile: Hides bid statistics, date/location in row layout
   - Currently uses `isMobile` prop for conditional rendering

3. **CreateAskModal.tsx**
   - Desktop: Fixed width (max-w-2xl)
   - Mobile: Wider width (94vw)
   - Currently uses `isMobile` prop for conditional className

4. **ProfileSidebar.tsx** (mentioned in code)
   - Has `isMobileOverlay` prop, likely has mobile-specific behavior

## Proposed Directory Structure

```
src/
├── components/
│   ├── desktop/
│   │   ├── Marketplace.tsx
│   │   ├── AskCard.tsx
│   │   ├── CreateAskModal.tsx
│   │   ├── ProfileSidebar.tsx
│   │   └── ...
│   ├── mobile/
│   │   ├── Marketplace.tsx
│   │   ├── AskCard.tsx
│   │   ├── CreateAskModal.tsx
│   │   ├── ProfileSidebar.tsx
│   │   └── ...
│   ├── shared/
│   │   ├── ui/              (shared UI primitives - buttons, cards, etc.)
│   │   ├── BidModal.tsx     (likely same for both)
│   │   ├── AcceptBidDialog.tsx
│   │   ├── AuctionTimer.tsx
│   │   ├── ContactCard.tsx
│   │   └── AskCardSkeleton.tsx
│   └── PlatformWrapper.tsx  (NEW - handles mobile detection & routing)
```

## Implementation Strategy

### Phase 1: Create Platform Wrapper
**File:** `src/components/PlatformWrapper.tsx`
- Detects if mobile/desktop using existing logic (`window.innerWidth < 768`)
- Dynamically imports and renders appropriate component version
- Exports wrapper components for: Marketplace, AskCard, CreateAskModal, ProfileSidebar

### Phase 2: Extract Desktop Components
1. Copy current components to `src/components/desktop/`
2. Remove all `isMobile` conditional logic - keep only desktop code paths
3. Clean up unnecessary props (remove `isMobile` prop)

### Phase 3: Create Mobile Components
1. Copy current components to `src/components/mobile/`
2. Remove all `!isMobile` conditional logic - keep only mobile code paths
3. Implement mobile-specific UI (e.g., full-width modals, row layouts, hidden bid stats)
4. Clean up unnecessary props (remove `isMobile` prop)

### Phase 4: Move Shared Components
1. Identify truly shared components (BidModal, AuctionTimer, etc.)
2. Move to `src/components/shared/`
3. Keep `ui/` folder in shared since it's used by both platforms

### Phase 5: Update Imports
1. Update main app entry point to use PlatformWrapper exports
2. Update any other files importing these components
3. Ensure types are properly shared/imported

## Benefits

### For Current Web Development:
- Cleaner, more readable code without conditional clutter
- Easier to test mobile vs desktop separately
- Clear separation of concerns

### For Future Mobile/iOS Development:
- Mobile components are already isolated
- Can easily package `mobile/` folder for React Native
- Desktop code won't interfere with mobile builds
- Shared components remain reusable
- Can add iOS-specific components alongside mobile web components

## Component-Specific Migration Notes

### Marketplace.tsx
**Desktop version:**
- Always show ProfileSidebar on left
- Nav has logout button, "Post Ask" button visible
- No mobile overlay sidebar logic
- No "Post Ask" card above content

**Mobile version:**
- Never show ProfileSidebar on left (unless in overlay)
- Mobile sidebar overlay functionality
- "Post Ask" button hidden in nav
- "Post Ask" card appears above marketplace cards
- Simplified header layout

### AskCard.tsx
**Desktop version:**
- Always show bid statistics subcard
- Date/location in column layout (`flex-col`)
- Standard spacing

**Mobile version:**
- Never show bid statistics subcard
- Date/location in row layout (`flex-row gap-4`)
- Mobile-optimized spacing

### CreateAskModal.tsx
**Desktop version:**
- `className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"`
- Fixed desktop width constraints

**Mobile version:**
- `className="w-[94vw] max-w-none max-h-[90vh] overflow-y-auto"`
- Wide modal with minimal margins

## Example: PlatformWrapper.tsx Structure

```typescript
// Simplified example
export const Marketplace = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile
    ? <MobileMarketplace {...props} />
    : <DesktopMarketplace {...props} />;
};
```

## Rollout Plan

1. Create MOBILE_REFACTOR_PLAN.md ✓
2. Create directory structure (desktop/, mobile/, shared/)
3. Create PlatformWrapper.tsx skeleton
4. Migrate Marketplace component first (largest changes)
5. Test thoroughly
6. Migrate AskCard component
7. Test thoroughly
8. Migrate CreateAskModal component
9. Test thoroughly
10. Migrate ProfileSidebar if needed
11. Final integration testing
12. Update documentation

## Risks & Mitigation

**Risk:** Code duplication between mobile/desktop
**Mitigation:** Extract truly shared logic to shared utilities/hooks

**Risk:** Props interface drift between platforms
**Mitigation:** Define shared TypeScript interfaces in shared folder

**Risk:** Regression bugs during migration
**Mitigation:** Migrate one component at a time, test thoroughly before next

**Risk:** Increased bundle size
**Mitigation:** Use dynamic imports in PlatformWrapper to code-split mobile/desktop

## Success Criteria

- [ ] No `isMobile` conditional logic in component files
- [ ] Clear separation: desktop/, mobile/, shared/
- [ ] All existing functionality preserved
- [ ] No visual regressions on mobile or desktop
- [ ] Clean imports throughout codebase
- [ ] Easy to identify which code runs on which platform
