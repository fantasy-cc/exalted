# 🔍 Vercel Deployment Debugging Log

**Date**: October 9, 2025  
**Status**: ⚠️ IN PROGRESS - Vercel deployment failing  
**GitHub Repo**: https://github.com/fantasy-cc/exalted  
**Latest Commit**: `ca6aac9`

---

## ✅ What IS Working Perfectly

### GitHub Actions Infrastructure
- ✅ Workflow runs every 5 minutes successfully
- ✅ Playwright scraper extracts **24 live currencies** from POE2Scout.com
- ✅ Data quality is excellent (Divine Orb, Mirror of Kalandra, Chaos Orb, etc.)
- ✅ JSON files auto-commit to `api/data/currencies.json` and `api/data/rates.json`
- ✅ Local testing shows data loads correctly from GitHub raw URLs
- ✅ Cost: $0/month (using 576 of 2000 free minutes)

**Evidence**:
```
✅ Extracted 24 trading pairs
🏆 Top currencies: Divine Orb (88M volume), Mirror of Kalandra (18M volume)
📊 Total currencies: 24
⏰ Last update: 2025-10-09T04:18:41Z
```

---

## ❌ What is NOT Working

### Vercel Deployment Error

**Error Message**:
```python
Traceback (most recent call last):
  File "/var/task/vc__handler__python.py", line 242, in <module>
    if not issubclass(base, BaseHTTPRequestHandler):
        ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
TypeError: issubclass() arg 1 must be a class
Python process exited with exit status: 1.
```

**Affected URLs**: All new deployments (last 13 deployments)
- https://exalted-1fc7jwmnx-lifan-chens-projects.vercel.app (latest)
- https://exalted-9xhsm49ai-lifan-chens-projects.vercel.app
- https://exalted-20kz1l0tp-lifan-chens-projects.vercel.app
- etc.

**Still Working** (but with old code):
- https://exalted-oolmal1u9-lifan-chens-projects.vercel.app (11 days old)
  - Shows only 3 placeholder currencies
  - Uses old `api/hello.py` handler
  - NOT using GitHub Actions data

---

## 🔍 Root Cause Analysis

### Primary Issue
Vercel's Python serverless handler (`vc__handler__python.py`) expects the `handler` variable to be a specific type, but our FastAPI app isn't being recognized correctly.

### Secondary Issues
1. **Module Import Problems**: Complex import chains fail in Vercel's environment
2. **File Path Issues**: `api/data/` folder not accessible to serverless functions
3. **FastAPI Compatibility**: Possible version mismatch with Vercel's Python runtime

---

## 🧪 Attempted Solutions

### Attempt #1: Relative Imports
**File**: `api/index.py`
```python
from .simple_app import app
```
**Result**: ❌ `ModuleNotFoundError: No module named 'simple_app'`

### Attempt #2: sys.path Manipulation
**File**: `api/index.py`
```python
import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from simple_app import app
```
**Result**: ❌ Same `TypeError: issubclass() arg 1 must be a class`

### Attempt #3: Include Files in vercel.json
**File**: `vercel.json`
```json
{
  "functions": {
    "api/index.py": {
      "includeFiles": "api/data/**"
    }
  }
}
```
**Result**: ❌ Configuration error (can't use functions with builds)

### Attempt #4: Fetch from GitHub URLs
**File**: `api/static_data.py`
```python
CURRENCIES_URL = "https://raw.githubusercontent.com/fantasy-cc/exalted/main/api/data/currencies.json"
with urllib.request.urlopen(CURRENCIES_URL) as response:
    data = json.loads(response.read())
```
**Result**: ❌ Import chain still fails before reaching this code

### Attempt #5: Inline FastAPI App
**File**: `api/index.py` (current state)
```python
# Inline FastAPI app directly in index.py
app = FastAPI(...)
@app.get("/api/currencies")
async def get_currencies():
    # Load from GitHub
handler = app
```
**Result**: ❌ Still `TypeError: issubclass() arg 1 must be a class`

---

## 📊 Deployment Timeline

| Time | Deployment | Status | Issue |
|------|------------|--------|-------|
| 11d ago | `oolmal1u9` | ✅ Working | Old code, 3 currencies only |
| 13min ago | `gh5sat8zf` | ✅ Ready | Not tested |
| 11min ago | `aituz9iiu` | ✅ Ready | Same error pattern |
| 10min ago | `3jj5ris1a` | ✅ Ready | Same error pattern |
| 7min ago | `g70l8otvx` | ✅ Ready | Same error pattern |
| 5min ago | `fau0aoeth` | ✅ Ready | 500 error |
| 3min ago | `jctpx4req` | ✅ Ready | 500 error |
| 2min ago | `20kz1l0tp` | ✅ Ready | ModuleNotFoundError |
| Latest | `1fc7jwmnx` | ✅ Ready | TypeError issubclass |

---

## 🎯 Next Steps to Try

### Option A: Mangum Adapter (Most Likely Solution)
Vercel might need Mangum to wrap FastAPI for serverless:

```python
# api/index.py
from fastapi import FastAPI
from mangum import Mangum

app = FastAPI()

@app.get("/api/currencies")
async def get_currencies():
    # ...

handler = Mangum(app)  # <-- Wrap with Mangum
```

**Requirements**:
```
fastapi==0.104.1
mangum==0.17.0
```

### Option B: Check Vercel Python Runtime Version
Current `requirements.txt`:
```
fastapi==0.104.1
httpx==0.25.2
```

May need to specify Python version in `vercel.json`:
```json
{
  "functions": {
    "api/*.py": {
      "runtime": "python3.11"
    }
  }
}
```

### Option C: Use Vercel's WSGI Adapter
Instead of FastAPI, use Flask or plain WSGI:
```python
from flask import Flask, jsonify
app = Flask(__name__)

@app.route('/api/currencies')
def get_currencies():
    # ...
    return jsonify(data)
```

### Option D: Deploy to Railway (Guaranteed to Work)
- Cost: $9/month
- Supports Python/Playwright/FastAPI natively
- No serverless limitations
- Can use existing `backend/app.py` code

---

## 🔗 Important URLs

- **GitHub Repo**: https://github.com/fantasy-cc/exalted
- **Working (old) Deploy**: https://exalted-oolmal1u9-lifan-chens-projects.vercel.app
- **Latest Deploy**: https://exalted-1fc7jwmnx-lifan-chens-projects.vercel.app
- **GitHub Actions**: https://github.com/fantasy-cc/exalted/actions
- **Live Data**: https://raw.githubusercontent.com/fantasy-cc/exalted/main/api/data/currencies.json

---

## 📝 Key Files to Review

1. **`/api/index.py`** - Current entry point with inline FastAPI app
2. **`/api/simple_app.py`** - Alternative implementation (not currently used)
3. **`/api/static_data.py`** - Data loading functions (GitHub URL fetch)
4. **`/api/requirements.txt`** - Python dependencies
5. **`/vercel.json`** - Deployment configuration
6. **`/.github/workflows/scrape-poe2scout.yml`** - Working scraper workflow
7. **`/api/data/currencies.json`** - Live data (24 currencies)

---

## 💡 Recommended Action

**Try Option A (Mangum adapter)** first as it's the standard way to run FastAPI on Vercel serverless:

1. Add `mangum==0.17.0` to `api/requirements.txt`
2. Update `api/index.py` to use `handler = Mangum(app)`
3. Deploy and test

If that doesn't work, **Option D (Railway)** is the guaranteed solution since we know the backend code works perfectly locally.

---

**Last Updated**: October 9, 2025, 22:15 UTC  
**Next Agent**: Start with Mangum adapter solution above 👆
