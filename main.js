import { micromark } from 'https://esm.sh/micromark@4?bundle';
import { gfmTable, gfmTableHtml } from 'https://esm.sh/micromark-extension-gfm-table@2?bundle';
import { parseTmTheme } from 'https://esm.sh/monaco-themes';

import { File } from '/file.js';

const languages = {
    "Markdown": "markdown",
    "Python3": "python",
};

const runButton         = document.getElementById("run");
const result            = document.getElementById("result");
const status            = document.getElementById("status");
const languagesSelector = document.getElementById("languages");
const themeSelector     = document.getElementById("theme");
const fileName          = document.getElementById('fileName');
const exportButton      = document.getElementById('export');
const saveButton        = document.getElementById('save');
const searchButton      = document.getElementById('search');

// unwrap_or的な
function jsonGetSafety(
    json,        // もと
    key,         // キー
    defaultData, // キーがjsonに無かった場合の値
    ideals,      // 期待する値の配列 もしくは 'any'で期待値指定なし
) {
    const value = json[key];

    if (ideals === undefined) {
        return defaultData;
    }

    if (ideals !== 'any') {
        if (value === undefined || !(ideals.includes(value))) {
            return defaultData;
        } else {
            return value;
        }
    } else {
        return value;
    }
}

class App {
    constructor() {
        this.language = ""
        this.python = null;
        this.editor = null;
        this.output = "";
        this.errOutput = "";
    }

    async loadConfig() {
        return await fetch('config.json');
    }

    async init() {
        try {
            // コンフィグ読み込み
            let config = await this.loadConfig()
            config = await config.json();
            
            // リザルト画面のテーマ適用
            this.changeTheme(jsonGetSafety(config, "theme", "dark", ["light", "dark"]));

            // テーマ・言語セレクターをセット
            this.setOptions();

            // コンフィグから最新のファイル名を取得
            let currentFile = jsonGetSafety(config, "currentFile", "/files/welcome.md", 'any');
            // もし無名だったら、もしくは拡張子が誤っていたらwelcomeドキュメントに
            if (currentFile === '' || !currentFile.includes('.md') || !currentFile.includes('.py')) { currentFile = '/files/welcome.md' }
            // フェッチして文字列へ
            let initialValue = (await (await fetch(currentFile)).text(currentFile)).toString();
            // もしファイルが見つからなかったらwelcomeドキュメントに
            if (!initialValue) { initialValue = (await (await fetch("/files/welcome.md")).text()).toString(); }
            
            // モナコエディタ初期化
            await this.initEditor(initialValue, config);
            // pyodide初期化
            await this.initPython();
            
            // 変更監視とHTML変換起動
            this.markdown();
            // 操作系の監視起動
            this.bootController();

            status.innerText = "準備完了";
        } catch (e) {
            // location.reload();
            console.error(e);
        }
    }

    setOptions() {
        for (const language in languages) {
            languagesSelector.innerHTML += `<option value="${languages[language]}">${language}</option>`;
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
    async initEditor(initialValue, config) {
        const theme = jsonGetSafety(config, "theme", "dark", ["light", "dark"]);
        const language = jsonGetSafety(config, "language", "markdown", ["python", "markdown"]);
        
        console.log(theme, language)

        return new Promise((resolve, reject) => {
            require.config({ paths: { vs: "./node_modules/monaco-editor/min/vs" } });
            require(["vs/editor/editor.main"], () => {
                this.editor = monaco.editor.create(
                    document.getElementById("code-editor"),
                    {
                        value: initialValue,
                        language: language,
                        theme: (theme === "light") ? "vs" : "vs-dark",
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

    bootController() {
        languagesSelector.addEventListener('change', (event) => {
            let afterLanguage = event.target.value;
            monaco.editor.setModelLanguage(this.editor.getModel(), event.target.value);
            this.language = afterLanguage;

            if (afterLanguage === 'python') {
                // TODO
            }
        });

        themeSelector.addEventListener('change', (event) => {
            console.log(event.target.value);

            let after = event.target.value;

            let bgColor = "#F0F0E0";
            let textColor = "#303030";

            if (after === "dark") {
                [bgColor, textColor] = [textColor, bgColor];
                monaco.editor.setTheme("vs-dark");
            } else {
                monaco.editor.setTheme("vs");
            }

            result.style.setProperty("background-color", bgColor);
            result.style.setProperty("color", textColor);
        });

        exportButton.addEventListener('click', () => {
            const outFileName = fileName.value;
            const code = this.editor.getValue();
            File.export(outFileName, code);
        });

        saveButton.addEventListener('click', () => {
            File.save();
        });

        searchButton.addEventListener('click', async() => {
            await File.search(this.editor, fileName.value);
        });    
    }    
}

async function main() {
    let app = new App();
    try {
        await app.init();
        app.bootController();

        // 初期値ではonDidChangeModelContentが走らないので
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
