# Admin Dashboard - Intent Management System

A comprehensive backend admin dashboard for managing categories, intents, and relationships in Supabase. Built with **FastAPI** (Python backend) and a **Matrix-themed HTML/CSS/JS frontend**.

---

## 📋 Overview

This project provides:
- **FastAPI REST API** for CRUD operations on `categories` and `intents` tables
- **Matrix-themed admin UI** with black background and green text (retro terminal style)
- **Real-time search & filtering** across all tables
- **Relationship management** (intents linked to categories)
- **Copilot instruction file** for automating future table additions

---

## 🏗️ Architecture

### Backend
- **Framework:** FastAPI with Uvicorn
- **Database:** Supabase PostgreSQL
- **Models:** Pydantic for type validation
- **Services:** Service layer pattern for CRUD logic
- **API:** RESTful with proper error handling & logging

### Frontend
- **HTML/CSS/JavaScript** (no build tools required)
- **Matrix Theme:** Black background, green/neon text, retro terminal aesthetic
- **Single-Page App:** View switching with sidebar navigation
- **Real-time Updates:** Instant feedback with toast notifications

---

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- pip or conda
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Supabase account with configured tables

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment

Create `.env` file in project root (already created with your credentials):
```
SUPABASE_URL=https://mqgnvsqudbbkaymeqzzh.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Start Backend Server

```bash
cd backend
python main.py
```

Expected output:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 4. Open Admin UI

Option A: Open directly
```bash
open admin/index.html
```

Option B: Serve with HTTP server (recommended)
```bash
cd admin
python3 -m http.server 8080
# Open http://localhost:8080/index.html
```

---

## 📁 Project Structure

```
gmaps-vector/
├── backend/
│   ├── main.py                          # FastAPI app with all routes
│   ├── config.py                        # Supabase client initialization
│   ├── models.py                        # Pydantic models (Category, Intent)
│   ├── services/
│   │   ├── __init__.py
│   │   ├── category_service.py          # Category CRUD logic
│   │   └── intent_service.py            # Intent CRUD logic with relationships
│   └── requirements.txt                 # Python dependencies
│
├── admin/
│   ├── index.html                       # Main dashboard UI
│   ├── css/
│   │   └── style.css                    # Matrix theme styling
│   └── js/
│       ├── api.js                       # API client for backend calls
│       ├── components.js                # UI component builders
│       └── app.js                       # Main application logic
│
├── .env                                 # Environment variables (secrets)
├── .instructions.md                     # Copilot guide for adding new tables
├── README.md                            # This file
└── [other project files]
```

---

## 🔌 API Endpoints

### Health Check
```
GET /api/health
Response: { "status": "ok", "database": "connected" }
```

### Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/categories` | List all categories (with optional search) |
| GET | `/api/categories/{category_id}` | Get single category |
| POST | `/api/categories` | Create new category |
| PUT | `/api/categories/{category_id}` | Update category |
| DELETE | `/api/categories/{category_id}` | Delete category |

**Example: Create Category**
```bash
curl -X POST http://localhost:8000/api/categories \
  -H "Content-Type: application/json" \
  -d '{"category_id": "CUSTOM_STATUS", "category": "Custom Status"}'
```

### Intents

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/intents` | List all intents (with filters) |
| GET | `/api/intents/{intent_id}` | Get single intent |
| GET | `/api/intents?category_id=DRIVER_STATUS` | Filter intents by category |
| GET | `/api/intents?priority=Critical` | Filter intents by priority |
| GET | `/api/categories/{category_id}/intents` | Get intents for category |
| POST | `/api/intents` | Create new intent |
| PUT | `/api/intents/{intent_id}` | Update intent |
| DELETE | `/api/intents/{intent_id}` | Delete intent |

**Example: Create Intent**
```bash
curl -X POST http://localhost:8000/api/intents \
  -H "Content-Type: application/json" \
  -d '{
    "intent": "CUSTOM_INTENT",
    "priority": "High",
    "description": "A custom intent for testing",
    "category_id": "DRIVER_STATUS"
  }'
