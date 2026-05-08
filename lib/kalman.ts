export class KalmanFilter {
  private R: number;
  private Q: number;
  private cov = NaN;
  private x = NaN;

  constructor({ R = 0.01, Q = 3 } = {}) {
    this.R = R;
    this.Q = Q;
  }

  filter(z: number): number {
    if (isNaN(this.x)) {
      this.x = z;
      this.cov = this.R;
    } else {
      const predCov = this.cov + this.Q;
      const K = predCov / (predCov + this.R);
      this.x = this.x + K * (z - this.x);
      this.cov = predCov - K * predCov;
    }
    return this.x;
  }

  reset() {
    this.x = NaN;
    this.cov = NaN;
  }
}
