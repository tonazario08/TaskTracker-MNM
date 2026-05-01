# TaskTracker Design Specification

## Brand & Visual Style
- **App Name:** TaskTracker
- **Logo:** "TaskT" (Dark Charcoal) + "racker" (Silver Gray) in Poppins 800, -1px letter-spacing.
- **Theme:** White & Silver Gray.
- **Colors:**
    - Backgrounds: #FFFFFF, #F8F9FA, #F1F3F5.
    - Surface/Card: #FFFFFF with #E9ECEF border.
    - Text: Primary #212529, Secondary #868E96, Muted #ADB5BD.
    - Accent/CTA: #212529 (Dark Charcoal).
    - Status/Priority: Specific color tokens for Urgent, High, Medium, Low and To Do, In Progress, In Review, Done.
- **Typography:**
    - Headings: Poppins.
    - Body/UI: Inter.
- **Components:**
    - Border Radius: 8px (Buttons/Inputs), 12px (Cards), 16px (Modals), 100px (Pills).
    - Shadows: Soft shadows for depth.

## Layout
- **Sidebar (240px):** Fixed left, collapsible. Contains Logo, Nav, Workspace Switcher, and User Profile.
- **Header (60px):** Fixed top. Contains Breadcrumbs, Search, and Notifications.
- **Main Content:** Responsive fluid area.

## Planned Screens
1. **Dashboard:** Overview of personal productivity, upcoming deadlines, and project health.
2. **Project Board (Kanban):** Visual task management with columns for To Do, In Progress, In Review, and Done.
3. **Task List View:** A dense, filterable list of all tasks across projects.
4. **Task Detail Modal/View:** Comprehensive view of a single task with description, activity, and assignments.