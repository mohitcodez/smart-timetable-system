# Smart Timetable Management System

A **Design and Analysis of Algorithms (DAA)** project that automatically generates
conflict-free academic timetables using **Graph Coloring** (DSATUR algorithm).

---

## Features

- **Admin Login** — simple session-based authentication
- **Teacher / Room / Subject / Batch CRUD** — full in-browser management with localStorage persistence
- **Automatic Timetable Generation** — DSATUR graph coloring with backtracking fallback
- **Conflict Validation** — guarantees no teacher / room / batch conflicts
- **Visual Timetable Grid** — filterable by batch or teacher
- **Export** — download the generated timetable as JSON
- **C Backend** — standalone CLI tool that reads JSON input and outputs a schedule

---

## Project Structure

```
smart-timetable-system/
├── frontend/
│   ├── index.html       ← Login page
│   ├── dashboard.html   ← Admin dashboard (Teachers / Rooms / Subjects / Batches / Timetable)
│   ├── style.css        ← Complete stylesheet
│   ├── app.js           ← CRUD logic, navigation, modal handling
│   ├── login.js         ← Authentication
│   └── timetable.js     ← JS scheduling engine (DSATUR + backtracking) + grid renderer
├── backend/
│   ├── graph.h / graph.c         ← Adjacency-matrix graph structure
│   ├── scheduler.h / scheduler.c ← DSATUR coloring & backtracking
│   ├── parser.h / parser.c       ← Lightweight JSON parser
│   ├── main.c                    ← Entry point; reads JSON → outputs timetable JSON
│   └── Makefile                  ← Build automation
├── data/
│   └── sample_data.json  ← Example input (5 teachers, 4 rooms, 5 subjects, 3 batches)
├── docs/
│   └── algorithm.md      ← Detailed algorithm documentation
└── README.md
```

---

## How to Run

### Option A — Frontend Only (recommended, no installation needed)

The frontend is pure HTML/CSS/JavaScript and runs directly in any modern browser — **no web server, no build step, no dependencies required**.

#### Step 1 — Clone or download the repository

```bash
git clone https://github.com/mohitcodez/smart-timetable-system.git
cd smart-timetable-system
```

#### Step 2 — Open the login page

| OS | Command |
|----|---------|
| **macOS** | `open frontend/index.html` |
| **Linux** | `xdg-open frontend/index.html` |
| **Windows** | Double-click `frontend\index.html` in File Explorer, or run `start frontend\index.html` in Command Prompt |

Alternatively, drag `frontend/index.html` into any browser window.

#### Step 3 — Sign in

Use the demo credentials:

| Field    | Value      |
|----------|------------|
| Username | `admin`    |
| Password | `admin123` |

#### Step 4 — Use the dashboard

After login you will see the Admin Dashboard. From the sidebar you can:

1. **Teachers** — add, edit, or delete teachers
2. **Rooms** — manage classrooms and their capacities
3. **Subjects** — define subjects and assign teachers
4. **Student Batches** — manage student groups
5. **Generate Timetable** — run the DSATUR scheduler in-browser
6. **View Timetable** — browse the generated schedule, filter by batch or teacher, and export as JSON

---

### Option B — C Backend (CLI)

The C backend reads a JSON input file, runs the same DSATUR algorithm on the server/command line, and prints the timetable as JSON to stdout.

#### Prerequisites

- **GCC** (≥ 4.8) or **Clang** — any recent version works
- **Linux**, **macOS**, or **Windows Subsystem for Linux (WSL)**

> **Windows (native):** Install [MinGW-w64](https://www.mingw-w64.org/) and use `mingw32-make` instead of `make`.

#### Step 1 — Build with Make

```bash
cd backend
make
```

This produces the `scheduler` binary in the `backend/` directory.

> **Alternative (no Make):** compile manually with:
> ```bash
> gcc -Wall -Wextra -std=c99 -o scheduler main.c graph.c scheduler.c parser.c
> ```

#### Step 2 — Run with sample data

```bash
make run
# or directly:
./scheduler ../data/sample_data.json
```

#### Sample output

```json
{
  "timetable": [
    {
      "day":     "Monday",
      "slot":    1,
      "room":    "R101",
      "subject": "Mathematics",
      "teacher": "Dr. Sharma",
      "batch":   "CSE-A"
    }
  ]
}
```

#### Step 3 — Use your own data

Copy `data/sample_data.json` to a new file, edit it, and pass it as the first argument:

```bash
./scheduler /path/to/my_data.json
```

#### Clean build artifacts

```bash
make clean
```

---

## Input Format (`data/sample_data.json`)

```json
{
  "teachers": [
    { "teacher_id": 0, "teacher_name": "Dr. Sharma", "availability": "all" }
  ],
  "rooms": [
    { "room_id": 0, "room_name": "R101", "capacity": 60 }
  ],
  "subjects": [
    { "subject_id": 0, "subject_name": "Mathematics", "teacher_id": 0, "lectures_per_week": 2 }
  ],
  "batches": [
    { "batch_id": 0, "batch_name": "CSE-A", "student_count": 55 }
  ]
}
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Browser shows a blank page or JS errors | Ensure all six files (`index.html`, `dashboard.html`, `style.css`, `app.js`, `login.js`, `timetable.js`) are in the **same folder** and opened from the filesystem (not copied individually). |
| `open` command not found (Linux) | Use `xdg-open frontend/index.html` or just double-click the file. |
| `gcc: command not found` | Install GCC: `sudo apt install gcc` (Debian/Ubuntu) or `sudo dnf install gcc` (Fedora/RHEL). |
| `make: command not found` | Install Make: `sudo apt install make` (Debian/Ubuntu) or `sudo dnf install make` (Fedora/RHEL). |
| `Error: could not parse input file` | Verify the JSON path is correct and the file is valid JSON. |
| `Error: scheduling impossible` | Reduce `lectures_per_week` or add more rooms/teachers so the total sessions fit within 40 available slots (5 days × 8 periods). |

---

## Scheduling Algorithm

Scheduling is modelled as a **Graph Coloring Problem**:

```
G = (V, E)
  V = class sessions (one node per required lecture)
  E = conflict edges (same teacher OR same batch OR same room)
  Color = time slot (day × period)
```

### Algorithms Implemented

| Algorithm | When Used | Complexity |
|-----------|-----------|-----------|
| **DSATUR** (Degree of SATURation) | Primary | O(V²) |
| **Backtracking** | Overflow sessions only | O(k^n) worst-case |

### Constraints Enforced

| Constraint | Mechanism |
|------------|-----------|
| Teacher teaches one class at a time | Teacher-conflict edges |
| Room hosts one class at a time | Room-conflict edges |
| Batch attends one subject at a time | Batch-conflict edges |
| Room capacity ≥ batch size | First-fit room assignment |
| Lectures per week fulfilled | One session per required lecture |

See [docs/algorithm.md](docs/algorithm.md) for full details.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES5) |
| Backend  | C (C99) — standalone CLI |
| Storage  | Browser `localStorage` (frontend), JSON files (backend) |

No frameworks. No dependencies.

---

## License

MIT
