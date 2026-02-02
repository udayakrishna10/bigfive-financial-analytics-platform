export const STOCK_LOGOS: Record<string, string> = {
    AAPL: "https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg",
    AMZN: "https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg",
    META: "https://upload.wikimedia.org/wikipedia/commons/a/ab/Meta-Logo.png",
    NFLX: "https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg",
    GOOGL: "https://upload.wikimedia.org/wikipedia/commons/2/2f/Google_2015_logo.svg",
};

export const NEWS_LOGOS: Record<string, string> = {
    "Bloomberg": "https://upload.wikimedia.org/wikipedia/commons/5/5e/Bloomberg_L.P._logo.svg",
    "Reuters": "https://upload.wikimedia.org/wikipedia/commons/e/e4/Reuters_Logo.svg",
    "The Wall Street Journal": "https://upload.wikimedia.org/wikipedia/commons/4/4e/The_Wall_Street_Journal_Logo.svg",
    "CNBC": "https://upload.wikimedia.org/wikipedia/commons/e/e3/CNBC_logo.svg",
    "Financial Times": "https://upload.wikimedia.org/wikipedia/commons/2/23/Financial_Times_logo.svg",
    "MarketWatch": "https://upload.wikimedia.org/wikipedia/commons/4/4e/MarketWatch_Logo.svg",
    "Yahoo Finance": "https://upload.wikimedia.org/wikipedia/commons/e/e1/Yahoo_Finance_Logo_2019.svg",
    "Barron's": "https://upload.wikimedia.org/wikipedia/commons/5/52/Barrons_logo_2020.svg",
    "The Motley Fool": "https://upload.wikimedia.org/wikipedia/en/2/23/The_Motley_Fool_logo.png",
    "Seeking Alpha": "https://upload.wikimedia.org/wikipedia/commons/8/86/Seeking_Alpha_Logo.svg",
    "Investopedia": "https://upload.wikimedia.org/wikipedia/commons/6/6f/Investopedia_Logo.svg",
    "Business Insider": "https://upload.wikimedia.org/wikipedia/commons/2/20/Business_Insider_Logo.svg",
    "Forbes": "https://upload.wikimedia.org/wikipedia/commons/0/0c/Forbes_logo.svg",
};

export const getLogo = (ticker: string) => STOCK_LOGOS[ticker] || null;
export const getNewsLogo = (source: string) => NEWS_LOGOS[source] || null;
