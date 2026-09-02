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


    listHeader.appendChild(
        listTitle
    );

    listHeader.appendChild(
        listInfo
    );

    listHeader.appendChild(
        addSymbolButton
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