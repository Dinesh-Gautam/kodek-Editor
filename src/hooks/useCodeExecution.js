import { useState } from 'react';

import { compileCode } from '../components/api/api-service';

/**
 * Custom hook for code execution functionality
 *
 * @returns {Object} Code execution state and handlers
 */
export function useCodeExecution() {
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Format timestamp for output logs
   * @returns {string} Formatted timestamp
   */
  const getTimestamp = () => {
    return new Date().toLocaleTimeString();
  };

  /**
   * Run the provided code with the specified language ID
   * @param {string} code - Source code to execute
   * @param {number} languageId - Language ID for the compiler
   */
  const runCode = async (code, languageId) => {
    setIsLoading(true);
    setOutput(
      `<span class="output-time">[${getTimestamp()}]</span> <span class="output-info">Running code...</span>\n\n`,
    );

    try {
      const result = await compileCode(code, languageId);

      let resultOutput = '';
      if (result.status.id === 3) {
        // Accepted
        resultOutput = `<span class="output-time">[${getTimestamp()}]</span> <span class="output-success">Execution successful!</span>\n\n${result.stdout || 'No output'}\n`;
      } else if (result.status.id === 6) {
        // Compilation error
        resultOutput = `<span class="output-time">[${getTimestamp()}]</span> <span class="output-error">Compilation Error:</span>\n${result.compile_output}\n`;
      } else {
        // Runtime error or other issues
        const errorMessage =
          result.stderr ||
          result.compile_output ||
          result.message ||
          'Unknown error';
        resultOutput = `<span class="output-time">[${getTimestamp()}]</span> <span class="output-error">Error (${result.status.description}):</span>\n${errorMessage}\n`;
      }

      setOutput((prev) => prev + resultOutput);
    } catch (error) {
      setOutput(
        (prev) =>
          prev +
          `<span class="output-time">[${getTimestamp()}]</span> <span class="output-error">Error: ${error.message}</span>\n`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Clear the output panel
   */
  const clearOutput = () => {
    setOutput(
      `<span class="output-time">[${getTimestamp()}]</span> <span class="output-info">Output cleared</span>\n`,
    );
  };

  return {
    output,
    isLoading,
    runCode,
    clearOutput,
  };
}
