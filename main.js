const runButton = document.getElementById("run");

class App {
    constructor() {
        this.python = null;
        this.editor = null;
        this.output = "";
        this.errOutput = "";
        this.status = document.getElementById("status");
        this.result = document.getElementById('result');
    }

    async init() {
        await this.initPython();
        await this.initEditor();
    }

    outputClear() {
        this.output = "";
        this.errOutput = "";
    }

    writeOutput(output) {
        this.result.innerText = output;
    }

    ready() {
        this.status.innerText = "準備完了";
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
    initEditor() {
        return new Promise((resolve) => {
            require.config({ paths: { vs: "./node_modules/monaco-editor/min/vs" } });
            require(["vs/editor/editor.main"], () => {
                this.editor = monaco.editor.create(
                    document.getElementById("code-editor"),
                    {
                        value: '',
                        language: "python",
                        theme: "vs-dark",
                        automaticLayout: true
                    }
                );
                resolve();
            });    
        });
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
        runButton.addEventListener('click', () => {
            app.run()
            app.writeOutput(app.output);
        });
    } catch(e) {
        console.error(e);
    }
}

main();
