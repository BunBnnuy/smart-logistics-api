import { MinPriorityQueue } from './priority-queue';

describe('MinPriorityQueue', () => {
  it('pops values in ascending priority order', () => {
    const queue = new MinPriorityQueue<string>();
    queue.push('c', 3);
    queue.push('a', 1);
    queue.push('b', 2);

    expect(queue.pop()).toEqual({ value: 'a', priority: 1 });
    expect(queue.pop()).toEqual({ value: 'b', priority: 2 });
    expect(queue.pop()).toEqual({ value: 'c', priority: 3 });
    expect(queue.pop()).toBeUndefined();
  });

  it('breaks ties by insertion order', () => {
    const queue = new MinPriorityQueue<string>();
    queue.push('first', 1);
    queue.push('second', 1);

    expect(queue.pop()?.value).toBe('first');
    expect(queue.pop()?.value).toBe('second');
  });

  it('reports size and emptiness', () => {
    const queue = new MinPriorityQueue<number>();
    expect(queue.isEmpty()).toBe(true);

    queue.push(42, 0);
    expect(queue.isEmpty()).toBe(false);
    expect(queue.size).toBe(1);

    queue.pop();
    expect(queue.isEmpty()).toBe(true);
  });

  it('keeps the heap ordered across a shuffled set', () => {
    const queue = new MinPriorityQueue<number>();
    const values = [5, 3, 8, 1, 9, 2, 7, 4, 6, 0];
    for (const value of values) {
      queue.push(value, value);
    }

    const popped: number[] = [];
    let entry = queue.pop();
    while (entry !== undefined) {
      popped.push(entry.value);
      entry = queue.pop();
    }

    expect(popped).toEqual([...values].sort((a, b) => a - b));
  });
});
