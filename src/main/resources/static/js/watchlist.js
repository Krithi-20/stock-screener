// =========================================================
// WATCHLIST STATE
// =========================================================

const STORAGE_KEY =
    "strykR_watchlists";

const MAX_WATCHLISTS =
    5;

const MAX_SYMBOLS =
    40;


// =========================================================
// LOAD WATCHLISTS
// =========================================================

function loadWatchlists() {

    try {

        const stored =
            localStorage.getItem(
                STORAGE_KEY
            );

        if (!stored) {
            return [];
        }

        const parsed =
            JSON.parse(stored);

        if (!Array.isArray(parsed)) {
            return [];
        }

        return parsed;

    } catch (error) {

        console.error(
            "Failed to load watchlists:",
            error
        );

        return [];
    }
}


// =========================================================
// SAVE WATCHLISTS
// =========================================================

function saveWatchlists() {

    try {

        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(watchlists)
        );

    } catch (error) {

        console.error(
            "Failed to save watchlists:",
            error
        );
    }
}


// =========================================================
// GLOBAL WATCHLISTS
// =========================================================

let watchlists =
    loadWatchlists();

let activeWatchlistIndex =
    null;


// =========================================================
// INITIALIZE
// =========================================================

export function initializeWatchlists() {

    renderWatchlists();

}


// =========================================================
// CREATE WATCHLIST
// =========================================================

function createWatchlist() {

    if (
        watchlists.length >=
        MAX_WATCHLISTS
    ) {

        alert(
            "You can create a maximum of 5 watchlists."
        );

        return;
    }


    const name =
        prompt(
            "Enter a name for your watchlist:"
        );


    if (
        name === null
    ) {

        return;
    }


    const trimmedName =
        name.trim();


    if (
        trimmedName.length === 0
    ) {

        alert(
            "Watchlist name cannot be empty."
        );

        return;
    }


    const duplicate =
        watchlists.some(
            list =>
                list.name.toLowerCase() ===
                trimmedName.toLowerCase()
        );


    if (
        duplicate
    ) {

        alert(
            "A watchlist with this name already exists."
        );

        return;
    }


    watchlists.push(
        {
            name:
                trimmedName,

            symbols:
                []
        }
    );


    saveWatchlists();


    activeWatchlistIndex =
        watchlists.length - 1;


    renderWatchlists();

}


// =========================================================
// DELETE WATCHLIST
// =========================================================

function deleteWatchlist(
    index
) {

    const list =
        watchlists[index];


    if (!list) {
        return;
    }


    const confirmed =
        confirm(
            `Delete "${list.name}" watchlist?`
        );


    if (!confirmed) {
        return;
    }


    watchlists.splice(
        index,
        1
    );


    saveWatchlists();


    if (
        watchlists.length === 0
    ) {

        activeWatchlistIndex =
            null;

    } else if (
        activeWatchlistIndex === index
    ) {

        activeWatchlistIndex =
            Math.min(
                index,
                watchlists.length - 1
            );

    } else if (
        activeWatchlistIndex > index
    ) {

        activeWatchlistIndex--;

    }


    renderWatchlists();

}


// =========================================================
// OPEN WATCHLIST
// =========================================================

function openWatchlist(
    index
) {

    if (
        !watchlists[index]
    ) {

        return;
    }


    activeWatchlistIndex =
        index;


    renderWatchlists();

}


// =========================================================
// ADD SYMBOL
// =========================================================

function addSymbolToWatchlist(
    index,
    symbol
) {

    const list =
        watchlists[index];


    if (!list) {
        return false;
    }


    // =====================================================
    // DUPLICATE
    // =====================================================

    // If the symbol already exists,
    // simply skip it.
    //
    // IMPORTANT:
    // Do NOT show an alert.
    // The user should not have to manually
    // remove duplicates.

    if (
        list.symbols.includes(
            symbol
        )
    ) {

        return false;

    }


    // =====================================================
    // MAXIMUM 40 SYMBOLS
    // =====================================================

    if (
        list.symbols.length >=
        MAX_SYMBOLS
    ) {

        return false;

    }


    list.symbols.push(
        symbol
    );


    return true;

}


// =========================================================
// REMOVE SYMBOL
// =========================================================

function removeSymbolFromWatchlist(
    index,
    symbol
) {

    const list =
        watchlists[index];


    if (!list) {
        return;
    }


    list.symbols =
        list.symbols.filter(
            item =>
                item !== symbol
        );


    saveWatchlists();


    renderWatchlists();

}


