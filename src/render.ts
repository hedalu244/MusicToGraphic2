import { AnalyseResult } from "./multiAnalyszer";

import type p5_ from "p5"; // インスタンスの型名はp5だと↓と被るのでズラす
declare const p5: typeof p5_; // 外部で値としてのp5が実装されていることを宣言

/**
 * @param freq 周波数
 * @returns A0を0として、12平均律で何番目の音階か 小数を含む
 */
function freqToTone(freq: number) {
    return Math.log2(freq / 27.5) * 12;
}
/**
 * @param tone A0を0とした音階インデックス
 * @returns 周波数（12平均律）
 */
function toneToFreq(tone: number) {
    return Math.pow(2, tone / 12) * 27.5;
}
/**
 * 
 * @param tone A0を0とした音階インデックス
 * @returns 階名（A0, A#0, B0, C1, C#1...）
 */

function toneToTonename(tone: number) {
    tone = Math.round(tone);
    const octove = Math.floor((tone + 9) / 12);
    const toneName = ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"][tone % 12]
    return toneName + octove;
}

export function tonalAnalyze(result: AnalyseResult) {
    const ans = Array.from({ length: 88 }).fill(0).map(x => 0);
    for (let tone = 0; tone < 88; tone++) {
        const minFreq = toneToFreq(tone - 0.5);
        const maxFreq = toneToFreq(tone + 0.5);
        const [peak, value] = result.getPeak(minFreq, maxFreq);
        ans[tone % 12] += value;
    }
    return ans;
}

export function transitionAnalyse(result1: AnalyseResult, result2: AnalyseResult) {
    const values1 = tonalAnalyze(result1);
    const values2 = tonalAnalyze(result2);

    const increase = values1.map((x, i) => Math.max(0, values2[i] - values1[i]));
    const decrease = values1.map((x, i) => Math.max(0, values1[i] - values2[i]));

    const transition = decrease.map(x => increase.map(y => x * y));
    transition.forEach((row, i) => row.forEach((data, j) => { accumTransition[i][j] += data }));
    accumCount++;

    // 百ます計算
    return decrease.map(x => increase.map(y => x * y));
}

export function drawTonalGrayscale(p: p5_, x: number, result: AnalyseResult) {
    const tonalValues = tonalAnalyze(result);

    p.push();
    for (let tone = 0; tone < 88; tone++) {
        const toneName = toneToTonename(tone);
        const brightness = tonalValues[tone] * 100;
        p.fill(brightness);
        p.noStroke();
        p.text(toneName, x, 940 - tone * 10);
    }
    p.pop();
}

export function drawMatrixHeatmap(p: p5_, matrix: number[][], x: number, y: number, size: number, gain: number) {
    p.push();
    p.noStroke();
    matrix.forEach((row, i) => row.forEach((data, j) => {
        const brightness = data * gain;
        p.fill(brightness);
        p.rect(x + i * size, y + j * size, size, size);
    }));
    p.pop();
}

let accumTransition: number[][] = Array.from({ length: 88 }).fill(0).map(x => Array.from({ length: 88 }).fill(0).map(x => 0));
let accumCount = 0;

export function drawTransition(p: p5_, result1: AnalyseResult, result2: AnalyseResult) {
    p.push();
    const x1 = 100;
    const x2 = 700;
    drawTonalGrayscale(p, x1, result1);
    drawTonalGrayscale(p, x2, result2);

    p.blendMode(p.ADD);

    const transition = transitionAnalyse(result1, result2);
    for (let tone1 = 0; tone1 < 88; tone1++) {
        for (let tone2 = 0; tone2 < 88; tone2++) {
            const brightness = transition[tone1][tone2] * 100;

            p.noFill();
            p.stroke(brightness);
            p.line(x1 + 50, 940 - tone1 * 10, x2, 940 - tone2 * 10);
        }
    }

    const accumMax = Math.max(...accumTransition.map(x => Math.max(...x)));
    drawMatrixHeatmap(p, accumTransition, 1800, 940, -10, 255 / accumMax);

    p.pop();
}


export function drawSpectrum(p: p5_, x: number, result: AnalyseResult) {
    p.push();

    p.noFill();
    p.stroke(255);
    p.beginShape();

    for (let freq = 55; freq < 24000; freq += 1) {
        const value = result.getFrequencyValue(freq, "spline") * 30;
        const tone = freqToTone(freq);
        p.vertex(x + value, tone * 10);
    }

    p.endShape();

    p.pop();
}

export function drawSpectrumGrayscale(p: p5_, x: number, result: AnalyseResult) {
    p.push();
    for (let y = 0; y < 1000; y += 1) {
        const tone = (1000 - y) / 10 - 12;
        const freq = toneToFreq(tone);
        const value = result.getFrequencyValue(freq, "spline");
        const brightness = value * 30;
        p.stroke(brightness);

        p.point(x, y);
    }
    p.pop();
}