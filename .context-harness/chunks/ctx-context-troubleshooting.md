# 🔧 TROUBLESHOOTING


### Common Issues

#### 1. Currency Loading Failures

**Problem**: Currencies not loading or incomplete data

**Debug**:
```bash
# Test currency discovery
cd backend/services
python poe2scout.py

# Check logs
tail -f ../logs/arbitrage.log | grep "currency"
```

**Solutions**:
- Check internet connection to poe2scout.com
- Verify Playwright browser: `playwright install chromium`
- Reduce `top_percentage`: `?top_percentage=0.5`
- Check cache directory permissions
- Restart backend server

#### 2. Performance Issues

**Problem**: Slow response times or timeouts

**Debug**:
```bash
# Check response time
curl -w "@curl-format.txt" http://localhost:8000/api/arbitrage/...

# Check memory usage
curl http://localhost:8000/health
```

**Solutions**:
- Reduce currency count: `top_percentage=0.6`
- Lower `max_results`: `max_results=5`
- Increase minimum profit: `min_profit=0.02`
- Clear cache: restart backend
- Check system memory usage

#### 3. Browser Automation Failures

**Problem**: Playwright errors or blocked requests

**Debug**:
```python
# Test browser directly
import asyncio
from playwright.async_api import async_playwright

async def test_browser():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=False)
        page = await browser.new_page()
        await page.goto("https://poe2scout.com/exchange")
        await page.screenshot(path="debug.png")
        await browser.close()

asyncio.run(test_browser())
```

**Solutions**:
- Update Playwright: `playwright install --force chromium`
- Check firewall/proxy settings
- Try different user agent
- Enable non-headless mode for debugging
- Use fallback rates temporarily

#### 4. Frontend Display Issues

**Problem**: UI not displaying correctly or missing data

**Debug**:
- Open browser DevTools (F12)
- Check Console tab for JavaScript errors
- Check Network tab for failed API requests
- Verify API responses in Network tab

**Solutions**:
- Clear browser cache (Ctrl+Shift+Delete)
- Check API endpoints are responding
- Verify JSON response format
- Test in different browser
- Check CSS loading (Network tab)

#### 5. Deployment Issues (Vercel)

**Problem**: Deployment failing or functions timing out

**Debug**:
```bash
# Check deployment logs
vercel logs

# Test locally with Vercel dev server
vercel dev
```

**Solutions**:
- Check function timeout (30s limit)
- Verify requirements.txt is correct
- Test API endpoints locally first
- Check Vercel dashboard for errors
- Simplify function complexity
- Use fallback rates in production

### Performance Metrics

#### Response Time Targets

| Operation | Target Time | Currency Count | Notes |
|-----------|-------------|----------------|-------|
| `/currencies` | < 500ms | 10-50 | First load may be slower |
| `/arbitrage` | < 2s | 20 currencies | 8,000 path calculations |
| `/arbitrage` | < 5s | 40 currencies | 64,000 path calculations |
| `/rates` | < 300ms | Any | Cached response |

#### Memory Usage Guidelines

| Component | Memory Usage | Notes |
|-----------|--------------|-------|
| Base backend | ~50MB | Without browser |
| Playwright browser | ~100MB | Per browser instance |
| Rate matrix (20 curr) | ~5MB | In-memory cache |
| Rate matrix (40 curr) | ~20MB | Quadratic growth |
| Total system | ~200MB | Production limit |

---
