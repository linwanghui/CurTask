import { _decorator, Component } from 'cc';
const { ccclass, property } = _decorator;


@ccclass('MenuPage')
export default class MenuPage extends Component {
    // gameItems: GameItem[] = [];
    onLoad() {
        // for (let i = 0; i < this.node.children.length; i++) {
        // this.gameItems.push(this.node.children[i].getComponent(GameItem));
        // }
    }
    //    //** 长度为6的数组 */
    // Refresh(gameDatas: GunData[]) {
    //        // for (let i = 0; i < this.gameItems.length; i++) {
    //        //     let haveData = typeof (gameDatas[i]) !== `undefined`;

    //        //     this.gameItems[i].node.active = haveData;

    //        //     if (haveData) {
    //        //         this.gameItems[i].Refresh(gameDatas[i]);
    //        //     }
    //        // }
    // }
}