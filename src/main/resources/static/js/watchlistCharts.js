// =========================================================
// WATCHLIST CHARTS
// =========================================================

// =========================================================
// TIMEFRAMES
// =========================================================

const TIMEFRAMES = [
    {
        key: "1s",
        label: "1 Second"
    },
    {
        key: "1m",
        label: "1 Minute"
    },
    {
        key: "1h",
        label: "1 Hour"
    },
    {
        key: "1d",
        label: "1 Day"
    },
    {
        key: "1w",
        label: "1 Week"
    },
    {
        key: "1mo",
        label: "1 Month"
    },
    {
        key: "3mo",
        label: "3 Months"
    },
    {
        key: "6mo",
        label: "6 Months"
    },
    {
        key: "1y",
        label: "1 Year"
    }
];


// =========================================================
// STATE
// =========================================================

let chartsViewOpen =
    false;

let selectedChartSymbol =
    null;

let selectedTimeframe =
    "1d";

let chartRequestId =
    0;

let currentCompanies =
    [];

let currentSymbols =
    [];

let liveChartData =
    [];

let liveChartLastPrice =
    null;


// =========================================================
// CHART INSTANCES
// =========================================================

let priceChart =
    null;

let stochasticChart =
    null;

let rsiChart =
    null;

let zScoreChart =
    null;


// =========================================================
// SERIES
// =========================================================

let candlestickSeries =
    null;

let smaSeries =
    null;

let stochasticKSeries =
    null;

let stochasticDSeries =
    null;

let rsiSeries =
    null;

let zScoreSeries =
    null;


// =========================================================
// PUBLIC STATE
// =========================================================

export function isChartsViewOpen() {

    return chartsViewOpen;

}


// =========================================================
// OPEN CHARTS VIEW
// =========================================================

export function openChartsView(
    companies = [],
    symbols = []
) {

    chartsViewOpen =
        true;

    currentCompanies =
        companies;

    currentSymbols =
        [...symbols];

    selectedChartSymbol =
        null;

    selectedTimeframe =
        "1d";

    liveChartData =
        [];

    liveChartLastPrice =
        null;


    document.body.style.overflow =
        "hidden";


    const existing =
        document.getElementById(
            "watchlistChartsOverlay"
        );


    if (existing) {

        existing.remove();

    }


    // =====================================================
    // OVERLAY
    // =====================================================

    const overlay =
        document.createElement(
            "div"
        );


    overlay.id =
        "watchlistChartsOverlay";


    overlay.className =
        "watchlist-charts-overlay";


    // =====================================================
    // TOP BAR
    // =====================================================

    const topBar =
        document.createElement(
            "div"
        );


    topBar.className =
        "watchlist-charts-topbar";


    const backButton =
        document.createElement(
            "button"
        );


    backButton.type =
        "button";


    backButton.className =
        "watchlist-charts-back";


    backButton.textContent =
        "← Back";


    backButton.addEventListener(
        "click",
        closeChartsView
    );


    const title =
        document.createElement(
            "div"
        );


    title.id =
        "watchlistChartTitle";


    title.className =
        "watchlist-chart-title";


    title.textContent =
        "Select a stock";


    topBar.appendChild(
        backButton
    );


    topBar.appendChild(
        title
    );


    // =====================================================
    // MAIN
    // =====================================================

    const main =
        document.createElement(
            "div"
        );


    main.className =
        "watchlist-charts-main";


    // =====================================================
    // LEFT CHART AREA
    // =====================================================

    const chartPanel =
        document.createElement(
            "div"
        );


    chartPanel.className =
        "watchlist-chart-panel";


    // =====================================================
    // TIMEFRAMES
    // =====================================================

    const timeframeBar =
        createTimeframeBar();


    chartPanel.appendChild(
        timeframeBar
    );


    // =====================================================
    // SCROLLABLE CHART AREA
    // =====================================================

    const chartScroll =
        document.createElement(
            "div"
        );


    chartScroll.className =
        "watchlist-chart-scroll";


    // =====================================================
    // PRICE
    // =====================================================

    chartScroll.appendChild(
        createChartSection(
            "Price · SMA 20",
            "watchlistPriceChart",
            "watchlist-price-chart"
        )
    );


    // =====================================================
    // STOCHASTIC
    // =====================================================

    chartScroll.appendChild(
        createChartSection(
            "Stochastic Oscillator (14, 3)",
            "watchlistStochasticChart",
            "watchlist-indicator-chart"
        )
    );


    // =====================================================
    // RSI
    // =====================================================

    chartScroll.appendChild(
        createChartSection(
            "Relative Strength Index · RSI 14",
            "watchlistRsiChart",
            "watchlist-indicator-chart"
        )
    );


    // =====================================================
    // Z SCORE
    // =====================================================

    chartScroll.appendChild(
        createChartSection(
            "Z-Score Probability · 20 Period",
            "watchlistZScoreChart",
            "watchlist-indicator-chart"
        )
    );


    // =====================================================
    // EMPTY STATE
    // =====================================================

    const emptyState =
        document.createElement(
            "div"
        );


    emptyState.id =
        "watchlistChartEmpty";


    emptyState.className =
        "watchlist-chart-empty";


    emptyState.innerHTML = `
        <div class="watchlist-chart-empty-title">
            Select a stock
        </div>

        <div class="watchlist-chart-empty-text">
            Click a symbol from your watchlist
            to view its chart.
        </div>
    `;


    chartPanel.appendChild(
        chartScroll
    );


    chartPanel.appendChild(
        emptyState
    );


    // =====================================================
    // SIDE PANEL
    // =====================================================

    const sidePanel =
        document.createElement(
            "div"
        );


    sidePanel.className =
        "watchlist-chart-side";


    const sideHeader =
        document.createElement(
            "div"
        );


    sideHeader.className =
        "watchlist-chart-side-header";


    sideHeader.innerHTML = `
        <span>Symbol</span>
        <span>Change</span>
        <span>Price</span>
    `;


    const sideBody =
        document.createElement(
            "div"
        );


    sideBody.id =
        "watchlistChartSideBody";


    sideBody.className =
        "watchlist-chart-side-body";


    sidePanel.appendChild(
        sideHeader
    );


    sidePanel.appendChild(
        sideBody
    );


    main.appendChild(
        chartPanel
    );


    main.appendChild(
        sidePanel
    );


    overlay.appendChild(
        topBar
    );


    overlay.appendChild(
        main
    );


    document.body.appendChild(
        overlay
    );


    renderChartsWatchlist();


    createAllCharts();


    document.addEventListener(
        "keydown",
        handleChartsEscape
    );

}


