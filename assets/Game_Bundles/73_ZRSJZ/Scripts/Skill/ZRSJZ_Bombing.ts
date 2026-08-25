import { _decorator, Component, director, Node, sp, Vec3 } from 'cc';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
import { ZRSJZ_Player } from '../Controller/ZRSJZ_Player';
import { ZRSJZ_Bomb } from './ZRSJZ_Bomb';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Bombing')
export class ZRSJZ_Bombing extends ZRSJZ_Bomb {

    Init(): void {
        super.Init();
        this.SkillRange = 200;
    }
    Attack() {
        let players = director.getScene()?.getComponentsInChildren(ZRSJZ_Player) ?? [];
        players = players.filter(player => !player.IsDead);
        players.forEach(player => {
            if (Vec3.distance(this.node.worldPosition, player.node.worldPosition) < this.SkillRange) {
                player.BeHit(this.SkillDamage);
            }
        })
    }

}


