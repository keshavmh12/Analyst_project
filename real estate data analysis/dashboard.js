// Store global chart instances to destroy and recreate on updates
let charts = {};

// Main data storage
let allData = [];
let filteredData = [];

// Tab View state
let activeView = 'overview';

// Properties Tab Page State
let propCurrentPage = 1;
const propPageSize = 10;
let propSearchQuery = '';

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    setupEventListeners();
});

// Fetch Cleaned JSON Data
async function fetchData() {
    try {
        const response = await fetch('real_estate_data.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        allData = await response.json();
        filteredData = [...allData];
        
        // Populate slicer dropdowns
        populateSlicers();
        
        // Initial rendering
        updateDashboard();
        
        // Populate Estimator dropdowns initially
        populateEstimatorSelectors();
    } catch (error) {
        console.error('Error fetching real estate data:', error);
        alert('Failed to load dataset. Please make sure the JSON file exists and the server is running.');
    }
}

// Set up event listeners for filters, tabs, search, estimators, and reports
function setupEventListeners() {
    // Slicer inputs
    const slicerCity = document.getElementById('slicer-city');
    const slicerType = document.getElementById('slicer-type');
    const slicerBeds = document.getElementById('slicer-beds');
    const slicerPrice = document.getElementById('slicer-price');
    const clearBtn = document.getElementById('clear-filters-btn');

    slicerCity.addEventListener('change', () => { applyFilters(); resetPropertiesPage(); });
    slicerType.addEventListener('change', () => { applyFilters(); resetPropertiesPage(); });
    slicerBeds.addEventListener('change', () => { applyFilters(); resetPropertiesPage(); });
    slicerPrice.addEventListener('change', () => { applyFilters(); resetPropertiesPage(); });
    
    clearBtn.addEventListener('click', () => {
        slicerCity.value = 'all';
        slicerType.value = 'all';
        slicerBeds.value = 'all';
        slicerPrice.value = 'all';
        applyFilters();
        resetPropertiesPage();
    });

    // Navigation Tab Switching
    const navItems = {
        'nav-overview': 'overview',
        'nav-locations': 'locations',
        'nav-properties': 'properties',
        'nav-price': 'price',
        'nav-reports': 'reports'
    };

    Object.keys(navItems).forEach(navId => {
        const elem = document.getElementById(navId);
        if (elem) {
            elem.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Toggle active sidebar link styling
                document.querySelectorAll('.sidebar-nav li').forEach(nav => nav.classList.remove('active'));
                elem.classList.add('active');
                
                // Toggle active view content display
                const viewName = navItems[navId];
                activeView = viewName;
                document.querySelectorAll('.view-content').forEach(view => view.classList.remove('active'));
                
                const targetViewDiv = document.getElementById(`view-${viewName}`);
                if (targetViewDiv) {
                    targetViewDiv.classList.add('active');
                }
                
                // Refresh layout and charts for active view
                updateDashboard();
            });
        }
    });

    // Properties Search and Pagination
    const propSearch = document.getElementById('property-search-input');
    if (propSearch) {
        propSearch.addEventListener('input', (e) => {
            propSearchQuery = e.target.value;
            propCurrentPage = 1;
            updatePropertiesView();
        });
    }

    const btnPrev = document.getElementById('btn-prev-page');
    const btnNext = document.getElementById('btn-next-page');
    if (btnPrev) {
        btnPrev.addEventListener('click', () => {
            if (propCurrentPage > 1) {
                propCurrentPage--;
                updatePropertiesView();
            }
        });
    }
    if (btnNext) {
        btnNext.addEventListener('click', () => {
            const tableData = getTableData();
            const totalPages = Math.ceil(tableData.length / propPageSize) || 1;
            if (propCurrentPage < totalPages) {
                propCurrentPage++;
                updatePropertiesView();
            }
        });
    }

    // Valuation Estimator Button
    const btnEstimate = document.getElementById('btn-estimate');
    if (btnEstimate) {
        btnEstimate.addEventListener('click', runValuationEstimation);
    }

    // Reports Actions
    const btnPrint = document.getElementById('btn-print-report');
    if (btnPrint) {
        btnPrint.addEventListener('click', () => {
            window.print();
        });
    }
    
    const btnExport = document.getElementById('btn-export-csv');
    if (btnExport) {
        btnExport.addEventListener('click', exportFilteredDataToCSV);
    }
}

// Reset properties listing page offset when slicers change
function resetPropertiesPage() {
    propCurrentPage = 1;
    const propSearch = document.getElementById('property-search-input');
    if (propSearch) propSearch.value = '';
    propSearchQuery = '';
}

