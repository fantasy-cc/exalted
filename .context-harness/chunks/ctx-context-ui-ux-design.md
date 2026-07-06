# 🎨 UI/UX DESIGN


### Design Philosophy

- **Dark theme**: Matches Path of Exile's aesthetic
- **Gold accents**: Uses PoE's signature color (#d4af37)
- **Clear hierarchy**: Important information (profit %) prominently displayed
- **Mobile-first**: Responsive design for all screen sizes
- **Loading states**: Smooth animations and status updates

### HTML Structure

#### Main Components

```html
<body>
  <div class="container">
    <!-- Header -->
    <h1>🔥 Path of Exile 2 - Currency Arbitrage Calculator</h1>
    
    <!-- Advanced Settings Panel (Collapsible) -->
    <div class="advanced-settings">
      <div class="settings-header">⚙️ Advanced Settings</div>
      <div class="settings-content">
        <!-- Currency Percentage Slider -->
        <!-- Popularity Metrics Toggle -->
      </div>
    </div>
    
    <!-- Configuration Section -->
    <div class="configuration-section">
      <!-- Trading Mode Selection -->
      <!-- Currency Selection (conditional) -->
      <!-- Budget Range Selection (conditional) -->
      <!-- Minimum Profit Input -->
    </div>
    
    <!-- Action Buttons -->
    <div class="button-container">
      <button id="calculateBtn">Calculate</button>
      <button id="refreshBtn">Refresh Data</button>
    </div>
    
    <!-- Status Display -->
    <div id="status"></div>
    
    <!-- Results Display -->
    <div id="results"></div>
  </div>
</body>
```

### CSS Styling

#### Color Scheme
```css
:root {
  --poe-gold: #d4af37;        /* Signature gold accent */
  --poe-dark: #1a1a1a;        /* Dark background */
  --poe-medium: #2d2d2d;      /* Medium background */
  --poe-light: #404040;       /* Light elements */
  --success-color: #22c55e;   /* Profit indicators */
  --warning-color: #fbbf24;   /* Warnings */
  --error-color: #ef4444;     /* Errors */
}
```

#### Key Design Elements
- **Container**: Max-width 1200px, centered, with padding
- **Cards**: Rounded corners, subtle shadows, dark backgrounds
- **Buttons**: Gold gradient, hover effects, disabled states
- **Results**: Grid layout, color-coded profit indicators
- **Loading**: Spinning animation, smooth transitions
- **Mobile**: Single column, larger touch targets

### User Flow

#### Specific Currency Mode
1. User selects "📍 Specific Currency" trading mode
2. User selects starting currency (defaults to Chaos Orb)
3. User clicks "🚀 Calculate Arbitrage Opportunities"
4. Results display multi-scale opportunities (Starter/Moderate/Advanced) ranked by profitability

#### All Trades Ranked Mode
1. User selects "🏆 All Trades Ranked" trading mode
2. Currency selection automatically hidden (not needed)
3. Budget range selector appears with options
4. User optionally selects budget range to filter opportunities
5. User clicks "🏆 Find All Best Trades"
6. System analyzes ALL currencies in parallel batches
7. Results display opportunities ranked by profit, filtered by budget
8. Each result shows best trading scale and complete path

### Interactive Elements

#### Configuration Controls
- **Currency Percentage Slider**: 10% to 100%, updates in real-time
- **Popularity Metrics Toggle**: Show/hide volume and scores
- **Trading Mode Radio**: Specific Currency vs All Trades Ranked
- **Budget Range Dropdown**: Filter opportunities by investment level
- **Minimum Profit Input**: Decimal input with validation

#### Dynamic Behavior
- **Currency dropdown updates**: When percentage slider changes
- **Conditional visibility**: Currency/budget controls based on mode
- **Loading animations**: Smooth state transitions
- **Status messages**: Real-time feedback on operations
- **Error handling**: Clear error messages with recovery suggestions

### Accessibility

- **Semantic HTML**: Proper heading hierarchy, form labels
- **Keyboard navigation**: All controls accessible via keyboard
- **ARIA labels**: Screen reader support for dynamic content
- **Color contrast**: WCAG AA compliant contrast ratios
- **Focus indicators**: Visible focus states for all interactive elements

---
