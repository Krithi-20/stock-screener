import {
    getDisplayedCompanies
} from "./tabs.js";

import {
    formatChange,
    formatPercent,
    escapeHtml
} from "./utils.js";

import {
    addSymbolFromTable
} from "./watchlist.js";


// =========================================================
// CUSTOM CHANGE % COLOUR RULES
// =========================================================

const COLOR_RULES_KEY =
    "strykr-custom-change-color-rules";

const COLOR_ASSIGNMENTS_KEY =
    "strykr-custom-change-color-assignments";

function getTradingDate() {
    const now = new Date();

    return (
        now.getFullYear() + "-" +
        String(now.getMonth() + 1).padStart(2, "0") + "-" +
        String(now.getDate()).padStart(2, "0")
    );
}

// ---------------------------------------------------------
// LOAD RULES
// ---------------------------------------------------------

function getColorRules() {
    try {
        const rules = JSON.parse(
            localStorage.getItem(COLOR_RULES_KEY)
        );

        return Array.isArray(rules) ? rules : [];
    } catch (error) {
        return [];
    }
}

// ---------------------------------------------------------
// SAVE RULES
// ---------------------------------------------------------

function saveColorRules(rules) {
    localStorage.setItem(
        COLOR_RULES_KEY,
        JSON.stringify(rules)
    );
}

// ---------------------------------------------------------
// LOAD DAILY ASSIGNMENTS
// ---------------------------------------------------------

let cachedColorAssignments = null;

function getColorAssignments() {
    const today = getTradingDate();

    if (
        cachedColorAssignments &&
        cachedColorAssignments.date === today
    ) {
        return cachedColorAssignments;
    }

    try {
        const stored = JSON.parse(
            localStorage.getItem(COLOR_ASSIGNMENTS_KEY)
        );

        if (
            stored &&
            stored.date === today &&
            stored.assignments &&
            typeof stored.assignments === "object"
        ) {
            cachedColorAssignments = stored;
        } else {
            cachedColorAssignments = {
                date: today,
                assignments: {}
            };

            localStorage.setItem(
                COLOR_ASSIGNMENTS_KEY,
                JSON.stringify(cachedColorAssignments)
            );
        }
    } catch (error) {
        cachedColorAssignments = {
            date: today,
            assignments: {}
        };
    }

    return cachedColorAssignments;
}

function saveColorAssignments(assignments) {

    cachedColorAssignments = assignments;

    localStorage.setItem(
        COLOR_ASSIGNMENTS_KEY,
        JSON.stringify(assignments)
    );
}

// ---------------------------------------------------------
// ASSIGN COLOUR ON FIRST MATCH
// ---------------------------------------------------------

function updateCustomColorAssignment(company) {
    const changePercent =
        Number(Number(company.changePercent).toFixed(2));

    const symbol =
        company.nseSymbol;

    if (
        !symbol ||
        !Number.isFinite(changePercent) ||
        changePercent <= 0
    ) {
        return;
    }

    const stored =
        getColorAssignments();

    // Already assigned today → NEVER change it.
    if (stored.assignments[symbol]) {
        return;
    }

    const rules =
        getColorRules();

    const matchingRule =
        rules.find(rule =>
            changePercent >= rule.lower &&
            changePercent < rule.upper
        );

    if (!matchingRule) {
        return;
    }

    stored.assignments[symbol] = {
        color: matchingRule.color,
        lower: matchingRule.lower,
        upper: matchingRule.upper
    };

    saveColorAssignments(stored);
}

// ---------------------------------------------------------
// RESET DAILY COLOUR ASSIGNMENTS
// ---------------------------------------------------------

function resetColorAssignments() {
    const freshAssignments = {
        date: getTradingDate(),
        assignments: {}
    };

    saveColorAssignments(freshAssignments);
}

// =========================================================
// FILTER MENU AND COLOUR RULE UI
// =========================================================

