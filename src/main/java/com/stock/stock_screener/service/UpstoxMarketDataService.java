package com.stock.stock_screener.service;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

import com.upstox.ApiClient;
import com.upstox.Configuration;
import com.upstox.auth.OAuth;
import com.upstox.feeder.MarketDataStreamerV3;
import com.upstox.feeder.MarketUpdateV3;
import com.upstox.feeder.constants.Mode;
import com.upstox.feeder.listener.OnMarketUpdateV3Listener;
import com.upstox.feeder.listener.OnOpenListener;

@Service
public class UpstoxMarketDataService {

    private final CompanyFilterService companyFilterService;

    /*
     * Latest live quote for each ISIN.
     *
     * Key   = ISIN
     * Value = latest LiveQuote
     */
    private final Map<String, LiveQuote> liveQuotes =
            new ConcurrentHashMap<>();

    private volatile MarketDataStreamerV3 streamer;

    private volatile boolean connected = false;

    public UpstoxMarketDataService(
            CompanyFilterService companyFilterService) {

        this.companyFilterService =
                companyFilterService;
    }

    // =========================================================
    // START WEBSOCKET
    // =========================================================

    public synchronized void start() throws Exception {

        if (connected) {
            return;
        }

        /*
         * Get today's FINAL filtered company list.
         *
         * This is dynamic.
         *
         * It can be:
         * 1362 companies today
         * 1447 companies another day
         * etc.
         *
         * Nothing is hard-coded.
         */
        List<String> isins =
                companyFilterService
                        .getNseGroupABCompanies()
                        .stream()
                        .map(company -> company.getIsin())
                        .filter(isin ->
                                isin != null &&
                                !isin.isBlank())
                        .toList();

        if (isins.isEmpty()) {

            throw new IllegalStateException(
                    "No filtered companies available for Upstox."
            );
        }

        /*
         * Convert ISIN into Upstox instrument key.
         *
         * Example:
         *
         * INE002A01018
         *
         * becomes:
         *
         * NSE_EQ|INE002A01018
         */
        Set<String> instrumentKeys =
                new HashSet<>();

        for (String isin : isins) {

            instrumentKeys.add(
                    "NSE_EQ|" + isin
            );
        }

        System.out.println();
        System.out.println(
                "===== UPSTOX WEBSOCKET ====="
        );

        System.out.println(
                "Instruments subscribed: "
                        + instrumentKeys.size()
        );

        // =====================================================
        // ACCESS TOKEN
        // =====================================================

        String accessToken =
                System.getenv(
                        "UPSTOX_ACCESS_TOKEN"
                );

        if (accessToken == null ||
                accessToken.isBlank()) {

            throw new IllegalStateException(
                    "UPSTOX_ACCESS_TOKEN environment variable not found."
            );
        }

        // =====================================================
        // API CLIENT
        // =====================================================

        ApiClient apiClient =
                Configuration.getDefaultApiClient();

        OAuth oauth =
                (OAuth) apiClient.getAuthentication(
                        "OAUTH2"
                );

        oauth.setAccessToken(
                accessToken
        );

        // =====================================================
        // CREATE STREAMER
        // =====================================================

        MarketDataStreamerV3 newStreamer =
                new MarketDataStreamerV3(
                        apiClient
                );

        streamer = newStreamer;

        // =====================================================
        // ON OPEN
        // =====================================================

        newStreamer.setOnOpenListener(
                new OnOpenListener() {

                    @Override
                    public void onOpen() {

                        try {

                            /*
                             * Subscribe to LTPC only.
                             *
                             * We don't need market depth or
                             * other unnecessary data.
                             */
                            newStreamer.subscribe(
                                    instrumentKeys,
                                    Mode.LTPC
                            );

                            connected = true;

                            System.out.println(
                                    "Upstox WebSocket connected."
                            );

                            System.out.println(
                                    "LTPC subscription active."
                            );

                            System.out.println(
                                    "============================"
                            );

                        } catch (Exception e) {

                            System.err.println(
                                    "Failed to subscribe to Upstox."
                            );

                            e.printStackTrace();
                        }
                    }
                }
        );

        // =====================================================
        // MARKET UPDATE
        // =====================================================

        newStreamer.setOnMarketUpdateListener(
                new OnMarketUpdateV3Listener() {

                    @Override
                    public void onUpdate(
                            MarketUpdateV3 update) {

                        processMarketUpdate(
                                update
                        );
                    }
                }
        );

        // =====================================================
        // ERROR
        // =====================================================

        newStreamer.setOnErrorListener(
                error -> {

                    System.err.println(
                            "Upstox WebSocket error: "
                                    + error
                    );
                }
        );

        // =====================================================
        // CLOSE
        // =====================================================

        /*
         * SDK 1.27 requires:
         *
         * onClose(int code, String reason)
         */
        newStreamer.setOnCloseListener(
                (code, reason) -> {

                    connected = false;

                    System.out.println(
                            "Upstox WebSocket closed."
                    );
                }
        );

        // =====================================================
        // AUTO RECONNECT
        // =====================================================

        newStreamer.autoReconnect(
                true,
                2,
                Integer.MAX_VALUE
        );

        // =====================================================
        // CONNECT
        // =====================================================

        newStreamer.connect();
    }

