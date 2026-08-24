import {
    getDisplayedCompanies
} from "./tabs.js";

import {
    formatChange,
    formatPercent,
    escapeHtml
} from "./utils.js";


// =========================================================
// SELECTION / VISITED STATE
// =========================================================

let selectedSymbols = new Set();

let visitedSymbols = new Set();

let rangeStartIndex = null;

let currentCompanies = [];

let currentView = "all";


// =========================================================
// COPY SYMBOLS
// =========================================================

async function copySymbols(symbols) {

    if (symbols.length === 0) {
        return;
    }

    const text =
        symbols.join("\n");

    try {

        await navigator.clipboard.writeText(
            text
        );

    }

    catch (error) {

        console.error(
            "Copy failed:",
            error
        );
    }
}


// =========================================================
// GET SELECTION STATE
// =========================================================

function getSelectionState() {

    let visitedCount = 0;

    let unvisitedCount = 0;


    selectedSymbols.forEach(
        symbol => {

            if (
                visitedSymbols.has(symbol)
            ) {

                visitedCount++;

            }

            else {

                unvisitedCount++;

            }

        }
    );


    return {
        visitedCount,
        unvisitedCount
    };
}


// =========================================================
// COPY SELECTED
// =========================================================

async function copySelected() {

    const symbols =
        [...selectedSymbols];


    if (symbols.length === 0) {
        return;
    }


    // Copy only NSE symbols

    await copySymbols(
        symbols
    );


    // Mark everything selected as visited

    symbols.forEach(
        symbol => {

            visitedSymbols.add(
                symbol
            );

        }
    );


    renderCurrentRows();
}


// =========================================================
// VISIT SELECTED
// =========================================================

function visitSelected() {

    selectedSymbols.forEach(
        symbol => {

            if (
                !visitedSymbols.has(
                    symbol
                )
            ) {

                visitedSymbols.add(
                    symbol
                );

            }

        }
    );


    renderCurrentRows();
}


// =========================================================
// UNVISIT SELECTED
// =========================================================

function unvisitSelected() {

    selectedSymbols.forEach(
        symbol => {

            visitedSymbols.delete(
                symbol
            );

        }
    );


    // Clear the entire selection

    selectedSymbols.clear();

    rangeStartIndex = null;


    renderCurrentRows();
}


// =========================================================
// CLEAR SELECTION
// =========================================================

function clearSelection() {

    selectedSymbols.clear();

    rangeStartIndex = null;
}


// =========================================================
// SELECT RANGE
// =========================================================

function selectRange(
    startIndex,
    endIndex,
    data
) {

    selectedSymbols.clear();


    const firstIndex =
        Math.min(
            startIndex,
            endIndex
        );


    const lastIndex =
        Math.max(
            startIndex,
            endIndex
        );


    for (
        let i = firstIndex;
        i <= lastIndex;
        i++
    ) {

        selectedSymbols.add(
            data[i].nseSymbol
        );

    }
}


// =========================================================
// RENDER
// =========================================================

export function render(
    companies,
    view
) {

    currentCompanies =
        companies;

    currentView =
        view;


    renderCurrentRows();
}


// =========================================================
// RENDER CURRENT ROWS
// =========================================================

