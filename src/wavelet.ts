/*
class Morlet {
    w0: number;
    Cw: number;
    C: number;

    constructor(w0: number = 6.0) {
        this.w0 = w0;
        this.Cw = 1 / Math.sqrt(1 + Math.exp(-(w0 ** 2)) - 2 * Math.exp(-0.75 * w0 ** 2));
        this.C = this.getC();
    }

    private getC(): number {
        const wmax = 1000;
        const dw = 0.01;
        let sum = 0;
        // 要check
        for (let w = -wmax; w <= wmax; w += dw) {
            const Wf = this.getWFourier(w);
            sum += (Wf[0] ** 2 + Wf[1] ** 2) / Math.abs(w);
        }
        return 2 * Math.PI * dw * sum;
    }

    private getWFourier(w: number): [number, number] {
        const k = Math.exp(-0.5 * this.w0 ** 2);
        const Wf = this.Cw / Math.pow(Math.PI, 0.25) * (Math.exp(-0.5 * (w - this.w0) ** 2) - k * Math.exp(-0.5 * w ** 2));
        return [Wf, 0]; // Morlet の Fourier 変換は実数成分のみ
    }

    private getW(t: number): [number, number] {
        const k = Math.exp(-0.5 * this.w0 ** 2);
        const gauss = Math.exp(-0.5 * t ** 2);
        const real = this.Cw / Math.pow(Math.PI, 0.25) * gauss * (Math.cos(this.w0 * t) - k);
        const imag = this.Cw / Math.pow(Math.PI, 0.25) * gauss * Math.sin(this.w0 * t);
        return [real, imag];
    }

    // 要check
    getWArray(t: Float32Array, scale: Float32Array): [Float32Array, Float32Array] {
        const n = t.length;
        const s = scale.length;
        const real = new Float32Array(s * n);
        const imag = new Float32Array(s * n);

        for (let i = 0; i < s; i++) {
            const scaleFactor = scale[i];
            for (let j = 0; j < n; j++) {
                const [re, im] = this.getW(t[j] / scaleFactor);
                real[i * n + j] = re / Math.sqrt(scaleFactor);
                imag[i * n + j] = im / Math.sqrt(scaleFactor);
            }
        }
        return [real, imag];
    }

    freqToScale(freq: Float32Array): Float32Array {
        const w_center = this.w0 / (1 - Math.exp(-(this.w0 ** 2)));
        const scale = new Float32Array(freq.length);
        for (let i = 0; i < freq.length; i++) {
            scale[i] = w_center / (2 * Math.PI * freq[i]);
        }
        return scale;
    }
}

class CWavelet {
    fs: number;
    dt: number;
    nPerOctave: number;
    wavelet: Morlet;
    freqPeriod: Float32Array;
    scale: Float32Array;
    W?: [Float32Array, Float32Array];
    n?: Float32Array;

    constructor(fs: number, wavelet = new Morlet(), freqRange: [number, number] = [13.75, fs / 2]) {
        this.fs = fs;
        this.dt = 1 / fs;
        this.nPerOctave = 12;
        this.wavelet = wavelet;
        this.freqPeriod = this.getFreqPeriod(freqRange);
        this.scale = wavelet.freqToScale(this.freqPeriod);
    }

    private getFreqPeriod(freqRange: [number, number]): Float32Array {
        const k0 = Math.round(this.nPerOctave * Math.log2(freqRange[0] / 440));
        const kn = Math.round(this.nPerOctave * Math.log2(freqRange[1] / 440));
        const kArray = new Float32Array(kn - k0 + 1);
        for (let i = 0; i < kArray.length; i++) {
            kArray[i] = 440 * Math.pow(2, (k0 + i) / this.nPerOctave);
        }
        return kArray;
    }

    private updateW(N: number): void {
        const windowLen = 2 * N - 1;
        if (!this.W || !this.n || this.n.length !== windowLen) {
            this.n = new Float32Array(windowLen);
            for (let i = 0; i < windowLen; i++) {
                this.n[i] = (i - Math.floor(windowLen / 2)) * this.dt;
            }
            this.W = this.wavelet.getWArray(this.n, this.scale);
        }
    }

    transform(x: Float32Array): Float32Array {
        this.updateW(x.length);
        return this.fftConvolve(x, this.W!);
    }

    transformInverse(y: Float32Array): Float32Array {
        this.updateW(y.length);
        const xs = this.fftConvolve(y, this.W!);
        const coeff = 2 * Math.log(2) * this.dt / this.nPerOctave / this.wavelet.C;
        const x = new Float32Array(xs.length);
        for (let i = 0; i < xs.length; i++) {
            x[i] = coeff * xs[i];
        }
        return x;
    }
}

*/
