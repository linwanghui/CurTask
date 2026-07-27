import { ERaycast2DType, PhysicsSystem2D, Rect, Vec2, Vec3 } from 'cc';

interface ZRSJZ_PathNode {
    X: number;
    Y: number;
    G: number;
    H: number;
    ParentKey: string;
}

export interface ZRSJZ_PathFindOptions {
    GridSize: number;
    AgentRadius: number;
    AgentOffsetY: number;
    RaycastRadiusScale: number;
    ObstacleMask: number;
    MaxSearchNodes: number;
}

/**
 * 基于 PhysicsSystem2D 地形碰撞体的轻量 A* 寻路。
 * 只在敌人被墙挡住或卡住时调用，正常追击仍使用直线移动。
 */
export class ZRSJZ_PathFinder {
    private static readonly _directions = [
        { X: 1, Y: 0, Cost: 10 },
        { X: -1, Y: 0, Cost: 10 },
        { X: 0, Y: 1, Cost: 10 },
        { X: 0, Y: -1, Cost: 10 },
        { X: 1, Y: 1, Cost: 14 },
        { X: 1, Y: -1, Cost: 14 },
        { X: -1, Y: 1, Cost: 14 },
        { X: -1, Y: -1, Cost: 14 },
    ];

    public static HasDirectPath(
        from: Readonly<Vec3>,
        to: Readonly<Vec3>,
        obstacleMask: number,
        agentRadius: number,
        agentOffsetY: number,
        raycastRadiusScale: number,
    ): boolean {
        const offsetFrom = new Vec2(from.x, from.y + agentOffsetY);
        const offsetTo = new Vec2(to.x, to.y + agentOffsetY);
        const dx = offsetTo.x - offsetFrom.x;
        const dy = offsetTo.y - offsetFrom.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= 0) {
            return true;
        }