// =========================================================
// ASK WHICH WATCHLIST
// =========================================================

// =========================================================
// ADD SELECTED SYMBOLS FROM TABLE
// =========================================================

// =========================================================
// ADD SELECTED SYMBOLS FROM TABLE
// =========================================================

export function addSymbolFromTable(
    symbols,
    anchorButton
) {

    // =====================================================
    // NORMALIZE INPUT
    // =====================================================

    if (
        !Array.isArray(symbols)
    ) {

        symbols = [
            symbols
        ];

    }


    symbols =
        [...new Set(
            symbols.filter(
                symbol =>
                    symbol !== null &&
                    symbol !== undefined &&
                    symbol.trim().length > 0
            )
        )];


    if (
        symbols.length === 0
    ) {

        return;

    }


    // =====================================================
    // NO WATCHLISTS
    // =====================================================

    if (
        watchlists.length === 0
    ) {

        showWatchlistNotification(
            "No watchlists",
            "Create a watchlist first.",
            "warning"
        );

        return;

    }


    // =====================================================
    // REMOVE EXISTING PICKER
    // =====================================================

    closeWatchlistPicker();


    // =====================================================
    // CREATE PICKER
    // =====================================================

    const picker =
        document.createElement(
            "div"
        );


    picker.className =
        "watchlist-picker";


    // =====================================================
    // TITLE
    // =====================================================

    const title =
        document.createElement(
            "div"
        );


    title.className =
        "watchlist-picker-title";


    title.textContent =
        `Add ${symbols.length} ${
            symbols.length === 1
                ? "company"
                : "companies"
        } to:`;


    picker.appendChild(
        title
    );


    // =====================================================
    // LIST OPTIONS
    // =====================================================

    const listContainer =
        document.createElement(
            "div"
        );


    listContainer.className =
        "watchlist-picker-list";


    watchlists.forEach(
        (list, index) => {

            const option =
                document.createElement(
                    "label"
                );


            option.className =
                "watchlist-picker-option";


            const checkbox =
                document.createElement(
                    "input"
                );


            checkbox.type =
                "checkbox";


            checkbox.value =
                index;


            // Disable completely full lists

            if (
                list.symbols.length >=
                MAX_SYMBOLS
            ) {

                option.classList.add(
                    "full"
                );

                checkbox.disabled =
                    true;

            }


            const info =
                document.createElement(
                    "div"
                );


            info.className =
                "watchlist-picker-option-info";


            const name =
                document.createElement(
                    "div"
                );


            name.className =
                "watchlist-picker-option-name";


            name.textContent =
                list.name;


            const count =
                document.createElement(
                    "div"
                );


            count.className =
                "watchlist-picker-option-count";


            count.textContent =
                `${list.symbols.length}/40`;


            info.appendChild(
                name
            );

            info.appendChild(
                count
            );


            option.appendChild(
                checkbox
            );

            option.appendChild(
                info
            );


            if (
                list.symbols.length >=
                MAX_SYMBOLS
            ) {

                const full =
                    document.createElement(
                        "span"
                    );


                full.className =
                    "watchlist-picker-full";


                full.textContent =
                    "Full";


                option.appendChild(
                    full
                );

            }


            listContainer.appendChild(
                option
            );

        }
    );


    picker.appendChild(
        listContainer
    );


    // =====================================================
    // ACTIONS
    // =====================================================

    const actions =
        document.createElement(
            "div"
        );


    actions.className =
        "watchlist-picker-actions";


    const cancelButton =
        document.createElement(
            "button"
        );


    cancelButton.type =
        "button";


    cancelButton.className =
        "watchlist-picker-cancel";


    cancelButton.textContent =
        "Cancel";


    cancelButton.addEventListener(
        "click",
        event => {

            event.stopPropagation();

            closeWatchlistPicker();

        }
    );


    const addButton =
        document.createElement(
            "button"
        );


    addButton.type =
        "button";


    addButton.className =
        "watchlist-picker-add";


    addButton.textContent =
        "Add";


    addButton.disabled =
        true;


    // =====================================================
    // ENABLE ADD BUTTON WHEN A LIST IS CHECKED
    // =====================================================

    const checkboxes =
        listContainer.querySelectorAll(
            'input[type="checkbox"]'
        );


    checkboxes.forEach(
        checkbox => {

            checkbox.addEventListener(
                "change",
                () => {

                    const selectedLists =
                        listContainer.querySelectorAll(
                            'input[type="checkbox"]:checked'
                        );


                    addButton.disabled =
                        selectedLists.length === 0;

                }
            );

        }
    );


    // =====================================================
    // ADD BUTTON
    // =====================================================

    addButton.addEventListener(
        "click",
        event => {

            event.stopPropagation();


            const selectedLists =
                [...listContainer.querySelectorAll(
                    'input[type="checkbox"]:checked'
                )];


            if (
                selectedLists.length === 0
            ) {

                return;

            }


            const results = [];


            selectedLists.forEach(
                checkbox => {

                    const index =
                        Number(
                            checkbox.value
                        );


                    const list =
                        watchlists[index];


                    if (!list) {
                        return;
                    }


                    let addedCount =
                        0;

                    let duplicateCount =
                        0;

                    let fullCount =
                        0;


                    symbols.forEach(
                        symbol => {

                            // =================================
                            // DUPLICATE
                            // =================================

                            if (
                                list.symbols.includes(
                                    symbol
                                )
                            ) {

                                duplicateCount++;

                                return;

                            }


                            // =================================
                            // LIST FULL
                            // =================================

                            if (
                                list.symbols.length >=
                                MAX_SYMBOLS
                            ) {

                                fullCount++;

                                return;

                            }


                            list.symbols.push(
                                symbol
                            );


                            addedCount++;

                        }
                    );


                    results.push(
                        {
                            name:
                                list.name,

                            added:
                                addedCount,

                            duplicates:
                                duplicateCount,

                            full:
                                fullCount,

                            total:
                                list.symbols.length
                        }
                    );

                }
            );


            // =================================================
            // SAVE ONCE
            // =================================================

            saveWatchlists();


            // =================================================
            // CLOSE PICKER
            // =================================================

            closeWatchlistPicker();


            // =================================================
            // REFRESH WATCHLIST
            // =================================================

            renderWatchlists();


            // =================================================
            // SHOW RESULT
            // =================================================

            results.forEach(
                result => {

                    if (
                        result.added > 0
                    ) {

                        let message =
                            `${result.added} ${
                                result.added === 1
                                    ? "company"
                                    : "companies"
                            } moved to "${result.name}" — ${
                                result.total
                            }/40`;


                        if (
                            result.duplicates > 0
                        ) {

                            message +=
                                ` · ${
                                    result.duplicates
                                } already existed`;

                        }


                        showWatchlistNotification(
                            "Companies added",
                            message,
                            "success"
                        );

                    } else if (
                        result.full > 0
                    ) {

                        showWatchlistNotification(
                            "Watchlist full",
                            `"${result.name}" is full — 40/40`,
                            "warning"
                        );

                    } else if (
                        result.duplicates > 0
                    ) {

                        showWatchlistNotification(
                            "Already in watchlist",
                            `All selected companies already exist in "${result.name}" — ${result.total}/40`,
                            "warning"
                        );

                    }

                }
            );

        }
    );


    actions.appendChild(
        cancelButton
    );

    actions.appendChild(
        addButton
    );


    picker.appendChild(
        actions
    );


    document.body.appendChild(
        picker
    );


    // =====================================================
    // POSITION BESIDE BUTTON
    // =====================================================

    positionWatchlistPicker(
        picker,
        anchorButton
    );


    // =====================================================
    // CLOSE WHEN CLICKING OUTSIDE
    // =====================================================

    setTimeout(
        () => {

            document.addEventListener(
                "click",
                handleWatchlistOutsideClick
            );

        },
        0
    );

}