function renderCurrentRows() {

    const table =
        document.getElementById(
            "companyTable"
        );


    const data =
        getDisplayedCompanies(
            currentCompanies,
            currentView
        );


    // =====================================================
    // NO DATA
    // =====================================================

    if (
        data.length === 0
    ) {

        table.innerHTML = `

            <tr>

                <td
                    colspan="8"
                    class="loading">

                    No live data available yet.

                </td>

            </tr>

        `;


        document
            .getElementById("total")
            .textContent =
            "Companies: 0";


        return;
    }


    table.innerHTML = "";


    // =====================================================
    // FIND LAST SELECTED INDEX
    // =====================================================

    let lastSelectedIndex = -1;


    data.forEach(
        (company, index) => {

            if (
                selectedSymbols.has(
                    company.nseSymbol
                )
            ) {

                lastSelectedIndex =
                    index;

            }

        }
    );


    // =====================================================
    // CREATE ROWS
    // =====================================================

    data.forEach(
        (company, index) => {

            const row =
                document.createElement(
                    "tr"
                );


            const symbol =
                company.nseSymbol;


            const isVisited =
                visitedSymbols.has(
                    symbol
                );


            const isSelected =
                selectedSymbols.has(
                    symbol
                );


            // =================================================
            // CHANGE CLASS
            // =================================================

            let changeClass =
                "neutral";


            if (
                company.changePercent !== null &&
                company.changePercent !== undefined &&
                company.changePercent > 0
            ) {

                changeClass =
                    "positive";

            }

            else if (
                company.changePercent !== null &&
                company.changePercent !== undefined &&
                company.changePercent < 0
            ) {

                changeClass =
                    "negative";
            }


            // =================================================
            // LIVE PRICE
            // =================================================

            const livePrice =
                company.livePrice !== null &&
                company.livePrice !== undefined

                    ? "₹" +
                      Number(
                          company.livePrice
                      ).toLocaleString(
                          "en-IN",
                          {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                          }
                      )

                    : "—";


            // =================================================
            // CHANGE
            // =================================================

            const change =
                company.change !== null &&
                company.change !== undefined

                    ? formatChange(
                          company.change
                      )

                    : "—";


            // =================================================
            // CHANGE %
            // =================================================

            const changePercent =
                company.changePercent !== null &&
                company.changePercent !== undefined

                    ? formatPercent(
                          company.changePercent
                      )

                    : "—";


            // =================================================
            // MARKET CAP
            // =================================================

            const marketCap =
                Number(
                    company.marketCap
                ).toLocaleString(
                    "en-IN",
                    {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    }
                );


            // =================================================
            // VISITED ROW
            // =================================================

            if (
                isVisited
            ) {

                row.classList.add(
                    "visited-row"
                );
            }


            // =================================================
            // RANK
            // =================================================

            const rankCell =
                document.createElement(
                    "td"
                );

            rankCell.className =
                "rank";

            rankCell.textContent =
                index + 1;


            row.appendChild(
                rankCell
            );


            // =================================================
            // NSE SYMBOL CELL
            // =================================================

            const symbolCell =
                document.createElement(
                    "td"
                );


            symbolCell.className =
                "symbol";


            const symbolContainer =
                document.createElement(
                    "div"
                );


            symbolContainer.className =
                "symbol-cell";


            // =================================================
            // CHECKBOX
            // =================================================

            const checkbox =
                document.createElement(
                    "input"
                );


            checkbox.type =
                "checkbox";


            checkbox.className =
                "symbol-checkbox";


            checkbox.checked =
                isSelected;


            // =================================================
            // CHECKBOX CLICK
            // =================================================

            checkbox.addEventListener(
    "click",
    event => {

        event.stopPropagation();


        // =====================================================
        // UNCHECKING
        // =====================================================

        if (
            selectedSymbols.has(symbol)
        ) {

            selectedSymbols.delete(
                symbol
            );


            /*
             * Do NOT change the range start.
             * Only this checkbox is removed.
             */

            renderCurrentRows();

            return;
        }


        // =====================================================
        // FIRST CHECK
        // =====================================================

        if (
            rangeStartIndex === null
        ) {

            rangeStartIndex =
                index;


            selectedSymbols.clear();


            selectedSymbols.add(
                symbol
            );


            renderCurrentRows();

            return;
        }


        // =====================================================
        // SECOND CHECK → SELECT RANGE
        // =====================================================

        selectRange(
            rangeStartIndex,
            index,
            data
        );


        /*
         * Keep this clicked row as the
         * starting point for a possible
         * next range.
         */

        rangeStartIndex =
            index;


        renderCurrentRows();
    }
);

            // =================================================
            // SYMBOL TEXT
            // =================================================

            const symbolText =
                document.createElement(
                    "span"
                );


            symbolText.className =
                "symbol-text";


            symbolText.textContent =
                symbol;


            symbolContainer.appendChild(
                checkbox
            );


            symbolContainer.appendChild(
                symbolText
            );


            // =================================================
            // ACTION BUTTONS
            // =================================================

            if (
                index ===
                lastSelectedIndex
            ) {

                const actions =
                    document.createElement(
                        "div"
                    );


                actions.className =
                    "symbol-actions";


                const state =
                    getSelectionState();


                // =============================================
                // COPY
                // =============================================

                const copyButton =
                    document.createElement(
                        "button"
                    );


                copyButton.className =
                    "symbol-action copy-action";


                copyButton.textContent =
                    "Copy";


                copyButton.addEventListener(
                    "click",
                    event => {

                        event.stopPropagation();

                        copySelected();
                    }
                );


                actions.appendChild(
                    copyButton
                );


                // =============================================
                // ALL VISITED
                // =============================================

                if (
                    state.visitedCount ===
                    selectedSymbols.size
                ) {

                    const unvisitButton =
                        document.createElement(
                            "button"
                        );


                    unvisitButton.className =
                        "symbol-action unvisit-action";


                    unvisitButton.textContent =
                        "Unvisit";


                    unvisitButton.addEventListener(
                        "click",
                        event => {

                            event.stopPropagation();

                            unvisitSelected();
                        }
                    );


                    actions.appendChild(
                        unvisitButton
                    );
                }


                // =============================================
                // MIXED
                // =============================================

                else if (
                    state.visitedCount > 0 &&
                    state.unvisitedCount > 0
                ) {

                    const visitButton =
                        document.createElement(
                            "button"
                        );


                    visitButton.className =
                        "symbol-action visit-action";


                    visitButton.textContent =
                        "Visit";


                    visitButton.addEventListener(
                        "click",
                        event => {

                            event.stopPropagation();

                            visitSelected();
                        }
                    );


                    const unvisitButton =
                        document.createElement(
                            "button"
                        );


                    unvisitButton.className =
                        "symbol-action unvisit-action";


                    unvisitButton.textContent =
                        "Unvisit";


                    unvisitButton.addEventListener(
                        "click",
                        event => {

                            event.stopPropagation();

                            unvisitSelected();
                        }
                    );


                    actions.appendChild(
                        visitButton
                    );


                    actions.appendChild(
                        unvisitButton
                    );
                }


                symbolContainer.appendChild(
                    actions
                );
            }


            symbolCell.appendChild(
                symbolContainer
            );


            row.appendChild(
                symbolCell
            );


            // =================================================
            // COMPANY NAME
            // =================================================

            row.appendChild(
                createCell(
                    "company-name",
                    company.companyName
                )
            );


            // =================================================
            // CHANGE %
            // =================================================

            row.appendChild(
                createCell(
                    changeClass,
                    changePercent
                )
            );


            // =================================================
            // MARKET CAP
            // =================================================

            row.appendChild(
                createCell(
                    "market-cap",
                    "₹" +
                    marketCap +
                    " Cr"
                )
            );


            // =================================================
            // LIVE PRICE
            // =================================================

            row.appendChild(
                createCell(
                    "live-price",
                    livePrice
                )
            );


            // =================================================
            // CHANGE
            // =================================================

            row.appendChild(
                createCell(
                    changeClass +
                    " change-value",
                    change
                )
            );


            // =================================================
            // GROUP
            // =================================================

            row.appendChild(
                createCell(
                    "group",
                    company.bseGroup
                )
            );


            table.appendChild(
                row
            );

        }
    );


    // =====================================================
    // TOTAL
    // =====================================================

    document
        .getElementById("total")
        .textContent =
        "Companies: " +
        data.length;
}


// =========================================================
// CREATE CELL
// =========================================================

function createCell(
    className,
    value
) {

    const cell =
        document.createElement(
            "td"
        );


    cell.className =
        className;


    cell.textContent =
        value;


    return cell;
}