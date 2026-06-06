// Minimal vscode mock for unit tests
export const window = {
  showErrorMessage: jest.fn(),
  showWarningMessage: jest.fn(),
  showInformationMessage: jest.fn(),
};
export const env = {
  clipboard: { writeText: jest.fn() },
};
export const workspace = {
  workspaceFolders: undefined,
};
export const commands = {
  registerCommand: jest.fn(),
  executeCommand: jest.fn(),
};
export const Uri = {
  joinPath: jest.fn(),
  file: jest.fn(),
};