// =========================================================
// WATCHLIST PICKER STATE
// =========================================================

let activeWatchlistPicker =
    null;


// =========================================================
// CLOSE WATCHLIST PICKER
// =========================================================

function closeWatchlistPicker() {

    if (
        activeWatchlistPicker
    ) {

        activeWatchlistPicker.remove();

        activeWatchlistPicker =
            null;

    }


    document.removeEventListener(
        "click",
        handleWatchlistOutsideClick
    );

}

// =========================================================
// OUTSIDE CLICK
// =========================================================

function handleWatchlistOutsideClick(
    event
) {

    if (
        !activeWatchlistPicker
    ) {

        return;

    }


    if (
        activeWatchlistPicker.contains(
            event.target
        )
    ) {

        return;

    }


    closeWatchlistPicker();

}


// =========================================================
// POSITION PICKER
// =========================================================

function positionWatchlistPicker(
    picker,
    button
) {

    const rect =
        button.getBoundingClientRect();


    const pickerWidth =
        240;


    const pickerHeight =
        250;


    let left =
        rect.right + 8;


    let top =
        rect.top;


    // Prevent going outside right edge

    if (
        left + pickerWidth >
        window.innerWidth - 10
    ) {

        left =
            rect.left -
            pickerWidth -
            8;

    }


    // Prevent going below screen

    if (
        top + pickerHeight >
        window.innerHeight - 10
    ) {

        top =
            window.innerHeight -
            pickerHeight -
            10;

    }


    if (
        top < 10
    ) {

        top = 10;

    }


    picker.style.left =
        `${left}px`;

    picker.style.top =
        `${top}px`;


    activeWatchlistPicker =
        picker;

}


