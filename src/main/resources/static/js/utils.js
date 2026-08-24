// =========================================================
// FORMAT CHANGE
// =========================================================

export function formatChange(value) {

    const number = Number(value);

    if (number > 0) {
        return "+" + number.toFixed(2);
    }

    return number.toFixed(2);
}


// =========================================================
// FORMAT PERCENT
// =========================================================

export function formatPercent(value) {

    const number = Number(value);

    if (number > 0) {
        return "+" + number.toFixed(2) + "%";
    }

    return number.toFixed(2) + "%";
}


// =========================================================
// ESCAPE HTML
// =========================================================

export function escapeHtml(value) {

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}