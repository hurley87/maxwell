import { Opik } from 'opik';

/**
 * Opik client singleton for iMessage triage observability.
 * 
 * Configure via environment variables:
 * - OPIK_API_KEY: Your Opik API key
 * - OPIK_URL_OVERRIDE: Opik API URL (default: https://www.comet.com/opik/api)
 * - OPIK_PROJECT_NAME: Project name (default: maxwell-imsg-triage)
 * - OPIK_WORKSPACE: Workspace name (required for Comet cloud)
 */
let opikClient: Opik | null = null;

/**
 * Lazily initializes and returns the Opik client.
 * This ensures environment variables are loaded before initialization.
 */
export function getOpik(): Opik {
  if (!opikClient) {
    opikClient = new Opik({
      projectName: process.env.OPIK_PROJECT_NAME || 'maxwell-imsg-triage',
      workspaceName: process.env.OPIK_WORKSPACE,
      apiKey: process.env.OPIK_API_KEY,
      apiUrl: process.env.OPIK_URL_OVERRIDE || 'https://www.comet.com/opik/api',
    });
  }
  return opikClient;
}

// Legacy export for backwards compatibility
export const opik = {
  get trace() {
    return getOpik().trace.bind(getOpik());
  },
  get flush() {
    return getOpik().flush.bind(getOpik());
  },
};
