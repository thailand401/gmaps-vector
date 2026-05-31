# Plan: Backend Admin Dashboard with FastAPI & Matrix UI

## TL;DR
Build a FastAPI-based admin dashboard for Supabase table management with Matrix-style black/green UI. Create two main components:
1. **FastAPI backend** with REST API for CRUD operations on categories & intents with relationship management
2. **HTML/CSS/JS frontend** with Matrix-style UI for admin management
3. **Copilot instruction file** that serves as a checklist template for future table/relationship additions

**Tech Stack:** FastAPI (Python backend) + Plain HTML/CSS/JS (Matrix-themed frontend) + Supabase

---

## Steps

### Phase 1: Project Setup
1. Initialize FastAPI project structure
   - `backend/` folder with `main.py`, `config.py`, `requirements.txt`
   - Create virtual environment and install dependencies (fastapi, uvicorn, supabase-py, python-dotenv, cors)
   - Add `.env` file with Supabase credentials (provided by user)

2. Set up Supabase connection & verify existing tables
   - Connect to Supabase using provided URL & API key
   - Verify `categories` and `intents` tables exist and document schema
   - Confirm `category_id` foreign key relationship in `intents` table

### Phase 2: FastAPI Backend Development
3. Create database models & service layer
   - Define Pydantic models for Category and Intent (with TypeScript-like validation)
   - Create `services/category_service.py` for categories CRUD
   - Create `services/intent_service.py` for intents CRUD with relationship handling

4. Build REST API endpoints
   - Categories: GET (list, search, filter), POST (create), PUT (update), DELETE
   - Intents: GET (list, search, filter, by category), POST (create), PUT (update), DELETE
   - Relationship management: endpoint to update intent's category association

5. Add error handling & logging
   - Global exception handlers for database errors
   - Request/response logging middleware

### Phase 3: Admin UI (Matrix-Style)
6. Create base HTML/CSS structure
   - Single page application structure with Matrix theme (black background, green text, retro terminal style)
   - Main dashboard layout with sidebar navigation (Categories, Intents, Logs)
   - CSS styling for Matrix aesthetic (including glowing effects, font choices, etc.)

7. Build admin interface components
   - **Categories panel:** List view, create form, edit modal, delete confirmation
   - **Intents panel:** List view with category filter, create form, edit modal, relationship selector
   - **Search & filter UI:** Real-time search across tables, priority/category filtering
   - Tables with inline edit/delete actions, pagination/scroll support

8. Implement frontend JavaScript logic
   - Fetch module for API communication (create, read, update, delete)
   - Event handlers for forms, buttons, modals
   - Dynamic DOM rendering for categories & intents lists
   - Client-side search/filter logic

### Phase 4: Integration & Testing
9. Connect frontend to FastAPI backend
   - Ensure CORS is properly configured
   - Test all CRUD operations end-to-end
   - Verify relationship management (assigning intents to categories)

10. Create Copilot instruction file (`.instructions.md`)
    - Document project structure and conventions
    - Provide **checklist template** for adding new tables:
      - Database schema definition
      - Pydantic model creation
      - Service layer implementation (CRUD functions)
      - API endpoint setup
      - Admin UI components (list, form, filters)
      - JavaScript handlers for the new table
    - Include code snippets/examples from existing categories/intents tables
    - Guidance on maintaining Matrix aesthetic for new components

---

## Relevant Files

### To Create (Backend)
- `backend/main.py` — FastAPI app setup, routes mounting, middleware config
- `backend/config.py` — Supabase client initialization, environment variables
- `backend/models.py` — Pydantic models for Category and Intent
- `backend/services/category_service.py` — Categories CRUD logic
- `backend/services/intent_service.py` — Intents CRUD logic with relationships
- `backend/requirements.txt` — Python dependencies
- `.env` — Supabase credentials (user-provided)

### To Create (Frontend)
- `admin/index.html` — Main admin dashboard page
- `admin/css/style.css` — Matrix theme & component styling
- `admin/js/app.js` — Main JavaScript logic (routing, API calls)
- `admin/js/components.js` — Reusable UI component builders (forms, tables, modals)
- `admin/js/api.js` — API client for backend communication

### Configuration & Documentation
- `.instructions.md` — Copilot instruction file for future table additions (**CRITICAL**)
- `README.md` — Update with setup instructions, running the app, adding new tables

---

## Verification

1. **Backend Setup:**
   - FastAPI server runs without errors on `http://localhost:8000`
   - Supabase connection successful (test query to categories table)
   - Health check endpoint `/api/health` returns 200

2. **API Testing:**
   - GET `/api/categories` returns list of categories
   - POST `/api/categories` creates new category with correct response
   - GET `/api/intents` returns list of intents
   - GET `/api/intents?category_id=DRIVER_STATUS` filters by category
   - PUT/DELETE operations update/remove data correctly

3. **Admin UI Testing:**
   - Dashboard loads and displays Matrix theme (black bg, green text)
   - Categories list displays all categories from database
   - Can create new category via form → appears in list immediately
   - Can edit/delete categories
   - Intents list shows all intents with filters by category
   - Can create/edit/delete intents
   - Category relationship dropdown in intent form works correctly
   - Search function filters both categories and intents in real-time

4. **Documentation:**
   - `.instructions.md` exists and clearly outlines steps for adding new tables
   - Template checklist is complete with code examples

---

## Decisions

- **Framework Choice:** FastAPI for type-safe, auto-documented APIs; plain HTML/CSS/JS for simplicity and quick deployment without build tools
- **UI Design:** Matrix aesthetic (black background, green text, retro/terminal style) as requested, focused on usability for admin operations
- **Copilot Integration:** Checklist-based approach (not full code generation) to allow flexibility and customization while providing clear guidance
- **Deployment:** Initially local development; can be containerized with Docker later
- **Scope Boundaries:**
  - **INCLUDED:** CRUD for 2 tables, search/filter, relationship management, Matrix UI, Copilot instruction
  - **EXCLUDED:** User authentication, audit logs, bulk import/export (can be added later), complex role management

---

## Further Considerations

1. **Supabase Schema Confirmation**
   - Need to confirm the exact schema for `categories` and `intents` tables in Supabase
   - Are there any constraints, defaults, or additional fields beyond what's in `intent.json`?
   - Is `category_id` a foreign key properly indexed?

2. **Data Validation & Constraints**
   - Should priority field be restricted to enum values (Low, Medium, High, Critical)?
   - Any uniqueness constraints on category_id or intent names?
   - Character length limits for descriptions?

3. **Future Scalability**
   - When adding future tables, should the instruction guide include performance optimization patterns (indexing, pagination)?
   - Should the admin UI automatically adapt to new table schemas, or is semi-manual setup acceptable?
