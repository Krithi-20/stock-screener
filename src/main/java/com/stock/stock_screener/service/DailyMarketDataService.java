
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
import java.util.LinkedHashMap;
import java.util.Map;
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

    private static final Path BSE_DIR =
            Path.of("data", "bse", "scrip", "SCRIP");

    private static final Path LAST_UPDATE_FILE =
            Path.of("data", "last-data-update.txt");


    // =========================================================
    // FINAL FILES USED BY THE APPLICATION
    // =========================================================

    private static final Path NSE_SECURITY_FILE =
            NSE_DIR.resolve("security-master.csv");

    private static final Path NSE_SECURITY_DATE_FILE =
            NSE_DIR.resolve("security-master-date.txt");

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
    // CONFIGURATION
    // =========================================================

    private static final int MAX_FALLBACK_ATTEMPTS = 10;


    // =========================================================
    // HTTP CLIENT
    // =========================================================

    private final HttpClient httpClient;

    private final NseDownloadService nseDownloadService;

    private final BseDownloadService bseDownloadService;


    public DailyMarketDataService(
            NseDownloadService nseDownloadService,
            BseDownloadService bseDownloadService
    ) {

        this.nseDownloadService =
                nseDownloadService;

        this.bseDownloadService =
                bseDownloadService;

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

            Files.createDirectories(BSE_DIR);

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

            System.err.println(
                    "Continuing with the existing market data, if available."
            );

            e.printStackTrace();

            if (
                    Files.exists(NSE_BHAVCOPY_FILE)
                            &&
                    Files.exists(MCAP_FILE)
                            &&
                    Files.exists(NSE_SECURITY_FILE)
            ) {

                System.out.println(
                        "Previous market data files found. "
                                + "Keeping the existing data."
                );

            } else {

                System.err.println(
                        "Warning: Some existing market data files are missing."
                );
            }
        }
    }


    // =========================================================
    // CHECK WHETHER ALREADY UPDATED TODAY
    // =========================================================

    private boolean alreadyUpdatedToday(
            LocalDate today
    ) throws IOException {

        if (!Files.exists(LAST_UPDATE_FILE)) {

            return false;
        }

        String savedDate =
                Files.readString(
                        LAST_UPDATE_FILE,
                        StandardCharsets.UTF_8
                ).trim();

        return today.toString().equals(savedDate);
    }


    // =========================================================
    // UPDATE EVERYTHING
    // =========================================================

    private void updateAll(
            LocalDate today
    ) throws Exception {

        /*
         * Start with the previous weekday.
         *
         * All four files must use this SAME date.
         */
        LocalDate tradingDate =
                previousWeekday(today);

        System.out.println(
                "Initial trading date: " + tradingDate
        );

        /*
         * Try the same trading date for:
         *
         * 1. NSE Security Master
         * 2. BSE Security Master
         * 3. NSE Bhavcopy
         * 4. NSE Market Cap
         *
         * If a dated file is genuinely unavailable,
         * move to the previous weekday and retry
         * the complete set.
         */
        for (
                int attempt = 0;
                attempt < MAX_FALLBACK_ATTEMPTS;
                attempt++
        ) {

            System.out.println();

            System.out.println(
                    "========================================"
            );

            System.out.println(
                    "Attempt " + (attempt + 1)
                            + " | Trading date: " + tradingDate
            );

            System.out.println(
                    "========================================"
            );

            try {

                updateForTradingDate(
                        tradingDate
                );

                System.out.println();

                System.out.println(
                        "All market data successfully updated "
                                + "for trading date: "
                                + tradingDate
                );

                return;

            } catch (
                    MissingTradingDayException
                            | NseDownloadService.MissingTradingDayException
                            | BseDownloadService.MissingTradingDayException e
            ) {

                System.out.println();

                System.out.println(
                        "Trading date unavailable: "
                                + tradingDate
                );

                System.out.println(
                        "Reason: " + e.getMessage()
                );

                System.out.println(
                        "Trying the previous weekday..."
                );

                tradingDate =
                        previousWeekday(tradingDate);
            }
        }

        throw new IOException(
                "Could not find a common trading date "
                        + "for all market data files in the last "
                        + MAX_FALLBACK_ATTEMPTS
                        + " attempts."
        );
    }


    // =========================================================
    // UPDATE FOR ONE COMMON TRADING DATE
    // =========================================================

    private void updateForTradingDate(
            LocalDate tradingDate
    ) throws Exception {

        Path bhavTemp =
                NSE_DIR.resolve("bhavcopy.tmp");

        Path mcapTemp =
                MCAP_DIR.resolve("marketcap.tmp");

        deleteIfExists(bhavTemp);

        deleteIfExists(mcapTemp);

        Map<String, byte[]> nseBackup = null;

        Map<String, byte[]> bseBackup = null;

        byte[] oldBhavcopy = readIfExists(
                NSE_BHAVCOPY_FILE
        );

        byte[] oldMarketCap = readIfExists(
                MCAP_FILE
        );

        byte[] oldMarketCapDate = readIfExists(
                MCAP_DATE_FILE
        );

        try {

            // =================================================
            // 1. DOWNLOAD NSE BHAVCOPY FOR EXACT DATE
            // =================================================

            System.out.println();

            System.out.println(
                    "[DAILY] Downloading NSE Bhavcopy for "
                            + tradingDate
            );

            byte[] bhavBytes =
                    downloadForExactDate(
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
                    "[DAILY] NSE Bhavcopy ready."
            );


            // =================================================
            // 2. DOWNLOAD MARKET CAP FOR EXACT SAME DATE
            // =================================================

            System.out.println();

            System.out.println(
                    "[DAILY] Downloading NSE Market Cap for "
                            + tradingDate
            );

            byte[] mcapBytes =
                    downloadForExactDate(
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
                    "[DAILY] Market Cap ready."
            );


            // =================================================
            // 3. BACKUP EXISTING SECURITY MASTER FILES
            // =================================================

            /*
             * NSE and BSE services can replace or delete
             * existing files during their download methods.
             *
             * Keep backups so that if either service fails,
             * the previous files can be restored.
             */

            nseBackup =
                    snapshotDirectory(NSE_DIR);

            bseBackup =
                    snapshotDirectory(BSE_DIR);


            // =================================================
            // 4. NSE SECURITY MASTER FOR EXACT SAME DATE
            // =================================================

            System.out.println();

            System.out.println(
                    "[DAILY] Downloading NSE Security Master for "
                            + tradingDate
            );

            nseDownloadService.downloadForDate(
                    tradingDate
            );

            System.out.println(
                    "[DAILY] NSE Security Master ready."
            );


            // =================================================
            // 5. BSE SECURITY MASTER FOR EXACT SAME DATE
            // =================================================

            System.out.println();

            System.out.println(
                    "[DAILY] Downloading BSE Security Master for "
                            + tradingDate
            );

            bseDownloadService.downloadForDate(
                    tradingDate
            );

            System.out.println(
                    "[DAILY] BSE Security Master ready."
            );


            // =================================================
            // 6. VALIDATE SECURITY MASTER FILES
            // =================================================

            validateNonEmpty(
                    NSE_SECURITY_FILE,
                    "NSE Security Master"
            );

            String nseSavedDate =
                    Files.exists(NSE_SECURITY_DATE_FILE)
                            ? Files.readString(
                                    NSE_SECURITY_DATE_FILE,
                                    StandardCharsets.UTF_8
                            ).trim()
                            : "";

            if (
                    !nseSavedDate.equals(
                            tradingDate.toString()
                    )
            ) {

                throw new IOException(
                        "NSE Security Master date mismatch. "
                                + "Expected: "
                                + tradingDate
                                + ", Found: "
                                + nseSavedDate
                );
            }

            String bseExpectedFile =
                    "BSE_EQ_SCRIP_"
                            + tradingDate.format(
                                    DateTimeFormatter.ofPattern("ddMMyyyy")
                            )
                            + ".csv";

            Path bseSecurityFile =
                    BSE_DIR.resolve(
                            bseExpectedFile
                    );

            validateNonEmpty(
                    bseSecurityFile,
                    "BSE Security Master"
            );


            // =================================================
            // 7. ALL FOUR FILES ARE READY
            // =================================================

            System.out.println();

            System.out.println(
                    "All four market data files are ready "
                            + "for " + tradingDate
            );

            System.out.println(
                    "NSE Security Master: OK"
            );

            System.out.println(
                    "BSE Security Master: OK"
            );

            System.out.println(
                    "NSE Bhavcopy: OK"
            );

            System.out.println(
                    "NSE Market Cap: OK"
            );


            // =================================================
            // 8. REPLACE BHAVCOPY AND MARKET CAP
            // =================================================

            /*
             * Only now replace the existing Bhavcopy
             * and Market Cap files.
             *
             * If replacement fails, restore the previous
             * versions.
             */

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


            // =================================================
            // 9. CLEANUP
            // =================================================

            cleanupNseFiles();

            cleanupMarketCapFiles();

            System.out.println();

            System.out.println(
                    "Old files cleaned."
            );

        } catch (Exception e) {

            /*
             * Restore security master directories if
             * they were modified during this attempt.
             */
            if (nseBackup != null) {

                try {

                    restoreDirectory(
                            NSE_DIR,
                            nseBackup
                    );

                } catch (Exception restoreError) {

                    e.addSuppressed(restoreError);
                }
            }

            if (bseBackup != null) {

                try {

                    restoreDirectory(
                            BSE_DIR,
                            bseBackup
                    );

                } catch (Exception restoreError) {

                    e.addSuppressed(restoreError);
                }
            }

            /*
             * Restore the previous Bhavcopy,
             * Market Cap and date marker.
             */
            try {

                restoreFile(
                        NSE_BHAVCOPY_FILE,
                        oldBhavcopy
                );

                restoreFile(
                        MCAP_FILE,
                        oldMarketCap
                );

                restoreFile(
                        MCAP_DATE_FILE,
                        oldMarketCapDate
                );

            } catch (Exception restoreError) {

                e.addSuppressed(restoreError);
            }

            throw e;

        } finally {

            deleteIfExists(bhavTemp);

            deleteIfExists(mcapTemp);
        }
    }


    // =========================================================
    // DOWNLOAD FOR EXACT DATE
    // =========================================================

    /*
     * Downloads a URL for exactly the supplied date.
     *
     * Unlike the previous implementation, this method
     * does not independently fall back.
     *
     * Only HTTP 404 and 410 are treated as unavailable
     * trading dates.
     *
     * Network failures and other HTTP errors are
     * propagated instead of being mistaken for holidays.
     */
    private byte[] downloadForExactDate(
            String urlPattern,
            LocalDate date,
            DateTimeFormatter formatter,
            String reportName
    ) throws Exception {

        String url =
                String.format(
                        urlPattern,
                        date.format(formatter)
                );

        System.out.println(
                "Downloading "
                        + reportName
                        + " for "
                        + date
        );

        System.out.println(
                "URL: " + url
        );

        return download(
                url,
                reportName
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

        if (
                status == 404
                        ||
                status == 410
        ) {

            throw new MissingTradingDayException(
                    reportName
                            + " unavailable for the requested date. HTTP "
                            + status
                            + "\nURL: "
                            + url
            );
        }

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

        boolean found = false;

        try (
                ZipInputStream zip =
                        new ZipInputStream(
                                new ByteArrayInputStream(bytes)
                        )
        ) {

            ZipEntry entry;

            while (
                    (entry = zip.getNextEntry()) != null
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
                            StandardCopyOption.REPLACE_EXISTING
                    );

                    found = true;

                    break;
                }

                zip.closeEntry();
            }
        }

        if (!found) {

            throw new MissingTradingDayException(
                    "No CSV found inside NSE Bhavcopy ZIP."
            );
        }
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

        boolean found = false;

        try (
                ZipInputStream zip =
                        new ZipInputStream(
                                new ByteArrayInputStream(bytes)
                        )
        ) {

            ZipEntry entry;

            while (
                    (entry = zip.getNextEntry()) != null
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
                            StandardCopyOption.REPLACE_EXISTING
                    );

                    found = true;

                    System.out.println(
                            "NSE Market Cap file extracted: "
                                    + expectedFile
                    );

                    break;
                }

                zip.closeEntry();
            }
        }

        if (!found) {

            throw new MissingTradingDayException(
                    "Could not find "
                            + expectedFile
                            + " inside Market Cap ZIP."
            );
        }
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
                    !header.contains(requiredColumn)
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
    // VALIDATE NON-EMPTY FILE
    // =========================================================

    private void validateNonEmpty(
            Path file,
            String description
    ) throws IOException {

        if (
                !Files.exists(file)
                        ||
                Files.size(file) == 0
        ) {

            throw new IOException(
                    description
                            + " is missing or empty: "
                            + file
            );
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
                StandardCopyOption.REPLACE_EXISTING
        );
    }


    // =========================================================
    // SNAPSHOT DIRECTORY
    // =========================================================

    /*
     * Stores the contents of all regular files in a directory.
     *
     * This is used to restore the previous NSE/BSE files
     * if an exact-date download attempt fails.
     */
    private Map<String, byte[]> snapshotDirectory(
            Path directory
    ) throws IOException {

        Map<String, byte[]> snapshot =
                new LinkedHashMap<>();

        Files.createDirectories(directory);

        try (
                DirectoryStream<Path> files =
                        Files.newDirectoryStream(directory)
        ) {

            for (Path file : files) {

                if (!Files.isRegularFile(file)) {

                    continue;
                }

                snapshot.put(
                        file.getFileName().toString(),
                        Files.readAllBytes(file)
                );
            }
        }

        return snapshot;
    }


    // =========================================================
    // RESTORE DIRECTORY
    // =========================================================

    /*
     * Removes current regular files and restores
     * the previous directory contents.
     */
    private void restoreDirectory(
            Path directory,
            Map<String, byte[]> snapshot
    ) throws IOException {

        Files.createDirectories(directory);

        try (
                DirectoryStream<Path> files =
                        Files.newDirectoryStream(directory)
        ) {

            for (Path file : files) {

                if (Files.isRegularFile(file)) {

                    Files.deleteIfExists(file);
                }
            }
        }

        for (
                Map.Entry<String, byte[]> entry
                        : snapshot.entrySet()
        ) {

            Path destination =
                    directory.resolve(
                            entry.getKey()
                    );

            Files.write(
                    destination,
                    entry.getValue()
            );
        }
    }


    // =========================================================
    // READ EXISTING FILE
    // =========================================================

    private byte[] readIfExists(
            Path file
    ) throws IOException {

        if (!Files.exists(file)) {

            return null;
        }

        return Files.readAllBytes(file);
    }


    // =========================================================
    // RESTORE FILE
    // =========================================================

    /*
     * If the previous file existed, restore its contents.
     * Otherwise, remove the newly created file.
     */
    private void restoreFile(
            Path file,
            byte[] previousContents
    ) throws IOException {

        if (previousContents == null) {

            Files.deleteIfExists(file);

            return;
        }

        Files.write(
                file,
                previousContents
        );
    }


    // =========================================================
    // CLEAN NSE
    // =========================================================

    private void cleanupNseFiles()
            throws IOException {

        try (
                DirectoryStream<Path> files =
                        Files.newDirectoryStream(NSE_DIR)
        ) {

            for (Path file : files) {

                if (Files.isDirectory(file)) {

                    continue;
                }

                String name =
                        file.getFileName()
                                .toString()
                                .toLowerCase();

                /*
                 * Preserve the NSE Security Master date marker.
                 *
                 * It is required to identify which trading date
                 * security-master.csv represents.
                 */
                boolean keep =
                        name.equals("security-master.csv")
                                ||
                        name.equals("security-master-date.txt")
                                ||
                        name.equals("bhavcopy.csv");

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
                        Files.newDirectoryStream(MCAP_DIR)
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
                        name.equals("marketcap.csv")
                                ||
                        name.equals("latest-date.txt");

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


    // =========================================================
    // MISSING TRADING DAY EXCEPTION
    // =========================================================

    /*
     * Thrown only when a dated market data file
     * is genuinely unavailable.
     *
     * This is the only type of error that causes
     * the service to try the previous weekday.
     */
    private static class MissingTradingDayException
            extends IOException {

        public MissingTradingDayException(
                String message
        ) {

            super(message);
        }
    }
}
