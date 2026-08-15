package com.stock.stock_screener.model;

public class Company {

    private String isin;
    private String nseSymbol;
    private String companyName;
    private String bseGroup;

    private double issuedCapital;
    private double faceValue;
    private double closingPrice;
    private double marketCap;

    public Company(
            String isin,
            String nseSymbol,
            String companyName,
            String bseGroup,
            double issuedCapital,
            double faceValue,
            double closingPrice,
            double marketCap) {

        this.isin = isin;
        this.nseSymbol = nseSymbol;
        this.companyName = companyName;
        this.bseGroup = bseGroup;
        this.issuedCapital = issuedCapital;
        this.faceValue = faceValue;
        this.closingPrice = closingPrice;
        this.marketCap = marketCap;
    }

    public String getIsin() {
        return isin;
    }

    public String getNseSymbol() {
        return nseSymbol;
    }

    public String getCompanyName() {
        return companyName;
    }

    public String getBseGroup() {
        return bseGroup;
    }

    public double getIssuedCapital() {
        return issuedCapital;
    }

    public double getFaceValue() {
        return faceValue;
    }

    public double getClosingPrice() {
        return closingPrice;
    }

    public double getMarketCap() {
        return marketCap;
    }
}