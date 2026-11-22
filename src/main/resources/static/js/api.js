


// =========================================================
// LOAD LIVE DATA
// =========================================================


export async function loadCompanies() {

    try {

        const response =
            await fetch(
                "/companies/live?minMarketCap=0"
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


export async function loadMarketIndices() {

    const response =
        await fetch("/market/indices");

    if (!response.ok) {
        throw new Error(
            "Failed to load market indices"
        );
    }

    return await response.json();
}