// =========================================================
// WATCHLIST NOTIFICATION
// =========================================================

function showWatchlistNotification(
    title,
    message,
    type
) {

    const notification =
        document.createElement(
            "div"
        );


    notification.className =
        "watchlist-notification " +
        type;


    const titleElement =
        document.createElement(
            "div"
        );


    titleElement.className =
        "watchlist-notification-title";


    titleElement.textContent =
        title;


    const messageElement =
        document.createElement(
            "div"
        );


    messageElement.className =
        "watchlist-notification-message";


    messageElement.textContent =
        message;


    notification.appendChild(
        titleElement
    );

    notification.appendChild(
        messageElement
    );


    document.body.appendChild(
        notification
    );


    setTimeout(
        () => {

            notification.remove();

        },
        3000
    );

}

// =========================================================
// MANUALLY ADD SYMBOL
// =========================================================

function addSymbolManually() {

    if (
        activeWatchlistIndex === null
    ) {

        return;
    }


    const list =
        watchlists[
            activeWatchlistIndex
        ];


    if (!list) {
        return;
    }


    if (
        list.symbols.length >=
        MAX_SYMBOLS
    ) {

        alert(
            `"${list.name}" already contains 40 symbols.`
        );

        return;
    }


    const symbol =
        prompt(
            "Enter NSE symbol:"
        );


    if (
        symbol === null
    ) {

        return;
    }


    const trimmedSymbol =
        symbol
            .trim()
            .toUpperCase();


    if (
        trimmedSymbol.length === 0
    ) {

        return;
    }


    addSymbolToWatchlist(
        activeWatchlistIndex,
        trimmedSymbol
    );


    renderWatchlists();

}


// =========================================================
// RENDER WATCHLISTS
// =========================================================

