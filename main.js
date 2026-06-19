async () => alert('依存関係が原因で、起動時にエラーが発生する場合があります。コンソールを確認してください。')();

import { parseTmTheme } from 'https://esm.sh/monaco-themes';
import MarkdownIt from 'https://esm.sh/markdown-it@14?bundle';
import katex from 'https://esm.sh/markdown-it-katex@2';
// import highlightjs from 'https://esm.sh/markdown-it-highlightjs@4?bundle';
// import tasklist from 'https://esm.sh/markdown-it-tasklist@1bundle';
// const tasklist = require('markdown-it-tasklist');
// var taskLists = require('markdown-it-task-lists');
import taskLists from 'https://esm.sh/markdown-it-task-lists@2?bundle';

import { File } from '/file.js';

let packagesInstalledMap = {
    
}

const languages = {
    "Markdown": "markdown",
    "Python": "python",
};

const colorPaletteLight = {
    "headerBg": "#a99985",
    "headerText": "#252323",
    "rightPanelBg": "#f5f1ed",
    "rightPanelText": "#252323",
    "buttonBg": "#dad2bc",
    "buttonBorder": "#a99985",
    "inputSelectBg": "#555353",
    "inputSelectText": "#f5f1ed",
    "preBg": "#fffffe",
    "preText": "#15150F",
};
// 252323-70798c-f5f1ed-dad2bc-a99985
const colorPaletteDark = {
    "headerBg": "#675e54",
    "headerText": "#252323",
    "rightPanelBg": "#252323",
    "rightPanelText": "#f5f1ed",
    "buttonBg": "#dad2bc",
    "buttonBorder": "#a99985",
    "inputSelectBg": "#f5f1ed",
    "inputSelectText": "#555353",
    "preBg": "#15150F",
    "preText": "#fffffe",
};

const packages = {
    "matplotlib": "3.10.8",
    "numpy": "2.4.3",
    "pandas": "3.0.2",
    "requests": "2.33.1",
    "scipy": "1.17.1",
    "fastapi": "0.136.1",
    "scikit-learn": "1.8.0",
    "sympy": "1.14.0",
};

