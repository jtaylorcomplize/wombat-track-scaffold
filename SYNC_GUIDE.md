# 🔄 Git Sync Guide for Wombat Track

This guide helps you keep your local VS Code environment in sync with the GitHub repository.

---

## ✅ Check If You're Linked

Open the VS Code terminal and run:

```bash
git remote -v
```

You should see something like:

```
origin  https://github.com/jtaylorcomplize/wombat-track-scaffold.git (fetch)
origin  https://github.com/jtaylorcomplize/wombat-track-scaffold.git (push)
```

---

## 🔄 Pull Latest From GitHub

```bash
git pull origin main
```

---

## 🧪 Push a Test Change

Edit `README.md`, add a test line, then:

```bash
git add .
git commit -m "test: sync check"
git push
```

---

## 🧹 Reset Local to Match GitHub (Optional)

**Warning: This will erase local changes!**

```bash
rm -rf .git
git init
git remote add origin https://github.com/jtaylorcomplize/wombat-track-scaffold.git
git fetch
git reset --hard origin/main
```

---

Keep this guide handy if you run into sync issues.
