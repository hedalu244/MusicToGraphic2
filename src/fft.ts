
// FFTを処理するstaticなclass
export class FFT {
    // 音量（交流実効値）を計算
    static getVolume(samples: Float32Array<ArrayBuffer>): number {
        const sum = samples.reduce((a, b) => a + b, 0);
        const average = sum / samples.length;
        const sqsum = samples.reduce((a, b) => a + b * b, 0);
        const sqaverage = sqsum / samples.length;

        return Math.sqrt(sqaverage - average * average);
    }

    // 直流成分除去
    static removeDC(samples: Float32Array<ArrayBuffer>): Float32Array<ArrayBuffer> {
        const sum = samples.reduce((a, b) => a + b);
        const average = sum / samples.length;

        return samples.map(x => x - average);
    }

    static windowing(samples: Float32Array<ArrayBuffer>): Float32Array<ArrayBuffer> {
        return samples.map((x, i) => x * (1.0 - Math.cos(2 * Math.PI * i / samples.length)) * 0.5);
    }

    static fft(_re: Float32Array<ArrayBuffer>, _im?: Float32Array<ArrayBuffer>): [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>] {
        // このアルゴリズムではインプレイスで計算するため、複製する
        if(_im === undefined) _im = _re.map(x => 0);
        const re = _re.map(x => x);
        const im = _im.map(x => x);

        if(re.length != im.length) throw new Error("length do not match");
        if(Math.log2(re.length) % 1 != 0) throw new Error("length must be 2^n");

        const n = re.length;
        let m: number, mh: number, i: number, j: number, k: number, irev: number;

        i = 0;
        for (j = 1; j < n - 1; j++) {
            for (k = n >> 1; k > (i ^= k); k >>= 1);
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
                for (k = n >> 2; k > (irev ^= k); k >>= 1);
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

    static ifft(re: Float32Array<ArrayBuffer>, im: Float32Array<ArrayBuffer>): [Float32Array<ArrayBuffer>, Float32Array<ArrayBuffer>] {
        const n = re.length;
        const [_real, _imag] = FFT.fft(re, im.map(x=>-x));
        return [_real.map(x => x / n), _imag.map(x => -x / n), ]
           
    }

    private fftConvolve(xReal: Float32Array<ArrayBuffer>, xImag: Float32Array<ArrayBuffer>, yReal: Float32Array<ArrayBuffer>, yImag: Float32Array<ArrayBuffer>): [Float32Array, Float32Array] {
        if (xReal.length < yReal.length)
            [xReal, xImag, yReal, yImag] = [yReal, yImag, xReal, xImag];
        
        const [xHatRe, xHatIm] = FFT.fft(xReal, xImag);
        const [yHatRe, yHatIm] = FFT.fft(yReal, yImag);
        const [ansRe, ansIm] = [new Float32Array(xReal.length), new Float32Array(xReal.length)];

        for (let i = 0; i < xHatRe.length && i < yHatRe.length; i++) {
            ansRe[i] = xHatRe[i] * yHatRe[i] - xHatIm[i] * yHatIm[i];
            ansIm[i] = xHatRe[i] * yHatIm[i] + xHatIm[i] * yHatRe[i];
        }

        return FFT.ifft(ansRe, ansIm);
    }

    static getMagnitudes(real: Float32Array<ArrayBuffer>, imag: Float32Array<ArrayBuffer>): Float32Array<ArrayBuffer> {
        return real.map((_, i) => Math.sqrt(real[i] * real[i] + imag[i] * imag[i]));
    }
}
