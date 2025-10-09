"""
FastAPI Backend for PoE2 Currency Arbitrage Calculator

This backend provides REST APIs for:
1. Fetching live currency exchange rates
2. Finding arbitrage opportunities  
3. Price data for display

Frontend becomes a thin client that just displays data from these APIs.
"""

from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import Dict, List, Optional
import logging
import asyncio
from contextlib import asynccontextmanager

from models.rates import CurrencyRateMatrix
from models.arbitrage import ArbitrageFinder
from services.poe2scout import POE2ScoutService


# Global cache for rate data
rate_cache: Dict[str, CurrencyRateMatrix] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    logger.info("🚀 PoE2 Arbitrage Backend starting up...")
    
    # Pre-load some data on startup
    try:
        await refresh_rate_data("Rise of the Abyssal", top_percentage=0.8)
        logger.info("✅ Pre-loaded rate data successfully")
    except Exception as e:
        logger.warning(f"⚠️  Could not pre-load data: {str(e)}")
    
    yield
    
    # Shutdown
    logger.info("🔄 PoE2 Arbitrage Backend shutting down...")


# Create FastAPI application
app = FastAPI(
    title="PoE2 Currency Arbitrage API",
    description="Backend API for Path of Exile 2 currency arbitrage calculations with live market data",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger(__name__)


# === Utility Functions ===

async def get_rate_data(league: str, top_percentage: float = 0.8) -> CurrencyRateMatrix:
    """
    Get rate data for a league, using cache if available and not expired.
    """
    cache_key = f"{league.lower()}_{top_percentage}"
    
    # Check cache first
    if cache_key in rate_cache:
        cached_rates = rate_cache[cache_key]
        if not cached_rates.metadata.is_expired():
            logger.debug(f"Using cached rates for {league} (top {top_percentage*100:.0f}%)")
            return cached_rates
        else:
            logger.debug(f"Cached rates for {league} are expired")
    
    # Fetch fresh data
    logger.info(f"Fetching fresh rates for {league} (top {top_percentage*100:.0f}% currencies)")
    async with POE2ScoutService() as service:
        fresh_rates = await service.fetch_currency_rates(league, top_percentage)
        rate_cache[cache_key] = fresh_rates
        return fresh_rates


async def refresh_rate_data(league: str, top_percentage: float = 0.8) -> CurrencyRateMatrix:
    """Force refresh rate data for a league"""
    cache_key = f"{league.lower()}_{top_percentage}"
    
    logger.info(f"Force refreshing rates for {league} (top {top_percentage*100:.0f}% currencies)")
    async with POE2ScoutService() as service:
        fresh_rates = await service.fetch_currency_rates(league, top_percentage)
        rate_cache[cache_key] = fresh_rates
        return fresh_rates


# === API Endpoints ===

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "name": "PoE2 Currency Arbitrage API",
        "version": "1.0.0",
        "description": "Backend API for Path of Exile 2 currency arbitrage calculations",
        "endpoints": {
            "rates": "/api/rates/{league}",
            "arbitrage": "/api/arbitrage/{league}",
            "prices": "/api/prices/{league}",
            "refresh": "/api/refresh/{league}"
        }
    }


@app.get("/api/rates/{league}")
async def get_rates(
    league: str,
    top_percentage: float = Query(0.8, ge=0.1, le=1.0, description="Percentage of top currencies to include")
):
    """
    Get current exchange rates for a league.
    
    Returns the complete rate matrix with metadata.
    """
    try:
        rates = await get_rate_data(league, top_percentage)
        return JSONResponse(
            content=rates.to_dict(),
            headers={
                "Cache-Control": f"max-age={rates.metadata.ttl_seconds}",
                "ETag": f'"{rates.metadata.fetched_at.isoformat()}"'
            }
        )
    except Exception as e:
        logger.error(f"Error fetching rates for {league}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch currency rates: {str(e)}"
        )


