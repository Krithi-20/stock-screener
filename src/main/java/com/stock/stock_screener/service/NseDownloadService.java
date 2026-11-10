package com.stock.stock_screener.service;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.zip.GZIPInputStream;

import org.springframework.stereotype.Service;

@Service
public class NseDownloadService {

    private static final Path NSE_DIRECTORY =
            Path.of("data", "nse");

    /*
     * This is the ONLY NSE security master file
     * that the rest of the application will read.
     */
    private static final Path CURRENT_SECURITY_FILE =
            NSE_DIRECTORY.resolve(
                    "security-master.csv"
            );

    /*
     * Stores the trading date represented by
     * security-master.csv.
     */
    private static final Path DATE_MARKER =
            NSE_DIRECTORY.resolve(
                    "security-master-date.txt"
            );

    private static final DateTimeFormatter DATE_FORMAT =
            DateTimeFormatter.ofPattern("ddMMyyyy");

    private static final String NSE_SECURITY_URL =
            "https://nsearchives.nseindia.com/content/cm/"
                    + "NSE_CM_security_%s.csv.gz";


    // =========================================================
    // DOWNLOAD PREVIOUS TRADING DAY
    // =========================================================

    /*
     * Starts with the previous weekday.
     *
     * If NSE does not have a file for that date
     * (HTTP 404 or 410), it tries the previous weekday.
     *
     * This handles unexpected market holidays.
     *
     * Other errors, such as network failures or
     * server errors, do not trigger date fallback.
     */
    public void downloadPreviousTradingDayFile() {

        try {

            Files.createDirectories(
                    NSE_DIRECTORY
            );

            LocalDate tradingDate =
                    getPreviousTradingDay();

            /*
             * Try up to 10 previous weekdays.
             */
            for (
                    int attempt = 0;
                    attempt < 10;
                    attempt++
            ) {

                try {

                    System.out.println(
                            "[NSE] Trying Security Master for "
                                    + tradingDate
                                    + "..."
                    );

                    downloadForDate(
                            tradingDate
                    );

                    return;

                } catch (
                        MissingTradingDayException e
                ) {

                    System.out.println(
                            "[NSE] Security Master unavailable for "
                                    + tradingDate
                                    + ". Trying previous weekday."
                    );

                    tradingDate =
                            getPreviousWeekday(
                                    tradingDate
                            );
                }
            }

            throw new IOException(
                    "[NSE] Could not find a Security Master "
                            + "file in the last 10 attempts."
            );

        } catch (Exception e) {

            System.err.println(
                    "[NSE] Download failed: "
                            + e.getMessage()
            );

            /*
             * Existing security-master.csv remains
             * untouched if the new download fails.
             */
        }
    }


    // =========================================================
    // DOWNLOAD FOR AN EXACT DATE
    // =========================================================

