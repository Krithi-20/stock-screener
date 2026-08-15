package com.stock.stock_screener.service;

import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Service;

@Service
public class NseBhavCopyService {

    private static final String BHAVCOPY_FILE =
            "data/nse/BhavCopy_NSE_CM_0_0_0_20260811_F_0000.csv/BhavCopy_NSE_CM_0_0_0_20260811_F_0000.csv";

    public Map<String, Double> readClosingPrices() throws Exception {

        Map<String, Double> closingPrices = new HashMap<>();

        try (Reader reader = Files.newBufferedReader(
                Path.of(BHAVCOPY_FILE),
                StandardCharsets.UTF_8
        )) {

            CSVFormat format = CSVFormat.DEFAULT.builder()
                    .setHeader()
                    .setSkipHeaderRecord(true)
                    .build();

            try (CSVParser parser = new CSVParser(reader, format)) {

                for (CSVRecord record : parser) {

                    String isin = record.get("ISIN");
                    String series = record.get("SctySrs");
                    String instrumentType = record.get("FinInstrmTp");

                    if (isin == null || isin.isBlank()) {
                        continue;
                    }

                    // Only normal equity shares
                    if (!"EQ".equalsIgnoreCase(series)) {
                        continue;
                    }

                    if (!"STK".equalsIgnoreCase(instrumentType)) {
                        continue;
                    }

                    String closingPriceText = record.get("ClsPric");

                    if (closingPriceText == null
                            || closingPriceText.isBlank()) {
                        continue;
                    }

                    try {
                        double closingPrice =
                                Double.parseDouble(closingPriceText);

                        if (closingPrice <= 0) {
                            continue;
                        }

                        closingPrices.put(isin, closingPrice);

                    } catch (NumberFormatException ignored) {
                        // Ignore invalid price values
                    }
                }
            }
        }

        System.out.println(
                "NSE closing prices loaded: "
                        + closingPrices.size()
        );

        return closingPrices;
    }
}