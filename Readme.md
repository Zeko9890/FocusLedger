# FocusLedger - Productivity Analytics Web App

A professional-grade productivity tracking application built with vanilla HTML, CSS, and JavaScript using Supabase as the backend.

## Features

- **Focus Timer**: Pomodoro-style timer with customizable focus/break durations
- **Task Management**: Log and track tasks associated with focus sessions
- **Distraction Logging**: Record distractions during focus sessions
- **Analytics Dashboard**: Visualize productivity trends and patterns
- **User Authentication**: Secure signup/login with Supabase Auth
- **Dark/Light Theme**: Professional design with theme switching
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Data Export**: Export sessions and tasks as CSV
- **Offline Support**: Basic functionality works offline

## Tech Stack

- **Frontend**: Pure HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Backend**: Supabase (PostgreSQL + Auth + REST API)
- **Charts**: Chart.js for data visualization
- **Icons**: Custom SVG icons
- **Fonts**: Inter (UI) + JetBrains Mono (timer)

## Setup Instructions

### 1. Supabase Configuration

1. Create a Supabase account at [supabase.com](https://supabase.com)
2. Create a new project
3. Get your project URL and anon key from Settings > API
4. Run the SQL schema from `supabase-schema.sql` in the SQL Editor
5. Configure authentication in Authentication > Settings

### 2. Application Configuration

1. Clone or download this repository
2. Update `js/supabase.js` with your Supabase credentials:
   ```javascript
   const SUPABASE_URL = 'https://your-project.supabase.co';
   const SUPABASE_ANON_KEY = 'your-anon-key-here';