// =========================================================
// CREATE TIMEFRAME BAR
// =========================================================

function createTimeframeBar() {

    const bar =
        document.createElement(
            "div"
        );


    bar.className =
        "watchlist-timeframes";


    TIMEFRAMES.forEach(
        timeframe => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "watchlist-timeframe-button";


            button.dataset.timeframe =
                timeframe.key;


            button.textContent =
                timeframe.label;


            if (
                timeframe.key ===
                selectedTimeframe
            ) {

                button.classList.add(
                    "active"
                );

            }


            button.addEventListener(
                "click",
                () => {

                    selectTimeframe(
                        timeframe.key
                    );

                }
            );


            bar.appendChild(
                button
            );

        }
    );


    return bar;

}


// =========================================================
// CREATE CHART SECTION
// =========================================================

function createChartSection(
    title,
    id,
    chartClass
) {

    const section =
        document.createElement(
            "div"
        );


    section.className =
        "watchlist-chart-section";


    const heading =
        document.createElement(
            "div"
        );


    heading.className =
        "watchlist-chart-section-title";


    heading.textContent =
        title;


    const container =
        document.createElement(
            "div"
        );


    container.id =
        id;


    container.className =
        chartClass;


    section.appendChild(
        heading
    );


    section.appendChild(
        container
    );


    return section;

}


// =========================================================
// CLOSE
// =========================================================

function closeChartsView() {

    chartsViewOpen =
        false;


    selectedChartSymbol =
        null;


    chartRequestId++;


    destroyCharts();


    document.removeEventListener(
        "keydown",
        handleChartsEscape
    );


    window.removeEventListener(
        "resize",
        resizeCharts
    );


    const overlay =
        document.getElementById(
            "watchlistChartsOverlay"
        );


    if (overlay) {

        overlay.remove();

    }


    document.body.style.overflow =
        "";

}


// =========================================================
// ESCAPE
// =========================================================

function handleChartsEscape(
    event
) {

    if (
        event.key ===
        "Escape"
    ) {

        closeChartsView();

    }

}


// =========================================================
// CREATE ALL CHARTS
// =========================================================

