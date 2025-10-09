/**
 * Path of Exile 2 Currency Arbitrage Calculator - Frontend Client
 * Updated to use the new Python backend API with 23+ currencies
 * 
 * Backend API: http://localhost:8000
 * Frontend: http://localhost:3000
 */

// Configuration
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:8000/api' 
    : '/api';
const DEFAULT_LEAGUE = 'Rise of the Abyssal';
const DEFAULT_TOP_PERCENTAGE = 0.8; // Top 80% of currencies by default

// Application configuration
let currentConfig = {
    topPercentage: DEFAULT_TOP_PERCENTAGE,
    league: DEFAULT_LEAGUE,
    showPopularityMetrics: false
};

// Global state
let availableCurrencies = [];
let currentRates = null;
let lastUpdate = null;
// Removed: exchangeRatesCache - no longer needed after deprecating Exalted equivalent system

// DOM elements
let currencySelect, minProfitInput, resultsContainer, statusContainer, loadingIndicator;

/**
 * Format currency amounts for realistic in-game trading
 */
function formatTradingAmount(amount, currencyName) {
    const numAmount = parseFloat(amount);
    
    // For very valuable currencies (Mirror, high-tier items), show 1-2 decimal places
    const highValueCurrencies = [
        'Mirror of Kalandra', 'mirror',
        "Rakiata's Flow", 'rakiata_flow',
        "Hinekora's Lock", 'hinekora_lock',
        "Farrul's Rune of the Chase", 'farrul_rune'
    ];
    
    if (highValueCurrencies.some(curr => currencyName.includes(curr) || curr.includes(currencyName))) {
        // For high-value items, show decimals only if meaningful
        if (numAmount < 1) {
            return numAmount.toFixed(2);
        } else if (numAmount < 10) {
            return numAmount.toFixed(1);
        } else {
            return Math.round(numAmount).toString();
        }
    }
    
    // For Divine and Exalted, show 1 decimal place for small amounts, otherwise round
    if (currencyName.includes('Divine') || currencyName.includes('Exalted')) {
        if (numAmount < 10) {
            return numAmount.toFixed(1);
        } else {
            return Math.round(numAmount).toString();
        }
    }
    
    // For all other currencies (Chaos, Omens, etc.), use whole numbers
    if (numAmount < 1 && numAmount > 0) {
        // Show as fraction for very small amounts, but round to meaningful decimals
        return numAmount.toFixed(2);
    } else {
        return Math.round(numAmount).toString();
    }
}

/**
 * Format trading rates for display
 */
function formatTradingRate(rate) {
    const numRate = parseFloat(rate);
    
    // Handle invalid rates
    if (!isFinite(numRate) || numRate < 0) {
        return "0.000";
    }
    
    // For rates > 1000, show as whole numbers
    if (numRate >= 1000) {
        return Math.round(numRate).toString();
    }
    // For rates > 100, show 1 decimal
    else if (numRate >= 100) {
        return numRate.toFixed(1);
    }
    // For rates > 10, show 2 decimals  
    else if (numRate >= 10) {
        return numRate.toFixed(2);
    }
    // For small rates, show 3 decimals
    else {
        return numRate.toFixed(3);
    }
}

/**
 * Get realistic integer amount for trading
 */
function getRealisticTradingAmount(amount, currencyName) {
    const numAmount = parseFloat(amount);
    
    // For very valuable currencies, allow some decimals but keep reasonable
    const highValueCurrencies = [
        'Mirror of Kalandra', 'mirror',
        "Rakiata's Flow", 'rakiata_flow',
        "Hinekora's Lock", 'hinekora_lock',
        "Farrul's Rune of the Chase", 'farrul_rune'
    ];
    
    if (highValueCurrencies.some(curr => currencyName.includes(curr) || curr.includes(currencyName))) {
        // For high-value items, use 0.1 precision (e.g., 1.2 Mirror)
        if (numAmount < 1) {
            return Math.round(numAmount * 10) / 10;
        } else {
            return Math.round(numAmount * 2) / 2; // Round to nearest 0.5
        }
    }
    
    // For Divine, Exalted, and other premium currencies - ALWAYS whole numbers (they're individual items)
    if (currencyName.includes('Divine') || currencyName.includes('Exalted') || 
        currencyName.includes('Mirror') || currencyName.includes('Omen') ||
        currencyName.includes('Rakiata') || currencyName.includes('Hinekora') || 
        currencyName.includes('Farrul')) {
        
        // Round up if we're close to the next whole number to preserve value
        if (numAmount - Math.floor(numAmount) >= 0.7) {
            return Math.ceil(numAmount);
        } else {
            return Math.floor(numAmount);
        }
    }
    
    // For Chaos and other common currencies, allow some decimal precision for small amounts
    if (currencyName.includes('Chaos') && numAmount < 10) {
        return Math.round(numAmount * 4) / 4; // Round to nearest 0.25 for small Chaos amounts
    }
    
    // For all other currencies, use whole numbers only
    return Math.round(numAmount);
}

/**
 * Calculate multi-scale trading opportunities at different investment levels
 */
function calculateMultiScaleTradingSteps(opportunity, currencyId) {
    // Define investment scales based on currency tier
    const scales = getInvestmentScales(currencyId);
    
    const results = [];
    
    for (const scale of scales) {
        const candidateAmounts = scale.amounts;
        
        let bestResult = null;
        let bestEfficiency = -Infinity;
        
        for (let startingAmount of candidateAmounts) {
            const result = simulateIntegerTradeChain(opportunity, startingAmount);
            
            // Skip if any step produces 0 (trade chain breaks)
            if (result.steps.some(step => step.amountAfter === 0)) {
                continue;
            }
            
            // Calculate efficiency (profit per starting unit)
            const efficiency = result.finalAmount > 0 ? result.profit / result.startingAmount : -Infinity;
            
            // Prefer smaller starting amounts if efficiency is similar
            const efficiencyBonus = efficiency - (startingAmount / 10000); // Small penalty for large amounts
            
            if (efficiencyBonus > bestEfficiency) {
                bestEfficiency = efficiencyBonus;
                bestResult = result;
            }
        }
        
        if (bestResult && bestResult.viable && bestResult.profit > 0) {
            results.push({
                ...bestResult,
                scale: scale.tier,
                scaleInfo: scale
            });
        }
    }
    
    return results;
}

/**
 * Get investment scales based on currency tier
 */