// Populate filters dynamically based on unique values in dataset
function populateSlicers() {
    const cities = new Set();
    const types = new Set();
    const beds = new Set();

    allData.forEach(item => {
        if (item.city) cities.add(item.city);
        if (item.type) types.add(item.type);
        if (item.beds !== undefined && item.beds !== null) beds.add(item.beds);
    });

    // Sort values
    const sortedCities = Array.from(cities).sort();
    const sortedTypes = Array.from(types).sort();
    const sortedBeds = Array.from(beds).sort((a, b) => a - b);

    // Populate City Select
    const slicerCity = document.getElementById('slicer-city');
    sortedCities.forEach(city => {
        const opt = document.createElement('option');
        opt.value = city;
        opt.textContent = city;
        slicerCity.appendChild(opt);
    });

    // Populate Type Select
    const slicerType = document.getElementById('slicer-type');
    sortedTypes.forEach(type => {
        const opt = document.createElement('option');
        opt.value = type;
        opt.textContent = type;
        slicerType.appendChild(opt);
    });

    // Populate Beds Select
    const slicerBeds = document.getElementById('slicer-beds');
    sortedBeds.forEach(bed => {
        const opt = document.createElement('option');
        opt.value = bed;
        opt.textContent = bed === 0 ? '0 (Land/Plots)' : `${bed} BHK`;
        slicerBeds.appendChild(opt);
    });
}

// Apply Selected Slicer Filters
function applyFilters() {
    const city = document.getElementById('slicer-city').value;
    const type = document.getElementById('slicer-type').value;
    const beds = document.getElementById('slicer-beds').value;
    const priceRange = document.getElementById('slicer-price').value;

    filteredData = allData.filter(item => {
        // 1. City Filter
        if (city !== 'all' && item.city !== city) return false;

        // 2. Type Filter
        if (type !== 'all' && item.type !== type) return false;

        // 3. Beds Filter
        if (beds !== 'all' && item.beds !== parseInt(beds)) return false;

        // 4. Price Filter
        if (priceRange !== 'all') {
            const price = item.price;
            if (price === null || price === undefined) return false;
            
            if (priceRange === 'under-50l' && price >= 5000000) return false;
            if (priceRange === '50l-1cr' && (price < 5000000 || price >= 10000000)) return false;
            if (priceRange === '1cr-2.5cr' && (price < 10000000 || price >= 25000000)) return false;
            if (priceRange === '2.5cr-5cr' && (price < 25000000 || price >= 50000000)) return false;
            if (priceRange === 'over-5cr' && price < 50000000) return false;
        }

        return true;
    });

    updateDashboard();
}

// Global variables for visual styling
const primaryBlue = '#0f2042';
const accentBlue = '#3b82f6';
const accentTeal = '#14b8a6';
const accentGreen = '#10b981';
const accentOrange = '#f97316';
const accentPurple = '#8b5cf6';
const fontColor = '#475569';
const gridColor = '#e2e8f0';

// Main dashboard router updates based on activeView
function updateDashboard() {
    // 1. Always update sidebar/header totals
    const totalCount = filteredData.length;
    document.getElementById('sidebar-total-listings').textContent = formatNumber(totalCount);

    // 2. Route view specific updates
    switch (activeView) {
        case 'overview':
            updateOverviewKPIs();
            updateOverviewCharts();
            updateKeyInsights();
            break;
        case 'locations':
            updateLocationsView();
            break;
        case 'properties':
            updatePropertiesView();
            break;
        case 'price':
            updatePriceView();
            break;
        case 'reports':
            updateReportsView();
            break;
    }
}

// Helpers for formatted values
function formatIndianCurrency(num) {
    if (num === null || num === undefined || isNaN(num)) return 'N/A';
    if (num >= 10000000) {
        return `₹${(num / 10000000).toFixed(2)} Cr`;
    }
    if (num >= 100000) {
        return `₹${(num / 100000).toFixed(2)} L`;
    }
    return `₹${Math.round(num).toLocaleString('en-IN')}`;
}