    // =========================================================
    // PROCESS MARKET UPDATE
    // =========================================================

    private void processMarketUpdate(
            MarketUpdateV3 update) {

        try {

            /*
             * One WebSocket update can contain multiple
             * instrument feeds.
             */
            Map<String, MarketUpdateV3.Feed> feeds =
                    update.getFeeds();

            if (feeds == null ||
                    feeds.isEmpty()) {

                return;
            }

            for (Map.Entry<String, MarketUpdateV3.Feed> entry
                    : feeds.entrySet()) {

                String instrumentKey =
                        entry.getKey();

                MarketUpdateV3.Feed feed =
                        entry.getValue();

                if (feed == null) {
                    continue;
                }

                /*
                 * We subscribed using LTPC mode, so the
                 * LTPC object should be available.
                 */
                MarketUpdateV3.LTPC ltpc =
                        feed.getLtpc();

                if (ltpc == null) {
                    continue;
                }

                double lastPrice =
                        ltpc.getLtp();

                double previousClose =
                        ltpc.getCp();

                long lastTradeTime =
                        ltpc.getLtt();

                /*
                 * Ignore invalid prices.
                 */
                if (lastPrice <= 0 ||
                        previousClose <= 0) {

                    continue;
                }

                /*
                 * Absolute change:
                 *
                 * Current price - previous close
                 */
                double change =
                        lastPrice -
                        previousClose;

                /*
                 * Percentage change:
                 *
                 * ((Current - Previous Close)
                 *      / Previous Close) * 100
                 */
                double changePercent =
                        (change /
                                previousClose)
                                * 100.0;

                /*
                 * Convert:
                 *
                 * NSE_EQ|INE002A01018
                 *
                 * into:
                 *
                 * INE002A01018
                 */
                String isin =
                        extractIsin(
                                instrumentKey
                        );

                if (isin == null) {
                    continue;
                }

                LiveQuote quote =
                        new LiveQuote(
                                lastPrice,
                                previousClose,
                                change,
                                changePercent,
                                lastTradeTime
                        );

                /*
                 * Store/update immediately.
                 *
                 * ConcurrentHashMap makes this safe while
                 * the controller reads the same map.
                 */
                liveQuotes.put(
                        isin,
                        quote
                );
            }

        } catch (Exception e) {

            /*
             * Never allow one malformed market update to
             * kill the WebSocket.
             */
            System.err.println(
                    "Error processing Upstox market update: "
                            + e.getMessage()
            );
        }
    }

    // =========================================================
    // EXTRACT ISIN
    // =========================================================

    private String extractIsin(
            String instrumentKey) {

        if (instrumentKey == null ||
                instrumentKey.isBlank()) {

            return null;
        }

        int separator =
                instrumentKey.indexOf('|');

        if (separator < 0 ||
                separator == instrumentKey.length() - 1) {

            return null;
        }

        return instrumentKey.substring(
                separator + 1
        );
    }

    // =========================================================
    // GET ALL LIVE QUOTES
    // =========================================================

    public Map<String, LiveQuote> getLiveQuotes() {

        /*
         * Return a snapshot rather than exposing the
         * ConcurrentHashMap itself.
         */
        return new HashMap<>(
                liveQuotes
        );
    }

    // =========================================================
    // GET ONE LIVE QUOTE
    // =========================================================

    public LiveQuote getLiveQuote(
            String isin) {

        return liveQuotes.get(
                isin
        );
    }

    // =========================================================
    // CONNECTION STATUS
    // =========================================================

    public boolean isConnected() {

        return connected;
    }

    // =========================================================
    // LIVE QUOTE
    // =========================================================

    public static class LiveQuote {

        private final double lastPrice;

        private final double previousClose;

        private final double change;

        private final double changePercent;

        private final long lastTradeTime;

        public LiveQuote(
                double lastPrice,
                double previousClose,
                double change,
                double changePercent,
                long lastTradeTime) {

            this.lastPrice =
                    lastPrice;

            this.previousClose =
                    previousClose;

            this.change =
                    change;

            this.changePercent =
                    changePercent;

            this.lastTradeTime =
                    lastTradeTime;
        }

        public double getLastPrice() {

            return lastPrice;
        }

        public double getPreviousClose() {

            return previousClose;
        }

        public double getChange() {

            return change;
        }

        public double getChangePercent() {

            return changePercent;
        }

        public long getLastTradeTime() {

            return lastTradeTime;
        }
    }
}