import { _decorator, Component, Node, Vec2, Vec3, instantiate, Prefab, tween, v3, Tween, v2, Sprite, SpriteFrame, Size, easing, UIOpacity, TweenEasing, Color, color } from 'cc';

export class Tools extends Component {

    //#region Cocos

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

    /*** 实例化节点 */
    public static Instantiate(prefab: Prefab, parent: Node, position: Vec3 = Vec3.ZERO) {
        var node = instantiate(prefab);
        node.setParent(parent);
        node.setPosition(position);
        return node;
    }

    /*** 寻找子节点，子节点需不重名 */
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

    /*** 找到节点上的组件 */
    public static GetComponent<T extends Component>(node: Node, type: { new(): T }): T | null {
        const component = node.getComponent(type);
        if (component) {
            return component;
        }
        console.error(`Component ${type.name} not found on node ${node.name}`);
        return null;
    }

    /**找到子节点上的组件*/
    public static GetComponentByNodeName<T extends Component>(name: string, rootNode: Node, type: { new(): T }): T | null {
        let node = this.GetNode(name, rootNode);
        if (node) {
            const component = node.getComponent(type);
            if (component) {
                return component;
            }
        }
        console.error(`Component ${type.name} not found on node ${node.name}`);
        return null;
    }

    public static SetParent(child: Node, parent: Node) {
        child.setParent(parent);
        child.setPosition(Vec3.ZERO);
        child.setRotationFromEuler(Vec3.ZERO);
        child.setScale(Vec3.ONE);
    }

    public static Shaking(node: Node, gap: number, randomMax: number, stopTime: number, callback: Function = null) {
        const x = node.worldPosition.x;
        const y = node.worldPosition.y;
        const z = node.worldPosition.z;

        tween(node)
            .to(gap, { worldPosition: v3(x + Tools.GetRandom(-randomMax, randomMax), y + Tools.GetRandom(-randomMax, randomMax), z) })
            .to(gap, { worldPosition: v3(x + Tools.GetRandom(-randomMax, randomMax), y + Tools.GetRandom(-randomMax, randomMax), z) })
            .to(gap, { worldPosition: v3(x + Tools.GetRandom(-randomMax, randomMax), y + Tools.GetRandom(-randomMax, randomMax), z) })
            .to(gap, { worldPosition: v3(x + Tools.GetRandom(-randomMax, randomMax), y + Tools.GetRandom(-randomMax, randomMax), z) })
            .to(gap, { worldPosition: v3(x + Tools.GetRandom(-randomMax, randomMax), y + Tools.GetRandom(-randomMax, randomMax), z) })
            .to(gap, { worldPosition: v3(x + Tools.GetRandom(-randomMax, randomMax), y + Tools.GetRandom(-randomMax, randomMax), z) })
            .union()
            .repeatForever().start();

        setTimeout(() => {
            Tween.stopAllByTarget(node);
            node.setWorldPosition(x, y, z);
            callback?.();
        }, stopTime * 1000);
    }

    /*** 获取两个坐标在 XZ 轴的距离 */
    public static GetTwoPosXZDis(aX: number, aZ: number, bX: number, bZ: number) {
        const x = aX - bX;
        const z = aZ - bZ;
        return Math.sqrt(x * x + z * z);
    }

    public static GetGrayMaterial() {
    }

    // #endregion

    //#region Math

    /** 返回一个范围在 [min, max) 的整数*/
    public static GetRandomInt(min, max) {
        return Math.floor(Math.random() * (max - min)) + min;
    }

    /** 返回一个范围在 [min, max] 的整数*/
    public static GetRandomIntWithMax(min: number, max: number) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /** 限定在范围内 [min, max]*/
    public static Clamp(value: number, min: number, max: number) {
        if (value < min) {
            return min;
        }

        if (value > max) {
            return max;
        }

        return value;
    }

    /*** 固定位数字前填充 0 */
    public static FillWithZero(num: number, highestDigit: number) {
        let s = "";
        for (let i = 1; i < highestDigit; i++) {
            s += '0';
        }

        return (s + num).slice(-1 * highestDigit);//到倒数第 highestDigit 个元素
    }

    //#endregion

    //#region Array

