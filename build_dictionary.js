const sourcePaths = [
    new URL("./dictionary/jmdict-all-3.6.2.json", import.meta.url),
    new URL("./dictionary/jmnedict-all-3.6.2.json", import.meta.url),
];
const outputPath = new URL("./dictionary/words.txt", import.meta.url);
const words = new Set();

function toHiragana(text) {
    return text.normalize("NFC").replace(/[\u30a1-\u30f6]/g, (char) =>
        String.fromCharCode(char.charCodeAt(0) - 0x60)
    );
}

for (const path of sourcePaths) {
    console.log(`Reading ${path.pathname} ...`);
    const dictionary = JSON.parse(await Deno.readTextFile(path));

    for (const entry of dictionary.words) {
        for (const kana of entry.kana) {
            const word = toHiragana(kana.text);
            if (/^[\u3041-\u3096ー]+$/u.test(word)) {
                words.add(word);
            }
        }
    }
}

const contents = `${[...words].sort().join("\n")}\n`;
await Deno.writeTextFile(outputPath, contents);
console.log(`Wrote ${words.size} words to ${outputPath.pathname}`);
