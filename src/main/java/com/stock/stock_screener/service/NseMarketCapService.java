package com.stock.stock_screener.service;

import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class NseMarketCapService {

    private final RestClient restClient;

    public NseMarketCapService() {
        this.restClient = RestClient.builder()
                .baseUrl("https://www.nseindia.com")
                .defaultHeader("User-Agent",
                        "Mozilla/5.0")
                .build();
    }

    public String getQuote(String symbol) {

        return restClient.get()
                .uri("/api/quote-equity?symbol={symbol}", symbol)
                .retrieve()
                .body(String.class);
    }
}

