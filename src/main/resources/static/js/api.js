// =========================================================
// MARKET CAP
// =========================================================

export function getSelectedMarketCap() {

    return document
        .getElementById("marketCapSelect")
        .value;
}


// =========================================================
// LOAD LIVE DATA
// =========================================================

export async function loadCompanies() {

    try {

        const marketCap =
            getSelectedMarketCap();

        /*
         * Backend filtering:
         *
         * /companies/live?minMarketCap=1000
         * /companies/live?minMarketCap=2000
         * /companies/live?minMarketCap=3000
         * /companies/live?minMarketCap=4000
         * /companies/live?minMarketCap=5000
         */

        const response =
            await fetch(
                "/companies/live?minMarketCap=" +
                marketCap
            );

        if (!response.ok) {

            throw new Error(
                "HTTP " +
                response.status
            );
        }

        const companies =
            await response.json();


        // =====================================================
        // LAST UPDATED
        // =====================================================

        document
            .getElementById("lastUpdated")
            .textContent =
            "Last update: " +
            new Date()
                .toLocaleTimeString();


        return companies;

    }

    catch (error) {

        console.error(error);


        // =====================================================
        // CONNECTION ERROR
        // =====================================================

        document
            .getElementById("status")
            .classList.remove("live");


        document
            .getElementById("companyTable")
            .innerHTML = `

                <tr>

                    <td
                        colspan="8"
                        class="error">

                        Unable to load live company data.

                    </td>

                </tr>

            `;

        return [];
    }
}