import {
    _decorator,
    Button,
    Component,
    Label,
    Node,
    Sprite,
    SpriteFrame,
    tween,
    Tween,
    UITransform,
    Vec3,
} from 'cc';
import { WZSJZ_Cell } from './WZSJZ_Cell';
import { WZSJZ_AudioManager } from './WZSJZ_AudioManager';
import { WZSJZ_Constant, WZSJZ_NameCombinationConfig } from './WZSJZ_Constant';
import { WZSJZ_EconomySystem } from './WZSJZ_EconomySystem';
import { WZSJZ_EventManager } from './WZSJZ_EventManager';
import { WZSJZ_GameData } from './WZSJZ_GameData';
import type { WZSJZ_GameNode } from './WZSJZ_GameNode';
import { WZSJZ_Incident } from './WZSJZ_Incident';
import { WZSJZ_UIManager } from './WZSJZ_UIManager';

const { ccclass } = _decorator;

type TutorialStage = "inactive" | "purchase" | "deploy" | "buy_merge_copy"
    | "merge" | "prepare_combination" | "buy_part_a" | "buy_part_b"
    | "combine" | "handbook" | "complete";

interface PurchaseEventData {
    Name: string;
    Level: number;
    Cell: WZSJZ_Cell;
    GameNode: WZSJZ_GameNode;
}

interface PlacementEventData {
    GameNode: WZSJZ_GameNode;
    SourceCell: WZSJZ_Cell;
    TargetCell: WZSJZ_Cell;
}

interface MergeEventData {
    Name: string;
    Level: number;
    Cell: WZSJZ_Cell;
    GameNode: WZSJZ_GameNode;
}

/**
 * 局内首次新手引导。只负责引导状态和遮罩表现，实际购买、拖拽、合成仍由原系统完成。
 */
@ccclass('WZSJZ_TutorialSystem')
export class WZSJZ_TutorialSystem extends Component {
    private _canvas: Node = null;
    private _tutorialRoot: Node = null;
    private _mask: Node = null;
    private _description: Node = null;
    private _descriptionLabel: Label = null;
    private _dragHand: Node = null;
    private _purchaseButton: Node = null;
    private _purchaseHighlightTarget: Node = null;
    private _handbookButton: Node = null;
    private _skipButton: Node = null;
    private _formationCells: WZSJZ_Cell[] = [];
    private _preparationCells: WZSJZ_Cell[] = [];
    private _economy: WZSJZ_EconomySystem = null;
    private _stage: TutorialStage = "inactive";
    private _baseMaterialName: string = "";
    private _baseMaterialPreparationCell: WZSJZ_Cell = null;
    private _combinationRecipe: WZSJZ_NameCombinationConfig = null;
    private _combinationPartCells: WZSJZ_Cell[] = [];
    private _combinationTargetCells: WZSJZ_Cell[] = [];
    private _retryToken: number = 0;

    public Configure(
        canvas: Node,
        formationCells: WZSJZ_Cell[],
        preparationCells: WZSJZ_Cell[],
        economy: WZSJZ_EconomySystem,
    ): void {
        this._canvas = canvas;
        this._formationCells = formationCells || [];
        this._preparationCells = preparationCells || [];
        this._economy = economy;
        this._tutorialRoot = canvas?.getChildByName("教程遮罩") || null;
        this._mask = this._tutorialRoot?.getChildByName("Mask") || null;
        this._description = this._tutorialRoot?.getChildByName("描述") || null;
        this._descriptionLabel = this._description?.getComponent(Label) || null;
        this._purchaseButton = canvas?.getChildByPath("操作区/购买物资") || null;
        this._purchaseHighlightTarget = this._purchaseButton
            ?.getChildByName("购买") || this._purchaseButton;
        this._handbookButton = canvas?.getChildByName("图鉴") || null;
        this._skipButton = this._tutorialRoot?.getChildByName("跳过教程") || null;

        // 局内图鉴按钮是常驻入口，不只在新手引导期间生效。
        this._handbookButton?.on(Button.EventType.CLICK, this.OpenHandbook, this);
        this._skipButton?.on(Button.EventType.CLICK, this.SkipTutorial, this);
        if (!this._tutorialRoot || !this._mask || !this._descriptionLabel) {
            console.warn("[WZSJZ] 新手引导缺少 教程遮罩/Mask/描述 节点。");
            return;
        }
        this.CreateDragHand();
        if (WZSJZ_GameData.Instance.TutorialCompleted) {
            this._tutorialRoot.active = false;
            return;
        }

        this.node.on(
            WZSJZ_EventManager.购买物资成功,
            this.OnMaterialPurchased,
            this,
        );
        this.node.on(
            WZSJZ_EventManager.物资落位完成,
            this.OnMaterialPlaced,
            this,
        );
        this.node.on(
            WZSJZ_EventManager.同级合成完成,
            this.OnMaterialMerged,
            this,
        );
        this.node.on(
            WZSJZ_EventManager.组合单位变化,
            this.OnCombinationChanged,
            this,
        );
        this.scheduleOnce(this.BeginTutorial, 0);
    }