function getInvestmentScales(currencyId) {
    // Define currency tiers
    const premiumCurrencies = ['divine', 'mirror', 'perfect_exalted', 'rakiata_flow', 'hinekora_lock', 'farrul_rune'];
    const moderateCurrencies = ['exalted', 'greater_exalted', 'perfect_chaos', 'orb_annulment', 'fracturing_orb'];
    
    let scales;
    
    if (premiumCurrencies.includes(currencyId)) {
        // Premium currencies: Very conservative amounts
        scales = [
            {
                tier: 'starter',
                name: '🏠 Starter',
                description: 'New player friendly',
                amounts: [1, 2, 3],
                budgetNote: '≈ $5-15 value'
            },
            {
                tier: 'moderate', 
                name: '💎 Moderate',
                description: 'Experienced player',
                amounts: [5, 8, 10],
                budgetNote: '≈ $25-50 value'
            },
            {
                tier: 'advanced',
                name: '🐋 Advanced',
                description: 'High-end player',
                amounts: [20, 30, 50],
                budgetNote: '≈ $100-250 value'
            }
        ];
    } else if (moderateCurrencies.includes(currencyId)) {
        // Moderate currencies: Medium amounts
        scales = [
            {
                tier: 'starter',
                name: '🏠 Starter', 
                description: 'Accessible amounts',
                amounts: [10, 20, 30],
                budgetNote: '≈ $2-6 value'
            },
            {
                tier: 'moderate',
                name: '💎 Moderate',
                description: 'Standard trading',
                amounts: [50, 75, 100],
                budgetNote: '≈ $10-20 value'
            },
            {
                tier: 'advanced',
                name: '🐋 Advanced', 
                description: 'High-volume trading',
                amounts: [200, 300, 500],
                budgetNote: '≈ $40-100 value'
            }
        ];
    } else {
        // Budget currencies: Higher amounts OK
        scales = [
            {
                tier: 'starter',
                name: '🏠 Starter',
                description: 'Perfect for beginners', 
                amounts: [50, 100, 150],
                budgetNote: '≈ $1-3 value'
            },
            {
                tier: 'moderate',
                name: '💎 Moderate',
                description: 'Solid investment',
                amounts: [250, 500, 750],
                budgetNote: '≈ $5-15 value'
            },
            {
                tier: 'advanced',
                name: '🐋 Advanced',
                description: 'Maximum efficiency',
                amounts: [1000, 2000, 3000],
                budgetNote: '≈ $20-60 value'
            }
        ];
    }
    
    return scales;
}

/**
 * Calculate realistic trading steps using natural viable amounts (Legacy function)
 */
function calculateRealisticTradingSteps(opportunity) {
    // Try different starting amounts to find the most viable one
    const candidateAmounts = [100, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000];
    
    let bestResult = null;
    let bestEfficiency = -Infinity;
    
    for (let startingAmount of candidateAmounts) {
        const result = simulateIntegerTradeChain(opportunity, startingAmount);
        
        // Skip if any step produces 0 (trade chain breaks)
        if (result.steps.some(step => step.amountAfter === 0)) {
            continue;
        }
        
        // Calculate efficiency (profit per starting unit)
        const efficiency = result.finalAmount > 0 ? result.profit / result.startingAmount : -Infinity;
        
        // Prefer smaller starting amounts if efficiency is similar
        const efficiencyBonus = efficiency - (startingAmount / 10000); // Small penalty for large amounts
        
        if (efficiencyBonus > bestEfficiency) {
            bestEfficiency = efficiencyBonus;
            bestResult = result;
        }
    }
    
    // If no viable amount found, create a placeholder result
    if (!bestResult) {
        return {
            steps: opportunity.steps.map(step => ({
                fromName: step.from_name,
                toName: step.to_name,
                amountBefore: 0,
                amountAfter: 0,
                actualRate: "N/A",
                originalRate: step.rate
            })),
            startingAmount: 0,
            finalAmount: 0,
            profit: 0,
            profitPercent: 0,
            viable: false
        };
    }
    
    return bestResult;
}

/**
 * Simulate a complete trade chain with integer constraints
 */
function simulateIntegerTradeChain(opportunity, startingAmount) {
    const steps = [];
    let currentAmount = startingAmount;
    
    // Validate inputs
    if (!isFinite(startingAmount) || startingAmount <= 0 || !opportunity || !opportunity.steps) {
        return {
            steps: [],
            startingAmount: 0,
            finalAmount: 0,
            profit: 0,
            profitPercent: 0,
            viable: false
        };
    }
    
    // Process each step with conservative integer rounding
    for (let originalStep of opportunity.steps) {
        // Validate step data
        if (!originalStep || !isFinite(originalStep.rate) || originalStep.rate <= 0) {
            return {
                steps: steps,
                startingAmount: startingAmount,
                finalAmount: 0,
                profit: -startingAmount,
                profitPercent: -100,
                viable: false
            };
        }
        
        // Conservative input amount (round up what we need to pay)
        const amountBefore = getConservativeInputAmount(currentAmount, originalStep.from_name);
        
        // If input amount becomes 0 or invalid, the chain is broken
        if (amountBefore <= 0) {
            return {
                steps: steps,
                startingAmount: startingAmount,
                finalAmount: 0,
                profit: -startingAmount,
                profitPercent: -100,
                viable: false
            };
        }
        
        // Calculate theoretical output
        const theoreticalAfter = amountBefore * originalStep.rate;
        
        // Conservative output amount (round down what we receive)
        const amountAfter = getConservativeOutputAmount(theoreticalAfter, originalStep.to_name);
        
        // Calculate actual rate achieved (with safety check)
        const actualRate = amountBefore > 0 && isFinite(amountAfter / amountBefore) ? 
                          (amountAfter / amountBefore) : 0;
        
        steps.push({
            fromName: originalStep.from_name,
            toName: originalStep.to_name,
            amountBefore: amountBefore,
            amountAfter: amountAfter,
            actualRate: formatTradingRate(actualRate),
            originalRate: originalStep.rate
        });
        
        currentAmount = amountAfter;
        
        // If current amount becomes 0, chain is broken
        if (currentAmount <= 0) {
            return {
                steps: steps,
                startingAmount: startingAmount,
                finalAmount: 0,
                profit: -startingAmount,
                profitPercent: -100,
                viable: false
            };
        }
    }
    
    // Calculate final results with safety checks
    const finalAmount = currentAmount;
    const realProfit = finalAmount - startingAmount;
    const realProfitPercent = startingAmount > 0 && isFinite(realProfit / startingAmount) ? 
                             (realProfit / startingAmount) * 100 : 0;
    
    return {
        steps: steps,
        startingAmount: startingAmount,
        finalAmount: finalAmount,
        profit: realProfit,
        profitPercent: realProfitPercent,
        viable: finalAmount > 0 && !steps.some(step => step.amountAfter === 0)
    };
}

/**
 * Conservative input amount (round up to never underpay)
 */
function getConservativeInputAmount(amount, currencyName) {
    // Handle invalid inputs
    if (!isFinite(amount) || amount <= 0) {
        return 0;
    }
    
    if (isPremiumCurrency(currencyName)) {
        return Math.ceil(amount); // Always round up what we pay
    } else {
        // For stackable currencies, use small precision but round up
        if (amount < 10) {
            return Math.ceil(amount * 4) / 4; // Round up to nearest 0.25
        } else {
            return Math.ceil(amount);
        }
    }
}

/**
 * Conservative output amount (round down to never overcount gains)
 */