    /*** 移除数组中的某一个元素不修改数组 */
    public static RemoveItemFromArray<T>(array: T[], itemToRemove: T): void {
        const index = array.indexOf(itemToRemove);
        if (index !== -1) {
            array.splice(index, 1);
        }
    }

    /*** 两个数值数组取相同的值，返回一个新数组*/
    public static FilterDifferentValue(arr1: number[], arr2: number[]) {
        let arr: number[] = [];
        arr = arr1.filter((item: number) => {
            return arr2.indexOf(item) !== -1;
        })

        return arr;
    }

    /*** 根据权重,计算随机内容*/
    public static GetWeightRandIndex(weightArr: [], totalWeight: number) {
        let randWeight: number = Math.floor(Math.random() * totalWeight);
        let sum: number = 0;
        for (var weightIndex: number = 0; weightIndex < weightArr.length; weightIndex++) {
            sum += weightArr[weightIndex];
            if (randWeight < sum) {
                break;
            }
        }

        return weightIndex;
    }

    /**
    * 从n个数中获取m个随机数
    * @param {Number} n   总数
    * @param {Number} m    获取数
    * @returns {Array} array   获取数列
    */
    public static GetRandomNFromM(n: number, m: number) {
        let array: any[] = [];
        let intRd: number = 0;
        let count: number = 0;

        while (count < m) {
            if (count >= n + 1) {
                break;
            }

            intRd = this.GetRandomIntWithMax(0, n);
            var flag = 0;
            for (var i = 0; i < count; i++) {
                if (array[i] === intRd) {
                    flag = 1;
                    break;
                }
            }

            if (flag === 0) {
                array[count] = intRd;
                count++;
            }
        }

        return array;
    }

    /*** 获取随机数*/
    public static GetRandom(min: number, max: number) {
        let r: number = Math.random();
        let rr: number = r * (max - min + 1) + min;
        return rr;
    }

    /*** 返回一个差异化数组（将array中diff里的值去掉）*/
    public static Difference(array: [], diff: any) {
        let result: any[] = [];
        if (array.constructor !== Array || diff.constructor !== Array) {
            return result;
        }

        let length = array.length;
        for (let i: number = 0; i < length; i++) {
            if (diff.indexOf(array[i]) === -1) {
                result.push(array[i]);
            }
        }

        return result;
    }

    /*** 获取数组中随机一个元素*/
    public static GetRandomItemFromArray(arr: any[]) {
        return arr[Math.floor(Math.random() * arr.length)];
    }

    /*** 获取数组最小值 */
    public static GetMin(array: number[]) {
        let result: number = null!;
        if (array.constructor === Array) {
            let length = array.length;
            for (let i = 0; i < length; i++) {
                if (i === 0) {
                    result = Number(array[0]);
                } else {
                    result = result > Number(array[i]) ? Number(array[i]) : result;
                }
            }
        }

        return result;
    }

    /*** 将数组内容进行随机排列 */
    public static Rand(arr: []): [] {
        let arrClone = this.Clone(arr);
        // 首先从最大的数开始遍历，之后递减
        for (let i: number = arrClone.length - 1; i >= 0; i--) {
            // 随机索引值randomIndex是从0-arrClone.length中随机抽取的
            const randomIndex: number = Math.floor(Math.random() * (i + 1));
            // 下面三句相当于把从数组中随机抽取到的值与当前遍历的值互换位置
            const itemIndex: number = arrClone[randomIndex];
            arrClone[randomIndex] = arrClone[i];
            arrClone[i] = itemIndex;
        }
        // 每一次的遍历都相当于把从数组中随机抽取（不重复）的一个元素放到数组的最后面（索引顺序为：len-1,len-2,len-3......0）
        return arrClone;
    }

    /*** 洗牌函数*/
    public static Shuffle(arr: any) {
        if (Array.isArray(arr)) {
            let newArr: any = arr.concat();
            newArr.sort(() => { return 0.5 - Math.random() });
            return newArr;
        }
    }

