import * as soap from "soap";
import * as vscode from 'vscode';
import * as utils from './utils';
import * as editor from './editor';

export let polarion: Polarion;

export class Polarion {
  // soap clients
  soapClient: soap.Client;
  soapTracker: soap.Client;

  //polarion config
  soapUser: string;
  soapPassword: string;
  polarionProject: string | undefined;
  polarionUrl: string;

  //initialized boolean
  initialized: boolean;

  //session id
  sessionID: any;

  //message related
  numberOfPopupsToShow: number;
  lastMessage: string | undefined;
  outputChannel: vscode.OutputChannel;

  //cache
  itemCache: Map<string, { workitem: any, time: Date }>;

  //exception handling
  exceptionCount: number;


  constructor(url: string, username: string, password: string, outputChannel: vscode.OutputChannel, projectName: string | undefined = undefined) {
    this.soapUser = username;
    this.soapPassword = password;
    this.polarionProject = projectName;
    this.polarionUrl = url;
    this.initialized = false;
    this.sessionID = '';
    this.numberOfPopupsToShow = 2;
    this.lastMessage = undefined;
    this.outputChannel = outputChannel;
    this.itemCache = new Map<string, { workitem: any, time: Date }>();
    this.exceptionCount = 0;

    this.report(`Polarion service started`, LogLevel.info);
    this.report(`With url: ${this.polarionUrl}`, LogLevel.info);
    this.report(`With project: ${this.polarionProject}`, LogLevel.info);
    this.report(`With user: ${this.soapUser}`, LogLevel.info);

    var soap = require('soap');
    this.soapTracker = soap.createClientAsync(url.concat('/ws/services/TrackerWebService?wsdl'));
    this.soapClient = soap.createClientAsync(url.concat('/ws/services/SessionWebService?wsdl'));

  }