        // 射线必须从碰撞体内部发出。若正好从身体边缘发出，敌人贴墙后
        // 射线起点可能处于墙体内部，PhysicsSystem2D 会忽略该墙体。
        const raycastRadius = agentRadius * Math.max(0, Math.min(1, raycastRadiusScale));
        const sideX = -dy / distance * raycastRadius;
        const sideY = dx / distance * raycastRadius;
        return this.RaycastClear(offsetFrom, offsetTo, obstacleMask)
            && this.RaycastClear(
                new Vec2(offsetFrom.x + sideX, offsetFrom.y + sideY),
                new Vec2(offsetTo.x + sideX, offsetTo.y + sideY),
                obstacleMask,
            )
            && this.RaycastClear(
                new Vec2(offsetFrom.x - sideX, offsetFrom.y - sideY),
                new Vec2(offsetTo.x - sideX, offsetTo.y - sideY),
                obstacleMask,
            );
    }

    public static FindPath(
        start: Readonly<Vec3>,
        target: Readonly<Vec3>,
        options: Readonly<ZRSJZ_PathFindOptions>,
    ): Vec3[] {
        const gridSize = Math.max(1, options.GridSize);
        const requestedStartX = Math.round(start.x / gridSize);
        const requestedStartY = Math.round(start.y / gridSize);
        const requestedTargetX = Math.round(target.x / gridSize);
        const requestedTargetY = Math.round(target.y / gridSize);
        const walkableCache = new Map<string, boolean>();
        const startCell = this.FindNearestReachableStartCell(
            start,
            requestedStartX,
            requestedStartY,
            options,
            walkableCache,
        );
        if (!startCell) {
            return [];
        }

        const startX = startCell.X;
        const startY = startCell.Y;
        const targetCell = this.FindNearestWalkableCell(
            requestedTargetX,
            requestedTargetY,
            options,
            walkableCache,
        );
        if (!targetCell) {
            return [];
        }

        const startKey = this.CellKey(startX, startY);
        const targetKey = this.CellKey(targetCell.X, targetCell.Y);
        const open: ZRSJZ_PathNode[] = [{
            X: startX,
            Y: startY,
            G: 0,
            H: this.Heuristic(startX, startY, targetCell.X, targetCell.Y),
            ParentKey: '',
        }];
        const nodes = new Map<string, ZRSJZ_PathNode>();
        const closed = new Set<string>();
        nodes.set(startKey, open[0]);

        let searchedNodes = 0;
        while (open.length > 0 && searchedNodes < Math.max(1, options.MaxSearchNodes)) {
            open.sort((a, b) => (a.G + a.H) - (b.G + b.H) || a.H - b.H);
            const current = open.shift();
            if (!current) {
                break;
            }
            const currentKey = this.CellKey(current.X, current.Y);
            if (closed.has(currentKey)) {
                continue;
            }

            closed.add(currentKey);
            searchedNodes++;
            if (currentKey === targetKey) {
                return this.BuildResult(
                    nodes,
                    startKey,
                    targetKey,
                    target,
                    start,
                    gridSize,
                    start.z,
                    options,
                );
            }

            for (const direction of this._directions) {
                const nextX = current.X + direction.X;
                const nextY = current.Y + direction.Y;
                const nextKey = this.CellKey(nextX, nextY);
                if (closed.has(nextKey)) {
                    continue;
                }

                if (!this.IsWalkable(nextX, nextY, options, walkableCache)) {
                    continue;
                }

                if (direction.X !== 0 && direction.Y !== 0) {
                    const horizontalClear = this.IsWalkable(
                        current.X + direction.X,
                        current.Y,
                        options,
                        walkableCache,
                    );
                    const verticalClear = this.IsWalkable(
                        current.X,
                        current.Y + direction.Y,
                        options,
                        walkableCache,
                    );
                    if (!horizontalClear || !verticalClear) {
                        continue;
                    }
                }

                const newG = current.G + direction.Cost;
                const knownNode = nodes.get(nextKey);
                if (knownNode && newG >= knownNode.G) {
                    continue;
                }

                const nextNode: ZRSJZ_PathNode = knownNode ?? {
                    X: nextX,
                    Y: nextY,
                    G: newG,
                    H: this.Heuristic(nextX, nextY, targetCell.X, targetCell.Y),
                    ParentKey: currentKey,
                };
                nextNode.G = newG;
                nextNode.ParentKey = currentKey;
                nodes.set(nextKey, nextNode);
                open.push(nextNode);
            }
        }

        return [];
    }

    private static FindNearestWalkableCell(
        targetX: number,
        targetY: number,
        options: Readonly<ZRSJZ_PathFindOptions>,
        cache: Map<string, boolean>,
    ): { X: number; Y: number } {
        for (let radius = 0; radius <= 4; radius++) {
            let best: { X: number; Y: number } = null;
            let bestDistance = Number.MAX_VALUE;
            for (let x = targetX - radius; x <= targetX + radius; x++) {
                for (let y = targetY - radius; y <= targetY + radius; y++) {
                    if (radius > 0
                        && x !== targetX - radius
                        && x !== targetX + radius
                        && y !== targetY - radius
                        && y !== targetY + radius) {
                        continue;
                    }
                    if (!this.IsWalkable(x, y, options, cache)) {
                        continue;
                    }

                    const distance = Math.abs(x - targetX) + Math.abs(y - targetY);
                    if (distance < bestDistance) {
                        best = { X: x, Y: y };
                        bestDistance = distance;
                    }
                }
            }
            if (best) {
                return best;
            }
        }
        return null;
    }

    /**
     * 墙边的当前位置不一定与取整后的网格中心连通，因此从周围寻找一个
     * 既可站立、又能由当前位置直线到达的真实起始格。
     */
    private static FindNearestReachableStartCell(
        start: Readonly<Vec3>,
        requestedX: number,
        requestedY: number,
        options: Readonly<ZRSJZ_PathFindOptions>,
        cache: Map<string, boolean>,
    ): { X: number; Y: number } {
        const gridSize = Math.max(1, options.GridSize);
        let best: { X: number; Y: number } = null;
        let bestDistance = Number.MAX_VALUE;
        for (let radius = 0; radius <= 4; radius++) {
            for (let x = requestedX - radius; x <= requestedX + radius; x++) {
                for (let y = requestedY - radius; y <= requestedY + radius; y++) {
                    if (radius > 0
                        && x !== requestedX - radius
                        && x !== requestedX + radius
                        && y !== requestedY - radius
                        && y !== requestedY + radius) {
                        continue;
                    }
                    if (!this.IsWalkable(x, y, options, cache)) {
                        continue;
                    }

                    const cellPosition = new Vec3(x * gridSize, y * gridSize, start.z);
                    if (!this.HasDirectPath(
                        start,
                        cellPosition,
                        options.ObstacleMask,
                        options.AgentRadius,
                        options.AgentOffsetY,
                        options.RaycastRadiusScale,
                    )) {
                        continue;
                    }

                    const distance = Vec3.squaredDistance(start, cellPosition);
                    if (distance < bestDistance) {
                        best = { X: x, Y: y };
                        bestDistance = distance;
                    }
                }
            }
            if (best) {
                return best;
            }
        }
        return null;
    }

    private static IsWalkable(
        x: number,
        y: number,
        options: Readonly<ZRSJZ_PathFindOptions>,
        cache: Map<string, boolean>,
    ): boolean {
        const key = this.CellKey(x, y);
        const cached = cache.get(key);
        if (cached !== undefined) {
            return cached;
        }

        const gridSize = Math.max(1, options.GridSize);
        const radius = Math.max(0, options.AgentRadius);
        const centerX = x * gridSize;
        const centerY = y * gridSize + options.AgentOffsetY;
        const queryRect = new Rect(
            centerX - radius,
            centerY - radius,
            radius * 2,
            radius * 2,
        );
        const colliders = PhysicsSystem2D.instance.testAABB(queryRect);
        const walkable = !colliders.some(collider => (
            (collider.group & options.ObstacleMask) !== 0
        ));
        cache.set(key, walkable);
        return walkable;
    }

    private static BuildResult(
        nodes: Map<string, ZRSJZ_PathNode>,
        startKey: string,
        targetKey: string,
        exactTarget: Readonly<Vec3>,
        exactStart: Readonly<Vec3>,
        gridSize: number,
        z: number,
        options: Readonly<ZRSJZ_PathFindOptions>,
    ): Vec3[] {
        const reversed: Vec3[] = [];
        let currentKey = targetKey;
        while (currentKey && currentKey !== startKey) {
            const node = nodes.get(currentKey);
            if (!node) {
                return [];
            }
            reversed.push(new Vec3(node.X * gridSize, node.Y * gridSize, z));
            currentKey = node.ParentKey;
        }
        reversed.reverse();

        const startNode = nodes.get(startKey);
        if (startNode) {
            const startCellPosition = new Vec3(
                startNode.X * gridSize,
                startNode.Y * gridSize,
                z,
            );
            if (Vec3.squaredDistance(exactStart, startCellPosition) > 1) {
                reversed.unshift(startCellPosition);
            }
        }

        const lastPoint = reversed[reversed.length - 1];
        if (!lastPoint || this.HasDirectPath(
            lastPoint,
            exactTarget,
            options.ObstacleMask,
            options.AgentRadius,
            options.AgentOffsetY,
            options.RaycastRadiusScale,
        )) {
            reversed.push(new Vec3(exactTarget.x, exactTarget.y, exactTarget.z));
        }
        return reversed;
    }

    private static RaycastClear(from: Vec2, to: Vec2, obstacleMask: number): boolean {
        return PhysicsSystem2D.instance.raycast(
            from,
            to,
            ERaycast2DType.Closest,
            obstacleMask,
        ).length === 0;
    }

    private static Heuristic(x: number, y: number, targetX: number, targetY: number): number {
        const dx = Math.abs(x - targetX);
        const dy = Math.abs(y - targetY);
        return 10 * (dx + dy) - 6 * Math.min(dx, dy);
    }

    private static CellKey(x: number, y: number): string {
        return `${x},${y}`;
    }
}
