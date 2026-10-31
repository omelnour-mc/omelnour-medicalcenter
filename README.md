# Om ElNour Medical Center Schedule v1.0.025

A professional, modern React web application for displaying medical staff schedules from Google Calendars. Redesigned with a sleek brand-aligned UI.

## Recent Updates (v1.0.025)
- **Responsive Doctor Layout**: Implemented a responsive grid layout for the doctor's weekly schedule. On desktop, days are displayed side-by-side (columns), while on mobile they stack vertically.
- **Typography Scaling**: Added a responsive typography system using CSS variables to gracefully shrink font sizes on smaller mobile screens for better density.
- **Modal Sizing**: Expanded the maximum width of the doctor details modal to comfortably fit the new side-by-side weekly layout on wider screens.

## Recent Updates (v1.0.024)
- **Branding Refresh**: Replaced text-based placeholders with the official logo (`/logo.png`) across the header, navigation drawer, and footer.
- **Arabic Translation**: Updated the clinic name and location to Arabic ("مركز ام النور الطبى - بالعصافرة قبلى") for better local accessibility.
- **Metadata Optimization**: Updated SEO title and description to match the clinic's Arabic identity.
- **Header Refinement**: Re-engineered the header for a more compact and professional look (h-56px mobile transition).

## Recent Updates (v1.0.023)
- **Settings Modal Integration**: Replaced the static "Schedule Display Customization" card with a modern, compact settings gear icon in the toolbar.
- **Dynamic Calendar Colors**: Integrated real-time color synchronization with Google Calendar. Clinics now display their actual Google-assigned colors for branding consistency.
- **Improved UI Density**: Refined the settings popover for desktop (popover) and mobile (bottom-sheet) with a 13-14px font baseline.
- **Visual Branding**: Applied dynamic calendar colors to side borders, badges, and search results to ensure clinic identity is maintained everywhere.

## Recent Updates (v1.0.021)
- **Professional Typography Refinement**: Systematically reduced all font sizes across the app to create a more sophisticated, high-end medical interface.
- **Card Styling Upgrade**: Unified card aesthetics with subtle transitions and precise spacing for better information density.
- **Micro-UI Density**: Optimized the toolbar and hero sections for mobile, moving to an 11px/12px baseline for a modern, digital-first look.

## Recent Updates (v1.0.020)
- **Extreme Mobile Optimization**: Transformed the "Today" view into vertical cards on mobile for better readability.
- **Sticky Filter Actions**: Search and filter buttons now stick to the bottom of the drawer on mobile for one-hand use.
- **Ultra-Compact Typography**: Streamlined font sizes and padding across the app to maximize mobile screen real estate.
- **Refined Interaction**: Improved touch targets and reduced vertical footprints of headers and toolbars.

## Recent Updates (v1.0.018)

## Recent Updates (v1.0.016)
- **UI Architecture Refinement**: Consolidated all controls into a single, high-performance Toolbar with better mobile density.
- **Smart Search**: Re-engineered search normalization to perfectly match doctors even with status icons or clinical titles.
- **Improved UX**: Selecting a doctor from search now automatically switches to "Week View" for better schedule context.
- **Mobile-First Design**: Reduced padding and font sizes across mobile views to prevent oversized elements.
- **Clean Hero**: Replaced image carousel with a professional text-based hero and services section.
- **Professional Credits**: Added developer attribution to the footer.

## Recent Updates (v1.0.015)
- **UI Architecture Refinement**: Consolidated all controls into a single, high-performance Toolbar.
- **Compact Layout**: Reduced unnecessary whitespace and modernized the Hero section for better content density.
- **Search Fix**: Re-engineered doctor name normalization (removing clinical titles and status icons) to ensure perfect matching across search results and schedule data.
- **Enhanced Normalization**: Improved algorithm to handle various Arabic/English doctor name formats (Dr., Prof., أخصائي, etc.).
- **Sticky Controls**: Improved navigation flow with a cleaner, more intuitive top-level interface.

