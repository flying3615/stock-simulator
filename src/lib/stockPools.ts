// 股票池获取工具 v0.1

function normalizeTickers(tickers: string[]): string[] {
  return tickers
    .map(t => t.trim().toUpperCase())
    .filter(t => t.length > 0 && t.length <= 8 && /^[A-Z][A-Z0-9.-]*$/.test(t));
}

// Static S&P 500 list (comprehensive list of major stocks)
const SP500_STOCKS =  [
  "A", "AAL", "AAP", "AAPL", "ABBV", "ABC", "ABMD", "ABT", "ACN", "ADBE",
  "ADI", "ADM", "ADP", "ADSK", "AEE", "AEP", "AES", "AFL", "AGCO", "AGI",
  "AIG", "AIZ", "AJG", "AKAM", "ALB", "ALGN", "ALK", "ALL", "ALLE", "AMAT",
  "AMCR", "AMD", "AME", "AMGN", "AMP", "AMT", "AMZN", "ANET", "ANSS", "AON",
  "AOS", "APA", "APD", "APH", "APTV", "ARE", "ARNC", "ATO", "ATVI", "AVB",
  "AVGO", "AVY", "AWK", "AXP", "AZO", "BA", "BAC", "BAX", "BBY", "BDX",
  "BEN", "BF‑B", "BIIB", "BIO", "BK", "BLK", "BLL", "BMY", "BR", "BRK.B",
  "BSX", "BWA", "BX", "C", "CAG", "CAH", "CAT", "CB", "CBOE", "CCI",
  "CCL", "CDNS", "CDW", "CE", "CERN", "CF", "CFG", "CHD", "CHRW", "CHTR",
  "CI", "CINF", "CL", "CLX", "CMA", "CMCSA", "CME", "CMG", "CMI", "CMS",
  "CNC", "CNP", "COF", "COG", "COL", "COO", "COP", "COST", "COTY", "CPB",
  "CPRT", "CPT", "CRL", "CRM", "CSCO", "CSX", "CTAS", "CTLT", "CTSH", "CTXS",
  "CVS", "CVX", "D", "DAL", "DD", "DE", "DFS", "DG", "DGX", "DHI", "DHR",
  "DIS", "DISCA", "DISCK", "DLR", "DLTR", "DOV", "DOW", "DPZ", "DRE", "DRI",
  "DTE", "DUK", "DVA", "DVN", "DXC", "EA", "EBAY", "ECL", "ED", "EFX", "EIX",
  "EL", "EMN", "EMR", "ENPH", "EOG", "EQIX", "EQR", "ES", "ESS", "ETN", "ETR",
  "EVRG", "EXC", "EXPD", "EXPE", "EXR", "F", "FAST", "FB", "FBHS", "FCX",
  "FDX", "FE", "FFIV", "FIS", "FISV", "FITB", "FLIR", "FLT", "FMC", "FOX", "FOXA", "FRC",
  "FRT", "FSLR", "FTNT", "GD", "GE", "GILD", "GIS", "GL", "GLW", "GM",
  "GOOG", "GOOGL", "GPC", "GPN", "GPS", "GRMN", "GS", "GWW", "HAL", "HAS",
  "HBAN", "HCA", "HCN", "HES", "HIG", "HLT", "HOLX", "HON", "HP", "HPE",
  "HPQ", "HRB", "HRL", "HSIC", "HST", "HSY", "HUM", "IBM", "ICE", "IDXX",
  "IEX", "IFF", "ILMN", "INCY", "INFO", "INTU", "IP", "IPG", "IQV", "IR",
  "ISRG", "IT", "ITW", "IVZ", "J", "JBHT", "JCI", "JNJ", "JPM", "JPN", "K",
  "KEY", "KHC", "KIM", "KLAC", "KMB", "KMI", "KMX", "KO", "KR", "L", "LB",
  "LDOS", "LEG", "LEN", "LH", "LHU", "LLY", "LMT", "LNC", "LNT", "LOW",
  "LRCX", "LSTK", "LULU", "LUV", "LVS", "LW", "LYB", "M", "MA", "MAC", "MAR",
  "MAS", "MAT", "MCD", "MCK", "MCO", "MDLZ", "MDT", "MET", "MGM", "MHK",
  "MKC", "MKTX", "MLM", "MMC", "MMM", "MNST", "MO", "MOS", "MPC", "MRK",
  "MRNA", "MS", "MSI", "MTB", "MTD", "MU", "MWV", "MXIM", "MYL", "NCLH",
  "NDAQ", "NEE", "NEM", "NFLX", "NI", "NKE", "NLOK", "NOC", "NOV", "NR", "NSC",
  "NTAP", "NTRS", "NUE", "NVDA", "NVR", "NWL", "NXPI", "O", "ODFL", "OKE",
  "OKTA", "OMC", "ORCL", "ORLY", "OTIS", "OXY", "PAYX", "PBCT", "PCAR", "PCG",
  "PDCO", "PEG", "PEP", "PFE", "PFG", "PG", "PGR", "PH", "PHM", "PKG", "PKI",
  "PLD", "PLL", "PNC", "PNR", "PPG", "PPL", "PRGO", "PRU", "PSA", "PSX", "PTC",
  "PVH", "PWR", "PXD", "PYPL", "QCOM", "QGEN", "QRVO", "RCL", "RDK", "RE",
  "REG", "REGN", "RGS", "RHI", "RJF", "RL", "RMD", "ROK", "ROL", "ROP", "ROST",
  "RSG", "RTX", "SBAC", "SBNY", "SCHW", "SEE", "SHW", "SJM", "SLB", "SNA",
  "SNPS", "SO", "SPG", "SPGI", "SRE", "STE", "STT", "STX", "STZ", "SUN",
  "SUI", "SWK", "SWKS", "SYK", "SYY", "T", "TAP", "TDG", "TEL", "TFC", "TFX",
  "TGNA", "TGT", "TJX", "TMO", "TMUS", "TSCO", "TSLA", "TSN", "TT", "TTD", "TWTR",
  "TXN", "TXT", "TYL", "UA", "UAA", "UAL", "UDR", "UHS", "ULTA", "UNH", "UNM",
  "UNP", "UPS", "URI", "USB", "VRTX", "VTRS", "VZ", "WBA", "WDC", "WEC", "WELL",
  "WFC", "WHR", "WM", "WMB", "XEL", "XLNX", "XOM", "XRAY", "XRX", "XYL", "ZBH", "ZION", "ZTS"
]


