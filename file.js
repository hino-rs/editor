// ファイル操作関係

export class File {
    // ファイル名をパスに加工
    static toPath(fileName) {
        return '/files/'+fileName;
    }

    // ファイルを読み取ってコードエディタに入れる
    static async open(editor, path) {
        let code = (await (await fetch(path)).text(path)).toString();
        editor.setValue(code);
    }

    // ファイル検索
    static async search(editor, fileName) {
        if (fileName === '' || fileName === undefined || fileName === null) { alert("ファイル名が空です。"); return; }
        const path = '/files/'+fileName;

        try {
            const response = fetch(path);
            response.then(
                (result) => {
                    if (result.ok) {
                        if (confirm("ファイルが見つかりました。開きますか？")) {
                            this.open(editor, path);
                        }
                    } else {
                        alert("ファイルが見つかりませんでした。")
                    }
                }
            )
        } catch(e) {
            alert("検索に失敗しました: "+e);
        }
    }

    // ダウンロードボ
    static download(outFileName, code) {
        if (!(outFileName.includes('.py') || outFileName.includes('.md'))) {
            console.log("ファイル拡張子は .pyか.mdにしてください");
            return;
        }
        
        const blob = new Blob([code], { 'type': 'text/plain' })
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = outFileName;
        link.click();
    }
}
