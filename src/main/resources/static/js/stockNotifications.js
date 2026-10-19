
const THRESHOLD = 8;
const TOAST_DURATION = 4000;
const HISTORY_TTL = 24 * 60 * 60 * 1000;

const HISTORY_KEY = "strykr_stock_alert_history_v1";
const FIRED_KEY = "strykr_stock_alerted_today_v1";

let initialized = false;
let audioContext = null;
let toastContainer = null;
let bellButton = null;
let badgeElement = null;
let panel = null;
let historyList = null;

let alerts = [];
let alertedKeys = new Set();

function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function loadJson(key, fallback) {
    try {
        const value = JSON.parse(localStorage.getItem(key));
        return value ?? fallback;
    } catch {
        return fallback;
    }
}

function saveJson(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.warn("Could not save stock notifications:", error);
    }
}

function pruneHistory() {
    const cutoff = Date.now() - HISTORY_TTL;

    alerts = alerts.filter(
        alert => Number(alert.createdAt) > cutoff
    );

    // Keep the daily deduplication record separate from the
    // 24-hour notification history.
    const today = localDateKey();

    alertedKeys = new Set(
        [...alertedKeys].filter(key => key.endsWith(`|${today}`))
    );

    saveJson(HISTORY_KEY, alerts);
    saveJson(FIRED_KEY, [...alertedKeys]);
}

function createElement(tag, className, text = "") {
    const element = document.createElement(tag);

    element.className = className;
    element.textContent = text;

    return element;
}

function formatTime(timestamp) {
    return new Date(timestamp).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
    });
}


function playBeep() {
    try {
        const AudioContextClass =
            window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) return;

        if (!audioContext) {
            audioContext = new AudioContextClass();
        }

        if (audioContext.state === "suspended") {
            audioContext.resume().catch(() => {});
        }

        if (audioContext.state !== "running") return;

        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const now = audioContext.currentTime;

        // A sharper, more noticeable alert tone.
        oscillator.type = "square";
        oscillator.frequency.value = 1250;

        // Two short beeps.
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.28, now + 0.015);
        gain.gain.setValueAtTime(0.28, now + 0.09);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.11);

        gain.gain.setValueAtTime(0.0001, now + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.28, now + 0.165);
        gain.gain.setValueAtTime(0.28, now + 0.24);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.start(now);
        oscillator.stop(now + 0.28);
    } catch (error) {
        console.debug("Stock alert sound unavailable:", error);
    }
}

function unlockAudio() {
    try {
        const AudioContextClass =
            window.AudioContext || window.webkitAudioContext;

        if (!AudioContextClass) return;

        if (!audioContext) {
            audioContext = new AudioContextClass();
        }

        if (audioContext.state === "suspended") {
            audioContext.resume().catch(() => {});
        }
    } catch {
        // The notification feature remains usable without sound.
    }
}

function updateBadge() {
    if (!badgeElement) return;

    badgeElement.textContent = String(alerts.length);
    badgeElement.hidden = alerts.length === 0;

    bellButton?.setAttribute(
        "aria-label",
        alerts.length
            ? `Stock notifications, ${alerts.length} recent alerts`
            : "Stock notifications"
    );
}

function renderHistory() {
    if (!historyList) return;

    historyList.replaceChildren();

    if (alerts.length === 0) {
        historyList.appendChild(
            createElement(
                "div",
                "stock-alerts-empty",
                "No stock alerts in the last 24 hours."
            )
        );

        updateBadge();
        return;
    }

    // Newest notifications appear first.
    [...alerts]
        .sort((a, b) => b.createdAt - a.createdAt)
        .forEach(alert => {
            const item = createElement("article", "stock-alert-item");

            const details = createElement(
                "div",
                "stock-alert-details"
            );

            const heading = createElement(
                "div",
                "stock-alert-heading"
            );

            heading.appendChild(
                createElement(
                    "strong",
                    "stock-alert-symbol",
                    alert.symbol
                )
            );

            heading.appendChild(
                createElement(
                    "span",
                    "stock-alert-change",
                    `+${Number(alert.changePercent).toFixed(2)}%`
                )
            );

            details.appendChild(heading);

            if (alert.name && alert.name !== alert.symbol) {
                details.appendChild(
                    createElement(
                        "div",
                        "stock-alert-company",
                        alert.name
                    )
                );
            }

            details.appendChild(
                createElement(
                    "time",
                    "stock-alert-time",
                    formatTime(alert.createdAt)
                )
            );

            const dismissButton = createElement(
                "button",
                "stock-alert-dismiss",
                "×"
            );

            dismissButton.type = "button";
            dismissButton.title = "Dismiss notification";
            dismissButton.setAttribute(
                "aria-label",
                `Dismiss ${alert.symbol} notification`
            );

            dismissButton.addEventListener("click", () => {
                alerts = alerts.filter(
                    item => item.id !== alert.id
                );

                saveJson(HISTORY_KEY, alerts);
                renderHistory();
            });

            item.append(details, dismissButton);
            historyList.appendChild(item);
        });

    updateBadge();
}

