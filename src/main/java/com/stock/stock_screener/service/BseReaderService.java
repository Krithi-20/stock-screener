package com.stock.stock_screener.service;

import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.stereotype.Service;

import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

@Service
public class BseReaderService {

    private static final String BSE_FILE =
            "data/bse/scrip/SCRIP/BSE_EQ_SCRIP_11082026.csv";

    public Map<String, String> readBseGroups() throws Exception {

        Map<String, String> bseGroups = new HashMap<>();

        try (Reader reader = Files.newBufferedReader(
                Path.of(BSE_FILE),
                StandardCharsets.UTF_8
        )) {

            CSVFormat format = CSVFormat.DEFAULT.builder()
                    .setHeader()
                    .setSkipHeaderRecord(true)
                    .build();

            try (CSVParser parser = new CSVParser(reader, format)) {

                for (CSVRecord record : parser) {

                    String isin = record.get("ISIN");
                    String group = record.get("SctySrs");

                    if (isin == null || isin.isBlank()) {
                        continue;
                    }

                    if (group == null || group.isBlank()) {
                        continue;
                    }

                    // Only Group A and B
                    if (!group.equalsIgnoreCase("A")
                            && !group.equalsIgnoreCase("B")) {
                        continue;
                    }

                    bseGroups.put(isin, group);
                }
            }
        }

        System.out.println(
                "BSE Group A/B companies loaded: " + bseGroups.size()
        );

        return bseGroups;
    }
}

