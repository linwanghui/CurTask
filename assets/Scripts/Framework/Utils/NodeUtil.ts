import { _decorator, Node, Component, Prefab, Vec2, Vec3, instantiate, Quat, quat, v3, Root } from 'cc';
export default class NodeUtil {
    //    /*** 寻找子节点，子节点需不重名 */
    public static GetNode(name: string, rootNode: Node): Node {
        if (rootNode.name == name) {
            return rootNode;
        }
        for (let i = 0; i < rootNode.children.length; i++) {
            let node = this.GetNode(name, rootNode.children[i]);
            if (node) {
                return node;
            }
        }

        return null;
    }
    //    /**找到子节点上的组件*/
    public static GetComponent<T extends Component>(name: string, rootNode: Node, type: { new(): T }): T | null {
        let node = this.GetNode(name, rootNode);
        if (node) {
            const component = node.getComponent(type);
            if (component) {
                return component;
            }
        }

        return null;
    }
    //    /*** 实例化节点 */
    public static Instantiate(prefab: Prefab, parent: Node, position: Vec2 = Vec2.ZERO) {
        var node = instantiate(prefab);
        node.setParent(parent);
        node.setPosition(v3(position.x, position.y));
        return node;
    }
    public static SetParent(child: Node, parent: Node) {
        child.setParent(parent);
        child.setPosition(Vec3.ZERO);
        child.setRotation(new Quat(0, 0, 0))
        child.setScale(Vec3.ONE);
    }

    /*** 获取两个坐标在 XZ 轴的距离 */
    public static GetTwoPosXZDis(aX: number, aZ: number, bX: number, bZ: number) {
        const x = aX - bX;
        const z = aZ - bZ;
        return Math.sqrt(x * x + z * z);
    }
    public static LogVec2(vec2: Vec2, desc: string = "") {
        console.log(`${desc ? `${desc}: ` : ""}x:${vec2.x.toFixed(4)}, y:${vec2.y.toFixed(4)}`);
    }
    public static LogVec3(vec3: Vec3, desc: string = "") {
        console.log(`${desc ? `${desc}: ` : ""}x: ${vec3.x.toFixed(4)}, y:${vec3.y.toFixed(4)}, z:${vec3.z.toFixed(4)} `);
    }
    public static Vec2ToStr(vec2: Vec2, desc: string = "") {
        return `${desc ? `${desc}: ` : ""}[x: ${vec2.x.toFixed(3)}, y:${vec2.y.toFixed(3)}]`;
    }
    public static Vec3ToStr(vec3: Vec3, desc: string = "") {
        return `${desc ? `${desc}: ` : ""}[x: ${vec3.x.toFixed(3)}, y:${vec3.y.toFixed(3)}, z:${vec3.z.toFixed(3)}]`;
    }
}