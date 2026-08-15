package com.stock.stock_screener.service;

import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import org.springframework.stereotype.Service;

@Service
public class NseDailyMarketCapService {

    private static final Path MARKET_CAP_DIR =
            Path.of("data", "marketcap");

    private static final Path LAST_UPDATED_FILE =
            MARKET_CAP_DIR.resolve("latest-date.txt");

    private static final String NSE_BASE_URL =
            "https://archives.nseindia.com/archives/equities/bhavcopy/pr/";

    private final HttpClient httpClient;

    public NseDailyMarketCapService() {

        this.httpClient =
                HttpClient.newBuilder()
                        .followRedirects(
                                HttpClient.Redirect.NORMAL
                        )
                        .build();
    }

    // =========================================================
    // GET PREVIOUS TRADING DAY
    // =========================================================

    public LocalDate getLatestTradingDate() {

        LocalDate date =
                LocalDate.now()
                        .minusDays(1);

        while (isWeekend(date)) {

            date =
                    date.minusDays(1);
        }

        return date;
    }

    private boolean isWeekend(
            LocalDate date) {

        DayOfWeek day =
                date.getDayOfWeek();

        return day == DayOfWeek.SATURDAY
                || day == DayOfWeek.SUNDAY;
    }

    // =========================================================
    // MAIN UPDATE
    // =========================================================

    public Path updateMarketCapIfNeeded()
            throws IOException, InterruptedException {

        Files.createDirectories(
                MARKET_CAP_DIR
        );

        LocalDate requiredDate =
                getLatestTradingDate();

        LocalDate lastUpdatedDate =
                getLastUpdatedDate();

        System.out.println();
        System.out.println(
                "===== NSE MARKET CAP UPDATE ====="
        );

        System.out.println(
                "Required market-cap date: "
                        + requiredDate
        );

        System.out.println(
                "Last processed date: "
                        + (
                        lastUpdatedDate == null
                                ? "Never"
                                : lastUpdatedDate
                )
        );

        // =====================================================
        // ALREADY UP TO DATE
        // =====================================================

        if (lastUpdatedDate != null
                && !lastUpdatedDate
                .isBefore(requiredDate)) {

            System.out.println(
                    "Market cap already updated for "
                            + requiredDate
            );

            System.out.println(
                    "No download required."
            );

            System.out.println(
                    "================================"
            );

            return findMarketCapFile(
                    requiredDate
            );
        }

        // =====================================================
        // FILENAMES
        // =====================================================

        String zipDate =
                String.format(
                        "%02d%02d%02d",
                        requiredDate.getDayOfMonth(),
                        requiredDate.getMonthValue(),
                        requiredDate.getYear() % 100
                );

        String csvDate =
                String.format(
                        "%02d%02d%04d",
                        requiredDate.getDayOfMonth(),
                        requiredDate.getMonthValue(),
                        requiredDate.getYear()
                );

        String zipFileName =
                "PR" + zipDate + ".zip";

        String csvFileName =
                "mcap" + csvDate + ".csv";

        Path zipPath =
                MARKET_CAP_DIR.resolve(
                        zipFileName
                );

        Path newCsvPath =
                MARKET_CAP_DIR.resolve(
                        csvFileName
                );

        String downloadUrl =
                NSE_BASE_URL + zipFileName;

        System.out.println(
                "Downloading: "
                        + zipFileName
        );

        System.out.println(
                "URL: "
                        + downloadUrl
        );

        // =====================================================
        // DOWNLOAD
        // =====================================================

        downloadFile(
                downloadUrl,
                zipPath
        );

        System.out.println(
                "Download completed."
        );

        // =====================================================
        // EXTRACT
        // =====================================================

        try {

            extractMarketCapCsv(
                    zipPath,
                    csvFileName,
                    newCsvPath
            );

            System.out.println(
                    "Market cap CSV extracted: "
                            + newCsvPath
            );

        } catch (Exception e) {

            /*
             * New report failed extraction.
             *
             * Keep previous MCAP data safe.
             */
            tryDelete(zipPath);

            throw e;
        }

        // =====================================================
        // VALIDATE NEW FILE
        // =====================================================

        if (!Files.exists(newCsvPath)
                || Files.size(newCsvPath) == 0) {

            tryDelete(newCsvPath);
            tryDelete(zipPath);

            throw new IOException(
                    "Downloaded market-cap CSV is empty."
            );
        }

        // =====================================================
        // CLEAN OLD FILES
        // =====================================================

        cleanupOldMarketCapFiles(
                newCsvPath
        );

        // =====================================================
        // SAVE LAST PROCESSED DATE
        // =====================================================

        saveLastUpdatedDate(
                requiredDate
        );

        System.out.println(
                "Saved last processed date: "
                        + requiredDate
        );

        System.out.println(
                "Old market-cap files cleaned."
        );

        System.out.println(
                "================================"
        );

        return newCsvPath;
    }

    // =========================================================
    // DOWNLOAD
    // =========================================================