function formatNumber(num, decimals = 0) {
    if (num === null || num === undefined || isNaN(num)) return 'N/A';
    return num.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function safeDestroyChart(chartKey) {
    if (charts[chartKey]) {
        charts[chartKey].destroy();
        delete charts[chartKey];
    }
}

// =========================================================================
// VIEW 1: OVERVIEW TAB LOGIC
// =========================================================================
function updateOverviewKPIs() {
    const totalCount = filteredData.length;
    document.getElementById('kpi-val-total').textContent = formatNumber(totalCount);

    const prices = filteredData.map(item => item.price).filter(p => p !== null && p !== undefined);
    const avgPrice = prices.length ? (prices.reduce((sum, p) => sum + p, 0) / prices.length) : null;
    document.getElementById('kpi-val-price').textContent = formatIndianCurrency(avgPrice);

    const sizes = filteredData.map(item => item.size).filter(s => s !== null && s !== undefined && s > 0);
    const avgSize = sizes.length ? (sizes.reduce((sum, s) => sum + s, 0) / sizes.length) : null;
    document.getElementById('kpi-val-size').textContent = avgSize ? `${formatNumber(avgSize)} sq. ft.` : 'N/A';

    const beds = filteredData.map(item => item.beds).filter(b => b !== null && b !== undefined);
    const avgBeds = beds.length ? (beds.reduce((sum, b) => sum + b, 0) / beds.length) : null;
    document.getElementById('kpi-val-beds').textContent = avgBeds !== null ? `${avgBeds.toFixed(1)} BHK` : 'N/A';

    const baths = filteredData.map(item => item.baths).filter(b => b !== null && b !== undefined);
    const avgBaths = baths.length ? (baths.reduce((sum, b) => sum + b, 0) / baths.length) : null;
    document.getElementById('kpi-val-baths').textContent = avgBaths !== null ? `${avgBaths.toFixed(1)} Baths` : 'N/A';
}

function updateOverviewCharts() {
    // --- Chart 1: Average Price by City ---
    safeDestroyChart('priceByCity');
    const cityGroups = {};
    filteredData.forEach(item => {
        if (item.city && item.price !== null && item.price !== undefined) {
            if (!cityGroups[item.city]) cityGroups[item.city] = { sum: 0, count: 0 };
            cityGroups[item.city].sum += item.price;
            cityGroups[item.city].count += 1;
        }
    });
    const cityData = Object.keys(cityGroups).map(city => ({
        city: city,
        avgPrice: cityGroups[city].sum / cityGroups[city].count
    })).sort((a, b) => b.avgPrice - a.avgPrice);

    const ctxCity = document.getElementById('chart-price-by-city').getContext('2d');
    charts.priceByCity = new Chart(ctxCity, {
        type: 'bar',
        data: {
            labels: cityData.map(d => d.city),
            datasets: [{
                data: cityData.map(d => Math.round(d.avgPrice / 100000)),
                backgroundColor: 'rgba(59, 130, 246, 0.85)',
                hoverBackgroundColor: 'rgba(29, 78, 216, 0.95)',
                borderRadius: 4,
                barThickness: 16
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `Average Price: ${formatIndianCurrency(context.raw * 100000)}`
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: gridColor },
                    ticks: {
                        color: fontColor,
                        callback: (val) => val >= 100 ? `₹${(val / 100).toFixed(1)} Cr` : `₹${val} L`
                    }
                },
                y: { grid: { display: false }, ticks: { color: fontColor, font: { weight: '500' } } }
            }
        }
    });

    // --- Chart 2: Properties by Type ---
    safeDestroyChart('propertiesByType');
    const typeCounts = {};
    filteredData.forEach(item => {
        if (item.type) typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
    });
    const typeData = Object.keys(typeCounts).map(type => ({
        type: type,
        count: typeCounts[type]
    })).sort((a, b) => b.count - a.count);

    const typeColors = ['#0f2042', '#1d4ed8', '#0d9488', '#10b981', '#ea580c', '#8b5cf6', '#e11d48', '#d97706', '#475569'];
    const ctxType = document.getElementById('chart-properties-by-type').getContext('2d');
    charts.propertiesByType = new Chart(ctxType, {
        type: 'doughnut',
        data: {
            labels: typeData.map(d => d.type),
            datasets: [{
                data: typeData.map(d => d.count),
                backgroundColor: typeColors.slice(0, typeData.length),
                borderWidth: 2,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: fontColor, boxWidth: 10, padding: 8, font: { size: 9 } }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => ` ${context.label}: ${context.raw} (${((context.raw / filteredData.length) * 100).toFixed(1)}%)`
                    }
                }
            },
            cutout: '65%'
        }
    });

    // --- Chart 3: Average Price by Beds ---
    safeDestroyChart('priceByBeds');
    const bedsPriceGroups = {};
    filteredData.forEach(item => {
        if (item.beds !== undefined && item.beds !== null && item.price !== null && item.price !== undefined) {
            if (!bedsPriceGroups[item.beds]) bedsPriceGroups[item.beds] = { sum: 0, count: 0 };
            bedsPriceGroups[item.beds].sum += item.price;
            bedsPriceGroups[item.beds].count += 1;
        }
    });
    const bedsPriceData = Object.keys(bedsPriceGroups).map(bed => ({
        beds: parseInt(bed),
        avgPrice: bedsPriceGroups[bed].sum / bedsPriceGroups[bed].count
    })).sort((a, b) => a.beds - b.beds);

    const ctxBedsPrice = document.getElementById('chart-price-by-beds').getContext('2d');
    charts.priceByBeds = new Chart(ctxBedsPrice, {
        type: 'bar',
        data: {
            labels: bedsPriceData.map(d => d.beds === 0 ? '0 (Land)' : `${d.beds} BHK`),
            datasets: [{
                data: bedsPriceData.map(d => d.avgPrice),
                backgroundColor: 'rgba(20, 184, 166, 0.85)',
                hoverBackgroundColor: 'rgba(13, 148, 136, 0.95)',
                borderRadius: 4,
                barThickness: 20
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (context) => `Average Price: ${formatIndianCurrency(context.raw)}` } }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: fontColor } },
                y: {
                    grid: { color: gridColor },
                    ticks: {
                        color: fontColor,
                        callback: (val) => val >= 10000000 ? `₹${(val / 10000000).toFixed(1)} Cr` : `₹${(val / 100000).toFixed(0)} L`
                    }
                }
            }
        }
    });

    // --- Chart 4: Properties Listed Over Time ---
    safeDestroyChart('listedOverTime');
    const monthGroups = {};
    filteredData.forEach(item => {
        if (item.date) {
            const yyyymm = item.date.substring(0, 7);
            monthGroups[yyyymm] = (monthGroups[yyyymm] || 0) + 1;
        }
    });
    const sortedMonths = Object.keys(monthGroups).sort();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthLabels = sortedMonths.map(m => {
        const [year, month] = m.split('-');
        return `${monthNames[parseInt(month) - 1]} ${year}`;
    });

    const ctxTime = document.getElementById('chart-listed-over-time').getContext('2d');
    charts.listedOverTime = new Chart(ctxTime, {
        type: 'line',
        data: {
            labels: monthLabels,
            datasets: [{
                data: sortedMonths.map(m => monthGroups[m]),
                borderColor: accentBlue,
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 3,
                tension: 0.35,
                fill: true,
                pointBackgroundColor: accentBlue,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (context) => `Listings: ${context.raw}` } }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: fontColor } },
                y: { grid: { color: gridColor }, ticks: { color: fontColor, precision: 0 } }
            }
        }
    });

    // --- Chart 5: Top 10 Neighborhoods by Listings ---
    safeDestroyChart('topNeighborhoods');
    const neighCounts = {};
    filteredData.forEach(item => {
        if (item.neighborhood) neighCounts[item.neighborhood] = (neighCounts[item.neighborhood] || 0) + 1;
    });
    const neighData = Object.keys(neighCounts).map(n => ({
        name: n, count: neighCounts[n]
    })).sort((a, b) => b.count - a.count).slice(0, 10);

    const ctxNeigh = document.getElementById('chart-top-neighborhoods').getContext('2d');
    charts.topNeighborhoods = new Chart(ctxNeigh, {
        type: 'bar',
        data: {
            labels: neighData.map(d => d.name.length > 25 ? d.name.substring(0, 22) + '...' : d.name),
            datasets: [{
                data: neighData.map(d => d.count),
                backgroundColor: 'rgba(139, 92, 246, 0.85)',
                hoverBackgroundColor: 'rgba(109, 40, 217, 0.95)',
                borderRadius: 4,
                barThickness: 16
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { title: (context) => neighData[context[0].dataIndex].name } }
            },
            scales: {
                x: { grid: { color: gridColor }, ticks: { color: fontColor, precision: 0 } },
                y: { grid: { display: false }, ticks: { color: fontColor, font: { size: 10, weight: '500' } } }
            }
        }
    });

    // --- Chart 6: Price vs Size (Scatter) ---
    safeDestroyChart('priceVsSize');
    const scatterPoints = filteredData
        .filter(item => item.size > 0 && item.price > 0)
        .map(item => ({
            x: item.size,
            y: Math.round(item.price / 100000),
            label: `${item.beds} BHK ${item.type} in ${item.neighborhood}, ${item.city}`
        }));

    const ctxScatter = document.getElementById('chart-price-vs-size').getContext('2d');
    charts.priceVsSize = new Chart(ctxScatter, {
        type: 'scatter',
        data: {
            datasets: [{
                data: scatterPoints,
                backgroundColor: 'rgba(20, 184, 166, 0.65)',
                borderColor: 'rgba(20, 184, 166, 0.9)',
                borderWidth: 1,
                pointRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const pt = context.raw;
                            return [pt.label, `Size: ${formatNumber(pt.x)} sqft`, `Price: ${formatIndianCurrency(pt.y * 100000)}`];
                        }
                    }
                }
            },
            scales: {
                x: { grid: { color: gridColor }, title: { display: true, text: 'Size (Sq. Ft.)', color: fontColor } },
                y: {
                    grid: { color: gridColor },
                    title: { display: true, text: 'Price (₹ Lakhs)', color: fontColor },
                    ticks: { callback: (val) => val >= 100 ? `₹${(val / 100).toFixed(1)} Cr` : `₹${val} L` }
                }
            }
        }
    });

    // --- Chart 7: Beds Distribution ---
    safeDestroyChart('bedsDistribution');
    const bedsCounts = {};
    filteredData.forEach(item => {
        if (item.beds !== undefined && item.beds !== null) bedsCounts[item.beds] = (bedsCounts[item.beds] || 0) + 1;
    });
    const bedsDistData = Object.keys(bedsCounts).map(bed => ({
        beds: parseInt(bed), count: bedsCounts[bed]
    })).sort((a, b) => a.beds - b.beds);

    const ctxBedsDist = document.getElementById('chart-beds-distribution').getContext('2d');
    charts.bedsDistribution = new Chart(ctxBedsDist, {
        type: 'bar',
        data: {
            labels: bedsDistData.map(d => d.beds === 0 ? '0 (Land)' : `${d.beds} BHK`),
            datasets: [{
                data: bedsDistData.map(d => d.count),
                backgroundColor: 'rgba(249, 115, 22, 0.85)',
                hoverBackgroundColor: 'rgba(234, 88, 12, 0.95)',
                borderRadius: 4,
                barThickness: 20
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (context) => `Listings: ${context.raw}` } }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: fontColor } },
                y: { grid: { color: gridColor }, ticks: { color: fontColor, precision: 0 } }
            }
        }
    });
}