    public static _stringToArray(string: string) {
        // 用于判断emoji的正则们
        var rsAstralRange = '\\ud800-\\udfff';
        var rsZWJ = '\\u200d';
        var rsVarRange = '\\ufe0e\\ufe0f';
        var rsComboMarksRange = '\\u0300-\\u036f';
        var reComboHalfMarksRange = '\\ufe20-\\ufe2f';
        var rsComboSymbolsRange = '\\u20d0-\\u20ff';
        var rsComboRange = rsComboMarksRange + reComboHalfMarksRange + rsComboSymbolsRange;
        var reHasUnicode = RegExp('[' + rsZWJ + rsAstralRange + rsComboRange + rsVarRange + ']');

        var rsFitz = '\\ud83c[\\udffb-\\udfff]';
        var rsOptVar = '[' + rsVarRange + ']?';
        var rsCombo = '[' + rsComboRange + ']';
        var rsModifier = '(?:' + rsCombo + '|' + rsFitz + ')';
        var reOptMod = rsModifier + '?';
        var rsAstral = '[' + rsAstralRange + ']';
        var rsNonAstral = '[^' + rsAstralRange + ']';
        var rsRegional = '(?:\\ud83c[\\udde6-\\uddff]){2}';
        var rsSurrPair = '[\\ud800-\\udbff][\\udc00-\\udfff]';
        var rsOptJoin = '(?:' + rsZWJ + '(?:' + [rsNonAstral, rsRegional, rsSurrPair].join('|') + ')' + rsOptVar + reOptMod + ')*';
        var rsSeq = rsOptVar + reOptMod + rsOptJoin;
        var rsSymbol = '(?:' + [rsNonAstral + rsCombo + '?', rsCombo, rsRegional, rsSurrPair, rsAstral].join('|') + ')';
        var reUnicode = RegExp(rsFitz + '(?=' + rsFitz + ')|' + rsSymbol + rsSeq, 'g');

        var hasUnicode = function (val: any) {
            return reHasUnicode.test(val);
        };

        var unicodeToArray = function (val: any) {
            return val.match(reUnicode) || [];
        };

        var asciiToArray = function (val: any) {
            return val.split('');
        };

        return hasUnicode(string) ? unicodeToArray(string) : asciiToArray(string);
    }

    /*** 将object转化为数组 */
    public static objectToArray(srcObj: { [key: string]: any }) {
        let resultArr: any[] = [];

        // to array
        for (let key in srcObj) {
            if (!srcObj.hasOwnProperty(key)) {
                continue;
            }

            resultArr.push(srcObj[key]);
        }

        return resultArr;
    }

    /*** 将数组转化为object */
    public static arrayToObject(srcObj: any, objectKey: string) {

        let resultObj: { [key: string]: any } = {};

        // to object
        for (var key in srcObj) {
            if (!srcObj.hasOwnProperty(key) || !srcObj[key][objectKey]) {
                continue;
            }

            resultObj[srcObj[key][objectKey]] = srcObj[key];
        }

        return resultObj;
    }

    public static RandomPointAroundCenter(point: Vec2, radius: number): { x: number, y: number } {
        // 生成一个随机角度（弧度制）将范围映射到 [0, 2π)
        const radian = Math.random() * 2 * Math.PI;

        // 使用三角函数计算点的坐标
        return v2(point.x + radius * Math.cos(radian), point.y + radius * Math.sin(radian));
    }

    // #endregion

    //#region String

    //**转换为二进制字符串并用零填充到固定长度 */
    public static DecimalToBinaryWithPadding(decimal: number, bitLength: number): string {
        const binaryString = decimal.toString(2); // 转换为二进制字符串
        return binaryString.padStart(bitLength, '0'); // 用零填充到固定长度
    }

    public static IsEmptyStr(str: string | null | undefined): boolean {
        return str === null || str === undefined || str === "";
    }

    /*** 获取字符串长度 */
    public static getStringLength(render: string) {
        let strArr: string = render;
        let len: number = 0;
        for (let i: number = 0, n = strArr.length; i < n; i++) {
            let val: number = strArr.charCodeAt(i);
            if (val <= 255) {
                len = len + 1;
            } else {
                len = len + 2;
            }
        }

        return Math.ceil(len / 2);
    }

    /*** 裁剪字符串首尾的空格 */
    public static TrimSpace(str: string) {
        return str.replace(/(^\s*)|(\s*$)/g, "");
    }