function initializeColorRuleControls() {

    const menuButton =
        document.getElementById("filterMenuButton");

    const dropdown =
        document.getElementById("filterDropdown");

    const marketCapOption =
        document.getElementById("marketCapFilterOption");

    const colorOption =
        document.getElementById("changeColorFilterOption");

    const marketCapPanel =
        document.getElementById("marketCapPanel");

    const colorPanel =
        document.getElementById("changeColorPanel");

    const rulesContainer =
        document.getElementById("colorRulesContainer");

    const addButton =
        document.getElementById("addColorRuleButton");

    const saveButton =
        document.getElementById("saveColorRulesButton");

    const resetButton =
        document.getElementById("resetColorRulesButton");

    const closeButton =
        document.getElementById("closeColorPanel");

    const message =
        document.getElementById("colorRulesMessage");

    if (
        !menuButton ||
        !dropdown ||
        !rulesContainer
    ) {
        return;
    }

    // -----------------------------------------------------
    // SHOW / HIDE MENU
    // -----------------------------------------------------

    function closeAllPanels() {
        dropdown.style.display = "none";
        marketCapPanel.style.display = "none";
        colorPanel.style.display = "none";

        menuButton.setAttribute(
            "aria-expanded",
            "false"
        );
    }

    menuButton.addEventListener("click", event => {
        event.stopPropagation();

        const isOpen =
            dropdown.style.display !== "none";

        closeAllPanels();

        if (!isOpen) {
            dropdown.style.display = "block";

            menuButton.setAttribute(
                "aria-expanded",
                "true"
            );
        }
    });

    marketCapOption.addEventListener("click", () => {
        dropdown.style.display = "none";
        marketCapPanel.style.display = "block";
    });

    colorOption.addEventListener("click", () => {
        dropdown.style.display = "none";
        marketCapPanel.style.display = "none";

        colorPanel.style.display = "block";

        menuButton.setAttribute(
            "aria-expanded",
            "true"
        );

        renderColorRules();
    });

    closeButton.addEventListener("click", () => {
        closeAllPanels();
    });

    document.addEventListener("click", event => {
        if (
            !event.target.closest(".filter-menu-container")
        ) {
            closeAllPanels();
        }
    });

    // -----------------------------------------------------
    // CREATE RULE INPUT
    // -----------------------------------------------------

    function createColorRule(rule = {}) {

        const ruleElement =
            document.createElement("div");

        ruleElement.className = "color-rule";

        const lowerInput =
            document.createElement("input");

        lowerInput.type = "number";
        lowerInput.min = "0";
        lowerInput.max = "100";
        lowerInput.step = "0.1";
        lowerInput.placeholder = "From";
        lowerInput.value = rule.lower ?? "";

        lowerInput.setAttribute(
            "aria-label",
            "Lower percentage"
        );

        const upperInput =
            document.createElement("input");

        upperInput.type = "number";
        upperInput.min = "0";
        upperInput.max = "100";
        upperInput.step = "0.1";
        upperInput.placeholder = "To";
        upperInput.value = rule.upper ?? "";

        upperInput.setAttribute(
            "aria-label",
            "Upper percentage"
        );

        const colorInput =
            document.createElement("input");

        colorInput.type = "color";
        colorInput.value = rule.color || "#facc15";

        colorInput.setAttribute(
            "aria-label",
            "Range colour"
        );

        const removeButton =
            document.createElement("button");

        removeButton.type = "button";
        removeButton.className = "remove-color-rule";
        removeButton.textContent = "×";

        removeButton.addEventListener("click", () => {

    ruleElement.remove();

    try {

        // Save the remaining rules immediately.
        const rules = collectRules();

        saveColorRules(rules);

        // Old assignments must not survive rule removal.
        resetColorAssignments();

        message.style.color = "#16803c";
        message.textContent =
            "Range removed. Remaining rules saved.";

        renderCurrentRows();

    } catch (error) {

        message.style.color = "#dc2626";
        message.textContent =
            "Range removed from editor. Please correct the remaining ranges and save.";

    }

});

        ruleElement.append(
            lowerInput,
            upperInput,
            colorInput,
            removeButton
        );

        rulesContainer.appendChild(ruleElement);
    }

    // -----------------------------------------------------
    // RENDER SAVED RULES
    // -----------------------------------------------------

    function renderColorRules() {

        rulesContainer.innerHTML = "";

        const rules = getColorRules();

        if (rules.length === 0) {
            createColorRule();
        } else {
            rules.forEach(rule => {
                createColorRule(rule);
            });
        }

        message.textContent = "";
    }

    // -----------------------------------------------------
    // ADD RULE
    // -----------------------------------------------------

    addButton.addEventListener("click", () => {
        createColorRule();
    });

    // -----------------------------------------------------
    // READ AND VALIDATE RULES
    // -----------------------------------------------------

    function collectRules() {

        const rows =
            [...rulesContainer.querySelectorAll(".color-rule")];

        const rules = [];

        for (const row of rows) {

            const inputs =
                row.querySelectorAll("input");

            const lowerText = inputs[0].value.trim();
            const upperText = inputs[1].value.trim();

            const color = inputs[2].value;

            if (
                lowerText === "" ||
                upperText === ""
            ) {
                throw new Error(
                    "Please fill both lower and upper values."
                );
            }

            // At most one decimal place.
            if (
                !/^\d{1,3}(?:\.\d)?$/.test(lowerText) ||
                !/^\d{1,3}(?:\.\d)?$/.test(upperText)
            ) {
                throw new Error(
                    "Use numbers with at most one decimal place."
                );
            }

            const lower = Number(lowerText);
            const upper = Number(upperText);

            if (
                lower < 0 ||
                upper > 100 ||
                lower >= upper
            ) {
                throw new Error(
                    "Each range must be between 0 and 100, with the upper value greater than the lower value."
                );
            }

            rules.push({
                lower,
                upper,
                color
            });
        }

        // Sort by lower boundary.
        rules.sort((a, b) => a.lower - b.lower);

        // Reject overlapping ranges.
        for (let i = 1; i < rules.length; i++) {

            if (
                rules[i].lower < rules[i - 1].upper
            ) {
                throw new Error(
                    "Ranges cannot overlap. Adjacent ranges are allowed."
                );
            }
        }

        return rules;
    }

    // -----------------------------------------------------
    // SAVE RULES
    // -----------------------------------------------------

    saveButton.addEventListener("click", () => {

        try {

            const rules = collectRules();

            saveColorRules(rules);

            // New configuration → fresh assignments.
            resetColorAssignments();

            message.style.color = "#16803c";

            message.textContent =
                "Rules saved. Colour assignments have been reset.";

            renderCurrentRows();

        } catch (error) {

            message.style.color = "#dc2626";
            message.textContent = error.message;

        }
    });

    // -----------------------------------------------------
    // RESET COLOURS
    // -----------------------------------------------------

    resetButton.addEventListener("click", () => {

        const confirmed = window.confirm(
            "Reset all stock colour assignments for today? Saved rules will remain unchanged."
        );

        if (!confirmed) {
            return;
        }

        resetColorAssignments();

        message.style.color = "#16803c";

        message.textContent =
            "Colour assignments reset. Stocks will receive new colours when they next match a rule.";

        renderCurrentRows();
    });
}


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
// GLOBAL RANKING FREEZE STATE
// =========================================================