    private BeginTutorial = (): void => {
        if (WZSJZ_GameData.Instance.TutorialCompleted) return;
        this._stage = "purchase";
        this._tutorialRoot.active = true;
        this._tutorialRoot.setSiblingIndex(this._tutorialRoot.parent.children.length - 1);
        this.FocusNodes(
            [this._purchaseHighlightTarget],
            WZSJZ_Constant.Tutorial.PurchaseText,
            WZSJZ_Constant.Tutorial.PurchaseMaskPadding,
        );
    };

    private OnMaterialPurchased = (data: PurchaseEventData): void => {
        if (!data?.Name) return;
        if (this._stage === "purchase") {
            this._baseMaterialName = data.Name;
            this._baseMaterialPreparationCell = data.Cell;
            this._stage = "deploy";
            const targetCell = this.GetPreferredFormationCell();
            this.FocusNodes(
                [this._baseMaterialPreparationCell?.node, targetCell?.node],
                WZSJZ_Constant.Tutorial.DeployText,
                WZSJZ_Constant.Tutorial.DragMaskPadding,
            );
            this.ShowDragHand(this._baseMaterialPreparationCell?.node, targetCell?.node);
            return;
        }
        if (this._stage === "buy_merge_copy"
            && data.Name === this._baseMaterialName) {
            this._stage = "merge";
            const guideNodes = this.GetMergeGuideNodes();
            this.FocusNodes(
                guideNodes,
                WZSJZ_Constant.Tutorial.MergeText,
                WZSJZ_Constant.Tutorial.DragMaskPadding,
            );
            // GetMergeGuideNodes顺序为布阵目标、备战源物体。
            this.ShowDragHand(guideNodes[1], guideNodes[0]);
            return;
        }
        if (this._stage === "buy_part_a"
            && data.Name === this._combinationRecipe?.Parts[0]) {
            this._combinationPartCells = [data.Cell];
            const nextName = this._combinationRecipe.Parts[1];
            if (!this._economy.SetNextPurchaseGuaranteedMaterial(nextName)) {
                this.RetryPrepareSecondCombinationPart();
                return;
            }
            this._stage = "buy_part_b";
            this.FocusNodes(
                [this._purchaseHighlightTarget],
                `继续购买，收集能与“${this._combinationRecipe.Parts[0]}”组成角色的文字`,
                WZSJZ_Constant.Tutorial.PurchaseMaskPadding,
            );
            return;
        }
        if (this._stage === "buy_part_b"
            && data.Name === this._combinationRecipe?.Parts[1]) {
            this._combinationPartCells.push(data.Cell);
            this._stage = "combine";
            const guideCells = this.GetCombinationGuideCells();
            this._combinationTargetCells = guideCells;
            this.FocusNodes(
                [
                    ...this._combinationPartCells.map((cell) => cell?.node),
                    ...guideCells.map((cell) => cell.node),
                ],
                `把“${this._combinationRecipe.Parts[0]}”放左边、“${this._combinationRecipe.Parts[1]}”放右边，组合成“${this._combinationRecipe.Name}”`,
                WZSJZ_Constant.Tutorial.DragMaskPadding,
            );
            this.ShowDragHand(
                this._combinationPartCells[0]?.node,
                guideCells[0]?.node,
            );
        }
    };

