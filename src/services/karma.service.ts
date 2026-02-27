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
        try {
            const response = await axios.get(
                `${this.baseUrl}/verification/karma/${encodeURIComponent(identity)}`,
                {
                    headers: {
                        Authorization: `Bearer ${this.apiKey}`,
                    },
                }
            );

            // If the API returns a successful response with karma data,
            // the user is blacklisted
            if (response.data && response.data.status === 'success' && response.data.data) {
                return true;
            }

            return false;
        } catch (error: unknown) {
            // If the API returns a 404, the user is NOT blacklisted
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                return false;
            }

            // For other errors (network issues, auth failures), log and allow
            // onboarding to proceed (fail-open strategy for non-critical check)
            console.error('Karma blacklist check failed:', error);
            return false;
        }
    }
}

export default new KarmaService();
