import { WZSJZ_Constant } from './WZSJZ_Constant';

/** 3.8.6原生中间件移除列表延迟到update刷新的兼容保护。 */
export class WZSJZ_NativeSpineGuard {
    private static _stop: (() => void) = null;
    private static _markDirty: (() => void) = null;

    public static Install(): void {
        if (this._stop || !WZSJZ_Constant.NativeSpineCompatibility.Enabled) return;
        const middleware = (globalThis as any).middleware;
        const manager = middleware?.MiddlewareManager?.getInstance?.();
        if (!manager || typeof manager.update !== 'function'
            || typeof manager.render !== 'function' || typeof middleware.release !== 'function') return;
        let enabled = true;
        let pendingRemoval = true;
        let logged = 0;
        const saved: Array<{ target: any; key: string; own: PropertyDescriptor;
            original: Function; wrapped: Function }> = [];
        const install = (target: any, key: string, make: (original: Function) => Function) => {
            const original = target[key];
            const own = Object.getOwnPropertyDescriptor(target, key);
            const wrapped = make(original);
            target[key] = wrapped;
            if (target[key] !== wrapped) throw new Error(`${key}为只读入口`);
            saved.push({ target, key, own, original, wrapped });
        };
        const restore = () => {
            enabled = false;
            for (const entry of saved.reverse()) {
                // 若诊断器暂时包在外层，保留无行为的透传函数，避免破坏它的调用链。
                if (entry.target[entry.key] !== entry.wrapped) continue;
                if (entry.own) Object.defineProperty(entry.target, entry.key, entry.own);
                else delete entry.target[entry.key];
            }
        };
        try {
            install(middleware, 'release', (original) => function (this: any, ...args: any[]) {
                if (enabled) pendingRemoval = true;
                return original.apply(this, args);
            });
            install(manager, 'update', (original) => function (this: any, ...args: any[]) {
                // update先处理旧的移除队列；调用过程中若又停用节点，保留dirty至下一帧。
                const wasPending = pendingRemoval;
                if (enabled) pendingRemoval = false;
                try { return original.apply(this, args); }
                catch (error) { if (enabled) pendingRemoval = pendingRemoval || wasPending; throw error; }
            });
            install(manager, 'render', (original) => function (this: any, ...args: any[]) {
                if (enabled && pendingRemoval) {
                    if (logged++ < 12) console.info('[WZSJZ][SpineGuard] 暂缓骨骼绘制，等待原生update清理移除队列');
                    return;
                }
                return original.apply(this, args);
            });
            this._markDirty = () => { pendingRemoval = true; };
            this._stop = restore;
            console.info('[WZSJZ][SpineGuard] 已启用原生骨骼移除队列保护');
        } catch (error) {
            restore();
            console.warn('[WZSJZ][SpineGuard] 当前平台不支持入口保护，已恢复原行为', error);
        }
    }

    public static BeforeSceneSwitch(): void {
        this.Install();
        this._markDirty?.();
    }

    public static Uninstall(): void {
        this._stop?.();
        this._stop = null;
        this._markDirty = null;
    }
}
