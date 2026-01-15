/**
 * src/services/csrf.ts
 * CSRF Token management for API requests
 * 
 * Usage:
 *   const token = await getCsrfToken();
 *   // Include in all POST/PUT/DELETE requests
 */

let cachedToken: string | null = null;

/**
 * Get CSRF token from backend
 * Caches token for duration of session to minimize API calls
 */
export async function getCsrfToken(): Promise<string> {
  // Return cached token if available
  if (cachedToken) {
    return cachedToken as string;
  }

  try {
    const response = await fetch('/API/get_csrf_token.php', {
      method: 'GET',
      credentials: 'include', // Include session cookies
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get CSRF token: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.success && data.csrf_token) {
      cachedToken = data.csrf_token;
      return cachedToken as string;
    } else {
      throw new Error('Invalid CSRF token response');
    }
  } catch (error) {
    console.error('Error fetching CSRF token:', error);
    throw error;
  }
}

/**
 * Clear cached token (useful after logout or session refresh)
 */
export function clearCsrfToken(): void {
  cachedToken = null;
}

/**
 * Helper to add CSRF token to request body
 */
export async function addCsrfToBody(body: Record<string, any>): Promise<Record<string, any>> {
  const token = await getCsrfToken();
  return {
    csrf_token: token,
    ...body
  };
}
