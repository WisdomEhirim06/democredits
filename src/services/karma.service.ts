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
                    // Don't throw on 4xx so we can handle them gracefully
                    validateStatus: (status) => status < 500,
                }
            );

            // 404 = user is NOT in the karma list — safe to onboard
            if (response.status === 404) {
                return false;
            }

            // 401/403 = invalid API key — fail open so users aren't blocked
            if (response.status === 401 || response.status === 403) {
                console.error('[KarmaService] Adjutor API authentication failed. Check your ADJUTOR_API_KEY.');
                return false;
            }

            // 200 with a non-empty data object = user IS blacklisted.
            // We check Object.keys().length > 0 to guard against empty {} responses
            // (an empty object is truthy in JS but doesn't mean the user is blacklisted).
            if (
                response.status === 200 &&
                response.data?.status === 'success' &&
                response.data?.data &&
                typeof response.data.data === 'object' &&
                Object.keys(response.data.data).length > 0
            ) {
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
