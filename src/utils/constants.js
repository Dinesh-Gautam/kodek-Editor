/**
 * Available programming language options with their JudgeO API IDs and default code templates
 * @type {Object.<string, {id: number, defaultCode: string}>}
 */
export const LANGUAGE_OPTIONS = {
  javascript: {
    id: 63,
    defaultCode:
      "// Write your JavaScript code here...\nconsole.log('Hello, World!');",
  },
  python: {
    id: 71,
    defaultCode: "# Write your Python code here...\nprint('Hello, World!')",
  },
  c: {
    id: 50,
    defaultCode:
      '/* Write your C code here... */\n#include <stdio.h>\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}',
  },
  cpp: {
    id: 54,
    defaultCode:
      '/* Write your C++ code here... */\n#include <iostream>\nusing namespace std;\nint main() {\n    cout << "Hello, World!" << endl;\n    return 0;\n}',
  },
  java: {
    id: 62,
    defaultCode:
      '/* Write your Java code here... */\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}',
  },
};

/**
 * Socket.io connection configuration
 * @type {Object}
 */
export const SOCKET_CONFIG = {
  serverUrl: import.meta.VITE_SOCKET_URL,
  options: {
    timeout: 10000,
    forceNew: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  },
};
