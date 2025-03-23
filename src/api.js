import axios from "axios";

const JUDGE0_API_URL = "https://judge0-ce.p.rapidapi.com/submissions";
const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY;
const RAPIDAPI_HOST = import.meta.env.VITE_RAPIDAPI_HOST;

// Function to compile code
export const compileCode = async (code, languageId) => {
  const options = {
    method: 'POST',
    url: JUDGE0_API_URL,
    params: {
      base64_encoded: 'false',
      fields: '*'
    },
    headers: {
      'content-type': 'application/json',
      'Content-Type': 'application/json',
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': RAPIDAPI_HOST
    },
    data: {
      source_code: code,
      language_id: languageId,
      stdin: ''
    }
  };

  try {
    const response = await axios.request(options);
    const token = response.data.token;

    // Poll for results
    let result;
    while (true) {
      result = await axios.get(`${JUDGE0_API_URL}/${token}`, {
        params: {
          base64_encoded: 'false',
          fields: '*'
        },
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': RAPIDAPI_HOST
        }
      });

      if (result.data.status.id <= 2) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      } else {
        break;
      }
    }

    return result.data;
  } catch (error) {
    console.error("Compilation Error:", error);
    throw new Error(error.response?.data?.message || "Failed to compile code");
  }
};
