import { FFT } from "./fft";

export type InterpolationMode = "step" | "linear" | "spline";

// 解析結果を保持し、それにアクセスする手段を提供する
export class SingleAnalyseResult {
    private result: Float32Array<ArrayBuffer>;
    private sampleRate: number;

    constructor(result: Float32Array<ArrayBuffer>, sampleRate: number) {
        this.result = result;
        this.sampleRate = sampleRate;
    }

    get frequencyResolution() {
        return this.sampleRate / this.result.length;
    }

    get maxValidFreq() {
        return this.sampleRate / 2;
    }

    private freqToIndex(freq: number) {
        return freq / this.frequencyResolution;
    }

    private indexToFreq(index: number) {
        return index * this.frequencyResolution;
    }

    getFrequencyValue_Step(freq: number): number {
        const index = this.freqToIndex(freq);
        return this.result[Math.round(index)] | 0;
    }

    getFrequencyValue_Linear(freq: number): number {
        const index = this.freqToIndex(freq);

        // index前後のデータ
        const a = this.result[Math.floor(index)] | 0;
        const b = this.result[Math.floor(index) + 1] | 0;
        // 内分比
        const t = index - Math.floor(index);
        //線形補間
        return a + (b - a) * t;
    }

    getFrequencyValue_Spline(freq: number): number {
        const index = this.freqToIndex(freq);

        // index前後のデータ
        const aa = this.result[Math.floor(index) - 1] | 0;
        const a = this.result[Math.floor(index)] | 0;
        const b = this.result[Math.floor(index) + 1] | 0;
        const bb = this.result[Math.floor(index) + 2] | 0;
        const a_ = (b - aa) / 2; // a での傾き
        const b_ = (bb - a) / 2; // b での傾き
        // 内分比
        const t = index - Math.floor(index);
        const t2 = t * t;
        const t3 = t2 * t;
        const p = 2 * a + a_ - 2 * b + b_;
        const q = -3 * a - 2 * a_ + 3 * b - b_;
        //三次スプライン補完
        return p * t3 + q * t2 + a_ * t + a;
    }

    getFrequencyValue(freq: number, mode: InterpolationMode) {
        switch (mode) {
            case "spline":
                return this.getFrequencyValue_Spline(freq);
            case "linear":
                return this.getFrequencyValue_Linear(freq);
            case "step":
                return this.getFrequencyValue_Step(freq);
        }
    }

    // 範囲内のピークと周波数を求める
    getPeak(minFreq: number, maxFreq: number): [number, number] {
        const minIndex = Math.floor(this.freqToIndex(minFreq));
        const maxIndex = Math.ceil(this.freqToIndex(maxFreq));

        let [peakFreq, peakValue] = [minFreq, -Infinity];

        for (let i = minIndex; i <= maxIndex; i++) {
            const freq = this.indexToFreq(i);
            const value = this.result[i];
            // todo サブステップ周波数推定
            if (peakValue < value)
                if (minFreq <= freq && freq < maxFreq)
                    [peakFreq, peakValue] = [freq, value];
        }

        return [peakFreq, peakValue];
    }
}

// 一定のサンプルサイズでオーディオの周波数解析を行う
export class SingleAnalyser {
    private buffer: Float32Array<ArrayBuffer>;
    private sampleRate;

    constructor(buffer: Float32Array<ArrayBuffer>, sampleRate: number) {
        this.buffer = buffer;
        this.sampleRate = sampleRate;
    }

    // 与えられた時刻前後について、FFT解析を行い、解析結果を返す
    analyseAt(ms: number, sampleSize: number): SingleAnalyseResult {
        const centerIndex = this.msToIndex(ms);

        // centerIndexが中央になるようにサンプル区間を取る （範囲外の場合、undefinedになるはずなので||0 で0に置換）
        const samples = Float32Array.from({ length: sampleSize }).map((_, i) => this.buffer[i + centerIndex - sampleSize / 2] || 0);

        //FFTを実行
        const result = FFT.fft(FFT.windowing(FFT.removeDC(samples)));

        return new SingleAnalyseResult(FFT.getMagnitudes(...result), this.sampleRate);
    }

    // 与えられた再生時刻(ms)が何番目のサンプルか
    private msToIndex(time: number) {
        // i番目のサンプルはi～i+1までの区間を代表する（i-0.5～i+0.5とするとダウンサンプリングするとき困る）
        return Math.floor(time * this.sampleRate / 1000);
    }
    // 与えられたサンプル番号が何msめか
    private indexToMs(index: number) {
        return index / this.sampleRate * 1000;
    }
}