    private void downloadFile(
            String url,
            Path destination)
            throws IOException, InterruptedException {

        HttpRequest request =
                HttpRequest.newBuilder()
                        .uri(
                                URI.create(url)
                        )
                        .header(
                                "User-Agent",
                                "Mozilla/5.0"
                        )
                        .header(
                                "Accept",
                                "*/*"
                        )
                        .GET()
                        .build();

        HttpResponse<InputStream> response =
                httpClient.send(
                        request,
                        HttpResponse.BodyHandlers
                                .ofInputStream()
                );

        if (response.statusCode() != 200) {

            response.body().close();

            throw new IOException(
                    "NSE download failed. HTTP status: "
                            + response.statusCode()
                            + "\nURL: "
                            + url
            );
        }

        try (
                InputStream inputStream =
                        response.body()
        ) {

            Files.copy(
                    inputStream,
                    destination,
                    StandardCopyOption
                            .REPLACE_EXISTING
            );
        }
    }

    // =========================================================
    // EXTRACT CSV
    // =========================================================

    private void extractMarketCapCsv(
            Path zipPath,
            String expectedCsvFileName,
            Path destination)
            throws IOException {

        boolean found = false;

        try (
                InputStream fileInputStream =
                        Files.newInputStream(
                                zipPath
                        );

                ZipInputStream zipInputStream =
                        new ZipInputStream(
                                fileInputStream
                        )
        ) {

            ZipEntry entry;

            while (
                    (entry =
                            zipInputStream
                                    .getNextEntry())
                            != null
            ) {

                String entryName =
                        Path.of(
                                entry.getName()
                        )
                        .getFileName()
                        .toString();

                if (entryName.equalsIgnoreCase(
                        expectedCsvFileName
                )) {

                    Files.copy(
                            zipInputStream,
                            destination,
                            StandardCopyOption
                                    .REPLACE_EXISTING
                    );

                    found = true;

                    break;
                }

                zipInputStream.closeEntry();
            }
        }

        if (!found) {

            throw new IOException(
                    "Could not find "
                            + expectedCsvFileName
                            + " inside "
                            + zipPath.getFileName()
            );
        }
    }

    // =========================================================
    // CLEANUP
    // =========================================================

    private void cleanupOldMarketCapFiles(
            Path newCsvPath)
            throws IOException {

        try (
                var files =
                        Files.list(
                                MARKET_CAP_DIR
                        )
        ) {

            files.forEach(file -> {

                try {

                    String fileName =
                            file.getFileName()
                                    .toString()
                                    .toLowerCase();

                    // -----------------------------------------
                    // Delete old MCAP CSV
                    // -----------------------------------------

                    if (
                            fileName.startsWith("mcap")
                            && fileName.endsWith(".csv")
                            && !file.equals(newCsvPath)
                    ) {

                        Files.deleteIfExists(
                                file
                        );

                        System.out.println(
                                "Deleted old MCAP file: "
                                        + file.getFileName()
                        );
                    }

                    // -----------------------------------------
                    // Delete ZIP files
                    // -----------------------------------------

                    else if (
                            fileName.startsWith("pr")
                            && fileName.endsWith(".zip")
                    ) {

                        Files.deleteIfExists(
                                file
                        );

                        System.out.println(
                                "Deleted ZIP: "
                                        + file.getFileName()
                        );
                    }

                } catch (IOException e) {

                    throw new RuntimeException(
                            "Could not delete old file: "
                                    + file,
                            e
                    );
                }
            });
        }
    }

    // =========================================================
    // LAST UPDATED DATE
    // =========================================================

    public LocalDate getLastUpdatedDate()
            throws IOException {

        if (!Files.exists(
                LAST_UPDATED_FILE
        )) {

            return null;
        }

        String value =
                Files.readString(
                        LAST_UPDATED_FILE
                ).trim();

        if (value.isEmpty()) {

            return null;
        }

        return LocalDate.parse(
                value
        );
    }

    // =========================================================
    // SAVE DATE
    // =========================================================

    private void saveLastUpdatedDate(
            LocalDate date)
            throws IOException {

        Files.writeString(
                LAST_UPDATED_FILE,
                date.toString()
        );
    }

    // =========================================================
    // FIND CURRENT FILE
    // =========================================================

    private Path findMarketCapFile(
            LocalDate date)
            throws IOException {

        String csvDate =
                String.format(
                        "%02d%02d%04d",
                        date.getDayOfMonth(),
                        date.getMonthValue(),
                        date.getYear()
                );

        Path csvPath =
                MARKET_CAP_DIR.resolve(
                        "mcap"
                                + csvDate
                                + ".csv"
                );

        if (!Files.exists(
                csvPath
        )) {

            throw new IOException(
                    "latest-date.txt says "
                            + date
                            + " was processed, "
                            + "but the MCAP CSV is missing: "
                            + csvPath
            );
        }

        return csvPath;
    }

    // =========================================================
    // SAFE DELETE
    // =========================================================

    private void tryDelete(
            Path file) {

        try {

            Files.deleteIfExists(
                    file
            );

        } catch (IOException e) {

            System.err.println(
                    "Could not delete: "
                            + file
            );
        }
    }
}