function updateKeyInsights() {
    if (filteredData.length === 0) {
        const errorText = "No data under current filters.";
        ['highest-price', 'dominant-type', 'common-beds', 'avg-size', 'top-hub'].forEach(id => {
            const el = document.getElementById(`insight-${id}`);
            if (el) el.textContent = errorText;
        });
        return;
    }

    // 1. Highest Price City
    const cityGroups = {};
    filteredData.forEach(item => {
        if (item.city && item.price) {
            if (!cityGroups[item.city]) cityGroups[item.city] = { sum: 0, count: 0 };
            cityGroups[item.city].sum += item.price;
            cityGroups[item.city].count += 1;
        }
    });
    let highestCity = '', highestCityAvg = 0;
    Object.keys(cityGroups).forEach(city => {
        const avg = cityGroups[city].sum / cityGroups[city].count;
        if (avg > highestCityAvg) { highestCityAvg = avg; highestCity = city; }
    });
    document.getElementById('insight-highest-price').textContent = highestCity 
        ? `${highestCity} leads the market with the highest average property price of ${formatIndianCurrency(highestCityAvg)}.`
        : "N/A";

    // 2. Dominant Type
    const typeCounts = {};
    filteredData.forEach(item => {
        if (item.type) typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
    });
    let dominantType = '', dominantCount = 0;
    Object.keys(typeCounts).forEach(type => {
        if (typeCounts[type] > dominantCount) { dominantCount = typeCounts[type]; dominantType = type; }
    });
    const typePercent = ((dominantCount / filteredData.length) * 100).toFixed(1);
    document.getElementById('insight-dominant-type').textContent = dominantType 
        ? `${dominantType}s represent the largest market segment, making up ${dominantCount} properties (${typePercent}% of total).`
        : "N/A";

    // 3. Most Common Beds Configuration
    const bedsCounts = {};
    filteredData.forEach(item => {
        if (item.beds !== undefined && item.beds !== null && item.beds > 0) {
            bedsCounts[item.beds] = (bedsCounts[item.beds] || 0) + 1;
        }
    });
    let commonBeds = 0, commonBedsCount = 0;
    Object.keys(bedsCounts).forEach(bed => {
        if (bedsCounts[bed] > commonBedsCount) { commonBedsCount = bedsCounts[bed]; commonBeds = parseInt(bed); }
    });
    const totalRes = Object.values(bedsCounts).reduce((a, b) => a + b, 0);
    const bedsPercent = totalRes > 0 ? ((commonBedsCount / totalRes) * 100).toFixed(1) : 0;
    document.getElementById('insight-common-beds').textContent = commonBeds 
        ? `${commonBeds} BHK is the most common config, representing ${bedsPercent}% of all residential properties.`
        : "N/A";

    // 4. Average Sizing
    const sizes = filteredData.map(item => item.size).filter(s => s > 0);
    const avgSize = sizes.length ? (sizes.reduce((sum, s) => sum + s, 0) / sizes.length) : 0;
    const typeSizes = {};
    filteredData.forEach(item => {
        if (item.type && item.size > 0) {
            if (!typeSizes[item.type]) typeSizes[item.type] = { sum: 0, count: 0 };
            typeSizes[item.type].sum += item.size;
            typeSizes[item.type].count += 1;
        }
    });
    let largestType = '', largestAvgSize = 0;
    Object.keys(typeSizes).forEach(type => {
        const avg = typeSizes[type].sum / typeSizes[type].count;
        if (avg > largestAvgSize) { largestAvgSize = avg; largestType = type; }
    });
    document.getElementById('insight-avg-size').textContent = avgSize > 0
        ? `The average listing footprint is ${formatNumber(avgSize)} Sq. Ft., with ${largestType}s offering the largest averages (${formatNumber(largestAvgSize)} Sq. Ft.).`
        : "N/A";

    // 5. Active Hub
    const cityListings = {};
    filteredData.forEach(item => {
        if (item.city) cityListings[item.city] = (cityListings[item.city] || 0) + 1;
    });
    let topHub = '', hubCount = 0;
    Object.keys(cityListings).forEach(city => {
        if (cityListings[city] > hubCount) { hubCount = cityListings[city]; topHub = city; }
    });
    document.getElementById('insight-top-hub').textContent = topHub 
        ? `${topHub} is the most active hub on the portal with ${hubCount} live listings.`
        : "N/A";
}