let rankingFrozen = false;

const frozenRankingOrders = new Map();


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

            return company.companyName;
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

    // Copy only selected symbols that have NOT
    // already been copied in the current tab.
    const symbols = [...selectedSymbols].filter(
        symbol => !copiedSymbols.has(symbol)
    );

    if (symbols.length === 0) {
        return;
    }

    // Prevent double-clicking while copying.
    if (button.disabled) {
        return;
    }

    button.disabled = true;

    // Copy only the newly selected symbols.
    const copied = await copySymbols(symbols);

    // Update state only if copying succeeded.
    if (copied) {

        symbols.forEach(symbol => {

            visitedSymbols.add(symbol);
            copiedSymbols.add(symbol);

        });

        // Save this tab's state.
        saveCurrentTabState();

        button.textContent = "✓ Copied";
        button.classList.add("copied");
        button.disabled = true;

        setTimeout(() => {

            button.textContent = "Copy";
            button.classList.remove("copied");
            button.disabled = false;

        }, 1500);

    } else {

        button.textContent = "Copy failed";
        button.classList.add("copy-failed");

        setTimeout(() => {

            button.textContent = "Copy";
            button.classList.remove("copy-failed");
            button.disabled = false;

        }, 1500);
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

    // Save the state of the tab we are leaving.
    saveCurrentTabState();

    currentCompanies = companies;

    currentView = view;

    // Assign colours only when new market data
    // is received, not on every table redraw.
    currentCompanies.forEach(company => {
        updateCustomColorAssignment(company);
    });

    // Load the independent state belonging
    // to the new tab.
    activateTabState(currentView);

    renderCurrentRows();
}

