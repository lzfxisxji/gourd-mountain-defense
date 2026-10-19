# 五娃与存档更新

五娃素材 water-poses.png 使用内置 image_gen 参考现有角色生成，包含待机、蓄力、吐水姿势。五娃实战能力位于 src/engine.js，角色在图鉴可见；当前两关卡片保持原有顺序。

角色数值：175 灵气，300 生命，卡片冷却 7.5 秒，每发 20 伤害，1.4 秒间隔。水弹使妖怪移动与近身攻击节奏降低 50%，持续 10 秒，重复命中刷新时间，不叠加幅度。渲染显示蓝色水弹、蓝色脚底环和减速标记。

解锁顺序参考：https://plantsvszombies.fandom.com/wiki/Snow_Pea_(PvZ)
通关 1-6 后获得，1-7 起可用。对应关卡尚未制作，不提前出现在 1-1/1-2。

完整生成提示词：

Transparent 2D character pose atlas: FIFTH Calabash Brother 五娃, authentic classic Chinese cel cartoon style matching the reference boy characters. Three clearly separated full-body poses in one horizontal row with generous spacing. Boy has angular black hair, BLUE gourd crown, BLUE cropped sleeveless vest exposing belly, green leaf collar and green leaf skirt, BLUE shorts, bare feet, thick eyebrows. All face RIGHT, same body size and ground baseline.
LEFT idle: upright relaxed stance, closed mouth, arms at sides.
MIDDLE prepare: knees planted, upper body leans back, cheeks puffed, elbows drawn back.
RIGHT release: leans forward toward right, pursed lips, arms spread for balance, preparing to spit a WATER BALL, but no projectile drawn (game handles projectile).
Exactly three isolated sprites on true transparent background, no scenery or text or panel borders. Keep each sprite entirely in its own third, full head and feet visible, no overlap, do not color clothes green or purple. Wide landscape 1536x768. Handpainted flat gouache, clean thick black ink outlines, recognizable original Calabash Brothers face.

## 存档实现

src/storage.js 包含快照、恢复、数据校验、旧记录迁移和 JSON 编解码。存储键继续使用 gourd-mountain-save-v1，内容版本升为 2，以兼容现有用户。保存战局中的活动实体、动画残骸、弹丸、冷却、减速、波次及可恢复随机种子。每个战局独立分配实体编号，恢复后不会与存活实体冲突。

界面：战场手动保存，10 秒自动保存，暂停/返回菜单/离开页面保存；主菜单恢复、导出和导入。通关后清除该关进行中的战局快照。导入校验失败不覆盖已有存档。

