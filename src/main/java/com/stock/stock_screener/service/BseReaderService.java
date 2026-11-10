
package com.stock.stock_screener.service;

import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Service;

@Service
public class BseReaderService {

    private static final Path BSE_DIR =
            Path.of("data", "bse", "scrip", "SCRIP");

    private static final Path MARKET_CAP_DATE_FILE =
            Path.of("data", "marketcap", "latest-date.txt");

    private static final DateTimeFormatter DATE_FORMAT =
            DateTimeFormatter.ofPattern("ddMMyyyy");

    public Map<String, String> readBseGroups()
            throws Exception {

        // Use the actual trading date selected by
        // DailyMarketDataService instead of calculating yesterday.
        if (!Files.exists(MARKET_CAP_DATE_FILE)) {
            throw new IllegalStateException(
                    "Market data trading-date marker not found: "
                            + MARKET_CAP_DATE_FILE
            );
        }

        String dateText = Files.readString(
                MARKET_CAP_DATE_FILE,
                StandardCharsets.UTF_8
        ).trim();

        if (dateText.isEmpty()) {
            throw new IllegalStateException(
                    "Market data trading-date marker is empty."
            );
        }

        LocalDate tradingDate = LocalDate.parse(dateText);

        String fileName =
                "BSE_EQ_SCRIP_"
                        + tradingDate.format(DATE_FORMAT)
                        + ".csv";

        Path bseFile = BSE_DIR.resolve(fileName);

        if (!Files.exists(bseFile)) {
            throw new IllegalStateException(
                    "BSE security file not found for trading date "
                            + tradingDate + ": " + bseFile
            );
        }

        Map<String, String> bseGroups = new HashMap<>();

        try (
                Reader reader = Files.newBufferedReader(
                        bseFile,
                        StandardCharsets.UTF_8
                )
        ) {

            CSVFormat format =
                    CSVFormat.DEFAULT.builder()
                            .setHeader()
                            .setSkipHeaderRecord(true)
                            .build();

            try (
                    CSVParser parser =
                            new CSVParser(reader, format)
            ) {

                for (CSVRecord record : parser) {

                    String isin = record.get("ISIN");
                    String group = record.get("SctySrs");

                    if (isin == null || isin.isBlank()) {
                        continue;
                    }

                    if (group == null || group.isBlank()) {
                        continue;
                    }

                    group = group.trim();

                    // Only Group A and B
                    if (
                            !group.equalsIgnoreCase("A")
                                    && !group.equalsIgnoreCase("B")
                    ) {
                        continue;
                    }

                    bseGroups.put(
                            isin.trim(),
                            group
                    );
                }
            }
        }

        System.out.println(
                "[BSE] Group A/B companies loaded: "
                        + bseGroups.size()
                        + " (Trading date: "
                        + tradingDate + ")"
        );

        return bseGroups;
    }
}
