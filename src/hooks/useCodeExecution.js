import { useEffect, useState } from 'react';

import { compileCode } from '../components/api/api-service';
import { useCollaboration } from '../context/collabration'; // Import collaboration hook

/**
 * Custom hook for code execution functionality
 *
 * @returns {Object} Code execution state and handlers
 */
export function useCodeExecution() {
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { handleCodeOutput } = useCollaboration(); // Get the output handler

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
    // Append "Running code..." instead of overwriting
    setOutput(
      (prev) =>
        prev +
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

      // Update local state first
      setOutput((prev) => prev + resultOutput);
      // Then propagate the final output string to others
      handleCodeOutput(resultOutput);
    } catch (error) {
      setOutput(
        (prev) =>
          prev +
          `<span class="output-time">[${getTimestamp()}]</span> <span class="output-error">Error: ${error.message}</span>\n`,
      );
      // Propagate error message as well
      handleCodeOutput(
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

  // Listen for remote code output updates
  useEffect(() => {
    const handleRemoteOutput = (event) => {
      const { username, output: remoteOutput } = event.detail; // Destructure username
      console.log(`Received remote code output from ${username}`);
      // Prepend username info to the received output
      const formattedRemoteOutput = `<span class="output-info">Output from ${username}:</span>\n${remoteOutput}`;
      setOutput((prev) => prev + formattedRemoteOutput); // Append formatted remote output
    };

    window.addEventListener('remoteCodeOutput', handleRemoteOutput);
    return () =>
      window.removeEventListener('remoteCodeOutput', handleRemoteOutput);
  }, []); // Empty dependency array ensures this runs once on mount

  return {
    output,
    setOutput, // Expose the setOutput function
    isLoading,
    runCode,
    clearOutput,
  };
}