function getConservativeOutputAmount(amount, currencyName) {
    // Handle invalid inputs
    if (!isFinite(amount) || amount <= 0) {
        return 0;
    }
    
    if (isPremiumCurrency(currencyName)) {
        return Math.floor(amount); // Always round down what we receive
    } else {
        // For stackable currencies, use small precision but round down
        if (amount < 10) {
            return Math.floor(amount * 4) / 4; // Round down to nearest 0.25
        } else {
            return Math.floor(amount);
        }
    }
}

/**
 * Check if a currency is a premium currency (individual items)
 */
function isPremiumCurrency(currencyName) {
    const premiumKeywords = ['Divine', 'Exalted', 'Mirror', 'Omen', 'Rakiata', 'Hinekora', 'Farrul'];
    return premiumKeywords.some(keyword => currencyName.includes(keyword));
}

/**
 * Estimate real-world value of a currency amount
 */
function estimateRealWorldValue(amount, currencyId) {
    // Use real-time exchange rates relative to Divine Orb (Divine = $1 baseline)
    
    // If it's Divine Orb, it's our $1 baseline
    if (currencyId === 'divine') {
        return amount * 1.0;
    }
    
    // If we don't have current rates, use fallback static values
    if (!currentRates || !currentRates.rates) {
        console.warn('⚠️ No current rates available, using fallback values');
        const fallbackValues = {
            'mirror': 10,          // ~$10 per Mirror (fallback)
            'perfect_exalted': 0.5, // ~$0.50 per Perfect Exalted
            'rakiata_flow': 5,     // ~$5 per Rakiata's Flow
            'hinekora_lock': 5,    // ~$5 per Hinekora's Lock
            'farrul_rune': 5,      // ~$5 per Farrul's Rune
            'exalted': 0.2,        // ~$0.20 per Exalted
            'orb_annulment': 0.05, // ~$0.05 per Orb of Annulment
            'chaos': 0.03,         // ~$0.03 per Chaos Orb
            'omen_whittling': 0.002, // ~$0.002 per Omen of Whittling
        };
        const valuePerUnit = fallbackValues[currencyId] || 0.01;
        return amount * valuePerUnit;
    }
    
    // Calculate value relative to Divine using real exchange rates
    try {
        console.log(`🔍 Calculating value for ${amount} ${currencyId}:`, {
            hasCurrentRates: !!currentRates,
            hasRates: !!(currentRates && currentRates.rates),
            ratesKeys: currentRates && currentRates.rates ? Object.keys(currentRates.rates) : 'none'
        });
        
        // Get the rate from this currency to Divine Orb
        let rateToDivine = 0;
        
        if (currentRates.rates[currencyId] && currentRates.rates[currencyId]['divine']) {
            // Direct rate: currencyId → divine
            rateToDivine = currentRates.rates[currencyId]['divine'];
        } else if (currentRates.rates['divine'] && currentRates.rates['divine'][currencyId]) {
            // Inverse rate: divine → currencyId, so we need 1/rate
            rateToDivine = 1.0 / currentRates.rates['divine'][currencyId];
        } else {
            // Try to find a path through another currency (e.g., via Chaos)
            const intermediateCurrencies = ['chaos', 'exalted', 'orb_annulment'];
            for (const intermediate of intermediateCurrencies) {
                if (currentRates.rates[currencyId] && currentRates.rates[currencyId][intermediate] &&
                    currentRates.rates[intermediate] && currentRates.rates[intermediate]['divine']) {
                    // currencyId → intermediate → divine
                    const rateToIntermediate = currentRates.rates[currencyId][intermediate];
                    const intermediateToDivine = currentRates.rates[intermediate]['divine'];
                    rateToDivine = rateToIntermediate * intermediateToDivine;
                    break;
                } else if (currentRates.rates['divine'] && currentRates.rates['divine'][intermediate] &&
                          currentRates.rates[intermediate] && currentRates.rates[intermediate][currencyId]) {
                    // divine → intermediate → currencyId (need inverse)
                    const divineToIntermediate = currentRates.rates['divine'][intermediate];
                    const intermediateToThis = currentRates.rates[intermediate][currencyId];
                    rateToDivine = 1.0 / (divineToIntermediate * intermediateToThis);
                    break;
                }
            }
        }
        
        if (rateToDivine > 0) {
            // Convert amount to Divine equivalent, then to USD (Divine = $1)
            const divineEquivalent = amount * rateToDivine;
            const usdValue = divineEquivalent * 1.0; // $1 per Divine
            console.log(`💰 ${amount} ${currencyId} = ${divineEquivalent.toFixed(2)} Divine = $${usdValue.toFixed(2)}`);
            return usdValue;
        }
        
        console.warn(`⚠️ Could not find exchange rate for ${currencyId} to Divine, using fallback`);
        return amount * 0.01; // Fallback value
        
    } catch (error) {
        console.warn(`⚠️ Error calculating real-world value for ${currencyId}:`, error);
        return amount * 0.01; // Fallback value
    }
}

const BUDGET_CATEGORY_ORDER = ['micro', 'small', 'medium', 'large', 'whale'];

function determineBudgetCategory(estimatedValue) {
    if (!isFinite(estimatedValue) || estimatedValue < 0) {
        return 'micro';
    }
    if (estimatedValue <= 5) return 'micro';
    if (estimatedValue <= 25) return 'small';
    if (estimatedValue <= 100) return 'medium';
    if (estimatedValue <= 500) return 'large';
    return 'whale';
}

function getBudgetAnalysis(opportunity, currencyId) {
    if (!opportunity) return [];

    const cached = opportunity._budgetAnalysis;
    if (cached && cached.currencyId === currencyId) {
        return cached.analysis;
    }

    const multiScaleResults = calculateMultiScaleTradingSteps(opportunity, currencyId);
    const analysis = multiScaleResults.map(scaleResult => {
        const estimatedValue = estimateRealWorldValue(scaleResult.startingAmount, currencyId);
        const category = determineBudgetCategory(estimatedValue);
        return {
            scale: scaleResult,
            category,
            estimatedValue
        };
    });

    opportunity._budgetAnalysis = {
        currencyId,
        analysis
    };

    return analysis;
}

/**
 * Determine budget category for an opportunity based on actual trading amounts
 */
function getBudgetCategory(opportunity, currencyId) {
    const analysis = getBudgetAnalysis(opportunity, currencyId);
    if (analysis.length === 0) return null;

    console.log(`🔍 Budget analysis for ${opportunity.starting_currency_name}:`, {
        options: analysis.map(entry => ({
            scale: entry.scale.scale,
            amount: entry.scale.startingAmount,
            value: entry.estimatedValue.toFixed(2),
            category: entry.category
        }))
    });

    const sortedByCategory = [...analysis].sort((a, b) =>
        BUDGET_CATEGORY_ORDER.indexOf(a.category) - BUDGET_CATEGORY_ORDER.indexOf(b.category)
    );

    const chosen = sortedByCategory[0];
    console.log(`🎯 Primary budget category: ${chosen.category} ($${chosen.estimatedValue.toFixed(2)} value)`);
    return chosen.category;
}

/**
 * Check if opportunity matches selected budget range
 */
