// =========================================================
// SET ACTIVE TAB
// =========================================================

export function setActiveTab(id) {

    document
        .querySelectorAll(".tab")
        .forEach(tab => {

            tab.classList.remove(
                "active"
            );

        });

    document
        .getElementById(id)
        .classList.add(
            "active"
        );
}


// =========================================================
// GET DISPLAYED COMPANIES
// =========================================================

export function getDisplayedCompanies(
    companies,
    currentView
) {

    let data =
        [...companies];


    /*
     * ALL COMPANIES
     *
     * Backend already returns these in:
     *
     * largest market cap → smallest market cap
     */

    if (currentView === "all") {

        return data;
    }


    /*
     * TOP PERFORMERS
     *
     * Highest positive change percentage first.
     */

    if (currentView === "performers") {

        return data

            .filter(company =>
                company.changePercent !== null &&
                company.changePercent !== undefined
            )

            .sort(
                (a, b) =>
                    b.changePercent -
                    a.changePercent
            );
    }


    /*
     * TOP LOSERS
     *
     * Lowest change percentage first.
     */

    if (currentView === "losers") {

        return data

            .filter(company =>
                company.changePercent !== null &&
                company.changePercent !== undefined
            )

            .sort(
                (a, b) =>
                    a.changePercent -
                    b.changePercent
            );
    }


    return data;
}