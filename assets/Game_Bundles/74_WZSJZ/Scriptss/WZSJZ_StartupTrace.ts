import { cclegacy, Component, Director, director, isValid, Node, sp, UIRenderer } from 'cc';
import { WZSJZ_Constant } from './WZSJZ_Constant';

/** 临时首帧诊断：只观察调用，不吞异常、不改变调用参数、返回值和执行顺序。 */
export class WZSJZ_StartupTrace {
    private static _current: WZSJZ_StartupTrace = null;
    private _restores: Array<() => void> = [];
    private _events: Array<[string, () => void]> = [];
    private _wrapped = new WeakMap<object, Set<string>>();
    private _frames = 0;
    private _sequence = 0;
    private _stopped = false;

    public static Start(): WZSJZ_StartupTrace {
        this._current?.Stop();
        const trace = new WZSJZ_StartupTrace();
        if (!WZSJZ_Constant.StartupDiagnostics.Enabled) return trace;
        this._current = trace;
        trace.Install();
        return trace;
    }

    public static Mark(message: string): void {
        this._current?.Log(message);
    }

    private Log(message: string): void {
        if (this._stopped) return;
        if (++this._sequence > WZSJZ_Constant.StartupDiagnostics.MaxLogLines) {
            console.warn('[WZSJZ][NativeTrace] 达到日志上限，停止追踪');
            this.Stop();
            return;
        }
        console.info(`[WZSJZ][NativeTrace][${this._sequence}][frame=${this._frames + 1}] ${message}`);
    }

    private Listen(event: string, callback: () => void): void {
        this._events.push([event, callback]);
        director.on(event, callback, this);
    }

    private Install(): void {
        this.Log('开始追踪；ENTER没有对应EXIT表示未观察到该调用返回');
        // 引擎原生适配器比本诊断器更早订阅BEFORE_DRAW；包住emit才能看到
        // 早期监听内部崩溃，不能把“我们的BEFORE_DRAW没打印”误判为尚未开始派发。
        this.Wrap(director, 'emit', 'Director.BEFORE_DRAW派发',
            (args) => args[0] === Director.EVENT_BEFORE_DRAW);
        const middleware = (globalThis as any).middleware;
        const middlewareManager = middleware?.MiddlewareManager?.getInstance?.();
        if (middlewareManager) {
            this.Wrap(middlewareManager, 'update', 'NativeMiddleware');
            this.Wrap(middlewareManager, 'render', 'NativeMiddleware');
            this.Wrap(middleware, 'reset', 'NativeMiddleware');
        } else this.Log('SKIP NativeMiddleware 未暴露');
        const internal = (cclegacy as any).internal;
        // 只取现有实例，不调用getInstance，避免诊断本身创建额外系统。
        for (const name of ['SpineSkeletonSystem', 'ArmatureSystem']) {
            const systemClass = internal?.[name];
            this.Wrap(systemClass?.prototype, 'prepareRenderData', name);
        }
        this.Listen(Director.EVENT_BEFORE_UPDATE, () => this.Log('PHASE BEFORE_UPDATE'));
        this.Listen(Director.EVENT_AFTER_UPDATE, () => {
            this.Log('PHASE AFTER_UPDATE（后续为延迟销毁和系统postUpdate）');
            this.Scan();
        });
        this.Listen(Director.EVENT_BEFORE_DRAW, () => {
            this.Log('PHASE BEFORE_DRAW（后续为UI数据更新和绘制）');
            this.Scan();
        });
        this.Listen(Director.EVENT_AFTER_DRAW, () => this.Log('PHASE AFTER_DRAW'));
        this.Listen(Director.EVENT_END_FRAME, () => {
            this.Log('PHASE END_FRAME');
            if (++this._frames >= WZSJZ_Constant.StartupDiagnostics.Frames) this.Stop();
        });
        // 内部入口仅用于诊断，逐项检查存在性；原生平台未暴露的入口会明确记录。
        const objectClass = (cclegacy as any).Object;
        if (typeof objectClass?._deferredDestroy === 'function') {
            this.Wrap(objectClass, '_deferredDestroy', 'CCObject');
        } else this.Log('SKIP CCObject._deferredDestroy 未暴露');
        const systems = (director as any)._systems;
        if (Array.isArray(systems)) {
            for (const system of systems) {
                this.Wrap(system, 'postUpdate', `System:${system.id || system.constructor?.name}`);
            }
        } else this.Log('SKIP director._systems 未暴露');
        const root = director.root as any;
        this.Wrap(root, 'frameMove', 'Root');
        this.Wrap(root?.batcher2D, 'update', 'Batcher2D');
        this.Wrap(root?.batcher2D, 'uploadBuffers', 'Batcher2D');
        this.Scan();
    }

