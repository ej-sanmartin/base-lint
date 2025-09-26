declare module '@actions/core' {
  export function getInput(name: string, options?: { required?: boolean; trimWhitespace?: boolean }): string;
  export function getBooleanInput(name: string, options?: { required?: boolean }): boolean;
  export function info(message: string): void;
  export function warning(message: string): void;
  export function error(message: string): void;
  export function setFailed(message: string | Error): void;
}

declare module '@actions/github' {
  export const context: {
    payload: {
      pull_request?: {
        head?: { repo?: { full_name?: string } };
        base?: { repo?: { full_name?: string } };
      };
    };
  };
}
