package com.stock.stock_screener.controller;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.stock.stock_screener.model.Company;
import com.stock.stock_screener.service.CompanyFilterService;
import com.stock.stock_screener.service.UpstoxMarketDataService;
import com.stock.stock_screener.service.UpstoxMarketDataService.LiveQuote;

@RestController
public class CompanyController {

    private final CompanyFilterService companyFilterService;

    private final UpstoxMarketDataService upstoxMarketDataService;

    public CompanyController(
            CompanyFilterService companyFilterService,
            UpstoxMarketDataService upstoxMarketDataService) {

        this.companyFilterService =
                companyFilterService;

        this.upstoxMarketDataService =
                upstoxMarketDataService;
    }

    // =========================================================
    // COMPANIES
    // =========================================================

    @GetMapping("/companies")
    public List<Company> getCompanies(
            @RequestParam(
                    defaultValue = "1000"
            )
            double minMarketCap)
            throws Exception {

        return companyFilterService
                .getNseGroupABCompanies(
                        minMarketCap
                );
    }

    // =========================================================
    // LIVE COMPANIES
    // =========================================================

    @GetMapping("/companies/live")
    public List<LiveCompany> getLiveCompanies(
            @RequestParam(
                    defaultValue = "1000"
            )
            double minMarketCap)
            throws Exception {

        List<Company> companies =
                companyFilterService
                        .getNseGroupABCompanies(
                                minMarketCap
                        );

        Map<String, LiveQuote> quotes =
                upstoxMarketDataService
                        .getLiveQuotes();

        List<LiveCompany> result =
                new ArrayList<>();

        for (Company company : companies) {

            LiveQuote quote =
                    quotes.get(
                            company.getIsin()
                    );

            if (quote == null) {

                result.add(
                        new LiveCompany(
                                company,
                                null,
                                null,
                                null
                        )
                );

                continue;
            }

            result.add(
                    new LiveCompany(
                            company,
                            quote.getLastPrice(),
                            quote.getChange(),
                            quote.getChangePercent()
                    )
            );
        }

        return result;
    }

        // =========================================================
        // LIVE MARKET INDICES
        // =========================================================

        @GetMapping("/market/indices")
        public Map<String, LiveQuote> getMarketIndices() {

        return upstoxMarketDataService
                .getIndexQuotes();
        }
    // =========================================================
    // DTO
    // =========================================================

    public static class LiveCompany {

        private final String isin;

        private final String nseSymbol;

        private final String companyName;

        private final String bseGroup;

        private final double marketCap;

        private final Double livePrice;

        private final Double change;

        private final Double changePercent;

        public LiveCompany(
                Company company,
                Double livePrice,
                Double change,
                Double changePercent) {

            this.isin =
                    company.getIsin();

            this.nseSymbol =
                    company.getNseSymbol();

            this.companyName =
                    company.getCompanyName();

            this.bseGroup =
                    company.getBseGroup();

            this.marketCap =
                    company.getMarketCap();

            this.livePrice =
                    livePrice;

            this.change =
                    change;

            this.changePercent =
                    changePercent;
        }

        public String getIsin() {
            return isin;
        }

        public String getNseSymbol() {
            return nseSymbol;
        }

        public String getCompanyName() {
            return companyName;
        }

        public String getBseGroup() {
            return bseGroup;
        }

        public double getMarketCap() {
            return marketCap;
        }

        public Double getLivePrice() {
            return livePrice;
        }

        public Double getChange() {
            return change;
        }

        public Double getChangePercent() {
            return changePercent;
        }
    }
}