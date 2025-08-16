# ShiftNotes - Medical Training Assessment System

A progressive web app system for competency-based, EPA-driven trainee assessments completed after each shift, streamlining faculty documentation, trainee feedback, and leadership oversight.

**Experience Qualities**:
1. **Efficient** - Sub-2 minute assessment entry with smart defaults and mobile-first design
2. **Transparent** - Clear feedback loops and progress tracking for all stakeholders
3. **Professional** - Clinical-grade interface that inspires confidence in medical training environments

**Complexity Level**: Complex Application (advanced functionality, accounts)
Multi-role authentication system with role-based permissions, comprehensive analytics, data export capabilities, and audit trails required for medical education compliance.

## Essential Features

**Role-Based Authentication System**
- Functionality: Secure login with role-based access (Faculty, Trainee, Admin, Leadership, System Admin)
- Purpose: Ensures appropriate data access and maintains HIPAA/privacy compliance
- Trigger: User accesses application
- Progression: Login screen → Role detection → Appropriate dashboard → Feature access based on permissions
- Success criteria: Users only see features/data appropriate to their role

**Post-Shift Assessment Creation**
- Functionality: Faculty create EPA assessments with entrustment levels, comments, and optional leadership flags
- Purpose: Capture timely, structured feedback on trainee performance
- Trigger: Faculty completes shift with trainee
- Progression: New Assessment → Trainee selection → EPA selection → Entrustment rating → Required comments → Submit/Draft
- Success criteria: Assessment completed in under 2 minutes, all required fields validated

**EPA Progress Analytics**
- Functionality: Visual dashboards showing individual and cohort EPA performance over time
- Purpose: Enable data-driven training decisions and milestone tracking
- Trigger: User navigates to analytics section
- Progression: Analytics page → Filter selection → Chart rendering → Export options → Portfolio generation
- Success criteria: Charts load within 2 seconds, export functions work reliably

**Assessment Review & Feedback**
- Functionality: Trainees view assessments with actionable feedback and progress tracking
- Purpose: Facilitate learning through structured feedback and self-reflection
- Trigger: New assessment submitted or trainee checks progress
- Progression: Assessment list → Detail view → Progress charts → Export portfolio
- Success criteria: Feedback is actionable and progress trends are clear

**Administrative Management**
- Functionality: User management, EPA configuration, milestone mapping, and system settings
- Purpose: Maintain system integrity and customize for institutional needs
- Trigger: Admin performs system maintenance tasks
- Progression: Admin dashboard → Management section → Configuration changes → Validation → Save
- Success criteria: Changes propagate correctly without data loss

## Edge Case Handling

**Incomplete Assessments**: Auto-save drafts every 30 seconds, allow completion later
**Network Connectivity**: Offline mode with sync when connection restored
**Data Export Failures**: Retry mechanism with user notification and alternative formats
**Role Permission Changes**: Graceful session handling with re-authentication prompt
**Large Dataset Performance**: Pagination, lazy loading, and query optimization
**Assessment Deadlines**: Visual indicators and reminder system for time-sensitive submissions

## Design Direction

The interface should feel authoritative yet approachable - think clinical efficiency meets modern software design. Clean, professional aesthetic with subtle medical/academic visual cues. Minimal interface that prioritizes speed and clarity over decoration, with generous whitespace and clear visual hierarchy that works equally well on mobile devices and desktop workstations.

## Color Selection

Complementary (opposite colors) - Professional medical blue paired with warm accent orange for a trustworthy yet energetic feeling that differentiates from typical clinical software.

- **Primary Color**: Medical Blue (oklch(0.45 0.15 240)) - Communicates trust, professionalism, and medical authority
- **Secondary Colors**: Light Gray (oklch(0.95 0.005 240)) for backgrounds, Dark Gray (oklch(0.25 0.01 240)) for text
- **Accent Color**: Warm Orange (oklch(0.70 0.15 45)) - Attention-grabbing highlight for CTAs and important elements
- **Foreground/Background Pairings**: 
  - Background White (oklch(1 0 0)): Dark Gray text (oklch(0.25 0.01 240)) - Ratio 16.9:1 ✓
  - Primary Blue (oklch(0.45 0.15 240)): White text (oklch(1 0 0)) - Ratio 8.2:1 ✓
  - Secondary Light Gray (oklch(0.95 0.005 240)): Dark Gray text (oklch(0.25 0.01 240)) - Ratio 15.8:1 ✓
  - Accent Orange (oklch(0.70 0.15 45)): White text (oklch(1 0 0)) - Ratio 4.8:1 ✓
  - Muted Gray (oklch(0.85 0.01 240)): Dark Gray text (oklch(0.25 0.01 240)) - Ratio 11.2:1 ✓

## Font Selection

Typography should convey clinical precision and modern professionalism - Inter for its excellent readability at various sizes and weights, complemented by its clean geometric forms that work well in data-heavy interfaces.

- **Typographic Hierarchy**: 
  - H1 (Page Titles): Inter Bold/32px/tight letter spacing
  - H2 (Section Headers): Inter SemiBold/24px/normal letter spacing  
  - H3 (Card Titles): Inter Medium/18px/normal letter spacing
  - Body Text: Inter Regular/16px/relaxed line height (1.6)
  - Small Text (Labels): Inter Medium/14px/normal letter spacing
  - Data/Numbers: Inter SemiBold/16px/tabular numbers

## Animations

Subtle and purposeful animations that reinforce the professional medical context while providing necessary feedback - think precise, measured movements that mirror the deliberate nature of medical practice.

- **Purposeful Meaning**: Smooth transitions communicate system reliability and data integrity, with loading states that reassure users their critical assessment data is being processed safely
- **Hierarchy of Movement**: Form validation feedback takes priority, followed by navigation transitions, then subtle hover states on interactive elements

## Component Selection

- **Components**: Dialog for assessment forms, Cards for dashboard metrics, Forms with react-hook-form integration, Tables for assessment lists, Tabs for analytics views, Select for EPA/trainee dropdowns, Progress components for milestone tracking, Badge for assessment status, Tooltip for help text
- **Customizations**: Custom chart components using recharts, specialized EPA rating selector, assessment timeline component, role-based navigation wrapper
- **States**: Buttons show clear loading states during form submission, inputs provide immediate validation feedback, disabled states for read-only roles, success states for completed assessments
- **Icon Selection**: Phosphor icons - user-circle for profiles, clipboard-text for assessments, chart-line for analytics, gear for settings, shield-check for permissions
- **Spacing**: Consistent 4px base unit (space-1 through space-8), generous padding on cards (space-6), tight spacing for form elements (space-3)
- **Mobile**: Stack navigation vertically, collapsible sidebar, simplified table views with expandable rows, bottom sheet modals for quick actions, touch-friendly 44px minimum touch targets