function showToast(alert) {
    if (!toastContainer) return;

    const toast = createElement("div", "stock-alert-toast");

    const content = createElement("div", "stock-alert-toast-content");

    content.appendChild(
        createElement(
            "strong",
            "stock-alert-toast-title",
            `${alert.symbol} crossed +8%`
        )
    );

    content.appendChild(
        createElement(
            "span",
            "stock-alert-toast-message",
            `Daily change: +${Number(alert.changePercent).toFixed(2)}%`
        )
    );

    const closeButton = createElement(
        "button",
        "stock-alert-toast-close",
        "×"
    );

    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Dismiss popup");

    let timeoutId;

    const removeToast = () => {
        clearTimeout(timeoutId);
        toast.remove();
    };

    closeButton.addEventListener("click", removeToast);

    toast.append(content, closeButton);
    toastContainer.appendChild(toast);

    timeoutId = window.setTimeout(removeToast, TOAST_DURATION);
}

function createAlert(stock, changePercent) {
    const now = Date.now();
    const symbol = String(
        stock.nseSymbol ?? stock.symbol ?? stock.tradingSymbol ?? ""
    ).trim().toUpperCase();

    if (!symbol) return;

    const dayKey = localDateKey();
    const dailyKey = `${symbol}|${dayKey}`;

    if (alertedKeys.has(dailyKey)) return;

    // Save the deduplication key before displaying the alert.
    // This prevents duplicate alerts from rapid WebSocket updates.
    alertedKeys.add(dailyKey);
    saveJson(FIRED_KEY, [...alertedKeys]);

    const name = String(
        stock.companyName ?? stock.name ?? stock.company ?? symbol
    );

    const alert = {
        id: `${symbol}-${now}-${Math.random().toString(36).slice(2, 8)}`,
        symbol,
        name,
        changePercent,
        createdAt: now
    };

    alerts.unshift(alert);

    pruneHistory();
    saveJson(HISTORY_KEY, alerts);

    renderHistory();
    showToast(alert);
    playBeep();
}

/**
 * Call this from the existing live stock update handler.
 *
 * IMPORTANT:
 * previousChangePercent must be the value BEFORE the update.
 */
export function checkStockNotification(stock, previousChangePercent) {
    if (!initialized || !stock) return;

    const current = Number(stock.changePercent);
    const previous = Number(previousChangePercent);

    // Ignore incomplete data and the initial page-load snapshot.
    if (
        !Number.isFinite(current) ||
        !Number.isFinite(previous)
    ) {
        return;
    }

    // Alert only on a crossing from below +8% to +8% or above.
    if (previous < THRESHOLD && current >= THRESHOLD) {
        createAlert(stock, current);
    }
}

export function initializeStockNotifications() {
    if (initialized) return;

    const header = document.querySelector(".header");

    if (!header) {
        console.error(
            "Stock notifications: .header element was not found."
        );
        return;
    }

    // Restore and expire old notification history.
    alerts = loadJson(HISTORY_KEY, []);
    alertedKeys = new Set(loadJson(FIRED_KEY, []));

    pruneHistory();

    const controls = createElement(
        "div",
        "stock-alert-controls"
    );

    bellButton = createElement(
        "button",
        "stock-alert-bell",
        "🔔"
    );

    // Use a bell character rather than relying on an icon library.
    bellButton.textContent = "🔔";
    bellButton.type = "button";
    bellButton.title = "Stock notifications";
    bellButton.setAttribute("aria-expanded", "false");
    bellButton.setAttribute("aria-label", "Stock notifications");

    badgeElement = createElement("span", "stock-alert-badge", "");
    badgeElement.hidden = true;
    bellButton.appendChild(badgeElement);

    panel = createElement("section", "stock-alert-panel");
    panel.hidden = true;
    panel.setAttribute("aria-label", "Stock notification history");

    const panelHeader = createElement(
        "div",
        "stock-alert-panel-header"
    );

    panelHeader.appendChild(
        createElement("strong", "", "Stock Alerts")
    );

    const panelClose = createElement(
        "button",
        "stock-alert-panel-close",
        "×"
    );

    panelClose.type = "button";
    panelClose.title = "Close notifications";
    panelClose.setAttribute("aria-label", "Close notifications");

    panelHeader.appendChild(panelClose);

    historyList = createElement("div", "stock-alert-list");

    panel.append(panelHeader, historyList);
    controls.append(bellButton, panel);

    header.appendChild(controls);

    toastContainer = createElement(
        "div",
        "stock-alert-toast-container"
    );

    toastContainer.setAttribute("aria-live", "polite");
    toastContainer.setAttribute("aria-relevant", "additions");

    document.body.appendChild(toastContainer);

    function closePanel() {
        panel.hidden = true;
        bellButton.setAttribute("aria-expanded", "false");
    }

    bellButton.addEventListener("click", event => {
        event.stopPropagation();
        unlockAudio();

        panel.hidden = !panel.hidden;

        bellButton.setAttribute(
            "aria-expanded",
            String(!panel.hidden)
        );

        if (!panel.hidden) renderHistory();
    });

    panelClose.addEventListener("click", closePanel);

    panel.addEventListener("click", event => {
        event.stopPropagation();
    });

    document.addEventListener("click", event => {
        if (!controls.contains(event.target)) {
            closePanel();
        }
    });

    // Browsers may require a user gesture before playing audio.
    document.addEventListener("pointerdown", unlockAudio, {
        once: true
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") closePanel();
    });

    // Expire history even when the page remains open.
    window.setInterval(() => {
        const previousLength = alerts.length;

        pruneHistory();

        if (alerts.length !== previousLength) {
            renderHistory();
        }
    }, 60_000);

    initialized = true;
    renderHistory();
}
