# NXGN. - Complete Ministry Management Platform Prompt

Create a "NXGN." web app (yes, it has a period at the end).

## 🎨 Design Requirements

**Mobile-Only Dark Theme**
- Fortune 500–style sleek dark UI
- Primary color: Blue (#3B82F6 - `216 90% 56%`)
- Dark background theme throughout
- Professional, modern interface with smooth animations
- Responsive design optimized for mobile devices

**Opening Experience**
- Splash screen with NXGN logo that fades in/out for 2 seconds
- Automatic transition to login/authentication page

## 🔐 Authentication System

**Pincode-Only Authentication**
- No traditional email/password system
- Users create and login with personal pincodes
- Main Admin Pincode: `AdminAdminJrev007` (pre-configured)

**Account Creation Flow**
1. User selects "Join a Ministry"
2. Browse available ministries/churches by name
3. Enter ministry-specific passcode to request access
4. Ministry Sub-Admin approves or declines requests
5. Account creation includes: Name + Personal Pincode

## 🏛️ Multi-Church/Ministry System

**Ministry Management**
- Main Admin can create/manage multiple ministries
- Each ministry has unique passcode for joining
- Auto-generated or custom passcodes
- Ministry admins assigned per church/organization

**Join Process**
- Display list of available ministries
- Require ministry passcode to join
- Pending approval system for new members

## 👥 Role-Based Access Control

**Main Admin (Super Admin)**
- Global control across entire platform
- Create/edit/delete ministries
- Assign Sub-Admins to specific ministries
- Manage all users across all ministries
- Full CRUD permissions everywhere

**Sub-Admin (Ministry Admin)**
- Manage only their assigned church/ministry
- CRUD operations for:
  - Songs (title, lyrics, chords, category)
  - Playlists (Spotify-style collections)
  - Ministry members (approve/decline/remove)
- Cannot access other ministries

**User (Member)**
- Join ministry after approval
- Read-only access to songs and playlists
- Cannot edit, create, or delete content
- View ministry's song library and playlists

## 🎵 Song & Playlist Management

**Song Structure**
- Title (required)
- Lyrics (textarea)
- Chords (textarea)
- Category: "Worship" or "Praise" (dropdown)
- Ministry association
- Created by (user tracking)

**Playlist Features**
- Spotify-style song collections
- Add/remove songs from ministry's library
- Order songs within playlists
- Create multiple playlists per ministry

**Search & Filter**
- Search bar: search across song titles and lyrics
- Filter by category: All, Worship, Praise
- Real-time filtering as user types

## 🛠️ User Interface Components

**Dashboard Navigation**
- Tab-based navigation: Songs, Playlists, Ministries, Members, Settings
- Role-based tab visibility
- Header shows: Logo, ministry name, user info, profile circle

**Profile Management**
- Top-right circular profile photo or initial
- Profile settings accessible via profile circle
- Upload/change profile photo
- Add custom tag with color selection (e.g., "Worship Leader", "Pianist")
- Account information display
- Logout functionality

## 📱 Technical Specifications

**Tech Stack**
- Vite + React + TypeScript
- Tailwind CSS for styling
- Blink SDK for backend services
- Local storage for session management

**Database Tables Required**
```sql
-- Users table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  pincode TEXT UNIQUE NOT NULL,
  role TEXT CHECK(role IN ('main_admin', 'sub_admin', 'user')) DEFAULT 'user',
  ministry_id TEXT,
  status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  profile_photo TEXT,
  custom_tag TEXT,
  custom_tag_color TEXT DEFAULT '#8B5CF6'
);

-- Ministries table
CREATE TABLE ministries (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  passcode TEXT NOT NULL,
  admin_id TEXT,
  description TEXT
);

-- Songs table
CREATE TABLE songs (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  lyrics TEXT,
  chords TEXT,
  category TEXT CHECK(category IN ('Worship', 'Praise')) DEFAULT 'Worship',
  ministry_id TEXT NOT NULL,
  created_by TEXT NOT NULL
);

-- Playlists table
CREATE TABLE playlists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  ministry_id TEXT NOT NULL,
  created_by TEXT NOT NULL,
  songs TEXT DEFAULT '[]' -- JSON array of song IDs
);

-- Join requests table
CREATE TABLE join_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  ministry_id TEXT NOT NULL,
  status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending'
);
```

**Key Features to Implement**
1. Splash screen with logo animation
2. Pincode authentication system
3. Ministry selection and joining process
4. Role-based dashboard with appropriate tabs
5. Song library with search/filter capabilities
6. Playlist management (create, edit, add/remove songs)
7. User management for admins (approve/decline requests)
8. Profile settings with photo upload and custom tags
9. Ministry management for Main Admin
10. Responsive mobile-first design

**UI/UX Requirements**
- Smooth fade-in animations for page transitions
- Loading states for all async operations
- Error handling with user-friendly messages
- Confirmation dialogs for destructive actions
- Empty states for no data scenarios
- Form validation and feedback

**Color Scheme**
- Background: `240 3% 4%` (very dark)
- Cards: `240 4% 8%` (dark gray)
- Primary: `216 90% 56%` (blue)
- Text: `0 0% 98%` (white)
- Muted: `240 5% 65%` (gray)
- Borders: `240 4% 16%` (dark borders)

This prompt will create a complete, production-ready ministry management platform with role-based access, song/playlist management, and a polished mobile-first interface.