export interface HeapEntry<T> {
  value: T;
  priority: number;
}

interface InternalEntry<T> extends HeapEntry<T> {
  seq: number;
}

/**
 * Binary min-heap keyed by a numeric priority. Ties are broken by insertion
 * order so route reconstruction stays deterministic.
 */
export class MinPriorityQueue<T> {
  private readonly heap: InternalEntry<T>[] = [];
  private sequence = 0;

  get size(): number {
    return this.heap.length;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  push(value: T, priority: number): void {
    this.heap.push({ value, priority, seq: this.sequence++ });
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): HeapEntry<T> | undefined {
    if (this.heap.length === 0) {
      return undefined;
    }

    const top = this.heap[0];
    const last = this.heap.pop();
    if (last !== undefined && this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }
    return { value: top.value, priority: top.priority };
  }

  private isBefore(a: InternalEntry<T>, b: InternalEntry<T>): boolean {
    return a.priority !== b.priority ? a.priority < b.priority : a.seq < b.seq;
  }

  private bubbleUp(start: number): void {
    let current = start;
    while (current > 0) {
      const parent = (current - 1) >> 1;
      if (!this.isBefore(this.heap[current], this.heap[parent])) {
        break;
      }
      this.swap(current, parent);
      current = parent;
    }
  }

  private bubbleDown(start: number): void {
    let current = start;
    const length = this.heap.length;
    for (;;) {
      const left = current * 2 + 1;
      const right = left + 1;
      let smallest = current;

      if (
        left < length &&
        this.isBefore(this.heap[left], this.heap[smallest])
      ) {
        smallest = left;
      }
      if (
        right < length &&
        this.isBefore(this.heap[right], this.heap[smallest])
      ) {
        smallest = right;
      }
      if (smallest === current) {
        break;
      }
      this.swap(current, smallest);
      current = smallest;
    }
  }

  private swap(a: number, b: number): void {
    const tmp = this.heap[a];
    this.heap[a] = this.heap[b];
    this.heap[b] = tmp;
  }
}