function createAllCharts() {

    if (
        !window.LightweightCharts
    ) {

        return;

    }


    destroyCharts();


    // =====================================================
    // PRICE
    // =====================================================

    const priceContainer =
        document.getElementById(
            "watchlistPriceChart"
        );


    const stochasticContainer =
        document.getElementById(
            "watchlistStochasticChart"
        );


    const rsiContainer =
        document.getElementById(
            "watchlistRsiChart"
        );


    const zScoreContainer =
        document.getElementById(
            "watchlistZScoreChart"
        );


    if (
        !priceContainer ||
        !stochasticContainer ||
        !rsiContainer ||
        !zScoreContainer
    ) {

        return;

    }


    priceChart =
        createBaseChart(
            priceContainer
        );


    stochasticChart =
        createBaseChart(
            stochasticContainer
        );


    rsiChart =
        createBaseChart(
            rsiContainer
        );


    zScoreChart =
        createBaseChart(
            zScoreContainer
        );


    // =====================================================
    // CANDLESTICK
    // =====================================================

    candlestickSeries =
        priceChart.addSeries(
            LightweightCharts.CandlestickSeries,
            {
                upColor:
                    "#26a69a",

                downColor:
                    "#ef5350",

                borderUpColor:
                    "#26a69a",

                borderDownColor:
                    "#ef5350",

                wickUpColor:
                    "#26a69a",

                wickDownColor:
                    "#ef5350"
            }
        );


    // =====================================================
    // SMA
    // =====================================================

    smaSeries =
        priceChart.addSeries(
            LightweightCharts.LineSeries,
            {
                lineWidth:
                    2,

                priceLineVisible:
                    false,

                lastValueVisible:
                    false
            }
        );


    // =====================================================
    // STOCHASTIC
    // =====================================================

    stochasticKSeries =
        stochasticChart.addSeries(
            LightweightCharts.LineSeries,
            {
                lineWidth:
                    2,

                priceLineVisible:
                    false
            }
        );


    stochasticDSeries =
        stochasticChart.addSeries(
            LightweightCharts.LineSeries,
            {
                lineWidth:
                    2,

                priceLineVisible:
                    false
            }
        );


    stochasticKSeries.createPriceLine(
        {
            price: 80,
            lineWidth: 1,
            lineStyle:
                LightweightCharts.LineStyle
                    .Dashed,
            axisLabelVisible: true,
            title: "80"
        }
    );


    stochasticKSeries.createPriceLine(
        {
            price: 20,
            lineWidth: 1,
            lineStyle:
                LightweightCharts.LineStyle
                    .Dashed,
            axisLabelVisible: true,
            title: "20"
        }
    );


    // =====================================================
    // RSI
    // =====================================================

    rsiSeries =
        rsiChart.addSeries(
            LightweightCharts.LineSeries,
            {
                lineWidth:
                    2,

                priceLineVisible:
                    false
            }
        );


    rsiSeries.createPriceLine(
        {
            price: 70,
            lineWidth: 1,
            lineStyle:
                LightweightCharts.LineStyle
                    .Dashed,
            axisLabelVisible: true,
            title: "70"
        }
    );


    rsiSeries.createPriceLine(
        {
            price: 30,
            lineWidth: 1,
            lineStyle:
                LightweightCharts.LineStyle
                    .Dashed,
            axisLabelVisible: true,
            title: "30"
        }
    );


    // =====================================================
    // Z SCORE
    // =====================================================

    zScoreSeries =
        zScoreChart.addSeries(
            LightweightCharts.LineSeries,
            {
                lineWidth:
                    2,

                priceLineVisible:
                    false
            }
        );


    zScoreSeries.createPriceLine(
        {
            price: 0,
            lineWidth: 1,
            lineStyle:
                LightweightCharts.LineStyle
                    .Dashed,
            axisLabelVisible: true,
            title: "0"
        }
    );


    zScoreSeries.createPriceLine(
        {
            price: 2,
            lineWidth: 1,
            lineStyle:
                LightweightCharts.LineStyle
                    .Dotted,
            axisLabelVisible: true,
            title: "+2σ"
        }
    );


    zScoreSeries.createPriceLine(
        {
            price: -2,
            lineWidth: 1,
            lineStyle:
                LightweightCharts.LineStyle
                    .Dotted,
            axisLabelVisible: true,
            title: "-2σ"
        }
    );


    synchronizeCharts();


    window.addEventListener(
        "resize",
        resizeCharts
    );


    resizeCharts();

}


// =========================================================
// BASE CHART
// =========================================================

function createBaseChart(
    container
) {

    return LightweightCharts.createChart(
        container,
        {
            layout: {

                background: {
                    type:
                        LightweightCharts.ColorType
                            ? LightweightCharts.ColorType.Solid
                            : "solid",

                    color:
                        "#ffffff"
                },

                textColor:
                    "#374151"
            },

            grid: {

                vertLines: {
                    color:
                        "#f1f3f5"
                },

                horzLines: {
                    color:
                        "#f1f3f5"
                }
            },

            crosshair: {
                mode:
                    LightweightCharts
                        .CrosshairMode
                        .Normal
            },

            rightPriceScale: {

                borderColor:
                    "#e5e7eb",

                scaleMargins: {
                    top: 0.1,
                    bottom: 0.1
                }
            },

            timeScale: {

                borderColor:
                    "#e5e7eb",

                timeVisible:
                    isIntradayTimeframe(),

                secondsVisible:
                    selectedTimeframe ===
                    "1s"
            },

            handleScroll: {

                mouseWheel:
                    true,

                pressedMouseMove:
                    true
            },

            handleScale: {

                mouseWheel:
                    true,

                pinch:
                    true
            }
        }
    );

}


