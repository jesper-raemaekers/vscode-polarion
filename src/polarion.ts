import * as soap from "soap";

export class Polarion {

  soapClient: soap.Client;
  soapTracker: soap.Client;
  soapUser: string;
  soapPassword: string;
  // polarionUrl: string;
  polarionProject: string;

  initialized: boolean;

  sessionID: any;

  constructor(url: string, projectName: string, username: string, password: string) {
    console.log('constructing polarion connection');
    this.soapUser = username;
    this.soapPassword = password;
    this.polarionProject = projectName;
    this.initialized = false;
    this.sessionID = '';

    var soap = require('soap');
    this.soapTracker = soap.createClientAsync(url.concat('/ws/services/TrackerWebService?wsdl'));
    this.soapClient = soap.createClientAsync(url.concat('/ws/services/SessionWebService?wsdl'));

  }

  async initialize() {
    await this.soapTracker.then((client: soap.Client) => {
      this.soapTracker = client;
      console.log('tracker ok');
    }, (err: string) => { console.log('tracker fail'); });

    await this.soapClient.then((client: soap.Client) => {
      this.soapClient = client;
      this.initialized = true;
      console.log('ok client');

    }, (reason: string) => { console.log('fail client'); });

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
      loggedIn = true;

    }, (reason: string) => {
      console.log('polarion.login: could not login with expection: ' + reason);
    });
    return loggedIn;
  }

  private async sessionValid(): Promise<boolean> {
    let stillLoggedIn = false;

    if (this.sessionID !== '') {
      this.soapClient.addSoapHeader('<ns1:sessionID xmlns:ns1="http://ws.polarion.com/session" soap:actor="http://schemas.xmlsoap.org/soap/actor/next" soap:mustUnderstand="0">' + this.sessionID.$value + '</ns1:sessionID>');
    }

    await this.soapClient.hasSubjectAsync({}).then((result: any) => {
      // save session ID
      let r = result[0];
      console.log('polarion.sessionValid: result[0]: ' + r.hasSubjectReturn);
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
}