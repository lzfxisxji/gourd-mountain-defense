# 角色动作图集

所有图像使用内置 image_gen，以项目现有角色和用户提供的青蛙精为参考制作，保留透明背景。坐标、地面锚点和缩放集中在 src/animation.js。每个动作使用独立绘制的姿势，代码补充呼吸、受击和掉落位移。

## 动作与事件

- 四娃：待机 → 0.2 秒蓄力 → 吐火并生成火焰弹 → 0.28 秒出招保持 → 待机。连续射击间隔约 1.4 秒。
- 葫芦藤：待机、产出前发亮与展开叶片、产出后短暂停留、受损枯叶。
- 三娃：抱臂待机、近身防御、受伤防御。当前两关尚不能上阵，可在图鉴中演示。
- 青蛙精：两帧迈步，接近角色后刺击；每个一秒攻击周期在 0.42 秒发生一次 100 点伤害。半血后切换为残臂行走与啃咬，攻击数值保持一致。
- 妖怪生命降至 50% 且大于零时，仅一次生成手臂与三叉戟掉落；200 生命、20 单发伤害时，第五发触发。
- 生命归零立即从活动敌人列表移除，生成头部掉落与身体倒地。尸体不移动、不攻击、不吸收火焰弹。最后一个死亡动画播放完再结算。
- 所有残骸为无血液卡通表现，并在 1.65～2.2 秒内清理。游戏内无常驻生命条。

## 素材及完整提示词

### fire-poses.png

Create a transparent game animation atlas using the FIRST green-clothed boy in the reference as the sole character identity, 四娃 from classic Calabash Brothers. THREE frames arranged in EXACTLY THREE EQUAL COLUMNS, ONE ROW in a wide 1536x768 image. Every frame entirely confined to its own third, 8% cell padding, centered full body, feet at exactly 88% of canvas height; head same scale in all frames. Authentic Chinese handpainted cel cartoon, thick clean ink outlines, same green gourd crown, black angular hair, green cropped vest, bare belly, green leaf collar and skirt, shorts and bare feet. Face RIGHT in all frames.
Frame 1 left: clear RELAXED IDLE, mouth closed, arms relaxed beside waist, torso upright, easy balanced stance.
Frame 2 middle: distinct ANTICIPATION, lean upper body backward away from target, puff out cheeks, elbows drawn backward, knees bent and firmly planted, preparing to spit.
Frame 3 right: distinct RELEASE, lean torso and head far FORWARD to right, lips pursed forward spitting, front arm reaches forward for balance and rear arm extends back, feet still planted. NO drawn flame or projectile, these are generated separately by the game.
Absolutely only these three isolated sprites on true transparent background, no scenery, no floor line, no text, no cell borders, no extra characters. Do not include the other reference characters. Do not crop crown, hands or feet. Maintain consistent body size and facial identity.

### support-poses.png

Use reference 1 ONLY as identity/style for the gourd vine (column two) and yellow third brother (column four). Create a transparent game animation atlas, EXACTLY 3 COLUMNS x 2 ROWS, six isolated full body sprites with generous margins in each cell. Same character scale and baseline across each row. No grid lines or text, no background.
Top row: same small resource producing gourd vine in three distinctly different states. Cell top left: RESTING, leaves relaxed, golden gourd hanging down, no glow. Top middle: PRODUCING RESOURCE, leaves spread upward, gourd lifted with warm bright yellow center and a small ring of gold sparkles very close to gourd, excited visibly different leaf arrangement. Top right: DAMAGED VINE, several brown/yellow wilted drooping leaves, stalk bent but intact, golden gourd dim and lower, not dead.
Bottom row: third Calabash Brother 三娃, yellow gourd crown, angular black classic hair, yellow cropped sleeveless vest exposing belly, green leaf collar/skirt, yellow shorts and bare feet, all face RIGHT. Bottom left: IDLE with arms crossed across chest, upright confident stance, mouth closed. Bottom middle: ACTIVE DEFENSE, feet planted wide, knees bent, both palms forcefully pressing toward RIGHT, torso braced. Bottom right: HURT DEFENSE, crouched lower and leaning slightly back, one palm held forward defensively, other arm near chest, visibly strained expression.
Authentic classic Chinese Calabash Brothers handpainted cel animation art, clean black outlines, flat colored shapes. All six sprites completely inside individual cells with at least 8% margin so no overlap, full crown and feet visible. True transparent alpha. No other characters.

### frog-poses.png