// =========================================================
// DESTROY CHARTS
// =========================================================

function destroyCharts() {

    [
        priceChart,
        stochasticChart,
        rsiChart,
        zScoreChart
    ].forEach(
        currentChart => {

            if (currentChart) {

                currentChart.remove();

            }

        }
    );


    priceChart =
        null;

    stochasticChart =
        null;

    rsiChart =
        null;

    zScoreChart =
        null;


    candlestickSeries =
        null;

    smaSeries =
        null;

    stochasticKSeries =
        null;

    stochasticDSeries =
        null;

    rsiSeries =
        null;

    zScoreSeries =
        null;

}


// =========================================================
// SYNCHRONIZE TIME SCALES
// =========================================================

function synchronizeCharts() {

    const charts = [
        priceChart,
        stochasticChart,
        rsiChart,
        zScoreChart
    ].filter(Boolean);


    let syncing =
        false;


    charts.forEach(
        sourceChart => {

            sourceChart
                .timeScale()
                .subscribeVisibleLogicalRangeChange(
                    range => {

                        if (
                            syncing ||
                            range === null
                        ) {

                            return;

                        }


                        syncing =
                            true;


                        charts.forEach(
                            targetChart => {

                                if (
                                    targetChart !==
                                    sourceChart
                                ) {

                                    targetChart
                                        .timeScale()
                                        .setVisibleLogicalRange(
                                            range
                                        );

                                }

                            }
                        );


                        syncing =
                            false;

                    }
                );

        }
    );

}


// =========================================================
// RESIZE
// =========================================================

function resizeCharts() {

    resizeOneChart(
        priceChart,
        "watchlistPriceChart"
    );


    resizeOneChart(
        stochasticChart,
        "watchlistStochasticChart"
    );


    resizeOneChart(
        rsiChart,
        "watchlistRsiChart"
    );


    resizeOneChart(
        zScoreChart,
        "watchlistZScoreChart"
    );

}


function resizeOneChart(
    currentChart,
    containerId
) {

    if (!currentChart) {

        return;

    }


    const container =
        document.getElementById(
            containerId
        );


    if (!container) {

        return;

    }


    currentChart.applyOptions(
        {
            width:
                container.clientWidth,

            height:
                container.clientHeight
        }
    );

}


// =========================================================
// WATCHLIST SIDE PANEL
// =========================================================

function renderChartsWatchlist() {

    const body =
        document.getElementById(
            "watchlistChartSideBody"
        );


    if (!body) {

        return;

    }


    body.innerHTML =
        "";


    currentSymbols.forEach(
        symbol => {

            const company =
                currentCompanies.find(
                    item =>
                        item.nseSymbol ===
                        symbol
                );


            const row =
                document.createElement(
                    "div"
                );


            row.className =
                "watchlist-chart-row";


            row.dataset.symbol =
                symbol;


            const symbolElement =
                document.createElement(
                    "div"
                );


            symbolElement.className =
                "chart-symbol";


            symbolElement.textContent =
                symbol;


            const changeElement =
                document.createElement(
                    "div"
                );


            changeElement.className =
                "chart-change";


            setChangeElement(
                changeElement,
                company
            );


            const priceElement =
                document.createElement(
                    "div"
                );


            priceElement.className =
                "chart-price";


            setPriceElement(
                priceElement,
                company
            );


            row.appendChild(
                symbolElement
            );


            row.appendChild(
                changeElement
            );


            row.appendChild(
                priceElement
            );


            row.addEventListener(
                "click",
                () => {

                    selectChartSymbol(
                        symbol
                    );

                }
            );


            body.appendChild(
                row
            );

        }
    );

}


// =========================================================
// SELECT SYMBOL
// =========================================================

export async function selectChartSymbol(
    symbol
) {

    if (
        !chartsViewOpen
    ) {

        return;

    }


    selectedChartSymbol =
        symbol;


    highlightSelectedSymbol();


    const title =
        document.getElementById(
            "watchlistChartTitle"
        );


    if (title) {

        title.textContent =
            symbol;

    }


    const emptyState =
        document.getElementById(
            "watchlistChartEmpty"
        );


    if (emptyState) {

        emptyState.style.display =
            "none";

    }


    await loadSelectedChart();

}


// =========================================================
// TIMEFRAME
// =========================================================

async function selectTimeframe(
    timeframe
) {

    if (
        selectedTimeframe ===
        timeframe
    ) {

        return;

    }


    selectedTimeframe =
        timeframe;


    document
        .querySelectorAll(
            ".watchlist-timeframe-button"
        )
        .forEach(
            button => {

                button.classList.toggle(
                    "active",
                    button.dataset.timeframe ===
                    timeframe
                );

            }
        );


    // Recreate because seconds/time visibility changes.

    createAllCharts();


    if (
        selectedChartSymbol
    ) {

        await loadSelectedChart();

    }

}


