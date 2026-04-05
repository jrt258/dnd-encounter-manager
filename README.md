# ⚔️ D&D Encounter Manager

A clean, fast encounter management tool for D&D 5e Dungeon Masters. Track monsters, players, initiative, HP, conditions, and spell slots — all stored locally in your browser.

---

## Features

- **Monster Library** — Build reusable monster templates with stats, attacks, spell slots, and notes
- **Player Roster** — Store your party's combat-relevant stats
- **Encounter Builder** — Compose encounters from your library (with monster quantities)
- **Combat Runner** — Turn-based combat with:
  - Initiative rolling (individual monsters, by group, or all at once)
  - HP damage & healing
  - Condition tracking (all 15 standard 5e conditions)
  - Spell slot pips
  - Combat log
  - Round counter

All data is saved to your browser's `localStorage` — no account, no server, no internet required after first load.

---

## Running Locally

### Prerequisites

You need **Node.js** installed. Download it from [nodejs.org](https://nodejs.org) (choose the LTS version).

To verify it installed correctly, open a terminal and run:
```
node --version
```
You should see something like `v20.x.x`.

### Steps

1. **Download** this project (click the green "Code" button on GitHub → "Download ZIP"), then unzip it.

2. **Open a terminal** in the project folder.
   - On Mac: Right-click the folder in Finder → "New Terminal at Folder"
   - On Windows: Open the folder, click the address bar, type `cmd`, press Enter

3. **Install dependencies** (only needed once):
   ```
   npm install
   ```

4. **Start the app**:
   ```
   npm run dev
   ```

5. Open your browser to **http://localhost:5173**

To stop the app, press `Ctrl+C` in the terminal.

---

## Deploying to GitHub Pages

This lets you access the tool from any device via a URL like `https://yourusername.github.io/dnd-encounter-manager`.

### One-time setup

#### 1. Create a GitHub account
Go to [github.com](https://github.com) and sign up if you don't have an account.

#### 2. Install Git
Download from [git-scm.com](https://git-scm.com). On Mac, running `git --version` in the terminal will prompt you to install it automatically.

#### 3. Create a new repository on GitHub
1. Click the **+** button (top right) → "New repository"
2. Name it `dnd-encounter-manager`
3. Leave it **Public**
4. Do **not** check "Add a README" (we already have one)
5. Click **Create repository**

#### 4. Push your code to GitHub
In your terminal (inside the project folder), run these commands one at a time:
```
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOURUSERNAME/dnd-encounter-manager.git
git push -u origin main
```
Replace `YOURUSERNAME` with your actual GitHub username.

#### 5. Enable GitHub Pages with GitHub Actions

**Update `vite.config.js`** — change the `base` to match your repo name:
```js
export default defineConfig({
  plugins: [react()],
  base: '/dnd-encounter-manager/',
})
```

**Create the deployment workflow file** at `.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm install
      - run: npm run build
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - uses: actions/deploy-pages@v4
        id: deployment
```

Then commit and push:
```
git add .
git commit -m "Add GitHub Pages deployment"
git push
```

6. On GitHub, go to your repo → **Settings** → **Pages** → set Source to **"GitHub Actions"**

After a minute or two, your app will be live at:
`https://YOURUSERNAME.github.io/dnd-encounter-manager/`

### Updating the app later
Any time you make changes, just run:
```
git add .
git commit -m "Describe your changes"
git push
```
GitHub Actions will automatically rebuild and redeploy.

---

## Data & Privacy

All your data (monsters, players, encounters) is stored in your **browser's localStorage** on your device only. Nothing is sent to any server.

> ⚠️ If you clear your browser data / site data, your saved content will be lost. Consider exporting a backup periodically (export feature coming soon).

---

## Project Structure

```
dnd-encounter-manager/
├── index.html
├── vite.config.js
├── package.json
└── src/
    ├── main.jsx          # Entry point
    ├── App.jsx           # Root component & routing
    ├── index.css         # Global design system
    ├── hooks/
    │   └── useLocalStorage.js
    ├── utils/
    │   └── helpers.js    # Dice rolling, constants, defaults
    ├── components/
    │   ├── Modal.jsx
    │   ├── AbilityScores.jsx
    │   ├── AttackEditor.jsx
    │   ├── MonsterForm.jsx
    │   ├── PlayerForm.jsx
    │   └── SpellSlots.jsx
    └── views/
        ├── MonsterLibrary.jsx
        ├── PlayerRoster.jsx
        ├── EncounterBuilder.jsx
        └── CombatRunner.jsx
```

---

## Planned Features

- [ ] Export / import data as JSON (backup & share)
- [ ] Death saving throw tracker
- [ ] Legendary action tracker
- [ ] Concentration tracker
- [ ] Temp HP support
- [ ] Multiple encounters running simultaneously