// =========================================================================
// VIEW 2: LOCATIONS VIEW LOGIC
// =========================================================================
function updateLocationsView() {
    // 1. KPI calculations
    const cities = new Set(filteredData.map(item => item.city).filter(Boolean));
    const neighborhoods = new Set(filteredData.map(item => item.neighborhood).filter(Boolean));
    
    document.getElementById('kpi-loc-cities').textContent = formatNumber(cities.size);
    document.getElementById('kpi-loc-neighborhoods').textContent = formatNumber(neighborhoods.size);

    // Group for average pricing per city
    const cityGroups = {};
    filteredData.forEach(item => {
        if (item.city && item.price !== null && item.price !== undefined) {
            if (!cityGroups[item.city]) cityGroups[item.city] = { sum: 0, count: 0 };
            cityGroups[item.city].sum += item.price;
            cityGroups[item.city].count += 1;
        }
    });
    let highestCity = '', highestAvg = 0;
    Object.keys(cityGroups).forEach(city => {
        const avg = cityGroups[city].sum / cityGroups[city].count;
        if (avg > highestAvg) { highestAvg = avg; highestCity = city; }
    });
    document.getElementById('kpi-loc-expensive').textContent = highestCity ? `${highestCity}` : 'N/A';

    // 2. Location Summary Table data prep
    const tableBody = document.querySelector('#location-summary-table tbody');
    tableBody.innerHTML = '';

    const summaryGroups = {};
    filteredData.forEach(item => {
        if (item.city) {
            if (!summaryGroups[item.city]) {
                summaryGroups[item.city] = { count: 0, priceSum: 0, priceCount: 0, sizeSum: 0, sizeCount: 0 };
            }
            const group = summaryGroups[item.city];
            group.count += 1;
            if (item.price > 0) { group.priceSum += item.price; group.priceCount += 1; }
            if (item.size > 0) { group.sizeSum += item.size; group.sizeCount += 1; }
        }
    });

    const summaryRows = Object.keys(summaryGroups).map(city => {
        const g = summaryGroups[city];
        const avgPrice = g.priceCount > 0 ? (g.priceSum / g.priceCount) : null;
        const avgSize = g.sizeCount > 0 ? (g.sizeSum / g.sizeCount) : null;
        const pricePerSqft = (avgPrice && avgSize) ? (g.priceSum / g.sizeSum) : null; // average rate
        
        return { city, count: g.count, avgPrice, avgSize, pricePerSqft };
    }).sort((a, b) => b.count - a.count);

    summaryRows.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:600;">${row.city}</td>
            <td>${formatNumber(row.count)}</td>
            <td>${formatIndianCurrency(row.avgPrice)}</td>
            <td>${row.avgSize ? `${formatNumber(row.avgSize)} sqft` : 'N/A'}</td>
            <td style="font-weight:600; color:var(--accent-teal);">${row.pricePerSqft ? `${formatIndianCurrency(row.pricePerSqft)}/sqft` : 'N/A'}</td>
        `;
        tableBody.appendChild(tr);
    });

    // 3. Price per Sqft by City Chart
    safeDestroyChart('pricePerSqftCity');
    
    // Sort cities for the chart
    const chartCities = summaryRows.filter(r => r.pricePerSqft > 0).sort((a, b) => b.pricePerSqft - a.pricePerSqft);
    
    const ctxLocChart = document.getElementById('chart-price-per-sqft-city').getContext('2d');
    charts.pricePerSqftCity = new Chart(ctxLocChart, {
        type: 'bar',
        data: {
            labels: chartCities.map(c => c.city),
            datasets: [{
                data: chartCities.map(c => c.pricePerSqft),
                backgroundColor: 'rgba(139, 92, 246, 0.85)',
                hoverBackgroundColor: 'rgba(109, 40, 217, 0.95)',
                borderRadius: 4,
                barThickness: 20
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (context) => `Avg Rate: ${formatIndianCurrency(context.raw)}/sq. ft.` } }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: fontColor } },
                y: { grid: { color: gridColor }, ticks: { color: fontColor, callback: (val) => `₹${val.toLocaleString()}` } }
            }
        }
    });
}

// =========================================================================
// VIEW 3: PROPERTIES DIRECTORY TABLE LOGIC
// =========================================================================
function getTableData() {
    if (propSearchQuery.trim() === '') return filteredData;
    const query = propSearchQuery.toLowerCase();
    return filteredData.filter(item => {
        return (item.city && item.city.toLowerCase().includes(query)) ||
               (item.neighborhood && item.neighborhood.toLowerCase().includes(query)) ||
               (item.type && item.type.toLowerCase().includes(query));
    });
}

function updatePropertiesView() {
    const tableData = getTableData();
    const tableBody = document.querySelector('#properties-directory-table tbody');
    tableBody.innerHTML = '';

    // Update count badge
    document.getElementById('table-total-badge').textContent = `${tableData.length} Properties`;

    // Pagination metrics
    const totalPages = Math.ceil(tableData.length / propPageSize) || 1;
    if (propCurrentPage > totalPages) propCurrentPage = totalPages;
    
    document.getElementById('pagination-info').textContent = `Page ${propCurrentPage} of ${totalPages}`;
    document.getElementById('btn-prev-page').disabled = propCurrentPage === 1;
    document.getElementById('btn-next-page').disabled = propCurrentPage === totalPages;

    // Slice data
    const startIdx = (propCurrentPage - 1) * propPageSize;
    const paginatedItems = tableData.slice(startIdx, startIdx + propPageSize);

    if (paginatedItems.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 24px; color:var(--text-secondary);">No properties match your filter selections or search criteria.</td></tr>';
        return;
    }

    paginatedItems.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.city}</td>
            <td style="font-weight:500;">${item.neighborhood}</td>
            <td><span class="total-badge" style="background-color:#f1f5f9; color:#475569; padding: 3px 8px;">${item.type}</span></td>
            <td>${item.beds === 0 ? 'Land' : `${item.beds} BHK`}</td>
            <td>${item.baths !== null && item.baths !== undefined ? `${item.baths} Baths` : 'N/A'}</td>
            <td>${item.size ? `${formatNumber(item.size)} sqft` : 'N/A'}</td>
            <td style="font-weight:700; color:var(--accent-blue);">${formatIndianCurrency(item.price)}</td>
        `;
        tableBody.appendChild(tr);
    });
}

