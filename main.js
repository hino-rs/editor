import { micromark } from 'https://esm.sh/micromark@4?bundle';
import { gfmTable, gfmTableHtml } from 'https://esm.sh/micromark-extension-gfm-table@2?bundle';

const runButton = document.getElementById("run");
const result = document.getElementById("result");
const status = document.getElementById("status");

const mode = Object.freeze({
    1: 'markdown',
    2: 'python',
})

class App {
    constructor() {
        this.mode = mode[1];
        this.python = null;
        this.editor = null;
        this.output = "";
        this.errOutput = "";
    }

    async init() {
        let initialValue = (await (await fetch('welcome.md')).text()).toString();
        await this.initEditor(initialValue);
        await this.initPython();
        this.markdown();
    }

    outputClear() {
        this.output = "";
        this.errOutput = "";
    }

    writeOutput(output) {
        result.innerText = output;
    }

    ready() {
        status.innerText = "準備完了";
    }

    // pyodide初期化
    // loadPyodide { stdout }で標準入力受け取る
    async initPython() {
        try {
            this.python = await loadPyodide({
                stdout: (out) => {this.output += out+"\n"; console.log(`>> ${out}`)},
                stderr: (out) => {this.errOutput =+ out+"\n"; console.log(`>> ${out}`)}
            });
        } catch(e) {
            console.error(e);
        }
    }

    // monaco初期化
    async initEditor(initialValue) {
        return new Promise((resolve, reject) => {
            require.config({ paths: { vs: "./node_modules/monaco-editor/min/vs" } });
            require(["vs/editor/editor.main"], () => {
                this.editor = monaco.editor.create(
                    document.getElementById("code-editor"),
                    {
                        value: initialValue,
                        language: "markdown",
                        theme: "vs-dark",
                        automaticLayout: true
                    }
                );
            });
            resolve();
        });
    }

    markdown() {
            console.log(this.editor);
        if (this.editor) {
            // this.editor.onDidChangeModelContent((event) => {
                const code = this.editor.getValue();
                console.log(code);
                const htmlContent = micromark(code, {
                    extentions: [gfmTable()],
                    htmlExtentions: [gfmTable()]
                });
                result.innerHTML = htmlContent;
            // });
        }
    }

    // Python実行
    run() {
        if (!this.editor || !this.python) {
            console.warn("準備ができていません")
            return;
        }
        const code = this.editor.getValue();
        this.python.runPython(code);
    }
}

async function main() {
    let app = new App();
    try {
        await app.init();
        app.ready();

        switch (app.mode) {
            case 'markdown':
                if (app.editor) {
                    app.markdown();
                }
                runButton.addEventListener('click', () => {
                    app.markdown()
                    // app.writeOutput(app.output);
                    console.log(result.innerHTML);
                });
                break;
            case 'python':
                runButton.addEventListener('click', () => {
                    app.run()
                    app.writeOutput(app.output);
                });
                break;
            default:
                console.error("非対応のモード");
        }
    } catch(e) {
        console.error(e);
    }
}

main();
