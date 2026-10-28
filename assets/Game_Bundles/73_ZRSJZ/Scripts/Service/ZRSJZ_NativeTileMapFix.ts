import { director, Director, isValid, TiledLayer, VERSION } from 'cc';
import { NATIVE } from 'cc/env';

interface TileMapAccessor {
    reset(): void;
}

interface TileMapRenderData {
    vertexCount: number;
    chunk: {
        vertexOffset: number;
        vertexAccessor: TileMapAccessor;
        meshBuffer: { iData: Uint16Array; indexOffset: number };
    };
}

interface TileMapDrawInfo {
    setIndexOffset(offset: number): void;
    setIBCount(count: number): void;
}

interface NativeTileLayer {
    _drawInfoList: TileMapDrawInfo[];
    fillIndicesBuffer(data: TileMapRenderData, drawInfo: TileMapDrawInfo): void;
}

let installed = false;
const keepTileMapBuffers = (): void => { };
const trackedLayers = new Set<NativeTileLayer>();
const originalIndexCounts = new WeakMap<TileMapDrawInfo, number>();

function restoreTileMapIndexCounts(): void {
    for (const layer of trackedLayers) {
        if (!isValid(layer, true)) {
            trackedLayers.delete(layer);
            continue;
        }
        // 仅处理本轮 prepareDrawData 仍在使用的 DrawInfo，避免保留已释放的
        // 图块/原生对象；SUB_NODE 没有记录，不改它的渲染数据。
        for (const drawInfo of layer._drawInfoList) {
            const count = originalIndexCounts.get(drawInfo);
            if (count !== undefined) drawInfo.setIBCount(count);
        }
    }
}

/**
 * 回移 Cocos PR #18695（3.8.7 已修复）：
 * https://github.com/cocos/cocos-engine/pull/18695
 * 3.8.6 原生端只重建脏图层，却每帧重置所有 TileMap 共享索引偏移。
 * 新写入的图层会覆盖仍被其他图层 DrawInfo 引用的索引，造成闪烁/黑块。
 * 同时绕过原生 Batcher2d::handleMiddlewareDraw 累加 ibCount 后未恢复的问题：
 * 干净图层复用被修改的数量，会重复绘制相邻图块，使半透明阴影反复变深。
 * 只修复当前版本的原生路径；升级引擎后不再安装此兼容补丁。
 */
export function InstallZRSJZNativeTileMapFix(): void {
    if (!NATIVE || VERSION !== '3.8.6' || installed) return;
    const prototype = TiledLayer.prototype as unknown as NativeTileLayer;
    if (typeof prototype.fillIndicesBuffer !== 'function') {
        console.warn('[ZRSJZ_TileMap] 原生索引接口不匹配，未安装 3.8.6 兼容补丁');
        return;
    }

    prototype.fillIndicesBuffer = function (data, drawInfo): void {
        const chunk = data.chunk;
        // 引擎闭包里的 BEFORE_DRAW 监听仍会调用 reset()。仅将 TileMap 专用
        // accessor 的 reset 置空，等价于官方删除该监听；不影响 Sprite/Spine。
        // 首次写入前即可取得 accessor，之后新增的缓冲也使用同一个实例。
        if (chunk.vertexAccessor.reset !== keepTileMapBuffers) {
            chunk.vertexAccessor.reset = keepTileMapBuffers;
        }

        const buffer = chunk.meshBuffer;
        let vertexId = chunk.vertexOffset;
        const quadCount = data.vertexCount / 4;
        // 索引地址与持久化顶点块一一对应，不依赖本帧哪些图层先后更新。
        let indexOffset = vertexId / 4 * 6;
        drawInfo.setIndexOffset(indexOffset);
        for (let i = 0; i < quadCount; i++) {
            buffer.iData[indexOffset] = vertexId;
            buffer.iData[indexOffset + 1] = vertexId + 1;
            buffer.iData[indexOffset + 2] = vertexId + 2;
            buffer.iData[indexOffset + 3] = vertexId + 2;
            buffer.iData[indexOffset + 4] = vertexId + 1;
            buffer.iData[indexOffset + 5] = vertexId + 3;
            indexOffset += 6;
            vertexId += 4;
        }
        buffer.indexOffset = indexOffset;
        drawInfo.setIBCount(quadCount * 6);
        originalIndexCounts.set(drawInfo, quadCount * 6);
        trackedLayers.add(this);
    };
    // 在原生批次合并前恢复干净图层的数量。之后脏图层由引擎重建，写入新数量。
    // 不强制地图每帧重建，不关闭合批，也不改变透明混合或图层顺序。
    director.on(Director.EVENT_BEFORE_DRAW, restoreTileMapIndexCounts);
    installed = true;
    console.info('[ZRSJZ_TileMap] 已安装 3.8.6 原生索引缓冲及合批计数修复');
}
