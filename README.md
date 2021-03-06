# vscode-polarion README

This extension finds work items in polarion and add the title of the work item behind the item ID in any text. These texts are decorations in Code and do not interfere with the document itself.

A document will be updated on save or when changes the file that is viewed in Code.

## Features

After setup after any save expect the titles to be displayed like depicted below:

![Example](https://github.com/jesper-raemaekers/vscode-polarion/blob/main/images/example1.jpg?raw=true)

Hover over the text behind the line or on the item for a hover with more detailed info:

![Hover info](https://github.com/jesper-raemaekers/vscode-polarion/blob/main/images/hover.JPG?raw=true)

Right click on a work item name will enable the 'Open item in Polarion' option in this context menu.

![Context menu](https://github.com/jesper-raemaekers/vscode-polarion/blob/main/images/context_menu.jpg?raw=true)

Use the outline to quickly navigate to work items in the currently opened document.

![Context menu](https://github.com/jesper-raemaekers/vscode-polarion/blob/main/images/outline.jpg?raw=true)

Look for the messages that pop-up:

![Logged in](https://github.com/jesper-raemaekers/vscode-polarion/blob/main/images/success.jpg?raw=true)

![Misconfiguration](https://github.com/jesper-raemaekers/vscode-polarion/blob/main/images/warning.jpg?raw=true)

![Error](https://github.com/jesper-raemaekers/vscode-polarion/blob/main/images/error.jpg?raw=true)

General information is always available in the status bar. which can be clicked to restart the polarion client.

![Status logged in](https://github.com/jesper-raemaekers/vscode-polarion/blob/main/images/bar1.jpg?raw=true)
![Status updating document](https://github.com/jesper-raemaekers/vscode-polarion/blob/main/images/bar2.jpg?raw=true)

More detailed info is printed in a newly added output channel:

![Polarion output](https://github.com/jesper-raemaekers/vscode-polarion/blob/main/images/output.jpg?raw=true)



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
* `Polarion.Hover`: Enables the hover menu
* `Polarion.RefreshTime`: Time after which an item in cache is refreshed

The username and password can be saved in a separate file in .vscode with the name polarion.json. IF the file is present and valid, it will override the settings above.
![polarion config file](https://github.com/jesper-raemaekers/vscode-polarion/blob/main/images/config.png?raw=true)

## Known Issues

Password is stored in plain text in settings.

Only the first work item is handled:

![Example](https://github.com/jesper-raemaekers/vscode-polarion/blob/main/images/limitation1.jpg?raw=true)

## Release Notes

### 0.2.2

Added the refresh time setting and polarion.json configuration file.

### 0.2.1

Added time to workitem so they are retrieved again after a period of time. This helps when updating tickets or after a disconenction from polarion.

### 0.2.0

Initial test command added for getting the work item title

### 0.1.8

Added outline view.

### 0.1.7

Added hover menu with more work item info.

### 0.1.6

Added output channel for more detailed logs that are user accesible.

### 0.1.5

Added status bar item showing update progress. Nice for larger documents or slower servers.

### 0.1.4

Adding logo

### 0.1.1

Add editor context menu option. some error reporting in place.

### 0.0.1

Initial release with basic functionality and no tests