## Recent Updates (v1.0.014)
- **Admin Dashboard**: Integrated Firebase Authentication and Firestore. Admins can now log in with Google and update doctor availability statuses (✅ متواجد, ❌ اعتذر, ⚠️ تأخير, ❗ حالة طارئة) directly into Google Calendar.
- **RTL Navigation**: Reversed day navigation buttons for a more natural Arabic user experience.
- **Advanced Search Actions**: Searching now allows direct interaction (jump to clinic or open doctor's weekly modal).
- **Collapsible Sidebar**: Desktop users can now toggle the filter sidebar to maximize their view.
- **Improved Logo**: Refined logo container and fallback behavior for brand consistency.
- **Responsive Navigation**: Unified all core actions (Search, Filter, Admin) into a clean mobile-ready navigation drawer.

## Recent Updates (v1.0.013)
- **UI Swapping (RTL)**: Corrected the order of Next/Previous day buttons to align with RTL user flow.
- **Enhanced Search**: Search results now directly trigger actions (Open doctor modal or jump and expand specialty section).
- **Collapsible Sidebar**: Desktop filters can now be hidden/shown to maximize screen space for the schedule.
- **Unified Navigation**: Added a comprehensive Side Menu / Drawer that manages primary navigation, search, and filters.
- **Admin Foundation**: Integrated a placeholder for the Admin Panel in the navigation drawer, preparing for Firebase OAuth integration.
- **Branding**: Fixed logo display and aspect ratio in the header.

## Recent Updates (v1.0.012)

## Recent Updates (v1.0.011)

## Recent Updates (v1.0.010)
- **Bug Fix**: Resolved `ReferenceError: X is not defined` in the filter sidebar.
- **Today Table Refactoring**: Unified professional table with specialty row tinting and smooth transitions.
- **Doctor Modal**: Detailed weekly view (Saturday–Friday) accessible from the Today table.
- **Day Navigation**: "Next Day" and "Previous Day" buttons for faster browsing.
- **Responsive Sidebar**: Filter and search controls moved to a dynamic sidebar (drawer on mobile).
- **Redesigned Hero**: Enhanced stable carousel for banner displays.
- **UI Polishing**: Stickier headers, improved spacing, and stable layout structure.

## Recent Updates (v1.0.009)
- **Today Table Refactoring**: Unified professional table with specialty row tinting and smooth transitions.
- **Doctor Modal**: Detailed weekly view (Saturday–Friday) accessible from the Today table.
- **Day Navigation**: "Next Day" and "Previous Day" buttons for faster browsing.
- **Responsive Sidebar**: Filter and search controls moved to a dynamic sidebar (drawer on mobile).
- **Redesigned Hero**: Enhanced stable carousel for banner displays.
- **UI Polishing**: Stickier headers, improved spacing, and stable layout structure.

## Recent Updates (v1.0.007)
- **Specialty Row Coloring**: Added subtle background tints (blue/red) to rows in the unified today table to group clinics visually.
- **Doctor Schedule Popup**: Integrated an interactive modal that opens when clicking a doctor's name, displaying their full weekly schedule.
- **Name Normalization**: Improved doctor search logic to ignore emoji status markers (❌, ✔️, etc.) when correlating schedules.
- **UI Enhancements**: Refined the today table with clearer specialty badges and hover states.

## Recent Updates (v1.0.006)
- **Unified Today Table**: Implemented a single, professional unified table for the "Today" view as requested. It combines all selected clinics into one clean list with sticky headers.
- **Enhanced Mobile Responsiveness**: Today's table is optimized for mobile with horizontal scrolling and compact typography.
- **Separated View Logic**: Maintained the accordion-based grouping for the "Weekly" view while providing the flat table for "Today".
- **Refined Table Layout**: Added specialized chips for timing and status/notes markers (Excused, Alternative, Exception, Pre-booking).

## Recent Updates (v1.0.005)
- **Bug Fix**: Fixed a `ReferenceError` where `startOfToday` was missing in the schedule display component.
- **Improved Stability**: Reinforced date-fns imports for better runtime reliability.

## Recent Updates (v1.0.004)
- **Today/Weekly View Modes**: Added a new segmented control to switch between a focused "Today" view and a "Weekly" (Saturday to Friday) grid.
- **Auto-Weekly Logic**: The weekly view automatically calculates the current week (Sat-Fri) containing today.
- **Dynamic Highlights**: Today's column in the weekly view is now highlighted with a soft yellow background and a prominent dark-red header for high visibility.
- **Accordion UX Enhancement**: All medical specialties are now collapsed by default for a cleaner interface, with smooth animated expansions.
- **Refined Branding**: Reinforced the blue/red medical palette across all interactive elements.

## Recent Updates (v1.0.003)
- **Complete UI/UX Redesign**: Modern medical center aesthetic.
- **Brand Colors**: Full Blue/Red theme (removed all green).
- **Hero Section**: High-impact medical banners with animated text.
- **Accordion Schedules**: Collapsible specialty sections with doctor cards.
- **Refined UX**: Improved mobile responsiveness and print view.

## Setup Instructions

### 1. Environment Variables
Create a `.env` file in the root directory (based on `.env.example`) and add your Google Calendar API Key:
```env
GOOGLE_CALENDAR_API_KEY=YOUR_ACTUAL_API_KEY
```

### 2. Google Calendar API Configuration
- Go to [Google Cloud Console](https://console.cloud.google.com/).
- Enable "Google Calendar API".
- Create an API Key in "Credentials".
- Ensure the calendars mentioned in `src/constants.ts` are set to **Public** in their settings:
  1. Open Google Calendar.
  2. For each calendar: Settings and sharing -> Access permissions for events -> Make available to public.

### 3. Deployment (Vercel)
- Push this code to a GitHub repository.
- Connect the repository to Vercel.
- Add `GOOGLE_CALENDAR_API_KEY` to Vercel's Environment Variables.

## Tech Stack
- **Framework**: Vite + React + Express (Full-stack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Animation**: Framer Motion (motion/react)
- **Icons**: Lucide React
- **Date Logic**: date-fns

---
**Version**: 1.0.025