export function renderWatchlists(
    companies = []
) {

    const container =
        document.getElementById(
            "watchlistContent"
        );


    if (!container) {
        return;
    }


    // =====================================================
    // HEADER
    // =====================================================

    container.innerHTML =
        "";


    const header =
        document.createElement(
            "div"
        );


    header.className =
        "watchlist-header";


    const title =
        document.createElement(
            "h2"
        );


    title.textContent =
        "Watchlists";


    const addButton =
        document.createElement(
            "button"
        );


    addButton.type =
        "button";


    addButton.className =
        "watchlist-add-button";


    addButton.textContent =
        "+";


    addButton.title =
        "Create watchlist";


    addButton.addEventListener(
        "click",
        createWatchlist
    );


    if (
        watchlists.length >=
        MAX_WATCHLISTS
    ) {

        addButton.disabled =
            true;

        addButton.title =
            "Maximum 5 watchlists reached";

    }


    header.appendChild(
        title
    );

    header.appendChild(
        addButton
    );


    container.appendChild(
        header
    );


    // =====================================================
    // NO WATCHLISTS
    // =====================================================

    if (
        watchlists.length === 0
    ) {

        const empty =
            document.createElement(
                "div"
            );


        empty.className =
            "watchlist-empty";


        empty.innerHTML = `
            <div class="watchlist-empty-title">
                No watchlists yet
            </div>

            <div class="watchlist-empty-text">
                Click + to create your first watchlist.
            </div>
        `;


        container.appendChild(
            empty
        );


        return;
    }


    // =====================================================
    // WATCHLIST SELECTOR
    // =====================================================

    const listBar =
        document.createElement(
            "div"
        );


    listBar.className =
        "watchlist-list-bar";


    watchlists.forEach(
        (list, index) => {

            const wrapper =
                document.createElement(
                    "div"
                );


            wrapper.className =
                "watchlist-list-wrapper";


            const listButton =
                document.createElement(
                    "button"
                );


            listButton.type =
                "button";


            listButton.className =
                "watchlist-list-button";


            if (
                index ===
                activeWatchlistIndex
            ) {

                listButton.classList.add(
                    "active"
                );

            }


            listButton.textContent =
                list.name;


            listButton.addEventListener(
                "click",
                () => {

                    openWatchlist(
                        index
                    );

                }
            );


            const deleteListButton =
                document.createElement(
                    "button"
                );


            deleteListButton.type =
                "button";


            deleteListButton.className =
                "watchlist-delete-list";


            deleteListButton.textContent =
                "×";


            deleteListButton.title =
                "Delete watchlist";


            deleteListButton.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    deleteWatchlist(
                        index
                    );

                }
            );


            wrapper.appendChild(
                listButton
            );

            wrapper.appendChild(
                deleteListButton
            );


            listBar.appendChild(
                wrapper
            );

        }
    );


    container.appendChild(
        listBar
    );


    // =====================================================
    // DEFAULT OPEN LIST
    // =====================================================

    if (
        activeWatchlistIndex === null
    ) {

        activeWatchlistIndex =
            0;

    }


    const activeList =
        watchlists[
            activeWatchlistIndex
        ];


    if (!activeList) {
        return;
    }


    // =====================================================
    // LIST HEADER
    // =====================================================

    const listHeader =
        document.createElement(
            "div"
        );


    listHeader.className =
        "watchlist-list-header";


    const listTitle =
        document.createElement(
            "div"
        );


    listTitle.className =
        "watchlist-list-title";


    listTitle.textContent =
        activeList.name;


    const listInfo =
        document.createElement(
            "span"
        );


    listInfo.className =
        "watchlist-list-count";


    listInfo.textContent =
        `${activeList.symbols.length}/40`;


    const addSymbolButton =
        document.createElement(
            "button"
        );


    addSymbolButton.type =
        "button";


    addSymbolButton.className =
        "watchlist-symbol-add";


    addSymbolButton.textContent =
        "+ Add";


    addSymbolButton.addEventListener(
        "click",
        addSymbolManually
    );


    if (
        activeList.symbols.length >=
        MAX_SYMBOLS
    ) {

        addSymbolButton.disabled =
            true;

    }


   // =====================================================
// HEADER ACTIONS
// =====================================================

const headerActions =
    document.createElement(
        "div"
    );

headerActions.className =
    "watchlist-header-actions";


// =====================================================
// CHARTS BUTTON
// =====================================================

const chartsButton =
    document.createElement(
        "button"
    );

chartsButton.type =
    "button";

chartsButton.className =
    "watchlist-charts-button";

chartsButton.textContent =
    "Charts";

chartsButton.title =
    "Open charts";

chartsButton.addEventListener(
    "click",
    event => {

        event.stopPropagation();

        openChartsView(
            companies
        );

    }
);


// =====================================================
// ADD BUTTON
// =====================================================

headerActions.appendChild(
    addSymbolButton
);

headerActions.appendChild(
    chartsButton
);


listHeader.appendChild(
    listTitle
);

listHeader.appendChild(
    listInfo
);