    private Path(node: Node): string {
        const parts: string[] = [];
        for (let current = node; current && parts.length < 24; current = current.parent) {
            parts.unshift(current.name);
        }
        return parts.join('/');
    }

    private Scan(): void {
        if (this._stopped) return;
        const scene = director.getScene();
        if (!scene) return;
        for (const component of scene.getComponentsInChildren(Component)) {
            if (!isValid(component, true) || !isValid(component.node, true)) continue;
            if (!(component instanceof UIRenderer) && !(component instanceof sp.Skeleton)) continue;
            const label = `${this.Path(component.node)}#${component.node.uuid}:${component.constructor.name}`;
            if (!this._wrapped.has(component)) {
                const skeleton = component instanceof sp.Skeleton ? component : null;
                this.Log(`OBJECT ${label} active=${component.node.activeInHierarchy} enabled=${component.enabled}`
                    + (skeleton ? ` spine=${skeleton.skeletonData?.name} animation=${skeleton.animation}` : ''));
            }
            for (const method of ['updateAnimation', 'updateRenderer', 'updateRenderData',
                '_render', 'postUpdateAssembler', 'onDestroy']) {
                this.Wrap(component, method, label);
            }
        }
    }

    private Wrap(target: any, method: string, label: string,
        filter?: (args: any[]) => boolean): void {
        if (this._stopped || !target || typeof target[method] !== 'function') return;
        let names = this._wrapped.get(target);
        if (!names) { names = new Set<string>(); this._wrapped.set(target, names); }
        if (names.has(method)) return;
        names.add(method);
        const original = target[method];
        const own = Object.getOwnPropertyDescriptor(target, method);
        const trace = this;
        const wrapped = function (this: any, ...args: any[]): any {
            if (filter && !filter(args)) return original.apply(this, args);
            trace.Log(`ENTER ${label}.${method}`);
            try {
                const result = original.apply(this, args);
                trace.Log(`EXIT ${label}.${method}`);
                return result;
            } catch (error) {
                trace.Log(`THROW ${label}.${method}: ${String(error)}`);
                throw error;
            }
        };
        try {
            target[method] = wrapped;
            if (target[method] !== wrapped) { this.Log(`SKIP ${label}.${method} 只读`); return; }
            if (label.startsWith('NativeMiddleware')) this.Log(`HOOK ${label}.${method} 已安装`);
            this._restores.push(() => {
                if (target[method] !== wrapped) return;
                if (own) Object.defineProperty(target, method, own);
                else delete target[method];
            });
        } catch (error) { this.Log(`SKIP ${label}.${method}: ${String(error)}`); }
    }

    public Stop(): void {
        if (this._stopped) return;
        this._stopped = true;
        // director是全局事件源，节点销毁不会替这里注销；只移除本诊断器的监听。
        for (const [event, callback] of this._events) director.off(event, callback, this);
        this._events.length = 0;
        for (const restore of this._restores.reverse()) {
            try { restore(); } catch (error) { console.warn('[WZSJZ][NativeTrace] 恢复入口失败', error); }
        }
        this._restores.length = 0;
        if (WZSJZ_StartupTrace._current === this) WZSJZ_StartupTrace._current = null;
        console.info('[WZSJZ][NativeTrace] 追踪结束，已恢复入口');
    }
}
