import { _decorator, Component, director, Node, sp, Vec3 } from 'cc';
import { ZRSJZ_Skill } from './ZRSJZ_Skill';
import { ZRSJZ_PoolManager } from '../Manager/ZRSJZ_PoolManager';
import { ZRSJZ_EnemyBase } from '../Controller/ZRSJZ_EnemyBase';
import { ZRSJZ_AudioManager } from '../Manager/ZRSJZ_AudioManager';
const { ccclass, property } = _decorator;

@ccclass('ZRSJZ_Bomb')
export class ZRSJZ_Bomb extends ZRSJZ_Skill {

    @property({ displayName: "第二阶段动画名称" })
    NextAniName: string = "";

    BombSkeleton: sp.Skeleton = null;
    SkillRange: number = 500;
    SkillDamage: number = 30;

    Init() {
        super.Init();
        this.BombSkeleton = this.node.getChildByName("Bomb").getComponent(sp.Skeleton);
        this.BombSkeleton.setEventListener((trackEntry, event) => {
            if (typeof event !== "number") {
                switch (event.data.name) {
                    case "gj":
                        this.Attack();
                        break;
                }
            }
        });
    }

    Show(worldPos: Vec3, dirX?: number, dirY?: number, harm: number = 10, cb: Function = null) {
        if (!this.IsInit) {
            this.IsInit = true;
            this.Init();
        }
        this.Harm = harm;
        this.BombSkeleton.node.active = false;
        this.Skeleton.node.active = true;
        this.node.active = true;
        this.node.setWorldPosition(worldPos.clone());
        this.Skeleton.setAnimation(0, this.AniName, false);
        this.Skeleton.setCompleteListener(() => {
            ZRSJZ_AudioManager.Instance.PlaySound("轰炸");
            this.Skeleton.node.active = false;
            this.BombSkeleton.node.active = true;
            this.BombSkeleton.setAnimation(0, this.NextAniName, false);
            this.BombSkeleton.setCompleteListener(() => {
                cb && cb();
                ZRSJZ_PoolManager.Instance.PutNode(this.node);
            })
        })
    }

    Attack() {
        let enemys = director.getScene()?.getComponentsInChildren(ZRSJZ_EnemyBase) ?? [];
        const currentPosition = this.node.worldPosition;
        enemys = enemys.filter(enemy => !enemy.IsDead);
        enemys.forEach(enemy => {
            if (Vec3.distance(this.node.worldPosition, enemy.node.worldPosition) < this.SkillRange || Vec3.distance(this.node.worldPosition, enemy.Other.worldPosition) < this.SkillRange) {
                enemy.BeHit(this.Harm);
            }
        })
    }

}