listHeader.appendChild(
    headerActions
);


    container.appendChild(
        listHeader
    );


    // =====================================================
    // TABLE CONTAINER
    // =====================================================

    const tableContainer =
        document.createElement(
            "div"
        );


    tableContainer.className =
        "watchlist-table-container";


    const table =
        document.createElement(
            "table"
        );


    table.className =
        "watchlist-table";


    // =====================================================
    // TABLE HEADER
    // =====================================================

    const thead =
        document.createElement(
            "thead"
        );


    thead.innerHTML = `
        <tr>
            <th>NSE Symbol</th>
            <th>Change %</th>
            <th>Live Price</th>
        </tr>
    `;


    table.appendChild(
        thead
    );


    // =====================================================
    // TABLE BODY
    // =====================================================

    const tbody =
        document.createElement(
            "tbody"
        );


    activeList.symbols.forEach(
        symbol => {

            const company =
                companies.find(
                    item =>
                        item.nseSymbol ===
                        symbol
                );


            const row =
                document.createElement(
                    "tr"
                );


            row.className =
                "watchlist-row";

            row.addEventListener(
    "click",
    event => {

        // Do not open chart when
        // delete button is clicked.

        if (
            event.target.closest(
                ".watchlist-delete-symbol"
            )
        ) {
            return;
        }

        // Charts view must already be open
        // before selecting a stock.

        if (
            chartsViewOpen
        ) {

            selectChartSymbol(
                symbol
            );

        }

    }
);
            // =================================================
            // SYMBOL
            // =================================================

            const symbolCell =
                document.createElement(
                    "td"
                );


            symbolCell.className =
                "watchlist-symbol"
            ;


            symbolCell.textContent =
                symbol;


            // =================================================
            // CHANGE %
            // =================================================

            const changeCell =
                document.createElement(
                    "td"
                );


            if (
                company &&
                company.changePercent !== null &&
                company.changePercent !== undefined
            ) {

                const change =
                    Number(
                        company.changePercent
                    );


                changeCell.textContent =
                    (change > 0 ? "+" : "") +
                    change.toFixed(2) +
                    "%";


                changeCell.classList.add(
                    change > 0
                        ? "watchlist-positive"
                        : change < 0
                            ? "watchlist-negative"
                            : "watchlist-neutral"
                );

            } else {

                changeCell.textContent =
                    "—";

                changeCell.classList.add(
                    "watchlist-neutral"
                );

            }


            // =================================================
            // LIVE PRICE
            // =================================================

            const priceCell =
                document.createElement(
                    "td"
                );


            if (
                company &&
                company.livePrice !== null &&
                company.livePrice !== undefined
            ) {

                priceCell.textContent =
                    "₹" +
                    Number(
                        company.livePrice
                    ).toLocaleString(
                        "en-IN",
                        {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        }
                    );

            } else {

                priceCell.textContent =
                    "—";

            }


            // =================================================
            // DELETE BUTTON
            // =================================================

            const deleteButton =
                document.createElement(
                    "button"
                );


            deleteButton.type =
                "button";


            deleteButton.className =
                "watchlist-delete-symbol";


            deleteButton.textContent =
                "×";


            deleteButton.title =
                "Remove from watchlist";


            deleteButton.addEventListener(
                "click",
                event => {

                    event.stopPropagation();

                    removeSymbolFromWatchlist(
                        activeWatchlistIndex,
                        symbol
                    );

                }
            );


            row.appendChild(
                symbolCell
            );

            row.appendChild(
                changeCell
            );

            row.appendChild(
                priceCell
            );

            row.appendChild(
                deleteButton
            );


            tbody.appendChild(
                row
            );

        }
    );


    table.appendChild(
        tbody
    );


    tableContainer.appendChild(
        table
    );


    container.appendChild(
        tableContainer
    );


    // =====================================================
    // EMPTY LIST
    // =====================================================

    if (
        activeList.symbols.length === 0
    ) {

        const emptyList =
            document.createElement(
                "div"
            );


        emptyList.className =
            "watchlist-empty-list";


        emptyList.textContent =
            "No symbols in this watchlist yet.";


        container.appendChild(
            emptyList
        );

    }

}


// =========================================================
// GET WATCHLIST SYMBOLS
// =========================================================

export function getWatchlistSymbols() {

    if (
        activeWatchlistIndex === null
    ) {

        return [];
    }


    const list =
        watchlists[
            activeWatchlistIndex
        ];


    return list
        ? [...list.symbols]
        : [];
}

// =========================================================
// CHART VIEW STATE
// =========================================================

let chartsViewOpen =
    false;

let chart =
    null;

let candlestickSeries =
    null;

let selectedChartSymbol =
    null;

let chartRequestId =
    0;


// =========================================================
// OPEN CHARTS VIEW
// =========================================================

