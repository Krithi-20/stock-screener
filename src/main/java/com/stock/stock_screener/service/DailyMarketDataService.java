package com.stock.stock_screener.service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;

@Service
public class DailyMarketDataService {

    // =========================================================
    // DIRECTORIES
    // =========================================================

    private static final Path NSE_DIR =
            Path.of("data", "nse");

    private static final Path MCAP_DIR =
            Path.of("data", "marketcap");

    private static final Path LAST_UPDATE_FILE =
            Path.of("data", "last-data-update.txt");

    // =========================================================
    // FINAL FILES USED BY THE APPLICATION
    // =========================================================

    private static final Path NSE_SECURITY_FILE =
            NSE_DIR.resolve("security-master.csv");

    private static final Path NSE_BHAVCOPY_FILE =
            NSE_DIR.resolve("bhavcopy.csv");

    private static final Path MCAP_FILE =
            MCAP_DIR.resolve("marketcap.csv");

    private static final Path MCAP_DATE_FILE =
            MCAP_DIR.resolve("latest-date.txt");

    // =========================================================
    // URLS
    // =========================================================

    /*
     * NSE BHAVCOPY
     *
     * Example:
     * BhavCopy_NSE_CM_0_0_0_20260814_F_0000.csv.zip
     */
    private static final String NSE_BHAVCOPY_URL =
            "https://nsearchives.nseindia.com/content/cm/"
                    + "BhavCopy_NSE_CM_0_0_0_%s_F_0000.csv.zip";

    /*
     * NSE Market Cap.
     */
    private static final String NSE_MCAP_URL =
            "https://archives.nseindia.com/"
                    + "archives/equities/bhavcopy/pr/PR%s.zip";

    // =========================================================
    // DATE FORMATS
    // =========================================================

    private static final DateTimeFormatter BHAVCOPY_DATE =
            DateTimeFormatter.ofPattern("yyyyMMdd");

    private static final DateTimeFormatter MCAP_DATE =
            DateTimeFormatter.ofPattern("ddMMyy");

    private static final DateTimeFormatter MCAP_FILE_DATE =
            DateTimeFormatter.ofPattern("ddMMyyyy");

    // =========================================================
    // HTTP CLIENT
    // =========================================================

    private final HttpClient httpClient;

    private final NseDownloadService nseDownloadService;

    public DailyMarketDataService(
            NseDownloadService nseDownloadService
    ) {

        this.nseDownloadService =
                nseDownloadService;

        this.httpClient =
                HttpClient.newBuilder()
                        .followRedirects(
                                HttpClient.Redirect.NORMAL
                        )
                        .build();
    }

    // =========================================================
    // STARTUP
    // =========================================================

    @PostConstruct
    public void initialize() {

        try {

            Files.createDirectories(NSE_DIR);
            Files.createDirectories(MCAP_DIR);

            LocalDate today =
                    LocalDate.now();

            /*
             * Only update once per calendar day.
             */
            if (alreadyUpdatedToday(today)) {

                System.out.println(
                        "Daily market data already updated today."
                );

                return;
            }

            System.out.println();
            System.out.println(
                    "===== DAILY MARKET DATA UPDATE ====="
            );

            System.out.println(
                    "Update date: " + today
            );

            updateAll(today);

            /*
             * Mark today as successfully updated
             * ONLY after everything succeeded.
             */
            Files.writeString(
                    LAST_UPDATE_FILE,
                    today.toString(),
                    StandardCharsets.UTF_8
            );

            System.out.println(
                    "Daily market data update completed."
            );

            System.out.println(
                    "====================================="
            );

        } catch (Exception e) {

            System.err.println(
                    "Daily market data update failed."
            );

            /*
             * Existing files remain untouched.
             */
            System.err.println(
                    "Existing data has NOT been deleted."
            );

            e.printStackTrace();
        }
    }

    // =========================================================
    // CHECK WHETHER ALREADY UPDATED TODAY
    // =========================================================

    private boolean alreadyUpdatedToday(
            LocalDate today
    ) throws IOException {

        if (!Files.exists(
                LAST_UPDATE_FILE
        )) {

            return false;
        }

        String savedDate =
                Files.readString(
                        LAST_UPDATE_FILE,
                        StandardCharsets.UTF_8
                ).trim();

        return today.toString()
                .equals(savedDate);
    }

    // =========================================================
    // UPDATE EVERYTHING
    // =========================================================

