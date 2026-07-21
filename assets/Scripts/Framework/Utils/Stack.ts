import { _decorator } from 'cc';
export class Stack<T> {
    private items: T[];
    constructor() {
        this.items = [];
    }
    //    // 将元素推入栈顶
    Push(item: T): void {
        this.items.push(item);
    }
    //    // 弹出栈顶元素并返回该元素
    Pop(): T | undefined {
        return this.items.pop();
    }
    //    // 查看栈顶元素，不修改栈
    Peek(): T | undefined {
        return this.items[this.items.length - 1];
    }
    //    // 检查栈是否为空
    IsEmpty(): boolean {
        return this.items.length === 0;
    }
    //    // 获取栈的大小
    Size(): number {
        return this.items.length;
    }
    //    // 清空栈
    Clear(): void {
        this.items = [];
    }
}