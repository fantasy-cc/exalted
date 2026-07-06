# 👨‍💻 DEVELOPMENT GUIDELINES


### Code Patterns to Follow

#### Consistent Formatting
- **Indentation**: 2 spaces for JavaScript/CSS, 4 spaces for Python
- **Naming**: camelCase for JavaScript, snake_case for Python
- **Comments**: Clear function/class documentation

#### Error Handling

```python
# Backend - Comprehensive error handling
try:
    result = await fetch_data()
except ConnectionError as e:
    logger.error(f"Connection failed: {e}")
    raise HTTPException(status_code=503, detail="Service unavailable")
except Exception as e:
    logger.error(f"Unexpected error: {e}")
    raise HTTPException(status_code=500, detail="Internal server error")
```

```javascript
// Frontend - Graceful error handling
async function fetchArbitrage() {
    try {
        const response = await fetch('/api/arbitrage');
        if (!response.ok) throw new Error(response.statusText);
        return await response.json();
    } catch (error) {
        showStatus(`Error: ${error.message}`, 'error');
        return null;
    }
}
```

### When Making Changes

1. **Preserve exchange rate balance** - Ensure rates create realistic arbitrage scenarios
2. **Maintain responsive design** - Test changes on mobile and desktop
3. **Keep profit calculations accurate** - Verify math on any rate changes
4. **Preserve PoE aesthetic** - Maintain dark theme and gold accent colors
5. **Test all currency combinations** - Ensure dropdown changes work correctly
6. **Update documentation** - Keep AGENT.md in sync with code changes

### Testing Guidelines

#### Backend Testing
```bash
# Test individual components
cd backend/models
python rates.py          # Test rate matrix
python arbitrage.py      # Test arbitrage finder

cd ../services
python poe2scout.py      # Test data service
```

#### API Testing
```bash
# Health check
curl http://localhost:8000/health

# Get currencies
curl "http://localhost:8000/api/currencies?top_percentage=0.8"

# Find arbitrage
curl "http://localhost:8000/api/arbitrage/Rise%20of%20the%20Abyssal?starting_currency=chaos&amount=100"
```

#### Frontend Testing
- Test all trading modes (Specific Currency, All Trades Ranked)
- Test budget filtering in All Trades mode
- Test currency percentage slider (10% to 100%)
- Test responsive design on mobile/tablet/desktop
- Test loading states and error handling
- Verify multi-scale display formatting

### Adding New Features

```bash
# 1. Update backend models/services
backend/models/        # Data structures
backend/services/      # External integrations

# 2. Update API endpoints
backend/app.py         # REST API

# 3. Update frontend
app.js                 # UI logic
index.html            # HTML structure
styles.css            # Styling

# 4. Update documentation
AGENTS.md             # This file - complete context (ONLY doc file)
```

### Debugging Tips

- **Rate verification**: Manually check A→B→C→A calculations
- **UI state**: Ensure results clear properly between calculations
- **Edge cases**: Test with very small/large amounts, zero values
- **Browser compatibility**: Verify modern JS features work across browsers
- **Cache inspection**: Check `/health` endpoint for cache status
- **Network debugging**: Use browser DevTools Network tab
- **Console logging**: Check browser console for frontend errors
- **Backend logging**: Check `backend/logs/arbitrage.log` for backend errors

---
