import { _decorator, Component, Label, Sprite, Tween, tween } from 'cc';
import { ZRSJZ_EventManager, ZRSJZ_MyEvent } from '../Manager/ZRSJZ_EventManager';
import {
    ZRSJZ_ExperienceAddedInfo,
    ZRSJZ_GradeInfo,
    ZRSJZ_GradeService,
} from '../Service/ZRSJZ_GradeService';
import { ZRSJZ_GameData } from '../ZRSJZ_GameData';
import { ZRSJZ_GetExpPanel } from '../Panel/ZRSJZ_GetExpPanel';
const { ccclass } = _decorator;

@ccclass('ZRSJZ_GradeUI')
export class ZRSJZ_GradeUI extends Component {
    private _icon: Sprite = null;
    private _roleName: Label = null;
    private _grade: Label = null;
    private _progress: Sprite = null;
    private _experience: Label = null;
    private _iconRequestVersion: number = 0;
    private _isExperienceAnimating: boolean = false;
    private _experienceAnimationQueue: ZRSJZ_ExperienceAddedInfo[] = [];
    private readonly _experienceTweenValue = { value: 0 };

    protected onLoad(): void {
        this._icon = this.node.getChildByName("Icon")?.getComponent(Sprite) ?? null;
        this._roleName = this.node.getChildByName("Name")?.getComponent(Label) ?? null;
        this._grade = this.node.getChildByName("等级")?.getComponent(Label) ?? null;
        this._progress = this.node.getChildByName("进度")?.getComponent(Sprite) ?? null;
        this._experience = this.node.getChildByName("经验值")?.getComponent(Label) ?? null;
    }

    protected onEnable(): void {
        ZRSJZ_EventManager.OnPersist(
            ZRSJZ_MyEvent.ZRSJZ_PLAYER_INFO_CHANGE,
            this.Refresh,
            this,
        );
        ZRSJZ_EventManager.OnPersist(
            ZRSJZ_MyEvent.ZRSJZ_EXPERIENCE_ADDED,
            this.OnExperienceAdded,
            this,
        );
        this.Refresh();
    }

    protected onDisable(): void {
        ZRSJZ_GradeService.FlushOnlineTime();
        ++this._iconRequestVersion;
        ZRSJZ_EventManager.OffPersist(
            ZRSJZ_MyEvent.ZRSJZ_PLAYER_INFO_CHANGE,
            this.Refresh,
            this,
        );
        ZRSJZ_EventManager.OffPersist(
            ZRSJZ_MyEvent.ZRSJZ_EXPERIENCE_ADDED,
            this.OnExperienceAdded,
            this,
        );
        Tween.stopAllByTarget(this._experienceTweenValue);
        this._experienceAnimationQueue.length = 0;
        this._isExperienceAnimating = false;
    }

    public Refresh(): void {
        const roleName = ZRSJZ_GameData.Instance.CurRole?.[0] || "威蓝";
        const gradeInfo = ZRSJZ_GradeService.GetGradeInfo();
        if (this._roleName) this._roleName.string = roleName;
        if (!this._isExperienceAnimating) this.ApplyGradeInfo(gradeInfo);
        void this.RefreshRoleIcon(roleName);
    }

    protected update(deltaTime: number): void {
        ZRSJZ_GradeService.UpdateOnlineTime(deltaTime);
    }

    private async RefreshRoleIcon(roleName: string): Promise<void> {
        const requestVersion = ++this._iconRequestVersion;
        const spriteFrame = await ZRSJZ_GradeService.GetRoleAvatar(roleName);
        if (
            requestVersion !== this._iconRequestVersion
            || !this._icon?.node?.isValid
            || ZRSJZ_GameData.Instance.CurRole?.[0] !== roleName
        ) return;
        if (spriteFrame) this._icon.spriteFrame = spriteFrame;
    }