    /**
   * 格式化名字，XXX...
   * @param {string} name 需要格式化的字符串 
   * @param {number}limit 
   * @returns {string} 返回格式化后的字符串XXX...
   */
    public static formatName(name: string, limit: number) {
        limit = limit || 6;
        var nameArray = this._stringToArray(name);
        var str = '';
        var length = nameArray.length;
        if (length > limit) {
            for (var i = 0; i < limit; i++) {
                str += nameArray[i];
            }

            str += '...';
        } else {
            str = name;
        }

        return str;
    }

    /*** 解析数据表带有#或者,连接的数据 */
    public static parseStringData(str: string, symbol: string = "#"): any[] {
        let arr: any[] = str.split(symbol);
        return arr.map((item: any) => {
            return Number(item);
        })
    }

    /*** 在每个字符中间插入 spaceCount 数量个空格 */
    public static InsertSpaceBetweenCharacters(str: string, spaceCount: number = 1): string {
        let spaceStr = "";
        for (let i = 0; i < spaceCount; i++) {
            spaceStr += " ";
        }
        return str.split('').join(spaceStr);
    }

    /*** 规格化时间：01:59:59 格式 */
    public static FormatTime(second: number): string {
        return `${Math.floor(second / 3600).toString().padStart(2, '0')}:${Math.floor(second / 60 % 60).toString().padStart(2, '0')}:${Math.floor(second % 60).toString().padStart(2, '0')}`;
    }


    //#endregion

    //#region Algorithm
    /** 二分查找, findFlag 为false表示没找到的时候返回一个较小的, 为true返回一个较大的 */
    public static BinarySearch(arr: number[], target: number, findFlag = false) {
        let start = 0, end = arr.length - 1;
        while (end - start > 1) {
            var idx = Math.floor((start + end) / 2);
            if (target < arr[idx]) {
                end = idx;
            } else if (target > arr[idx]) {
                start = idx
            } else {
                return idx;
            }
        }

        // 没有找到对应的值
        if (!findFlag) {
            if (end == 0) return -1;
            return start;
        } else {
            if (start == arr.length - 1) return arr.length;
            return end;
        }
    }

    /**
    * 用于数值到达另外一个目标数值之间进行平滑过渡运动效果
    * @param {number} targetValue 目标数值 
    * @param {number} curValue 当前数值
    * @param {number} ratio    过渡比率
    * @returns 
    */
    public static Lerp(targetValue: number, curValue: number, ratio: number = 0.25) {
        let v: number = curValue;
        if (targetValue > curValue) {
            v = curValue + (targetValue - curValue) * ratio;
        } else if (targetValue < curValue) {
            v = curValue - (curValue - targetValue) * ratio;
        }

        return v;
    }

    // #endregion

    //#region Encrypt

    /*** 数据加密 */
    public static encrypt(str: string) {
        let b64Data = this._base64encode(str);

        let n: number = 6;
        if (b64Data.length % 2 === 0) {
            n = 7;
        }

        let encodeData: string = '';

        for (let idx = 0; idx < (b64Data.length - n + 1) / 2; idx++) {
            encodeData += b64Data[2 * idx + 1];
            encodeData += b64Data[2 * idx];
        }

        encodeData += b64Data.slice(b64Data.length - n + 1);

        return encodeData;
    }

    /**
    * 数据解密
    * @param {String} str 
    */
    public static decrypt(b64Data: string) {
        let n: number = 6;
        if (b64Data.length % 2 === 0) {
            n = 7;
        }

        let decodeData = '';
        for (var idx = 0; idx < b64Data.length - n; idx += 2) {
            decodeData += b64Data[idx + 1];
            decodeData += b64Data[idx];
        }

        decodeData += b64Data.slice(b64Data.length - n + 1);

        decodeData = this._base64Decode(decodeData);

        return decodeData;
    }

    /*** base64 加密 */
    private static _base64encode(input: string) {
        let keyStr: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        let output: string = "", chr1: number, chr2: number, chr3: number, enc1: number, enc2: number, enc3: number, enc4: number, i: number = 0;
        input = this._utf8Encode(input);
        while (i < input.length) {
            chr1 = input.charCodeAt(i++);
            chr2 = input.charCodeAt(i++);
            chr3 = input.charCodeAt(i++);
            enc1 = chr1 >> 2;
            enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
            enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
            enc4 = chr3 & 63;
            if (isNaN(chr2)) {
                enc3 = enc4 = 64;
            } else if (isNaN(chr3)) {
                enc4 = 64;
            }
            output = output +
                keyStr.charAt(enc1) + keyStr.charAt(enc2) +
                keyStr.charAt(enc3) + keyStr.charAt(enc4);
        }
        return output;
    }

