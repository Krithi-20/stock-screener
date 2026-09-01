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

// Each tab/view gets its own completely independent state.

const tabStates = new Map();

function getTabState(view) {

    if (!tabStates.has(view)) {

        tabStates.set(
            view,
            {
                selectedSymbols: new Set(),
                visitedSymbols: new Set(),
                copiedSymbols: new Set(),
                lastClickedIndex: null
            }
        );

    }

    return tabStates.get(view);
}


// =========================================================
// CURRENT STATE
// =========================================================

let selectedSymbols = new Set();

let visitedSymbols = new Set();

let copiedSymbols = new Set();

let lastClickedIndex = null;

let currentCompanies = [];

let currentView = "all";


// =========================================================
// ACTIVATE TAB STATE
// =========================================================

function activateTabState(view) {

    const state =
        getTabState(view);

    selectedSymbols =
        state.selectedSymbols;

    visitedSymbols =
        state.visitedSymbols;

    copiedSymbols =
        state.copiedSymbols;

    lastClickedIndex =
        state.lastClickedIndex;

}


// =========================================================
// SAVE CURRENT TAB STATE
// =========================================================

function saveCurrentTabState() {

    const state =
        getTabState(currentView);

    state.selectedSymbols =
        selectedSymbols;

    state.visitedSymbols =
        visitedSymbols;

    state.copiedSymbols =
        copiedSymbols;

    state.lastClickedIndex =
        lastClickedIndex;

}


// =========================================================
// COPY SYMBOLS
// =========================================================

async function copySymbols(symbols) {

    if (symbols.length === 0) {
        return false;
    }

    const text = symbols
        .map(symbol => {

            const company =
                currentCompanies.find(
                    item => item.nseSymbol === symbol
                );

            if (!company) {
                return symbol;
            }

            const changePercent =
                company.changePercent !== null &&
                company.changePercent !== undefined
                    ? formatPercent(
                          company.changePercent
                      )
                    : "—";

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

            return (
                symbol +
                "\t" +
                changePercent +
                "\t" +
                livePrice
            );
        })
        .join("\n");

    try {

        await navigator.clipboard.writeText(
            text
        );

        return true;

    } catch (error) {

        console.error(
            "Copy failed:",
            error
        );

        return false;
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

            } else {

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

async function copySelected(button) {

    const symbols =
        [...selectedSymbols];

    if (symbols.length === 0) {
        return;
    }


    // Prevent double-clicking while
    // the copy operation is running

    if (
        button.disabled
    ) {

        return;

    }


    button.disabled = true;


    // Copy ONLY currently checked symbols
    // from the CURRENT TAB

    const copied =
        await copySymbols(
            symbols
        );


    // Only update the UI if copying
    // actually succeeded

    if (
        copied
    ) {

        // Mark ONLY currently checked symbols
        // in the CURRENT TAB as visited

        symbols.forEach(
            symbol => {

                visitedSymbols.add(
                    symbol
                );

                copiedSymbols.add(
                    symbol
                );

            }
        );


        // Save this tab's state

        saveCurrentTabState();


        // Show successful copy state

        button.textContent =
            "✓ Copied";

        button.classList.add(
            "copied"
        );


        // Keep the button visible while
        // showing the success message

        button.disabled =
            true;


        // Reset button after 1.5 seconds

        setTimeout(
            () => {

                button.textContent =
                    "Copy";

                button.classList.remove(
                    "copied"
                );

                button.disabled =
                    false;

            },
            1500
        );

    } else {

        // Copy failed

        button.textContent =
            "Copy failed";

        button.classList.add(
            "copy-failed"
        );


        setTimeout(
            () => {

                button.textContent =
                    "Copy";

                button.classList.remove(
                    "copy-failed"
                );

                button.disabled =
                    false;

            },
            1500
        );

    }
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

            copiedSymbols.delete(
                symbol
            );

        }
    );


    // Clear current selection

    selectedSymbols.clear();


    // Reset Shift-click

    lastClickedIndex = null;


    // Save ONLY this tab's state

    saveCurrentTabState();


    renderCurrentRows();
}


// =========================================================
// CLEAR SELECTION
// =========================================================

function clearSelection() {

    selectedSymbols.clear();

    lastClickedIndex = null;

    saveCurrentTabState();
}


// =========================================================
// SELECT RANGE
// =========================================================

function selectRange(
    startIndex,
    endIndex,
    data
) {

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


    // IMPORTANT:
    // Do NOT clear existing selections.
    // Shift-click adds the range.

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

    // Save the state of the tab we are
    // leaving BEFORE changing currentView

    saveCurrentTabState();


    currentCompanies =
        companies;

    currentView =
        view;


    // Load the independent state belonging
    // to the new tab

    activateTabState(
        currentView
    );


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


    table.innerHTML =
        "";


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

            } else if (
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


                    // =========================================
                    // SHIFT + CLICK
                    // =========================================

                    if (
                        event.shiftKey &&
                        lastClickedIndex !== null
                    ) {

                        selectRange(
                            lastClickedIndex,
                            index,
                            data
                        );


                        lastClickedIndex =
                            index;


                        saveCurrentTabState();


                        renderCurrentRows();


                        return;
                    }


                    // =========================================
                    // NORMAL CLICK
                    // =========================================

                    if (
                        checkbox.checked
                    ) {

                        selectedSymbols.add(
                            symbol
                        );

                    } else {

                        selectedSymbols.delete(
                            symbol
                        );

                    }


                    // Remember this row for
                    // the next Shift + click

                    lastClickedIndex =
                        index;


                    // Save ONLY this tab's state

                    saveCurrentTabState();


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
            //
            // IMPORTANT:
            // These are INSIDE the symbol cell.
            // They are hidden until this row is hovered.
            // =================================================

            const actions =
                document.createElement(
                    "div"
                );


            actions.className =
                "symbol-actions";


            actions.style.display =
                "none";


            // =================================================
            // COPY BUTTON
            // =================================================

            const copyButton =
                document.createElement(
                    "button"
                );


            copyButton.type =
                "button";


            copyButton.className =
                "symbol-action copy-action";


            copyButton.textContent =
                "Copy";


            copyButton.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    copySelected(
                        copyButton
                    );

                }
            );


            actions.appendChild(
                copyButton
            );


            // =================================================
            // UNVISIT BUTTON
            // =================================================

            const state =
                getSelectionState();


            if (
                state.visitedCount > 0
            ) {

                const unvisitButton =
                    document.createElement(
                        "button"
                    );


                unvisitButton.type =
                    "button";


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


            symbolContainer.appendChild(
                actions
            );


            // =================================================
            // SHOW ACTIONS WHEN MOUSE ENTERS THIS ROW
            // =================================================

            row.addEventListener(
                "mouseenter",
                () => {

                    if (
                        selectedSymbols.size === 0
                    ) {

                        return;

                    }


                    actions.style.display =
                        "flex";

                }
            );


            // =================================================
            // HIDE ACTIONS WHEN MOUSE LEAVES THIS ROW
            // =================================================

            row.addEventListener(
                "mouseleave",
                () => {

                    actions.style.display =
                        "none";

                }
            );


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