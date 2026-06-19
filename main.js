(async () => {
    alert('依存関係が原因で、起動時にエラーが発生する可能性があります。コンソールを確認してください。\n\n Uncaught TypeError: Property description must be an object: undefined at defineProperty (<anonymous>)\n\nというエラーです。')
})();

import { parseTmTheme } from 'https://esm.sh/monaco-themes';
import MarkdownIt from 'https://esm.sh/markdown-it@14?bundle';
import katex from 'https://esm.sh/markdown-it-katex@2';
import taskLists from 'https://esm.sh/markdown-it-task-lists@2?bundle';

import { File } from '/file.js';

let packagesInstalledMap = {};

// 提供するシンタックスハイライト
const languages = {
    "Markdown": "markdown",
    "Python": "python",
};

// ライトテーマのカラーパレット
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

// ダークテーマのカラーパレット
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

// Pyodideの対応しているパッケージ群
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

// --- getElement ---
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
const loadText              = document.getElementById('load-text');

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

    // コンフィグファイルを読むだけ
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

    // 初期化
    async init() {
        try {
            // コンフィグ読み込み
            loadText.innerText = 'コンフィグを読み込もう...';
            let config = await this.loadConfig();
            config = await config.json();
            
            // テーマ適用
            loadText.innerText = 'テーマを適用しよう...';
            this.theme = jsonGetSafety(config, "theme", "dark", ["light", "dark"]);
            this.setTheme();

            // コンフィグから最新のファイル名を取得
            loadText.innerText = 'コンフィグからファイル名を見つけないと...';
            let currentFile = jsonGetSafety(config, "currentFile", "welcome.md", 'any');
            // もし無名だったら、もしくは拡張子が誤っていたらwelcomeドキュメントに
            if (currentFile === '' || (!currentFile.includes('.md') && !currentFile.includes('.py'))) { 
                loadText.innerText = '変なファイル名...';
                currentFile = 'welcome.md'
            }
            let currentFilePath = '/files/' + currentFile;
            // フェッチして文字列へ
            loadText.innerText = 'ファイルの内容を読もう...';
            let initialValue = (await (await fetch(currentFilePath)).text(currentFilePath)).toString();
            // もしファイルが見つからなかったらwelcomeドキュメントに
            if (!initialValue) { 
                loadText.innerText = 'ファイルが見つからなかった...';
                currentFile = 'welcome.md';
                initialValue = (await (await fetch("/files/welcome.md")).text()).toString(); 
            }
            this.currentFile = currentFile;

            // テーマ・言語セレクターをセット
            loadText.innerText = 'セレクターをセットしよう...';
            let initialLanguage = (currentFile.includes(".md") ? "Markdown" : "Python");
            this.setLanguages(initialLanguage);

            if (initialLanguage === 'Python') {
                runButton.style.display = 'block';
            } else {
                runButton.style.display = 'none';
            }

            // モナコエディタ初期化
            loadText.innerText = 'エディタを初期化しよう...';
            await this.initEditor(initialValue, config);
            // pyodide初期化
            loadText.innerText = 'Pythonエンジンを初期化しよう...';
            await this.initPython();
            
            // markdown-it初期化
            loadText.innerText = 'Markdownエンジンを初期化しよう...';
            this.md = MarkdownIt({
                breaks: true,
                linkify: true
            });
            loadText.innerText = 'LaTeXを使えるようにしよう...';
            this.md.use(katex);
            
            loadText.innerText = 'チェックリストを使えるようにしよう...';
            this.md.use(taskLists, {label: true, labelAfter: true});

            // 登録ファイル読み込みとセレクタ作成
            loadText.innerText = 'ファイルは何があるんだろう？...';
            await this.loadFiles();

            // パッケージリスト
            loadText.innerText = '使えるパッケージを選べるようにしよう...';
            this.setPackagesList();

            // 変更監視とHTML変換起動
            loadText.innerText = 'Markdownエンジンを起動しよう...';
            this.markdown();
            // 操作系の監視起動
            loadText.innerText = 'addEventListenerを登録しないと...';
            this.bootController();

            loadText.innerText = '終わったー';
        } catch (e) {
            console.error(e);
        }
    }

    // パッケージをインストールする
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

    setLanguages(defaultLang) {
        for (const language in languages) {
            if (language === defaultLang) {
                languagesSelector.innerHTML += `<option value="${languages[language]}" selected>${language}</option>`;
            } else {
                languagesSelector.innerHTML += `<option value="${languages[language]}">${language}</option>`;
            }
        }
    }

    outputClear() {
        this.output = "";
        this.errOutput = "";
    }

    // リザルト画面に標準出力を書き込み
    writeOutput(output) {
        const result = document.getElementById("result");
        result.innerText = output;
    }

    // パッケージのセレクターなど
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
        const allPres = document.querySelectorAll('pre');

        let titleColor;
        let headerBg;
        let headerText;
        let buttonBg;
        let buttonBorder;
        let inputSelectBg;
        let inputSelectText;
        let preBg;
        let preText;
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
            loadText.innerText = 'matplotlibだけ入れておこう...';
            await this.python.loadPackage("matplotlib");
            
            loadText.innerText = 'matplotlibだけ先にimportしておこう...';
            await this.python.runPythonAsync("import matplotlib");
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

    // エディタ監視とMarkdownパース呼び出し
    markdown() {
        if (this.editor) {
            this.editor.onDidChangeModelContent((event) => {
                this.parseMarkdown();
            });
        }
    }

    // Markdownパース
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

        // --- plot ---
        if (this.plotMode) {
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
    }

    // ボタン等のイベントリスナーをセット
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
            this.plotMode = plotMode.checked;
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
