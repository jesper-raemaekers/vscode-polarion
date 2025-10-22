# vscode-polarion-rest README

This is a fork of the original vscode-polarion extension, enhanced with REST API functionality and modern features. This extension finds work items in Polarion and adds the title of the work item behind the item ID in any text. These texts are decorations in Code and do not interfere with the document itself.

A document will be updated on save or when changes the file that is viewed in Code.

## Fork Information

This is a community fork of the original [vscode-polarion](https://github.com/jesper-raemaekers/vscode-polarion) extension by Jesper Raemaekers, focusing on:
- REST API integration
- Improved error handling and performance
- Modern authentication methods
- Better user experience (enhanced workitem detail viewing, better Polarion outline, option to open workitems in a separate HTML pane)

## Features

After setup after any save expect the titles to be displayed like depicted below:

![Example](https://github.com/Feo-Elektronik-GmbH/vscode-polarion-rest/blob/main/images/example1.jpg?raw=true)

Hover over the text behind the line or on the item for a hover with more detailed info:

![Hover info](https://github.com/Feo-Elektronik-GmbH/vscode-polarion-rest/blob/main/images/hover.JPG?raw=true)

Right click on a work item name will enable the 'Open item in Polarion' option in this context menu.

![Context menu](https://github.com/Feo-Elektronik-GmbH/vscode-polarion-rest/blob/main/images/context_menu.jpg?raw=true)

Use the outline to quickly navigate to work items in the currently opened document.

![Context menu](https://github.com/Feo-Elektronik-GmbH/vscode-polarion-rest/blob/main/images/outline.jpg?raw=true)

Look for the messages that pop-up:

![Logged in](https://github.com/Feo-Elektronik-GmbH/vscode-polarion-rest/blob/main/images/success.jpg?raw=true)

![Misconfiguration](https://github.com/Feo-Elektronik-GmbH/vscode-polarion-rest/blob/main/images/warning.jpg?raw=true)

![Error](https://github.com/Feo-Elektronik-GmbH/vscode-polarion-rest/blob/main/images/error.jpg?raw=true)

General information is always available in the status bar. which can be clicked to restart the polarion client.

![Status logged in](https://github.com/Feo-Elektronik-GmbH/vscode-polarion-rest/blob/main/images/bar1.jpg?raw=true)
![Status updating document](https://github.com/Feo-Elektronik-GmbH/vscode-polarion-rest/blob/main/images/bar2.jpg?raw=true)

More detailed info is printed in a newly added output channel:

![Polarion output](https://github.com/Feo-Elektronik-GmbH/vscode-polarion-rest/blob/main/images/output.jpg?raw=true)

## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `Polarion.Url`: The polarion url, f.e.: http://polarion2020.example.com/polarion
* `Polarion.Project`: The polarion project ID
* `Polarion.Prefix`: The ticket prefix without the -
* `Polarion.Color`: The color for the texts that are added
* `Polarion.Hover`: Enables the hover menu
* `Polarion.RefreshTime`: Time after which an item in cache is refreshed

## Authentication

### Token Authentication (Secure Storage)
The extension uses Polarion's REST API with token-based authentication. Your Polarion access token is stored securely using VS Code's secret storage API, ensuring your credentials are protected.

To generate a token in Polarion:
1. Log into your Polarion instance
2. Go to your user profile settings
3. Navigate to the "Access Tokens" section
4. Generate a new token with appropriate permissions
5. Use the "Setup Polarion Authentication" command in VS Code to securely store your token

Note: Username/password authentication has been removed for security reasons. Only token-based authentication with secure storage is supported.

## REST API Implementation

This fork uses Polarion's REST API v1 for:
- Better performance and reliability
- Modern HTTP-based communication
- Improved error handling
- Reduced dependencies

## Known Issues


## Contributing

This is a community-maintained fork. Contributions are welcome! Please feel free to submit issues and pull requests.

## License

This fork maintains the same GPL-3.0-or-later license as the original project.

## Acknowledgments

Special thanks to [Jesper Raemaekers](https://github.com/jesper-raemaekers) for creating the original vscode-polarion extension that this fork is based on.

