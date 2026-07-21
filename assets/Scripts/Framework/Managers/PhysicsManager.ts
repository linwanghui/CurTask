import { _decorator, Component, JsonAsset, Node, physics, PhysicsSystem, PhysicsSystem2D } from 'cc';
import { Tools } from '../Utils/Tools';
import { ResourceUtil } from '../Utils/ResourceUtil';
import { DataManager, GameData } from './DataManager';
const { ccclass, property } = _decorator;

@ccclass('PhysicsManager')
export class PhysicsManager extends Component {

    //**最大的物理分层 */
    static maxLayer = 23;

    //**获取当前物理分层数据 */
    public static LogCurrentCollisionMatrix() {
        let str = ``;
        let str2 = '';

        for (let i = 1; i <= (1 << this.maxLayer); i <<= 1) {
            // let binary = Tools.DecimalToBinaryWithPadding(PhysicsSystem2D.instance.collisionMatrix[i], this.maxLayer);
            let binary = Tools.DecimalToBinaryWithPadding(PhysicsSystem.instance.collisionMatrix[i], this.maxLayer);
            str += `${i == (1 << this.maxLayer) ? `${binary}` : `${binary}-`}`
            str2 += `${binary}\n`
        }

        console.log("物理碰撞矩阵存储字符串:");
        console.log(str);
        console.log(`物理碰撞矩阵：\n` + ` ` + str2.split('').join(' '));
    }

    //**获取物理分层的字符串 */
    public static LogGameCollisionMatrix(data: GameData) {
        console.log(`[${data.gameName}]的物理分层数据:\n`, data.collisionMatrix.split(`-`).join(`\n`).split('').join(' '));
    }

    //**设置物理分层 */
    public static SetCollisionMatrix(data: GameData) {
        this.LogCurrentCollisionMatrix();
        for (let i = 1; i <= (1 << this.maxLayer); i <<= 1) {
            PhysicsSystem2D.instance.collisionMatrix[i] = data.GetMatrixByLayer(i);
            PhysicsSystem.instance.collisionMatrix[i] = data.GetMatrixByLayer(i);
        }
        this.LogCurrentCollisionMatrix();
    }

}


