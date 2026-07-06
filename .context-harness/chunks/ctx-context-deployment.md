# 🚀 DEPLOYMENT


### Local Development

```bash
# 1. Install Python dependencies
cd backend/
pip install -r requirements.txt

# 2. Install Playwright browser
playwright install chromium

# 3. Start backend server
python app.py
# Backend runs at: http://localhost:8000

# 4. Serve frontend (new terminal)
cd ..
python -m http.server 3000
# Frontend runs at: http://localhost:3000
```

### Production Deployment (Vercel)

#### Status: ✅ LIVE AND WORKING

**🌐 Production URL**: https://exalted-oolmal1u9-lifan-chens-projects.vercel.app

**Deployed**: October 2025  
**Platform**: Vercel Serverless Functions  
**Status**: Fully operational with live data

#### Deployment Steps

1. **Install Vercel CLI**:
```bash
npm install -g vercel
```

2. **Login to Vercel**:
```bash
vercel login
```

3. **Deploy from project directory**:
```bash
cd /Users/lfan/exalted
vercel
```

4. **Production deployment**:
```bash
vercel --prod
```

#### Configuration Files

**vercel.json**:
```json
{
  "version": 2,
  "builds": [
    {"src": "api/**/*.py", "use": "@vercel/python"},
    {"src": "public/**", "use": "@vercel/static"}
  ],
  "routes": [
    {"src": "/api/(.*)", "dest": "/api/index.py"},
    {"src": "/(.*)", "dest": "/public/$1"}
  ]
}
```

**package.json**:
```json
{
  "name": "poe2-arbitrage-calculator",
  "version": "2.0.0",
  "description": "Path of Exile 2 Currency Arbitrage Calculator",
  "main": "index.html"
}
```

#### Production Considerations

- **Serverless Functions**: 30-second timeout limit
- **Memory Limit**: 1GB per function
- **Cold Starts**: First request may be slower
- **Playwright Limitation**: May not work in serverless (fallback to static rates)
- **Static Assets**: Served from Vercel CDN
- **CORS**: Handled automatically for same-origin requests

### Docker Deployment (Optional)

```yaml
# docker-compose.yml
version: '3.8'
services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DEBUG=False
      - LOG_LEVEL=INFO
    restart: unless-stopped
    
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./:/usr/share/nginx/html
```

---