// =========================================================================
// VIEW 4: PRICE ANALYSIS VIEW LOGIC
// =========================================================================
function updatePriceView() {
    // 1. KPI Calculations
    const validRateItems = filteredData.filter(item => item.price > 0 && item.size > 0);
    const avgRate = validRateItems.length 
        ? (validRateItems.reduce((sum, item) => sum + item.price, 0) / validRateItems.reduce((sum, item) => sum + item.size, 0))
        : null;
    document.getElementById('kpi-price-avg-sqft').textContent = avgRate ? `${formatIndianCurrency(avgRate)}/sqft` : 'N/A';

    const prices = filteredData.map(item => item.price).filter(p => p > 0);
    const minPrice = prices.length ? Math.min(...prices) : null;
    const maxPrice = prices.length ? Math.max(...prices) : null;

    document.getElementById('kpi-price-min').textContent = formatIndianCurrency(minPrice);
    document.getElementById('kpi-price-max').textContent = formatIndianCurrency(maxPrice);

    // 2. Average Price per Sqft by Type Chart
    safeDestroyChart('pricePerSqftType');

    const typeRateGroups = {};
    filteredData.forEach(item => {
        if (item.type && item.price > 0 && item.size > 0) {
            if (!typeRateGroups[item.type]) typeRateGroups[item.type] = { priceSum: 0, sizeSum: 0 };
            typeRateGroups[item.type].priceSum += item.price;
            typeRateGroups[item.type].sizeSum += item.size;
        }
    });

    const typeRateData = Object.keys(typeRateGroups).map(type => ({
        type: type,
        rate: typeRateGroups[type].priceSum / typeRateGroups[type].sizeSum
    })).sort((a, b) => b.rate - a.rate);

    const ctxTypeRate = document.getElementById('chart-price-per-sqft-type').getContext('2d');
    charts.pricePerSqftType = new Chart(ctxTypeRate, {
        type: 'bar',
        data: {
            labels: typeRateData.map(d => d.type),
            datasets: [{
                data: typeRateData.map(d => d.rate),
                backgroundColor: 'rgba(20, 184, 166, 0.85)',
                hoverBackgroundColor: 'rgba(13, 148, 136, 0.95)',
                borderRadius: 4,
                barThickness: 20
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (context) => `Avg Rate: ${formatIndianCurrency(context.raw)}/sq. ft.` } }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: fontColor } },
                y: { grid: { color: gridColor }, ticks: { color: fontColor, callback: (val) => `₹${val.toLocaleString()}` } }
            }
        }
    });

    // Estimator selects are dynamically re-synced if needed
}

