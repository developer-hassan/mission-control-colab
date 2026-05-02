// API Credentials Configuration for Mission Control
// Store your API keys here securely

export const credentials = {
  google: {
    // Google APIs - These should come from Openclaw
    adsApiKey: process.env.GOOGLE_ADS_API_KEY || null,
    adsClientId: process.env.GOOGLE_ADS_CLIENT_ID || null,
    adsClientSecret: process.env.GOOGLE_ADS_CLIENT_SECRET || null,
    adsRefreshToken: process.env.GOOGLE_ADS_REFRESH_TOKEN || null,

    // Google Business Profile
    businessProfileApiKey: process.env.GOOGLE_BUSINESS_PROFILE_KEY || null,

    // Google Analytics
    analyticsPropertyId: process.env.GOOGLE_ANALYTICS_PROPERTY_ID || null,
    analyticsApiKey: process.env.GOOGLE_ANALYTICS_KEY || null,

    // Google Search Console
    searchConsoleApiKey: process.env.GOOGLE_SEARCH_CONSOLE_KEY || null
  },

  facebook: {
    businessAccountId: process.env.FACEBOOK_BUSINESS_ACCOUNT_ID || '1460840901718573',
    adAccountId: process.env.FACEBOOK_AD_ACCOUNT_ID || '120243479982690024',
    accessToken: process.env.FACEBOOK_ACCESS_TOKEN || 'EAAVrdtlDzM0BRQT55yAQJZAkVtB8TkCNrDuAs62ZAzM5HufZCfDlgFQsL5UTankiF9NDJoRgIhSm5A6KoRrRtIOZBE7FZCDZBtPCxLpWaeSe3F7bFfZAf3jZBVrZBA0ePfZB4N98H3ZBzVTYsyb0s8ZCeaZC2qucIttiiNdTLAtX5n62eRaxhP0HilA8AxzBUXUbZCqFhsxaTXHbRSVD8T6G4dmuiBsYjh1FtaAlluCjHiQ4NYLmqBjc4E2ApkNtmPmilAZClYqVWLX2ZBYk2t7ESMmH046TuwZDZD'
  },

  jobber: {
    // Jobber API credentials from developer.getjobber.com
    apiKey: process.env.JOBBER_API_KEY || '798770aa-46d0-4651-8b7f-dcf2cc269e9f',
    apiSecret: process.env.JOBBER_API_SECRET || 'd22d40c17e5ddf5f73ec4e7580510710b3763443face80d0d8b3807553185309',
    accountId: process.env.JOBBER_ACCOUNT_ID || null
  },

  openclaw: {
    // Openclaw agent integration
    agentApiUrl: process.env.OPENCLAW_API_URL || 'http://localhost:8080',
    apiKey: process.env.OPENCLAW_API_KEY || null
  }
};

export function hasCredential(service, key) {
  return credentials[service]?.[key] != null;
}

export function getCredential(service, key) {
  return credentials[service]?.[key] || null;
}

export function validateCredentials() {
  const missing = [];

  // Check critical credentials
  if (!credentials.facebook.accessToken) missing.push('Facebook Access Token');

  return {
    isValid: missing.length === 0,
    missing
  };
}
