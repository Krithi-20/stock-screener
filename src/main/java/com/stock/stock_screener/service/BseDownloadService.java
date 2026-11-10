package com.stock.stock_screener.service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
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

@Service
public class BseDownloadService {

    private static final String BSE_SCRIP_URL =
            "https://www.bseindia.com/downloads/Help/file/scrip.zip";

    private static final Path BSE_DIR =
            Path.of(
                    "data",
                    "bse",
                    "scrip",
                    "SCRIP"
            );

    private static final DateTimeFormatter DATE_FORMAT =
            DateTimeFormatter.ofPattern("ddMMyyyy");

    private final HttpClient httpClient =
            HttpClient.newBuilder()
                    .followRedirects(
                            HttpClient.Redirect.NORMAL
                    )
                    .build();


    // =========================================================
    // DOWNLOAD PREVIOUS TRADING DAY FILE
    // =========================================================

    /*
     * Starts with the previous weekday.
     *
     * BSE provides a fixed ZIP URL, so we download
     * the ZIP once and check whether it contains the
     * expected dated CSV.
     *
     * If the requested date is unavailable inside
     * the ZIP, we try the previous weekday.
     *
     * Maximum attempts: 10 previous weekdays.
     */
    public void downloadPreviousTradingDayFile()
            throws Exception {

        Files.createDirectories(BSE_DIR);

        LocalDate tradingDate =
                getPreviousTradingDay();

        System.out.println();

        System.out.println(
                "[BSE] ===== DOWNLOAD ====="
        );

        System.out.println(
                "[BSE] Initial trading date: "
                        + tradingDate
        );

        /*
         * Download the ZIP only once.
         *
         * The URL is fixed and does not accept
         * a trading date as a parameter.
         */
        byte[] zipData =
                downloadZip();

        /*
         * Try the previous 10 weekdays.
         */
        for (
                int attempt = 0;
                attempt < 10;
                attempt++
        ) {

            String date =
                    tradingDate.format(
                            DATE_FORMAT
                    );

            String expectedFile =
                    "BSE_EQ_SCRIP_"
                            + date
                            + ".csv";

            Path outputFile =
                    BSE_DIR.resolve(
                            expectedFile
                    );

            System.out.println(
                    "[BSE] Trying trading date: "
                            + tradingDate
            );

            /*
             * If the required file already exists
             * and is not empty, skip downloading.
             */
            if (
                    Files.exists(outputFile)
                            &&
                    Files.size(outputFile) > 0
            ) {

                System.out.println(
                        "[BSE] Security file for "
                                + tradingDate
                                + " already exists. "
                                + "Skipping download."
                );

                System.out.println(
                        "[BSE] ====================="
                );

                return;
            }

            try {

                installFile(
                        zipData,
                        expectedFile,
                        outputFile
                );

                System.out.println(
                        "[BSE] Download successful."
                );

                System.out.println(
                        "[BSE] Trading date: "
                                + tradingDate
                );

                System.out.println(
                        "[BSE] File: "
                                + outputFile
                );

                System.out.println(
                        "[BSE] ====================="
                );

                return;

            } catch (
                    MissingTradingDayException e
            ) {

                System.out.println(
                        "[BSE] File unavailable for "
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
                "[BSE] Could not find a matching "
                        + "security file in the last "
                        + "10 weekday attempts."
        );
    }


    // =========================================================
    // DOWNLOAD FOR AN EXACT DATE
    // =========================================================

    /*
     * Downloads the BSE Security Master for exactly
     * the supplied trading date.
     *
     * This method is intended for DailyMarketDataService
     * when coordinating the trading date across NSE,
     * BSE, Bhavcopy and Market Cap files.
     *
     * IMPORTANT:
     * This method does not independently fall back
     * to another date.
     */
    public void downloadForDate(
            LocalDate tradingDate
    ) throws Exception {

        Files.createDirectories(BSE_DIR);

        String date =
                tradingDate.format(
                        DATE_FORMAT
                );

        String expectedFile =
                "BSE_EQ_SCRIP_"
                        + date
                        + ".csv";

        Path outputFile =
                BSE_DIR.resolve(
                        expectedFile
                );

        System.out.println(
                "[BSE] Downloading security file for "
                        + tradingDate
        );

        /*
         * Skip if the exact dated file already exists.
         */
        if (
                Files.exists(outputFile)
                        &&
                Files.size(outputFile) > 0
        ) {

            System.out.println(
                    "[BSE] Security file for "
                            + tradingDate
                            + " already exists. "
                            + "Skipping download."
            );

            return;
        }

        /*
         * Download the ZIP.
         */
        byte[] zipData =
                downloadZip();

        /*
         * Extract only the exact requested date.
         */
        installFile(
                zipData,
                expectedFile,
                outputFile
        );

        System.out.println(
                "[BSE] Exact-date download successful: "
                        + tradingDate
        );
    }


    // =========================================================
    // INSTALL FILE SAFELY
    // =========================================================

    /*
     * Extracts the requested CSV into a temporary file.
     *
     * Only after successful extraction and validation
     * is the final dated file replaced.
     *
     * Older files are deleted only after the new file
     * has been installed successfully.
     */
    private void installFile(
            byte[] zipData,
            String expectedFile,
            Path outputFile
    ) throws Exception {

        Path tempFile =
                outputFile.resolveSibling(
                        expectedFile + ".tmp"
                );

        try {

            /*
             * Extract the requested CSV into a
             * temporary file.
             */
            extractFile(
                    zipData,
                    expectedFile,
                    tempFile
            );

            /*
             * Validate the extracted file.
             */
            if (
                    !Files.exists(tempFile)
                            ||
                    Files.size(tempFile) == 0
            ) {

                throw new IOException(
                        "BSE file was not created correctly: "
                                + tempFile
                );
            }

            /*
             * The new file is now ready.
             *
             * Replace the final dated file only
             * after successful extraction.
             */
            Files.move(
                    tempFile,
                    outputFile,
                    StandardCopyOption.REPLACE_EXISTING
            );

            System.out.println(
                    "[BSE] New security file ready."
            );

            /*
             * Delete old dated files only after
             * the new file is safely installed.
             */
            deleteOldFiles(
                    expectedFile
            );

            System.out.println(
                    "[BSE] Old security files deleted."
            );

        } finally {

            /*
             * Clean up temporary files whether
             * the operation succeeds or fails.
             */
            Files.deleteIfExists(
                    tempFile
            );
        }
    }


    // =========================================================
    // DOWNLOAD ZIP
    // =========================================================

    private byte[] downloadZip()
            throws Exception {

        System.out.println(
                "[BSE] Downloading scrip.zip..."
        );

        HttpRequest request =
                HttpRequest.newBuilder()
                        .uri(
                                URI.create(
                                        BSE_SCRIP_URL
                                )
                        )
                        .header(
                                "User-Agent",
                                "Mozilla/5.0"
                        )
                        .header(
                                "Accept",
                                "*/*"
                        )
                        .header(
                                "Referer",
                                "https://www.bseindia.com/"
                        )
                        .GET()
                        .build();

        HttpResponse<byte[]> response =
                httpClient.send(
                        request,
                        HttpResponse.BodyHandlers
                                .ofByteArray()
                );

        System.out.println(
                "[BSE] HTTP status: "
                        + response.statusCode()
        );

        /*
         * Do not treat HTTP/network errors as
         * market holidays.
         */
        if (
                response.statusCode() != 200
        ) {

            throw new IOException(
                    "BSE download failed. HTTP status: "
                            + response.statusCode()
            );
        }

        if (
                response.body() == null
                        ||
                response.body().length == 0
        ) {

            throw new IOException(
                    "BSE returned an empty ZIP."
            );
        }

        System.out.println(
                "[BSE] ZIP downloaded: "
                        + response.body().length
                        + " bytes"
        );

        return response.body();
    }


    // =========================================================
    // EXTRACT REQUIRED CSV FROM ZIP
    // =========================================================

    /*
     * Looks for the exact expected CSV inside scrip.zip.
     *
     * Example:
     *
     * BSE_EQ_SCRIP_30102026.csv
     *
     * If the requested file is not present,
     * MissingTradingDayException is thrown.
     *
     * The fallback method catches only this exception.
     */
    private void extractFile(
            byte[] zipData,
            String expectedFile,
            Path outputFile
    ) throws IOException {

        boolean found = false;

        try (
                InputStream input =
                        new ByteArrayInputStream(
                                zipData
                        );

                ZipInputStream zip =
                        new ZipInputStream(
                                input
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
                        "[BSE] ZIP entry: "
                                + fileName
                );

                if (
                        fileName.equalsIgnoreCase(
                                expectedFile
                        )
                ) {

                    /*
                     * Extract into the temporary
                     * destination, not the final file.
                     */
                    Files.copy(
                            zip,
                            outputFile,
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
                    "Could not find "
                            + expectedFile
                            + " inside scrip.zip."
            );
        }
    }


    // =========================================================
    // DELETE OLD BSE FILES
    // =========================================================

    /*
     * Deletes older dated BSE CSV files.
     *
     * The current file is always preserved.
     *
     * This method is called only after a new file
     * has been successfully installed.
     */
    private void deleteOldFiles(
            String currentFile
    ) throws IOException {

        try (
                DirectoryStream<Path> files =
                        Files.newDirectoryStream(
                                BSE_DIR
                        )
        ) {

            for (Path path : files) {

                if (
                        !Files.isRegularFile(path)
                ) {

                    continue;
                }

                String fileName =
                        path.getFileName()
                                .toString();

                if (
                        fileName.startsWith(
                                "BSE_EQ_SCRIP_"
                        )
                                &&
                        fileName.endsWith(
                                ".csv"
                        )
                                &&
                        !fileName.equalsIgnoreCase(
                                currentFile
                        )
                ) {

                    Files.deleteIfExists(
                            path
                    );

                    System.out.println(
                            "[BSE] Deleted old file: "
                                    + fileName
                    );
                }
            }
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
     * Unexpected market holidays are handled
     * by the ZIP-entry fallback logic.
     */
    private LocalDate getPreviousTradingDay() {

        return getPreviousWeekday(
                LocalDate.now()
        );
    }


    /*
     * Returns the previous weekday relative
     * to the supplied date.
     */
    private LocalDate getPreviousWeekday(
            LocalDate date
    ) {

        LocalDate previousDate =
                date.minusDays(1);

        while (
                previousDate.getDayOfWeek()
                        == DayOfWeek.SATURDAY
                        ||
                previousDate.getDayOfWeek()
                        == DayOfWeek.SUNDAY
        ) {

            previousDate =
                    previousDate.minusDays(1);
        }

        return previousDate;
    }


    // =========================================================
    // MISSING TRADING DAY EXCEPTION
    // =========================================================

    /*
     * Thrown only when the requested dated CSV
     * is not present inside the downloaded ZIP.
     *
     * This allows the fallback logic to distinguish
     * a missing trading-day file from a genuine
     * download or network failure.
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