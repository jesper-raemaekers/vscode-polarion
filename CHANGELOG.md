# Change Log

All notable changes to the "vscode-polarion-rest" extension will be documented in this file.

This is a fork of the original vscode-polarion extension with enhanced REST API functionality.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [1.0.0] - Unreleased

### Added
- Forked from vscode-polarion v0.2.2
- Improved error handling and performance
- Modern token-based authentication
- Support for images in workitem descriptions
- Support for displaying proper user names, workitem type names and status names (with icons)
- Addition of codelenses to show workitems
- Added Open to the Side option for workitems to show workitems in Polarion
- Fixed inline workitem links in workitem descriptions received from Polarion

### Changed
- Extension name changed to "vscode-polarion-rest"
- Repository URLs updated to reflect fork
- Version reset to 1.0.0 for fork release
- Enhanced README with fork information and acknowledgments
- REST API integration replaces the old SOAP API
- Proper sanitization of API texts

### Maintained
- All original functionality from vscode-polarion v0.2.2
- Same GPL-3.0-or-later license

## Original Extension History

The following releases are from the original vscode-polarion extension by Jesper Raemaekers:

### [0.2.2] - Original Release
- Added the refresh time setting and polarion.json configuration file

### [0.2.1] - Original Release
- Added time to workitem so they are retrieved again after a period of time. Helps when updating tickets or after a disconnection from polarion.

### [0.2.0] - Original Release
- Initial test command added for getting the work item title

### [0.1.8] - Original Release
- Added outline view

### [0.1.7] - Original Release
- Added hover menu with more work item info

### [0.1.6] - Original Release
- Added output channel for more detailed logs that are user accessible

### [0.1.5] - Original Release
- Added status bar item showing update progress. Nice for larger documents or slower servers.

### [0.1.4] - Original Release
- Adding logo

### [0.1.1] - Original Release
- Add editor context menu option
- Some error reporting in place

### [0.0.1] - Original Release
- Initial release with basic functionality and no tests