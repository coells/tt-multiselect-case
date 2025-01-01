import * as vscode from 'vscode';

export const minSelections = 2;
export const maxSelections = 1000;

export enum CaseType {
    MIXED,
    LOWER,
    UPPER,
    CAPITAL,
    CAMEL,
}

class SelectionHandle {

    public caseType: CaseType;

    public constructor(
        public range: vscode.Range,
        public text: string,
    ) {
        this.caseType = this.detectCaseType();
    }

    private detectCaseType(): CaseType {
        if (/^[a-z]+$/.test(this.text)) {
            return CaseType.LOWER;
        } else if (/^[A-Z]+$/.test(this.text)) {
            return CaseType.UPPER;
        } else if (/^[A-Z][a-zA-Z]+$/.test(this.text)) {
            return CaseType.CAPITAL;
        } else if (/^[a-z][a-zA-Z]+$/.test(this.text)) {
            return CaseType.CAMEL;
        } else {
            return CaseType.MIXED;
        }
    }

}

class MultiselectController {

    private editor: vscode.TextEditor | undefined = undefined;
    private handles: SelectionHandle[] = [];

    public constructor() {
    }

    public onDidChangeActiveTextEditor(editor: vscode.TextEditor | undefined): void {
        this.editor = editor;
        this.updateHandles(editor?.selections ?? []);
    }

    public onDidChangeTextEditorSelection(event: vscode.TextEditorSelectionChangeEvent): void {
        this.editor = event.textEditor;
        this.updateHandles(event.selections);
    }

    public onDidChangeTextDocument(event: vscode.TextDocumentChangeEvent): void {
        if (event.reason === undefined) {
            this.updateTextDocument(event.contentChanges);
        }
    }

    private updateHandles(selections: readonly vscode.Selection[]): void {
        if (!this.editor || selections.length < minSelections || selections.length > maxSelections) {
            this.handles = [];
            return;
        }

        const document = this.editor.document;

        const singleLines = selections.every(s => s.isSingleLine);
        const firstLength = selections[0].end.character - selections[0].start.character;
        const consistentLengths = selections.every(s => s.end.character - s.start.character === firstLength);
        const allEmpty = selections.every(s => s.isEmpty);

        if (!singleLines || !consistentLengths) {
            this.handles = [];
            return;
        }

        if (!allEmpty) {
            this.handles = selections
                .slice()
                .sort((a, b) => a.start.compareTo(b.start))
                .map(s => new SelectionHandle(s, document.getText(s)));
        }
    }

    private updateTextDocument(changes: readonly vscode.TextDocumentContentChangeEvent[]): void {
        if (!this.editor || this.handles.length === 0 || changes.length !== this.handles.length) {
            return;
        }

        changes = changes.slice().sort((a, b) => a.rangeOffset - b.rangeOffset);

        console.log(changes);
        console.log(this.handles);

        let line = 0;
        let offset = 0;

        changes.forEach((c, index) => {
            const handle = this.handles[index];
            const textDiff = c.text.length - handle.text.length;

            if (handle.range.start.line !== line) {
                line = handle.range.start.line;
                offset = 0;
            }

            // TODO: update handles and text

            offset += textDiff;
        });

        console.log(this.handles);
    }

    public dispose() { }
}

export function activate(context: vscode.ExtensionContext) {
    const controller = new MultiselectController();

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(controller.onDidChangeActiveTextEditor, controller)
    );
    context.subscriptions.push(
        vscode.window.onDidChangeTextEditorSelection(controller.onDidChangeTextEditorSelection, controller)
    );
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(controller.onDidChangeTextDocument, controller)
    );

    context.subscriptions.push(controller);
}

export function deactivate() { }