// =========================================================
// LOAD SELECTED CHART
// =========================================================

async function loadSelectedChart() {

    const symbol =
        selectedChartSymbol;


    if (!symbol) {

        return;

    }


    const requestId =
        ++chartRequestId;


    liveChartData =
        [];


    liveChartLastPrice =
        null;


    // =====================================================
    // 1 SECOND
    // =====================================================

    // Upstox does not expose historical 1-second candles.
    // Start collecting live candles from the current moment.

    if (
        selectedTimeframe ===
        "1s"
    ) {

        clearSeries();


        showLiveSecondMessage();


        return;

    }


    try {

        const response =
            await fetch(
                `/companies/${encodeURIComponent(
                    symbol
                )}/candles?timeframe=${encodeURIComponent(
                    selectedTimeframe
                )}`
            );


        if (!response.ok) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const candles =
            await response.json();


        if (
            requestId !==
                chartRequestId ||
            selectedChartSymbol !==
                symbol
        ) {

            return;

        }


        if (
            !Array.isArray(candles) ||
            candles.length === 0
        ) {

            throw new Error(
                "No candle data available."
            );

        }


        let chartData =
            candles
                .map(
                    normalizeCandle
                )
                .filter(Boolean);


        // 3 month / 6 month / 1 year candles
        // are built from monthly Upstox candles.

        if (
            selectedTimeframe === "3mo" ||
            selectedTimeframe === "6mo" ||
            selectedTimeframe === "1y"
        ) {

            chartData =
                aggregateCandles(
                    chartData,
                    selectedTimeframe
                );

        }


        liveChartData =
            chartData;


        renderAllSeries();


        fitAllCharts();


    } catch (error) {

        console.error(
            "Failed to load chart:",
            error
        );


        if (
            requestId !==
            chartRequestId
        ) {

            return;

        }


        showChartError();

    }

}


// =========================================================
// NORMALIZE BACKEND CANDLE
// =========================================================

function normalizeCandle(
    candle
) {

    const open =
        Number(candle.open);

    const high =
        Number(candle.high);

    const low =
        Number(candle.low);

    const close =
        Number(candle.close);


    if (
        !Number.isFinite(open) ||
        !Number.isFinite(high) ||
        !Number.isFinite(low) ||
        !Number.isFinite(close)
    ) {

        return null;

    }


    const timestamp =
        new Date(
            candle.time
        ).getTime();


    if (
        !Number.isFinite(timestamp)
    ) {

        return null;

    }


    return {

        time:
            Math.floor(
                timestamp / 1000
            ),

        open,
        high,
        low,
        close
    };

}


// =========================================================
// AGGREGATE 3M / 6M / 1Y
// =========================================================

function aggregateCandles(
    candles,
    timeframe
) {

    const grouped =
        new Map();


    candles.forEach(
        candle => {

            const bucket =
                getBucketTime(
                    candle.time,
                    timeframe
                );


            if (
                !grouped.has(bucket)
            ) {

                grouped.set(
                    bucket,
                    {
                        time:
                            bucket,

                        open:
                            candle.open,

                        high:
                            candle.high,

                        low:
                            candle.low,

                        close:
                            candle.close
                    }
                );


                return;

            }


            const current =
                grouped.get(bucket);


            current.high =
                Math.max(
                    current.high,
                    candle.high
                );


            current.low =
                Math.min(
                    current.low,
                    candle.low
                );


            current.close =
                candle.close;

        }
    );


    return [
        ...grouped.values()
    ].sort(
        (a, b) =>
            a.time - b.time
    );

}


// =========================================================
// RENDER ALL INDICATORS
// =========================================================

function renderAllSeries() {

    if (
        !candlestickSeries
    ) {

        return;

    }


    candlestickSeries.setData(
        liveChartData
    );


    // =====================================================
    // SMA
    // =====================================================

    const sma =
        calculateSMA(
            liveChartData,
            20
        );


    smaSeries.setData(
        sma
    );


    // =====================================================
    // STOCHASTIC
    // =====================================================

    const stochastic =
        calculateStochastic(
            liveChartData,
            14,
            3
        );


    stochasticKSeries.setData(
        stochastic.k
    );


    stochasticDSeries.setData(
        stochastic.d
    );


    // =====================================================
    // RSI
    // =====================================================

    rsiSeries.setData(
        calculateRSI(
            liveChartData,
            14
        )
    );


    // =====================================================
    // Z SCORE
    // =====================================================

    zScoreSeries.setData(
        calculateZScore(
            liveChartData,
            20
        )
    );

}


// =========================================================
// SMA
// =========================================================

