import axios from 'axios';

const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com/submissions';
const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY;
const RAPIDAPI_HOST = import.meta.env.VITE_RAPIDAPI_HOST;

// Create an Axios instance for Judge0 API
const judge0Api = axios.create({
  baseURL: JUDGE0_API_URL,
  headers: {
    'Content-Type': 'application/json', // Use only one Content-Type header
    'X-RapidAPI-Key': RAPIDAPI_KEY,
    'X-RapidAPI-Host': RAPIDAPI_HOST,
  },
});

const POLLING_INTERVAL_MS = 1500; // Slightly increased polling interval
const MAX_POLLING_ATTEMPTS = 10; // Limit polling attempts

/**
 * Makes a request to the code compilation API
 *
 * @param {string} code - Source code to compile
 * @param {number} languageId - JudgeO API language identifier
 * @returns {Promise<Object>} - Compilation result object with status and output
 * @throws {Error} - If API request fails
 */
export const compileCode = async (code, languageId) => {
  const submitOptions = {
    params: {
      base64_encoded: 'false',
      fields: '*',
    },
    data: {
      source_code: code,
      language_id: languageId,
      stdin: '',
    },
  };

  try {
    // Submit code using the dedicated instance
    const response = await judge0Api.post('/', submitOptions.data, {
      params: submitOptions.params,
    });
    const token = response.data.token;

    if (!token) {
      throw new Error('Submission token not received from API.');
    }

    // Poll for results
    let result;
    let attempts = 0;
    while (attempts < MAX_POLLING_ATTEMPTS) {
      result = await judge0Api.get(`/${token}`, {
        params: {
          base64_encoded: 'false',
          fields: '*',
        },
      });

      // Status IDs: 1 (In Queue), 2 (Processing)
      if (result.data.status.id <= 2) {
        attempts++;
        await new Promise((resolve) =>
          setTimeout(resolve, POLLING_INTERVAL_MS),
        );
      } else {
        // Finished (Accepted, Wrong Answer, Time Limit Exceeded, etc.) or Error
        return result.data;
      }
    }

    // If loop finishes without result, throw timeout error
    throw new Error(`Polling timed out after ${attempts} attempts.`);
  } catch (error) {
    console.error('API Request/Compilation Error:', error);
    // Provide more context in the error message
    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      'Failed to compile or retrieve result';
    throw new Error(`Compilation failed: ${errorMessage}`);
  }
};