    private void updateAll(
            LocalDate today
    ) throws Exception {

        /*
         * Market data uses the previous weekday.
         */
        LocalDate tradingDate =
                previousWeekday(today);

        System.out.println(
                "Trading date: "
                        + tradingDate
        );

        // =====================================================
        // 1. NSE SECURITY MASTER
        // =====================================================

        /*
         * Completely handled by NseDownloadService.
         */
        nseDownloadService
                .downloadPreviousTradingDayFile();

        // =====================================================
        // 2. NSE BHAVCOPY
        // =====================================================

        Path bhavTemp =
                NSE_DIR.resolve(
                        "bhavcopy.tmp"
                );

        Path mcapTemp =
                MCAP_DIR.resolve(
                        "marketcap.tmp"
                );

        deleteIfExists(bhavTemp);
        deleteIfExists(mcapTemp);

        byte[] bhavBytes =
                downloadWithFallback(
                        NSE_BHAVCOPY_URL,
                        tradingDate,
                        BHAVCOPY_DATE,
                        "NSE Bhavcopy"
                );

        extractFirstCsv(
                bhavBytes,
                bhavTemp
        );

        validateCsv(
                bhavTemp,
                "ISIN"
        );

        System.out.println(
                "NSE Bhavcopy ready."
        );

        // =====================================================
        // 3. MARKET CAP
        // =====================================================

        byte[] mcapBytes =
                downloadWithFallback(
                        NSE_MCAP_URL,
                        tradingDate,
                        MCAP_DATE,
                        "NSE Market Cap"
                );

        extractMarketCap(
                mcapBytes,
                mcapTemp,
                tradingDate
        );

        validateCsv(
                mcapTemp,
                "Market Cap(Rs.)"
        );

        System.out.println(
                "Market cap ready."
        );

        // =====================================================
        // ALL NEW FILES ARE VALID
        //
        // ONLY NOW replace old files.
        // =====================================================

        replaceFile(
                bhavTemp,
                NSE_BHAVCOPY_FILE
        );

        replaceFile(
                mcapTemp,
                MCAP_FILE
        );

        Files.writeString(
                MCAP_DATE_FILE,
                tradingDate.toString(),
                StandardCharsets.UTF_8
        );

        // =====================================================
        // DELETE OLD / EXCESS FILES
        // =====================================================

        cleanupNseFiles();

        cleanupMarketCapFiles();

        System.out.println(
                "Old files cleaned."
        );
    }

    // =========================================================
    // DOWNLOAD WITH FALLBACK
    // =========================================================

    private byte[] downloadWithFallback(
            String urlPattern,
            LocalDate startDate,
            DateTimeFormatter formatter,
            String reportName
    ) throws Exception {

        LocalDate date =
                startDate;

        for (
                int attempt = 0;
                attempt < 7;
                attempt++
        ) {

            while (isWeekend(date)) {

                date =
                        date.minusDays(1);
            }

            String url =
                    String.format(
                            urlPattern,
                            date.format(formatter)
                    );

            try {

                System.out.println(
                        "Downloading "
                                + reportName
                                + ": "
                                + url
                );

                return download(
                        url,
                        reportName
                );

            } catch (Exception e) {

                System.out.println(
                        reportName
                                + " unavailable for "
                                + date
                                + ". Trying previous date."
                );

                date =
                        date.minusDays(1);
            }
        }

        throw new IOException(
                "Could not download "
                        + reportName
                        + " for the previous "
                        + "7 trading days."
        );
    }

    // =========================================================
    // HTTP DOWNLOAD
    // =========================================================

    private byte[] download(
            String url,
            String reportName
    ) throws IOException, InterruptedException {

        HttpRequest request =
                HttpRequest.newBuilder()
                        .uri(URI.create(url))
                        .header(
                                "User-Agent",
                                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                                        + "AppleWebKit/537.36 "
                                        + "(KHTML, like Gecko) "
                                        + "Chrome/151.0.0.0 Safari/537.36"
                        )
                        .header(
                                "Accept",
                                "text/html,application/xhtml+xml,"
                                        + "application/xml;q=0.9,"
                                        + "image/avif,image/webp,*/*;q=0.8"
                        )
                        .header(
                                "Accept-Language",
                                "en-US,en;q=0.9"
                        )
                        .header(
                                "Referer",
                                "https://www.nseindia.com/"
                        )
                        .GET()
                        .build();

        HttpResponse<byte[]> response =
                httpClient.send(
                        request,
                        HttpResponse.BodyHandlers
                                .ofByteArray()
                );

        int status =
                response.statusCode();

        byte[] body =
                response.body();

        if (status != 200) {

            throw new IOException(
                    reportName
                            + " download failed. HTTP "
                            + status
                            + "\nURL: "
                            + url
                            + "\nResponse size: "
                            + body.length
            );
        }

        if (body.length == 0) {

            throw new IOException(
                    reportName
                            + " returned empty data."
            );
        }

        return body;
    }

    // =========================================================
    // ZIP -> FIRST CSV
    // =========================================================

    private void extractFirstCsv(
            byte[] bytes,
            Path destination
    ) throws IOException {

        deleteIfExists(destination);

        try (
                ZipInputStream zip =
                        new ZipInputStream(
                                new ByteArrayInputStream(
                                        bytes
                                )
                        )
        ) {

            ZipEntry entry;

            while (
                    (entry =
                            zip.getNextEntry())
                            != null
            ) {

                if (entry.isDirectory()) {
                    continue;
                }

                String name =
                        Path.of(
                                entry.getName()
                        )
                                .getFileName()
                                .toString()
                                .toLowerCase();

                if (name.endsWith(".csv")) {

                    Files.copy(
                            zip,
                            destination,
                            StandardCopyOption
                                    .REPLACE_EXISTING
                    );

                    return;
                }
            }
        }

        throw new IOException(
                "No CSV found inside NSE Bhavcopy ZIP."
        );
    }