function calculateSMA(
    candles,
    period
) {

    const result =
        [];


    for (
        let i = period - 1;
        i < candles.length;
        i++
    ) {

        let total =
            0;


        for (
            let j = i - period + 1;
            j <= i;
            j++
        ) {

            total +=
                candles[j].close;

        }


        result.push(
            {
                time:
                    candles[i].time,

                value:
                    total / period
            }
        );

    }


    return result;

}


// =========================================================
// STOCHASTIC OSCILLATOR
// =========================================================

function calculateStochastic(
    candles,
    period,
    smooth
) {

    const kValues =
        [];


    for (
        let i = period - 1;
        i < candles.length;
        i++
    ) {

        const window =
            candles.slice(
                i - period + 1,
                i + 1
            );


        const highest =
            Math.max(
                ...window.map(
                    candle =>
                        candle.high
                )
            );


        const lowest =
            Math.min(
                ...window.map(
                    candle =>
                        candle.low
                )
            );


        const range =
            highest - lowest;


        const k =
            range === 0
                ? 50
                : (
                    (
                        candles[i].close -
                        lowest
                    ) /
                    range
                ) * 100;


        kValues.push(
            {
                time:
                    candles[i].time,

                value:
                    k
            }
        );

    }


    const dValues =
        [];


    for (
        let i = smooth - 1;
        i < kValues.length;
        i++
    ) {

        let total =
            0;


        for (
            let j = i - smooth + 1;
            j <= i;
            j++
        ) {

            total +=
                kValues[j].value;

        }


        dValues.push(
            {
                time:
                    kValues[i].time,

                value:
                    total / smooth
            }
        );

    }


    return {

        k:
            kValues,

        d:
            dValues

    };

}


// =========================================================
// RSI
// =========================================================

function calculateRSI(
    candles,
    period
) {

    if (
        candles.length <=
        period
    ) {

        return [];

    }


    const result =
        [];


    let gains =
        0;

    let losses =
        0;


    for (
        let i = 1;
        i <= period;
        i++
    ) {

        const difference =
            candles[i].close -
            candles[i - 1].close;


        if (
            difference >= 0
        ) {

            gains +=
                difference;

        } else {

            losses +=
                Math.abs(
                    difference
                );

        }

    }


    let averageGain =
        gains / period;


    let averageLoss =
        losses / period;


    result.push(
        {
            time:
                candles[period].time,

            value:
                calculateRsiValue(
                    averageGain,
                    averageLoss
                )
        }
    );


    for (
        let i = period + 1;
        i < candles.length;
        i++
    ) {

        const difference =
            candles[i].close -
            candles[i - 1].close;


        const gain =
            Math.max(
                difference,
                0
            );


        const loss =
            Math.max(
                -difference,
                0
            );


        averageGain =
            (
                averageGain *
                (period - 1) +
                gain
            ) /
            period;


        averageLoss =
            (
                averageLoss *
                (period - 1) +
                loss
            ) /
            period;


        result.push(
            {
                time:
                    candles[i].time,

                value:
                    calculateRsiValue(
                        averageGain,
                        averageLoss
                    )
            }
        );

    }


    return result;

}


function calculateRsiValue(
    averageGain,
    averageLoss
) {

    if (
        averageLoss === 0
    ) {

        return 100;

    }


    const rs =
        averageGain /
        averageLoss;


    return (
        100 -
        100 / (1 + rs)
    );

}


// =========================================================
// Z SCORE OF RETURNS
// =========================================================

function calculateZScore(
    candles,
    period
) {

    if (
        candles.length <
        period + 1
    ) {

        return [];

    }


    const returns =
        [];


    for (
        let i = 1;
        i < candles.length;
        i++
    ) {

        returns.push(
            {
                time:
                    candles[i].time,

                value:
                    (
                        candles[i].close -
                        candles[i - 1].close
                    ) /
                    candles[i - 1].close
            }
        );

    }


    const result =
        [];


    for (
        let i = period - 1;
        i < returns.length;
        i++
    ) {

        const window =
            returns.slice(
                i - period + 1,
                i + 1
            );


        const mean =
            window.reduce(
                (sum, item) =>
                    sum + item.value,
                0
            ) /
            period;


        const variance =
            window.reduce(
                (sum, item) => {

                    const difference =
                        item.value -
                        mean;


                    return (
                        sum +
                        difference *
                        difference
                    );

                },
                0
            ) /
            period;


        const standardDeviation =
            Math.sqrt(
                variance
            );


        const z =
            standardDeviation === 0
                ? 0
                : (
                    returns[i].value -
                    mean
                ) /
                standardDeviation;


        result.push(
            {
                time:
                    returns[i].time,

                value:
                    z
            }
        );

    }


    return result;

}


// =========================================================
// CURRENT TIME BUCKET
// =========================================================