    private OnMaterialPlaced = (data: PlacementEventData): void => {
        if (this._stage !== "deploy"
            && this._stage !== "combine") {
            return;
        }
        if (this._stage === "combine") {
            this.UpdateCombinationDragGuide(data);
            return;
        }
        if (data?.TargetCell?.Zone !== "formation"
            || data?.GameNode?.Name !== this._baseMaterialName) return;
        if (!this._economy.SetNextPurchaseGuaranteedMaterial(this._baseMaterialName)) {
            this.RetryPrepareMergeCopy();
            return;
        }
        this._stage = "buy_merge_copy";
        this.FocusNodes(
            [this._purchaseHighlightTarget],
            WZSJZ_Constant.Tutorial.BuyMergeCopyText,
            WZSJZ_Constant.Tutorial.PurchaseMaskPadding,
        );
    };

    private OnMaterialMerged = (data: MergeEventData): void => {
        if (this._stage !== "merge" || data?.Name !== this._baseMaterialName) return;
        this.BeginCombinationTutorial();
    };

    private OnCombinationChanged = (units: WZSJZ_GameNode[]): void => {
        if (this._stage !== "combine" || !this._combinationRecipe) return;
        if (!(units || []).some((unit) => unit?.Name === this._combinationRecipe.Name)) return;
        this._stage = "handbook";
        this.FocusNodes(
            [this._handbookButton],
            WZSJZ_Constant.Tutorial.HandbookText,
        );
    };

    private BeginCombinationTutorial(): void {
        this._stage = "prepare_combination";
        const recipe = this._economy.GetAvailableNameCombinations()
            .find((candidate) => candidate?.Parts?.length >= 2) || null;
        if (!recipe) {
            this.ShowHandbookStep();
            return;
        }
        this._combinationRecipe = recipe;
        if (!this._economy.SetNextPurchaseGuaranteedMaterial(recipe.Parts[0])) {
            const token = ++this._retryToken;
            this.scheduleOnce(() => {
                if (token === this._retryToken && this._stage === "prepare_combination") {
                    this.BeginCombinationTutorial();
                }
            }, 0.25);
            return;
        }
        this._stage = "buy_part_a";
        this.FocusNodes(
            [this._purchaseHighlightTarget],
            "继续购买物资，收集可以组合成角色的文字",
            WZSJZ_Constant.Tutorial.PurchaseMaskPadding,
        );
    }

    private RetryPrepareMergeCopy(): void {
        const token = ++this._retryToken;
        this.scheduleOnce(() => {
            if (token !== this._retryToken || this._stage !== "deploy") return;
            if (this._economy.SetNextPurchaseGuaranteedMaterial(this._baseMaterialName)) {
                this._stage = "buy_merge_copy";
                this.FocusNodes(
                    [this._purchaseHighlightTarget],
                    WZSJZ_Constant.Tutorial.BuyMergeCopyText,
                    WZSJZ_Constant.Tutorial.PurchaseMaskPadding,
                );
            } else {
                this.RetryPrepareMergeCopy();
            }
        }, 0.25);
    }

    private RetryPrepareSecondCombinationPart(): void {
        const token = ++this._retryToken;
        this.scheduleOnce(() => {
            if (token !== this._retryToken || this._stage !== "buy_part_a") return;
            const nextName = this._combinationRecipe?.Parts[1];
            if (nextName && this._economy.SetNextPurchaseGuaranteedMaterial(nextName)) {
                this._stage = "buy_part_b";
                this.FocusNodes(
                    [this._purchaseHighlightTarget],
                    `继续购买，收集能与“${this._combinationRecipe.Parts[0]}”组成角色的文字`,
                    WZSJZ_Constant.Tutorial.PurchaseMaskPadding,
                );
            } else {
                this.RetryPrepareSecondCombinationPart();
            }
        }, 0.25);
    }

    private ShowHandbookStep(): void {
        this._stage = "handbook";
        this.FocusNodes(
            [this._handbookButton],
            WZSJZ_Constant.Tutorial.HandbookText,
        );
    }

    private OpenHandbook = (): void => {
        if (this._stage === "handbook") this.CompleteTutorial();
        WZSJZ_UIManager.Instance.ShowPanel(WZSJZ_Constant.Panel.HandBookPanel);
    };

    private SkipTutorial = (): void => {
        if (this._stage === "inactive" || this._stage === "complete") return;
        WZSJZ_AudioManager.Play("按钮点击", 0.7, 0.04);
        this.CompleteTutorial();
        WZSJZ_UIManager.Instance.ShowText("已跳过新手教程");
    };

    private CompleteTutorial(): void {
        this._stage = "complete";
        this._retryToken++;
        this.HideDragHand();
        this._economy?.ClearNextPurchaseGuaranteedMaterial();
        WZSJZ_GameData.Instance.CompleteTutorial();
        if (this._tutorialRoot) this._tutorialRoot.active = false;
    }

