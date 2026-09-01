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


    if (
        list.symbols.includes(
            symbol
        )
    ) {

        alert(
            `${symbol} is already in "${list.name}".`
        );

        return false;
    }


    if (
        list.symbols.length >=
        MAX_SYMBOLS
    ) {

        alert(
            `"${list.name}" already contains 40 symbols.`
        );

        return false;
    }


    list.symbols.push(
        symbol
    );


    saveWatchlists();


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

export function addSymbolFromTable(
    symbol
) {

    if (
        watchlists.length === 0
    ) {

        alert(
            "Create a watchlist first."
        );

        return;
    }


    const availableLists =
        watchlists
            .map(
                (list, index) =>
                    `${index + 1}. ${list.name} (${list.symbols.length}/40)`
            )
            .join("\n");


    const answer =
        prompt(
            `Add ${symbol} to which watchlist?\n\n${availableLists}\n\nEnter the list number:`
        );


    if (
        answer === null
    ) {

        return;
    }


    const selected =
        Number(
            answer.trim()
        );


    if (
        !Number.isInteger(
            selected
        ) ||
        selected < 1 ||
        selected > watchlists.length
    ) {

        alert(
            "Invalid watchlist number."
        );

        return;
    }


    const index =
        selected - 1;


    if (
        addSymbolToWatchlist(
            index,
            symbol
        )
    ) {

        alert(
            `${symbol} added to "${watchlists[index].name}".`
        );

    }

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