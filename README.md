# Smart Timetable Management System

A **Design and Analysis of Algorithms (DAA)** project that generates conflict-free academic timetables using graph coloring (DSATUR algorithm).

## Features

- Admin login (username: `admin`, password: `admin123`)
- Manage Teachers, Rooms, Subjects, and Batches
- Auto-generate timetable using DSATUR graph coloring algorithm
- Detects and avoids teacher/room/batch scheduling conflicts
- Filter timetable by batch or teacher
- Export generated timetable as JSON
- C backend CLI that does the same thing from the command line

## Project Structure

```
smart-timetable-system/
├── frontend/
│   ├── index.html       - Login page
│   ├── dashboard.html   - Main dashboard
│   ├── style.css        - Styles
│   ├── app.js           - CRUD and navigation logic
│   ├── login.js         - Login handling
│   └── timetable.js     - Scheduling algorithm + timetable grid
├── backend/
│   ├── main.c           - Entry point
│   ├── graph.c/h        - Graph structure
│   ├── scheduler.c/h    - DSATUR coloring and backtracking
│   └── parser.c/h       - JSON parser
├── data/
│   └── sample_data.json
└── docs/
    └── algorithm.md
```

## How to Run (Frontend)

Just open `frontend/index.html` in any browser. No server needed.

```
Username: admin
Password: admin123
```

## Building the C Backend

```bash
cd backend
gcc -Wall -o scheduler main.c graph.c scheduler.c parser.c
./scheduler ../data/sample_data.json
```

Output is a JSON timetable printed to stdout.

## How it Works

The scheduling problem is modelled as graph coloring:
- Each class session is a node (vertex)
- Two sessions conflict (edge) if they share a teacher, room, or batch
- Time slots are colors — goal is to color the graph with minimum colors (slots)

The DSATUR algorithm picks the most "constrained" uncolored node at each step and assigns the smallest valid color (slot). If more slots are needed than available, it falls back to backtracking.

## Tech Stack

- Frontend: plain HTML, CSS, JavaScript (no frameworks)
- Backend: C (C99)
- Storage: localStorage in browser, JSON files for the C backend