    private GetPreferredFormationCell(): WZSJZ_Cell {
        return this._formationCells.find((cell) => cell?.IsUnlocked && cell.IsEmpty())
            || this._formationCells.find((cell) => cell?.IsUnlocked)
            || null;
    }

    private GetMergeGuideNodes(): Node[] {
        const occupied = this._formationCells.find((cell) => {
            const unit = cell?.Occupant
                ?.getComponent("WZSJZ_GameNode") as WZSJZ_GameNode;
            return cell?.IsUnlocked && unit?.Name === this._baseMaterialName;
        });
        const copy = this._preparationCells.find((cell) => {
            const unit = cell?.Occupant
                ?.getComponent("WZSJZ_GameNode") as WZSJZ_GameNode;
            return cell?.IsUnlocked && unit?.Name === this._baseMaterialName;
        });
        return [occupied?.node, copy?.node].filter((node): node is Node => !!node);
    }

    private GetCombinationGuideCells(): WZSJZ_Cell[] {
        const cells = this._formationCells
            .filter((cell) => cell?.IsUnlocked && cell.IsEmpty())
            .sort((left, right) => left.Index - right.Index);
        const columns = Math.max(1, WZSJZ_Constant.NameUnit.FormationColumns);
        for (const left of cells) {
            const right = cells.find((candidate) =>
                candidate.Index === left.Index + 1
                && Math.floor(candidate.Index / columns) === Math.floor(left.Index / columns)
            );
            if (right) return [left, right];
        }
        return cells.slice(0, 2);
    }

    /** 一个组合文字正确落位后，把手势切换到剩余文字和它对应的目标格。 */
    private UpdateCombinationDragGuide(data: PlacementEventData): void {
        if (data?.TargetCell?.Zone !== "formation" || !this._combinationRecipe) return;
        const partIndex = this._combinationRecipe.Parts.indexOf(data.GameNode?.Name);
        if (partIndex < 0
            || data.TargetCell !== this._combinationTargetCells[partIndex]) {
            return;
        }
        const remainingIndex = partIndex === 0 ? 1 : 0;
        const remainingName = this._combinationRecipe.Parts[remainingIndex];
        const remainingSource = this._preparationCells.find((cell) => {
            const unit = cell?.Occupant
                ?.getComponent("WZSJZ_GameNode") as WZSJZ_GameNode;
            return cell?.IsUnlocked && unit?.Name === remainingName;
        });
        const remainingTarget = this._combinationTargetCells[remainingIndex];
        if (!remainingSource || !remainingTarget) return;
        this.FocusNodes(
            [remainingSource.node, remainingTarget.node],
            `再把“${remainingName}”拖到高亮位置，完成“${this._combinationRecipe.Name}”组合`,
            WZSJZ_Constant.Tutorial.DragMaskPadding,
        );
        this.ShowDragHand(remainingSource.node, remainingTarget.node);
    }