// Valuation estimator forms dynamic dropdown fillers
function populateEstimatorSelectors() {
    const cities = Array.from(new Set(allData.map(item => item.city).filter(Boolean))).sort();
    const types = Array.from(new Set(allData.map(item => item.type).filter(Boolean))).sort();
    const beds = Array.from(new Set(allData.map(item => item.beds).filter(item => item !== undefined && item !== null))).sort((a, b) => a - b);

    const estCity = document.getElementById('est-city');
    const estType = document.getElementById('est-type');
    const estBeds = document.getElementById('est-beds');

    if (!estCity) return; // verify existence

    cities.forEach(city => {
        const opt = document.createElement('option');
        opt.value = city; opt.textContent = city;
        estCity.appendChild(opt);
    });

    types.forEach(type => {
        const opt = document.createElement('option');
        opt.value = type; opt.textContent = type;
        estType.appendChild(opt);
    });

    beds.forEach(bed => {
        const opt = document.createElement('option');
        opt.value = bed;
        opt.textContent = bed === 0 ? '0 (Land/Plots)' : `${bed} BHK`;
        estBeds.appendChild(opt);
    });
}

// Valuation calculator engine
function runValuationEstimation() {
    const city = document.getElementById('est-city').value;
    const type = document.getElementById('est-type').value;
    const beds = parseInt(document.getElementById('est-beds').value);
    const size = parseFloat(document.getElementById('est-size').value);

    const resultDiv = document.getElementById('estimation-result');
    const resultPrice = document.getElementById('est-result-price');
    const resultRate = document.getElementById('est-result-rate');
    const resultConf = document.getElementById('est-result-confidence');

    if (isNaN(size) || size <= 0) {
        alert('Please enter a valid sizing area in square feet.');
        return;
    }

    // Valuation Algorithmic Cascades
    // Priority 1: Exact matches for City + Type + Beds
    let matches = allData.filter(item => item.city === city && item.type === type && item.beds === beds && item.price > 0 && item.size > 0);
    let confidence = 'High confidence (based on config matches)';

    // Priority 2: Fallback to City + Type
    if (matches.length < 3) {
        matches = allData.filter(item => item.city === city && item.type === type && item.price > 0 && item.size > 0);
        confidence = 'Medium confidence (based on city property-type average)';
    }

    // Priority 3: Fallback to City-wide average
    if (matches.length < 3) {
        matches = allData.filter(item => item.city === city && item.price > 0 && item.size > 0);
        confidence = 'Low confidence (based on general city averages)';
    }

    // Priority 4: Global type average
    if (matches.length === 0) {
        matches = allData.filter(item => item.type === type && item.price > 0 && item.size > 0);
        confidence = 'Low confidence (based on national property type averages)';
    }

    if (matches.length === 0) {
        resultPrice.textContent = 'Estimation Unavailable';
        resultRate.textContent = 'No matching reference data found.';
        resultConf.textContent = '';
        resultDiv.style.display = 'block';
        return;
    }

    // Calculate average price per square foot
    const totalP = matches.reduce((sum, item) => sum + item.price, 0);
    const totalS = matches.reduce((sum, item) => sum + item.size, 0);
    const avgRate = totalP / totalS;

    const estimatedValue = avgRate * size;

    resultPrice.textContent = formatIndianCurrency(estimatedValue);
    resultRate.textContent = `Estimated Rate: ${formatIndianCurrency(avgRate)}/sq. ft.`;
    resultConf.textContent = `${confidence} - Calculated from ${matches.length} listings.`;
    resultDiv.style.display = 'block';
}

