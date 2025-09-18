// Min-heap utility for numeric keys
export class MinHeap<T> {
    heap: Array<{ key: number, val: T }>
    constructor() { this.heap = [] }
    push(key: number, val: T) { this.heap.push({ key, val }); this._siftUp() }
    pop(): { key: number, val: T } | undefined { if (!this.heap.length) return undefined; const top = this.heap[0]; const last = this.heap.pop()!; if (this.heap.length) { this.heap[0] = last; this._siftDown() } return top }
    _siftUp() { let i = this.heap.length - 1; while (i > 0) { const p = Math.floor((i - 1) / 2); if (this.heap[p].key <= this.heap[i].key) break;[this.heap[p], this.heap[i]] = [this.heap[i], this.heap[p]]; i = p } }
    _siftDown() { let i = 0; const n = this.heap.length; while (true) { let l = 2 * i + 1, r = 2 * i + 2, smallest = i; if (l < n && this.heap[l].key < this.heap[smallest].key) smallest = l; if (r < n && this.heap[r].key < this.heap[smallest].key) smallest = r; if (smallest === i) break;[this.heap[i], this.heap[smallest]] = [this.heap[smallest], this.heap[i]]; i = smallest } }
}
