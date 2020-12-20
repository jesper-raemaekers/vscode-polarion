# vscode-polarion README

This extension finds work items in polarion and add the title of the work item behind the item ID in any text. These texts are decorations in Code and do not interfere with the document itself.

## Features

After setup after any save expect the titles to be displayed like depicted below:

![Example](https://github.com/jesper-raemaekers/vscode-polarion/blob/main/images/example1.jpg?raw=true)

Right click on a work item name will enable the 'Open item in Polarion' option in this context menu.

![Context menu](https://github.com/jesper-raemaekers/vscode-polarion/blob/main/images/context_menu.jpg?raw=true)

Look for the messages that pop-up:

![Logged in](https://github.com/jesper-raemaekers/vscode-polarion/blob/main/images/success.jpg?raw=true)

![Misconfiguration](https://github.com/jesper-raemaekers/vscode-polarion/blob/main/images/warning.jpg?raw=true)

![Error](https://github.com/jesper-raemaekers/vscode-polarion/blob/main/images/error.jpg?raw=true)




## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `Polarion.Username`: The polarion username to log in
* `Polarion.Password`: The password for that user
* `Polarion.Url`: The polarion url, f.e.: http://polarion2020.example.com/polarion
* `Polarion.Project`: The polarion project ID
* `Polarion.Prefix`: The ticket prefix without the -
* `Polarion.Color`: The color for the texts that are added


## Known Issues

Very little error handling and reporting. If it doesn't work, check the Developers tools logs.

Password is stored in plain text in settings.

Only the first workitem is handled:

![Example](https://github.com/jesper-raemaekers/vscode-polarion/blob/main/images/limitation1.jpg?raw=true)

## Release Notes

### 0.1.2

Adding logo

### 0.1.1

Add editor context menu option. some error reporting in place.

### 0.0.1

Initial release with basic functionality and no tests

