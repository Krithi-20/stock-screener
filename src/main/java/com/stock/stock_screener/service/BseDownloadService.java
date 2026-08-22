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
import java.time.format.DateTimeFormatter;
import java.util.stream.Stream;
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

    public void downloadPreviousTradingDayFile()
            throws Exception {

        Files.createDirectories(BSE_DIR);

        LocalDate tradingDate =
                getPreviousTradingDay();

        String date =
                tradingDate.format(DATE_FORMAT);

        String expectedFile =
                "BSE_EQ_SCRIP_"
                        + date
                        + ".csv";

        Path outputFile =
                BSE_DIR.resolve(expectedFile);

        System.out.println();
        System.out.println(
                "[BSE] ===== DOWNLOAD ====="
        );

        System.out.println(
                "[BSE] Trading date: "
                        + tradingDate
        );

        /*
         * If today's required file already exists,
         * don't download it again.
         */
        if (Files.exists(outputFile)) {

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

        System.out.println(
                "[BSE] Downloading security file for "
                        + tradingDate
                        + "..."
        );

        /*
         * Download ZIP first.
         *
         * IMPORTANT:
         * Nothing old is deleted before this succeeds.
         */
        byte[] zipData =
                downloadZip();

        /*
         * Extract the required dated CSV.
         *
         * Again, old files remain untouched if this fails.
         */
        extractFile(
                zipData,
                expectedFile,
                outputFile
        );

        /*
         * Make absolutely sure the new file exists
         * before deleting anything old.
         */
        if (!Files.exists(outputFile)
                || Files.size(outputFile) == 0) {

            throw new IOException(
                    "BSE file was not created correctly: "
                            + outputFile
            );
        }

        System.out.println(
                "[BSE] New security file ready."
        );

        System.out.println(
                "[BSE] File: "
                        + outputFile
        );

        /*
         * NEW FILE IS SAFE.
         *
         * Only now delete older BSE dated CSV files.
         */
        deleteOldFiles(
                expectedFile
        );

        System.out.println(
                "[BSE] Old security files deleted."
        );

        System.out.println(
                "[BSE] ====================="
        );
    }

    private byte[] downloadZip()
            throws Exception {

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

        if (response.statusCode() != 200) {

            throw new IOException(
                    "BSE download failed. HTTP status: "
                            + response.statusCode()
            );
        }

        if (response.body().length == 0) {

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

    private void extractFile(
            byte[] zipData,
            String expectedFile,
            Path outputFile
    ) throws Exception {

        boolean found = false;

        try (
                InputStream input =
                        new java.io.ByteArrayInputStream(
                                zipData
                        );

                ZipInputStream zip =
                        new ZipInputStream(
                                input
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
                        "[BSE] ZIP entry: "
                                + fileName
                );

                if (
                        fileName.equalsIgnoreCase(
                                expectedFile
                        )
                ) {

                    Files.copy(
                            zip,
                            outputFile,
                            StandardCopyOption
                                    .REPLACE_EXISTING
                    );

                    found = true;

                    break;
                }
            }
        }

        if (!found) {

            throw new IOException(
                    "Could not find "
                            + expectedFile
                            + " inside scrip.zip."
            );
        }
    }

    private void deleteOldFiles(
            String currentFile
    ) throws IOException {

        try (
                Stream<Path> files =
                        Files.list(BSE_DIR)
        ) {

            files
                    .filter(Files::isRegularFile)
                    .filter(
                            path ->
                                    path.getFileName()
                                            .toString()
                                            .startsWith(
                                                    "BSE_EQ_SCRIP_"
                                            )
                    )
                    .filter(
                            path ->
                                    path.getFileName()
                                            .toString()
                                            .endsWith(
                                                    ".csv"
                                            )
                    )
                    .filter(
                            path ->
                                    !path.getFileName()
                                            .toString()
                                            .equalsIgnoreCase(
                                                    currentFile
                                            )
                    )
                    .forEach(
                            path -> {

                                try {

                                    Files.deleteIfExists(
                                            path
                                    );

                                    System.out.println(
                                            "[BSE] Deleted old file: "
                                                    + path
                                                            .getFileName()
                                                    .toString()
                                    );

                                } catch (IOException e) {

                                    throw new RuntimeException(
                                            "Could not delete old BSE file: "
                                                    + path,
                                            e
                                    );
                                }
                            }
                    );
        }
    }

    private LocalDate getPreviousTradingDay() {

        LocalDate date =
                LocalDate.now()
                        .minusDays(1);

        while (
                date.getDayOfWeek()
                        == DayOfWeek.SATURDAY
                        ||
                date.getDayOfWeek()
                        == DayOfWeek.SUNDAY
        ) {

            date =
                    date.minusDays(1);
        }

        return date;
    }
}