function openChartsView(
    companies
) {

    chartsViewOpen =
        true;

    document.body.style.overflow =
    "hidden";

    selectedChartSymbol =
        null;


    // Remove existing chart view
    // if one somehow already exists.

    const existing =
        document.getElementById(
            "watchlistChartsOverlay"
        );

    if (
        existing
    ) {
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


    const chartTitle =
        document.createElement(
            "div"
        );

    chartTitle.id =
        "watchlistChartTitle";

    chartTitle.className =
        "watchlist-chart-title";

    chartTitle.textContent =
        "Select a stock";


    topBar.appendChild(
        backButton
    );

    topBar.appendChild(
        chartTitle
    );


    // =====================================================
    // MAIN AREA
    // =====================================================

    const main =
        document.createElement(
            "div"
        );

    main.className =
        "watchlist-charts-main";


    // =====================================================
    // CHART AREA
    // =====================================================

    const chartPanel =
        document.createElement(
            "div"
        );

    chartPanel.className =
        "watchlist-chart-panel";


    const chartContainer =
        document.createElement(
            "div"
        );

    chartContainer.id =
        "watchlistChart";

    chartContainer.className =
        "watchlist-chart";


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
        chartContainer
    );

    chartPanel.appendChild(
        emptyState
    );


    // =====================================================
    // RIGHT WATCHLIST PANEL
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


    // =====================================================
    // RENDER CURRENT WATCHLIST
    // =====================================================

    renderChartsWatchlist(
        companies
    );


    // =====================================================
    // CREATE CHART
    // =====================================================

    createChart();


    // =====================================================
    // ESCAPE KEY
    // =====================================================

    document.addEventListener(
        "keydown",
        handleChartsEscape
    );

}


// =========================================================
// CLOSE CHARTS VIEW
// =========================================================

