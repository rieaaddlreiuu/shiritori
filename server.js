// server.js
import { serveDir } from "jsr:@std/http/file-server";

const wordHistories = ["しりとり"];
let index = 0;

const dictionaryText = await Deno.readTextFile(
    new URL("./dictionary/words.txt", import.meta.url),
);
const dictionaryWords = new Set(dictionaryText.split("\n").filter(Boolean));

function wordExists(word) {
    if (typeof word !== "string" || !/^[\u3041-\u3096ー]+$/u.test(word)) {
        return false;
    }

    return dictionaryWords.has(word.normalize("NFC"));
}

function MiniCharConvert(char) {
    if (char === 'ぁ') return 'あ';
    if (char === 'ぃ') return 'い';
    if (char === 'ぅ') return 'う';
    if (char === 'ぇ') return 'え';
    if (char === 'ぉ') return 'お';
    if (char === 'っ') return 'つ';
    if (char === 'ゃ') return 'や';
    if (char === 'ゅ') return 'ゆ';
    if (char === 'ょ') return 'よ';
    if (char === 'ゎ') return 'わ';
    return null;
}

/**
 * ひらがな1文字の母音を「あ・い・う・え・お」で返す。
 * 母音を持たない文字や、1文字以外の入力には null を返す。
 */
function getVowel(char) {
    if (typeof char !== "string" || [...char].length !== 1) {
        return null;
    }

    const vowelRows = {
        "あ": "あぁかがさざただなはばぱまやゃらわゎ",
        "い": "いぃきぎしじちぢにひびぴみりゐ",
        "う": "うぅくぐすずつづぬふぶぷむゆゅるゔ",
        "え": "えぇけげせぜてでねへべぺめれゑ",
        "お": "おぉこごそぞとどのほぼぽもよょろを",
    };

    for (const [vowel, row] of Object.entries(vowelRows)) {
        if (row.includes(char)) {
            return vowel;
        }
    }

    return null;
}

function sameCheck(prevWord, nextWord) {
    if (prevWord.slice(-1) === nextWord.slice(0, 1)) {
        return true;
    }
    // 終わりが小文字の場合の処理
    // 例: ぷてんふぁ -> ふぁるこん , あんこ 等を許容
    if (MiniCharConvert(prevWord.slice(-1)) != null) {
        if (nextWord.slice(0, 1) === MiniCharConvert(prevWord.slice(-1))) {
            return true;
        }
        if (prevWord.slice(-2) === nextWord.slice(0, 2)) {
            return true;
        }
    }
    // 終わりが ー の場合の処理
    // けちゃらー -> らーめん , あーめん 等を許容
    if (prevWord.slice(-1) === 'ー') {
        if (prevWord.slice(-2) === nextWord.slice(0, 2)) {
            return true;
        }
        if (nextWord.slice(0, 1) === getVowel(prevWord.slice(-2, -1))) {
            return true;
        }
    }

    return false;
}

// localhostにDenoのHTTPサーバーを展開
Deno.serve(async (_req) => {
    // パス名を取得する
    // http://localhost:8000/hoge に接続した場合"/hoge"が取得できる
    const pathname = new URL(_req.url).pathname
    console.log(`pathname: ${pathname}`);

    // GET /shiritori: 直前の単語を返す
    if (_req.method === "GET" && pathname === "/shiritori") {
        return new Response(wordHistories[index]);
    }

    // POST /shiritori: 次の単語を受け取って保存する
    if (_req.method === "POST" && pathname === "/shiritori") {
        // リクエストのペイロードを取得
        const requestJson = await _req.json();
        // JSONの中からnextWordを取得
        const nextWord = requestJson["nextWord"];

        // previousWordの末尾とnextWordの先頭が続いてるか確認
        if (!sameCheck(wordHistories[index], nextWord)) {
            return new Response(
                JSON.stringify({
                    "errorMessage": "前の単語に続いていません",
                    "errorCode": "10001"
                }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json; charset=utf-8" },
                }
            );
        }
        // 実在チェック
        if (!wordExists(nextWord)) {
            return new Response(
                JSON.stringify({
                    "errorMessage": "辞書に存在しない単語です",
                    "errorCode": "10002"
                }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json; charset=utf-8" },
                }
            );
        }

        // 同じ単語が出てないか確認
        if (wordHistories.includes(nextWord)) {
            return new Response(
                JSON.stringify({
                    "errorMessage": "同じ単語が既に存在します",
                    "errorCode": "20001"
                }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json; charset=utf-8" },
                }
            );
        }
        // 末尾が「ん」か確認
        if (nextWord.slice(-1) === "ん") {
            return new Response(
                JSON.stringify({
                    "errorMessage": "末尾が「ん」です",
                    "errorCode": "20002"
                }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json; charset=utf-8" },
                }
            );
        }
        // 全部OKであれば、previousWordを更新
        index++;
        wordHistories[index] = nextWord;
        // 現在の単語を返す
        return new Response(wordHistories[index]);
    }

    // GET /wordHistories: 単語履歴を返す
    if (_req.method === "GET" && pathname === "/wordHistories") {
        return Response.json(wordHistories);
    }

    // DELETE /wordHistories: 履歴を最初の単語だけに戻す
    if (_req.method === "DELETE" && pathname === "/wordHistories") {
        wordHistories.splice(1);
        index = 0;
        return new Response(wordHistories[index]);
    }


    // ./public以下のファイルを公開
    return serveDir(
        _req,
        {
            /*
            - fsRoot: 公開するフォルダを指定
            - urlRoot: フォルダを展開するURLを指定。今回はlocalhost:8000/に直に展開する
            - enableCors: CORSの設定を付加するか
            */
            fsRoot: "./public/",
            urlRoot: "",
            enableCors: true,
        }
    );
});
