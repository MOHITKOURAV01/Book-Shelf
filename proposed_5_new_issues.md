# Proposed New Issues

Here are 5 new issues to further improve the Book-Shelf application, covering UI/UX enhancements, e-commerce features, and search improvements.

---

## 1. Feature: Implement Dark Mode Theme

**Type:** Feature / UI/UX
**Priority:** Medium
**Difficulty:** Intermediate

**Problem Statement:**
Users currently only have a light mode interface, which can cause eye strain in low-light environments. Adding a dark mode is a standard accessibility and user preference feature in modern web applications.

**Description:**
The application already uses CSS variables for colors (e.g., `--ink`, `--paper`, `--paper-dim`). This feature will introduce a new `data-theme="dark"` attribute on the `<html>` or `<body>` element that overrides these CSS variables with dark mode equivalents. A toggle switch should be added to the Navbar (and potentially the new Settings tab) allowing users to manually switch between light and dark themes. The user's preference should be saved to `localStorage` so it persists across sessions, and it should respect the `prefers-color-scheme` media query by default.

**Functional Requirements:**

- Define dark mode CSS variables in `index.css`.
- Add a theme toggle button in the Navbar.
- Persist the selected theme in `localStorage`.
- Support system default (`prefers-color-scheme`).

---

## 2. Feature: Guest Checkout Support

**Type:** Feature / E-commerce
**Priority:** High
**Difficulty:** Advanced

**Problem Statement:**
Forcing users to create an account before completing a purchase significantly increases checkout abandonment rates. The current checkout flow (once implemented) should not strictly require authentication.

**Description:**
This feature will introduce a Guest Checkout pathway. When an unauthenticated user attempts to check out, they should be presented with a choice to either "Log In", "Create Account", or "Continue as Guest". The guest flow should only collect essential shipping and contact information (email for order confirmation) without requiring a password.

**Functional Requirements:**

- Create a "Checkout Gateway" component prompting login or guest continuation.
- Update the checkout forms to handle guest data state independently of the authenticated user context.
- Ensure guest orders can still be submitted (to mock API) successfully.

---

## 3. Enhancement: Search Autocomplete & Suggestions

**Type:** Enhancement / Frontend
**Priority:** Medium
**Difficulty:** Intermediate

**Problem Statement:**
While live search might filter results on a dedicated page, the global search bar does not provide immediate feedback. Users must press Enter to see if a book exists, which slows down product discovery.

**Description:**
Enhance the global search input in the Navbar to show a dropdown of autocomplete suggestions as the user types. The dropdown should display the top 3-5 matching books with their thumbnail, title, and author. Clicking a suggestion should route the user directly to that book's `BookDetail` page.

**Functional Requirements:**

- Implement a debounced search function that queries the mock data.
- Create an absolutely positioned dropdown menu below the search bar.
- Add keyboard navigation (Up/Down arrows, Enter) for the dropdown suggestions.
- Handle clicking outside to close the dropdown.

---

## 4. Feature: Add "Recently Viewed Books" Section

**Type:** Feature / UI
**Priority:** Low
**Difficulty:** Beginner-Intermediate

**Problem Statement:**
When browsing multiple books, users often want to navigate back to a book they looked at previously. Currently, they have to rely on browser history or searching for the book again.

**Description:**
Introduce a "Recently Viewed" section that appears at the bottom of the Home page and/or the BookDetail page. The application should store an array of the last 5-10 visited book IDs in `localStorage`. A new component will read these IDs, fetch the corresponding book data, and display them in a horizontal scrollable row.

**Functional Requirements:**

- Update `BookDetail.jsx` to push the current book ID to a `recentlyViewed` array in `localStorage`.
- Create a `RecentlyViewed` component that renders a small carousel or grid of book cards.
- Ensure the current book is excluded from the "Recently Viewed" list if displayed on the BookDetail page itself.

---

## 5. Feature: Advanced Filtering and Faceted Search

**Type:** Feature / Frontend
**Priority:** High
**Difficulty:** Intermediate

**Problem Statement:**
As the book catalog grows, finding specific books by scrolling or basic text search becomes inefficient. Users need ways to narrow down the catalog based on specific attributes.

**Description:**
Add a sidebar or a collapsible filter menu to the main Catalog/Home page that allows users to filter books by Category/Genre, Price Range, and Rating. Multiple filters should be applicable simultaneously (e.g., Fiction books under $20 with 4+ stars).

**Functional Requirements:**

- Create a `FilterSidebar` component with checkboxes for categories and a slider/inputs for price.
- Update the main catalog state to derive the displayed books based on the active filter criteria.
- Add URL query parameters (e.g., `?category=fiction&maxPrice=20`) so that filtered views can be shared or bookmarked.