const title                 = document.getElementById("title");
const runButton             = document.getElementById("run");
const languagesSelector     = document.getElementById("languages");
const themeSelector         = document.getElementById("theme");
const fileName              = document.getElementById('fileName');
const downloadButton        = document.getElementById('download');
const searchButton          = document.getElementById('search');
const header                = document.getElementById('header');
const preparation           = document.getElementById('preparation');
const allButtons            = document.querySelectorAll('button');
const allSelects            = document.querySelectorAll('select');
const allInputs             = document.querySelectorAll('input');
const filesSelector         = document.getElementById('files');
const plotMode              = document.getElementById('plot-mode');
const rightPanel            = document.getElementById('right');
const packageInstallBtn     = document.getElementById('package-install');
const packageInstaller      = document.getElementById('package-installer');
const packagesList          = document.getElementById('packages-list');
const packageInstallSendBtn = document.getElementById('package-install-send-button');
const installerBatu         = document.getElementById('installer-batu');

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
        this.md = null;
        this.currentFile = "";
        this.plotMode = false;
        this.theme = "";
    }

    async loadConfig() {
        return await fetch('config.json');
    }

    // 登録ファイル読み込み
    async loadFiles() {
        let files = await fetch('/files/list.json');
        files = await files.json();
        files = JSON.stringify(files);
        files = JSON.parse(files);

        for (let i = 0; i < files.length; i++) {
            let fileName = files[i];
            if ((fileName) && fileName !== null && fileName !== undefined && fileName !== '') {
                if (fileName === this.currentFile) {
                    filesSelector.innerHTML += `<option value="${'/files/'+fileName}" selected>${fileName}</option>`;
                } else {
                    filesSelector.innerHTML += `<option value="${'/files/'+fileName}">${fileName}</option>`;
                }
            }
        }
    }

    async init() {
        try {
            // コンフィグ読み込み
            let config = await this.loadConfig()
            config = await config.json();
            
            // // リザルト画面のテーマ適用
            this.theme = jsonGetSafety(config, "theme", "dark", ["light", "dark"]);
            this.setTheme();

            // テーマ・言語セレクターをセット
            this.setOptions();

            // コンフィグから最新のファイル名を取得
            let currentFile = jsonGetSafety(config, "currentFile", "welcome.md", 'any');
            // もし無名だったら、もしくは拡張子が誤っていたらwelcomeドキュメントに
            if (currentFile === '' || (!currentFile.includes('.md') && !currentFile.includes('.py'))) { 
                currentFile = 'welcome.md'
            }
            let currentFilePath = '/files/' + currentFile;
            // フェッチして文字列へ
            let initialValue = (await (await fetch(currentFilePath)).text(currentFilePath)).toString();
            // もしファイルが見つからなかったらwelcomeドキュメントに
            if (!initialValue) { 
                currentFile = 'welcome.md';
                initialValue = (await (await fetch("/files/welcome.md")).text()).toString(); 
            }
            this.currentFile = currentFile;

            // モナコエディタ初期化
            await this.initEditor(initialValue, config);
            // pyodide初期化
            await this.initPython();
            
            // markdown-it初期化
            this.md = MarkdownIt({
                breaks: true,
                linkify: true
            });
            this.md.use(katex);
            // this.md.use(highlightjs);
            // this.md.use(tasklist);
            this.md.use(taskLists, {label: true, labelAfter: true});

            // 登録ファイル読み込みとセレクタ作成
            await this.loadFiles();

            // パッケージリスト
            this.setPackagesList();

            // 変更監視とHTML変換起動
            this.markdown();
            // 操作系の監視起動
            this.bootController();
        } catch (e) {
            // location.reload();
            console.error(e);
        }
    }

    async installPackage() {
        let packagesArr = Object.keys(packages);
        const targetPackageName = document.getElementById('target-package-name').value;

        if (!packagesArr.includes(targetPackageName)) {
            alert("非対応のパッケージです");
            return;
        }

        if (packagesInstalledMap[targetPackageName] === true) {
            alert("インストール済みです");
            return;
        }
    
        await this.python.loadPackage(targetPackageName);
        alert(`${targetPackageName}のインストールが完了しました`);
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
        const result = document.getElementById("result");
        result.innerText = output;
    }

    setPackagesList() {
        packagesList.innerHTML = "";
        let installed = this.python.loadedPackages;
        installed = Object.keys(installed);
        console.log(installed);

        for (let pkg in packages) {
            let status = '未インストール';
            if (installed.includes(pkg)) {
                status = 'インストール済み';
            }
            packagesInstalledMap[pkg] = (status === '未インストール') ? false : true;
            packagesList.innerHTML += `
                <option value=${pkg}>
                    ${pkg} v${packages[pkg]} - ${status}
                </option>
            `;
        }
    }

    setTheme() {
        const after = this.theme;
        // const result = document.getElementById("result");
        // const canvasPanel = document.getElementById('canvas');
        const allPres = document.querySelectorAll('pre');

        let titleColor;
        let headerBg;
        let headerText;
        // let resultBg;
        // let resultText;
        let buttonBg;
        let buttonBorder;
        let inputSelectBg;
        let inputSelectText;
        let preBg;
        let preText;
        // let canvasBg;
        let rightPanelBg;
        let rightPanelText;

        if (after === "light") {
            titleColor = "black";
            headerBg = colorPaletteLight["headerBg"];
            headerText = colorPaletteLight["headerText"];
            rightPanelBg = colorPaletteLight["rightPanelBg"];
            rightPanelText = colorPaletteLight["rightPanelText"];
            buttonBg = colorPaletteLight["buttonBg"];
            buttonBorder = colorPaletteLight["buttonBorder"];
            inputSelectBg = colorPaletteLight["inputSelectBg"];
            inputSelectText = colorPaletteLight["inputSelectText"];
            preBg = colorPaletteLight["preBg"];
            preText = colorPaletteLight["preText"];
        } else {
            titleColor = "white";
            headerBg = colorPaletteDark["headerBg"];
            headerText = colorPaletteDark["headerText"];
            rightPanelBg = colorPaletteDark["rightPanelBg"];
            rightPanelText = colorPaletteDark["rightPanelText"];
            buttonBg = colorPaletteDark["buttonBg"];
            buttonBorder = colorPaletteDark["buttonBorder"];
            inputSelectBg = colorPaletteDark["inputSelectBg"];
            inputSelectText = colorPaletteDark["inputSelectText"];
            preBg = colorPaletteDark["preBg"];
            preText = colorPaletteDark["preText"];
        }

        title.style.color = titleColor;
        header.style.backgroundColor = headerBg;
        header.style.color = rightPanelText;
        rightPanel.style.backgroundColor = rightPanelBg;
        rightPanel.style.color = rightPanelText;
        // if (result) {
        //     result.style.backgroundColor = resultBg;
        //     result.style.color = resultText;
        // }
        // if (canvasPanel) {
        //     canvasPanel.style.backgroundColor = resultBg;
        // }
        allButtons.forEach(button => {
            button.style.backgroundColor = buttonBg;
            button.style.borderColor = buttonBorder;
        });
        allSelects.forEach(select => {
            select.style.backgroundColor = inputSelectBg;
            select.style.color = inputSelectText;
        });
        allInputs.forEach(input => {
            input.style.backgroundColor = inputSelectBg;
            input.style.color = inputSelectText;
        });

        allPres.forEach(pre => {
            pre.style.backgroundColor = preBg;
            pre.style.color = preText;
        });
    }

    // pyodide初期化
    // loadPyodide { stdout }で標準入力受け取る
    async initPython() {
        try {
            this.python = await loadPyodide({
                stdout: (out) => {this.output += out+"\n"; console.log(`>> ${out}`)},
                stderr: (out) => {this.output =+ out+"\n"; console.log(`>> ${out}`)}
            });
            // await this.python.loadPackage("micropip");
            // const micropip = this.python.pyimport("micropip");
            // await micropip.install("matplotlib");
            await this.python.loadPackage("matplotlib");
            await this.python.runPythonAsync("import matplotlib");
            console.log("matplotlibインストール完了");
        } catch(e) {
            console.error(e);
        }
    }

    // monaco初期化
    async initEditor(initialValue, config) {
        const theme = jsonGetSafety(config, "theme", "dark", ["light", "dark"]);
        const language = jsonGetSafety(config, "language", "markdown", ["python", "markdown"]);

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
                this.parseMarkdown();
            });
        }
    }

    parseMarkdown() {
        const result = document.getElementById("result");
        const code = this.editor.getValue();
        const htmlContent = this.md.render(code);
        result.innerHTML = htmlContent;
    }

    // Python実行
    async run() {
        if (!this.editor || !this.python) {
            console.warn("準備ができていません")
            return;
        }
        this.outputClear();
        const code = this.editor.getValue();
        const result = this.python.runPython(code);
        const canvas = document.getElementById("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();
        console.log(canvas, canvas, ctx, img);
        img.onload = () => {
            console.log("描画開始");
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            console.log("描画完了");
        };
        img.src = "data:image/png;base64,"+result;
    }

    bootController() {
        installerBatu.addEventListener('click', () => {
            packageInstaller.style.display = 'none';
        })

        packageInstallBtn.addEventListener('click', () => {
            packageInstaller.style.display = 'block';
        })

        packageInstallSendBtn.addEventListener('click', async () => {
            await this.installPackage();
            this.setPackagesList();
        })

        plotMode.addEventListener('change', () => {
            if (plotMode.checked) {
                console.log("プロットとコンソール出力は同時に行えないため注意してください。");
                rightPanel.innerHTML = `<canvas id="canvas"></canvas>`;
                this.setTheme();
            } else {
                rightPanel.innerHTML = `<div id="result">結果はここに出力されます</div>`;
                this.setTheme();
            }
        })
        
        languagesSelector.addEventListener('change', (event) => {
            let afterLanguage = event.target.value;
            monaco.editor.setModelLanguage(this.editor.getModel(), event.target.value);
            this.language = afterLanguage;

            if (afterLanguage === 'python') {
                runButton.style.display = 'block';
            } else {
                runButton.style.display = 'none';
            }
        });

        themeSelector.addEventListener('change', (event) => {
            let after = event.target.value;
            this.theme = after;

            this.setTheme();

            if (after === "dark") {
                monaco.editor.setTheme("vs-dark");
            } else {
                monaco.editor.setTheme("vs");
            }
        });

        downloadButton.addEventListener('click', () => {
            const outFileName = fileName.value;
            const code = this.editor.getValue();
            File.download(outFileName, code);
        });

        searchButton.addEventListener('click', async() => {
            await File.search(this.editor, fileName.value);
        });

        filesSelector.addEventListener('change', (event) => {
            if (confirm("ファイルを開きますか？現在の変更は保存されません。")) {
                File.open(this.editor, event.target.value);
            }
        });
    }    
}

async function main() {
    let app = new App();
    try {
        await app.init();

        // 初期値ではonDidChangeModelContentが走らないので
        if (app.editor) {
            app.parseMarkdown();
        }

        // ロードアニメーションを隠す
        preparation.style.setProperty('display', 'none');

        runButton.addEventListener('click', () => {
            if (app.language === 'markdown') {
                app.markdown();
            } else {
                app.run();
                app.writeOutput(app.output);
            }
        });
    } catch(e) {
        console.error(e);
    }
}

main();
