# 🚀 Setup Guide: GitHub Actions + Vercel (Option 3A)

This guide will help you set up the **completely free** GitHub Actions + Static JSON architecture for the POE2 Arbitrage Calculator.

## 📋 Overview

**Architecture**: GitHub Actions scrapes POE2Scout.com every 5 minutes → Commits JSON data to repo → Vercel auto-deploys and serves static data

**Cost**: $0/month (completely free!)

---

## ✅ Prerequisites

1. GitHub account with repository access
2. Vercel account (free tier)
3. Repository already connected to Vercel

---

## 🔧 Setup Steps

### Step 1: Verify File Structure

Make sure these files exist in your repository:

```
exalted/
├── .github/
│   ├── workflows/
│   │   └── scrape-poe2scout.yml          ✅ Created
│   └── scripts/
│       └── scrape_poe2scout.py            ✅ Created
├── api/
│   ├── data/
│   │   ├── currencies.json                ✅ Created (placeholder)
│   │   └── rates.json                     ✅ Created (placeholder)
│   ├── static_data.py                     ✅ Created
│   ├── simple_app.py                      ✅ Created
│   └── index.py                           ✅ Updated
└── public/
    ├── index.html
    ├── app.js
    └── styles.css
```

### Step 2: Enable GitHub Actions

1. Go to your repository on GitHub
2. Click on the **Actions** tab
3. If Actions are disabled, click **"I understand my workflows, go ahead and enable them"**
4. You should see a new workflow: **"Scrape POE2Scout Currency Data"**

### Step 3: Test the Workflow Manually

1. Go to **Actions** tab
2. Click on **"Scrape POE2Scout Currency Data"** workflow
3. Click **"Run workflow"** dropdown on the right
4. Click **"Run workflow"** button
5. Wait 1-2 minutes for the workflow to complete
6. You should see a green checkmark ✅ when it succeeds

### Step 4: Verify Data Files Were Created

1. After the workflow runs, check your repository
2. Navigate to `api/data/`
3. You should see:
   - `currencies.json` - Updated with live data
   - `rates.json` - Updated with live exchange rates
4. Check the commit history - you should see a commit like:
   ```
   🤖 Update POE2 currency data - 2025-10-09 02:45:00 UTC
   ```

### Step 5: Deploy to Vercel

#### Option A: Automatic Deployment (Recommended)

Vercel will automatically redeploy when you push changes:

1. The GitHub Actions workflow commits new data
2. Vercel detects the commit
3. Vercel automatically redeploys (takes ~30 seconds)
4. Your site now serves the latest data!

#### Option B: Manual Deployment

If you want to force a deployment:

```bash
cd /Users/lfan/exalted
vercel --prod
```

### Step 6: Verify the Live Site

1. Visit your Vercel URL: https://exalted-oolmal1u9-lifan-chens-projects.vercel.app
2. Open browser DevTools (F12) → Console tab
3. You should see logs showing:
   ```
   ✅ 20+ currencies loaded (top 80% by popularity). Ready for live arbitrage!
   ```
4. Try calculating arbitrage opportunities
5. Check the data source timestamp to verify it's recent

---

## 🔍 Troubleshooting

### Problem: Workflow Fails with "Playwright not installed"

**Solution**: The workflow installs Playwright automatically. If it fails:
1. Check the workflow logs in the Actions tab
2. Make sure the workflow file has the correct installation steps:
   ```yaml
   - name: Install Python dependencies
     run: |
       pip install playwright requests beautifulsoup4 lxml
       playwright install chromium
       playwright install-deps chromium
   ```

### Problem: No Data Changes Detected

**Possible causes**:
1. POE2Scout.com might be down or blocking requests
2. The scraper might be extracting the same data as last time
3. Check the workflow logs for error messages

**Solution**:
1. Go to Actions → Click on the failed run
2. Check the logs for error messages
3. If POE2Scout.com is down, the workflow will retry automatically

### Problem: Vercel Deployment Shows Old Data

**Solution**:
1. Check that the workflow successfully committed new data
2. Vercel might not have auto-deployed yet (wait 1-2 minutes)
3. Manually trigger a deployment: `vercel --prod`
4. Clear browser cache (Ctrl+Shift+Delete)

### Problem: API Returns 404 or 500 Errors

**Solution**:
1. Check that `api/data/currencies.json` and `api/data/rates.json` exist
2. Verify the files contain valid JSON
3. Check Vercel function logs in Vercel dashboard
4. Make sure `api/index.py` imports from `simple_app`

---

## ⚙️ Configuration

### Change Scraping Frequency

Edit `.github/workflows/scrape-poe2scout.yml`:

```yaml
on:
  schedule:
    # Every 5 minutes (default)
    - cron: '*/5 * * * *'
    
    # Every 10 minutes
    # - cron: '*/10 * * * *'
    
    # Every hour
    # - cron: '0 * * * *'
    
    # Every 30 minutes
    # - cron: '*/30 * * * *'
```

### Disable Auto-Commits to Main Branch

If you don't want many commits in your main branch, you can:

1. Create a separate `data` branch for data commits
2. Modify the workflow to commit to that branch
3. Have Vercel deploy from `main` but read data from `data` branch

(Advanced setup - let me know if you want instructions for this)

---

## 📊 Monitoring

### Check Workflow Status

1. Go to **Actions** tab
2. See recent runs and their status
3. Green checkmark = success
4. Red X = failure (click to see logs)

### Check Data Freshness

Visit: https://exalted-oolmal1u9-lifan-chens-projects.vercel.app/api/health

You'll see:
```json
{
  "status": "healthy",
  "currencies_count": 25,
  "rates_count": 150,
  "data_source": "poe2scout",
  "last_update": "2025-10-09T02:45:00Z"
}
```

### GitHub Actions Usage

- **Free tier**: 2000 minutes/month
- **Current usage**: ~2 minutes per run × 288 runs/day = ~576 min/month
- **Remaining**: ~1400 minutes/month for other workflows

---

## 🎉 Success Checklist

- [ ] GitHub Actions workflow runs successfully
- [ ] Data files (`currencies.json`, `rates.json`) are updated
- [ ] Vercel site loads without errors
- [ ] Currency dropdown shows 20+ currencies
- [ ] Arbitrage calculations work
- [ ] Data timestamp is recent (within 5 minutes)

---

## 🆘 Need Help?

If something isn't working:

1. **Check GitHub Actions logs** - Most issues show up here
2. **Check Vercel function logs** - Vercel Dashboard → Functions → Logs
3. **Check browser console** - F12 → Console tab
4. **Verify API responses** - Visit `/api/health` endpoint

Common issues are usually:
- Playwright installation failed
- POE2Scout.com is blocking or down
- Vercel hasn't finished deploying
- Browser cache showing old data

---

## 📈 Next Steps (Optional)

Once everything is working, you might want to:

1. **Add monitoring** - Set up GitHub Actions email notifications
2. **Add error alerting** - Get notified if scraping fails
3. **Optimize data size** - Compress JSON files if they get large
4. **Add historical data** - Store currency trends over time

---

**🎊 Congratulations! You now have a completely free, automatically updating POE2 arbitrage calculator!**

The system will:
- Scrape live data every 5 minutes
- Automatically update your site
- Cost you $0/month
- Scale to handle any traffic (Vercel free tier handles 100GB bandwidth/month)