  async initialize() {
    await this.soapTracker.then((client: soap.Client) => {
      this.soapTracker = client;
    }, (err: string) => { this.report(`Could not connect to Polarion TrackerWebService on ${this.polarionUrl}`, LogLevel.error, true); });

    await this.soapClient.then((client: soap.Client) => {
      this.soapClient = client;
      this.initialized = true;
    }, (reason: string) => { this.report(`Could not connect to Polarion SessionWebService on ${this.polarionUrl}`, LogLevel.error, true); });


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

      this.report('Polarion login successful!', LogLevel.info, true);
      this.report(`login: Logged in with session: ${this.sessionID.$value}`, LogLevel.info);
      loggedIn = true;

    }, (reason: string) => {
      this.report('Polarion not logged in', LogLevel.error, true);
      this.report(`login: could not login with expection: ${reason}`, LogLevel.info);
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
        this.report(`sessionValid: Session still valid`, LogLevel.info);
      } else { this.report(`sessionValid: Session not valid`, LogLevel.info); }
    }, (reason: string) => {
      this.report(`sessionValid: Failure to get session with exception: ${reason}`, LogLevel.error);
    });

    return stillLoggedIn;
  }


  async getWorkItem(workItem: string): Promise<any | undefined> {
    //Add to the dictionairy if not available

    let fetchItem = false;

    if (this.initialized) {
      if (!this.itemCache.has(workItem)) {
        fetchItem = true;
      }
      if (this.itemCache.has(workItem)) {
        let item = this.itemCache.get(workItem);
        if (item) {
          let current = new Date();
          let delta = Math.abs(current.valueOf() - item.time.valueOf());
          let minutes: number | undefined = vscode.workspace.getConfiguration('Polarion', null).get('RefreshTime');
          if (minutes) {
            if (delta > (minutes * 60 * 1000)) {
              fetchItem = true;
            }
          }
        }
      }
    }

    if (fetchItem) {
      await this.getWorkItemFromPolarion(workItem).then((item: any | undefined) => {
        // Also add undefined workItems to avoid looking them up more than once
        this.itemCache.set(workItem, { workitem: item, time: new Date() });
      });
    }


    //lookup in dictionairy
    var item = undefined;
    if (this.itemCache.has(workItem)) {
      item = this.itemCache.get(workItem);
    }
    return item?.workitem;
  }



  private async getWorkItemFromPolarion(itemId: string): Promise<any | undefined> {
    if (this.initialized === false) {
      return undefined;
    }
    this.soapTracker.addSoapHeader('<ns1:sessionID xmlns:ns1="http://ws.polarion.com/session" soap:actor="http://schemas.xmlsoap.org/soap/actor/next" soap:mustUnderstand="0">' + this.sessionID.$value + '</ns1:sessionID>');
    await this.getSession();
    if (this.polarionProject) {
      return this.getProjectWorkItem(itemId, this.polarionProject);
    }
    return this.getWorkItemGlobally(itemId);
  }

  private async getWorkItemGlobally(itemId: string): Promise<any | undefined> {
    var workItem: any = undefined;
    var uri = undefined;
    const query = `id:${itemId}`;
    await this.soapTracker.queryWorkItemsAsync({ query: query, sort: "id", fields: ["id"] }, null, this.sessionID)
      .then((result: any) => {
        if (result.length === 0) {
          this.report(`getWorkItem: Could not find workitem ${itemId}`, LogLevel.info);
          return;
        }
        let r = result[0].queryWorkItemsReturn[0];
        if (r.attributes.unresolvable === 'false') {
          this.report(`getWorkItem: Found workitem ${itemId} ${r.title}`, LogLevel.info);
          uri = r.attributes.uri;
        }
        else {
          this.report(`getWorkItem: Could not find workitem ${itemId}`, LogLevel.info);
        }
      }
        , (reason: string) => {
          this.handlePromiseRejection(reason, itemId);
        });
    await this.soapTracker.getWorkItemByUriAsync({ uri: uri }, null, this.sessionID).then((result: any) => {
      workItem = result[0].getWorkItemByUriReturn;
    }
      , (reason: string) => {
        this.report(`getWorkItem: Could not get workitem ${itemId} with exception: ${reason}`, LogLevel.error);
      });
    return workItem;
  }

  private async getProjectWorkItem(itemId: string, projectId: string): Promise<any | undefined> {
    let workItem: any = undefined;
    await this.soapTracker.getWorkItemByIdAsync({ projectId: this.polarionProject, workitemId: itemId }, null, this.sessionID)
      .then((result: any) => {
        let r = result[0].getWorkItemByIdReturn;
        if (r.attributes.unresolvable === 'false') {
          this.report(`getWorkItem: Found workitem ${itemId} ${r.title}`, LogLevel.info);
          workItem = r;
        }
        else {
          this.report(`getWorkItem: Could not find workitem ${itemId}`, LogLevel.info);
        }
      }
        , (reason: string) => {
          this.handlePromiseRejection(reason, itemId);
        });
    return workItem;
  }

  private handlePromiseRejection(reason: any, itemId: string) {
    this.report(`getWorkItem: Could not find ${itemId} with exception: ${reason}`, LogLevel.error);
    //restart instance because getting exceptions is not normal
    // this is possibly a workaround for some login problem?
    let exceptionLimit: number | undefined = vscode.workspace.getConfiguration('Polarion', null).get('ExceptionRestart');
    if (exceptionLimit) {
      if (this.exceptionCount > exceptionLimit && exceptionLimit > 0) {
        this.report(`getWorkItem: Restarting Polarion after ${this.exceptionCount} exceptions`, LogLevel.error);
        createPolarion(this.outputChannel);
      } else {
        this.exceptionCount++;
      }
    }
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

  getUrlFromWorkItem(itemId: string): string | undefined {
    let project = this.polarionProject ?? this.itemCache.get(itemId)?.workitem.project.id;
    return project ? this.polarionUrl.concat(`/polarion/#/project/${project}/workitem?id=${itemId}`) : undefined;
  }

  private report(msg: string, level: LogLevel, popup: boolean = false) {
    this.outputChannel.appendLine(msg);

    if (popup && this.numberOfPopupsToShow > 0) {
      this.numberOfPopupsToShow--;
      this.lastMessage = msg; // only show important messages
      switch (level) {
        case LogLevel.info:
          vscode.window.showInformationMessage(msg);
          break;
        case LogLevel.error:
          vscode.window.showErrorMessage(msg);
          break;
      }
    }
  }

  clearCache() {
    this.itemCache.clear();
    vscode.window.showInformationMessage('Cleared polarion work item cache');
  }

}

enum LogLevel {
  info,
  error
}

export async function createPolarion(outputChannel: vscode.OutputChannel) {
  console.log('createPolarion');

  let polarionUrl: string | undefined = vscode.workspace.getConfiguration('Polarion', null).get('Url');
  let polarionProject: string | undefined = vscode.workspace.getConfiguration('Polarion', null).get('Project');
  let polarionUsername: string | undefined = vscode.workspace.getConfiguration('Polarion', null).get('Username');
  let polarionPassword: string | undefined = vscode.workspace.getConfiguration('Polarion', null).get('Password');

  let fileConfig = utils.getPolarionConfigFromFile();
  if (fileConfig) {
    // we have a config file, overrule the username and password
    polarionUsername = fileConfig.username;
    polarionPassword = fileConfig.password;
  }
  if (polarionUrl && polarionUsername && polarionPassword) {
    let newPolarion = new Polarion(polarionUrl, polarionUsername, polarionPassword, outputChannel, polarionProject);
    polarion = newPolarion;
    await polarion.initialize().then(() => {
      const openEditor = vscode.window.visibleTextEditors.forEach(e => {
        editor.decorate(e);
      });
    });
  }
}