    private OnExperienceAdded(changeInfo: ZRSJZ_ExperienceAddedInfo): void {
        if (!changeInfo || changeInfo.Amount <= 0) return;
        this._experienceAnimationQueue.push(changeInfo);
        if (!this._isExperienceAnimating) this.PlayNextExperienceAnimation();
    }

    private PlayNextExperienceAnimation(): void {
        const changeInfo = this._experienceAnimationQueue.shift();
        if (!changeInfo) {
            this._isExperienceAnimating = false;
            this.Refresh();
            return;
        }

        this._isExperienceAnimating = true;
        ZRSJZ_GetExpPanel.Enqueue(changeInfo.Amount);
        const segments = this.CreateExperienceSegments(changeInfo.Before, changeInfo.After);
        this.PlayExperienceSegment(segments, 0, changeInfo.After, () => {
            this.ApplyGradeInfo(changeInfo.After);
            this.PlayNextExperienceAnimation();
        });
    }

    private CreateExperienceSegments(
        before: ZRSJZ_GradeInfo,
        after: ZRSJZ_GradeInfo,
    ): Array<{ Level: number; Start: number; End: number; Required: number }> {
        const segments: Array<{ Level: number; Start: number; End: number; Required: number }> = [];
        if (before.IsMaxLevel) return segments;

        for (let level = before.Level; level <= after.Level && level < ZRSJZ_GradeService.MAX_LEVEL; level++) {
            const required = ZRSJZ_GradeService.GetRequiredExperience(level);
            const start = level === before.Level ? before.CurrentExperience : 0;
            const end = level < after.Level ? required : after.CurrentExperience;
            segments.push({ Level: level, Start: start, End: end, Required: required });
        }
        return segments;
    }

    private PlayExperienceSegment(
        segments: Array<{ Level: number; Start: number; End: number; Required: number }>,
        index: number,
        finalInfo: ZRSJZ_GradeInfo,
        complete: () => void,
    ): void {
        if (index >= segments.length) {
            complete();
            return;
        }

        const segment = segments[index];
        this._experienceTweenValue.value = segment.Start;
        this.ApplyAnimatedExperience(segment.Level, segment.Start, segment.Required);
        tween(this._experienceTweenValue)
            .to(0.65, { value: segment.End }, {
                easing: 'quadOut',
                onUpdate: target => {
                    this.ApplyAnimatedExperience(
                        segment.Level,
                        Math.round(target.value),
                        segment.Required,
                    );
                },
            })
            .call(() => {
                this.ApplyAnimatedExperience(segment.Level, segment.End, segment.Required);
                if (segment.Level < finalInfo.Level) {
                    const nextLevel = segment.Level + 1;
                    if (nextLevel >= ZRSJZ_GradeService.MAX_LEVEL) {
                        this.ApplyGradeInfo(finalInfo);
                    } else {
                        this.ApplyAnimatedExperience(
                            nextLevel,
                            0,
                            ZRSJZ_GradeService.GetRequiredExperience(nextLevel),
                        );
                    }
                }
                this.PlayExperienceSegment(segments, index + 1, finalInfo, complete);
            })
            .start();
    }

    private ApplyAnimatedExperience(level: number, experience: number, required: number): void {
        const safeRequired = Math.max(1, required);
        const safeExperience = Math.max(0, Math.min(required, Math.round(experience)));
        if (this._grade) this._grade.string = `${level}级`;
        if (this._progress) this._progress.fillRange = safeExperience / safeRequired;
        if (this._experience) this._experience.string = `${safeExperience} / ${required}`;
    }

    private ApplyGradeInfo(gradeInfo: ZRSJZ_GradeInfo): void {
        if (this._grade) this._grade.string = `${gradeInfo.Level}级`;
        if (this._progress) this._progress.fillRange = gradeInfo.Progress;
        if (this._experience) {
            this._experience.string = gradeInfo.IsMaxLevel
                ? "MAX"
                : `${gradeInfo.CurrentExperience} / ${gradeInfo.RequiredExperience}`;
        }
    }

}