// =========================================================
// FREEZE / MELT RANKINGS
// =========================================================

function preserveFrozenOrder(data, view) {

    const frozenSymbols =
        frozenRankingOrders.get(view);

    if (!frozenSymbols) {
        return data;
    }

    const companiesBySymbol = new Map(
        data.map(company => [
            company.nseSymbol,
            company
        ])
    );

    const orderedData = [];

    // Keep companies in their frozen positions.
    frozenSymbols.forEach(symbol => {

        const company =
            companiesBySymbol.get(symbol);

        if (company) {
            orderedData.push(company);
        }

    });

    // Append any newly eligible companies at the end.
    const frozenSymbolSet =
        new Set(frozenSymbols);

    data.forEach(company => {

        if (!frozenSymbolSet.has(company.nseSymbol)) {
            orderedData.push(company);
        }

    });

    return orderedData;
}


function initializeRankingControl() {

    const freezeButton =
        document.getElementById(
            "freezeRankingButton"
        );

    if (!freezeButton) {
        return;
    }

    freezeButton.addEventListener(
        "click",
        () => {

            // FREEZE
            if (!rankingFrozen) {

                // Capture the current order of all
                // three ranking tabs.

                const views = [
                    "all",
                    "performers",
                    "losers"
                ];

                views.forEach(view => {

                    const displayed =
                        getDisplayedCompanies(
                            currentCompanies,
                            view
                        );

                    frozenRankingOrders.set(
                        view,
                        displayed.map(
                            company => company.nseSymbol
                        )
                    );

                });

                rankingFrozen = true;

                freezeButton.textContent = "Melt";

            }

            // MELT
            else {

                rankingFrozen = false;

                frozenRankingOrders.clear();

                freezeButton.textContent = "Freeze";

            }

            // Immediately redraw using the appropriate order.
            // Latest company data is used in both cases.

            renderCurrentRows();

        }
    );

}

// =========================================================
// RENDER CURRENT ROWS
// =========================================================

function renderCurrentRows() {

    const table =
        document.getElementById(
            "companyTable"
        );


    let data =
    getDisplayedCompanies(
        currentCompanies,
        currentView
    );

    // When frozen, retain the captured ranking order.
    if (rankingFrozen) {

        data = preserveFrozenOrder(
            data,
            currentView
        );

    }

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
const assignments =
    getColorAssignments().assignments;
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
// ADD TO WATCHLIST BUTTON
// =================================================

const watchlistButton =
    document.createElement(
        "button"
    );


watchlistButton.type =
    "button";


watchlistButton.className =
    "symbol-action watchlist-action";


watchlistButton.textContent =
    "+ List";

watchlistButton.addEventListener(
    "click",
    event => {

        event.stopPropagation();


        const symbols =
            [...selectedSymbols];


        // If nothing is selected,
        // use the company whose button was clicked.

        if (
            symbols.length === 0
        ) {

            addSymbolFromTable(
                [symbol],
                watchlistButton
            );

            return;

        }


        // Use ALL selected companies

        addSymbolFromTable(
            symbols,
            watchlistButton
        );

    }
);


actions.appendChild(
    watchlistButton
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
const changePercentCell =
    createCell(
        changeClass,
        changePercent
    );

// Apply locked custom colour.
// Visited rows always retain their grey appearance.

if (!isVisited) {
    const assignment = assignments[symbol];

    if (assignment) {
        changePercentCell.style.backgroundColor =
            assignment.color;

        changePercentCell.classList.add(
            "custom-change-highlight"
        );
    }
}

row.appendChild(changePercentCell);


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

initializeRankingControl();
initializeColorRuleControls();