    /*** utf-8 加密*/
    private static _utf8Encode(string: string) {
        string = string.replace(/\r\n/g, "\n");
        let utftext: string = "";
        for (let n: number = 0; n < string.length; n++) {
            let c: number = string.charCodeAt(n);
            if (c < 128) {
                utftext += String.fromCharCode(c);
            } else if ((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            } else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }

        }
        return utftext;
    }

    /*** utf-8解密 */
    public static _utf8Decode(utftext: string) {
        let string = "";
        let i: number = 0;
        let c: number = 0;
        let c1: number = 0;
        let c2: number = 0;
        let c3: number = 0;
        while (i < utftext.length) {
            c = utftext.charCodeAt(i);
            if (c < 128) {
                string += String.fromCharCode(c);
                i++;
            } else if ((c > 191) && (c < 224)) {
                c2 = utftext.charCodeAt(i + 1);
                string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                i += 2;
            } else {
                c2 = utftext.charCodeAt(i + 1);
                c3 = utftext.charCodeAt(i + 2);
                string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                i += 3;
            }
        }
        return string;
    }

    /*** base64 解密 */
    public static _base64Decode(input: string) {
        let keyStr: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
        let output: string = "";
        let chr1: number;
        let chr2: number;
        let chr3: number;
        let enc1: number;
        let enc2: number;
        let enc3: number;
        let enc4: number;
        let i: number = 0;
        input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
        while (i < input.length) {
            enc1 = keyStr.indexOf(input.charAt(i++));
            enc2 = keyStr.indexOf(input.charAt(i++));
            enc3 = keyStr.indexOf(input.charAt(i++));
            enc4 = keyStr.indexOf(input.charAt(i++));
            chr1 = (enc1 << 2) | (enc2 >> 4);
            chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
            chr3 = ((enc3 & 3) << 6) | enc4;
            output = output + String.fromCharCode(chr1);
            if (enc3 != 64) {
                output = output + String.fromCharCode(chr2);
            }
            if (enc4 != 64) {
                output = output + String.fromCharCode(chr3);
            }
        }
        output = this._utf8Decode(output);
        return output;
    }

    //#endregion

    //#region Others

    /** 获取枚举所有的值*/
    public static GetEnumValues(enumType: any): string[] {
        const enumValues = Object.keys(enumType)
            .map(key => enumType[key])
            .filter(value => typeof value === 'string');

        return enumValues as string[];
    }

    /** 根据枚举值找key*/
    public static GetEnumKeyByValue(enumObj: any, value: any): string | undefined {
        // 遍历枚举对象的键和值
        for (let key in enumObj) {
            if (enumObj[key] === value) {
                return key;
            }
        }
        return undefined; // 如果没有找到匹配的值，返回undefined
    }


    /**
    * 检查JSON对象中是否存在指定的key
    * @param jsonData JSON对象数据
    * @param key 要查找的键名
    * @param recursive 是否递归搜索嵌套对象（默认true）
    * @param caseSensitive 是否区分大小写（默认false）
    * @returns boolean 是否找到该key
    */
    public static hasKey(jsonData: any, key: string, recursive: boolean = true, caseSensitive: boolean = true): boolean {
        if (!jsonData || typeof jsonData !== 'object') {
            return false;
        }

        const targetKey = caseSensitive ? key : key.toLowerCase();

        // 递归搜索函数
        const searchKey = (obj: any): boolean => {
            if (typeof obj === 'object' && obj !== null) {
                if (Array.isArray(obj)) {
                    // 如果是数组，递归检查每个元素
                    if (recursive) {
                        for (const item of obj) {
                            if (searchKey(item)) {
                                return true;
                            }
                        }
                    }
                } else {
                    // 检查当前对象的所有键
                    for (const objKey in obj) {
                        const currentKey = caseSensitive ? objKey : objKey.toLowerCase();

                        // 直接匹配键名
                        if (currentKey === targetKey) {
                            return true;
                        }

                        // 递归检查嵌套对象
                        if (recursive && searchKey(obj[objKey])) {
                            return true;
                        }
                    }
                }
            }
            return false;
        };

        return searchKey(jsonData);
    }

