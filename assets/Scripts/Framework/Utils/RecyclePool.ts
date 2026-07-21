/**
 * 用于使用节点池的节点所绑定脚本组件实现
 */
/** 回收前调用 */
/** 取出前调用 */
/**
 * 节点池
 */

import { _decorator, Node, Component, warn, error } from 'cc';
export interface RecycleNode {
    unuse(): void;
    reuse(): void;
}

export default class RecyclePool {
    /** 以url标记的节点池 */
    private static _urlMap: Map<string, Node[]> = new Map();
    /** 以cccomponent标记的节点池，需要实现接口RecycleNode */
    private static _cmptMap: Map<{ prototype: Component }, Node[]> = new Map();
    /** 单个节点池的最大节点数量 */
    public static limit: number = 512;
    /**
     * 获取节点池中节点数量
     */
    public static size(key: string | { prototype: Component }): number {
        let list = typeof key === "string" ? this._urlMap.get(key) : this._cmptMap.get(key);
        if (list === undefined) {
            return 0;
        }

        return list.length;
    }
    /**
     * 清空节点
     */
    public static clear(key: string | { prototype: Component }): void {
        if (typeof key === "string") {
            let list = this._urlMap.get(key);
            if (list === undefined) {
                return;
            }

            let count = list.length;
            for (let i = 0; i < count; ++i) {
                list[i].destroy();
            }
            list.length = 0;
            this._urlMap.delete(key);
        } else {
            let list = this._cmptMap.get(key);
            if (list === undefined) {
                return;
            }

            let count = list.length;
            for (let i = 0; i < count; ++i) {
                list[i].destroy();
            }
            list.length = 0;
            this._cmptMap.delete(key);
        }
    }
    /**
     * 清空全部节点
     */
    public static clearAll(): void {
        this._urlMap.forEach((list: Node[]) => {
            let count = list.length;
            for (let i = 0; i < count; ++i) {
                list[i].destroy();
            }
        });
        this._urlMap.clear();

        this._cmptMap.forEach((list: Node[]) => {
            let count = list.length;
            for (let i = 0; i < count; ++i) {
                list[i].destroy();
            }
        });
        this._cmptMap.clear();
    }
    /**
     * 根据类型从节点池取出节点
     */
    public static get(key: string | { prototype: Component }): Node | null {
        if (typeof key === "string") {
            let list = this._urlMap.get(key);
            if (list === undefined || list.length <= 0) {
                return null;
            }

            let last = list.length - 1;
            let node = list[last];
            list.length = last;
            return node;
        } else {
            let list = this._cmptMap.get(key);
            if (list === undefined || list.length <= 0) {
                return null;
            }

            let last = list.length - 1;
            let node = list[last];
            list.length = last;
            // Invoke pool handler

            //@ts-ignore
            let handler: any = node.getComponent(key);
            if (handler && handler.reuse) {
                handler.reuse();
            }
            return node;
        }
    }
    /**
     * 根据类型将节点放入节点池
     */
    public static put(key: string | { prototype: Component }, node: Node): void {
        if (!node) {
            error(`[RecyclePool.put] error: 传入节点为空`);
            return;
        }

        if (typeof key === "string") {
            let list = this._urlMap.get(key);
            if (list === undefined) {
                list = [];
                this._urlMap.set(key, list);
            } else if (list.indexOf(node) !== -1) {
                error(`[RecyclePool.put] error: 不可将节点重复放入节点池中`);
                return;
            } else if (list.length >= RecyclePool.limit) {
                node.destroy();
                warn(`[RecyclePool.put] warn: 节点池到达最大数量 key: ${key}`);
                return;
            }

            node.removeFromParent();
            list.push(node);
        } else {
            let list = this._cmptMap.get(key);
            if (list === undefined) {
                list = [];
                this._cmptMap.set(key, list);
            } else if (list.indexOf(node) !== -1) {
                error(`[RecyclePool.put] error: 不可将节点重复放入节点池中`);
                return;
            } else if (list.length >= RecyclePool.limit) {
                node.destroy();
                warn(`[RecyclePool.put] warn: 节点池到达最大数量 key: ${key}`);
                return;
            }

            node.removeFromParent();
            // Invoke pool handler

            //@ts-ignore
            let handler: any = node.getComponent(key);
            if (handler && handler.unuse) {
                handler.unuse();
            }
            list.push(node);
        }
    }
}