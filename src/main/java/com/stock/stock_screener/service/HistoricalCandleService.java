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

  public List<Candle> getCandles(
        String symbol,
        String timeframe)
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


    String normalizedTimeframe =
            timeframe == null
                    ? "1d"
                    : timeframe
                            .trim()
                            .toLowerCase();


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
    // TIMEFRAME CONFIGURATION
    // =====================================================

    String unit;

    int interval;

    LocalDate toDate =
            LocalDate.now();

    LocalDate fromDate;


    switch (
            normalizedTimeframe
    ) {

        case "1m" -> {

            unit =
                    "minutes";

            interval =
                    1;

            // Keep request comfortably within
            // Upstox's one-month minute-data limit.

            fromDate =
                    toDate.minusDays(
                            5
                    );
        }


        case "1h" -> {

            unit =
                    "hours";

            interval =
                    1;

            // V3 hour requests allow one-quarter
            // retrieval windows.

            fromDate =
                    toDate.minusMonths(
                            3
                    );
        }


        case "1d" -> {

            unit =
                    "days";

            interval =
                    1;

            fromDate =
                    toDate.minusYears(
                            1
                    );
        }


        case "1w" -> {

            unit =
                    "weeks";

            interval =
                    1;

            fromDate =
                    toDate.minusYears(
                            10
                    );
        }


        case "1mo" -> {

            unit =
                    "months";

            interval =
                    1;

            fromDate =
                    toDate.minusYears(
                            20
                    );
        }


        // Upstox does not directly expose
        // 3-month, 6-month or 1-year candles.
        //
        // Return monthly candles and let the
        // frontend aggregate them.

        case "3mo",
             "6mo",
             "1y" -> {

            unit =
                    "months";

            interval =
                    1;

            fromDate =
                    toDate.minusYears(
                            25
                    );
        }


        default ->
                throw new IllegalArgumentException(
                        "Unsupported timeframe: "
                                + normalizedTimeframe
                );
    }


    // =====================================================
    // INSTRUMENT
    // =====================================================

    String instrumentKey =
            "NSE_EQ|" + isin;


    String encodedInstrumentKey =
            URLEncoder.encode(
                    instrumentKey,
                    StandardCharsets.UTF_8
            );


    // =====================================================
    // UPSTOX V3 URL
    // =====================================================

    String url =
            "https://api.upstox.com/v3/historical-candle/"
                    + encodedInstrumentKey
                    + "/"
                    + unit
                    + "/"
                    + interval
                    + "/"
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
                            URI.create(
                                    url
                            )
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
    // PARSE
    // =====================================================

    JsonNode root =
            objectMapper.readTree(
                    response.body()
            );


    JsonNode candlesNode =
            root
                    .path(
                            "data"
                    )
                    .path(
                            "candles"
                    );


    if (
            !candlesNode.isArray()
    ) {

        return Collections.emptyList();
    }


    List<Candle> candles =
            new ArrayList<>();


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


        // IMPORTANT:
        //
        // Keep the FULL timestamp.
        // Do not truncate to YYYY-MM-DD.
        //
        // Minute and hour charts need the time.

        candles.add(
                new Candle(
                        timestamp,
                        open,
                        high,
                        low,
                        close
                )
        );
    }


    // Upstox gives newest first.

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