    // =========================================================
    // MARKET CAP ZIP
    // =========================================================

    private void extractMarketCap(
            byte[] bytes,
            Path destination,
            LocalDate tradingDate
    ) throws IOException {

        deleteIfExists(destination);

        String expectedFile =
                "mcap"
                        + tradingDate.format(
                                MCAP_FILE_DATE
                        )
                        + ".csv";

        System.out.println(
                "Looking for Market Cap file: "
                        + expectedFile
        );

        try (
                ZipInputStream zip =
                        new ZipInputStream(
                                new ByteArrayInputStream(
                                        bytes
                                )
                        )
        ) {

            ZipEntry entry;

            while (
                    (entry =
                            zip.getNextEntry())
                            != null
            ) {

                if (entry.isDirectory()) {
                    continue;
                }

                String fileName =
                        Path.of(
                                entry.getName()
                        )
                                .getFileName()
                                .toString();

                System.out.println(
                        "Market Cap ZIP entry: "
                                + fileName
                );

                if (
                        fileName.equalsIgnoreCase(
                                expectedFile
                        )
                ) {

                    Files.copy(
                            zip,
                            destination,
                            StandardCopyOption
                                    .REPLACE_EXISTING
                    );

                    System.out.println(
                            "NSE Market Cap file extracted: "
                                    + expectedFile
                    );

                    return;
                }
            }
        }

        throw new IOException(
                "Could not find "
                        + expectedFile
                        + " inside Market Cap ZIP."
        );
    }

    // =========================================================
    // CSV VALIDATION
    // =========================================================

    private void validateCsv(
            Path file,
            String requiredColumn
    ) throws IOException {

        if (
                !Files.exists(file)
                        ||
                Files.size(file) < 100
        ) {

            throw new IOException(
                    "Invalid or empty file: "
                            + file
            );
        }

        try (
                var reader =
                        Files.newBufferedReader(
                                file,
                                StandardCharsets.UTF_8
                        )
        ) {

            String header =
                    reader.readLine();

            if (
                    header == null
                            ||
                    !header.contains(
                            requiredColumn
                    )
            ) {

                throw new IOException(
                        "Required column '"
                                + requiredColumn
                                + "' not found in "
                                + file
                );
            }
        }
    }

    // =========================================================
    // REPLACE FILE
    // =========================================================

    private void replaceFile(
            Path source,
            Path target
    ) throws IOException {

        Files.move(
                source,
                target,
                StandardCopyOption
                        .REPLACE_EXISTING
        );
    }

    // =========================================================
    // CLEAN NSE
    // =========================================================

    private void cleanupNseFiles()
            throws IOException {

        try (
                DirectoryStream<Path> files =
                        Files.newDirectoryStream(
                                NSE_DIR
                        )
        ) {

            for (Path file : files) {

                if (Files.isDirectory(file)) {
                    continue;
                }

                String name =
                        file.getFileName()
                                .toString()
                                .toLowerCase();

                boolean keep =
                        name.equals(
                                "security-master.csv"
                        )
                                ||
                        name.equals(
                                "bhavcopy.csv"
                        );

                if (!keep) {

                    Files.deleteIfExists(file);
                }
            }
        }
    }

    // =========================================================
    // CLEAN MARKET CAP
    // =========================================================

    private void cleanupMarketCapFiles()
            throws IOException {

        try (
                DirectoryStream<Path> files =
                        Files.newDirectoryStream(
                                MCAP_DIR
                        )
        ) {

            for (Path file : files) {

                if (Files.isDirectory(file)) {
                    continue;
                }

                String name =
                        file.getFileName()
                                .toString()
                                .toLowerCase();

                boolean keep =
                        name.equals(
                                "marketcap.csv"
                        )
                                ||
                        name.equals(
                                "latest-date.txt"
                        );

                if (!keep) {

                    Files.deleteIfExists(file);
                }
            }
        }
    }

    // =========================================================
    // DATE HELPERS
    // =========================================================

    private LocalDate previousWeekday(
            LocalDate date
    ) {

        date =
                date.minusDays(1);

        while (isWeekend(date)) {

            date =
                    date.minusDays(1);
        }

        return date;
    }

    private boolean isWeekend(
            LocalDate date
    ) {

        return date.getDayOfWeek()
                        == DayOfWeek.SATURDAY
                ||
                date.getDayOfWeek()
                        == DayOfWeek.SUNDAY;
    }

    // =========================================================
    // DELETE FILE
    // =========================================================

    private void deleteIfExists(
            Path file
    ) throws IOException {

        Files.deleteIfExists(file);
    }
}