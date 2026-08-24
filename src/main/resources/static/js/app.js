import {
    loadCompanies
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


// =========================================================
// UI REFRESH
// =========================================================

setInterval(
    refreshCompanies,
    1000
);