    /** 根据目标的世界包围盒移动并缩放反向Mask，同时把说明放到高亮区域附近。 */
    private FocusNodes(
        nodes: Array<Node | null>,
        text: string,
        maskPadding: number = WZSJZ_Constant.Tutorial.MaskPadding,
    ): void {
        this.HideDragHand();
        const validTransforms = nodes
            .filter((node): node is Node => !!node?.isValid)
            .map((node) => node.getComponent(UITransform))
            .filter((transform): transform is UITransform => !!transform);
        const rootTransform = this._tutorialRoot?.getComponent(UITransform);
        const maskTransform = this._mask?.getComponent(UITransform);
        const descriptionTransform = this._description?.getComponent(UITransform);
        if (!rootTransform || !maskTransform || validTransforms.length <= 0) return;

        const bounds = validTransforms.map((transform) => transform.getBoundingBoxToWorld());
        let minX = Math.min(...bounds.map((rect) => rect.xMin));
        let maxX = Math.max(...bounds.map((rect) => rect.xMax));
        let minY = Math.min(...bounds.map((rect) => rect.yMin));
        let maxY = Math.max(...bounds.map((rect) => rect.yMax));
        const padding = Math.max(0, maskPadding);
        minX -= padding;
        maxX += padding;
        minY -= padding;
        maxY += padding;

        const center = rootTransform.convertToNodeSpaceAR(new Vec3(
            (minX + maxX) * 0.5,
            (minY + maxY) * 0.5,
            0,
        ));
        this._mask.setPosition(center.x, center.y, 0);
        maskTransform.setContentSize(maxX - minX, maxY - minY);
        this._descriptionLabel.string = text;

        const rootSize = rootTransform.contentSize;
        const descriptionSize = descriptionTransform?.contentSize;
        const descriptionHalfWidth = (descriptionSize?.width || 0) * 0.5;
        const descriptionHalfHeight = (descriptionSize?.height || 0) * 0.5;
        const edge = WZSJZ_Constant.Tutorial.DescriptionEdgePadding;
        const gap = WZSJZ_Constant.Tutorial.DescriptionGap;
        const topY = center.y + (maxY - minY) * 0.5 + gap + descriptionHalfHeight;
        const rootTop = rootSize.height * (1 - rootTransform.anchorPoint.y) - edge;
        const rootBottom = -rootSize.height * rootTransform.anchorPoint.y + edge;
        let descriptionY = topY;
        if (topY + descriptionHalfHeight > rootTop) {
            descriptionY = center.y - (maxY - minY) * 0.5 - gap - descriptionHalfHeight;
        }
        descriptionY = Math.max(
            rootBottom + descriptionHalfHeight,
            Math.min(rootTop - descriptionHalfHeight, descriptionY),
        );
        const rootLeft = -rootSize.width * rootTransform.anchorPoint.x + edge;
        const rootRight = rootSize.width * (1 - rootTransform.anchorPoint.x) - edge;
        const descriptionX = Math.max(
            rootLeft + descriptionHalfWidth,
            Math.min(rootRight - descriptionHalfWidth, center.x),
        );
        this._description.setPosition(descriptionX, descriptionY, 0);
    }

    private CreateDragHand(): void {
        if (!this._tutorialRoot || this._dragHand?.isValid) return;
        const config = WZSJZ_Constant.Tutorial;
        this._dragHand = new Node("拖拽手势");
        this._dragHand.layer = this._tutorialRoot.layer;
        this._dragHand.setParent(this._tutorialRoot);
        const transform = this._dragHand.addComponent(UITransform);
        transform.setContentSize(config.HandSize, config.HandSize);
        const sprite = this._dragHand.addComponent(Sprite);
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        this._dragHand.active = false;
        void WZSJZ_Incident.LoadSprite(config.HandSpritePath).then((frame) => {
            if (this._dragHand?.isValid) {
                sprite.spriteFrame = frame as SpriteFrame;
            }
        });
    }

    /** 小手在源物体和目标格之间往返，直观展示按住后拖动的操作。 */
    private ShowDragHand(source: Node, target: Node): void {
        if (!this._dragHand?.isValid || !source?.isValid || !target?.isValid) return;
        const rootTransform = this._tutorialRoot?.getComponent(UITransform);
        if (!rootTransform) return;
        const sourcePosition = rootTransform.convertToNodeSpaceAR(source.worldPosition);
        const targetPosition = rootTransform.convertToNodeSpaceAR(target.worldPosition);
        const config = WZSJZ_Constant.Tutorial;
        const normalScale = new Vec3(1, 1, 1);
        const pressedScale = new Vec3(
            config.HandPressScale,
            config.HandPressScale,
            1,
        );
        this._dragHand.active = true;
        this._dragHand.setPosition(sourcePosition);
        this._dragHand.setScale(normalScale);
        this._dragHand.setSiblingIndex(this._tutorialRoot.children.length - 1);
        tween(this._dragHand)
            .repeatForever(
                tween()
                    .set({ position: sourcePosition, scale: normalScale })
                    .to(config.HandPressDuration, { scale: pressedScale }, {
                        easing: "sineInOut",
                    })
                    .to(config.HandDragDuration, { position: targetPosition }, {
                        easing: "sineInOut",
                    })
                    .to(config.HandPressDuration, { scale: normalScale }, {
                        easing: "sineOut",
                    })
                    .delay(config.HandTargetHoldDuration)
                    .to(config.HandReturnDuration, { position: sourcePosition }, {
                        easing: "sineInOut",
                    })
                    .delay(config.HandLoopDelay),
            )
            .start();
    }

    private HideDragHand(): void {
        if (!this._dragHand?.isValid) return;
        Tween.stopAllByTarget(this._dragHand);
        this._dragHand.active = false;
    }
}
