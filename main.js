import { micromark } from 'https://esm.sh/micromark@4?bundle';
import { gfmTable, gfmTableHtml } from 'https://esm.sh/micromark-extension-gfm-table@2?bundle';
import { parseTmTheme } from 'https://esm.sh/monaco-themes';

const languages = {
    "Markdown": "markdown",
    "Python3": "python",
};

const themes = [
    "vs-light",
    "vs-dark",
    "hc-black",
];

const runButton = document.getElementById("run");
const result = document.getElementById("result");
const status = document.getElementById("status");
const languagesSelector = document.getElementById("languages");
const themesSelector = document.getElementById("themes");

class App {
    constructor() {
        this.language = "markdown"
        this.python = null;
        this.editor = null;
        this.output = "";
        this.errOutput = "";
    }

    async init() {
        try {
            this.setOptions();
            let initialValue = (await (await fetch('welcome.md')).text()).toString();
            await this.initEditor(initialValue);
            await this.initPython();
            this.markdown();
            this.bootSelector();
        } catch (e) {
            location.reload();
        }
    }

    setOptions() {
        for (const language in languages) {
            languagesSelector.innerHTML += `<option value="${languages[language]}">${language}</option>`;
        }

        for (const theme of themes) {
            themesSelector.innerHTML += `<option value="${theme}">${theme}</option>`;
        }
    }

    outputClear() {
        this.output = "";
        this.errOutput = "";
    }

    writeOutput(output) {
        result.innerText = output;
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
        if (this.editor) {
            this.editor.onDidChangeModelContent((event) => {
                this.writeMarkdown();
            });
        }
    }

    writeMarkdown() {
        const code = this.editor.getValue();
        const htmlContent = micromark(code, {
            extentions: [gfmTable()],
            htmlExtentions: [gfmTable()]
        });
        result.innerHTML = htmlContent;
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

    bootSelector() {
        languagesSelector.addEventListener('change', (event) => {
            let afterLanguage = event.target.value;
            monaco.editor.setModelLanguage(this.editor.getModel(), event.target.value);
            this.language = afterLanguage;

            if (afterLanguage === 'python') {

            }
        });

        themesSelector.addEventListener('change', (event) => {
            monaco.editor.setTheme(event.target.value);
        });
    }    
}

async function main() {
    let app = new App();
    try {
        await app.init();
        status.innerText = "準備完了";
        app.bootSelector();

        if (app.editor) {
            app.writeMarkdown();
        }

        runButton.addEventListener('click', () => {
            if (app.language === 'markdown') {
                app.markdown();
            } else {
                app.run()
                app.writeOutput(app.output);
            }
        });
    } catch(e) {
        console.error(e);
    }
}

main();