function closeChartsView() {

    chartsViewOpen =
        false;

    selectedChartSymbol =
        null;


    chartRequestId++;


    document.removeEventListener(
        "keydown",
        handleChartsEscape
    );


    if (
        chart
    ) {

        chart.remove();

        chart =
            null;

        candlestickSeries =
            null;

    }


    const overlay =
        document.getElementById(
            "watchlistChartsOverlay"
        );

    if (
        overlay
    ) {

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
// CREATE CHART
// =========================================================

function createChart() {

    const container =
        document.getElementById(
            "watchlistChart"
        );

    if (
        !container ||
        !window.LightweightCharts
    ) {

        return;

    }


    chart =
        LightweightCharts.createChart(
            container,
            {
                layout: {
                    background: {
                        type: "solid",
                        color: "#ffffff"
                    },

                    textColor:
                        "#333333"
                },

                grid: {
                    vertLines: {
                        color: "#eeeeee"
                    },

                    horzLines: {
                        color: "#eeeeee"
                    }
                },

                crosshair: {
                    mode:
                        LightweightCharts.CrosshairMode
                            .Normal
                },

                rightPriceScale: {
                    borderColor:
                        "#dddddd"
                },

                timeScale: {
                    borderColor:
                        "#dddddd",

                    timeVisible:
                        true,

                    secondsVisible:
                        false
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


    candlestickSeries =
        chart.addSeries(
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


    // Resize chart when the
    // browser window changes size.

    window.addEventListener(
        "resize",
        resizeChart
    );

    resizeChart();

}


// =========================================================
// RESIZE CHART
// =========================================================

function resizeChart() {

    if (
        !chart
    ) {

        return;

    }


    const container =
        document.getElementById(
            "watchlistChart"
        );

    if (
        !container
    ) {

        return;

    }


    chart.applyOptions(
        {
            width:
                container.clientWidth,

            height:
                container.clientHeight
        }
    );

}


// =========================================================
// RENDER CHART WATCHLIST
// =========================================================

function renderChartsWatchlist(
    companies
) {

    const body =
        document.getElementById(
            "watchlistChartSideBody"
        );

    if (
        !body
    ) {

        return;

    }


    body.innerHTML =
        "";


    const symbols =
        getWatchlistSymbols();


    symbols.forEach(
        symbol => {

            const company =
                companies.find(
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


            // =================================================
            // SYMBOL
            // =================================================

            const symbolElement =
                document.createElement(
                    "div"
                );

            symbolElement.className =
                "chart-symbol";

            symbolElement.textContent =
                symbol;


            // =================================================
            // CHANGE
            // =================================================

            const changeElement =
                document.createElement(
                    "div"
                );

            changeElement.className =
                "chart-change";


            if (
                company &&
                company.changePercent !== null &&
                company.changePercent !== undefined
            ) {

                const change =
                    Number(
                        company.changePercent
                    );


                changeElement.textContent =
                    (change > 0
                        ? "+"
                        : "") +
                    change.toFixed(2) +
                    "%";


                if (
                    change > 0
                ) {

                    changeElement.classList.add(
                        "watchlist-positive"
                    );

                } else if (
                    change < 0
                ) {

                    changeElement.classList.add(
                        "watchlist-negative"
                    );

                } else {

                    changeElement.classList.add(
                        "watchlist-neutral"
                    );

                }

            } else {

                changeElement.textContent =
                    "—";

            }


            // =================================================
            // PRICE
            // =================================================

            const priceElement =
                document.createElement(
                    "div"
                );

            priceElement.className =
                "chart-price";


            if (
                company &&
                company.livePrice !== null &&
                company.livePrice !== undefined
            ) {

                priceElement.textContent =
                    "₹" +
                    Number(
                        company.livePrice
                    ).toLocaleString(
                        "en-IN",
                        {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        }
                    );

            } else {

                priceElement.textContent =
                    "—";

            }


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
// SELECT CHART SYMBOL
// =========================================================

// =========================================================
// SELECT CHART SYMBOL
// =========================================================

async function selectChartSymbol(
    symbol
) {

    if (
        !chartsViewOpen
    ) {

        return;

    }


    selectedChartSymbol =
        symbol;


    // =====================================================
    // HIGHLIGHT SELECTED ROW
    // =====================================================

    document
        .querySelectorAll(
            ".watchlist-chart-row"
        )
        .forEach(
            row => {

                row.classList.toggle(
                    "selected",
                    row.dataset.symbol ===
                        symbol
                );

            }
        );


    // =====================================================
    // UPDATE TITLE
    // =====================================================

    const title =
        document.getElementById(
            "watchlistChartTitle"
        );


    if (
        title
    ) {

        title.textContent =
            symbol;

    }


    // =====================================================
    // HIDE EMPTY STATE
    // =====================================================

    const emptyState =
        document.getElementById(
            "watchlistChartEmpty"
        );


    if (
        emptyState
    ) {

        emptyState.style.display =
            "none";

    }


    // =====================================================
    // REQUEST ID
    // =====================================================

    const requestId =
        ++chartRequestId;


    // =====================================================
    // REMOVE PREVIOUS CHART
    // =====================================================

    if (
        chart
    ) {

        chart.remove();

        chart =
            null;

        candlestickSeries =
            null;

    }


    const chartContainer =
        document.getElementById(
            "watchlistChart"
        );


    if (
        !chartContainer
    ) {

        return;

    }


    chartContainer.innerHTML =
        "";


    // =====================================================
    // CREATE NEW EMPTY CHART
    // =====================================================

    createChart();


    // =====================================================
    // FETCH HISTORICAL DATA
    // =====================================================

    try {

        const response =
            await fetch(
                `/companies/${encodeURIComponent(
                    symbol
                )}/candles`
            );


        if (
            !response.ok
        ) {

            throw new Error(
                `HTTP ${response.status}`
            );

        }


        const candles =
            await response.json();


        // =================================================
        // IGNORE OLD REQUEST
        // =================================================

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
                "No historical candle data available."
            );

        }


        // =================================================
        // CONVERT DATA
        // =================================================

        const chartData =
            candles
                .map(
                    candle => {

                        return {

                            time:
                                candle.time,

                            open:
                                Number(
                                    candle.open
                                ),

                            high:
                                Number(
                                    candle.high
                                ),

                            low:
                                Number(
                                    candle.low
                                ),

                            close:
                                Number(
                                    candle.close
                                )

                        };

                    }
                )
                .filter(
                    candle =>

                        Number.isFinite(
                            candle.open
                        ) &&

                        Number.isFinite(
                            candle.high
                        ) &&

                        Number.isFinite(
                            candle.low
                        ) &&

                        Number.isFinite(
                            candle.close
                        )
                );


        // =================================================
        // DISPLAY CANDLES
        // =================================================

        if (
            !candlestickSeries
        ) {

            throw new Error(
                "Chart could not be initialized."
            );

        }


        candlestickSeries.setData(
            chartData
        );


        chart.timeScale()
            .fitContent();


    } catch (
        error
    ) {

        console.error(
            "Failed to load chart:",
            error
        );


        // Ignore errors from
        // an older request.

        if (
            requestId !==
            chartRequestId
        ) {

            return;

        }


        const container =
            document.getElementById(
                "watchlistChart"
            );


        if (
            container
        ) {

            container.innerHTML = `
                <div class="watchlist-chart-error">
                    Unable to load chart data.
                </div>
            `;

        }

    }

}