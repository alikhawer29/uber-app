import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, Auth } from 'googleapis';

interface GoogleConfig {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
}

@Injectable()
export class GoogleReviewsService {
    private readonly logger = new Logger(GoogleReviewsService.name);
    private oauthClient: Auth.OAuth2Client;

    constructor(private readonly configService: ConfigService) {
        const googleConfig = this.configService.get<GoogleConfig>('google');

        if (!googleConfig?.clientId || !googleConfig?.clientSecret || !googleConfig?.redirectUri) {
            this.logger.warn(
                'Google OAuth credentials are not fully configured. ' +
                    'Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI in your .env file.'
            );
        }

        this.oauthClient = new google.auth.OAuth2(
            googleConfig?.clientId,
            googleConfig?.clientSecret,
            googleConfig?.redirectUri
        );
    }

    /**
     * Generate the Google OAuth consent URL to authorize access to Business Profile (reviews).
     * Call this from an admin-only endpoint and open it in the browser.
     */
    generateAuthUrl(): string {
        const googleConfig = this.configService.get<GoogleConfig>('google');
        if (!googleConfig?.clientId || !googleConfig?.clientSecret || !googleConfig?.redirectUri) {
            throw new BadRequestException(
                'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET and GOOGLE_REDIRECT_URI.'
            );
        }

        return this.oauthClient.generateAuthUrl({
            access_type: 'offline', // we need a refresh token
            prompt: 'consent', // ensure refresh token is issued
            scope: ['https://www.googleapis.com/auth/business.manage'],
        });
    }

    /**
     * Exchange authorization code for access & refresh tokens.
     * You should run this once, then store the refresh token securely (e.g. in .env or DB).
     */
    async exchangeCodeForTokens(code: string) {
        if (!code) {
            throw new BadRequestException('Authorization code is required');
        }

        const { tokens } = await this.oauthClient.getToken(code);

        if (!tokens.refresh_token) {
            this.logger.warn(
                'No refresh_token returned from Google. ' +
                    'Make sure you requested access_type=offline and prompt=consent, and that this is the first consent.'
            );
        }

        this.logger.log('Successfully exchanged code for tokens from Google Business Profile API');

        return {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiryDate: tokens.expiry_date,
            rawTokens: tokens,
        };
    }

    /**
     * Configure OAuth client using a stored refresh token.
     * This is what you should use for normal API calls (reviews, etc.).
     */
    private setCredentialsFromRefreshToken(refreshToken: string) {
        if (!refreshToken) {
            throw new BadRequestException(
                'Google refresh token is not configured. ' +
                    'Call /admin/google/oauth2/callback once to get it, then store it in GOOGLE_REFRESH_TOKEN.'
            );
        }

        this.oauthClient.setCredentials({ refresh_token: refreshToken });
    }

    /**
     * Helper: list locations for the configured Business Profile account.
     * Used once to discover the locationId, then GOOGLE_BUSINESS_LOCATION_ID
     * can be set to avoid repeated API calls.
     *
     * If GOOGLE_BUSINESS_ACCOUNT_ID is not set, we will first call the
     * Account Management API to discover the primary account.
     */
    async listLocationsForConfiguredAccount() {
        const refreshToken =
            (this.configService.get<string>('GOOGLE_REFRESH_TOKEN') as string | undefined) ||
            process.env.GOOGLE_REFRESH_TOKEN;

        this.setCredentialsFromRefreshToken(refreshToken as string);

        let accountId: string;
        let accountName: string;

        const configuredAccountId = process.env.GOOGLE_BUSINESS_ACCOUNT_ID;
        if (configuredAccountId) {
            accountId = configuredAccountId;
            accountName = `accounts/${accountId}`;
        } else {
            const accountsRes = await this.oauthClient.request<{ accounts?: any[] }>({
                url: 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
                method: 'GET',
            });
            const accounts = accountsRes.data.accounts || [];

            if (!accounts.length) {
                throw new BadRequestException('No Google Business Profile accounts found for this Google user.');
            }

            const account = accounts[0];
            const name = account.name as string | undefined;
            if (!name) {
                throw new BadRequestException('Invalid Google Business Profile account data (missing account name).');
            }

            accountName = name;
            accountId = name.split('/')[1];
        }

        const res = await this.oauthClient.request<{ locations?: any[] }>({
            url: `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations?pageSize=100&readMask=name`,
            method: 'GET',
        });

        return {
            account: {
                accountId,
                accountName,
            },
            ...res.data,
        };
    }