    /*
     * Downloads the NSE Security Master for exactly
     * the supplied trading date.
     *
     * This method will be used by DailyMarketDataService
     * when coordinating the trading date across files.
     *
     * It does NOT independently move backwards to another date.
     */
    public void downloadForDate(
            LocalDate tradingDate
    ) throws IOException {

        Files.createDirectories(
                NSE_DIRECTORY
        );

        String date =
                tradingDate.format(
                        DATE_FORMAT
                );

        /*
         * Temporary files are dated so we know
         * exactly which trading day's file we downloaded.
         */
        Path tempCsvFile =
                NSE_DIRECTORY.resolve(
                        "NSE_CM_security_"
                                + date
                                + ".csv.tmp"
                );

        Path gzipFile =
                NSE_DIRECTORY.resolve(
                        "NSE_CM_security_"
                                + date
                                + ".csv.gz.tmp"
                );

        /*
         * If the current security-master.csv already exists
         * AND it represents the requested trading date,
         * skip downloading.
         */
        if (
                Files.exists(
                        CURRENT_SECURITY_FILE
                )
                        &&
                Files.exists(
                        DATE_MARKER
                )
        ) {

            String savedDate =
                    Files.readString(
                            DATE_MARKER
                    ).trim();

            if (
                    savedDate.equals(
                            tradingDate.toString()
                    )
            ) {

                System.out.println(
                        "[NSE] Security Master for "
                                + tradingDate
                                + " already exists. "
                                + "Skipping download."
                );

                return;
            }
        }

        System.out.println(
                "[NSE] Downloading Security Master for "
                        + tradingDate
                        + "..."
        );

        String url =
                String.format(
                        NSE_SECURITY_URL,
                        date
                );

        try {

            /*
             * Download the gzip first.
             */
            downloadFile(
                    url,
                    gzipFile
            );

            /*
             * Extract:
             *
             * NSE_CM_security_DDMMYYYY.csv.gz
             *                 ↓
             * NSE_CM_security_DDMMYYYY.csv
             */
            extractGzip(
                    gzipFile,
                    tempCsvFile
            );

            /*
             * Make sure the downloaded CSV is not empty.
             */
            if (
                    !Files.exists(
                            tempCsvFile
                    )
                            ||
                    Files.size(
                            tempCsvFile
                    ) == 0
            ) {

                throw new IOException(
                        "Downloaded NSE Security Master "
                                + "is empty."
                );
            }

            /*
             * IMPORTANT:
             *
             * The dated file is only temporary.
             *
             * The application always reads:
             *
             * data/nse/security-master.csv
             *
             * Replace the active file only after the
             * new file has downloaded and extracted.
             */
            Files.move(
                    tempCsvFile,
                    CURRENT_SECURITY_FILE,
                    StandardCopyOption
                            .REPLACE_EXISTING
            );

            /*
             * Store which trading date the current
             * security-master.csv belongs to.
             */
            Files.writeString(
                    DATE_MARKER,
                    tradingDate.toString()
            );

            /*
             * Delete any remaining old dated
             * security-master files.
             */
            deleteOldNseFiles();

            System.out.println(
                    "[NSE] Download successful: "
                            + CURRENT_SECURITY_FILE
                            + " for "
                            + tradingDate
            );

        } finally {

            /*
             * Clean up temporary files whether
             * the download succeeds or fails.
             */
            Files.deleteIfExists(
                    tempCsvFile
            );

            Files.deleteIfExists(
                    gzipFile
            );
        }
    }


    // =========================================================
    // PREVIOUS TRADING DAY
    // =========================================================

    /*
     * Returns the previous weekday.
     *
     * Saturday -> Friday
     * Sunday   -> Friday
     *
     * This handles weekends.
     * Unexpected market holidays are handled by
     * the download fallback logic above.
     */
    private LocalDate getPreviousTradingDay() {

        return getPreviousWeekday(
                LocalDate.now()
        );
    }


    /*
     * Returns the previous weekday relative to
     * the supplied date.
     */
    private LocalDate getPreviousWeekday(
            LocalDate date
    ) {

        LocalDate previousDate =
                date.minusDays(1);

        while (
                isWeekend(
                        previousDate
                )
        ) {

            previousDate =
                    previousDate.minusDays(1);
        }

        return previousDate;
    }


    /*
     * Checks whether a date falls on a weekend.
     */
    private boolean isWeekend(
            LocalDate date
    ) {

        DayOfWeek day =
                date.getDayOfWeek();

        return day == DayOfWeek.SATURDAY
                ||
                day == DayOfWeek.SUNDAY;
    }


    // =========================================================
    // DELETE OLD DATED FILES
    // =========================================================

