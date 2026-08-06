import { _decorator, Component, director, Label, Node, Sprite } from 'cc';
import { PanelBase } from '../../../../Scripts/Framework/UI/PanelBase';


const { ccclass, property } = _decorator;

@ccclass('WZSJZ_IntroducePanel')
export class WZSJZ_IntroducePanel extends PanelBase {

    //第一个参数为要转跳的场景
    Show(...args: any[]): void {
        super.Show(...args);

    }


}