@app.get("/api/arbitrage/{league}")
async def get_arbitrage_opportunities(
    league: str,
    starting_currency: str = Query("chaos", description="Starting currency for arbitrage"),
    amount: float = Query(100.0, gt=0, description="Starting amount"),
    min_profit: float = Query(0.01, ge=0, description="Minimum profit percentage"),
    max_results: int = Query(10, gt=0, le=50, description="Maximum results to return"),
    slippage: float = Query(0.0, ge=0, le=0.1, description="Slippage per trading step"),
    top_percentage: float = Query(0.8, ge=0.1, le=1.0, description="Percentage of top currencies to include")
):
    """
    Find arbitrage opportunities for a specific currency and amount.
    
    Returns list of profitable arbitrage paths sorted by profitability.
    """
    try:
        # Get current rates
        rates = await get_rate_data(league, top_percentage)
        
        # Validate starting currency
        if starting_currency not in rates.SUPPORTED_CURRENCIES:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported currency: {starting_currency}. Supported: {rates.SUPPORTED_CURRENCIES}"
            )
        
        # Configure arbitrage finder
        finder = ArbitrageFinder(
            min_profit_percentage=min_profit,
            max_steps=3,
            slippage_per_step=slippage,
            max_results=max_results
        )
        
        # Find opportunities
        opportunities = finder.find_opportunities(rates, starting_currency, amount)
        
        # Convert to dict format
        results = [op.to_dict() for op in opportunities]
        
        # Get summary stats
        stats = finder.get_summary_stats(opportunities)
        
        return {
            "league": league,
            "starting_currency": starting_currency,
            "starting_amount": amount,
            "parameters": {
                "min_profit_percentage": min_profit,
                "slippage_per_step": slippage,
                "max_results": max_results
            },
            "data_source": {
                "source": rates.metadata.source,
                "fetched_at": rates.metadata.fetched_at.isoformat(),
                "is_expired": rates.metadata.is_expired()
            },
            "summary": stats,
            "opportunities": results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error finding arbitrage opportunities: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to find arbitrage opportunities: {str(e)}"
        )


@app.get("/api/prices/{league}")
async def get_price_table(
    league: str,
    base_currency: str = Query("exalted", description="Base currency for price table"),
    top_percentage: float = Query(0.8, ge=0.1, le=1.0, description="Percentage of top currencies to include")
):
    """
    Get current price table with all currencies relative to base currency.
    
    Useful for the "Prices" tab display.
    """
    try:
        rates = await get_rate_data(league, top_percentage)
        
        if base_currency not in rates.SUPPORTED_CURRENCIES:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported base currency: {base_currency}. Supported: {rates.SUPPORTED_CURRENCIES}"
            )
        
        price_table = rates.get_price_table(base_currency)
        
        return {
            "league": league,
            "base_currency": base_currency,
            "base_currency_name": rates.CURRENCY_NAMES[base_currency],
            "data_source": {
                "source": rates.metadata.source,
                "fetched_at": rates.metadata.fetched_at.isoformat(),
                "is_expired": rates.metadata.is_expired()
            },
            "prices": price_table
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting price table: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get price table: {str(e)}"
        )


@app.post("/api/refresh/{league}")
async def refresh_rates(
    league: str, 
    background_tasks: BackgroundTasks,
    top_percentage: float = Query(0.8, ge=0.1, le=1.0, description="Percentage of top currencies to include")
):
    """
    Force refresh currency rates for a league.
    
    Returns immediately with current data and refreshes in background.
    """
    try:
        # Get current rates (even if expired)
        current_rates = rate_cache.get(f"{league.lower()}_{top_percentage}")
        
        # Start background refresh
        background_tasks.add_task(refresh_rate_data, league, top_percentage)
        
        response_data = {
            "league": league,
            "refresh_initiated": True,
            "message": "Rate refresh initiated in background"
        }
        
        if current_rates:
            response_data["current_data"] = {
                "source": current_rates.metadata.source,
                "fetched_at": current_rates.metadata.fetched_at.isoformat(),
                "is_expired": current_rates.metadata.is_expired()
            }
        
        return response_data
        
    except Exception as e:
        logger.error(f"Error initiating refresh for {league}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to initiate refresh: {str(e)}"
        )


@app.get("/api/leagues")
async def get_supported_leagues():
    """Get list of supported PoE2 leagues"""
    return {
        "leagues": [
            {
                "id": "rise-of-the-abyssal", 
                "name": "Rise of the Abyssal",
                "type": "challenge",
                "active": True
            },
            {
                "id": "standard",
                "name": "Standard", 
                "type": "permanent",
                "active": True
            },
            {
                "id": "hardcore",
                "name": "Hardcore",
                "type": "hardcore",
                "active": True
            }
        ]
    }


