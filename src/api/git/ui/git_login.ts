import { Octokit } from 'octokit';

/**
 * 1. LOGIN API
 * Validates the GitHub token and returns the authenticated user data.
 */
export async function login(token: string) {
    const octokit = new Octokit({ auth: token });
    const { data } = await octokit.rest.users.getAuthenticated();
    return data;
}
