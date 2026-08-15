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
public class NseReaderService {

    private static final String NSE_FILE =
            "data/nse/NSE_CM_security_11082026.csv";

    public Map<String, NseData> readNseCompanies() throws Exception {

        Map<String, NseData> nseCompanies = new HashMap<>();

        try (Reader reader = Files.newBufferedReader(
                Path.of(NSE_FILE),
                StandardCharsets.UTF_8
        )) {

            CSVFormat format = CSVFormat.DEFAULT.builder()
                    .setHeader()
                    .setSkipHeaderRecord(true)
                    .build();

            try (CSVParser parser = new CSVParser(reader, format)) {

                for (CSVRecord record : parser) {

                    String isin = record.get("ISIN");
                    String symbol = record.get("TckrSymb");
                    String name = record.get("FinInstrmNm");
                    String series = record.get("SctySrs");

                    if (isin == null || isin.isBlank()) {
                        continue;
                    }

                    // Only normal NSE equity securities
                    if (!"EQ".equalsIgnoreCase(series)) {
                        continue;
                    }

                    double issuedCapital = parseNumber(
                            record.get("IssdCptl")
                    );

                    double faceValue = parseNumber(
                            record.get("ParVal")
                    );

                    nseCompanies.put(
                            isin,
                            new NseData(
                                    isin,
                                    symbol,
                                    name,
                                    issuedCapital,
                                    faceValue
                            )
                    );
                }
            }
        }

    


        System.out.println(
                "NSE companies loaded: " + nseCompanies.size()
        );

        return nseCompanies;
    }

    private double parseNumber(String value) {

        if (value == null || value.isBlank()) {
            return 0.0;
        }

        try {
            return Double.parseDouble(value);
        } catch (NumberFormatException e) {
            return 0.0;
        }
    }

    public static class NseData {

        private final String isin;
        private final String symbol;
        private final String name;
        private final double issuedCapital;
        private final double faceValue;

        public NseData(
                String isin,
                String symbol,
                String name,
                double issuedCapital,
                double faceValue) {

            this.isin = isin;
            this.symbol = symbol;
            this.name = name;
            this.issuedCapital = issuedCapital;
            this.faceValue = faceValue;
        }

        public String getIsin() {
            return isin;
        }

        public String getSymbol() {
            return symbol;
        }

        public String getName() {
            return name;
        }

        public double getIssuedCapital() {
            return issuedCapital;
        }

        public double getFaceValue() {
            return faceValue;
        }
    }
}