function getBucketTime(
    time,
    timeframe
) {

    const date =
        new Date(
            time * 1000
        );


    if (
        timeframe === "1s"
    ) {

        return Math.floor(
            time
        );

    }


    if (
        timeframe === "1m"
    ) {

        date.setSeconds(
            0,
            0
        );

    } else if (
        timeframe === "1h"
    ) {

        // NSE trading session begins at 09:15.
        // Hour candles are aligned from that point.

        const minutes =
            date.getHours() *
            60 +
            date.getMinutes();


        const marketStart =
            9 * 60 + 15;


        const elapsed =
            Math.max(
                0,
                minutes - marketStart
            );


        const bucket =
            marketStart +
            Math.floor(
                elapsed / 60
            ) *
            60;


        date.setHours(
            Math.floor(
                bucket / 60
            ),
            bucket % 60,
            0,
            0
        );

    } else if (
        timeframe === "1d"
    ) {

        date.setHours(
            0,
            0,
            0,
            0
        );

    } else if (
        timeframe === "1w"
    ) {

        date.setHours(
            0,
            0,
            0,
            0
        );


        const day =
            date.getDay();


        const difference =
            day === 0
                ? -6
                : 1 - day;


        date.setDate(
            date.getDate() +
            difference
        );

    } else if (
        timeframe === "1mo"
    ) {

        date.setDate(
            1
        );


        date.setHours(
            0,
            0,
            0,
            0
        );

    } else if (
        timeframe === "3mo"
    ) {

        const month =
            Math.floor(
                date.getMonth() /
                3
            ) *
            3;


        date.setMonth(
            month,
            1
        );


        date.setHours(
            0,
            0,
            0,
            0
        );

    } else if (
        timeframe === "6mo"
    ) {

        const month =
            date.getMonth() < 6
                ? 0
                : 6;


        date.setMonth(
            month,
            1
        );


        date.setHours(
            0,
            0,
            0,
            0
        );

    } else if (
        timeframe === "1y"
    ) {

        date.setMonth(
            0,
            1
        );


        date.setHours(
            0,
            0,
            0,
            0
        );

    }


    return Math.floor(
        date.getTime() /
        1000
    );

}


// =========================================================
// LIVE UPDATE
// =========================================================

export function updateChartsView(
    companies = []
) {

    if (
        !chartsViewOpen
    ) {

        return;

    }


    currentCompanies =
        companies;


    // =====================================================
    // SIDE PANEL
    // =====================================================

    updateSidePanel();


    if (
        !selectedChartSymbol ||
        !candlestickSeries
    ) {

        return;

    }


    const selectedCompany =
        companies.find(
            company =>
                company.nseSymbol ===
                selectedChartSymbol
        );


    if (!selectedCompany) {

        return;

    }


    const livePrice =
        Number(
            selectedCompany.livePrice
        );


    if (
        !Number.isFinite(
            livePrice
        )
    ) {

        return;

    }


    liveChartLastPrice =
        livePrice;


    const nowSeconds =
        Math.floor(
            Date.now() /
            1000
        );


    const bucketTime =
        getBucketTime(
            nowSeconds,
            selectedTimeframe
        );


    const lastCandle =
        liveChartData.length > 0
            ? liveChartData[
                liveChartData.length - 1
            ]
            : null;


    // =====================================================
    // UPDATE EXISTING CANDLE
    // =====================================================

    if (
        lastCandle &&
        Number(
            lastCandle.time
        ) ===
        bucketTime
    ) {

        lastCandle.high =
            Math.max(
                lastCandle.high,
                livePrice
            );


        lastCandle.low =
            Math.min(
                lastCandle.low,
                livePrice
            );


        lastCandle.close =
            livePrice;


        candlestickSeries.update(
            lastCandle
        );


        renderIndicatorsOnly();


        return;

    }


    // =====================================================
    // NEW CANDLE
    // =====================================================

    const previousClose =
        lastCandle
            ? lastCandle.close
            : livePrice;


    const newCandle = {

        time:
            bucketTime,

        open:
            previousClose,

        high:
            Math.max(
                previousClose,
                livePrice
            ),

        low:
            Math.min(
                previousClose,
                livePrice
            ),

        close:
            livePrice
    };


    liveChartData.push(
        newCandle
    );


    candlestickSeries.update(
        newCandle
    );


    renderIndicatorsOnly();

}


// =========================================================
// INDICATORS AFTER LIVE UPDATE
// =========================================================

function renderIndicatorsOnly() {

    if (
        !smaSeries ||
        !stochasticKSeries ||
        !stochasticDSeries ||
        !rsiSeries ||
        !zScoreSeries
    ) {

        return;

    }


    smaSeries.setData(
        calculateSMA(
            liveChartData,
            20
        )
    );


    const stochastic =
        calculateStochastic(
            liveChartData,
            14,
            3
        );


    stochasticKSeries.setData(
        stochastic.k
    );


    stochasticDSeries.setData(
        stochastic.d
    );


    rsiSeries.setData(
        calculateRSI(
            liveChartData,
            14
        )
    );


    zScoreSeries.setData(
        calculateZScore(
            liveChartData,
            20
        )
    );

}


