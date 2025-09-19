import { SingleAnalyser, SingleAnalyseResult, InterpolationMode } from "./singleAnalyser";

export type AnalyseResult = SingleAnalyseResult | MultiAnalyseResult

export class MultiAnalyseResult {
    results: SingleAnalyseResult[];
    constructor(results: SingleAnalyseResult[]) {
        this.results = results;
    }

    getFrequencyValue(freq: number, mode: InterpolationMode) {
        // 周波数に対してmaxFrequencyを超えない最大のオクターブを求める
        // this.results[i].maxFrequencyはiが増えるほど小さくなる
        let i = 0;
        while ((i + 1) < this.results.length && freq < this.results[i + 1].maxValidFreq) i++;

        // 最適でないオクターブも参照して接続部を滑らかにする？
        return this.results[i].getFrequencyValue(freq, mode);
    }

    getPeak(minFreq: number, maxFreq: number): [number, number] {
        // 周波数に対してmaxFrequencyを超えない最大のオクターブを求める
        // this.results[i].maxFrequencyはiが増えるほど小さくなる
        let i = 0;
        while ((i + 1) < this.results.length && maxFreq < this.results[i + 1].maxValidFreq) i++;

        // 最適でないオクターブも参照して接続部を滑らかにする？
        return this.results[i].getPeak(minFreq, maxFreq);
    }
}

// 複数のサンプルサイズを組み合わせてオーディオの周波数解析を行う
export class MultiAnalyser {
    analysers: SingleAnalyser[];

    constructor(buffer: Float32Array<ArrayBuffer>, sampleRate: number, numOctoves: number) {
        this.analysers = [];
        for (let i = 0; i < numOctoves; i++) {
            this.analysers[i] = new SingleAnalyser(buffer, sampleRate);

            // bufferを半分にダウンサンプリング
            buffer = Float32Array.from({ length: Math.floor(buffer.length / 2) }).map((_, i) => (buffer[2 * i] + buffer[2 * i + 1]) / 2);
            // sampleRateも半分にする
            sampleRate /= 2;
        }
    }

    // 与えられた時刻前後について、FFT解析を行い、解析結果を返す
    analyseAt(ms: number, sampleSize: number): MultiAnalyseResult {
        // 各アナライザーを順次起動してOctoveAnalyseResultnに結果をまとめる
        return new MultiAnalyseResult(this.analysers.map(analyser => analyser.analyseAt(ms, sampleSize)));
    }
}