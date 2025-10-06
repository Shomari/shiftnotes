# Temporary EPA Day-of-Week Filtering

## Overview
This document describes the **TEMPORARY** implementation of day-of-week EPA filtering for assessments, implemented per customer MVP request.

## What Was Changed
Only **one file** was modified: `shiftnotes-mobile/components/assessments/NewAssessmentForm.tsx`

### Changes Made:

1. **Added hardcoded EPA day-of-week mapping** (lines 85-109)
   - Maps each day of the week (0=Sunday to 6=Saturday) to allowed EPA numbers
   - Based on customer-provided CSV mapping
   - Includes helper function `getEpaNumber()` to extract EPA numbers from codes

2. **Modified `getAvailableEpas()` function** (lines 310-333)
   - Now checks the selected shift date
   - Filters EPAs based on day of week before filtering out already-selected EPAs
   - If no shift date is selected, shows all EPAs (no filtering)

3. **Added reactive useEffect hook** (lines 137-182)
   - Watches the shift date for changes
   - Automatically clears any selected EPAs that are no longer valid when date changes
   - Cleans up associated assessment data for cleared EPAs
   - Ensures EPA list is always in sync with the selected date

4. **Added UI helper message** (lines 819-823)
   - Shows a blue italicized message when shift date is selected
   - Informs users: "📅 Available EPAs are filtered based on the shift date's day of week"

5. **Added helper text style** (lines 1212-1217)
   - Styling for the informational message

6. **Replaced date picker with MUI calendar**
   - Updated shift date field to use `CustomDatePicker` component
   - Provides consistent Material-UI calendar experience across the app

## How It Works

1. User selects a shift date in the New Assessment form
2. The system calculates the day of week (JavaScript's `Date.getDay()`: 0=Sunday, 6=Saturday)
3. EPAs are filtered to only show those allowed for that specific day
4. User can only select from the filtered EPA list
5. **If the user changes the shift date**, any already-selected EPAs that are no longer valid for the new day are automatically cleared
6. The EPA dropdown reactively updates to show only EPAs valid for the currently selected date

## EPA Day Mapping (From CSV)

| Day       | Available EPAs |
|-----------|----------------|
| Sunday    | 2, 8, 12, 13, 14, 15, 16, 17 |
| Monday    | 7, 9, 14, 16, 20, 21, 22 |
| Tuesday   | 2, 4, 10, 12, 13, 14, 16, 17 |
| Wednesday | 2, 5, 12, 13, 14, 16, 17, 22 |
| Thursday  | 2, 3, 12, 13, 14, 16, 17, 18, 22 |
| Friday    | 6, 12, 13, 14, 16, 17, 19, 22 |
| Saturday  | 1, 11, 12, 13, 14, 16, 17, 22 |

## Why This Approach?

✅ **No database changes** - entirely frontend logic  
✅ **Easy to remove** - all code marked with clear TEMPORARY comments  
✅ **No data structure changes** - assessments can still have any EPA  
✅ **Backend agnostic** - backend doesn't need to know about this rule  
✅ **Simple to maintain** - all logic in one place  

## How to Remove Later

When ready to remove this temporary feature:

1. Search for `TEMPORARY` in `NewAssessmentForm.tsx`
2. Remove lines 85-109 (the EPA day-of-week mapping and helper function)
3. Remove lines 137-182 (the useEffect hook that clears EPAs on date change)
4. Replace `getAvailableEpas()` function (lines 310-333) with the original:
   ```typescript
   const getAvailableEpas = () => {
     const selectedEpaIds = new Set(assessmentSlots.map(s => s.epaId).filter(Boolean));
     return epas.filter(epa => !selectedEpaIds.has(epa.id));
   };
   ```
5. Remove the helper message (lines 819-823)
6. Remove the helperText style (lines 1212-1217) - optional, can keep for future use

All changes are in ONE file, making removal very straightforward. Just search for `TEMPORARY` or `TODO: Remove this when permanent solution` to find all sections.

## Testing Checklist

- [ ] Select different shift dates and verify EPA list changes accordingly
- [ ] Verify Sunday shows only EPAs: 2, 8, 12, 13, 14, 15, 16, 17
- [ ] Verify Monday shows only EPAs: 7, 9, 14, 16, 20, 21, 22
- [ ] **Select an EPA, then change the shift date** - verify invalid EPA is automatically cleared
- [ ] Change date back - verify EPA list updates and previous EPA can be reselected
- [ ] Verify the helper message appears when shift date is selected
- [ ] Test the MUI calendar picker for shift date selection
- [ ] Test on both web and mobile platforms

## Notes

- The filtering is **case-insensitive** for EPA codes (handles "EPA 1", "EPA1", "epa 1", etc.)
- If EPA code format changes, the `getEpaNumber()` regex may need adjustment
- Frontend-only solution means assessments can technically still have "wrong day" EPAs if created before this feature or via API directly (by design - no backend validation)

---

**Date Implemented:** October 6, 2025  
**Implemented By:** AI Assistant  
**Reason:** MVP customer request for temporary day-of-week EPA filtering  
**Expected Duration:** Temporary until permanent solution implemented