    /**
     * Resolve account + location information that all review calls need.
     */
    private async resolveAccountAndLocation() {
        const refreshToken =
            (this.configService.get<string>('GOOGLE_REFRESH_TOKEN') as string | undefined) ||
            process.env.GOOGLE_REFRESH_TOKEN;

        this.setCredentialsFromRefreshToken(refreshToken as string);

        // 1. Resolve account information.
        // Prefer a fixed Business Profile ID from env to avoid hitting
        // the Account Management API quota on every request.
        const configuredAccountId = process.env.GOOGLE_BUSINESS_ACCOUNT_ID;

        let account: any;
        let accountId: string;
        let accountNameV1: string;

        if (configuredAccountId) {
            accountId = configuredAccountId;
            accountNameV1 = `accounts/${accountId}`;
            account = { name: accountNameV1 };
        } else {
            const accountsRes = await this.oauthClient.request<{ accounts?: any[] }>({
                url: 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts',
                method: 'GET',
            });
            const accounts = accountsRes.data.accounts || [];

            if (!accounts.length) {
                throw new BadRequestException('No Google Business Profile accounts found for this Google user.');
            }

            account = accounts[0];
            accountNameV1 = account.name as string; // e.g. "accounts/123456789012345678901"

            if (!accountNameV1) {
                throw new BadRequestException('Invalid Google Business Profile account data (missing account name).');
            }

            // Extract numeric accountId from "accounts/{accountId}"
            accountId = accountNameV1.split('/')[1];
        }

        // 2. Resolve location information.
        // Prefer a fixed location ID from env to avoid hitting the
        // Business Information API quota on every request.
        const configuredLocationId = process.env.GOOGLE_BUSINESS_LOCATION_ID;

        let location: any;
        let locationId: string;
        let locationNameV1: string;

        if (configuredLocationId) {
            locationId = configuredLocationId;
            locationNameV1 = `locations/${locationId}`;
            location = { name: locationNameV1 };
        } else {
            const locationsRes = await this.oauthClient.request<{ locations?: any[] }>({
                url: `https://mybusinessbusinessinformation.googleapis.com/v1/accounts/${accountId}/locations?pageSize=100&readMask=name`,
                method: 'GET',
            });

            const locations = locationsRes.data.locations || [];
            if (!locations.length) {
                throw new BadRequestException(
                    `No locations found for account ${accountNameV1}. Make sure CMS Plumbing is under this Google account.`
                );
            }

            // For now, pick the first location. If you have multiple, you can filter by locationName or title.
            location = locations[0];
            locationNameV1 = location.name as string; // e.g. "locations/1234567890"

            if (!locationNameV1) {
                throw new BadRequestException('Invalid Google Business Profile location data (missing location name).');
            }

            // Extract numeric locationId from "locations/{locationId}"
            locationId = locationNameV1.split('/')[1];
        }

        return {
            account,
            location: {
                ...location,
                accountId,
                locationId,
            },
            accountId,
            locationId,
            locationName: locationNameV1,
            accountName: accountNameV1,
        };
    }

    /**
     * Fetch a single page of reviews using Google's native pagination.
     */
    async getReviewsPage(pageSize: number = 20, pageToken?: string) {
        this.logger.log(
            `getReviewsPage called with pageSize=${pageSize}, pageToken=${pageToken}`,
        );

        const { account, location, accountId, locationId, locationName, accountName } =
            await this.resolveAccountAndLocation();

        const url = new URL(
            `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews`,
        );
        url.searchParams.set('pageSize', String(pageSize));
        if (pageToken) {
            url.searchParams.set('pageToken', pageToken);
        }

        try {
            const reviewsRes = await this.oauthClient.request<{ reviews?: any[]; nextPageToken?: string }>({
                url: url.toString(),
                method: 'GET',
            });

            const reviews = (reviewsRes.data.reviews || []) as any[];
            const nextPageToken = reviewsRes.data.nextPageToken || null;

            this.logger.log(
                `Fetched ${reviews.length} Google reviews (pageSize=${pageSize}) for location ${locationName} (account ${accountName}). nextPageToken=${nextPageToken}`,
            );

            return {
                account,
                location,
                reviews,
                nextPageToken,
            };
        } catch (error: any) {
            this.logger.error(
                `Error fetching Google reviews from ${url.toString()}: ${error?.message}`,
            );
            throw error;
        }
    }

    /**
     * Fetch all reviews by iterating through all review pages.
     */
    async getAllReviews() {
        const { account, location, accountId, locationId, locationName, accountName } =
            await this.resolveAccountAndLocation();

        const allReviews: any[] = [];
        let pageToken: string | undefined = undefined;

        do {
            const url = new URL(
                `https://mybusiness.googleapis.com/v4/accounts/${accountId}/locations/${locationId}/reviews`,
            );
            url.searchParams.set('pageSize', '100');
            if (pageToken) {
                url.searchParams.set('pageToken', pageToken);
            }

            const reviewsRes = await this.oauthClient.request<{ reviews?: any[]; nextPageToken?: string }>({
                url: url.toString(),
                method: 'GET',
            });

            const reviews = (reviewsRes.data.reviews || []) as any[];
            allReviews.push(...reviews);

            pageToken = reviewsRes.data.nextPageToken || undefined;
        } while (pageToken);

        this.logger.log(
            `Fetched ${allReviews.length} Google reviews for location ${locationName} (account ${accountName}).`,
        );

        return {
            account,
            location,
            reviews: allReviews,
        };
    }
}


