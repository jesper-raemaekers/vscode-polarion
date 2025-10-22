import * as vscode from 'vscode';

export class PolarionAuthManager {
  private static readonly TOKEN_KEY = 'polarion.token';
  
  constructor(private context: vscode.ExtensionContext) {}

  /**
   * Get the stored token from VS Code's secure storage
   */
  async getStoredToken(): Promise<string | undefined> {
    try {
      return await this.context.secrets.get(PolarionAuthManager.TOKEN_KEY);
    } catch (error) {
      console.error('Failed to retrieve token from secure storage:', error);
      return undefined;
    }
  }

  /**
   * Store a token securely using VS Code's secure storage
   */
  async storeToken(token: string): Promise<void> {
    try {
      await this.context.secrets.store(PolarionAuthManager.TOKEN_KEY, token);
    } catch (error) {
      console.error('Failed to store token in secure storage:', error);
      throw error;
    }
  }

  /**
   * Remove the stored token from secure storage
   */
  async clearStoredToken(): Promise<void> {
    try {
      await this.context.secrets.delete(PolarionAuthManager.TOKEN_KEY);
    } catch (error) {
      console.error('Failed to clear token from secure storage:', error);
      throw error;
    }
  }

  /**
   * Prompt user for Polarion URL if not configured
   */
  async promptForUrl(): Promise<string | undefined> {
    const currentUrl = vscode.workspace.getConfiguration('Polarion', null).get<string>('Url');
    
    if (currentUrl && currentUrl.trim() !== '') {
      return currentUrl;
    }

    const url = await vscode.window.showInputBox({
      prompt: 'Enter your Polarion URL',
      placeHolder: 'https://polarion.example.com/polarion',
      value: '',
      validateInput: (value: string) => {
        if (!value || value.trim() === '') {
          return 'URL cannot be empty';
        }
        try {
          new URL(value);
          return null;
        } catch {
          return 'Please enter a valid URL';
        }
      }
    });

    if (url && url.trim() !== '') {
      // Save the URL to settings
      await vscode.workspace.getConfiguration('Polarion').update('Url', url.trim(), vscode.ConfigurationTarget.Global);
      return url.trim();
    }

    return undefined;
  }

  /**
   * Open the token generation page in the user's browser
   */
  async openTokenGenerationPage(polarionUrl: string): Promise<void> {
    try {
      let tokenUrl = polarionUrl;
      
      // Ensure the URL ends properly
      if (!tokenUrl.endsWith('/')) {
        tokenUrl += '/';
      }
      
      // Remove /polarion/ from the end if it exists to avoid duplication
      if (tokenUrl.endsWith('/polarion/')) {
        tokenUrl = tokenUrl.slice(0, -10);
      }
      
      // Construct the token generation URL
      tokenUrl += 'polarion/#/user_tokens';
      
      const open = require('open');
      await open(tokenUrl);
      
      vscode.window.showInformationMessage(
        'Token generation page opened in your browser. Please generate a new token and copy it.',
        'I have my token'
      ).then(async (selection) => {
        if (selection === 'I have my token') {
          await this.promptForToken();
        }
      });
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open token generation page: ${error}`);
    }
  }

  /**
   * Prompt user to enter their token
   */
  async promptForToken(): Promise<string | undefined> {
    const token = await vscode.window.showInputBox({
      prompt: 'Enter your Polarion authentication token',
      placeHolder: 'Paste your token here',
      password: true,
      validateInput: (value: string) => {
        if (!value || value.trim() === '') {
          return 'Token cannot be empty';
        }
        if (value.length < 10) {
          return 'Token seems too short';
        }
        return null;
      }
    });

    if (token && token.trim() !== '') {
      try {
        await this.storeToken(token.trim());
        vscode.window.showInformationMessage('Token stored securely!');
        return token.trim();
      } catch (error) {
        vscode.window.showErrorMessage(`Failed to store token: ${error}`);
        return undefined;
      }
    }

    return undefined;
  }

  /**
   * Complete authentication setup workflow
   */
  async setupAuthentication(): Promise<{ url: string; token: string } | undefined> {
    try {
      // Step 1: Get or prompt for URL
      const url = await this.promptForUrl();
      if (!url) {
        vscode.window.showWarningMessage('Setup cancelled: No URL provided');
        return undefined;
      }

      // Step 2: Check if we already have a stored token
      let token = await this.getStoredToken();
      if (token) {
        const useExisting = await vscode.window.showQuickPick(
          ['Use existing token', 'Generate new token'],
          {
            placeHolder: 'A token is already stored. What would you like to do?'
          }
        );

        if (useExisting === 'Use existing token') {
          return { url, token };
        } else if (useExisting === 'Generate new token') {
          await this.clearStoredToken();
          token = undefined;
        } else {
          return undefined; // User cancelled
        }
      }

      // Step 3: If no token, guide user through token generation
      if (!token) {
        const proceed = await vscode.window.showInformationMessage(
          'You need to generate a Polarion authentication token. Would you like to open the token generation page?',
          'Yes, open token page',
          'I already have a token',
          'Cancel'
        );

        if (proceed === 'Yes, open token page') {
          await this.openTokenGenerationPage(url);
          return undefined; // Token will be prompted for after page opens
        } else if (proceed === 'I already have a token') {
          token = await this.promptForToken();
          if (!token) {
            return undefined;
          }
        } else {
          return undefined; // User cancelled
        }
      }

      if (url && token) {
        return { url, token };
      }

      return undefined;
    } catch (error) {
      vscode.window.showErrorMessage(`Authentication setup failed: ${error}`);
      return undefined;
    }
  }

  /**
   * Check if authentication is properly configured
   */
  async isAuthenticationConfigured(): Promise<boolean> {
    const url = vscode.workspace.getConfiguration('Polarion', null).get<string>('Url');
    const storedToken = await this.getStoredToken();
    
    return !!(url && url.trim() !== '' && storedToken && storedToken.trim() !== '');
  }
}