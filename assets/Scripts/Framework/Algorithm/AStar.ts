import { _decorator, Vec2 } from 'cc';
export enum AStar_Node_Type {
        Normal,
        Obstacle
}

export class AStarManager {
        private static _instance: AStarManager = null;
        public static get Instance() {
                if (!this._instance) {
                        this._instance = new AStarManager;
                }
                return this._instance;
        };

        public MapWidth: number;

        public MapHeight: number;

        public Nodes: AStarNode[][] = [];

        private _openList: AStarNode[] = [];
        private _closeList: AStarNode[] = [];

        public InitMapInfo(w: number, h: number) {
                this.MapWidth = w;
                this.MapHeight = h;
                for (let i = 0; i < w; i++) {
                        if (!this.Nodes[i]) {
                                this.Nodes[i] = [];
                        }
                }
        }
        public SetMap(i: number, j: number, type: AStar_Node_Type) {
                let node = new AStarNode(i, j, type);
                this.Nodes[i][j] = node;
        }
        public SetNodeType(i: number, j: number, type: AStar_Node_Type) {
                if (i == 12 && j == 17) {
                        console.log(this.Nodes[i][j]);
                }
                if (this.Nodes[i][j]) {
                        this.Nodes[i][j].type = type;
                }
        }
        // public InitMapInfo(w: number, h: number) {
        //     this.MapWidth = w;
        //     this.MapHeight = h;
        //     for (let i = 0; i < w; i++) {
        //         for (let j = 0; j < h; j++) {
        //             let node = new AStarNode(i, j, AStar_Node_Type.Normal);
        //             this.Nodes[i][j] = node;
        //         }
        //     }
        // }
        public FindPath(startPos: Vec2, endPos: Vec2): AStarNode[] {
                //在地图范围内
                if (startPos.x < 0 || startPos.x >= this.MapWidth || startPos.y < 0 || startPos.y >= this.MapHeight ||
                        endPos.x < 0 || endPos.x >= this.MapWidth || endPos.y < 0 || endPos.y >= this.MapHeight) {
                        console.log("在地图范围外");
                        return null;
                }

                //不可阻挡
                let start: AStarNode = this.Nodes[startPos.x][startPos.y];
                let end: AStarNode = this.Nodes[endPos.x][endPos.y];
                if (start.type == AStar_Node_Type.Obstacle || end.type == AStar_Node_Type.Obstacle) {
                        console.log("起始点或终点为不可到达点");
                        return null;
                }

                //把开始点放入到关闭列表中
                this._openList = [];
                this._closeList = [];
                start.father = null;
                start.f = 0;
                start.g = 0;
                start.h = 0;
                this._closeList.push(start);

                while (true) {
                        //左上
                        this.FindRoundNodeToOpenList(start.x - 1, start.y + 1, 1, start, end);
                        //上
                        this.FindRoundNodeToOpenList(start.x, start.y - 1, 1, start, end);
                        //右上
                        this.FindRoundNodeToOpenList(start.x + 1, start.y + 1, 1, start, end);
                        //左
                        this.FindRoundNodeToOpenList(start.x - 1, start.y, 1, start, end);
                        //右
                        this.FindRoundNodeToOpenList(start.x + 1, start.y, 1, start, end);
                        //左下
                        this.FindRoundNodeToOpenList(start.x - 1, start.y - 1, 1, start, end);
                        //下
                        this.FindRoundNodeToOpenList(start.x, start.y + 1, 1, start, end);
                        //右下
                        this.FindRoundNodeToOpenList(start.x + 1, start.y - 1, 1, start, end);

                        //死路判断，当前开启列表为空。表示所有的路径都被寻找完毕
                        if (this._openList.length == 0) {
                                console.log("终点不可到达");
                                return null;
                        }

                        //选出开启列表中寻路消耗最小的那个点
                        this._openList.sort((a, b) => a.f - b.f);

                        //放入关闭列表再从开启列表中移除
                        this._closeList.push(this._openList[0]);
                        start = this._openList[0];
                        this._openList.splice(0, 1);

                        //找到路径
                        if (start == end) {
                                let path: AStarNode[] = [];
                                path.push(end);
                                while (end.father != null) {
                                        path.push(end.father);
                                        end = end.father;
                                }

                                path.reverse();
                                return path;
                        }
                }
        }
        private FindRoundNodeToOpenList(x: number, y: number, g: number, father: AStarNode, end: AStarNode) {
                //边界判断
                if (x < 0 || x >= this.MapWidth || y < 0 || y >= this.MapHeight) return;

                let node: AStarNode = this.Nodes[x][y];
                if (node == null || node.type == AStar_Node_Type.Obstacle || this._closeList.some(e => e == node) || this._openList.some(e => e == node))
                        return;

                //核心计算，计算 f 值 f = g + h
                node.father = father;
                //计算 g ，node 离起点的距离 = father.G + g ，有一个累加过程
                node.g = father.g + g;
                node.h = Math.abs(end.x - node.x) + Math.abs(end.y - node.y);
                node.f = node.g + node.h;

                this._openList.push(node);
        }
}

export class AStarNode {
        constructor(x: number, y: number, type: AStar_Node_Type) {
                // this.x = x;
                // this.y = y;
                // this.type = type;
        }
        x: number;
        y: number;
        f: number;
        g: number;
        h: number;
        father: AStarNode;
        type: AStar_Node_Type;
}