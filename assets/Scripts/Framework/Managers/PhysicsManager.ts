import { _decorator, Component, PhysicsSystem, PhysicsSystem2D } from 'cc';
import { Tools } from '../Utils/Tools';
import { GameData } from './DataManager';
const { ccclass, property } = _decorator;

@ccclass('PhysicsManager')
export class PhysicsManager extends Component {

    //**最大的物理分层 */
    static maxLayer = 23;

    //**获取当前物理分层数据 */
    public static LogCurrentCollisionMatrix() {
        // 物理模块可能在发布包中被裁剪，优先输出本项目使用的2D矩阵。
        const system = PhysicsSystem2D?.instance || PhysicsSystem?.instance;
        if (!system) return;
        let str = ``;
        let str2 = '';

        for (let i = 1; i <= (1 << this.maxLayer); i <<= 1) {
            let binary = Tools.DecimalToBinaryWithPadding(system.collisionMatrix[i], this.maxLayer);
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
        const systems = [PhysicsSystem2D?.instance, PhysicsSystem?.instance].filter(system => !!system);
        if (!systems.length) return;
        this.LogCurrentCollisionMatrix();
        for (let i = 1; i <= (1 << this.maxLayer); i <<= 1) {
            const mask = data.GetMatrixByLayer(i);
            for (const system of systems) system.collisionMatrix[i] = mask;
        }
        this.LogCurrentCollisionMatrix();
    }

}


