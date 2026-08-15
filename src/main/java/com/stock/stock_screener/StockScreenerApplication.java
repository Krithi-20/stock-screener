package com.stock.stock_screener;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import com.stock.stock_screener.service.CompanyFilterService;
import com.stock.stock_screener.service.NseDailyMarketCapService;
import com.stock.stock_screener.service.UpstoxMarketDataService;

@SpringBootApplication
public class StockScreenerApplication {

    public static void main(String[] args) {

        SpringApplication.run(
                StockScreenerApplication.class,
                args
        );
    }

    @Bean
    CommandLineRunner initializeApplication(
            NseDailyMarketCapService nseDailyMarketCapService,
            CompanyFilterService companyFilterService,
            UpstoxMarketDataService upstoxMarketDataService) {

        return args -> {

            // =====================================================
            // 1. UPDATE DAILY MARKET CAP
            // =====================================================

            nseDailyMarketCapService
                    .updateMarketCapIfNeeded();


            // =====================================================
            // 2. LOAD LATEST DATA INTO MEMORY
            // =====================================================

            companyFilterService
                    .reloadData();


            // =====================================================
            // 3. START UPSTOX WEBSOCKET
            // =====================================================

            upstoxMarketDataService
                    .start();
        };
    }
}