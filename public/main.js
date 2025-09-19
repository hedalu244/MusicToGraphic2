"use strict";
(() => {
  // src/fft.ts
  var FFT = class _FFT {
    // 音量（交流実効値）を計算
    static getVolume(samples) {
      const sum = samples.reduce((a, b) => a + b, 0);
      const average = sum / samples.length;
      const sqsum = samples.reduce((a, b) => a + b * b, 0);
      const sqaverage = sqsum / samples.length;
      return Math.sqrt(sqaverage - average * average);
    }
    // 直流成分除去
    static removeDC(samples) {
      const sum = samples.reduce((a, b) => a + b);
      const average = sum / samples.length;
      return samples.map((x2) => x2 - average);
    }
    static windowing(samples) {
      return samples.map((x2, i) => x2 * (1 - Math.cos(2 * Math.PI * i / samples.length)) * 0.5);
    }
    static fft(_re, _im) {
      if (_im === void 0) _im = _re.map((x2) => 0);
      const re = _re.map((x2) => x2);
      const im = _im.map((x2) => x2);
      if (re.length != im.length) throw new Error("length do not match");
      if (Math.log2(re.length) % 1 != 0) throw new Error("length must be 2^n");
      const n = re.length;
      let m, mh, i, j, k, irev;
      i = 0;
      for (j = 1; j < n - 1; j++) {
        for (k = n >> 1; k > (i ^= k); k >>= 1) ;
        if (j < i) {
          const xr = re[j];
          const xi = im[j];
          re[j] = re[i];
          im[j] = im[i];
          re[i] = xr;
          im[i] = xi;
        }
      }
      for (mh = 1; (m = mh << 1) <= n; mh = m) {
        irev = 0;
        for (i = 0; i < n; i += m) {
          const wr = Math.cos(2 * Math.PI * irev / n);
          const wi = Math.sin(2 * Math.PI * irev / n);
          for (k = n >> 2; k > (irev ^= k); k >>= 1) ;
          for (j = i; j < mh + i; j++) {
            k = j + mh;
            const xr = re[j] - re[k];
            const xi = im[j] - im[k];
            re[j] += re[k];
            im[j] += im[k];
            re[k] = wr * xr - wi * xi;
            im[k] = wr * xi + wi * xr;
          }
        }
      }
      return [re, im];
    }
    static ifft(re, im) {
      const n = re.length;
      const [_real, _imag] = _FFT.fft(re, im.map((x2) => -x2));
      return [_real.map((x2) => x2 / n), _imag.map((x2) => -x2 / n)];
    }
    fftConvolve(xReal, xImag, yReal, yImag) {
      if (xReal.length < yReal.length)
        [xReal, xImag, yReal, yImag] = [yReal, yImag, xReal, xImag];
      const [xHatRe, xHatIm] = _FFT.fft(xReal, xImag);
      const [yHatRe, yHatIm] = _FFT.fft(yReal, yImag);
      const [ansRe, ansIm] = [new Float32Array(xReal.length), new Float32Array(xReal.length)];
      for (let i = 0; i < xHatRe.length && i < yHatRe.length; i++) {
        ansRe[i] = xHatRe[i] * yHatRe[i] - xHatIm[i] * yHatIm[i];
        ansIm[i] = xHatRe[i] * yHatIm[i] + xHatIm[i] * yHatRe[i];
      }
      return _FFT.ifft(ansRe, ansIm);
    }
    static getMagnitudes(real, imag) {
      return real.map((_, i) => Math.sqrt(real[i] * real[i] + imag[i] * imag[i]));
    }
  };

  // src/singleAnalyser.ts
  var SingleAnalyseResult = class {
    constructor(result, sampleRate) {
      this.result = result;
      this.sampleRate = sampleRate;
    }
    get frequencyResolution() {
      return this.sampleRate / this.result.length;
    }
    get maxValidFreq() {
      return this.sampleRate / 2;
    }
    freqToIndex(freq) {
      return freq / this.frequencyResolution;
    }
    indexToFreq(index) {
      return index * this.frequencyResolution;
    }
    getFrequencyValue_Step(freq) {
      const index = this.freqToIndex(freq);
      return this.result[Math.round(index)] | 0;
    }
    getFrequencyValue_Linear(freq) {
      const index = this.freqToIndex(freq);
      const a = this.result[Math.floor(index)] | 0;
      const b = this.result[Math.floor(index) + 1] | 0;
      const t = index - Math.floor(index);
      return a + (b - a) * t;
    }
    getFrequencyValue_Spline(freq) {
      const index = this.freqToIndex(freq);
      const aa = this.result[Math.floor(index) - 1] | 0;
      const a = this.result[Math.floor(index)] | 0;
      const b = this.result[Math.floor(index) + 1] | 0;
      const bb = this.result[Math.floor(index) + 2] | 0;
      const a_ = (b - aa) / 2;
      const b_ = (bb - a) / 2;
      const t = index - Math.floor(index);
      const t2 = t * t;
      const t3 = t2 * t;
      const p = 2 * a + a_ - 2 * b + b_;
      const q = -3 * a - 2 * a_ + 3 * b - b_;
      return p * t3 + q * t2 + a_ * t + a;
    }
    getFrequencyValue(freq, mode) {
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
    getPeak(minFreq, maxFreq) {
      const minIndex = Math.floor(this.freqToIndex(minFreq));
      const maxIndex = Math.ceil(this.freqToIndex(maxFreq));
      let [peakFreq, peakValue] = [minFreq, -Infinity];
      for (let i = minIndex; i <= maxIndex; i++) {
        const freq = this.indexToFreq(i);
        const value = this.result[i];
        if (peakValue < value) {
          if (minFreq <= freq && freq < maxFreq)
            [peakFreq, peakValue] = [freq, value];
        }
      }
      return [peakFreq, peakValue];
    }
  };
  var SingleAnalyser = class {
    constructor(buffer, sampleRate) {
      this.buffer = buffer;
      this.sampleRate = sampleRate;
    }
    // 与えられた時刻前後について、FFT解析を行い、解析結果を返す
    analyseAt(ms, sampleSize) {
      const centerIndex = this.msToIndex(ms);
      const samples = Float32Array.from({ length: sampleSize }).map((_, i) => this.buffer[i + centerIndex - sampleSize / 2] || 0);
      const result = FFT.fft(FFT.windowing(FFT.removeDC(samples)));
      return new SingleAnalyseResult(FFT.getMagnitudes(...result), this.sampleRate);
    }
    // 与えられた再生時刻(ms)が何番目のサンプルか
    msToIndex(time) {
      return Math.floor(time * this.sampleRate / 1e3);
    }
    // 与えられたサンプル番号が何msめか
    indexToMs(index) {
      return index / this.sampleRate * 1e3;
    }
  };

  // src/multiAnalyszer.ts
  var MultiAnalyseResult = class {
    constructor(results) {
      this.results = results;
    }
    getFrequencyValue(freq, mode) {
      let i = 0;
      while (i + 1 < this.results.length && freq < this.results[i + 1].maxValidFreq) i++;
      return this.results[i].getFrequencyValue(freq, mode);
    }
    getPeak(minFreq, maxFreq) {
      let i = 0;
      while (i + 1 < this.results.length && maxFreq < this.results[i + 1].maxValidFreq) i++;
      return this.results[i].getPeak(minFreq, maxFreq);
    }
  };
  var MultiAnalyser = class {
    constructor(buffer, sampleRate, numOctoves) {
      this.analysers = [];
      for (let i = 0; i < numOctoves; i++) {
        this.analysers[i] = new SingleAnalyser(buffer, sampleRate);
        buffer = Float32Array.from({ length: Math.floor(buffer.length / 2) }).map((_, i2) => (buffer[2 * i2] + buffer[2 * i2 + 1]) / 2);
        sampleRate /= 2;
      }
    }
    // 与えられた時刻前後について、FFT解析を行い、解析結果を返す
    analyseAt(ms, sampleSize) {
      return new MultiAnalyseResult(this.analysers.map((analyser) => analyser.analyseAt(ms, sampleSize)));
    }
  };

  // src/load_sound.ts
  var audioBuffer = null;
  var channelData = null;
  var singleAnalyser = null;
  var octoveAnalyzer = null;
  var playStartTime = 0;
  document.getElementById("file")?.addEventListener("change", async (e) => {
    const input = e.target;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const audioContext = new AudioContext();
    const fileReader = new FileReader();
    fileReader.readAsArrayBuffer(file);
    fileReader.onload = async () => {
      audioBuffer = await audioContext.decodeAudioData(fileReader.result);
      channelData = audioBuffer.getChannelData(0);
      singleAnalyser = new SingleAnalyser(channelData, audioBuffer.sampleRate);
      octoveAnalyzer = new MultiAnalyser(channelData, audioBuffer.sampleRate, 8);
      const source = audioContext.createBufferSource();
      const gainNode = audioContext.createGain();
      source.buffer = audioBuffer;
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      source.start();
      playStartTime = performance.now();
      source.addEventListener("ended", () => {
        singleAnalyser = null;
        octoveAnalyzer = null;
        channelData = null;
      });
    };
  });

  // src/render.ts
  function toneToFreq(tone) {
    return Math.pow(2, tone / 12) * 27.5;
  }
  function toneToTonename(tone) {
    tone = Math.round(tone);
    const octove = Math.floor((tone + 9) / 12);
    const toneName = ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"][tone % 12];
    return toneName + octove;
  }
  function tonalAnalyze(result) {
    const ans = Array.from({ length: 88 }).fill(0).map((x2) => 0);
    for (let tone = 0; tone < 88; tone++) {
      const minFreq = toneToFreq(tone - 0.5);
      const maxFreq = toneToFreq(tone + 0.5);
      const [peak, value] = result.getPeak(minFreq, maxFreq);
      ans[tone % 12] += value;
    }
    return ans;
  }
  function transitionAnalyse(result1, result2) {
    const values1 = tonalAnalyze(result1);
    const values2 = tonalAnalyze(result2);
    const increase = values1.map((x2, i) => Math.max(0, values2[i] - values1[i]));
    const decrease = values1.map((x2, i) => Math.max(0, values1[i] - values2[i]));
    const transition = decrease.map((x2) => increase.map((y) => x2 * y));
    transition.forEach((row, i) => row.forEach((data, j) => {
      accumTransition[i][j] += data;
    }));
    accumCount++;
    return decrease.map((x2) => increase.map((y) => x2 * y));
  }
  function drawTonalGrayscale(p, x2, result) {
    const tonalValues = tonalAnalyze(result);
    p.push();
    for (let tone = 0; tone < 88; tone++) {
      const toneName = toneToTonename(tone);
      const brightness = tonalValues[tone] * 100;
      p.fill(brightness);
      p.noStroke();
      p.text(toneName, x2, 940 - tone * 10);
    }
    p.pop();
  }
  function drawMatrixHeatmap(p, matrix, x2, y, size, gain) {
    p.push();
    p.noStroke();
    matrix.forEach((row, i) => row.forEach((data, j) => {
      const brightness = data * gain;
      p.fill(brightness);
      p.rect(x2 + i * size, y + j * size, size, size);
    }));
    p.pop();
  }
  var accumTransition = Array.from({ length: 88 }).fill(0).map((x2) => Array.from({ length: 88 }).fill(0).map((x3) => 0));
  var accumCount = 0;
  function drawTransition(p, result1, result2) {
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
    const accumMax = Math.max(...accumTransition.map((x3) => Math.max(...x3)));
    drawMatrixHeatmap(p, accumTransition, 1800, 940, -10, 255 / accumMax);
    p.pop();
  }
  function drawSpectrumGrayscale(p, x2, result) {
    p.push();
    for (let y = 0; y < 1e3; y += 1) {
      const tone = (1e3 - y) / 10 - 12;
      const freq = toneToFreq(tone);
      const value = result.getFrequencyValue(freq, "spline");
      const brightness = value * 30;
      p.stroke(brightness);
      p.point(x2, y);
    }
    p.pop();
  }

  // src/main.ts
  var x = 100;
  var sketch = (p52) => {
    p52.setup = () => {
      p52.createCanvas(1920, 1080);
      p52.background(0, 0, 0);
      p52.frameRate(60);
    };
    p52.draw = () => {
      if (!audioBuffer || !singleAnalyser || !octoveAnalyzer) return;
      const result = octoveAnalyzer.analyseAt(performance.now() - playStartTime, 256);
      const result2 = octoveAnalyzer.analyseAt(performance.now() - playStartTime + 250, 256);
      p52.background(0);
      drawTransition(p52, result, result2);
      drawTonalGrayscale(p52, 10, result);
      drawSpectrumGrayscale(p52, x, result);
    };
  };
  new p5(sketch);
})();
//# sourceMappingURL=main.js.map