// =========================================================
// SIDE PANEL LIVE UPDATE
// =========================================================

function updateSidePanel() {

    const body =
        document.getElementById(
            "watchlistChartSideBody"
        );


    if (!body) {

        return;

    }


    const companyMap =
        new Map(
            currentCompanies.map(
                company => [
                    company.nseSymbol,
                    company
                ]
            )
        );


    body
        .querySelectorAll(
            ".watchlist-chart-row"
        )
        .forEach(
            row => {

                const company =
                    companyMap.get(
                        row.dataset.symbol
                    );


                if (!company) {

                    return;

                }


                setChangeElement(
                    row.querySelector(
                        ".chart-change"
                    ),
                    company
                );


                setPriceElement(
                    row.querySelector(
                        ".chart-price"
                    ),
                    company
                );

            }
        );

}


// =========================================================
// CHANGE / PRICE UI
// =========================================================

function setChangeElement(
    element,
    company
) {

    if (!element) {

        return;

    }


    element.classList.remove(
        "watchlist-positive",
        "watchlist-negative",
        "watchlist-neutral"
    );


    if (
        !company ||
        company.changePercent === null ||
        company.changePercent === undefined
    ) {

        element.textContent =
            "—";


        element.classList.add(
            "watchlist-neutral"
        );


        return;

    }


    const change =
        Number(
            company.changePercent
        );


    element.textContent =
        (
            change > 0
                ? "+"
                : ""
        ) +
        change.toFixed(2) +
        "%";


    element.classList.add(
        change > 0
            ? "watchlist-positive"
            : change < 0
                ? "watchlist-negative"
                : "watchlist-neutral"
    );

}


function setPriceElement(
    element,
    company
) {

    if (!element) {

        return;

    }


    if (
        !company ||
        company.livePrice === null ||
        company.livePrice === undefined
    ) {

        element.textContent =
            "—";


        return;

    }


    const price =
        Number(
            company.livePrice
        );


    if (
        !Number.isFinite(
            price
        )
    ) {

        element.textContent =
            "—";


        return;

    }


    element.textContent =
        "₹" +
        price.toLocaleString(
            "en-IN",
            {
                minimumFractionDigits:
                    2,

                maximumFractionDigits:
                    2
            }
        );

}


// =========================================================
// HELPERS
// =========================================================

function highlightSelectedSymbol() {

    document
        .querySelectorAll(
            ".watchlist-chart-row"
        )
        .forEach(
            row => {

                row.classList.toggle(
                    "selected",
                    row.dataset.symbol ===
                        selectedChartSymbol
                );

            }
        );

}


function clearSeries() {

    liveChartData =
        [];


    candlestickSeries?.setData(
        []
    );


    smaSeries?.setData(
        []
    );


    stochasticKSeries?.setData(
        []
    );


    stochasticDSeries?.setData(
        []
    );


    rsiSeries?.setData(
        []
    );


    zScoreSeries?.setData(
        []
    );

}


function fitAllCharts() {

    [
        priceChart,
        stochasticChart,
        rsiChart,
        zScoreChart
    ]
        .filter(Boolean)
        .forEach(
            currentChart => {

                currentChart
                    .timeScale()
                    .fitContent();

            }
        );

}


function isIntradayTimeframe() {

    return (
        selectedTimeframe ===
            "1s" ||
        selectedTimeframe ===
            "1m" ||
        selectedTimeframe ===
            "1h"
    );

}


function showLiveSecondMessage() {

    const empty =
        document.getElementById(
            "watchlistChartEmpty"
        );


    if (!empty) {

        return;

    }


    empty.innerHTML = `
        <div class="watchlist-chart-empty-title">
            Live 1-second candles
        </div>

        <div class="watchlist-chart-empty-text">
            Upstox does not provide historical
            1-second candles. Live candles will
            appear from now.
        </div>
    `;


    empty.style.display =
        "flex";


    setTimeout(
        () => {

            if (
                selectedTimeframe ===
                    "1s" &&
                selectedChartSymbol
            ) {

                empty.style.display =
                    "none";

            }

        },
        2500
    );

}


function showChartError() {

    const empty =
        document.getElementById(
            "watchlistChartEmpty"
        );


    if (!empty) {

        return;

    }


    empty.innerHTML = `
        <div class="watchlist-chart-empty-title">
            Unable to load chart
        </div>

        <div class="watchlist-chart-empty-text">
            Historical candle data could not be loaded.
        </div>
    `;


    empty.style.display =
        "flex";

}