    /**
    * 判断传入的参数是否为空的Object。数组或undefined会返回false
    * @param obj
    */
    public static isEmptyObject(obj: any) {
        let result: boolean = true;
        if (obj && obj.constructor === Object) {
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    result = false;
                    break;
                }
            }
        } else {
            result = false;
        }

        return result;
    }

    /**
    * 判断是否是新的一天
    * @param {Object|Number} dateValue 时间对象 todo MessageCenter 与 pve 相关的时间存储建议改为 Date 类型
    * @returns {boolean}
    */
    public static isNewDay(dateValue: any) {
        // todo：是否需要判断时区？
        var oldDate: any = new Date(dateValue);
        var curDate: any = new Date();

        //@ts-ignore
        var oldYear = oldDate.getYear();
        var oldMonth = oldDate.getMonth();
        var oldDay = oldDate.getDate();
        //@ts-ignore
        var curYear = curDate.getYear();
        var curMonth = curDate.getMonth();
        var curDay = curDate.getDate();

        if (curYear > oldYear) {
            return true;
        } else {
            if (curMonth > oldMonth) {
                return true;
            } else {
                if (curDay > oldDay) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
    * 获取对象属性数量
    * @param {object}o 对象
    * @returns 
    */
    public static getPropertyCount(o: Object) {
        var n, count = 0;
        for (n in o) {
            if (o.hasOwnProperty(n)) {
                count++;
            }
        }
        return count;
    }

    // 模拟传msg的uuid
    public static simulationUUID() {
        function s4() {
            return Math.floor((1 + Math.random()) * 0x10000)
                .toString(16)
                .substring(1);
        }

        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4();
    }

    /**
    * 判断当前时间是否在有效时间内
    * @param {String|Number} start 起始时间。带有时区信息
    * @param {String|Number} end 结束时间。带有时区信息
    */
    public static isNowValid(start: any, end: any) {
        var startTime = new Date(start);
        var endTime = new Date(end);
        var result = false;

        if (startTime.getDate() + '' !== 'NaN' && endTime.getDate() + '' !== 'NaN') {
            var curDate = new Date();
            result = curDate < endTime && curDate > startTime;
        }

        return result;
    }

    /**
    * 返回相隔天数
    * @param start 
    * @param end 
    * @returns 
    */
    public static getDeltaDays(start: any, end: any) {
        start = new Date(start);
        end = new Date(end);

        let startYear: number = start.getFullYear();
        let startMonth: number = start.getMonth() + 1;
        let startDate: number = start.getDate();
        let endYear: number = end.getFullYear();
        let endMonth: number = end.getMonth() + 1;
        let endDate: number = end.getDate();

        start = new Date(startYear + '/' + startMonth + '/' + startDate + ' GMT+0800').getTime();
        end = new Date(endYear + '/' + endMonth + '/' + endDate + ' GMT+0800').getTime();

        let deltaTime = end - start;
        return Math.floor(deltaTime / (24 * 60 * 60 * 1000));
    }

    /**
    * 格式化两位小数点
    * @param time 
    * @returns 
    */
    public static formatTwoDigits(time: number) {
        //@ts-ignore
        return (Array(2).join(0) + time).slice(-2);
    }

    /**
    * 根据格式返回时间
    * @param date  时间
    * @param fmt 格式
    * @returns 
    */
    public static formatDate(date: Date, fmt: string) {
        let o = {
            "M+": date.getMonth() + 1, //月份
            "d+": date.getDate(), //日
            "h+": date.getHours(), //小时
            "m+": date.getMinutes(), //分
            "s+": date.getSeconds(), //秒
            "q+": Math.floor((date.getMonth() + 3) / 3), //季度
            "S": date.getMilliseconds() //毫秒
        };
        if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
        for (let k in o)
            //@ts-ignore
            if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length === 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
        return fmt;
    }

    /**
    * 获取格式化后的日期（不含小时分秒）
    */
    public static getDay() {
        let date: Date = new Date();
        return date.getFullYear() + '-' + (date.getMonth() + 1) + '-' + date.getDate();
    }

    /**
    * 格式化钱数，超过10000 转换位 10K   10000K 转换为 10M
    * @param {number}money 需要被格式化的数值
    * @returns {string}返回 被格式化的数值
    */
    public static formatMoney(money: number) {
        let arrUnit: string[] = ['', 'K', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y', 'B', 'N', 'D'];

        let strValue: string = '';
        for (let idx: number = 0; idx < arrUnit.length; idx++) {
            if (money >= 10000) {
                money /= 1000;
            } else {
                strValue = Math.floor(money) + arrUnit[idx];
                break;
            }
        }

        if (strValue === '') {
            strValue = Math.floor(money) + 'U'; //超过最大值就加个U
        }

        return strValue;
    }

    /**
    * 格式化数值
    * @param {number}value 需要被格式化的数值
    * @returns {string}返回 被格式化的数值
    */
    public static formatValue(value: number) {
        let arrUnit: string[] = [];
        let strValue: string = '';
        for (let i = 0; i < 26; i++) {
            arrUnit.push(String.fromCharCode(97 + i));
        }

        for (let idx: number = 0; idx < arrUnit.length; idx++) {
            if (value >= 10000) {
                value /= 1000;
            } else {
                strValue = Math.floor(value) + arrUnit[idx];
                break;
            }
        }

        return strValue;
    }

    /**
    * 根据剩余秒数格式化剩余时间 返回 HH:MM:SS
    * @param {Number} leftSec 
    */
    public static formatTimeForSecond(leftSec: number, withoutSeconds: boolean = false) {
        let timeStr: string = '';
        let sec: number = leftSec % 60;

        let leftMin: number = Math.floor(leftSec / 60);
        leftMin = leftMin < 0 ? 0 : leftMin;

        let hour: number = Math.floor(leftMin / 60);
        let min: number = leftMin % 60;

        if (hour > 0) {
            timeStr += hour > 9 ? hour.toString() : '0' + hour;
            timeStr += ':';
        } else {
            timeStr += '00:';
        }

        timeStr += min > 9 ? min.toString() : '0' + min;

        if (!withoutSeconds) {
            timeStr += ':';
            timeStr += sec > 9 ? sec.toString() : '0' + sec;
        }

        return timeStr;
    }

    /**
    *  根据剩余毫秒数格式化剩余时间 返回 HH:MM:SS
    *
    * @param {Number} ms
    */
    public static formatTimeForMillisecond(ms: number): Object {
        let second: number = Math.floor(ms / 1000 % 60);
        let minute: number = Math.floor(ms / 1000 / 60 % 60);
        let hour: number = Math.floor(ms / 1000 / 60 / 60);
        return { 'hour': hour, 'minute': minute, 'second': second };
    }

    /**
    * 获得开始和结束两者之间相隔分钟数
    *
    * @static
    * @param {number} start
    * @param {number} end
    * @memberof Util
    */
    public static getOffsetMimutes(start: number, end: number) {
        let offSetTime: number = end - start;
        let minute: number = Math.floor((offSetTime % (1000 * 60 * 60)) / (1000 * 60));
        return minute;
    }

    /**
    * 返回指定小数位的数值
    * @param {number} num 
    * @param {number} idx 
    */
    public static formatNumToFixed(num: number, idx: number = 0) {
        return Number(num.toFixed(idx));
    }

    /*** 深度拷贝*/
    public static Clone(sObj: any) {
        if (sObj === null || typeof sObj !== "object") {
            return sObj;
        }

        let s: { [key: string]: any } = {};
        if (sObj.constructor === Array) {
            s = [];
        }

        for (let i in sObj) {
            if (sObj.hasOwnProperty(i)) {
                s[i] = this.Clone(sObj[i]);
            }
        }

        return s;
    }

    /**
     * 获取性能等级
     * -Android
     * 设备性能等级，取值为：
     * -2 或 0（该设备无法运行小游戏）
     * -1（性能未知）
     * >=1（设备性能值，该值越高，设备性能越好，目前最高不到50)
     * -IOS
     * 微信不支持IO性能等级
     * iPhone 5s 及以下
     * 设定为超低端机 benchmarkLevel = 5
     * iPhone 6 ～ iPhone SE
     * 设定为超低端机 benchmarkLevel = 15
     * iPhone 7 ~ iPhone X
     * 设定为中端机 benchmarkLevel = 25
     * iPhone XS 及以上
     * 设定为高端机 benchmarkLevel = 40
     * -H5或其他
     * -1（性能未知）
     */
    public static getBenchmarkLevel(): Number {
        //@ts-ignore
        if (window.wx) {
            //@ts-ignore
            const sys = window.wx.getSystemInfoSync();
            const isIOS = sys.system.indexOf('iOS') >= 0;
            if (isIOS) {
                const model = sys.model;
                // iPhone 5s 及以下
                const ultraLowPhoneType = ['iPhone1,1', 'iPhone1,2', 'iPhone2,1', 'iPhone3,1', 'iPhone3,3', 'iPhone4,1', 'iPhone5,1', 'iPhone5,2', 'iPhone5,3', 'iPhone5,4', 'iPhone6,1', 'iPhone6,2'];
                // iPhone 6 ~ iPhone SE
                const lowPhoneType = ['iPhone6,2', 'iPhone7,1', 'iPhone7,2', 'iPhone8,1', 'iPhone8,2', 'iPhone8,4'];
                // iPhone 7 ~ iPhone X
                const middlePhoneType = ['iPhone9,1', 'iPhone9,2', 'iPhone9,3', 'iPhone9,4', 'iPhone10,1', 'iPhone10,2', 'iPhone10,3', 'iPhone10,4', 'iPhone10,5', 'iPhone10,6'];
                // iPhone XS 及以上
                const highPhoneType = ['iPhone11,2', 'iPhone11,4', 'iPhone11,6', 'iPhone11,8', 'iPhone12,1', 'iPhone12,3', 'iPhone12,5', 'iPhone12,8'];
                for (let i = 0; i < ultraLowPhoneType.length; i++) {
                    if (model.indexOf(ultraLowPhoneType[i]) >= 0)
                        return 5;
                }
                for (let i = 0; i < lowPhoneType.length; i++) {
                    if (model.indexOf(lowPhoneType[i]) >= 0)
                        return 10;
                }
                for (let i = 0; i < middlePhoneType.length; i++) {
                    if (model.indexOf(middlePhoneType[i]) >= 0)
                        return 20;
                }
                for (let i = 0; i < highPhoneType.length; i++) {
                    if (model.indexOf(highPhoneType[i]) >= 0)
                        return 30;
                }
                return -1;
            } else {
                return sys.benchmarkLevel;
            }
        } else {
            return 50;
        }
    }

    /**
    * 低端机判断
    */
    public static checkIsLowPhone() {
        let checkBenchmark = 22; //判断低端机的性能等级

        return Number(Tools.getBenchmarkLevel()) < checkBenchmark;
    }

    //#endregion

    public static GetColorFromHex(hex: string): Color {
        return color().fromHEX(hex);
    }

    //获取一张图片在设定最大范围内不变形的长宽
    public static GetSpriteSizeToMAX(sprit: SpriteFrame, Width: number, Height: number): Size {
        let x = sprit.width;
        let y = sprit.height;
        let scale = (Width / x) > (Height / y) ? (Width / x) : (Height / y);
        return new Size(x * scale, y * scale);
    }

    //Tween_透明度
    public static Tweem_UIopacity(node: Node, staropacity: number, Endopacity: number, Time: number = 1, easing: TweenEasing = "linear", callback?: Function) {
        node.getComponent(UIOpacity).getComponent(UIOpacity).opacity = staropacity;
        tween(node.getComponent(UIOpacity))
            .to(Time, { opacity: Endopacity }, { easing: easing })
            .call(() => {
                if (callback) callback();
            })
            .start();
    }

    //时间改成00:00文本
    public static GetTimeText(time: number): string {
        let fen = Math.floor(time / 60);
        let miao = time % 60;
        let str = "";
        if (fen < 10) {
            str = "0" + fen + ":";
        } else {
            str = fen + ":";
        }
        if (miao < 10) {
            str += "0" + miao;
        } else {
            str += miao;
        }
        return str;
    }

    public static ArrayIsEquality(array1: any[], array2: any[]) {
        if (array1.length != array2.length) return false;
        for (let i = 0; i < array1.length; i++) {
            if (array1[i] != array2[i]) return false;
        }
        return true;
    }
}