@app.get("/api/currencies")
async def get_supported_currencies(
    league: str = Query("Rise of the Abyssal", description="League to get currencies for"),
    top_percentage: float = Query(0.8, ge=0.1, le=1.0, description="Percentage of top currencies to include"),
    force_refresh: bool = Query(False, description="Force refresh currency data")
):
    """
    Get list of supported currencies with dynamic discovery based on popularity.
    
    Args:
        league: POE2 league name
        top_percentage: What percentage of top currencies to include (0.8 = top 80%)
        force_refresh: Force refresh the currency data from POE2Scout
    """
    try:
        # Get or refresh rate data to discover available currencies
        if force_refresh:
            rates = await refresh_rate_data(league, top_percentage)
        else:
            rates = await get_rate_data(league, top_percentage)
        
        # Return currency information including popularity data
        currencies = []
        for currency_id in rates.SUPPORTED_CURRENCIES:
            currency_info = {
                "id": currency_id,
                "name": rates.CURRENCY_NAMES.get(currency_id, currency_id.replace('_', ' ').title()),
                "supported": True
            }
            
            # Add popularity metadata if available
            if hasattr(rates, '_currency_metadata') and rates._currency_metadata:
                metadata = rates._currency_metadata.get(currency_id, {})
                currency_info.update({
                    "volume": metadata.get('total_volume', 0),
                    "pair_count": metadata.get('pair_count', 0),
                    "popularity_score": metadata.get('popularity_score', 0),
                    "position": metadata.get('best_position', float('inf'))
                })
            
            currencies.append(currency_info)
        
        # Sort by popularity score if available
        currencies.sort(key=lambda x: x.get('popularity_score', 0), reverse=True)
        
        return {
            "league": league,
            "top_percentage": top_percentage,
            "total_discovered": len(currencies),
            "currencies": currencies,
            "data_source": {
                "source": rates.metadata.source,
                "fetched_at": rates.metadata.fetched_at.isoformat(),
                "is_expired": rates.metadata.is_expired()
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting currencies for {league}: {str(e)}")
        # Fallback to hardcoded list
        return {
            "league": league,
            "top_percentage": top_percentage,
            "total_discovered": len(CurrencyRateMatrix.SUPPORTED_CURRENCIES),
            "currencies": [
                {
                    "id": currency_id,
                    "name": CurrencyRateMatrix.CURRENCY_NAMES[currency_id],
                    "supported": True,
                    "fallback": True
                }
                for currency_id in CurrencyRateMatrix.SUPPORTED_CURRENCIES
            ],
            "error": f"Failed to get live currencies: {str(e)}"
        }


@app.get("/api/test-arbitrage")
async def test_arbitrage_with_sample_data(
    starting_currency: str = Query("chaos", description="Starting currency for arbitrage"),
    amount: float = Query(100.0, gt=0, description="Starting amount"),
    min_profit: float = Query(0.01, ge=0, description="Minimum profit percentage"),
    max_results: int = Query(10, gt=0, le=50, description="Maximum results to return")
):
    """
    Test arbitrage endpoint using sample data (for testing purposes).
    """
    try:
        # Create test rate matrix
        rates = CurrencyRateMatrix.create_test_data()
        
        # Validate starting currency
        if starting_currency not in rates.SUPPORTED_CURRENCIES:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported currency: {starting_currency}. Supported: {rates.SUPPORTED_CURRENCIES}"
            )
        
        # Configure arbitrage finder
        finder = ArbitrageFinder(
            min_profit_percentage=min_profit,
            max_steps=3,
            slippage_per_step=0.01,  # 1% slippage
            max_results=max_results
        )
        
        # Find opportunities
        opportunities = finder.find_opportunities(rates, starting_currency, amount)
        
        # Convert to dict format
        results = [op.to_dict() for op in opportunities]
        
        # Get summary stats
        stats = finder.get_summary_stats(opportunities)
        
        return {
            "league": "Test League",
            "starting_currency": starting_currency,
            "starting_amount": amount,
            "parameters": {
                "min_profit_percentage": min_profit,
                "slippage_per_step": 0.01,
                "max_results": max_results
            },
            "data_source": {
                "source": rates.metadata.source,
                "fetched_at": rates.metadata.fetched_at.isoformat(),
                "is_expired": rates.metadata.is_expired()
            },
            "summary": stats,
            "opportunities": results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in test arbitrage: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to calculate test arbitrage: {str(e)}"
        )


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    cache_info = {}
    for league, rates in rate_cache.items():
        cache_info[league] = {
            "fetched_at": rates.metadata.fetched_at.isoformat() if rates.metadata.fetched_at else None,
            "is_expired": rates.metadata.is_expired(),
            "source": rates.metadata.source
        }
    
    return {
        "status": "healthy",
        "cache_info": cache_info,
        "supported_currencies": len(CurrencyRateMatrix.SUPPORTED_CURRENCIES)
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=True,
        log_level="info"
    )