Create a true transparent 2D GAME ANIMATION SPRITE ATLAS of the EXACT frog demon identity in the reference: yellow tan skin with dark brown spots, huge bulging eyes, pale belly, bright red cape tied in front, blue trident with black shaft. All characters face LEFT. Classic handpainted Chinese cartoon cel style consistent with reference.
EXACTLY THREE COLUMNS BY TWO ROWS, six isolated frames, no text or panel borders. Every sprite must be fully contained within its own equal cell, 10% empty margins, identical anatomical scale, feet aligned along each row baseline.
TOP ROW intact character:
1. WALK A: left-facing walking pose, left foot ahead right foot back, trident carried upright in right hand, red cape trails behind.
2. WALK B: opposite walking stride, right foot ahead left foot back, body slightly lower, same trident, cape folds differ.
3. ATTACK: lean toward LEFT, bend knees, thrust blue trident diagonally to LEFT at waist height with holding arm extended, mouth fierce, visibly distinct from walk.
BOTTOM ROW half-health character:
4. WALK A DAMAGED: same identity BUT the trident-holding right arm is entirely MISSING from shoulder; NO trident, NO arm or hand on that side, clean smooth rounded cartoon stump, no blood. Remaining arm balances forward, hunched body, left foot ahead.
5. WALK B DAMAGED: same missing right arm, no weapon, opposite stride, tired hunched expression.
6. BITE ATTACK DAMAGED: same missing right arm and no weapon, crouch and lean far LEFT with mouth wide open to bite, remaining hand near belly.
Maintain reference yellow/brown colors and RED CAPE in all six, do not turn green, no blood or gore or wound details. Transparent empty background throughout, no scenery or shadows.

### frog-parts.png

Transparent 2D game animation PARTS ATLAS derived from the exact yellow-tan spotted frog demon reference with red cape and blue trident. Cartoon, bloodless, smooth clean closed edges. EXACTLY THREE EQUAL COLUMNS in ONE ROW, each object entirely inside its column with 15% padding, wide landscape image. No overlap, no text or frame lines. Maintain clean thick black outline Chinese cel animation style.
Left column: the frog demon's HEADLESS BODY, upright slumped body from red cape/collar down to webbed feet, round yellow-tan spotted belly, red cape still tied around collar, the weapon holding right arm also missing, remaining left arm hangs down. A short smooth rounded collar at top where head was, no blood, no wound detail, no head or eyes, no trident. Full body sized to fill cell height.
Middle column: the DETACHED FROG HEAD ONLY, same familiar bulging eyes, tan spotted head, pale lower jaw, wide open red smile and pink tongue, faces LEFT; smooth rounded underside, no neck wound or blood. No cape or body, no trident. Head centered in own column.
Right column: the DETACHED TRIDENT-HOLDING ARM AND TRIDENT as ONE combined object, yellow-tan spotted cartoon arm with rounded shoulder end, hand tightly grasping black vertical shaft, bright blue three-pronged trident above it. No body, no head, no blood. Entire trident tips and lower shaft visible.
True transparent alpha background with no backdrop, shadows or scenery. These will be separately rotated and dropped in a cartoon game.

### frog-attack.png

Use supplied frog demon as character reference. Generate ONE isolated full-body game sprite in a strong ATTACK pose. Same yellow-tan spotted frog, red cape, huge bulging eyes, blue three-pronged trident with black shaft. Face LEFT, both feet planted, knees bent, lean body LEFT, thrust the trident HORIZONTALLY TOWARD LEFT with both hands. Weapon tip to far LEFT, cape trails RIGHT, mouth open fierce. Full weapon and feet visible, generous 10% transparent padding around entire silhouette. Single character only, no sprite grid, no other objects. Clean black contours, same handpainted cel cartoon style. True transparent alpha, no shadows or background, no text, no projectiles.

### frog-walk-b.png

ONE full-body transparent 2D sprite of the exact yellow-tan spotted frog demon from reference, red cape, blue trident upright with black shaft, faces LEFT. Pose is WALKING, distinct opposite stride: near leg is bent and lifted with its webbed foot forward in mid-step, far foot planted behind, body low with forward weight shift, spare hand swings backward, trident carried upright leaning slightly backward, cape trails right. Classic Chinese cel cartoon black outlines matching reference. Preserve recognizable eyes, broad smiling mouth, colors and proportions. Full character and trident entirely inside canvas with 12% padding all sides. No background, shadows, glow, text or other characters. True transparent alpha.