    private void deleteOldNseFiles()
            throws IOException {

        try (
                DirectoryStream<Path> files =
                        Files.newDirectoryStream(
                                NSE_DIRECTORY
                        )
        ) {

            for (Path file : files) {

                if (
                        Files.isDirectory(file)
                ) {

                    continue;
                }

                String name =
                        file.getFileName()
                                .toString();

                /*
                 * Delete only dated NSE security
                 * master CSV files.
                 *
                 * Do not delete:
                 *
                 * security-master.csv
                 * security-master-date.txt
                 */
                if (
                        name.startsWith(
                                "NSE_CM_security_"
                        )
                                &&
                        (
                                name.endsWith(".csv")
                                        ||
                                name.endsWith(".csv.gz")
                        )
                ) {

                    Files.deleteIfExists(
                            file
                    );

                    System.out.println(
                            "[NSE] Deleted old file: "
                                    + name
                    );
                }
            }
        }
    }


    // =========================================================
    // DOWNLOAD
    // =========================================================

    private void downloadFile(
            String urlString,
            Path destination
    ) throws IOException {

        HttpURLConnection connection =
                (HttpURLConnection)
                        URI.create(
                                urlString
                        )
                                .toURL()
                                .openConnection();

        try {

            connection.setRequestMethod(
                    "GET"
            );

            connection.setRequestProperty(
                    "User-Agent",
                    "Mozilla/5.0"
            );

            connection.setRequestProperty(
                    "Accept",
                    "*/*"
            );

            connection.setConnectTimeout(
                    15000
            );

            connection.setReadTimeout(
                    30000
            );

            int responseCode =
                    connection.getResponseCode();

            /*
             * HTTP 404:
             * File not found for the requested date.
             *
             * HTTP 410:
             * Requested file is no longer available.
             *
             * These are the only responses that trigger
             * the previous-weekday fallback.
             */
            if (
                    responseCode
                            == HttpURLConnection.HTTP_NOT_FOUND
                            ||
                    responseCode
                            == HttpURLConnection.HTTP_GONE
            ) {

                throw new MissingTradingDayException(
                        "NSE file unavailable. HTTP "
                                + responseCode
                );
            }

            /*
             * Other HTTP errors are treated as actual
             * download failures, not as holidays.
             */
            if (
                    responseCode
                            != HttpURLConnection.HTTP_OK
            ) {

                throw new IOException(
                        "NSE returned HTTP "
                                + responseCode
                                + " for "
                                + urlString
                );
            }

            try (
                    InputStream inputStream =
                            connection.getInputStream();

                    OutputStream outputStream =
                            Files.newOutputStream(
                                    destination
                            )
            ) {

                byte[] buffer =
                        new byte[8192];

                int bytesRead;

                while (
                        (bytesRead =
                                inputStream.read(
                                        buffer
                                ))
                                != -1
                ) {

                    outputStream.write(
                            buffer,
                            0,
                            bytesRead
                    );
                }
            }

        } finally {

            /*
             * Always disconnect, even if the
             * download fails.
             */
            connection.disconnect();
        }
    }


    // =========================================================
    // GZIP EXTRACTION
    // =========================================================

    private void extractGzip(
            Path gzipFile,
            Path csvFile
    ) throws IOException {

        try (
                GZIPInputStream gzipInputStream =
                        new GZIPInputStream(
                                Files.newInputStream(
                                        gzipFile
                                )
                        );

                OutputStream outputStream =
                        Files.newOutputStream(
                                csvFile
                        )
        ) {

            byte[] buffer =
                    new byte[8192];

            int bytesRead;

            while (
                    (bytesRead =
                            gzipInputStream.read(
                                    buffer
                            ))
                            != -1
            ) {

                outputStream.write(
                        buffer,
                        0,
                        bytesRead
                );
            }
        }
    }


    // =========================================================
    // MISSING TRADING DAY EXCEPTION
    // =========================================================

    /*
     * Used only when NSE returns HTTP 404 or 410.
     *
     * This lets the fallback logic distinguish
     * a missing dated file from a network/server error.
     */
    public static class MissingTradingDayException
            extends IOException {

        public MissingTradingDayException(
                String message
        ) {

            super(message);
        }
    }
}