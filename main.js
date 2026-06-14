class App {
    constructor() {
        this.python = null;
        this.editor = null;
    }

    async init() {
        await this.initPython();
        await this.initEditor();
    }

    async initPython() {
        try {
            this.python = await loadPyodide({
                stdout: (out) => console.log(`>> ${out}`),
                stderr: (out) => console.log(`>> ${out}`)
            });
        } catch(e) {
            console.error(e);
        }
    }

    initEditor() {
        return new Promise((resolve) => {
            require.config({ paths: { vs: "./node_modules/monaco-editor/min/vs" } });
            require(["vs/editor/editor.main"], () => {
                this.editor = monaco.editor.create(
                    document.getElementById("container"),
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

    run() {
        if (!this.editor || !this.python) {
            console.warn("準備ができていません")
            return;
        }
        const code = this.editor.getValue();
        this.python.runPython(code);
    }
}

const status = document.getElementById("status");
const terminal = document.getElementById('terminal');
const runButton = document.getElementById("run");

async function main() {
    let app = new App();
    try {
        await app.init();
        runButton.addEventListener('click', () => app.run());
        if (status) status.innerText = "準備完了"
    } catch(e) {
        console.error(e);
    }
}

main();