const QQQ_STOCKS = [
  "NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "AVGO", "GOOG", "META", "TSLA", "PLTR",
  "NFLX", "AMD", "ASML", "COST", "CSCO", "AZN", "MU", "TMUS", "SHOP", "APP",
  "PEP", "LRCX", "LIN", "QCOM", "PDD", "INTC", "ISRG", "INTU", "AMAT", "ARM",
  "BKNG", "AMGN", "KLAC", "PANW", "GILD", "TXN", "ADBE", "CRWD", "HON", "MELI",
  "CEG", "ADI", "VRTX", "DASH", "ZM", "FISV", "MRNA", "REGN", "ILMN", "JD",
  "ORLY", "BIDU", "CSX", "NXPI", "SNPS", "EA", "JD", "EXC", "KDP", "IDXX",
  "ROST", "CTSH", "LULU", "MAR", "ADSK", "BIIB", "CTAS", "FTNT", "DOCU", "SBUX",
  "VRSK", "VRSN", "IDXX", "XLNX", "MNST", "VRTX", "SGEN", "DXCM", "KLAC", "ALGN",
  "CHTR", "CERN", "CDNS", "NTES", "XEL", "ADI", "CSCO", "MCHP", "WBA", "COST",
  "PAYX", "BKNG"
];

export async function fetchQqqFromSlickcharts(): Promise<string[]> {
  return normalizeTickers(QQQ_STOCKS);
}

export async function fetchSp500FromWikipedia(): Promise<string[]> {
    return normalizeTickers(SP500_STOCKS);
}

// 缓存机制
let sp500Cache: string[] | null = null;
let qqqCache: string[] | null = null;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
let sp500CacheTime = 0;
let qqqCacheTime = 0;

export async function getSp500Stocks(): Promise<string[]> {
  const now = Date.now();
  if (sp500Cache && now - sp500CacheTime < CACHE_DURATION) {
    return sp500Cache;
  }
  sp500Cache = await fetchSp500FromWikipedia();
  sp500CacheTime = now;
  return sp500Cache;
}

export async function getQqqStocks(): Promise<string[]> {
  const now = Date.now();
  if (qqqCache && now - qqqCacheTime < CACHE_DURATION) {
    return qqqCache;
  }
  qqqCache = await fetchQqqFromSlickcharts();
  qqqCacheTime = now;
  return qqqCache;
}