// =========================================================================
// VIEW 5: EXECUTIVE REPORTS VIEW LOGIC
// =========================================================================
function updateReportsView() {
    // Populate Date
    const today = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('report-generation-date').textContent = `Report Generated on: ${today.toLocaleDateString('en-US', options)}`;

    // Calculate core metrics
    const totalCount = filteredData.length;
    document.getElementById('rep-val-total').textContent = formatNumber(totalCount);

    const prices = filteredData.map(item => item.price).filter(p => p > 0);
    const avgPrice = prices.length ? (prices.reduce((sum, p) => sum + p, 0) / prices.length) : null;
    document.getElementById('rep-val-price').textContent = formatIndianCurrency(avgPrice);

    const sizes = filteredData.map(item => item.size).filter(s => s > 0);
    const avgSize = sizes.length ? (sizes.reduce((sum, s) => sum + s, 0) / sizes.length) : null;
    document.getElementById('rep-val-size').textContent = avgSize ? `${formatNumber(avgSize)} Sq. Ft.` : 'N/A';

    const validRateItems = filteredData.filter(item => item.price > 0 && item.size > 0);
    const avgRate = validRateItems.length ? (validRateItems.reduce((sum, item) => sum + item.price, 0) / validRateItems.reduce((sum, item) => sum + item.size, 0)) : null;
    document.getElementById('rep-val-price-sqft').textContent = avgRate ? `${formatIndianCurrency(avgRate)}/Sq. Ft.` : 'N/A';

    // Populate Report Summary table breakdown
    const tableBody = document.querySelector('#report-breakdown-table tbody');
    tableBody.innerHTML = '';

    const summaryGroups = {};
    filteredData.forEach(item => {
        if (item.city) {
            if (!summaryGroups[item.city]) {
                summaryGroups[item.city] = { count: 0, priceSum: 0, priceCount: 0, sizeSum: 0, sizeCount: 0 };
            }
            const group = summaryGroups[item.city];
            group.count += 1;
            if (item.price > 0) { group.priceSum += item.price; group.priceCount += 1; }
            if (item.size > 0) { group.sizeSum += item.size; group.sizeCount += 1; }
        }
    });

    const summaryRows = Object.keys(summaryGroups).map(city => {
        const g = summaryGroups[city];
        const avgP = g.priceCount > 0 ? (g.priceSum / g.priceCount) : null;
        const avgS = g.sizeCount > 0 ? (g.sizeSum / g.sizeCount) : null;
        const rate = (avgP && avgS) ? (g.priceSum / g.sizeSum) : null;
        return { city, count: g.count, avgPrice: avgP, avgSize: avgS, rate };
    }).sort((a, b) => b.count - a.count);

    if (summaryRows.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:16px;">No locations found.</td></tr>';
        return;
    }

    summaryRows.forEach(row => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:600;">${row.city}</td>
            <td>${formatNumber(row.count)}</td>
            <td>${formatIndianCurrency(row.avgPrice)}</td>
            <td>${row.avgSize ? `${formatNumber(row.avgSize)}` : 'N/A'}</td>
            <td style="font-weight:600;">${row.rate ? `${formatIndianCurrency(row.rate)}` : 'N/A'}</td>
        `;
        tableBody.appendChild(tr);
    });
}

// Client-side CSV generator and downloader
function exportFilteredDataToCSV() {
    if (filteredData.length === 0) {
        alert('No data available to export.');
        return;
    }

    // Headers
    const headers = ['City', 'Neighborhood', 'Property Type', 'Beds (BHK)', 'Baths', 'Size (Sq. Ft.)', 'Price (INR)', 'Listing Date'];
    
    // Rows
    const csvRows = [headers.join(',')];
    
    filteredData.forEach(item => {
        const row = [
            `"${item.city || ''}"`,
            `"${item.neighborhood || ''}"`,
            `"${item.type || ''}"`,
            item.beds,
            item.baths !== null && item.baths !== undefined ? item.baths : '',
            item.size || '',
            item.price || '',
            `"${item.date || ''}"`
        ];
        csvRows.push(row.join(','));
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    
    const todayStr = new Date().toISOString().slice(0, 10);
    link.setAttribute("download", `RealEstate_Market_Report_${todayStr}.csv`);
    document.body.appendChild(link); // Required for FF
    
    link.click();
    document.body.removeChild(link);
}
