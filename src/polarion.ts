import * as soap from "soap";
import * as vscode from 'vscode';

export class Polarion {
  // soap clients
  soapClient: soap.Client;
  soapTracker: soap.Client;

  //polarion config
  soapUser: string;
  soapPassword: string;
  polarionProject: string;
  polarionUrl: string;

  //initialized boolean
  initialized: boolean;

  //session id
  sessionID: any;

  //message related
  numberOfErrorToShow: number;
  numberOfSuccesToShow: number;

  constructor(url: string, projectName: string, username: string, password: string) {
    this.soapUser = username;
    this.soapPassword = password;
    this.polarionProject = projectName;
    this.polarionUrl = url;
    this.initialized = false;
    this.sessionID = '';
    this.numberOfErrorToShow = 1;
    this.numberOfSuccesToShow = 1;

    var soap = require('soap');
    this.soapTracker = soap.createClientAsync(url.concat('/ws/services/TrackerWebService?wsdl'));
    this.soapClient = soap.createClientAsync(url.concat('/ws/services/SessionWebService?wsdl'));

  }

  async initialize() {
    await this.soapTracker.then((client: soap.Client) => {
      this.soapTracker = client;
    }, (err: string) => { this.reportError('Could not connect to Polarion TrackerWebService on ' + this.polarionUrl); });

    await this.soapClient.then((client: soap.Client) => {
      this.soapClient = client;
      this.initialized = true;
    }, (reason: string) => { this.reportError('Could not connect to Polarion SessionWebService on ' + this.polarionUrl); });

    await this.getSession();
  }

  private async getSession(): Promise<boolean> {
    let loginSucces = false;
    let isCurrentSessionValid = await this.sessionValid();

    if (isCurrentSessionValid === false) {
      loginSucces = await this.login();
    }

    return (isCurrentSessionValid || loginSucces);
  }

  private async login(): Promise<boolean> {
    let loggedIn = false;

    await this.soapClient.logInAsync({ userName: this.soapUser, password: this.soapPassword }).then((result: any) => {

      // save session ID
      this.sessionID = result[2].sessionID;

      console.log('polarion.login: Logged in with session: ' + this.sessionID.$value);
      this.reportInfo('Logged in to Polarion!');
      loggedIn = true;

    }, (reason: string) => {
      console.log('polarion.login: could not login with expection: ' + reason);
      this.reportError('Could not login to Polarion');
    });
    return loggedIn;
  }

  private async sessionValid(): Promise<boolean> {
    let stillLoggedIn = false;

    if (this.sessionID !== '') {
      this.soapClient.addSoapHeader('<ns1:sessionID xmlns:ns1="http://ws.polarion.com/session" soap:actor="http://schemas.xmlsoap.org/soap/actor/next" soap:mustUnderstand="0">' + this.sessionID.$value + '</ns1:sessionID>');
    }

    await this.soapClient.hasSubjectAsync({}).then((result: any) => {
      // save session ID if stil valid
      if (result[0].hasSubjectReturn === true) {
        stillLoggedIn = true;
        this.sessionID = result[2].sessionID;
        console.log('polarion.sessionValid: Session still valid');
      } else { console.log('polarion.sessionValid: Session not valid'); }
    }, (reason: string) => {
      console.log('polarion.sessionValid: Failure to get session with exception: ' + reason);
    });

    return stillLoggedIn;
  }

  private async getWorkItem(itemId: string): Promise<any | undefined> {
    // don't bother requesting if not initialized
    if (this.initialized === false) {
      return undefined;
    }

    let workItem: any = undefined;
    this.soapTracker.addSoapHeader('<ns1:sessionID xmlns:ns1="http://ws.polarion.com/session" soap:actor="http://schemas.xmlsoap.org/soap/actor/next" soap:mustUnderstand="0">' + this.sessionID.$value + '</ns1:sessionID>');

    await this.getSession();

    await this.soapTracker.getWorkItemByIdAsync({ projectId: this.polarionProject, workitemId: itemId }, null, this.sessionID)
      .then((result: any) => {
        let r = result[0].getWorkItemByIdReturn;
        if (r.attributes.unresolvable === 'false') {
          console.log('polarion.getWorkItem: Found workitem ' + itemId + ': ' + r.title);
          workItem = r;
        }
        else {
          console.log('polarion.getWorkItem: Could not find workitem ' + itemId);
        }
      }
        , (reason: string) => {
          console.log('polarion.getWorkItem: Could not find ' + itemId + ' with exception: ' + reason);
        });

    return workItem;
  }

  async getTitleFromWorkItem(itemId: string): Promise<string | undefined> {
    let workItem = await this.getWorkItem(itemId);

    if (workItem) {
      return workItem.title;
    }
    else {
      return undefined;
    }
  }

  async getUrlFromWorkItem(itemId: string): Promise<string | undefined> {
    // for now just construct the URL
    return this.polarionUrl.concat('/#/project/', this.polarionProject, '/workitem?id=', itemId);
  }

  private reportError(err: string) {
    if (this.numberOfErrorToShow > 0) {
      vscode.window.showErrorMessage(err);
      console.error('Polarion.reportError: ' + err);
      this.numberOfErrorToShow--;
    }
  }
  private reportInfo(err: string) {
    if (this.numberOfSuccesToShow > 0) {
      vscode.window.showInformationMessage(err);
      console.log('Polarion.reportInfo: ' + err);
      this.numberOfSuccesToShow--;
    }
  }

}