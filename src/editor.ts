import { resolve } from 'dns';
import * as vscode from 'vscode';
import * as pol from './polarion';
import * as utils from './utils';
// import * as cleanhtml from 'clean-html';
// import * as turndown from 'turndown';
// import TurndownService = require('turndown');

const decorationType = vscode.window.createTextEditorDecorationType({});
const open = require('open');

export async function decorate(editor: vscode.TextEditor) {
  let decorationColor = utils.getDecorateColor();
  let enableHover: boolean | undefined = vscode.workspace.getConfiguration('Polarion', null).get('Hover');
  let decorationsArray: vscode.DecorationOptions[] = [];

  let items = utils.mapItemsInDocument(editor);

  for (const item of items) {
    var title = await utils.getWorkItemText(item[0]);
    let renderOptionsDark = { after: { contentText: title, color: decorationColor, margin: '50px' } };
    let renderOptions = { light: renderOptionsDark, dark: renderOptionsDark };

    for (const itemRange of item[1]) {
      let hoverMessage = await buildHoverMarkdown(item[0]);
      if (enableHover === true) {
        let range = new vscode.Range(itemRange.start.line, itemRange.start.character, itemRange.end.line, itemRange.end.character - 1); // rebuild range to remove last character
        let onItemDecoration = { range, hoverMessage };
        decorationsArray.push(onItemDecoration);
        range = new vscode.Range(itemRange.start.line, 200, itemRange.end.line, 201);
        let afterLineDecoration = { range, renderOptions, hoverMessage };
        decorationsArray.push(afterLineDecoration);
      }
      else {
        let range = new vscode.Range(itemRange.start.line, 200, itemRange.end.line, 201);
        let afterLineDecoration = { range, renderOptions };
        decorationsArray.push(afterLineDecoration);
      }
    }
  }
  editor.setDecorations(decorationType, decorationsArray);
}

export async function buildHoverMarkdown(workItem: string): Promise<string[]> {
  let item = await pol.polarion.getWorkItem(workItem);
  let url = await pol.polarion.getUrlFromWorkItem(workItem);
  let hover: string[] = [];
  if (item !== undefined) {
    hover.push(`${workItem} (${item.type.id}) ***${item.title}***  \nAuthor: ${item.author.id}  \n Status: ${item.status.id}`);
    if (item.description) {

      hover.push(await getMkDiscription(item.description?.content));
    }
    url ?? hover.push(`[Open in Polarion](${url})`);
  }
  else {
    hover.push(`Not found`);
  }
  return hover;
}

async function getMkDiscription(des: string): Promise<string> {
  return new Promise((resolve, reject) => {

    let html2md = require('html-to-md');
    let strippedHtml = des.replace(/(\r\n|\n|\r)/gm, "");

    //cleanup html sources
    var cleaner = require('clean-html');
    var options = {
      'add-remove-tags': ['div', 'span', 'br', 'tbody', 'p'],
      'add-remove-attributes': ['style']
    };
    cleaner.clean(strippedHtml, options, function (html: string) {
      var html2json = require('html2json').html2json;
      var json2html = require('html2json').json2html;
      let json: any = html2json(html);

      //TODO: fix tables in children
      for (let n of json['child']) {
        if (n.tag === 'table') {
          n = fixTableHeader(n);
        }
      }


      html = json2html(json);
      let md = html2md(html);
      resolve(md);
    });





    // return md;
  });

}

function fixTableHeader(json: any): any {
  let rowCnt = 0;
  let thead: { node: string, tag: string, child: any[] } = { node: 'element', tag: 'thead', child: [] };
  let tbody: { node: string, tag: string, child: any[] } = { node: 'element', tag: 'tbody', child: [] };


  for (let c of json['child']) {
    console.log(c);
    if (c['tag'] === 'tr') {
      let tr = c;
      if (rowCnt === 0) {

        thead.child.push(tr);
      }
      else {
        tbody.child.push(tr);
      }
      rowCnt++;
    }

  }

  json['child'] = [];
  json['child'].push(thead);
  json['child'].push(tbody);
  return json;
}


export async function handleOpenPolarion() {
  const editor = vscode.window.activeTextEditor;
  if (editor !== undefined) {
    if (editor.selection.isEmpty) {
      // the Position object gives you the line and character where the cursor is
      const position = editor.selection.active;

      let items = utils.listItemsInDocument(editor);

      let selectedItem = items.find((value) => {
        if (value.range.contains(position)) {
          return 1;
        }
      });

      if (selectedItem && pol.polarion.getUrlFromWorkItem(selectedItem.name)) {
        open(pol.polarion.getUrlFromWorkItem(selectedItem.name));
      }
    }
  }
}
