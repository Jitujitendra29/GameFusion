# GameFusion — Python & NumPy Multi-Game Hub Website

An interactive, responsive website and gaming portal inspired by and built around `main_project.py`, `project_1.py`, and `project_2.py`.

## 🎮 What's Included

1. **Rock, Paper, Scissors (Game 1)**:
   - Animated player vs NumPy AI computer battle arena.
   - Exact outcome logic & rules from Python (`rock_paper_scissors()`).
   - Round history tracker & win streaks.

2. **Guess the Number (Game 2)**:
   - Random integer selection from `1 to 100` (`np.random.randint(1, 101)`).
   - Visual dynamic search space range tracker (narrowing bound bar).
   - Hot/Cold proximity indicator and Too High / Too Low hints.
   - Best attempts record & average attempts calculation.

3. **Separated Scoreboard & Analytics**:
   - Mirrors Python `scores` dictionary.
   - Real-time player win percentage, ties, computer wins, and fewest attempts.
   - Persistent `localStorage` so scores remain saved between browser visits.
   - Dynamic player rank badges (Rookie -> NumPy Grandmaster).

4. **Python CLI Terminal Simulator**:
   - Realistic Linux/macOS-style command line console running right in your web browser.
   - Type `1`, `2`, `3`, `4`, `r`, `p`, `s`, numbers, exactly matching the CLI loop of `main_project.py`.

5. **Python Source Code Viewer**:
   - Clean syntax-highlighted code inspector for `main_project.py`, `project_1.py`, and `project_2.py` with one-click copy.

6. **Web Audio Sound Effects**:
   - Synthesized retro 8-bit sounds (zero external audio file dependencies).
   - Mute/Unmute sound toggle.
   - Celebration confetti physics engine.

---

## 🚀 How to Run the Website

### Option 1: Direct Double Click (No server required!)
Simply double-click on `index.html` in your file explorer. It will open directly in Google Chrome, Microsoft Edge, Firefox, or any modern web browser.

### Option 2: Run via Python Built-in Server
Open your PowerShell or terminal in this folder (`c:\Users\HI\Jitendra python\numpy`) and run:

```bash
python -m http.server 8000
```

Then open your browser and navigate to:
[http://localhost:8000](http://localhost:8000)

---

## 📁 File Structure

- `index.html` — Main website markup, hub layout, battle arena, and terminal simulator.
- `style.css` — Modern neon-cyber & glassmorphism theme, animations, and responsive styles.
- `app.js` — Game engine, Web Audio synth, persistent score state, terminal emulation, and confetti canvas.
- `main_project.py` — Original Python multi-game hub script.
- `project_1.py` — Rock, Paper, Scissors script using NumPy.
- `project_2.py` — Guess the Number script using NumPy.