```

---

## 🎨 Admin Dashboard Features

### Dashboard View
- **Stats Cards:** Total categories, intents, and critical intents
- **Real-time Updates:** Refreshes automatically on data changes

### Categories View
- **List Table:** All categories with relationship count
- **Add Button:** Create new category
- **Edit/Delete:** Inline action buttons
- **Search:** Filter by category ID or name

### Intents View
- **List Table:** All intents with category, priority, and description
- **Filters:** Priority dropdown and category dropdown
- **Add Button:** Create new intent
- **Edit/Delete:** Inline action buttons
- **Search:** Global search across intent name and description
- **Priority Badges:** Color-coded (Red=Critical, Orange=High, Yellow=Medium, Green=Low)

### User Interactions
- **Modals:** Add/Edit forms pop up without page reload
- **Validations:** Required field checks before submission
- **Toast Notifications:** Success/error feedback messages
- **Live Refresh:** After any operation (create, update, delete), table updates instantly
- **Search:** Real-time filtering as you type

---

## 🔑 Key Features

### CRUD Operations
✅ Create categories and intents  
✅ Read/list all records with search  
✅ Update existing records  
✅ Delete records with confirmation  

### Relationships
✅ Intents automatically linked to categories  
✅ Category dropdown when creating/editing intents  
✅ Display category name in intents table  
✅ Filter intents by category  

### Search & Filter
✅ Global search across all fields  
✅ Priority filtering (Critical, High, Medium, Low)  
✅ Category filtering  
✅ Multiple filters combined  

### Matrix Theme
✅ Black background (#000000)  
✅ Neon green text (#00ff41)  
✅ Retro terminal aesthetic  
✅ Glowing effects on interactive elements  
✅ Smooth animations and transitions  

---

## 🧪 Testing the API

### Using cURL

**Test health check:**
```bash
curl http://localhost:8000/api/health
```

**Get all categories:**
```bash
curl http://localhost:8000/api/categories
```

**Create a category:**
```bash
curl -X POST http://localhost:8000/api/categories \
  -H "Content-Type: application/json" \
  -d '{"category_id": "TEST_CAT", "category": "Test Category"}'
```

### Using Postman
1. Import the endpoints from the API Endpoints section above
2. Set base URL to `http://localhost:8000`
3. Test each endpoint with provided examples

### Using Admin Dashboard
1. Navigate to Categories or Intents view
2. Click "+ Add" button
3. Fill in form and submit
4. Verify data appears in table
5. Click "Edit" or "Delete" to modify/remove

---

## 📝 Adding New Tables

When you need to add a new table to the dashboard, follow the **Copilot instruction file**: [.instructions.md](.instructions.md)

Quick steps:
1. Create table in Supabase
2. Add Pydantic models in `backend/models.py`
3. Create service class in `backend/services/{table}_service.py`
4. Add API routes to `backend/main.py`
5. Add HTML, forms, and modals to `admin/index.html`
6. Add API methods to `admin/js/api.js`
7. Add UI components to `admin/js/components.js`
8. Add event handlers to `admin/js/app.js`
9. Test all CRUD operations

See `.instructions.md` for detailed checklist with code templates.

---

## 🐛 Troubleshooting

### Backend won't start
```
Error: ModuleNotFoundError: No module named 'fastapi'
```
**Solution:** Ensure you're in `backend/` directory and ran `pip install -r requirements.txt`

### Cannot connect to Supabase
```
Error: Failed to fetch categories: ...
```
**Solution:** 
- Verify `.env` file exists in project root with correct credentials
- Check Supabase URL is accessible
- Confirm tables `categories` and `intents` exist in Supabase

### CORS error in browser console
```
Access to fetch at 'http://localhost:8000/api/categories' has been blocked by CORS policy
```
**Solution:** CORS is already configured in `main.py`. If error persists:
- Verify backend is running on correct port (8000)
- Check frontend is served over HTTP (not file://)

### Modal doesn't close after save
**Solution:** Check browser console for JavaScript errors. Ensure form submission doesn't throw exception.

### Data doesn't update in table
**Solution:** Click the 🔄 refresh button or reload the page. Check browser console for API errors.

---

## 📊 Database Schema

### Categories Table
```sql
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  category_id VARCHAR(50) UNIQUE NOT NULL,
  category VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Intents Table
```sql
CREATE TABLE intents (
  id SERIAL PRIMARY KEY,
  intent VARCHAR(100) NOT NULL,
  priority VARCHAR(20) NOT NULL,
  description TEXT,
  category_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(category_id)
);
```

---

## 🔒 Security Notes

⚠️ **Current Setup (Development Only)**
- Supabase service role key is exposed in `.env` (matches API key shown in frontend)
- CORS allows all origins (`allow_origins=["*"]`)
- No authentication/authorization implemented

✅ **For Production:**
- Use environment-specific secrets (separate dev/prod keys)
- Restrict CORS to specific domains
- Implement user authentication (JWT, OAuth, etc.)
- Add role-based access control (admin, user, viewer)
- Use read-only keys where possible
- Set up audit logging and activity tracking
- Enable RLS (Row Level Security) in Supabase

---

## 🚢 Deployment

### Docker (Optional)
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install -r requirements.txt
COPY backend/ .
CMD ["python", "main.py"]
```

### Vercel/Netlify (Frontend)
- Deploy `admin/` directory as static site
- Update `API_BASE_URL` in `admin/js/api.js` to production API URL

### Cloud Platforms (Backend)
- FastAPI is compatible with: AWS Lambda, Google Cloud Run, Heroku, Railway, Render
- Remember to set environment variables on deployment platform

---

## 📚 Reference

- [FastAPI Documentation](https://fastapi.tiangolo.com/)
- [Supabase Documentation](https://supabase.com/docs)
- [Pydantic Documentation](https://docs.pydantic.dev/)

---

**Version:** 1.0  
**Last Updated:** May 29, 2026