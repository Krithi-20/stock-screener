package com.stock.stock_screener.service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.stock.stock_screener.model.Company;

@Service
public class CompanyFilterService {

    private final NseReaderService nseReaderService;
    private final BseReaderService bseReaderService;
    private final NseBhavCopyService nseBhavCopyService;

    /*
     * Cached data.
     *
     * These are loaded once when the service starts.
     * Browser requests will NOT reread the CSV files.
     */
    private Map<String, NseReaderService.NseData> nseCompanies;
    private Map<String, String> bseGroups;
    private Map<String, Double> closingPrices;

    /*
     * Prevents multiple threads from loading the CSVs
     * simultaneously.
     */
    private volatile boolean dataLoaded = false;

    private final Object cacheLock = new Object();

    public CompanyFilterService(
            NseReaderService nseReaderService,
            BseReaderService bseReaderService,
            NseBhavCopyService nseBhavCopyService) {

        this.nseReaderService = nseReaderService;
        this.bseReaderService = bseReaderService;
        this.nseBhavCopyService = nseBhavCopyService;
    }

    // =========================================================
    // LOAD DATA INTO MEMORY
    // =========================================================

    public void loadDataIntoMemory() throws Exception {

        if (dataLoaded) {
            return;
        }

        synchronized (cacheLock) {

            if (dataLoaded) {
                return;
            }

            /*
             * Read each source exactly once.
             */

            nseCompanies =
                    nseReaderService.readNseCompanies();

            bseGroups =
                    bseReaderService.readBseGroups();

            closingPrices =
                    nseBhavCopyService.readClosingPrices();

            dataLoaded = true;

            /*
             * Print this ONCE only.
             */

            System.out.println(
                    "Company data loaded into memory."
            );

            System.out.println(
                    "NSE companies: "
                            + nseCompanies.size()
            );

            System.out.println(
                    "BSE classifications: "
                            + bseGroups.size()
            );

            System.out.println(
                    "NSE closing prices: "
                            + closingPrices.size()
            );
        }
    }

    // =========================================================
    // FORCE RELOAD
    // =========================================================

    /*
     * This is useful when the daily market-cap file changes.
     *
     * It clears the cached data and loads the new files once.
     */
    public void reloadData() throws Exception {

        synchronized (cacheLock) {

            dataLoaded = false;

            nseCompanies = null;
            bseGroups = null;
            closingPrices = null;

            loadDataIntoMemory();
        }
    }

    // =========================================================
    // DEFAULT FILTER
    // =========================================================

    public List<Company> getNseGroupABCompanies()
            throws Exception {

        return getNseGroupABCompanies(1000.0);
    }

    // =========================================================
    // FILTER
    // =========================================================

    public List<Company> getNseGroupABCompanies(
            double minMarketCapCrore)
            throws Exception {

        /*
         * This only loads the files the FIRST time.
         *
         * After that, everything comes from memory.
         */
        loadDataIntoMemory();

        List<Company> result =
                new ArrayList<>();

        /*
         * IMPORTANT:
         *
         * We start from NSE.
         *
         * Therefore every company here is NSE-listed.
         */
        for (Map.Entry<String, NseReaderService.NseData> entry
                : nseCompanies.entrySet()) {

            String isin =
                    entry.getKey();

            NseReaderService.NseData nseData =
                    entry.getValue();

            // =================================================
            // BSE GROUP
            // =================================================

            String bseGroup =
                    bseGroups.get(isin);

            /*
             * If a BSE classification exists:
             *
             * A -> include
             * B -> include
             * anything else -> exclude
             *
             * If there is NO BSE entry:
             *
             * still include because the company is NSE-listed.
             */

            if (bseGroup != null &&
                    !bseGroup.equalsIgnoreCase("A") &&
                    !bseGroup.equalsIgnoreCase("B")) {

                continue;
            }

            /*
             * NSE-only company.
             */
            if (bseGroup == null ||
                    bseGroup.isBlank()) {

                bseGroup = "N/A";
            }

            // =================================================
            // CLOSING PRICE
            // =================================================

            Double closingPrice =
                    closingPrices.get(isin);

            if (closingPrice == null ||
                    closingPrice <= 0) {

                continue;
            }

            // =================================================
            // ISSUED CAPITAL
            // =================================================

            double issuedCapital =
                    nseData.getIssuedCapital();

            if (issuedCapital <= 0) {

                continue;
            }

            // =================================================
            // MARKET CAP
            // =================================================

            double marketCapRupees =
                    issuedCapital *
                    closingPrice;

            double marketCapCrores =
                    marketCapRupees /
                    10_000_000.0;

            /*
             * Selected market-cap filter.
             */
            if (marketCapCrores <=
                    minMarketCapCrore) {

                continue;
            }

            // =================================================
            // CREATE COMPANY
            // =================================================

            Company company =
                    new Company(
                            nseData.getIsin(),
                            nseData.getSymbol(),
                            nseData.getName(),
                            bseGroup,
                            issuedCapital,
                            nseData.getFaceValue(),
                            closingPrice,
                            marketCapCrores
                    );

            result.add(company);
        }

        // =====================================================
        // SORT
        // =====================================================

        result.sort(
                Comparator
                        .comparingDouble(
                                Company::getMarketCap
                        )
                        .reversed()
        );

        return result;
    }
}