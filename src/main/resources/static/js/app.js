import {
    loadCompanies,
    loadMarketIndices
} from "./api.js";

import {
    render
} from "./table.js";

import {
    setActiveTab
} from "./tabs.js";


// =========================================================
// GLOBAL STATE
// =========================================================

let companies = [];

let currentView = "all";


// =========================================================
// LOAD AND RENDER
// =========================================================

async function refreshCompanies() {

    const data =
        await loadCompanies();

    companies =
        data;

    render(
        companies,
        currentView
    );
}

// =========================================================
// MARKET INDICES
// =========================================================

async function refreshMarketIndices() {

    try {

        const indices =
            await loadMarketIndices();

        const status = document.getElementById("status");

        const now = new Date();

        const hours = now.getHours();
        const minutes = now.getMinutes();

        const currentMinutes =
            hours * 60 + minutes;

        const marketOpen =
            9 * 60 + 15;

        const marketClose =
            15 * 60 + 30;

        const isWeekday =
            now.getDay() >= 1 &&
            now.getDay() <= 5;

        const isMarketOpen =
            isWeekday &&
            currentMinutes >= marketOpen &&
            currentMinutes <= marketClose;

        status.classList.toggle(
            "live",
            isMarketOpen
        );


        updateIndex(
            indices["NSE_INDEX|Nifty 500"],
            "nifty500"
        );

        updateIndex(
            indices["NSE_INDEX|Nifty 50"],
            "nifty50"
        );

        updateIndex(
            indices["NSE_INDEX|NIFTY MIDCAP 150"],
            "midcap150"
        );

        updateIndex(
            indices["NSE_INDEX|NIFTY SMLCAP 250"],
            "smallcap250"
        );

        updateIndex(
            indices["NSE_INDEX|Nifty Bank"],
            "niftyBank"
        );

    } catch (error) {

        const status =
            document.getElementById("status");

        status.classList.remove("live");

        console.error(
            "Failed to load market indices:",
            error
        );
    }
}
// =========================================================
// UPDATE ONE INDEX
// =========================================================

function updateIndex(
    quote,
    id
) {

    if (!quote) {
        return;
    }


    const valueElement =
        document.getElementById(
            id + "Value"
        );

    const changeElement =
        document.getElementById(
            id + "Change"
        );

    const changePercentElement =
        document.getElementById(
            id + "ChangePercent"
        );


    valueElement.textContent =
        quote.lastPrice.toFixed(2);


    const changeSign =
        quote.change > 0
            ? "+"
            : "";


    changeElement.textContent =
        changeSign +
        quote.change.toFixed(2);


    changePercentElement.textContent =
        changeSign +
        quote.changePercent.toFixed(2) +
        "%";


    const className =
        quote.change > 0
            ? "market-positive"
            : quote.change < 0
                ? "market-negative"
                : "market-neutral";


    valueElement.className =
        "market-value";

    changeElement.className =
        "market-change " +
        className;

    changePercentElement.className =
        "market-change-percent " +
        className;
}
// =========================================================
// MARKET CAP CHANGED
// =========================================================

function changeMarketCap() {

    currentView =
        "all";

    setActiveTab(
        "allTab"
    );

    refreshCompanies();
}


// =========================================================
// ALL COMPANIES
// =========================================================

function showAll() {

    currentView =
        "all";

    setActiveTab(
        "allTab"
    );

    render(
        companies,
        currentView
    );
}


// =========================================================
// TOP PERFORMERS
// =========================================================

function showPerformers() {

    currentView =
        "performers";

    setActiveTab(
        "performersTab"
    );

    render(
        companies,
        currentView
    );
}


// =========================================================
// TOP LOSERS
// =========================================================

function showLosers() {

    currentView =
        "losers";

    setActiveTab(
        "losersTab"
    );

    render(
        companies,
        currentView
    );
}


// =========================================================
// EVENT LISTENERS
// =========================================================

document
    .getElementById("marketCapSelect")
    .addEventListener(
        "change",
        changeMarketCap
    );


document
    .getElementById("allTab")
    .addEventListener(
        "click",
        showAll
    );


document
    .getElementById("performersTab")
    .addEventListener(
        "click",
        showPerformers
    );


document
    .getElementById("losersTab")
    .addEventListener(
        "click",
        showLosers
    );


// =========================================================
// INITIAL LOAD
// =========================================================

refreshCompanies();

refreshMarketIndices();


setInterval(
    refreshCompanies,
    1000
);


setInterval(
    refreshMarketIndices,
    1000
);