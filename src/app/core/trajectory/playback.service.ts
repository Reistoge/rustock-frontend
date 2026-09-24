import { DOCUMENT } from '@angular/common';
import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';

// At 1× the whole trajectory plays in about 6 seconds (HANDOFF.md §5).
const FULL_RUN_SECONDS = 6;

export const PLAYBACK_SPEEDS = [0.5, 1, 2, 4] as const;
export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number];

// requestAnimationFrame-driven playback of one trajectory. Provided per
// viewer instance; `progress` goes from 0 (first tick) to 1 (last tick).
@Injectable()
export class PlaybackService {
  private readonly window = inject(DOCUMENT).defaultView;

  readonly progress = signal(0);
  readonly playing = signal(false);
  readonly speed = signal<PlaybackSpeed>(1);
  // True while a dialog is open or the trajectory is not ready.
  readonly suspended = signal(true);

  private readonly running = computed(() => this.playing() && !this.suspended());
  private frame: number | null = null;
  private lastTimestamp: number | null = null;

  constructor() {
    effect(() => (this.running() ? this.startLoop() : this.stopLoop()));
    inject(DestroyRef).onDestroy(() => this.stopLoop());
  }

  // New trajectory loaded: rewind and auto-play.
  restart(): void {
    this.progress.set(0);
    this.playing.set(true);
  }

  reset(): void {
    this.progress.set(0);
    this.playing.set(false);
  }

  toggle(): void {
    if (!this.playing() && this.progress() >= 1) {
      this.progress.set(0);
      this.playing.set(true);
      return;
    }
    this.playing.update((playing) => !playing);
  }

  seek(progress: number): void {
    this.progress.set(Math.min(1, Math.max(0, progress)));
    this.playing.set(false);
  }

  private startLoop(): void {
    if (this.frame !== null || !this.window) {
      return;
    }
    this.lastTimestamp = null;
    this.frame = this.window.requestAnimationFrame(this.tick);
  }

  private stopLoop(): void {
    if (this.frame !== null) {
      this.window?.cancelAnimationFrame(this.frame);
      this.frame = null;
    }
  }

  private readonly tick = (timestamp: number): void => {
    this.frame = this.window?.requestAnimationFrame(this.tick) ?? null;
    if (this.lastTimestamp === null) {
      this.lastTimestamp = timestamp;
      return;
    }
    // Clamp long gaps (background tab) so playback never jumps ahead.
    const elapsed = Math.min(0.1, (timestamp - this.lastTimestamp) / 1000);
    this.lastTimestamp = timestamp;

    const next = this.progress() + (elapsed * this.speed()) / FULL_RUN_SECONDS;
    if (next >= 1) {
      this.progress.set(1);
      this.playing.set(false);
    } else {
      this.progress.set(next);
    }
  };
}
