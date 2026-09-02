package com.stock.stock_screener.service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class HistoricalCandleService {

    private final CompanyFilterService companyFilterService;

    private final ObjectMapper objectMapper =
        new ObjectMapper();

    private final HttpClient httpClient;


    public HistoricalCandleService(
            CompanyFilterService companyFilterService) {

        this.companyFilterService =
                companyFilterService;


        this.httpClient =
                HttpClient.newHttpClient();
    }


    // =========================================================
    // GET DAILY CANDLES
    // =========================================================

    public List<Candle> getDailyCandles(
            String symbol)
            throws Exception {

        if (
                symbol == null ||
                symbol.isBlank()
        ) {

            throw new IllegalArgumentException(
                    "Symbol cannot be empty."
            );

        }


        String normalizedSymbol =
                symbol
                        .trim()
                        .toUpperCase();


        // =====================================================
        // FIND COMPANY
        // =====================================================

        var companies =
                companyFilterService
                        .getNseGroupABCompanies();


        var company =
                companies
                        .stream()
                        .filter(
                                item ->
                                        normalizedSymbol.equals(
                                                item.getNseSymbol()
                                        )
                        )
                        .findFirst()
                        .orElseThrow(
                                () ->
                                        new IllegalArgumentException(
                                                "Company not found: "
                                                        + normalizedSymbol
                                        )
                        );


        // =====================================================
        // GET ISIN
        // =====================================================

        String isin =
                company.getIsin();


        if (
                isin == null ||
                isin.isBlank()
        ) {

            throw new IllegalStateException(
                    "ISIN not available for "
                            + normalizedSymbol
            );

        }


        // =====================================================
        // DATE RANGE
        // =====================================================

        LocalDate toDate =
                LocalDate.now();

        LocalDate fromDate =
                toDate.minusYears(1);


        // =====================================================
        // UPSTOX INSTRUMENT KEY
        // =====================================================

        String instrumentKey =
                "NSE_EQ|" + isin;


        String encodedInstrumentKey =
                URLEncoder.encode(
                        instrumentKey,
                        StandardCharsets.UTF_8
                );


        // =====================================================
        // UPSTOX URL
        // =====================================================

        String url =
                "https://api.upstox.com/v3/historical-candle/"
                        + encodedInstrumentKey
                        + "/days/1/"
                        + toDate
                        + "/"
                        + fromDate;


        // =====================================================
        // ACCESS TOKEN
        // =====================================================

        String accessToken =
                System.getenv(
                        "UPSTOX_ACCESS_TOKEN"
                );


        if (
                accessToken == null ||
                accessToken.isBlank()
        ) {

            throw new IllegalStateException(
                    "UPSTOX_ACCESS_TOKEN environment variable not found."
            );

        }


        // =====================================================
        // HTTP REQUEST
        // =====================================================

        HttpRequest request =
                HttpRequest
                        .newBuilder(
                                URI.create(url)
                        )
                        .header(
                                "Accept",
                                "application/json"
                        )
                        .header(
                                "Authorization",
                                "Bearer "
                                        + accessToken
                        )
                        .GET()
                        .build();


        HttpResponse<String> response =
                httpClient.send(
                        request,
                        HttpResponse.BodyHandlers.ofString()
                );


        // =====================================================
        // CHECK RESPONSE
        // =====================================================

        if (
                response.statusCode() != 200
        ) {

            throw new IllegalStateException(
                    "Upstox historical candle request failed. "
                            + "HTTP "
                            + response.statusCode()
                            + ": "
                            + response.body()
            );

        }


        // =====================================================
        // PARSE JSON
        // =====================================================

        JsonNode root =
                objectMapper.readTree(
                        response.body()
                );


        JsonNode candlesNode =
                root
                        .path("data")
                        .path("candles");


        if (
                !candlesNode.isArray()
        ) {

            return Collections.emptyList();

        }


        List<Candle> candles =
                new ArrayList<>();


        // =====================================================
        // CONVERT CANDLES
        // =====================================================

        for (
                JsonNode candle
                : candlesNode
        ) {

            if (
                    candle.size() < 5
            ) {

                continue;

            }


            String timestamp =
                    candle
                            .get(0)
                            .asText();


            double open =
                    candle
                            .get(1)
                            .asDouble();


            double high =
                    candle
                            .get(2)
                            .asDouble();


            double low =
                    candle
                            .get(3)
                            .asDouble();


            double close =
                    candle
                            .get(4)
                            .asDouble();


            // Lightweight Charts accepts
            // YYYY-MM-DD for daily candles.

            String date =
                    timestamp.length() >= 10
                            ? timestamp.substring(0, 10)
                            : timestamp;


            candles.add(
                    new Candle(
                            date,
                            open,
                            high,
                            low,
                            close
                    )
            );

        }


        // Upstox returns newest first.
        // Lightweight Charts needs chronological order.

        Collections.reverse(
                candles
        );


        return candles;
    }


    // =========================================================
    // CANDLE DTO
    // =========================================================

    public static class Candle {

        private final String time;

        private final double open;

        private final double high;

        private final double low;

        private final double close;


        public Candle(
                String time,
                double open,
                double high,
                double low,
                double close) {

            this.time =
                    time;

            this.open =
                    open;

            this.high =
                    high;

            this.low =
                    low;

            this.close =
                    close;
        }


        public String getTime() {

            return time;

        }


        public double getOpen() {

            return open;

        }


        public double getHigh() {

            return high;

        }


        public double getLow() {

            return low;

        }


        public double getClose() {

            return close;

        }

    }

}