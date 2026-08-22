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

    private static final DateTimeFormatter DATE_FORMAT =
            DateTimeFormatter.ofPattern("ddMMyyyy");

    private static final String NSE_SECURITY_URL =
            "https://nsearchives.nseindia.com/content/cm/"
                    + "NSE_CM_security_%s.csv.gz";

    public void downloadPreviousTradingDayFile() {

        try {

            Files.createDirectories(
                    NSE_DIRECTORY
            );

            LocalDate previousTradingDay =
                    getPreviousTradingDay();

            String date =
                    previousTradingDay.format(
                            DATE_FORMAT
                    );

            /*
             * Temporary files are dated so we know
             * exactly which trading day's file we
             * downloaded.
             */
            Path tempCsvFile =
                    NSE_DIRECTORY.resolve(
                            "NSE_CM_security_"
                                    + date
                                    + ".csv"
                    );

            Path gzipFile =
                    NSE_DIRECTORY.resolve(
                            "NSE_CM_security_"
                                    + date
                                    + ".csv.gz"
                    );

            /*
             * If the current security-master.csv
             * already exists AND it represents today's
             * required trading date, skip downloading.
             *
             * We use a small date marker file to know
             * which trading date it belongs to.
             */
            Path dateMarker =
                    NSE_DIRECTORY.resolve(
                            "security-master-date.txt"
                    );

            if (
                    Files.exists(
                            CURRENT_SECURITY_FILE
                    )
                            &&
                    Files.exists(dateMarker)
            ) {

                String savedDate =
                        Files.readString(
                                dateMarker
                        ).trim();

                if (
                        savedDate.equals(
                                previousTradingDay
                                        .toString()
                        )
                ) {

                    System.out.println(
                            "[NSE] Security Master for "
                                    + previousTradingDay
                                    + " already exists. "
                                    + "Skipping download."
                    );

                    return;
                }
            }

            System.out.println(
                    "[NSE] Downloading Security Master for "
                            + previousTradingDay
                            + "..."
            );

            String url =
                    String.format(
                            NSE_SECURITY_URL,
                            date
                    );

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
             * Delete gzip after successful extraction.
             */
            Files.deleteIfExists(
                    gzipFile
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

                Files.deleteIfExists(
                        tempCsvFile
                );

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
                    dateMarker,
                    previousTradingDay.toString()
            );

            /*
             * Delete any remaining old dated
             * security-master files.
             */
            deleteOldNseFiles();

            System.out.println(
                    "[NSE] Download successful: "
                            + CURRENT_SECURITY_FILE
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
    // PREVIOUS TRADING DAY
    // =========================================================

    private LocalDate getPreviousTradingDay() {

        LocalDate date =
                LocalDate.now().minusDays(1);

        DayOfWeek day =
                date.getDayOfWeek();

        /*
         * Saturday -> Friday
         */
        if (
                day == DayOfWeek.SATURDAY
        ) {

            date =
                    date.minusDays(1);
        }

        /*
         * Sunday -> Friday
         */
        else if (
                day == DayOfWeek.SUNDAY
        ) {

            date =
                    date.minusDays(2);
        }

        return date;
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
                 */
                if (
                        name.startsWith(
                                "NSE_CM_security_"
                        )
                                &&
                        name.endsWith(
                                ".csv"
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

                /*
                 * Also remove any leftover gzip.
                 */
                if (
                        name.startsWith(
                                "NSE_CM_security_"
                        )
                                &&
                        name.endsWith(
                                ".csv.gz"
                        )
                ) {

                    Files.deleteIfExists(
                            file
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

        if (
                responseCode
                        !=
                HttpURLConnection.HTTP_OK
        ) {

            throw new IOException(
                    "NSE returned HTTP "
                            + responseCode
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

        connection.disconnect();
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
}