function matchesBudgetRange(opportunity, currencyId, selectedRange) {
    if (selectedRange === 'all') return true;

    const analysis = getBudgetAnalysis(opportunity, currencyId);
    if (analysis.length === 0) {
        console.log(`🎯 Budget filtering: ${opportunity.starting_currency_name} → no viable scales`);
        return false;
    }

    const matches = analysis.some(entry => entry.category === selectedRange);

    console.log(`🎯 Budget filtering: ${opportunity.starting_currency_name}`, {
        selected: selectedRange,
        categories: analysis.map(entry => ({
            scale: entry.scale.scale,
            amount: entry.scale.startingAmount,
            category: entry.category,
            value: entry.estimatedValue.toFixed(2)
        })),
        matches
    });

    return matches;
}

/**
 * Load exchange rates for budget calculations
 */
async function loadExchangeRates() {
    try {
        console.log('📊 Loading exchange rates for budget calculations...');
        const response = await fetch(`${API_BASE_URL}/rates/${encodeURIComponent(currentConfig.league)}?top_percentage=${currentConfig.topPercentage}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        currentRates = data;
        console.log('✅ Exchange rates loaded:', {
            currencies: Object.keys(data.rates || {}).length,
            source: data.metadata?.source,
            fetchedAt: data.metadata?.fetched_at
        });
        
    } catch (error) {
        console.warn('⚠️ Failed to load exchange rates:', error.message);
        currentRates = null;
    }
}

/**
 * Initialize the application
 */
async function initializeApp() {
    console.log('🚀 Initializing PoE2 Arbitrage Calculator...');
    
    // Get DOM elements
    currencySelect = document.getElementById('currencySelect');
    minProfitInput = document.getElementById('minProfit');
    resultsContainer = document.getElementById('results');
    statusContainer = document.getElementById('status');
    loadingIndicator = document.getElementById('loading');
    
    // Load currencies and exchange rates
    await Promise.all([
        loadCurrencies(),
        loadExchangeRates()
    ]);
    
    // Set up event listeners
    setupEventListeners();
    
    console.log('✅ App initialized successfully!');
}

/**
 * Load available currencies from backend
 */
async function loadCurrencies() {
    try {
        showLoading(true);
        updateStatus('📋 Loading supported currencies...', 'info');
        
        const params = new URLSearchParams({
            league: currentConfig.league,
            top_percentage: currentConfig.topPercentage.toString(),
            force_refresh: 'false'
        });
        
        const response = await fetch(`${API_BASE_URL}/currencies?${params}`);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        availableCurrencies = data.currencies;
        
        populateCurrencySelect();
        
        const statusMessage = data.error ? 
            `⚠️ Using ${availableCurrencies.length} fallback currencies (${data.error})` :
            `✅ ${availableCurrencies.length} currencies loaded (top ${(currentConfig.topPercentage * 100).toFixed(0)}% by popularity). Ready for live arbitrage!`;
        
        updateStatus(statusMessage, data.error ? 'warning' : 'success');
        
        console.log(`📊 Loaded ${availableCurrencies.length} currencies (top ${(currentConfig.topPercentage * 100).toFixed(0)}%):`, 
            availableCurrencies.map(c => c.name).join(', '));
        
        // Log popularity metrics if available
        if (data.currencies.length > 0 && data.currencies[0].popularity_score !== undefined) {
            console.log('🏆 Top 5 most popular currencies:');
            data.currencies.slice(0, 5).forEach((currency, i) => {
                console.log(`  ${i+1}. ${currency.name} (volume: ${currency.volume?.toLocaleString() || 'N/A'}, score: ${currency.popularity_score?.toFixed(1) || 'N/A'})`);
            });
        }
        
    } catch (error) {
        console.error('❌ Failed to load currencies:', error);
        updateStatus(`❌ Error loading currencies: ${error.message}. Please ensure backend is running.`, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Populate currency selection dropdown
 */
function populateCurrencySelect() {
    if (!currencySelect || !availableCurrencies.length) return;
    
    // Clear existing options
    currencySelect.innerHTML = '<option value="">Select Currency...</option>';
    
    // Sort currencies by popularity score if available, otherwise use original order
    const sortedCurrencies = [...availableCurrencies];
    if (sortedCurrencies[0]?.popularity_score !== undefined) {
        sortedCurrencies.sort((a, b) => (b.popularity_score || 0) - (a.popularity_score || 0));
    }
    
    // Group currencies dynamically by category for better UX
    const groups = {
        'Top Currencies': [],
        'Core Currencies': [],
        'Popular Currencies': [],
        'Omens & Special Items': [],
        'Other Currencies': []
    };
    
    // Predefined lists for categorization
    const coreIds = ['exalted', 'divine', 'chaos'];
    const popularIds = ['mirror', 'perfect_exalted', 'orb_annulment', 'orb_chance', 'perfect_chaos', 'fracturing_orb', 'greater_exalted'];
    const omenIds = ['omen_light', 'omen_homogenising', 'omen_abyssal', 'omen_whittling', 'omen_chaotic', 'omen_amelioration'];
    const specialIds = ['rakiata_flow', 'talisman_sirrius', 'hinekora_lock', 'farrul_rune', 'atalui_bloodletting'];
    
    // Categorize currencies
    sortedCurrencies.forEach((currency, index) => {
        if (index < 5 && currency.popularity_score !== undefined) {
            groups['Top Currencies'].push(currency);
        } else if (coreIds.includes(currency.id)) {
            groups['Core Currencies'].push(currency);
        } else if (popularIds.includes(currency.id)) {
            groups['Popular Currencies'].push(currency);
        } else if (omenIds.includes(currency.id) || specialIds.includes(currency.id)) {
            groups['Omens & Special Items'].push(currency);
        } else {
            groups['Other Currencies'].push(currency);
        }
    });
    
    // Add grouped options
    for (const [groupName, currencies] of Object.entries(groups)) {
        if (currencies.length === 0) continue;
        
        const optgroup = document.createElement('optgroup');
        optgroup.label = `${groupName} (${currencies.length})`;
        
        for (const currency of currencies) {
            const option = document.createElement('option');
            option.value = currency.id;
            
            // Add popularity info if available and enabled
            if (currentConfig.showPopularityMetrics && currency.popularity_score !== undefined) {
                option.textContent = `${currency.name} (★${currency.popularity_score.toFixed(1)})`;
                option.title = `Volume: ${currency.volume?.toLocaleString() || 'N/A'}, Pairs: ${currency.pair_count || 'N/A'}`;
            } else {
                option.textContent = currency.name;
            }
            
            optgroup.appendChild(option);
        }
        
        currencySelect.appendChild(optgroup);
    }
    
    // Set default selection to Chaos Orb if available, otherwise first currency
    const defaultCurrency = sortedCurrencies.find(c => c.id === 'chaos') || sortedCurrencies[0];
    if (defaultCurrency) {
        currencySelect.value = defaultCurrency.id;
    }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
    const calculateButton = document.getElementById('calculateButton');
    if (calculateButton) {
        calculateButton.addEventListener('click', calculateArbitrage);
    }
    
    const refreshDataButton = document.getElementById('refreshDataButton');
    if (refreshDataButton) {
        refreshDataButton.addEventListener('click', forceRefreshData);
    }
    
    // Trading mode controls
    const specificCurrencyMode = document.getElementById('specificCurrencyMode');
    const allTradesMode = document.getElementById('allTradesMode');
    
    if (specificCurrencyMode) {
        specificCurrencyMode.addEventListener('change', handleTradingModeChange);
    }
    
    if (allTradesMode) {
        allTradesMode.addEventListener('change', handleTradingModeChange);
    }
    
    // Configuration controls
    const topPercentageSlider = document.getElementById('topPercentage');
    const showPopularityMetrics = document.getElementById('showPopularityMetrics');
    
    if (topPercentageSlider) {
        topPercentageSlider.addEventListener('input', updateTopPercentage);
        topPercentageSlider.addEventListener('change', handleTopPercentageChange);
    }
    
    if (showPopularityMetrics) {
        showPopularityMetrics.addEventListener('change', togglePopularityMetrics);
    }
    
    // Allow Enter key to trigger calculation
    if (minProfitInput) {
        minProfitInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') calculateArbitrage();
        });
    }
}

/**
 * Update the top percentage display as user moves the slider
 */
function updateTopPercentage(event) {
    const percentage = parseInt(event.target.value);
    const display = document.querySelector('.percentage-display');
    if (display) {
        display.textContent = `Top ${percentage}% of currencies`;
    }
}

/**
 * Handle top percentage change - reload currencies when user stops adjusting
 */
async function handleTopPercentageChange(event) {
    const percentage = parseInt(event.target.value);
    currentConfig.topPercentage = percentage / 100;
    
    console.log(`🔄 Updated currency selection to top ${percentage}%`);
    updateStatus(`🔄 Loading top ${percentage}% of currencies...`, 'info');
    
    // Reload currencies with new percentage
    await loadCurrencies();
}

/**
 * Toggle popularity metrics display
 */
function togglePopularityMetrics(event) {
    currentConfig.showPopularityMetrics = event.target.checked;
    console.log(`${event.target.checked ? '✅' : '❌'} Popularity metrics display: ${event.target.checked ? 'enabled' : 'disabled'}`);
    
    // Repopulate currency select with/without metrics
    populateCurrencySelect();
}

/**
 * Handle trading mode change between specific currency and all trades
 */
function handleTradingModeChange(event) {
    const currencySelectGroup = document.getElementById('currencySelectGroup');
    const budgetRangeGroup = document.getElementById('budgetRangeGroup');
    const calculateButton = document.getElementById('calculateButton');
    
    if (event.target.value === 'specific') {
        // Show currency selection for specific mode
        if (currencySelectGroup) {
            currencySelectGroup.style.display = 'block';
        }
        // Hide budget range for specific mode
        if (budgetRangeGroup) {
            budgetRangeGroup.style.display = 'none';
        }
        if (calculateButton) {
            calculateButton.textContent = '🚀 Calculate Arbitrage Opportunities';
        }
        console.log('🎯 Switched to Specific Currency mode');
    } else if (event.target.value === 'all') {
        // Hide currency selection for all trades mode  
        if (currencySelectGroup) {
            currencySelectGroup.style.display = 'none';
        }
        // Show budget range for all trades mode
        if (budgetRangeGroup) {
            budgetRangeGroup.style.display = 'block';
        }
        if (calculateButton) {
            calculateButton.textContent = '🏆 Find All Best Trades';
        }
        console.log('🌟 Switched to All Trades Ranked mode');
    }
    
    // Clear any existing results when switching modes
    clearResults();
}

// Removed: fetchExchangeRates and convertExaltedEquivalentToActualAmount functions
// These are no longer needed after deprecating the Exalted equivalent system

/**
 * Force refresh live data from POE2Scout
 */
async function forceRefreshData() {
    const refreshButton = document.getElementById('refreshDataButton');
    
    try {
        // Disable button and show loading state
        if (refreshButton) {
            refreshButton.disabled = true;
            refreshButton.textContent = '🔄 Refreshing...';
        }
        
        showLoading(true);
        updateStatus('🎭 Force refreshing live data...', 'info');
        
        // Clear any existing results
        clearResults();
        
        // Make a request that forces backend to refresh its data
        // Any arbitrage request triggers fresh data fetching from POE2Scout
        console.log('🔄 Forcing backend data refresh via arbitrage request...');
        
        updateStatus('🌐 Extracting fresh live data from POE2Scout...', 'info');
        
        // Make a minimal arbitrage request to trigger data refresh
        const refreshUrl = `${API_BASE_URL}/arbitrage/${encodeURIComponent(DEFAULT_LEAGUE)}?starting_currency=chaos&amount=100&min_profit=0.01&max_results=1`;
        const refreshResponse = await fetch(refreshUrl);
        
        if (!refreshResponse.ok) {
            const errorData = await refreshResponse.json().catch(() => ({ detail: 'Unknown error' }));
            throw new Error(`Data refresh failed: ${errorData.detail || refreshResponse.statusText}`);
        }
        
        const data = await refreshResponse.json();
        
        // Verify we got fresh live data
        if (data.data_source && data.data_source.source === 'poe2scout') {
            const fetchTime = new Date(data.data_source.fetched_at);
            const timeStr = fetchTime.toLocaleTimeString();
            console.log(`✅ Fresh data retrieved at ${timeStr}`);
        } else {
            throw new Error(`Expected live data but got: ${data.data_source?.source || 'unknown source'}`);
        }
        
        updateStatus('✅ Live data refresh completed! Ready for new calculations.', 'success');
        console.log('✅ Data refresh completed successfully');
        
    } catch (error) {
        console.error('❌ Force refresh failed:', error);
        updateStatus(`❌ Force refresh failed: ${error.message}`, 'error');
    } finally {
        // Re-enable button and restore text
        if (refreshButton) {
            refreshButton.disabled = false;
            refreshButton.textContent = '🔄 Force Refresh Live Data';
        }
        showLoading(false);
    }
}

/**
 * Get dynamic default trade amount based on currency tier
 */
function getDynamicDefaultAmount(currencyId) {
    // Define currency tiers with appropriate default amounts
    const premiumCurrencies = {
        'divine': 2,           // Very expensive - start small
        'mirror': 1,           // Extremely expensive
        'perfect_exalted': 5,
        'rakiata_flow': 1,
        'hinekora_lock': 1,
        'farrul_rune': 1
    };
    
    const moderateCurrencies = {
        'exalted': 10,         // Expensive but more accessible
        'greater_exalted': 8,
        'perfect_chaos': 15,
        'orb_annulment': 20,
        'fracturing_orb': 25,
        'perfect_jeweller': 10,
        'atalui_bloodletting': 15  // Special currency but moderate value
    };
    
    const budgetCurrencies = {
        'chaos': 100,          // Common currency - higher amounts OK
        'orb_chance': 80,
        'orb_fusing': 120,
        'jeweller': 150,
        'ancient': 60,
        'uncut_gem_20': 50,
        'omen_light': 500,     // Small value omens - can use more
        'omen_homogenising': 800,
        'omen_abyssal': 700,
        'omen_whittling': 250,
        'omen_chaotic': 300,
        'omen_amelioration': 400,
        'talisman_sirrius': 100
    };
    
    // Check each tier
    if (premiumCurrencies[currencyId]) {
        return premiumCurrencies[currencyId];
    }
    if (moderateCurrencies[currencyId]) {
        return moderateCurrencies[currencyId];
    }
    if (budgetCurrencies[currencyId]) {
        return budgetCurrencies[currencyId];
    }
    
    // Default fallback - assume moderate tier
    return 25;
}

/**
 * Calculate arbitrage opportunities using backend API
 */
async function calculateArbitrage() {
    // Check which trading mode is selected
    const allTradesMode = document.getElementById('allTradesMode');
    const isAllTradesMode = allTradesMode && allTradesMode.checked;
    
    if (isAllTradesMode) {
        await calculateAllTrades();
        return;
    }
    
    // Original specific currency logic
    const startingCurrency = currencySelect.value;
    const minProfit = parseFloat(minProfitInput.value) / 100; // Convert percentage to decimal
    
    // Use dynamic default amount based on currency value
    const defaultTradeAmount = getDynamicDefaultAmount(startingCurrency);
    
    // Validation
    if (!startingCurrency) {
        updateStatus('Please select a starting currency', 'error');
        return;
    }
    
    if (isNaN(minProfit) || minProfit < 0) {
        updateStatus('Please enter a valid minimum profit percentage', 'error');
        return;
    }
    
    try {
        showLoading(true);
        updateStatus('Calculating arbitrage opportunities...', 'info');
        clearResults();
        
        // Stage 1: Browser launch
        updateStatus('🎭 Launching browser automation...', 'info');
        await new Promise(resolve => setTimeout(resolve, 500)); // Brief pause for UI update
        
        // Stage 2: Data extraction 
        updateStatus(`🌐 Extracting live data (using ${defaultTradeAmount} ${startingCurrency} as base amount)...`, 'info');
        
        console.log(`🔍 Using dynamic default: ${defaultTradeAmount} ${startingCurrency} (tier-based)`);
        
        const liveUrl = `${API_BASE_URL}/arbitrage/${encodeURIComponent(DEFAULT_LEAGUE)}?starting_currency=${encodeURIComponent(startingCurrency)}&amount=${defaultTradeAmount}&min_profit=${minProfit}&max_results=10&top_percentage=${currentConfig.topPercentage}`;
        console.log(`🔍 Requesting LIVE arbitrage data: ${liveUrl}`);
        
        const response = await fetch(liveUrl);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
            updateStatus(`❌ Live data extraction failed`, 'error');
            throw new Error(`Live data extraction failed: ${errorData.detail || response.statusText}`);
        }
        
        const data = await response.json();
        console.log('📈 Live arbitrage results:', data);
        
        // Stage 3: Verification and completion
        if (data.data_source && data.data_source.source === 'poe2scout') {
            const fetchTime = new Date(data.data_source.fetched_at);
            const timeStr = fetchTime.toLocaleTimeString();
            const isRecent = (new Date() - fetchTime) < 60000; // Within last minute
            
            updateStatus(`✅ Live data retrieved at ${timeStr} ${isRecent ? '(fresh)' : ''}`, 'success');
        } else {
            updateStatus(`❌ Invalid data source received`, 'error');
            throw new Error(`Expected live POE2Scout data but got: ${data.data_source?.source || 'unknown source'}`);
        }
        
        displayArbitrageResults(data, defaultTradeAmount, startingCurrency);
        
    } catch (error) {
        console.error('❌ Arbitrage calculation failed:', error);
        updateStatus(`Calculation failed: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Calculate arbitrage opportunities from ALL currencies and rank by profit
 */
async function calculateAllTrades() {
    const minProfit = parseFloat(minProfitInput.value) / 100; // Convert percentage to decimal
    
    // Validation
    if (isNaN(minProfit) || minProfit < 0) {
        updateStatus('Please enter a valid minimum profit percentage', 'error');
        return;
    }
    
    if (!availableCurrencies.length) {
        updateStatus('No currencies available. Please refresh the page.', 'error');
        return;
    }
    
    try {
        showLoading(true);
        updateStatus('🌟 Calculating arbitrage from ALL currencies...', 'info');
        clearResults();
        
        // Stage 1: Start calculations
        updateStatus(`🎯 Analyzing ${availableCurrencies.length} currencies...`, 'info');
        await new Promise(resolve => setTimeout(resolve, 300)); // Brief pause for UI
        
        const allOpportunities = [];
        const failedCurrencies = [];
        let processedCount = 0;
        
        // Process currencies in batches to avoid overwhelming the backend
        const batchSize = 5;
        
        for (let i = 0; i < availableCurrencies.length; i += batchSize) {
            const batch = availableCurrencies.slice(i, i + batchSize);
            
            // Update status
            updateStatus(`🔍 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(availableCurrencies.length/batchSize)}...`, 'info');
            
            // Process batch in parallel  
            const batchPromises = batch.map(async (currency) => {
                try {
                    const defaultAmount = getDynamicDefaultAmount(currency.id);
                    const url = `${API_BASE_URL}/arbitrage/${encodeURIComponent(DEFAULT_LEAGUE)}?starting_currency=${encodeURIComponent(currency.id)}&amount=${defaultAmount}&min_profit=${minProfit}&max_results=5&top_percentage=${currentConfig.topPercentage}`;
                    
                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status} for ${currency.name}`);
                    }
                    
                    const data = await response.json();
                    
                    if (data.opportunities && data.opportunities.length > 0) {
                        // Add currency context to each opportunity
                        const opportunitiesWithContext = data.opportunities.map(opp => ({
                            ...opp,
                            starting_currency_id: currency.id,
                            starting_currency_name: currency.name,
                            default_amount: defaultAmount,
                            data_source: data.data_source
                        }));
                        
                        allOpportunities.push(...opportunitiesWithContext);
                    }
                    
                    processedCount++;
                    
                } catch (error) {
                    console.warn(`⚠️ Failed to get arbitrage for ${currency.name}:`, error.message);
                    failedCurrencies.push(currency.name);
                }
            });
            
            await Promise.all(batchPromises);
            
            // Small delay between batches to be nice to the backend
            if (i + batchSize < availableCurrencies.length) {
                await new Promise(resolve => setTimeout(resolve, 200));
            }
        }
        
        console.log(`✅ Processed ${processedCount}/${availableCurrencies.length} currencies`);
        if (failedCurrencies.length > 0) {
            console.warn(`⚠️ Failed currencies: ${failedCurrencies.join(', ')}`);
        }
        
        if (allOpportunities.length === 0) {
            updateStatus('No profitable opportunities found across all currencies with current parameters', 'warning');
            return;
        }
        
        // Stage 2: Apply budget filtering and rank opportunities by profitability
        updateStatus('📊 Applying budget filter and ranking opportunities...', 'info');

        // Get selected budget range
        const budgetRangeSelect = document.getElementById('budgetRange');
        const selectedBudgetRange = budgetRangeSelect ? budgetRangeSelect.value : 'all';

        // Apply budget filtering if needed
        let filteredOpportunities = allOpportunities;
        if (selectedBudgetRange !== 'all') {
            console.log(`🎯 Applying budget filter: ${selectedBudgetRange}`);
            filteredOpportunities = allOpportunities.filter(opp =>
                matchesBudgetRange(opp, opp.starting_currency_id, selectedBudgetRange)
            );
            console.log(`📊 Budget filtering: ${allOpportunities.length} → ${filteredOpportunities.length} opportunities`);
        }

        // Sort by profit percentage
        filteredOpportunities.sort((a, b) => b.profit_percentage - a.profit_percentage);

        // Take top opportunities across all currencies
        const topOpportunities = filteredOpportunities.slice(0, 20); // Show top 20 regardless of starting currency
        
        const filteredCount = filteredOpportunities.length;
        const totalCount = allOpportunities.length;

        const successStatus = failedCurrencies.length > 0 ?
            `✅ Found ${totalCount} opportunities from ${processedCount} currencies (${failedCurrencies.length} failed), ${selectedBudgetRange !== 'all' ? `${filteredCount} match ${selectedBudgetRange} budget` : 'showing top 20'}` :
            `✅ Found ${totalCount} opportunities from all ${processedCount} currencies${selectedBudgetRange !== 'all' ? `, ${filteredCount} match ${selectedBudgetRange} budget` : ', showing top 20'}`;

        updateStatus(successStatus, 'success');
        
        // Create a special display for all-trades mode
        displayAllTradesResults(topOpportunities, filteredCount);
        
    } catch (error) {
        console.error('❌ All trades calculation failed:', error);
        updateStatus(`All trades calculation failed: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Display arbitrage results in the UI
 */
function displayArbitrageResults(data, defaultTradeAmount, startingCurrencyId) {
    if (!data.opportunities || data.opportunities.length === 0) {
        updateStatus('No profitable opportunities found with current parameters', 'warning');
        return;
    }
    
    const currencyName = availableCurrencies.find(c => c.id === data.starting_currency)?.name || data.starting_currency;
    
    // Create results HTML
    let html = `
        <div class="results-header">
            <h3>🏆 Arbitrage Opportunities for ${currencyName}</h3>
            <div class="summary-stats">
                <div class="stat">
                    <span class="stat-label">Base Amount:</span>
                    <span class="stat-value">📊 ${defaultTradeAmount} ${currencyName} (auto-scaled)</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Best Profit:</span>
                    <span class="stat-value profit-positive">${isFinite(data.summary.best_profit_percentage) ? data.summary.best_profit_percentage.toFixed(2) : '0.00'}%</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Average Profit:</span>
                    <span class="stat-value">${isFinite(data.summary.average_profit_percentage) ? data.summary.average_profit_percentage.toFixed(2) : '0.00'}%</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Data Source:</span>
                    <span class="stat-value">${data.data_source.source}</span>
                </div>
            </div>
        </div>
        
        <div class="opportunities">
    `;
    
    // Calculate multi-scale opportunities for each possibility
    const multiScaleOpportunities = [];
    
    data.opportunities.forEach((opportunity, index) => {
        const scaleResults = calculateMultiScaleTradingSteps(opportunity, data.starting_currency);
        
        // Only include opportunities that have at least one profitable scale
        if (scaleResults.length > 0) {
            multiScaleOpportunities.push({
                originalOpportunity: opportunity,
                scales: scaleResults,
                pathDescription: opportunity.path_description
            });
        }
    });
    
    // If no profitable opportunities remain after filtering, show appropriate message
    if (multiScaleOpportunities.length === 0) {
        updateStatus('No opportunities remain profitable with realistic trading constraints', 'warning');
        resultsContainer.innerHTML = `
            <div class="no-results">
                <h3>⚠️ No Profitable Opportunities Found</h3>
                <p>While some theoretical opportunities exist, none remain profitable when using realistic trading amounts with integer constraints.</p>
                <p><strong>Suggestions:</strong></p>
                <ul>
                    <li>Try a different starting currency with better liquidity</li>
                    <li>Lower the minimum profit threshold</li>
                    <li>Increase your trade amount for better scaling</li>
                </ul>
            </div>
        `;
        return;
    }
    
    // Calculate total available scales across all opportunities
    const totalScales = multiScaleOpportunities.reduce((sum, opp) => sum + opp.scales.length, 0);
    
    // Update status with multi-scale count
    updateStatus(
        `Found ${multiScaleOpportunities.length} opportunities with ${totalScales} investment options`,
        'success'
    );
    
    multiScaleOpportunities.forEach((opportunityGroup, groupIndex) => {
        const bestScale = opportunityGroup.scales.reduce((best, scale) => 
            scale.profitPercent > best.profitPercent ? scale : best
        );
        
        const profitClass = bestScale.profitPercent > 200 ? 'high-profit' : 
                           bestScale.profitPercent > 100 ? 'medium-profit' : 'low-profit';
        
        html += `
            <div class="opportunity-group ${profitClass}">
                <div class="opportunity-group-header">
                    <span class="opportunity-rank">#${groupIndex + 1}</span>
                    <span class="opportunity-path-desc">${opportunityGroup.pathDescription}</span>
                    <span class="best-profit">Best: ${bestScale.profitPercent.toFixed(1)}% profit</span>
                </div>
                
                <div class="multi-scale-container">
        `;
        
        // Sort scales by tier (starter, moderate, advanced)
        const sortedScales = opportunityGroup.scales.sort((a, b) => {
            const order = { starter: 0, moderate: 1, advanced: 2 };
            return order[a.scale] - order[b.scale];
        });
        
        sortedScales.forEach((scale, scaleIndex) => {
            const scaleClass = scale.scale === 'starter' ? 'scale-starter' : 
                              scale.scale === 'moderate' ? 'scale-moderate' : 'scale-advanced';
            
            html += `
                <div class="scale-option ${scaleClass}">
                    <div class="scale-header">
                        <span class="scale-tier">${scale.scaleInfo.name}</span>
                        <span class="scale-desc">${scale.scaleInfo.description}</span>
                        <span class="scale-budget">${scale.scaleInfo.budgetNote}</span>
                    </div>
                    
                    <div class="scale-results">
                        <div class="scale-trade">
                            <strong>${scale.startingAmount} → ${scale.finalAmount} ${currencyName}</strong>
                            <span class="scale-profit">(+${scale.profit} profit, +${scale.profitPercent.toFixed(1)}%)</span>
                        </div>
                        
                        <div class="scale-steps">
            `;
            
            scale.steps.forEach((step, stepIndex) => {
                html += `
                    <div class="scale-step">
                        <span class="step-number">${stepIndex + 1}.</span>
                        <span class="step-trade">${step.amountBefore} ${step.fromName} → ${step.amountAfter} ${step.toName}</span>
                        <span class="step-rate">(${step.actualRate})</span>
                    </div>
                `;
            });
            
            html += `
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    
    resultsContainer.innerHTML = html;
    
    // Update last update time
    lastUpdate = new Date();
    console.log(`✅ Displayed ${data.opportunities.length} arbitrage opportunities`);
}

/**
 * Display all trades results across multiple currencies
 */
function displayAllTradesResults(opportunities, totalCount) {
    if (!opportunities || opportunities.length === 0) {
        updateStatus('No profitable opportunities found across all currencies', 'warning');
        return;
    }
    
    // Get selected budget range
    const budgetRangeSelect = document.getElementById('budgetRange');
    const selectedBudgetRange = budgetRangeSelect ? budgetRangeSelect.value : 'all';
    
    // Since budget filtering is already applied in calculateAllTrades, all opportunities should be valid
    if (!opportunities || opportunities.length === 0) {
        updateStatus('No profitable opportunities found with current parameters', 'warning');
        return;
    }
    
    // Create results HTML for cross-currency display
    const budgetFilterDisplay = selectedBudgetRange !== 'all' ? 
        ` (${selectedBudgetRange} budget)` : '';
    
    // Get the best opportunity for summary stats
    const bestOpportunity = opportunities[0]; // Highest profit as sorted
    
    let html = `
        <div class="results-header">
            <h3>🏆 All Trades Ranked by Profit${budgetFilterDisplay}</h3>
            <div class="summary-stats">
                <div class="stat">
                    <span class="stat-label">Opportunities Found:</span>
                    <span class="stat-value">📊 ${totalCount} total (showing ${opportunities.length}${budgetFilterDisplay})</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Best Profit:</span>
                    <span class="stat-value profit-positive">${bestOpportunity.profit_percentage.toFixed(2)}%</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Starting From:</span>
                    <span class="stat-value">${bestOpportunity.starting_currency_name}</span>
                </div>
                <div class="stat">
                    <span class="stat-label">Budget Range:</span>
                    <span class="stat-value">${selectedBudgetRange === 'all' ? 'All Levels' : selectedBudgetRange.charAt(0).toUpperCase() + selectedBudgetRange.slice(1)}</span>
                </div>
            </div>
        </div>
        
        <div class="opportunities all-trades-mode">
    `;
    
    let displayRank = 1; // Separate counter for actual displayed rank
    
    opportunities.forEach((opportunity, index) => {
        // Calculate the best scale for this opportunity  
        const analysis = getBudgetAnalysis(opportunity, opportunity.starting_currency_id);

        // Skip opportunities that don't have profitable scales
        if (analysis.length === 0) return;

        // Determine preferred category order for display selection
        const preferredCategories = selectedBudgetRange === 'all'
            ? BUDGET_CATEGORY_ORDER
            : [selectedBudgetRange, ...BUDGET_CATEGORY_ORDER.filter(cat => cat !== selectedBudgetRange)];

        const selected = analysis.find(entry => selectedBudgetRange === 'all' || entry.category === selectedBudgetRange) || analysis[0];
        const selectedScale = selected.scale;
        
        const profitClass = selectedScale.profitPercent > 3 ? 'high-profit' : 
                           selectedScale.profitPercent > 1.5 ? 'medium-profit' : 'low-profit';
        
        const scaleCategoryLabel = selected.category.charAt(0).toUpperCase() + selected.category.slice(1);

        html += `
            <div class="cross-currency-opportunity ${profitClass}">
                <div class="opportunity-header">
                    <div class="opportunity-rank">#${displayRank}</div>
                    <div class="opportunity-currency">
                        <span class="currency-name">${opportunity.starting_currency_name}</span>
                        <span class="base-amount">(${opportunity.default_amount} base)</span>
                    </div>
                    <div class="opportunity-profit">
                        <span class="profit-percentage">+${selectedScale.profitPercent.toFixed(1)}%</span>
                        <span class="profit-amount">+${selectedScale.profit} profit</span>
                    </div>
                </div>
                
                <div class="opportunity-path">
                    <span class="path-description">${opportunity.path_description}</span>
                </div>
                
                <div class="best-trade-example">
                    <div class="trade-scale">
                        <span class="scale-tier">${selectedScale.scaleInfo.name}</span>
                        <span class="scale-budget">${selectedScale.scaleInfo.budgetNote} • ${scaleCategoryLabel} budget</span>
                    </div>
                    
                    <div class="trade-result">
                        <strong>${selectedScale.startingAmount} → ${selectedScale.finalAmount} ${opportunity.starting_currency_name}</strong>
                    </div>
                    
                    <div class="trade-steps">
        `;
        
        selectedScale.steps.forEach((step, stepIndex) => {
            html += `
                <div class="trade-step">
                    <span class="step-number">${stepIndex + 1}.</span>
                    <span class="step-trade">${step.amountBefore} ${step.fromName} → ${step.amountAfter} ${step.toName}</span>
                    <span class="step-rate">(${step.actualRate})</span>
                </div>
            `;
        });
        
        html += `
                    </div>
                </div>
            </div>
        `;
        
        displayRank++; // Increment only when we actually display an opportunity
    });
    
    html += '</div>';
    
    resultsContainer.innerHTML = html;
    
    // Update last update time
    lastUpdate = new Date();
    console.log(`✅ Displayed ${opportunities.length} cross-currency arbitrage opportunities from ${totalCount} total`);
}

/**
 * Update status message
 */
function updateStatus(message, type = 'info') {
    if (!statusContainer) return;
    
    statusContainer.className = `status ${type}`;
    statusContainer.textContent = message;
    
    console.log(`📊 Status [${type}]: ${message}`);
}

/**
 * Show/hide loading indicator
 */
function showLoading(show) {
    if (loadingIndicator) {
        loadingIndicator.style.display = show ? 'block' : 'none';
    }
    
    const calculateButton = document.getElementById('calculateButton');
    if (calculateButton) {
        calculateButton.disabled = show;
        calculateButton.textContent = show ? '🔄 Calculating...' : '🚀 Calculate Arbitrage Opportunities';
    }
    
    const refreshButton = document.getElementById('refreshDataButton');
    if (refreshButton && !refreshButton.textContent.includes('Refreshing')) {
        // Only disable if it's not already in refreshing state
        refreshButton.disabled = show;
    }
}

/**
 * Clear results
 */
function clearResults() {
    if (resultsContainer) {
        resultsContainer.innerHTML = '';
    }
}

/**
 * Initialize app when DOM is ready
 */
document.addEventListener('DOMContentLoaded', initializeApp);

// Export for debugging
window.PoE2Arbitrage = {
    loadCurrencies,
    calculateArbitrage,
    forceRefreshData,
    availableCurrencies: () => availableCurrencies,
    currentRates: () => currentRates
};

console.log('📦 PoE2 Arbitrage Calculator Frontend loaded');
