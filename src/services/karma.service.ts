import axios from 'axios';

export class KarmaService {
    private readonly baseUrl: string;
    private readonly apiKey: string;

    constructor() {
        this.baseUrl = process.env.ADJUTOR_BASE_URL || 'https://adjutor.lendsqr.com/v2';
        this.apiKey = process.env.ADJUTOR_API_KEY || '';
    }

    /**
     * Check if a user identity (e.g., email) is blacklisted in Lendsqr's
     * Adjutor Karma system.
     *
     * Returns true if the user IS blacklisted (should NOT be onboarded).
     * Returns false if the user is NOT blacklisted (safe to onboard).
     */
    async isBlacklisted(identity: string): Promise<boolean> {
        const env = process.env.NODE_ENV || 'development';

        // Skip the check entirely in local dev mode so testing is never blocked
        if (env === 'local') {
            console.log('[KarmaService] Skipping blacklist check in local mode.');
            return false;
        }

        // If no real API key is configured, skip the check
        if (!this.apiKey || this.apiKey === 'your-adjutor-api-key') {
            console.warn('[KarmaService] No ADJUTOR_API_KEY configured — skipping blacklist check.');
            return false;
        }

        try {
            const response = await axios.get(
                `${this.baseUrl}/verification/karma/${encodeURIComponent(identity)}`,
                {
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                    },
                    validateStatus: (status) => status < 500,
                }
            );

            console.log(`[KarmaService] Status: ${response.status}, Identity: ${identity}`);

            // 404 = user is NOT in the karma list — safe to onboard
            if (response.status === 404) {
                console.log('[KarmaService] User not found in karma list — safe to onboard.');
                return false;
            }

            // 401/403 = invalid API key — fail open so users aren't blocked
            if (response.status === 401 || response.status === 403) {
                console.error('[KarmaService] Adjutor API authentication failed. Check your ADJUTOR_API_KEY.');
                return false;
            }

            // Detect Adjutor test mode: the API returns a "mock-response" field
            // when the app is in test mode. In test mode, ALL lookups return a fake
            // karma record, so we must treat this as "not blacklisted".
            if (response.data?.['mock-response']) {
                console.warn('[KarmaService] Adjutor is in TEST MODE — mock response detected. Treating as not blacklisted.');
                console.warn('[KarmaService] Toggle your Adjutor app to LIVE MODE at https://app.adjutor.io to use real karma data.');
                return false;
            }

            // 200 with a non-empty data object = user IS blacklisted in live mode
            if (
                response.status === 200 &&
                response.data?.status === 'success' &&
                response.data?.data &&
                typeof response.data.data === 'object' &&
                Object.keys(response.data.data).length > 0
            ) {
                console.log(`[KarmaService] User ${identity} found in karma blacklist.`);
                return true;
            }

            return false;
        } catch (error: unknown) {
            // Network errors — fail open so users aren't blocked by connectivity issues
            console.error('[KarmaService] Blacklist check failed (network error):', error);
            return false;
        }
    }
}

export default new KarmaService();
