import { SingleAnalyser } from "./singleAnalyser";
import { MultiAnalyser } from "./multiAnalyszer";

export let audioBuffer: AudioBuffer | null = null;
export let channelData: Float32Array<ArrayBuffer> | null = null;
export let singleAnalyser: SingleAnalyser | null = null;
export let octoveAnalyzer: MultiAnalyser | null = null;

let playStartTime = 0;
export function getPlayTime() { return performance.now() - playStartTime; }

document.getElementById("file")?.addEventListener("change", async (e) => {
    const input = e.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const audioContext = new AudioContext();
    const fileReader = new FileReader();

    fileReader.readAsArrayBuffer(file);
    fileReader.onload = async () => {
        // 事前解析器の準備
        audioBuffer = await audioContext.decodeAudioData(fileReader.result as ArrayBuffer);
        channelData = audioBuffer.getChannelData(0);
        singleAnalyser = new SingleAnalyser(channelData, audioBuffer.sampleRate);
        octoveAnalyzer = new MultiAnalyser(channelData, audioBuffer.sampleRate, 8);

        // オーディオコンテクストを構成して再生
        const source = audioContext.createBufferSource();
        const gainNode = audioContext.createGain();

        source.buffer = audioBuffer;
        source.connect(gainNode);
        gainNode.connect(audioContext.destination)
        source.start();
        playStartTime = performance.now();

        source.addEventListener("ended", () => {
            singleAnalyser = null;
            octoveAnalyzer = null;
            channelData = null;
        })
    };
});